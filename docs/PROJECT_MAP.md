# PROJECT_MAP.md

> 项目模块结构与关键入口地图。配合根目录 `CLAUDE.md` 使用。
> 目的：让新 session 用**行号锚点 + grep** 精准定位，**避免全量扫描**。
> 行号为撰写时快照，可能漂移——若不匹配，用同名函数 grep 重新定位。

---

## 0. 一句话结构

纯 Node.js 单体：**`server.js`（~21k 行）= 整个后端**（pipeline + prompt + schema + 渲染 + 评估）。其余为静态前端页面（admin/training/preview）、Markdown 知识文档、运行时 JSON 数据。无构建步骤，`node server.js` 直接起。

---

## 1. 模块结构总览

| 域 | 文件 | 说明 |
|---|---|---|
| **后端核心** | `server.js` | 全部逻辑。下方所有锚点都在此文件 |
| **首页前端** | `home-personalization.{js,css}`、`client-home.{html,js,css}` | 用户侧首页渲染 |
| **首页工具页** | `home-layout-admin.*`、`home-module-preview.*`、`home-ai-training.*`、`home-model-calls.*` | 布局后台/积木预览/训练/调用记录 |
| **认证子系统** | `auth-*.{js,css,html}` | 登录页 AI 生成（与首页同构但独立，改首页时一般不碰） |
| **设计/规则知识** | `design.md`、`home-module-bricks.md`、`AI_UI_GENERATION_PROTOCOL.md`、`AI_HOME_SETUP.md`、`agent.md` | 喂给 AI 的规则与协议 |
| **运行时数据** | `home-ai-*.json`、`home-component-*.json`、`home-design-samples.json` | 大 JSON，系统写入，勿手改 |
| **测试** | `tests/*.test.js` | golden 对齐 / 生成规则 / 视觉风格 |
| **通用前端** | `theme.{js,css}`、`common-layout.js`、`styles.css` | 主题与公共布局 |

---

## 2. 首页生成入口（HTTP → 编排）

| 端点 / 函数 | 锚点 | 作用 |
|---|---|---|
| `POST /api/home-ai/complete` | [server.js:21101](../server.js) | 主生成端点 |
| `POST /api/home-ai/candidates` | [server.js:21028](../server.js) | 多候选 + 打分挑选（验证 layout 改动用这个） |
| `POST /api/home-ai/test` | [server.js:21106](../server.js) | 调试端点 |
| `runHomeAiComplete(payload, startedAt)` | [server.js:20356](../server.js) | 主异步编排 |
| `handleAiComplete(req, res)` | [server.js:20437](../server.js) | HTTP handler |

---

## 3. 关键文件分类锚点（server.js 内）

### 3.1 Prompt 构建
| 函数 | 锚点 | 说明 |
|---|---|---|
| `buildPrompt(payload, config)` | [server.js:13823](../server.js) | prompt 主构建（变体路由 + system + user） |
| system prompt 规则体 | [server.js:13839](../server.js) | ~130 行硬规则（白名单/治理/主题/golden 契约） |
| user prompt 拼装 | [server.js:13967](../server.js) | plan + intent + morph pool + golden 上下文 |
| `designRulesPromptReference()` | 引用于 13833 | 注入 `design.md` |
| `goldenStyleContractForPrompt(prompt)` | 引用于 ~14005 | golden 样式契约 |
| `aestheticTrainingContext()` | 引用于 ~14004 | golden 样本/组件/反馈 上下文 |

### 3.2 Schema（模型输出结构）
| 项 | 锚点 | 说明 |
|---|---|---|
| user prompt 中 "JSON Schema:" 段 | [server.js:13962](../server.js) | 告诉模型要输出的结构 |
| `buildOpenAiResponsesBody(config, parts, schema, name)` | [server.js:13991](../server.js) | OpenAI responses 体 + schema |
| `buildProviderRequest(...)` | [server.js:14100](../server.js) | 各供应商请求构建 |
| `callProviderWithPrompt(...)` | [server.js:18116](../server.js) | 调模型 |
| `requestAndParseProviderJson(...)` | [server.js:18170](../server.js) | 请求 + 解析 JSON |

### 3.3 Layout / 规划（**layout 问题主战场**）
| 函数 | 锚点 | 说明 |
|---|---|---|
| `buildHomepagePagePlan(payload, opts)` | [server.js:12710](../server.js) | 页面规划（hero/组/权重/骨架）— 当前**只产纵向顺序** |
| `homepageCompositionGroupsForPlan(...)` | [server.js:12584](../server.js) | 业务组划分（activation/workspace/opportunities/support） |
| `applyHomepageCompositionGroupsToSections(...)` | [server.js:12814](../server.js) | 把组应用到 sections，**事后两两配对成 split** |
| `brickBackedSlotSpans(sectionType, slotCount)` | [server.js:10276](../server.js) | slot→列跨度（2 slot=`[8,4]`/`[6,6]` 左右并排） |
| section 渲染 + 12 列 grid CSS | [server.js:10346](../server.js)、[10377](../server.js) | `grid-template-columns: repeat(12,…)`，860px 折叠为单列 |
| 推荐 section 顺序表 | [server.js:888](../server.js) | `HOMEPAGE_RECOMMENDED_SECTION_ORDERS` |

