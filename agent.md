# 首页个性化项目 Agent 指南

## 目标

把用户端首页从固定页面升级为“AI 输入 + 模块化预览 + 发布”的首页搭建器。管理员先输入首页思路，系统生成可预览的首页蓝图；进入预览页后，管理员可以选择栏目组合和每个模块的样式，最后发布到用户端首页。

## 多租户差异化目标

本项目不是单纯优化一个首页，而是为 SaaS 多租户场景提供“租户级首页差异化能力”。不同租户使用同一套系统时，首页必须能够呈现明显不同的品牌感、运营重点、首屏结构和模块形态。

AI 的作用不是直接生成页面代码，而是根据租户描述、品牌风格、首页目标和个性化强度，选择合适的 `layout`、`theme`、`density`、`sections`、`moduleStyles`、`moduleSettings` 和组件组合。

首页差异化必须至少体现在以下四个层面：

1. Layout 差异：首屏结构、左右分栏、模块宽度、模块优先级不同。
2. Theme 差异：背景、色彩、卡片、按钮、阴影、圆角、字体密度不同。
3. Module Style 差异：同一个业务模块可以有不同展示形态，而不是永远复用同一种卡片。
4. Business Focus 差异：首页重点可以偏入金转化、资产展示、专业交易、代理增长或新客开户。

禁止只通过更换标题、颜色、文案、间距或模块顺序来伪装成个性化首页。AI 首页个性化的重点是在受控组件、布局预设、主题 token、模块变体之间做组合，并且必须让不同租户首页产生肉眼可见的差异。

## 关键边界

- 左侧导航、顶部搜索、页签栏属于系统共用布局，不属于首页配置范围。
- 当前原型只保留 `client-home.html`、`home-layout-admin.html`、`home-layout-preview.html` 这条首页与 AI 个性化链路；不要重新引入独立开户、入金、订单、CRM、IB、推广等页面入口。
- 本项目只调整首页内容区域，也就是 `client-home.html` 内 `data-home-shell` 承载的内容。
- `home-layout-admin.html` 是简洁 AI 输入页，不放复杂预览、批注、JSON 大面板。
- `home-layout-preview.html` 是预览编排页，只保留有用控制：方案摘要、栏目拼接、模块样式、发布。
- `home-module-preview.html` 是首页积木组件库，用来预览模块、细颗粒组件、AI 生成组件和组件组合建议；它不是正式用户首页。
- 预览草稿和正式发布必须分离。草稿用于 iframe 预览，发布后才影响 `client-home.html` 的真实首页。
- 不要把模块功能藏进只有设计效果的装饰卡片里。每个模块必须能对应真实业务功能。
- 页面风格预设必须同时改变 `layout`、`theme`、`moduleStyles` 和关键 `moduleSettings`，不能只换主题色或栏目顺序。
- 页面风格预设必须产生肉眼可见的结构差异。不同预设之间不能只是同一套 DOM 结构换色、换文案或换顺序。
- 当个性化强度为 `strong` 时，必须同时改变首屏重心、布局预设、主题预设、核心模块样式和关键模块设置。
- 首页 AI 生成通过本地 `server.js` 的 `/api/home-ai/complete` 后端代理调用 OpenAI、Claude、MiniMax、Kimi、DeepSeek；不要在前端直连外部模型接口，生产环境密钥应走环境变量。
- 组件库 AI 生成通过本地 `server.js` 的 `/api/home-components/*` 接口完成。AI 只能生成受控组件定义和组合建议，不能直接改正式首页代码。
- 大模型不是首页搭建器的单点依赖。首页配置模型、模块白名单、mock 链路和发布流程必须先独立跑通；某个 provider 调不通时，不要阻塞首页编辑、预览和发布主流程。

## 当前文件职责

