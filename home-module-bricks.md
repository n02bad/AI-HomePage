# 首页积木模块拆解 v1

这份拆解把参考图和当前项目里的首页方案合并成一套可供 AI 组装的首页积木库。目标不是复制某一张首页，而是让 AI 在生成新首页时能够明确选择模块、尺寸、位置、业务优先级和后续样式变体。

## AI 生成使用规则

这份文档不仅是模块说明，也是 AI 生成首页配置时的约束依据。AI 在生成首页时必须遵守以下规则：

- 新首页生成只允许使用 16 个内容块：`welcome_header`、`asset_overview`、`quick_actions`、`onboarding_guide`、`trading_account_highlight`、`trading_accounts_list`、`promo_banner`、`pamm_products`、`copytrading_signals`、`referral_link_card`、`announcements`、`market_news`、`risk_disclosure`、`faq_section`、`support_contact`、`app_download`。
- `reward_tasks`、`kyc_risk_notice`、`ib_dashboard` 默认禁用；旧的 `ReferralLink`、KYC/风控侧栏、`RiskNotice` 和 `support_help` 只能作为历史兼容输入处理。风险提示、FAQ、在线客服和 APP 下载必须分别通过 `risk_disclosure`、`faq_section`、`support_contact`、`app_download` 表达；代理推广只允许通过轻量 `referral_link_card` 表达。
- 快捷操作区入口内容由后台配置或接口返回，AI 只负责布局、数量、样式、占位和响应式适配，不能写死入金、出金、开户、客服等具体入口。
- 资产概览区只能展示 `total`、`wallet`、`tradingAccount` 中任意 1-3 个字段，可选展示资金按钮；不能新增系统未定义资产字段或编造金额。
- PAMM 与 CopyTrading 必须拆成 `pamm_products` 和 `copytrading_signals` 两个独立模块，且仅在租户开启对应能力时展示。
- 连续时间数据必须按趋势表达。近 N 天收益、净值、PnL、回撤变化、收益率曲线等必须优先使用 ECharts 折线图或面积折线图；除非用户明确要求，不得画成柱状图、胶囊柱或装饰性条形图。
- 趋势图的 X 轴必须使用日期语义，例如 `05/05`、`05/08`、`05/11`；不要再用 `D1/D4/D7` 这类临时占位。
- 图表允许两种默认模式：分析型模块使用清晰 XY 轴；推荐卡片、轻量曲线使用 minimal/no-strong-axis，只保留日期提示和曲线。
- `referral_link_card` 仅代理/IB/合作伙伴或租户开启推广链接功能时展示；只展示推广链接、邀请码、复制/分享和可选基础统计，不展示返佣、团队层级或完整代理业绩。
- AI 不允许发明新的业务功能、业务入口或后端不存在的数据能力，例如不存在的交易功能、支付功能、账户能力、KYC 能力。
- AI 可以基于现有业务模块发明新的组件、新的样式变体、新的组合方式和新的尺寸规格，但必须说明它依托的父模块、参考组件、业务用途和回退方案。
- AI 生成模块时必须先参考组件库已保存积木的内容：字段、按钮、标签、尺寸、卡片密度、响应式规则和已有组合建议；再根据本次意图做新的变体或组合。
- 组件库参考只提供形态、语汇和灵感，不代表可以新增业务功能；不要直接复制某个积木或只换颜色，要在布局、密度、层级或组合方式上形成新的合理发散。
- 正式首页配置中的业务模块 ID 必须来自本文档，或先作为候选模块进入审核；但组件级别、样式级别、尺寸级别可以开放扩展。
- 当用户明确指定模块顺序、展示形式、禁止项时，用户本次需求优先级高于通用预设。
- 模块的业务能力和样式变体必须分开表达，不能通过 CSS 隐藏来伪装成配置变化。
- 首页结构必须通过配置表达，例如 `sections`、`slots`、`moduleStyles`、`moduleSettings`，不能让 AI 直接生成正式首页 HTML/CSS/JS。
- 如果需求无法由现有业务模块表达，应先补充业务模块能力或配置字段，再生成首页配置；如果只是视觉、组件形态、排版尺寸不够，可以生成候选组件、候选样式或候选尺寸，不需要新增业务功能。

推荐输出结构：

