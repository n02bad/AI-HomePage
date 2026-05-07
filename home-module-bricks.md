# 首页积木模块拆解 v1

这份拆解把参考图和当前项目里的首页方案合并成一套可供 AI 组装的首页积木库。目标不是复制某一张首页，而是让 AI 在生成新首页时能够明确选择模块、尺寸、位置、业务优先级和后续样式变体。

## 拆解原则

- 共用外壳不进入积木库：顶部导航、左侧菜单、消息/语言/头像、一级页签属于公共布局，由 `common-layout.js` 和页面外壳控制。
- 首页内容才进入积木库：资产、钱包、快捷入口、广告、邀请、交易账号、开户、KYC/用户信息、图表等才是 AI 可以拼装的模块。
- 模块要有尺寸，不只要有样式：每个模块都需要标注适合 `1x1`、`1x2`、`2x1`、`2x2`、`3x1` 等规格，方便拼版。
- 样式和业务能力分开：同一个模块先定义“能做什么”，下一步再扩展“长什么样”。
- 开户入口和交易账号属于同一业务路径：默认应靠近账号筛选、账号列表或右侧开户操作区，不应藏在页面很深的位置。

## 积木尺寸定义

| 尺寸 | 对应布局 | 适合内容 |
| --- | --- | --- |
| `1x1` | 右侧 rail / 小卡片 | KYC 状态、钱包币种、小指标、单个快捷动作 |
| `1x2` | 右侧高卡 / 侧栏 | 用户信息、KYC + 钱包、开户操作、创建账号表单 |
| `2x1` | 主内容横卡 | 资产摘要、快捷入口、邀请链接、开户路径 |
| `2x2` | 主内容重点模块 | 资产驾驶舱、交易账号工作台、图表 + 账号概览 |
| `3x1` | 整行横幅 | 广告轮播、快捷工具条、完整邀请条 |
| `3x2` | 大面积内容区 | 交易账号长表格、Live/Demo/Wallet 分组列表 |

当前项目里 `hero/main/rail` 可以继续保留，后续可把它映射到这套尺寸：

- `hero` 约等于 `3x1` 或 `3x2`
- `main` 约等于 `2x1` 或 `2x2`
- `rail` 约等于 `1x1` 或 `1x2`
- `full` 约等于 `3x1` 或 `3x2`

## 模块总览

| 模块 ID | 中文名称 | 核心职责 | 推荐尺寸 | 当前项目状态 |
| --- | --- | --- | --- | --- |
| `AssetOverview` | 资产总览 | 展示总资产、钱包资产、交易账号资产、入金/出金入口 | `2x1`, `2x2`, `3x1` | 已有一等模块和变体 |
| `WalletBalance` | 钱包余额 | 展示钱包总额、币种拆分、入金/出金 | `1x1`, `1x2`, `2x1` | 已有一等模块和变体 |
| `QuickActions` | 快捷入口 | 放置 Deposit、Withdrawal、Internal Transfer、Wallet Flow、Order、Position 等操作 | `2x1`, `3x1`, `1x1` | 已有一等模块和变体 |
| `PromotionBanner` | 广告/活动 | 放置活动图、轮播、权益 Banner、交易大赛 | `2x1`, `3x1` | 已有一等模块和变体 |
| `ReferralLink` | 邀请链接 | 推广链接、邀请码、二维码、点击/注册/交易账号统计 | `2x1`, `3x1`, `1x1` | 已能渲染，需升为一等模块 |
| `TradingAccounts` | 交易账号 | Live/Demo 合并或分组、卡片/列表、详情、分页、创建入口 | `2x2`, `3x2` | 已能渲染，需升为一等模块 |
| `OpenAccount` | 开户入口 | 开真实账号、开模拟账号、绑定账号、创建表单入口 | `1x1`, `1x2`, `2x1` | 已是配置能力，需独立模块化 |
| `OnboardingProgress` | 开户路径 | KYC、首个真实账号、首次入金等步骤引导 | `2x1`, `3x1` | 已能渲染，需升为一等模块 |
| `UserKycRail` | 用户/KYC 侧栏 | 头像、名称、所在地、时间、KYC 状态、钱包摘要 | `1x2` | 参考图中明显，项目未一等模块化 |
| `AccountPerformance` | 账号表现图表 | 当前账号余额、权益、信用、杠杆、PnL 曲线 | `2x2` | 参考图中明显，项目未模块化 |
| `WalletList` | 钱包列表 | 多币种钱包表格、余额、Deposit/Withdraw 操作 | `3x2`, `2x2` | 参考图中明显，项目未模块化 |
| `CreateAccountForm` | 创建账号表单 | 真实账号创建表单、平台、名称、类型、杠杆、校验 | `1x2`, `2x2` | 参考图中明显，项目未模块化 |