- `home-layout-admin.html`: AI 输入页，收集管理员首页思路并展示建议方案。
- `home-layout-preview.html`: 首页内容预览页，提供模块样式与栏目组合查看。
- `home-model-calls.html`, `home-model-calls.js`: 大模型调用记录页，读取本浏览器调用历史并展示统计、筛选列表和详情。
- `home-module-preview.html`: 首页积木组件库，展示模块级积木、`client-home.html` 细颗粒组件、AI 生成组件和首页组合建议。
- `home-module-preview.js`, `home-module-preview.css`: 组件库筛选、AI 组件生成、保存组件预览、组件组合草稿生成和组件库样式。
- `home-component-library.json`: AI 生成组件的系统保存文件。
- `home-component-compositions.json`: AI 根据保存组件生成的首页组合建议保存文件。
- `home-layout-admin.js`: 输入页和预览页的控制器，负责生成草稿、切换模块样式、发布配置。
- `home-personalization.js`: 首页蓝图引擎，负责配置标准化、方案生成、草稿/发布存储、模块渲染。
- `home-personalization.css`: 首页个性化管理页、预览工作台、模块样式变体。
- `大模型配置`: 保存在 `localStorage` 的 `forexcrm.home.ai.model.config`，用于预设 OpenAI、Claude、MiniMax、Kimi、DeepSeek 的模型与接口参数；MiniMax 需要额外确认 API Key 来源和 Base URL 是否匹配。
- `server.js`: 静态资源服务、首页大模型代理和组件库大模型代理，读取环境变量或前端临时配置调用 provider，并返回首页蓝图 JSON 或组件定义 JSON。
- `package.json`: 使用 `npm start` 启动完整首页 AI 原型；`npm run start:mock` 可不带密钥走代理 mock 链路。
- `client-home.html`, `client-home.js`, `client-home.css`: 用户端首页真实内容和账号交互。
- `common-layout.js`: 共用导航、顶部搜索、页签；当前只展示用户端首页和首页个性化两个入口。

## MiniMax 调用判断

当前 MiniMax 如果一直调不成功，优先按接入层问题处理，不要先怀疑首页前端流程。

- MiniMax 有国内和国际两套入口。国内开放平台或国内 Token Plan Key 优先使用 `https://api.minimaxi.com/v1`；国际账号使用 `https://api.minimax.io/v1`。
- OpenAI 兼容调用应走 `POST /v1/chat/completions`，也就是 Base URL 加 `/chat/completions`；模型优先用 `MiniMax-M2.7`，需要速度再试 `MiniMax-M2.7-highspeed`。
- MiniMax M2.x 原生 OpenAI 兼容返回的 `content` 可能包含 `<think>...</think>` 推理内容。只收首页 JSON 时，代理层要先剥离 thinking/markdown，再提取 JSON object，否则会出现“模型有返回，但系统说不是有效 JSON”的假失败。
- Token Plan Key、按量 API Key、模型 ID、额度和区域入口必须互相匹配。出现 401、403、404、429 或 plan/key 相关报错时，先校验 key 类型、模型名、额度和 Base URL。
- 如果目标是稳定生成首页配置，MiniMax 暂时只作为可选 provider；默认验收可以先用 mock、OpenAI、Claude、Kimi 或 DeepSeek 跑通完整链路。

## DeepSeek 调用判断

- DeepSeek V4 当前预设走 OpenAI 兼容 `POST /chat/completions`，Base URL 使用 `https://api.deepseek.com`。
- 最新 V4 模型 ID 是 `deepseek-v4-pro` 和 `deepseek-v4-flash`；默认优先用 `deepseek-v4-pro`，需要速度时切到 `deepseek-v4-flash`。
- 环境变量优先使用 `DEEPSEEK_API_KEY`，可用 `DEEPSEEK_MODEL` 覆盖默认模型。
- 旧的 `deepseek-chat`、`deepseek-reasoner` 不作为本项目预设入口，避免继续依赖即将废弃的兼容模型名。

新的处理思路：

