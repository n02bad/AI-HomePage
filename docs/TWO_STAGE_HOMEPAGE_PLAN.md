# 两阶段首页生成（骨架 HTML + 逐槽组件并发）设计与落地

> 状态：已实现并验证（mock 路径端到端通过；真实模型路径已接线，待真实 provider 验证）。
> 开关：`HOME_AI_TWO_STAGE=true` 且请求 `renderMode==="skeletonHtml"` 时启用；任何失败回退既有渲染。

## 1. 目标

把"整页一次性生成"拆成两阶段，解耦**全局一致性**与**单模块质量/交互**：

- **阶段一（骨架 + token）** 管一致性：布局、留白、圆角、配色、字号统一从黄金样本提取的 token 锁死。
- **阶段二（逐槽组件）** 管单元质量：每个模块在统一 token 约束下被单独生成，且带可交互能力。

直接对症的老问题：整页一次生成既管布局又管细节，模型顾此失彼；风格 token 过去只是 prompt 文字描述，不是硬约束。

## 2. 管线

```
renderMode=skeletonHtml + HOME_AI_TWO_STAGE=true
  │
  ├─ buildSlotManifest()           从 pagePlan/sections 推导有序 slot + grid 跨度 + 内容契约 + 允许交互
  ├─ goldenTokensToCssVars()       golden styleContract.tokens → :root 的 --home-* CSS 变量
  ├─ buildSkeletonShell()          12 列 grid + data-home-skeleton-slot 占位（不含模块内容）
  ├─ orchestrateTwoStageHomepage()
  │     └─ runWithConcurrency(limit=5)  并发逐槽：
  │           mock  → mockSlotFragment()（确定性、token 合规，供测试/本地）
  │           real  → callProviderWithPrompt(buildSlotComponentPrompt, AI_HTML_SLOT_COMPONENT_SCHEMA)
  │                   → sanitizeAiHtmlMarkup/Css 逐片段清洗（不可信输入）
  │     └─ validateSlotFragment()      结构(data-ai-html-module)+token 合规(无裸色值)+无 script/内联事件
  │     └─ 校验失败该槽回退 mockSlotFragment（整页永远可用）
  │     └─ assembleSkeleton()          片段填入骨架占位
  │
  └─ 输出 config.skeletonHtmlScheme（既有渲染路径）：
        skeletonHtml + slotComponents{[brick]:{html,css}} + slots + twoStageRuntimeJs
```

全部新代码集中在 `server.js`（`function normalizeAiHtmlLayoutContract` 之前的两阶段模块段）+ `home-personalization.js`（交互运行时）。

## 3. 关键设计决策

1. **token 硬契约**：组件 CSS 只准 `var(--home-*)` 消费变量，禁止裸 hex/rgb/hsl。`slotCssTokenViolations()` 检测，违规即回退。`--home-*` 是渲染层既有命名空间，无需新主题体系。
2. **brick = 边界，AI = 内部**：slot 身份仍绑定 16 白名单 brick（保留安全护栏），AI 只生成 brick 内部 DOM/morph。化解"自由 HTML vs 白名单封闭"的冲突。
3. **交互 = 声明式，不吐自由 JS**：组件只能用 `data-action`（copy/collapse/tabs/viewswitch/carousel/tooltip）声明交互；可信运行时（`TWO_STAGE_INTERACTION_RUNTIME_JS` / 前端 `installTwoStageInteractionRuntime`）用事件委托统一绑定。系统本就清洗 `<script>`/`on*`，与本设计一致。渲染容器非 shadow DOM，document 级委托可用。
4. **并发**：阶段二所有 slot 无依赖，`runWithConcurrency` 限流并发（默认 5，上限 8），墙钟≈最慢单槽而非求和。
5. **绕过截断**：`normalizeAiHtmlScheme` 对整页 html 有 9000 字符截断且剥离内联 style。故跨度用 class 不用内联 style；整页装配结果在 normalize 后覆盖；片段单独清洗（小、不触发截断）。
6. **复用既有渲染**：产物对接 `config.skeletonHtmlScheme.slotComponents`（key=brick）+ `data-home-skeleton-slot` 占位，走前端既有 `renderSkeletonHtmlScheme`，不另造渲染路径。
7. **永远可回退**：任一 slot 失败回退确定性 mock 片段；整个编排失败回退既有 mock/自由 HTML 通道。

## 4. 主要函数索引（server.js）

| 函数 | 职责 |
|---|---|
| `twoStageHomepageEnabled()` | 读 `HOME_AI_TWO_STAGE` 开关 |
| `goldenTokensToCssVars(styleContract)` | tokens → `:root{--home-*}` |
| `slotCssTokenViolations(css)` | token 合规检测（裸色值） |
| `buildSlotManifest(payload,config,styleContract)` | 有序 slot + 跨度 + 契约 + 允许交互 |
| `runWithConcurrency(items,limit,worker)` | 限流并发器 |
| `AI_HTML_SLOT_COMPONENT_SCHEMA` | 单槽输出 schema {html,css,interactions} |
| `buildSlotComponentPrompt(slot,styleContract,payload)` | 单槽 prompt（token+契约+交互白名单） |
| `buildSkeletonShell(manifest,styleContract)` | 骨架外壳 |
| `assembleSkeleton(shell,fragments)` | 片段装配 |
| `validateSlotFragment(fragment,slot)` | 片段级校验 |
| `mockSlotFragment(slot)` | 确定性合规片段（测试/兜底） |
| `TWO_STAGE_INTERACTION_RUNTIME_JS` | 交互运行时（服务端常量） |
| `orchestrateTwoStageHomepage(...)` | 两阶段编排入口 |

前端：`home-personalization.js` `installTwoStageInteractionRuntime(doc)`（幂等，事件委托）+ `renderSkeletonHtmlScheme` 末尾调用。

## 5. 验证

- `npm run test:two-stage` —— 起 mock+two-stage 服务，断言 skeletonHtmlScheme/markers/slotComponents/token 合规/必选模块覆盖/声明式交互。✅
- `npm run check` 语法全过。✅
- 浏览器（`HOME_AI_MOCK+HOME_AI_TWO_STAGE`）端到端：`activeRenderMode=skeletonHtml`、`pipeline=two-stage-skeleton`、6 个必选模块全部进 slotComponents、无控制台报错。✅

## 6. 待办 / 后续

- **真实模型路径验证**：接线已完成（`buildFragment` 非 mock 分支），需用真实 provider 跑一次确认片段质量与延迟，并按需加单槽返修/重试。
- **prompt 缓存（原方案 B）**：阶段二每槽共享 token 契约 + brick 契约，是缓存前缀的理想对象，可显著降本——是并发逐槽的成本前提。
- **既有 variant 多样性测试**（`home-generation-rules.test.js:1996`）在本分支基线即失败，与本次改动无关，单列跟进。
- 交互原语可按需扩充（如步骤指示、分段控件）。