```js
{
  layout: "flatListDashboard | classicStack | traderConsole | partnerGrowth | executiveHero",
  theme: "lightFlat | classic | aurum | ocean | energy",
  density: "compact | balanced | spacious",
  personalizationStrength: "subtle | medium | strong",
  sections: [
    { id: "topCampaign", type: "hero", title: "Campaign Banner", slots: ["PromotionBanner"] }
  ],
  moduleStyles: {},
  moduleSettings: {},
  sizeTokens: {},
  componentCandidates: [],
  styleCandidates: [],
  sizeCandidates: []
}
```

## 拆解原则

- 共用外壳不进入积木库：顶部导航、左侧菜单、消息/语言/头像、一级页签属于公共布局，由 `common-layout.js` 和页面外壳控制。
- 首页内容才进入积木库：正式 AI 输出只允许资产概览、快捷入口、新手引导、交易账号、活动 Banner、PAMM、CopyTrading、轻量推广链接、公告、市场资讯、风险提示、FAQ、在线客服和 APP 下载等 16 个内容块；历史钱包、完整邀请控制台、KYC/风控等模块只保留为兼容代码，不作为新首页输出。
- 模块要有尺寸，不只要有样式：每个模块都需要标注推荐尺寸，方便拼版；推荐尺寸不是限制，AI 可以提出新的尺寸规格，例如 `4x1`、`4x2`、`4x3`、`5x1`，但必须说明适用场景、响应式降级和回退尺寸。
- 样式、尺寸和业务能力分开：业务能力定义“能做什么”，样式变体定义“长什么样”，尺寸规格定义“占多少空间”。AI 可以发明新的样式和尺寸，但不能发明新的业务能力。
- 开户入口和交易账号属于同一业务路径：默认应靠近账号筛选、账号列表或右侧开户操作区，不应藏在页面很深的位置。
- 白标可信、资金安全、成熟券商客户端这类首页不按营销封面处理；默认先展示资金安全、资产余额和开户转化，再展示钱包卡片、快捷入口、主推活动和合并账号列表。

## 积木尺寸定义

| 尺寸 | 对应布局 | 适合内容 |
| --- | --- | --- |
| `1x1` | 右侧 rail / 小卡片 | 小指标、公告摘要、资讯摘要、单个推荐卡 |
| `1x2` | 右侧高卡 / 侧栏 | 新手引导、榜单摘要、客服/下载摘要 |
| `2x1` | 主内容横卡 | 资产概览、快捷入口、新手引导、活动 Banner |
| `2x2` | 主内容重点模块 | 资产驾驶舱、交易账号工作台、图表 + 账号概览 |
| `3x1` | 整行横幅 | 活动 Banner、快捷工具条、公告/资讯横条 |
| `3x2` | 大面积内容区 | 交易账号长表格、账号表现图表、PAMM 产品组、CopyTrading 信号源组 |
| `4x1` | 超宽横幅 / 宽屏首屏 | 大轮播、整行账户指标条、品牌化 Campaign Hero |
| `4x2` | 宽屏主内容区 | 双列表组合、资产总览 + 快捷入口组合、交易账号 + 钱包并列组合 |
| `4x3` | 宽屏工作台 | 专业交易工作台、多表格组合、完整账户管理区 |

当前项目里 `hero/main/rail` 可以继续保留，后续可把它映射到这套尺寸：

- `hero` 约等于 `3x1` 或 `3x2`
- `main` 约等于 `2x1` 或 `2x2`
- `rail` 约等于 `1x1` 或 `1x2`
- `full` 约等于 `3x1` 或 `3x2`

交易账号列表、账号表现图表、钱包列表默认属于大模块。AI 生成页面时必须给它们单独一整横栏，不要把 `TradingAccounts` 和 `AccountPerformance` 放在同一行左右分栏里；如果模块数量和美观度冲突，优先保证这类模块的展示体验和空间利用。

### 尺寸扩展规则

尺寸规格可以开放扩展。AI 可以提出新的尺寸，例如 `4x1`、`4x2`、`4x3`，用于更宽、更有设计感的首页结构。

尺寸扩展必须遵守：

- 不能因为新尺寸而发明新的业务功能。
- 必须说明新尺寸适合哪个业务模块或组合模式。
- 必须提供桌面端和移动端响应式规则。
- 必须提供回退尺寸，例如 `4x2` 在窄屏下回退到 `3x2` 或单列。
- 如果新尺寸还没有被渲染器支持，必须进入 `sizeCandidates`，不能直接作为正式配置发布。

示例：