1. 先保证首页搭建器能力闭环：输入、配置标准化、模块组合、预览、发布。
2. 再把大模型当成“生成配置的增强层”，所有 provider 都只输出受控 JSON 配置，不直接改 HTML/CSS/JS。
3. 对每个 provider 做最小握手测试：先测 API Key + Base URL + model，再接入首页 schema prompt。
4. 记录失败时必须包含 provider、baseUrl、endpoint、model、HTTP status 和返回 message，避免只显示“生成失败”。
5. MiniMax 解析失败时优先检查 `<think>`、markdown fence、额外解释文本和 JSON 截取逻辑。


## 个性化强度规则

首页生成必须支持 `personalizationStrength`，用于控制 AI 和预设对首页的改造幅度。

| 强度 | 说明 | 允许变化范围 |
| --- | --- | --- |
| `subtle` | 轻微个性化 | 保留原首页结构，只调整主题、文案、模块顺序和轻量样式 |
| `medium` | 中等个性化 | 调整模块布局、模块样式、首屏重点和部分组件形态 |
| `strong` | 明显差异化 | 必须产生明显不同的首页结构和视觉表现，同时改变 layout、theme、moduleStyles 和关键 moduleSettings |

当管理员选择“明显差异”、AI 判断租户需要品牌化首页、或页面风格预设为高净值黑金、活动增长、专业交易、新客开户、代理增长等强风格方案时，必须使用 `strong`，不能只换颜色或文案。

不同强度的处理边界：

- `subtle`: 适合已有租户轻量换肤，不应大幅改变模块位置。
- `medium`: 适合多数租户品牌化首页，允许调整首屏布局和模块样式。
- `strong`: 适合需要“看起来不像同一套首页”的租户，必须使用差异明显的 layout preset 和 module style 组合。

## 首页模块清单

后续开发必须围绕以下模块建模，不要把功能散落在临时 HTML 里。

| 模块 | 配置能力 | 设计要点 |
| --- | --- | --- |
| 广告轮播图 | 后台开启/关闭 | 可作为首屏，也可作为活动/品牌辅助模块 |
| 快捷入口 | 数量 3 到 8；样式可选 | 支持 icon+文案、仅 icon、hover 显示文案 |
| 钱包模块 | 开启/关闭；单独或聚合到资产模块 | 展示钱包余额，可配入金/出金按钮 |
| 资产模块 | 展示总资产：钱包资产+交易账号资产 | 可配入金/出金按钮，也可纯展示 |
| 邀请链接模块 | 数据项可显示/隐藏 | 推广链接、邀请码、二维码是核心信息 |
| 交易账号模块 | 真实/模拟可一起或分开 | 支持卡片、列表、可切换或固定单样式 |
| 开户模块 | 真实账号、模拟账号、绑定账号可配置 | 优先与交易账号模块结合，不做孤立入口 |

## 模块样式变体矩阵

首页模块必须通过受控 `moduleStyles` 实现差异化，不允许每次临时写一套散乱样式。每个页面风格预设必须组合不同的模块变体，而不是复用同一套标准卡片。

| 模块 | 样式变体 | 用途 |
| --- | --- | --- |
| `balanceTotal` | `command` / `metric-strip` / `quiet-card` / `vip-hero` | 资产总览，可用于资产驾驶舱、高净值首屏或低调数据展示 |
| `fundActions` | `dock` / `split-buttons` / `compact-row` / `priority-cta` | 入金、出金、内部转账等资金操作 |
| `adCarousel` | `classic-banner` / `campaign-hero` / `black-gold-hero` / `compact-strip` | 广告活动、品牌首屏、营销转化横幅 |
| `quickActions` | `icon-grid` / `action-dock` / `minimal-icons` / `priority-actions` | 快捷入口，可偏标准宫格、悬浮操作、极简图标或高优先级 CTA |
| `wallet` | `standalone-card` / `merged-assets` / `split-currency` / `premium-card` | 钱包余额，可独立展示、并入资产或按币种拆分 |
| `tradingAccounts` | `workbench` / `dense-cards` / `calm-table` / `pro-console` | 交易账号，可偏工作台、密集卡片、稳重表格或专业终端 |
| `referral` | `simple-link` / `growth-card` / `partner-console` / `qr-focused` | 邀请链接、邀请码、二维码和代理增长数据 |
| `openAccount` | `inline-actions` / `progress-guide` / `account-wizard` / `compact-entry` | 开户入口，可内联到交易账号、做进度引导或表单式向导 |