## 参考图拆解

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
- `AccountPerformance`：账号余额 + PnL 曲线，适合 `2x2`。
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

推荐规格：

- `3x1`：整行大 Banner。
- `2x1`：主内容短横幅。

下一步样式方向：

- 图片横幅、浅色占位、科技渐变、黑金权益、短轮播。

### 5. `ReferralLink` 邀请链接

内容能力：

- 推广链接。
- 邀请码。
- 二维码。
- 点击数、注册数、交易账号数。
- 复制动作。

推荐规格：

- `3x1`：完整邀请控制台。
- `2x1`：链接 + 邀请码。
- `1x1`：紧凑邀请卡。

下一步样式方向：

- 链接优先、数据优先、紧凑邀请、渠道增长 Hero。

### 6. `TradingAccounts` 交易账号

内容能力：

- Live / Demo / All 筛选。
- 真实和模拟合并或分开展示。
- 卡片、列表、长表格。
- 账号详情、更多操作、分页。
- 开户入口应靠近筛选区域或空状态区域。

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
- Balance、Equity、Credit、Leverage。
- PnL 曲线。
- 时间轴或指标切换。

推荐规格：

- `2x2`：主栏账号表现。
- `3x1`：横向图表条。

下一步样式方向：

- 专业交易图表、资产走势卡、简洁折线图、暗色数据终端。

### 11. `WalletList` 钱包列表

内容能力：

- 多币种钱包。
- 币种、余额、Deposit、Withdraw。
- 总计。

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

## 和当前项目的关系

当前项目已经有这些基础：

- `home-personalization.js` 有 `AssetOverview`、`WalletBalance`、`QuickActions`、`PromotionBanner` 四个一等模块。
- `home-personalization.js` 已经能渲染 `fundActions`、`openAccountActions`、`onboardingProgress`、`referralLink`、`tradingAccounts` 等 slot。
- `home-layout-admin.js` 已经有模块配置面板，可配置广告、快捷入口、钱包、资产、邀请、交易账号、开户。
- `client-home.html` 已经有账户总览、开户进度、广告、快捷入口、邀请链接、交易账号这些静态模块基础。

下一步建议不是重写整个首页，而是做两件事：

1. 把 `ReferralLink`、`TradingAccounts`、`OpenAccount`、`OnboardingProgress`、`UserKycRail`、`AccountPerformance`、`WalletList`、`CreateAccountForm` 也升成一等模块。
2. 给每个模块补 3 到 5 个清晰样式，而不是一次性做很多相似皮肤。

组件库页面已经补齐 `client-home.html` 的细颗粒组件拆解，包括 `WelcomeHeader`、`BalanceMetric`、`FundAction`、`ProgressTask`、`QuickActionTile`、`PromoBadge`、`ReferralField`、`AccountToolbar`、`ViewToggle` 等，这些组件可以作为大模块的内部积木继续扩展。

AI 组件生成链路：

1. 管理员在 `home-module-preview.html` 输入组件需求、模块归属和尺寸。
2. 服务端调用大模型生成组件定义，包含 `html`、`css`、`layoutHints` 和 `dataRequirements`。
3. 生成结果保存到 `home-component-library.json`，同时写入浏览器缓存便于即时预览。
4. AI 可以读取已保存组件，生成 `home-component-compositions.json` 里的首页组合建议。
5. 首页生成器再根据组合建议生成草稿配置，进入 `home-layout-preview.html` 做最终预览和美化确认。

## 下一步样式优先级

第一批先做高频核心模块：

1. `AssetOverview`
2. `QuickActions`
3. `TradingAccounts`
4. `OpenAccount`
5. `ReferralLink`

第二批再做布局增强模块：

1. `UserKycRail`
2. `AccountPerformance`
3. `OnboardingProgress`
4. `WalletBalance`
5. `PromotionBanner`

第三批做低频但完整性需要的模块：

1. `WalletList`
2. `CreateAccountForm`

这样 AI 后续组装首页时，可以先保证首页业务主路径完整，再逐步增加风格差异和高级布局。