```js
{
  id: "wideCampaignHero",
  size: "4x1",
  parentModule: "PromotionBanner",
  purpose: "用于宽屏顶部轮播图，让淡色首页有更强首屏识别度",
  responsiveRules: ["1440px 下 4 列通栏", "1024px 下回退 3x1", "390px 下单列展示"],
  fallbackSize: "3x1",
  status: "candidate"
}
```

## 模块总览

| 模块 ID | 中文名称 | 核心职责 | 推荐尺寸 | 尺寸扩展建议 | 当前项目状态 |
| --- | --- | --- | --- | --- | --- |
| `welcome_header` | 首页欢迎区 | 可选轻量欢迎语、姓名/昵称或简短提示 | `3x1`, `2x1` | 可扩展为品牌化顶部问候条 | 已纳入白名单 |
| `asset_overview` | 资产概览区 | 展示 `total`、`wallet`、`tradingAccount` 中任意 1-3 项，可选入金/出金按钮 | `2x1`, `2x2`, `3x1` | 可扩展 `4x1` 作为宽屏账户指标条 | 已纳入白名单 |
| `quick_actions` | 快捷操作区 | 后台配置入口的占位、渲染和适配，AI 不写死入口 | `2x1`, `3x1`, `1x1` | 可扩展为横向快捷栏或紧凑菜单 | 已纳入白名单 |
| `onboarding_guide` | 新手引导区 | 未开户、未入金、未开始交易等阶段的引导 | `2x1`, `3x1`, `1x2` | 可扩展为流程进度或引导卡片组 | 已纳入白名单 |
| `trading_account_highlight` | 交易账户重点展示区 | 一个账号的基础信息、收益率、浮动盈亏和 ECharts 盈亏折线图 | `3x2`, `3x1` | 默认独占整横栏，轻量摘要才可压缩为横向图表条 | 已纳入白名单 |
| `trading_accounts_list` | 交易账户列表区 | 多账号简要信息、详情入口，支持表格、列表、真实/模拟分组、卡片墙和工作台切换 | `3x2`, `2x2` | 根据账号数量和字段密度选择版式，不默认卡片 | 已纳入白名单 |
| `promo_banner` | 活动 Banner 区 | 租户配置活动时展示活动内容和 CTA，不编造规则 | `2x1`, `3x1` | 可扩展为活动首屏横幅 | 已纳入白名单 |
| `pamm_products` | PAMM 产品推荐区 | PAMM 开启且接口返回产品时展示产品推荐 | `2x1`, `3x2`, `1x2` | 可扩展为排行榜或收益图卡片 | 已纳入白名单 |
| `copytrading_signals` | CopyTrading 信号源推荐区 | CopyTrading 开启且接口返回信号源时展示推荐交易员/策略；收益曲线必须用 ECharts 折线图或面积折线图 | `2x1`, `3x2`, `1x2`, `2x2` | 可扩展为热门榜单或曲线卡片 | 已纳入白名单 |
| `referral_link_card` | 推广链接卡片 | 代理/IB/合作伙伴轻量查看推广链接、邀请码和可选基础统计 | `1x1`, `1x2`, `2x1` | 可扩展为紧凑卡、横向信息卡或链接 + 统计组合卡 | 已纳入白名单 |
| `announcements` | 公告通知区 | 系统公告、活动公告、维护通知、资金通知、平台消息 | `2x1`, `3x1`, `1x1` | 可扩展为优先公告或紧凑 feed | 已纳入白名单 |
| `market_news` | 市场资讯区 | 市场新闻、平台资讯、新手教程、交易教育、热门文章 | `2x1`, `3x2`, `1x2` | 可扩展为文章卡片或内容 feed | 已纳入白名单 |
| `risk_disclosure` | 风险提示区 | 后台配置的风险披露、保证金提示和合规说明，不暗示稳赚 | `3x1` | 固定为页面底部 legal-strip 富文本区，不作为普通侧栏指标卡 | 已纳入白名单 |
| `faq_section` | FAQ 常见问题区 | 开户、入金、下载、交易规则等常见问题，内容来自后台配置 | `2x1`, `3x1`, `1x2` | 默认折叠问答 accordion，可扩展双列问答或紧凑列表 | 已纳入白名单 |
| `support_contact` | 在线客服区 | 在线客服、客户经理或服务时间入口，不编造在线状态 | `1x1`, `1x2`, `2x1` | 可扩展为客服卡、客户经理卡或联系条 | 已纳入白名单 |
| `app_download` | APP 下载区 | APP、MT5 或移动端下载入口，不编造链接或二维码 | `1x1`, `2x1`, `3x1` | 可扩展为二维码卡、商店按钮或下载横条 | 已纳入白名单 |