样式变体要求：

- 每个变体必须对应真实业务功能，不允许只有装饰效果。
- 默认样式必须保留，用于兼容原首页。
- 新增变体必须在 390px 和 1440px 下都可用。
- 变体切换应该通过配置字段驱动，不能依赖手动改 HTML。

## 首页积木组件库思路

组件库是首页生成系统的中间层，不是单纯展示页面。它承担三件事：

1. 把现有首页拆成可复用积木。
2. 让 AI 能继续生成新的组件积木并保存。
3. 让首页 AI 从已保存积木里选择、组合、再美化布局。

组件库必须同时维护两种粒度：

- 模块级积木：`AssetOverview`、`WalletBalance`、`QuickActions`、`PromotionBanner`、`ReferralLink`、`TradingAccounts`、`OpenAccount`、`OnboardingProgress`、`UserKycRail`、`AccountPerformance`、`WalletList`、`CreateAccountForm`。
- 细颗粒组件：从 `client-home.html` 拆出的 `WelcomeHeader`、`BalanceMetric`、`FundAction`、`ProgressTask`、`QuickActionTile`、`PromoBadge`、`ReferralField`、`AccountToolbar`、`ViewToggle` 等。

积木尺寸用固定规格表达：

```text
1x1: 小卡片、状态、单动作
1x2: 右侧侧栏、用户/KYC、开户表单
2x1: 主内容横卡、邀请条、快捷入口
2x2: 资产驾驶舱、账号工作台、图表模块
3x1: 整行横幅、工具条、邀请控制台
3x2: 长表格、钱包列表、交易账号列表
```

AI 生成组件的闭环：

1. 管理员在 `home-module-preview.html` 输入组件需求，并选择模块归属和尺寸。
2. 前端调用 `POST /api/home-components/generate`。
3. 服务端调用大模型，要求只返回组件 JSON：`name`、`family`、`size`、`description`、`tags`、`html`、`css`、`layoutHints`、`dataRequirements`。
4. 服务端清洗 HTML/CSS，禁止 script、外链脚本、事件属性、`javascript:` 等不安全内容。
5. 组件保存到 `home-component-library.json`，并同步到浏览器缓存，组件库立即展示预览。
6. 管理员点击“用保存组件生成首页草稿”后，前端调用 `POST /api/home-components/compose`。
7. AI 根据已保存组件生成组合建议，保存到 `home-component-compositions.json`。
8. 首页生成器再基于组合建议生成正式首页草稿，进入 `home-layout-preview.html` 做最终预览和发布。

重要边界：

- AI 生成组件先作为组件库资产和首页草稿参考，不直接写入正式 `client-home.html`。
- 自定义组件要先保存、预览、组合，再进入首页草稿；正式发布仍由首页蓝图引擎控制。
- 如果没有 API Key，组件库必须保持可浏览，首页组合可以用 mock 或本地规则临时生成草稿。
- 后续如要让自定义组件真正渲染进正式首页，必须先扩展渲染白名单、数据绑定和安全校验，不能直接注入任意 HTML。

## 首页积木编排规则

AI 生成首页时必须把 `home-module-bricks.md` 当成模块参考，而不是只根据自然语言临时猜布局。每次生成或优化首页蓝图时，先判断用户需求命中的业务积木，再把积木映射到受控字段：`sections` 决定位置，`moduleStyles` 决定形态，`moduleSettings` 决定开关和行为。

优先积木映射：