### 3.4 Component / Brick Registry（积木注册表）
| 项 | 锚点 | 说明 |
|---|---|---|
| `HOME_BRICKS` 注册表 | [server.js:868](../server.js) | 16 个积木：brickId/size/zone |
| `canonicalHomepageReference()` | 引用于 ~13997 | brick 参考 |
| `CORE_COMPONENT_MORPH_POOL` | 引用于 ~14001 | 组件形态池 |
| `componentLibraryPromptReference({prompt,limit})` | 引用于 ~14002 | 组件库 top-N |
| `rankComponentReferences(components, opts)` | [server.js:4546](../server.js) | 组件排序 |
| 积木定义文档 | `home-module-bricks.md` | 16 积木 + 边界规则（人读源） |

### 3.5 Quality Evaluator（质量评估器）
| 函数 | 锚点 | 评估维度 |
|---|---|---|
| `evaluateHomepageAesthetic(payload, config)` | [server.js:9411](../server.js) | 整体美学 |
| `evaluateHomepagePlanCritic(payload, config)` | [server.js:9619](../server.js) | 规划批判 |
| `evaluateAiHtmlQuality(scheme, payload, config)` | [server.js:8665](../server.js) | HTML 质量 |
| `evaluateAiHtmlBrickReferenceConformance(...)` | [server.js:8609](../server.js) | brick 一致性 |
| `evaluateSkeletonSlotQuality(config)` | [server.js:9238](../server.js) | 骨架 slot |
| `evaluateSectionTransitionQuality(config)` | [server.js:9278](../server.js) | section 过渡契约 |
| `evaluateGoldenAlignment(config)` | [server.js:9376](../server.js) | golden 对齐 |
| `scoreBand(score)` | [server.js:9228](../server.js) | 分数分档 |
| golden 样本排序 | [server.js:6595](../server.js)、[6614](../server.js)、[6627](../server.js) | rank/golden/anti-example |

---

## 4. ⚠️ 不建议随意修改的文件

| 文件 | 原因 |
|---|---|
| `home-ai-call-history.json`（~33MB） | 运行时调用日志，系统写入，巨大，勿手改/勿整读 |
| `home-ai-feedback-memory.json`（~7MB） | 人工反馈记忆，系统写入 |
| `home-ai-score-records.json`（~3MB） | 评分历史，系统写入 |
| `home-component-library.json`（~5MB） | 组件候选库，系统写入 |
| `home-design-samples.json` | golden 样本库；改需走训练流程而非手编 |
| `home-component-scores.json` / `home-component-compositions.json` / `home-ai-reference-assets.json` | 运行时数据 |
| `auth-*`、`auth-ai-call-history.json` | 认证子系统；改首页时一般无关，勿误动 |
| `.env` | 密钥，勿提交/勿打印 |

> 改 prompt/规则请优先改 `design.md`、`home-module-bricks.md`（知识源），其次才是 `server.js` 中的硬编码字符串。

---

## 5. 下次 Session 快速启动步骤

```text
1. 读 CLAUDE.md            ← 全局心智模型
2. 读 docs/PROJECT_MAP.md  ← 本文件，拿锚点
3. git log --oneline -10 && git diff   ← 当前分支进展
4. 明确任务 → 用上面的锚点 + grep 定位 server.js 片段，只读相关行
   例：grep -n "buildHomepagePagePlan\|brickBackedSlotSpans" server.js
5. 仅当相关再读：design.md / home-module-bricks.md / 对应 tests/*.test.js
6. 改完验证：npm run check  &&  npm test
   - 起服务调试：npm start（或 npm run start:mock）
   - 验证 layout：POST /api/home-ai/candidates 看是否出现 split / 多 slot
```

**禁止**：开局整读 `server.js`、读大 JSON、无目标全项目扫描。

---

## 6. 常用命令

| 命令 | 作用 |
|---|---|
| `npm start` | 起服务（`node server.js`） |
| `npm run start:mock` | mock 模式（`HOME_AI_MOCK=true`） |
| `npm run start:faithful` | faithful 模式（`HOME_AI_FAITHFUL=true`） |
| `npm run check` | 语法检查全部 JS |
| `npm test` | golden 对齐 + 生成规则 + 视觉风格 测试 |

Git 远端：`n02bad/AI-HomePage`（默认分支 `main`，特性分支 `home-ai-quality-improvements`）。