## 可发明与不可发明边界

为了避免首页生成过于死板，同时保证业务安全，AI 的发挥边界如下：

| 类型 | 是否允许 AI 发明 | 说明 |
| --- | --- | --- |
| 新业务功能 | 不允许 | 不能发明系统不存在的交易、支付、KYC、账户、钱包、代理功能 |
| 新业务模块 | 谨慎允许 | 只能作为候选模块，进入审核后才能成为正式模块 |
| 新组件 | 允许 | 可以基于现有组件生成新的内部组件或候选组件 |
| 新样式变体 | 允许 | 可以扩展 `moduleStyles`，但必须有父模块和回退样式 |
| 新组合模式 | 允许 | 可以扩展 `sections` 或 layout preset，必须保留业务主路径 |
| 新尺寸规格 | 允许 | 可以提出 `4x1`、`4x2`、`4x3` 等，但必须有响应式和回退规则 |
| 新数据字段 | 不可直接依赖 | 只能进入 `dataRequirements`，不能作为正式渲染依赖 |

## 历史参考图拆解

以下内容只用于理解旧静态页面和组件来源，不再作为 AI 生成首页的正式模块清单。凡是出现旧 `ReferralLink`、`UserKycRail`、`RiskNotice`、独立钱包列表、KYC 或完整代理数据的描述，都必须按历史兼容参考处理，正式输出仍以 16 个 canonical 内容块为准。

### 参考图 1：左侧导航型 Dashboard

可拆模块：

- 固定外壳：左侧菜单、顶部工具、用户头像。
- 页面页签：`Dashboard / My Account`，不作为首页积木。
- `AssetOverview`：欢迎用户 + 钱包余额 + TA 余额 + KYC 信息的横向摘要。
- `QuickActions`：两行四列操作按钮，适合 `3x1` 或 `2x1`。
- `ReferralLink`：完整邀请链接卡，适合 `3x1`。
- `TradingAccounts`：长表格账号/订单列表，适合 `3x2`。

适合沉淀为“传统后台工作台”预设。

### 参考图 2：完整资产管理纵向页

可拆模块：

- `AssetOverview`：Wallet Assets + Trading Account 合并资产卡。
- `QuickActions`：横向 icon + 文案工具条。
- `PromotionBanner`：大面积浅色广告占位。
- `TradingAccounts`：Live Account 表格。
- `TradingAccounts`：Demo Account 表格。
- `WalletList`：钱包表格。
- `WalletBalance`：底部钱包币种卡片组。

适合沉淀为“资产优先 / 纵向完整首页”预设。

### 参考图 3：横向摘要 + 长表格

可拆模块：

- `AssetOverview`：用户欢迎、钱包、TA、KYC 同行展示。
- `QuickActions`：两行按钮矩阵。
- `ReferralLink`：链接 + 邀请码 + 二维码。
- `TradingAccounts`：带筛选、添加账号、分页的长表格。

适合沉淀为“标准工作台 + 表格优先”预设。

### 参考图 4：专业交易工作台

可拆模块：

- `QuickActions`：仅 icon 的操作 Dock，适合 `3x1`。
- `AccountPerformance`：账号余额 + PnL 曲线，适合独立 `3x2` 整横栏。
- `UserKycRail`：右侧用户、时间、KYC、钱包摘要，适合 `1x2`。
- `PromotionBanner`：主栏短横幅，适合 `2x1`。
- `ReferralLink`：带统计的紧凑邀请卡。
- `OpenAccount`：空账号时的开真实/模拟/绑定入口，适合内嵌在交易账号模块。

适合沉淀为“专业交易 / 右侧信息栏”预设。

### 参考图 5：右侧开户表单型

可拆模块：

- `QuickActions`：icon Dock，选中态可显示 tooltip。
- `AccountPerformance`：账号表现图表。
- `UserKycRail`：右侧用户和钱包摘要。
- `OpenAccount`：右侧纵向开户入口。
- `CreateAccountForm`：右侧真实账号创建表单。
- `ReferralLink`：主栏邀请链接。
- `TradingAccounts`：主栏表格 + 操作菜单 + 分页。

适合沉淀为“开户转化 / 右侧操作面板”预设。

### 参考图 6：新客路径型

可拆模块：