| 用户说法 | 应命中积木 | 必须落到配置 |
| --- | --- | --- |
| 轮播图、广告图、banner | `PromotionBanner` / `adCarousel` | `moduleSettings.adCarousel.enabled = true`，并把 `adCarousel` 放入 `sections` |
| 账户余额总览、资产概览 | `AssetOverview` | `assets.enabled = true`；如果用户不要钱包余额细分，钱包不要在资产总览里强展示 |
| 快捷入口两行、一行几个 | `QuickActions` | `quickActions.enabled = true`，`quickActions.count` 按数量设置，优先用矩阵/工具条样式 |
| 真实账号列表和模拟账号列表分开 | `TradingAccounts` 拆成 Live List + Demo List 两个列表区域 | `tradingAccounts.realEnabled = true`、`demoEnabled = true`、`grouping = "separated"`、`viewMode = "list"` |
| 都是列表形式，不是卡片 | `TradingAccounts` | `tradingAccounts.viewMode = "list"`，`moduleStyles.tradingAccounts = "calm-table"` 或 `workbench` |
| 钱包列表、多币种钱包 | `WalletList` / `WalletBalance` | 当前正式首页用 `wallet.enabled = true`、`wallet.placement = "standalone"` 表达；后续独立 `WalletList` 渲染前不能假装已有完整表格 |
| 开户入口，不要绑定入口 | `OpenAccount` | `openAccount.enabled = true`，按需求设置 `real/demo/bind`；明确“不要绑定”时 `bind = false` |

关键约束：

- 用户明确要求“两个列表”“真实列表 + 模拟列表”“Live/Demo 分开”时，绝不能只用一个筛选器列表替代，必须在默认全部状态下渲染两个独立列表区块。
- 用户明确要求“列表形式，不是卡片”时，不能返回 `viewMode: "card"` 或 `switchable` 作为主结果。
- 用户要求“钱包列表”时，不能把钱包余额小卡当成完整钱包列表；如果当前渲染白名单还没有 `WalletList`，要用 `WalletBalance` 作为临时承接，并在 `aiSummary` 说明后续可升级为钱包表格积木。
- 积木组合可以参考已保存 AI 组件，但正式首页仍必须通过白名单模块渲染；未进入白名单的数据结构只能作为布局和样式参考。

## brick-v2 积木方案

首页生成从现在开始按 `brick-v2` 处理：先选业务积木，再生成首页蓝图，最后由白名单渲染器输出用户端首页。大模型只负责选择和排序，不直接生成正式首页 HTML/CSS/JS。

核心目标：

1. 让生成结果能明确看出“用了哪些积木”。
2. 让不同 prompt 真的影响积木选择、区域和排序。
3. 让大模型失败时仍可通过本地积木引擎生成可预览、可发布的首页。
4. 让正式用户首页只渲染受控业务模块，不注入未校验的任意组件代码。

首页蓝图必须优先包含这些字段：

```js
{
  generationMode: "brick-v2",
  layoutPreset: "standardDashboard | conversionFirst | assetFirst | tradingPro | vipService",
  themePreset: "default | blueFinance | minimalWhite | blackGold | darkTech",
  density: "compact | balanced | spacious",
  personalizationStrength: "subtle | medium | strong",
  layout: [
    {
      id: "assetOverview-vipHero",
      component: "asset_summary",
      slot: "hero | main | rail | full",
      priority: 20,
      brickId: "assetOverview.vipHero",
      brickName: "VIP 资产 Hero",
      brickFamily: "AssetOverview",
      brickSize: "3x2",
      brickZone: "hero",
      brickReason: "高净值客户首屏需要先看到资产与资金动作。"
    }
  ],
  brickPlan: [
    {
      brickId: "adCarousel.heroCampaign",
      brickName: "首屏广告轮播",
      family: "PromotionBanner",
      feature: "adCarousel",
      component: "ad_carousel",
      size: "3x1",
      zone: "hero",
      reason: "用户要求首屏广告轮播。"
    }
  ],
  brickTrace: {
    intent: "standard | vip | asset | trader | onboarding | growth | partner",
    strategy: "高净值资产中枢",
    selectedCount: 6,
    source: "model | local-brick-engine"
  }
}
```

