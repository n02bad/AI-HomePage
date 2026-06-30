# AGENTS.md

> 项目级 AI 上下文。**每个新 session 开始时，先读本文件 + `docs/PROJECT_MAP.md`，再看 `git diff`，最后只读本次任务相关文件——不要全量扫描项目。**
> 快捷入口：运行 `/start-homepage`（见 `.Codex/commands/start-homepage.md`）。

---

## 1. 项目目标

ForexCRM 个性化首页 AI 生成系统（`name: forexcrm-home-ai-prototype`）。

核心能力：根据用户意图（自然语言 prompt + 结构化引导选项），为外汇/CRM 客户端**自动生成一个个性化首页配置**，再渲染成 HTML。生成结果由一套"积木（brick/module）"系统拼装，并受设计治理规则、golden 样本、质量评估器约束，目标是产出**美观、合规、符合业务意图**的首页。

技术栈：纯 Node.js（无框架）单体 `server.js`（约 21k 行）+ 一组静态前端页面（admin / training / preview）。多家 LLM 供应商（OpenAI / Anthropic / MiniMax / Kimi / DeepSeek / Gemini）。

---

## 2. 首页生成 Pipeline

入口 HTTP 端点（`server.js`）：
- `POST /api/home-ai/complete`（[server.js:21101](server.js)）— 主生成端点
- `POST /api/home-ai/candidates`（[server.js:21028](server.js)）— 多候选生成 + 打分挑选
- `POST /api/home-ai/test`（[server.js:21106](server.js)）— 调试端点

编排链路：

```
用户请求 (prompt + guidedIntake)
  │
  ├─[1] 意图分析   buildHomepageIntentProfile() + applyGuidedIntentProfile()
  │       → primaryIntent / heroFocus / mustHave / avoid
  │
  ├─[2] 页面规划   buildHomepagePagePlan()        server.js:12710
  │       → mainVisual(hero) / compositionGroups(3-4业务组) / 视觉权重 / golden 骨架
  │       compositionGroups 由 homepageCompositionGroupsForPlan() server.js:12584
  │
  ├─[3] 策略 & 治理 buildHomepageModulePolicy() + designRulesPromptReference()
  │       → 模块白名单 / design.md 规则 / goldenStyleContractForPrompt()
  │
  ├─[4] 构建 Prompt buildPrompt()                 server.js:13823
  │       system(~130 行硬规则 13839) + user(plan+intent+morph+golden 13967)
  │       附带: 组件库 / golden 样本 / 反馈记忆 / 美学训练上下文
  │
  ├─[5] 调模型     callProviderWithPrompt()       server.js:18116
  │       runHomeAiComplete()                     server.js:20356
  │       → homepage config JSON (sections / brickPlan / moduleStyles / moduleSettings)
  │
  └─[6] 后处理校验  模块策略校验 / applyHomepageCompositionGroupsToSections (12814)
          section 过渡契约 / 主题 token 应用 / brick 渲染 (server.js:10276+)
```

渲染：每个 section 是 12 列 CSS grid（[server.js:10377](server.js)），`brickBackedSlotSpans()`（[server.js:10276](server.js)）决定 slot 跨列（如 2 个 slot → `[8,4]` 或 `[6,6]` 即左右并排）。

---

## 3. 关键目录与关键文件

### 核心后端
- **`server.js`** — 全部后端逻辑、pipeline、prompt、schema、渲染、质量评估（~21k 行，单文件）。
- `package.json` — 脚本：`npm start` / `npm run check`（语法）/ `npm test`（golden 对齐 + 规则 + 视觉风格）。

### Prompt / 规则 / 设计治理（喂给 AI 的"知识"）
- **`design.md`** — 设计治理规则（颜色/间距/圆角/阴影/主题 token），经 `designRulesPromptReference()` 注入。
- **`home-module-bricks.md`** — 16 个白名单积木的定义与边界规则。
- `AI_UI_GENERATION_PROTOCOL.md` / `AI_HOME_SETUP.md` / `agent.md` — 协议与历史背景文档。

### 训练数据 / 运行时数据（JSON，**大文件，勿手改**）
- `home-design-samples.json` — golden 样本库（isGolden / humanScore）。
- `home-ai-score-records.json` — 美学评分历史（~3MB）。
- `home-ai-feedback-memory.json` — 人工反馈记忆（~7MB）。
- `home-ai-call-history.json` — 调用历史（~33MB，**极大**）。
- `home-component-library.json` — 保存的组件候选（~5MB）。
- `home-component-scores.json` / `home-component-compositions.json` / `home-ai-reference-assets.json`。