- `AssetOverview`：顶部资产摘要。
- `OnboardingProgress`：三步开户路径，KYC、开真实账号、首次入金。
- `QuickActions`：横向工具条。
- `PromotionBanner`：可关闭广告占位。
- `TradingAccounts`：Live Account 表格。
- `TradingAccounts`：Demo Account 表格。
- `WalletList`：钱包表格。

适合沉淀为“新客开户路径 / 任务引导”预设。

## 业务模块拆解

### 1. `AssetOverview` 资产总览

内容能力：

- 总资产 / 钱包余额 / TA 余额 / 信用额。
- KYC 信息可作为附属指标，也可拆到 `UserKycRail`。
- 入金、出金可内嵌，也可拆到 `FundActions`。
- 必须支持控制是否展示钱包余额：`showWalletBalance: true | false`。
- 必须支持控制是否展示交易账户余额：`showTradingAccountBalance: true | false`。
- 当需求明确要求“账户余额总览不展示钱包余额、交易账户余额”时，必须只展示账户总览指标，不得把钱包或交易账户余额拆分塞进总览。

推荐规格：

- `3x1`：图 1、图 3 的横向指标条。
- `2x1`：图 2、图 6 的资产卡。
- `2x2`：图 4、图 5 的资产 + 图表工作台。

下一步样式方向：

- 标准白卡、科技数据条、VIP 资产 Hero、紧凑指标表、暗色终端。

### 2. `WalletBalance` 钱包余额

内容能力：

- 钱包总额。
- 币种卡片：USD、JPY、AUD、GBP、USDT 等。
- 入金 / 出金动作。
- 可独立展示，也可并入资产模块。

推荐规格：

- `1x1`：右侧钱包摘要。
- `1x2`：用户侧栏内的钱包详情。
- `2x1`：横向币种卡片组。

下一步样式方向：

- 币种分栏、钱包操作条、轻量钱包卡、表格型钱包。

### 3. `QuickActions` 快捷入口

内容能力：

- Deposit、Withdrawal、Internal Transfer、Wallet Flow。
- Order History、Open Positions、Pending Order、TA Flow。
- Open Account、Bind Account 可作为高优先级动作插入。
- 必须支持固定网格配置：`columns`、`rows`、`count`。
- 当需求明确要求“两行四列”时，桌面端必须渲染为 `columns: 4`、`rows: 2`、`count: 8`，不能做成横向滚动或单行工具条。
- `Bind Account` 必须受配置控制，不能默认出现。

推荐规格：

- `3x1`：完整横向工具条。
- `2x1`：两行四列矩阵。
- `1x1`：小型快捷动作组。

下一步样式方向：

- 两行矩阵、icon Dock、优先大按钮、纯 icon + tooltip、紧凑工具条。

### 4. `PromotionBanner` 广告/活动

内容能力：

- 广告图、活动 Banner、交易大赛、权益活动。
- 关闭后需要自动回收空间。
- 可作为首屏主视觉，也可作为中段辅助模块。
- 必须支持轮播：`carousel: true | false`。
- 必须支持顶部放置：`placement: "top"`。
- 当需求明确要求“首页顶部轮播图”时，必须放在首屏顶部，不得被放到中段或右侧 rail。

推荐规格：

- `3x1`：整行大 Banner。
- `2x1`：主内容短横幅。

下一步样式方向：

- 图片横幅、浅色占位、科技渐变、黑金权益、短轮播。

### 5. `referral_link_card` 推广链接卡片

内容能力：

- 推广链接。
- 邀请码。
- 复制推广链接按钮、复制邀请码按钮。
- 可选分享按钮。
- 可选打开数、注册数、开户数、注册转化率、开户转化率。

推荐规格：

- `1x1`：只展示推广链接、邀请码和复制按钮。
- `1x2`：链接 + 邀请码 + 基础统计。
- `2x1`：横向信息卡或链接 + 数据统计组合卡。

下一步样式方向：

- 紧凑卡片、链接优先、统计小卡组合、右侧辅助面板。

限制：

- 仅代理/IB/合作伙伴或租户开启推广链接功能时展示，普通客户首页不展示。
- 不展示返佣、团队入金、下级客户列表、层级关系或完整代理业绩。
- 推广链接、邀请码和统计数据必须来自后台配置或接口返回，AI 不得虚构。

### 6. `TradingAccounts` 交易账号

内容能力：