排序规则：

- `layout[].priority` 是最终排序依据；`priority` 越小越靠前。
- `slot` 决定栅格区域：`hero` 和 `full` 占整行，`main` 占主内容，`rail` 占侧栏。
- 用户明确说“首屏”“放上方”“优先”时，对应积木应进入 `hero` 或更小 `priority`。
- 用户明确说“放下方”“列表放下方”时，对应积木应进入 `full`，并给更大的 `priority`。
- 不能在前端成功拿到模型 `layout` 后再用本地 `optimizeConfig` 重建一遍，否则会吞掉 AI 的排序和积木选择。

正式首页渲染规则：

- `home-personalization.js` 只能根据 `layout[].component` 调用 `COMPONENT_MAP` 白名单组件。
- 渲染出的首页模块必须带 `data-home-brick`、`data-home-brick-name`、`data-home-brick-reason`，便于调试和验收。
- 用户端首页可以展示轻量积木标识条，显示积木尺寸、名称和选择理由；这能让管理员确认方案不是固定模板。
- 未进入白名单的 AI 生成组件不能直接注入正式首页，只能先存在 `home-component-library.json`，再作为组合建议参与后续白名单扩展。

本地积木引擎必须覆盖这些策略：

| intent | 触发词 | 默认积木组合 |
| --- | --- | --- |
| `vip` | 高净值、VIP、黑金、尊贵、机构 | `assetOverview.vipHero`、`fundActions.priorityDock`、`adCarousel.heroCampaign`、`walletBalance.currencyRail`、`openAccount.sidePanel`、`tradingAccounts.separatedList` |
| `asset` | 资产、钱包、资金、钱包列表 | `assetOverview.vipHero`、`fundActions.priorityDock`、`walletBalance.currencyRail`、`walletList.currencyTable`、`accountPerformance.proChart`、`tradingAccounts.separatedList` |
| `trader` | 专业交易、MT5、持仓、订单、表现图表 | `quickActions.actionDock`、`accountPerformance.proChart`、`userKycRail.profileWallet`、`assetOverview.compactMetrics`、`tradingAccounts.separatedList` |
| `onboarding` | 新客、开户、注册、KYC、创建账户 | `onboardingProgress.checklist`、`openAccount.sidePanel`、`createAccountForm.realAccount`、`fundActions.priorityDock`、`quickActions.priorityMatrix`、`tradingAccounts.separatedList` |
| `growth` | 活动、比赛、奖池、营销、转化、广告 | `adCarousel.heroCampaign`、`quickActions.priorityMatrix`、`promoBanner.scoreboard`、`fundActions.priorityDock`、`tradingAccounts.cardProof`、`referralLink.growthConsole` |
| `partner` | IB、代理、渠道、邀请、开户链接 | `referralLink.growthConsole`、`adCarousel.heroCampaign`、`openAccount.sidePanel`、`quickActions.priorityMatrix`、`promoBanner.scoreboard`、`tradingAccounts.cardProof` |
| `standard` | 默认或无法判断 | `assetOverview.compactMetrics`、`fundActions.priorityDock`、`quickActions.actionDock`、`adCarousel.heroCampaign`、`referralLink.growthConsole`、`tradingAccounts.separatedList` |

调用失败处理：

- 现在先暂停继续追真实 provider 调用，把它视为“增强层失败”，不要阻塞积木方案落地。
- 页面生成按钮如果模型失败，应明确提示失败原因，同时自动回退到本地积木引擎，并继续生成草稿。
- 调用失败记录必须进入 `home-ai-call-history.json`，保留 provider、model、baseUrl、endpoint、status、message。
- 后续再恢复排查时，优先从调用记录页看最近失败原因；不要只看 toast 上的“调用失败”。
- 若失败原因是 “did not contain valid homepage JSON”，说明接口通了但模型输出不符合 JSON 合约；应强化 prompt、`response_format`、JSON 截取和 schema 约束。
- 若失败原因是 “Missing API key”，说明当前浏览器或环境变量没有有效密钥；先用 `npm run start:mock` 或本地积木引擎验收主流程。