### 前端 / Admin / Training 页面
- `home-personalization.{js,css}` — 首页个性化主前端（js ~700KB）。
- `client-home.{html,js,css}` — 客户端首页渲染。
- `home-layout-admin.{html,js}` / `home-module-preview.{html,js,css}` / `home-ai-training.{html,js,css}` / `home-model-calls.{html,js}` — 管理/预览/训练/调用记录工具页。
- `auth-*` — 登录/认证相关的并行子系统（与首页生成同构但独立）。

### 测试
- `tests/home-golden-alignment.test.js` / `tests/home-generation-rules.test.js` / `tests/home-visual-style.test.js`

### 详细模块地图
- **`docs/PROJECT_MAP.md`** — 模块结构、入口、prompt/schema/layout/registry/evaluator 文件清单与"快速启动步骤"。

---

## 4. Layout Generation 的当前问题

**现象**：AI 生成的首页几乎全是上下堆叠（纵向）结构，极少出现左右（多列）布局。

**根因（已查证，非能力缺失）**：
1. 渲染层**本就支持**左右布局：12 列 grid（[server.js:10377](server.js)）+ `brickBackedSlotSpans()`（[server.js:10276](server.js)）对 2 slot 给 `[8,4]`/`[6,6]`，section 类型有 `split`/`hero`/`rail`（多 slot）。
2. **规划阶段缺横向维度**：`buildHomepagePagePlan` / `compositionGroups`（[server.js:12584](server.js)）只表达"模块分组 + 纵向先后顺序"，从不输出"某一行拆成左右两栏"。
3. **配对只是事后修补**：`applyHomepageCompositionGroupsToSections`（[server.js:12814](server.js)）机械地把小模块两两塞进 `split`，不是 AI 基于设计意图的主动决策；AI 原始输出默认单 slot，system prompt 里**没有规则鼓励产出多 slot/split**。
4. **golden 样本若全为纵向**，模型会持续学到纵向。

**改进方向（尚未实施）**：给规划阶段补"横向 row/column/span 词汇"+ 配对规则 + 至少 1-2 个左右结构 golden 样本；在 system prompt 明确哪些模块适合并排（图表+列表、资产+快捷操作、信号+公告）及 8/4、6/6 span 用法。最小验证：跑 `/api/home-ai/candidates` 看输出是否出现 `split`。

---

## 5. 后续修改原则

1. **改动集中在 `server.js`**，但它有 21k 行——**先用 grep 定位函数/行号，只读相关片段，不要整文件读**。本文件与 `docs/PROJECT_MAP.md` 已给出锚点行号。
2. **业务逻辑改动前先确认意图**：pipeline/prompt/schema 的改动会影响线上生成质量，先小步、可验证。
3. **改 prompt/规则优先改文档源**（`design.md`、`home-module-bricks.md`）而非散落字符串，除非该规则确实硬编码在 `server.js`。
4. **不要手改大 JSON 数据文件**（call-history / score-records / feedback-memory / component-library）——它们是运行时产物，由系统写入。
5. **改完跑校验**：`npm run check`（语法）+ `npm test`（golden 对齐 / 生成规则 / 视觉风格）。layout 改动尤其要看 golden-alignment 与 visual-style 测试。
6. **layout 相关改动**遵循第 4 节方向：先让规划阶段产出横向意图，再在 prompt/渲染兑现；不要绕过 `brickBackedSlotSpans` 的 grid 体系另造一套。
7. **保持 brick 白名单封闭**：16 个积木以外不要新增模块名（见 `home-module-bricks.md` 边界规则）。
8. **提交规范**：仅在用户要求时提交；当前默认分支 `main`，特性分支 `home-ai-quality-improvements`。

---

## 6. 每次任务开始时应优先读取的文件

按顺序，**只读这些**，其余按任务需要用 grep 定位：

1. `AGENTS.md`（本文件）— 全局心智模型。
2. `docs/PROJECT_MAP.md` — 模块地图与入口锚点。
3. `git diff` / `git log --oneline -10` — 当前分支改了什么。
4. **本次任务相关文件**（用本文件/地图的行号锚点 + grep 精准定位 `server.js` 片段）。
5. 仅当任务涉及时再读：`design.md`（设计规则）、`home-module-bricks.md`（积木）、对应 `tests/*.test.js`。

> ❌ 不要：开局就读整个 `server.js`、读大 JSON 数据文件、对全项目做无目标扫描。