- Live / Demo / All 筛选。
- 真实和模拟合并或分开展示。
- 卡片、列表、长表格。
- 分页。
- 开户入口应靠近筛选区域或空状态区域。
- 账号卡片/列表信息固定为 9 项：账号类型（Demo/Live）、交易环境值、账号、余额、净值、信用金、账户类型、杠杆、保证金比例。交易环境值由 platform + server 合并展示，例如 `MT5 · HCHoldings-Live2`。
- 不得自行补充 PnL、用途、持仓、保证金占用、风险状态或操作按钮作为账号字段。
- 账号类型只表示 Live/Demo，账户类型只表示 ECN Standard、PAMM Investor、Demo ECN 等账户方案；不要把两个字段都写成“账号类型”。
- 同一个 `TradingAccounts` 模块只能选择一种主展示形态：卡片、列表或表格。不能上方先展示摘要卡/摘要行，下方再重复完整表格。
- platform/server 可以作为接口字段拆分，但客户侧优先合并显示为交易环境值；卡片里不要露出“平台/服务器”字段名，表格需要列名时用“交易环境”。
- 如果用户反馈“小卡片里面模块太多、重点太多、排版不行”，先减少重复容器和多形态堆叠；字段密度高时改用列表/表格，而不是新增状态看板、二级卡或操作区。
- 字段密度高或账号数量多时优先使用列表/表格，不默认卡片墙。
- 必须支持 `grouping: "combined | separated"`。
- 必须支持 `viewMode: "card | list | table"`。
- 必须支持 `tabMode: true | false`。
- 必须支持 `pagination: true | false` 和 `pageSize`。
- 当需求明确要求“真实账号和模拟账号上下两个列表”时，必须使用 `grouping: "separated"`，并渲染为 `RealTradingAccounts` 和 `DemoTradingAccounts` 两个独立 section。
- 当需求明确要求“模拟账号列表在真实账号列表上面”时，默认 All 状态必须先渲染 `DemoTradingAccounts`，再渲染 `RealTradingAccounts`。
- 当需求明确禁止 Tab 时，不允许用 Tab 或 CSS 隐藏 Tab 来实现。
- 当需求明确禁止卡片时，不允许使用账号卡片样式，必须使用列表或表格行。

推荐规格：

- `2x2`：账号卡片工作台。
- `3x2`：长表格 + 分页。

下一步样式方向：

- 安静列表、密集表格、账号卡片、分组表格、空状态开户卡。

### 7. `OpenAccount` 开户入口

内容能力：

- 开真实账号。
- 开模拟账号。
- 绑定账号。
- 可触发右侧表单、弹层或页面跳转。
- 必须支持 `real: true | false`、`demo: true | false`、`bind: true | false`。
- 当需求明确不要绑定账户入口时，必须设置 `bind: false`，页面中不能出现 Bind Account。
- 开真实账号入口应靠近真实账号列表，开模拟账号入口应靠近模拟账号列表。

推荐规格：

- `1x1`：单组开户按钮。
- `1x2`：右侧纵向开户面板。
- `2x1`：空状态横向三按钮。

下一步样式方向：

- 账号筛选旁的展开入口、右侧纵向按钮组、空状态三卡片、表单前置 CTA。

### 8. `OnboardingProgress` 开户路径

内容能力：

- KYC Prove。
- Open first live account。
- First Deposit。
- 当前步骤、完成状态、下一步 CTA。

推荐规格：

- `3x1`：完整三步路径。
- `2x1`：紧凑步骤条。

下一步样式方向：

- 三步路径、任务清单、紧凑进度条、新手引导 Hero。

### 9. `UserKycRail` 用户/KYC 侧栏

内容能力：

- 头像、姓名、所在地、当前时间。
- KYC 状态。
- 钱包摘要和币种小卡。
- 可承载开户入口或用户状态提醒。

推荐规格：

- `1x2`：右侧固定信息栏。
- `1x1`：只展示 KYC 或用户摘要。

下一步样式方向：

- 白卡侧栏、科技身份卡、KYC 状态卡、用户 + 钱包组合卡。

### 10. `AccountPerformance` 账号表现图表

内容能力：

- 当前账号选择。
- 7日/30日周期切换。
- 账号净值、权益、余额或 PnL 的 ECharts 折线图/面积折线图。
- Balance、Equity、Floating P/L、Margin Ratio、Credit、Leverage 中选择 3-4 个关键指标。
- 指标排版默认是一条轻量信息带，而不是多个小卡片；只有后台分析页或详细看板才允许展开成指标网格。
- 时间轴、当前点、高低点或起止点提示。
- X 轴日期标签；账号分析型图表可展示 XY 轴，轻量推荐图表可隐藏强轴线。
- 缺失接口值时使用 `--` 占位，不虚构账号号、余额、收益或风险等级。