## 配置原则

首页蓝图应该包含这些概念：

```js
{
  layout: "executiveHero | conversionStack | traderConsole | partnerGrowth | classicStack",
  theme: "classic | aurum | ocean | energy",
  density: "compact | balanced | spacious",
  personalizationStrength: "subtle | medium | strong",
  sections: [
    { id: "hero", type: "hero", title: "首屏", slots: ["balanceTotal", "fundActions", "adCarousel"] }
  ],
  moduleStyles: {
    balanceTotal: "command | metric-strip | quiet-card",
    fundActions: "dock | split-buttons | compact-row",
    tradingAccounts: "workbench | dense-cards | calm-table"
  },
  moduleSettings: {
    adCarousel: { enabled: true },
    quickActions: { count: 6, display: "iconText | iconOnly | hoverText" },
    wallet: { enabled: true, placement: "standalone | mergedWithAssets", showFundActions: true },
    assets: { enabled: true, showFundActions: true },
    referral: { showClicks: true, showRegistrations: true, showTradingAccounts: true },
    tradingAccounts: { realEnabled: true, demoEnabled: true, grouping: "combined | separated", viewMode: "card | list | switchable" },
    openAccount: { real: true, demo: true, bind: true, placement: "insideTradingAccounts" }
  }
}
```

页面风格预设必须基于该配置模型整体切换，不允许只修改单个字段。一个有效的 preset 至少要同时定义 `layout`、`theme`、`density`、`personalizationStrength`、核心 `sections`、核心 `moduleStyles` 和关键 `moduleSettings`。

如果当前静态原型暂时没有完整后台字段，也要让前端结构靠近这个模型，避免后续接后台时重做。

## 体验规则

- 输入页只解决“想做什么”。不要在输入页放完整预览和复杂控制。
- 预览页只解决“怎么组合和选样式”。不要恢复批注层、随机按钮堆、默认展开 JSON 等重交互。
- 预览页的页面风格按钮应该一键切换成明显不同的首页方案，例如高净值黑金、活动增长、专业交易、新客开户。
- 预览页的页面风格按钮不能只是换色。每个按钮必须切换到不同的 layout、theme、moduleStyles 和关键 moduleSettings，并在 1440px 预览下形成肉眼可见差异。
- 模块样式选择应该是少量明确选项，每个模块 2 到 3 个常用样式优先。
- 交易账号相关的开户动作应该靠近交易账号筛选或账号模块，不要放到页面很深的位置。
- 入金、出金按钮如果出现，必须是明显可点击的大按钮，并且 icon 要融入按钮形态。
- 如果后台关闭某个模块，相关能力必须确认是否由其他模块承接。例如关闭钱包模块后，资产模块仍可展示钱包汇总。
- 预览 iframe 在 `preview=1` 时只展示首页内容区域，避免共用导航误导管理员。

## 实施步骤

1. 先确认页面边界：是否只影响首页内容区域。
2. 先跑通 mock 或本地规则生成链路，确认首页蓝图不依赖单个大模型 provider。
3. 先把 `client-home.html` 的模块和细组件拆进 `home-module-preview.html`，不要遗漏真实首页里已有的业务组件。
4. 让组件库里的 AI 生成组件先保存到 `home-component-library.json`，再参与组合，不要绕过组件库直接改首页。
5. 更新 `home-personalization.js` 的配置标准化与模块渲染。
6. 更新 `home-personalization.css` 的模块样式变体。
7. 只在必要时调整 `client-home.*` 的真实模块结构。
8. 用 `home-layout-admin.html` 测输入页流程，用 `home-layout-preview.html` 测草稿预览和发布。
9. 用 `home-module-preview.html` 测组件库筛选、AI 组件保存、已保存组件预览和首页草稿生成。
10. 最后确认 `client-home.html` 不带 `preview=1` 时仍是正式首页。


## 差异化验收标准