推荐规格：

- `3x2`：默认账号表现整横栏，用于账号上下文 + 主数值 + ECharts 趋势 + 指标带。
- `3x1`：轻量横向图表条，仅用于简化摘要场景。

下一步样式方向：

- 专业交易图表、资产走势卡、简洁 ECharts 折线图、暗色数据终端。
- 禁止柱状占位、胶囊柱、纯 SVG 装饰图、D1/D7 占位日期、指标乱摆和大面积无意义留白。

### 11. `WalletList` 钱包列表

内容能力：

- 多币种钱包。
- 币种、余额、Deposit、Withdraw。
- 总计。
- 必须支持独立展示，不依赖 `WalletBalance` 或 `AssetOverview`。
- 钱包列表可以展示各钱包余额，但如果 `AssetOverview.showWalletBalance` 为 `false`，不得把钱包余额同步展示到账户总览中。

推荐规格：

- `3x2`：整行钱包表格。
- `2x2`：主栏钱包列表。

下一步样式方向：

- 安静表格、币种卡片组、紧凑钱包清单。

### 12. `CreateAccountForm` 创建账号表单

内容能力：

- 交易平台选择。
- 账户名称。
- 账户类型。
- 杠杆。
- 表单校验。
- 取消 / 确定。

推荐规格：

- `1x2`：右侧表单。
- `2x2`：主内容表单。

下一步样式方向：

- 右侧操作面板、抽屉表单、内嵌卡片表单。

## 常见强约束需求映射

当用户提出明确首页结构时，AI 需要把自然语言映射为配置字段，而不是只做样式调整。

### 淡色扁平化 + 顶部轮播 + 分离账号列表

适用需求：淡色扁平化界面、首页顶部轮播图、账户余额总览、2 行 4 列快捷入口、真实/模拟账号上下两个列表、模拟列表在真实列表上面、单独钱包小卡片列表、单独推广模块。

  推荐配置：

```js
{
  layout: "flatListDashboard",
  theme: "lightFlat",
  density: "balanced",
  personalizationStrength: "strong",
  sections: [
    { id: "topCampaign", type: "hero", title: "Campaign Banner", slots: ["PromotionBanner"] },
    { id: "accountOverview", type: "summary", title: "Account Overview", slots: ["AssetOverview"] },
    { id: "quickAccess", type: "actions", title: "Quick Actions", slots: ["QuickActions"] },
    { id: "realAccounts", type: "list", title: "Real Trading Accounts", slots: ["RealTradingAccounts"] },
    { id: "demoAccounts", type: "list", title: "Demo Trading Accounts", slots: ["DemoTradingAccounts"] },
    { id: "walletList", type: "list", title: "Wallet List", slots: ["WalletList"] }
  ],
  sizeTokens: {
    PromotionBanner: "4x1",
    AssetOverview: "4x1",
    QuickActions: "4x1",
    RealTradingAccounts: "4x2",
    DemoTradingAccounts: "4x2",
    WalletList: "4x2"
  },
  moduleStyles: {
    PromotionBanner: "classic-banner",
    AssetOverview: "metric-strip",
    QuickActions: "icon-grid",
    RealTradingAccounts: "calm-table",
    DemoTradingAccounts: "calm-table",
    WalletList: "calm-table"
  },
  moduleSettings: {
    PromotionBanner: { enabled: true, carousel: true, placement: "top" },
    AssetOverview: { enabled: true, showWalletBalance: false, showTradingAccountBalance: false, showFundActions: false },
    QuickActions: { enabled: true, count: 8, columns: 4, rows: 2, display: "iconText" },
    TradingAccounts: { grouping: "separated", viewMode: "list", tabMode: false, cardMode: false, pagination: true, pageSize: 5 },
    RealTradingAccounts: { enabled: true, viewMode: "list", pagination: true, pageSize: 5, showOpenAccount: true, showBindAccount: false },
    DemoTradingAccounts: { enabled: true, viewMode: "list", pagination: true, pageSize: 5, showOpenAccount: true, showBindAccount: false },
    WalletList: { enabled: true, viewMode: "list" },
    OpenAccount: { real: true, demo: true, bind: false, placement: "insideTradingAccounts" }
  },
  sizeCandidates: [
    {
      id: "wideFlatListSection",
      size: "4x2",
      parentModule: "TradingAccounts",
      purpose: "用于真实账号、模拟账号和钱包列表的宽屏表格区域",
      responsiveRules: ["1440px 下通栏展示", "1024px 下回退 3x2", "390px 下单列表格卡片化但仍保持列表语义"],
      fallbackSize: "3x2",
      status: "candidate"
    }
  ]
}
```