每个页面风格预设必须通过以下验收：

1. 首屏结构不同  
   不同预设的 hero、资产、快捷入口、广告、交易账号的位置不能完全一致。

2. 模块形态不同  
   同一个模块在不同预设下必须使用不同 `moduleStyles`，例如资产模块不能永远是同一种卡片。

3. 视觉氛围不同  
   主题不能只改 primary color，必须影响背景、卡片、按钮、边框、阴影、圆角、字体密度和数字展示方式。

4. 业务重点不同  
   - 高净值黑金：突出资产、VIP 服务、入金按钮。
   - 活动增长：突出广告、入金、奖励、KYC/开户路径。
   - 专业交易：突出交易账号、账户状态、数据密度、交易工具。
   - 新客开户：突出 KYC、开户、首次入金、开户进度。
   - 代理增长：突出邀请链接、邀请码、二维码、注册/开户数据。

5. 一眼可区分  
   在 1440px 预览下，管理员不看标题也应该能明显感知不同预设不是同一套首页换色。

6. 移动端可用  
   在 390px 预览下，不同预设允许降级为单列，但模块顺序、模块样式和业务重点仍应保持差异。

## 验证清单

- `node --check home-personalization.js`
- `node --check home-layout-admin.js`
- `npm run check`
- 没有真实密钥时先用 `npm run start:mock` 验证完整链路。
- 真实调用 MiniMax 前，先确认 Base URL 与 Key 区域一致，并用最小 chat 请求验证模型可用。
- 真实调用 DeepSeek 前，先确认 `DEEPSEEK_API_KEY`、`https://api.deepseek.com` 和 V4 模型 ID 可用。
- 输入页应无 iframe，只展示 AI 输入和建议方案。
- 点击生成预览后应进入 `home-layout-preview.html`。
- 预览页应有栏目拼接和模块样式控制。
- `home-module-preview.html` 应能展示模块级积木、首页细组件和已保存 AI 组件。
- `GET /api/home-components/library` 应返回 `{ ok: true, components: [] }` 或已保存组件列表。
- 没有 API Key 时，`POST /api/home-components/generate` 应返回明确缺少密钥提示，不能让页面崩溃。
- AI 生成组件保存后，`home-component-library.json` 应能持久化组件定义。
- 用保存组件生成首页草稿后，应能进入 `home-layout-preview.html` 查看草稿。
- 切换模块样式后，iframe 内对应模块的 `data-module-style` 应变化。
- 切换页面风格预设后，iframe 内首页的 `layout`、`theme`、`personalizationStrength`、核心 `data-module-style` 和关键模块开关应同时变化。
- 选择 `strong` 个性化强度后，页面不能只出现颜色、文案或顺序变化，必须能看到首屏结构和核心模块形态变化。
- 在 1440px 预览下，高净值黑金、活动增长、专业交易、新客开户、代理增长等预设应能一眼区分。
- 390px 和 1440px 宽度不应出现首页工作区横向溢出。
- 不要因为预览页隐藏 iframe 内共用壳，而影响真实 `client-home.html` 的共用导航。

## 禁止事项

- 不要把左侧导航、顶部搜索、页签纳入首页模块。
- 不要在输入页恢复复杂批注、复杂 JSON 编辑器和完整预览。
- 不要把开启/关闭写成只隐藏 CSS，配置层也要表达清楚。
- 不要把个性化做成只换颜色、标题、文案、间距或模块顺序。
- 不要让所有页面风格预设复用同一套首屏结构和同一组标准卡片。
- 不要在 `strong` 个性化强度下仍然保持与默认首页几乎一致的布局和模块形态。
- 不要让真实账号、模拟账号、绑定账号只剩一个笼统“开户”按钮。
- 不要为了展示样式而删除入金、出金、开户链接、邀请码、账号列表等核心业务能力。
- 不要让 AI 生成组件直接写进正式首页或绕过服务端安全清洗。
- 不要把未保存、未预览、未校验的组件加入正式首页发布配置。