禁止项：

- 不要把真实账号和模拟账号做成 Tab。
- 不要把真实账号和模拟账号混在一个列表里。
- 不要在用户明确要求“模拟在上”时仍然先展示真实账号列表。
- 活动增长、交易大赛、奖池、广告轮播首屏核心这类需求，必须让 `adCarousel` 成为首个整行长模块，不能与快捷入口并排。
- 完整代理数据、返佣、团队层级、下级客户列表、KYC/风控提醒当前默认不作为首页内容块输出；推广链接/开户链接/邀请码只能在代理/IB/合作伙伴或租户开启推广链接功能时由 `referral_link_card` 轻量展示。客服、FAQ、风险提示、APP 下载如被选择，使用对应的 canonical 内容块。
- 钱包信息默认并入 `asset_overview` 的 `wallet` 字段或后台返回摘要；不要生成独立 `WalletList`/`WalletBalance` 首页模块。
- 不要使用账号卡片。
- 不要出现 Bind Account。
- 不要在账户总览里展示钱包余额或交易账户余额。

## 和当前项目的关系

当前项目已经有这些基础：

- `home-personalization.js` 已把 16 个 canonical 内容块纳入白名单、归一化和渲染映射。
- `home-personalization.js` 对历史 slot 仍做兼容读取，但输出会被归一化到 canonical 内容块或直接过滤。
- `home-layout-admin.js` 的配置应围绕 canonical 内容块继续收敛；快捷入口内容由后台配置或接口返回。
- `client-home.html` 的静态基础只能作为布局/视觉参考，不能绕过蓝图白名单新增业务模块。

下一步建议不是重写整个首页，而是做两件事：

1. 继续补齐 16 个 canonical 内容块的样式变体、响应式尺寸和空数据占位。
2. 对历史模块保持兼容过滤，不再把 `ReferralLink`、`UserKycRail`、`RiskNotice`、`WalletList`、`CreateAccountForm` 升为默认首页模块。

组件库页面已经补齐 `client-home.html` 的细颗粒组件拆解，包括 `WelcomeHeader`、`BalanceMetric`、`QuickActionTile`、`PromoBadge`、`AccountToolbar`、`ViewToggle` 等，这些组件只能作为 16 个 canonical 内容块的内部积木继续扩展。

AI 组件生成链路：

1. 管理员在 `home-module-preview.html` 输入组件需求、模块归属和尺寸。
2. 服务端把同 family / 同尺寸 / 与 prompt 相关的已保存积木摘要传给大模型，让模型先参考组件库内容，再生成组件或样式候选定义，包含 `html`、`css`、`layoutHints`、`sizeHints`、`responsiveRules`、`fallbackSize` 和 `dataRequirements`。
3. 生成结果保存到 `home-component-library.json`，同时写入浏览器缓存便于即时预览。
4. AI 可以读取已保存组件，生成 `home-component-compositions.json` 里的首页组合建议。
5. 首页生成器再根据组合建议生成草稿配置，进入 `home-layout-preview.html` 做最终预览和美化确认。
6. 如果生成结果包含新的尺寸、样式或组件，需要先以候选状态展示；确认可用后，再沉淀为正式 `moduleStyles`、`sizeTokens` 或组件库成员。

## 下一步样式优先级

第一批先做高频核心模块：

1. `asset_overview`
2. `quick_actions`
3. `trading_account_highlight`
4. `trading_accounts_list`
5. `onboarding_guide`

第二批再做布局增强模块：

1. `promo_banner`
2. `pamm_products`
3. `copytrading_signals`
4. `referral_link_card`
5. `announcements`
6. `market_news`
7. `risk_disclosure`
8. `faq_section`
9. `support_contact`
10. `app_download`

第三批做低频但完整性需要的模块：

1. `WalletList`
2. `CreateAccountForm`

这样 AI 后续组装首页时，可以先保证首页业务主路径完整，再逐步增加风格差异和高级布局。
