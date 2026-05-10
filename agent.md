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
4. Business Focus 差异：首页重点可以偏资产展示、专业交易、新客引导、活动曝光、PAMM/CopyTrading 推荐或内容资讯。

禁止只通过更换标题、颜色、文案、间距或模块顺序来伪装成个性化首页。AI 首页个性化的重点是在利用基础组件、基础积木块来延伸布局，通过组件、积分快的个性化设计(不改变功能只改变样式布局)、布局预设、主题 token、模块变体之间做组合，并且必须让不同租户首页产生肉眼可见的差异。

## 关键边界

- 欢迎模块不是必选；如果展示，应放在首页第一栏或顶部区域，保持轻量欢迎语，不承载复杂业务数据。
- AI 生成或优化首页前必须遵守 `AI_UI_GENERATION_PROTOCOL.md`：先提取硬性要求、设计意图和禁止项，再生成受控首页蓝图；数量、账号分组、筛选形态等明确要求必须作为可失败的验收标准。
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
- 视觉词不能反向绑架业务意图。`淡蓝色`、`扁平化`、`圆角10`、`PingFang SC` 只影响 theme token 和模块视觉，不应把新客、跟单或活动需求强行改回资产/资金可信首页。
- 首页 AI 生成通过本地 `server.js` 的 `/api/home-ai/complete` 后端代理调用 OpenAI、Claude、MiniMax、Kimi、DeepSeek；不要在前端直连外部模型接口，生产环境密钥应走环境变量。
- 组件库 AI 生成通过本地 `server.js` 的 `/api/home-components/*` 接口完成。AI 只能生成受控组件定义和组合建议，不能直接改正式首页代码。
- AI 生成模块或首页蓝图前必须先参考组件库已保存积木的字段、尺寸、按钮、标签、卡片密度和视觉层级，再根据管理员意图发挥；组件库是灵感和形态参考，不是新增业务功能授权。
- 大模型不是首页搭建器的单点依赖。首页配置模型、模块白名单、mock 链路和发布流程必须先独立跑通；某个 provider 调不通时，不要阻塞首页编辑、预览和发布主流程。
- AI 生成首页必须采用自适应 auto layout 思路：桌面优先用 12 栅格紧凑填充，移动端降级单列，不能用空白占位、固定大高度或孤立小模块制造“东缺一块西缺一块”的页面。
- AI 生成图表前必须先判断数据语义。连续时间数据，例如近 7/30/90 日收益、净值、PnL、回撤变化、收益曲线，必须使用折线图或面积折线图；不得默认画成柱状图、胶囊柱或纯装饰条。
- 积木块的尺寸、名称、选择理由只能作为配置数据、调用记录或 DOM `data-*` 调试属性存在，不能作为用户端首页或 iframe 预览里的可见 UI。
- 禁止生成系统功能以外的内容

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
- 最新 V4 模型 ID 是 `deepseek-v4-pro` 和 `deepseek-v4-flash`；首页/组件生成默认优先用 `deepseek-v4-flash` 保证稳定，复杂方案可手动切到 `deepseek-v4-pro`。
- DeepSeek V4 默认 thinking mode 是开启的；本项目只需要受控 JSON 首页蓝图，所以代理层必须发送 `thinking: { "type": "disabled" }`，避免长推理导致超时或 JSON 输出被推理过程拖慢。
- 如果手动选择 `deepseek-v4-pro`，代理层应在 Pro 超时或返回不可解析 JSON 时自动用 `deepseek-v4-flash` 重试；不要让一次 Pro 慢调用阻塞首页编辑、预览和发布。
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

当管理员选择“明显差异”、AI 判断租户需要品牌化首页、或页面风格预设为高净值黑金、活动增长、专业交易、新客引导、PAMM/CopyTrading 推荐等强风格方案时，必须使用 `strong`，不能只换颜色或文案。

不同强度的处理边界：

- `subtle`: 适合已有租户轻量换肤，不应大幅改变模块位置。
- `medium`: 适合多数租户品牌化首页，允许调整首屏布局和模块样式。
- `strong`: 适合需要“看起来不像同一套首页”的租户，必须使用差异明显的 layout preset 和 module style 组合。

## 首页模块清单

后续开发必须围绕以下 16 个首页内容块建模，不要把功能散落在临时 HTML 里。AI 可以自由组合布局、尺寸、顺序和样式，但不能新增系统未支持的业务功能。

| 模块 ID | 中文名称 | 生成规则 |
| --- | --- | --- |
| `welcome_header` | 首页欢迎区 | 可选；轻量欢迎语、姓名/昵称或短提示，不承载复杂业务数据 |
| `asset_overview` | 资产概览区 | 可选但建议靠上；只展示 `total`、`wallet`、`tradingAccount` 中任意 1-3 项，可选资金按钮 |
| `quick_actions` | 快捷操作区 | 内容由后台配置或接口返回；AI 只决定展示方式、数量和适配，不写死入口 |
| `onboarding_guide` | 新手引导区 | 可选；仅适合未开户、未入金、未开始交易等阶段 |
| `trading_account_highlight` | 交易账户重点展示区 | 可选；突出一个账号，可展示收益率、浮动盈亏和盈亏折线图，数据来自接口 |
| `trading_accounts_list` | 交易账户列表区 | 展示多个交易账号，可用列表、卡片组、横滑卡片或紧凑账户卡 |
| `promo_banner` | 活动 Banner 区 | 仅租户配置活动时展示，不虚构活动或奖励规则 |
| `pamm_products` | PAMM 产品推荐区 | 仅开启 PAMM 且接口返回产品时展示 |
| `copytrading_signals` | CopyTrading 信号源推荐区 | 仅开启 CopyTrading 且接口返回信号源时展示 |
| `referral_link_card` | 推广链接卡片 | 可选；仅代理/IB/合作伙伴或租户开启推广链接功能时展示，轻量展示推广链接、邀请码和可选基础统计 |
| `announcements` | 公告通知区 | 可选；普通公告不能抢核心模块优先级 |
| `market_news` | 市场资讯区 | 可选；适合首页下半部分，不优先于资产、账号和快捷操作 |
| `risk_disclosure` | 风险提示区 | 可选；展示后台配置的风险披露、保证金提示和合规说明，不暗示稳赚 |
| `faq_section` | FAQ 常见问题区 | 可选；展示后台配置的开户、入金、下载、交易规则等常见问题 |
| `support_contact` | 在线客服区 | 可选；展示在线客服、客户经理或服务时间入口，不编造在线状态 |
| `app_download` | APP 下载区 | 可选；展示 APP、MT5 或移动端下载入口，不编造下载链接或二维码 |

默认不再让 AI 主动生成 `reward_tasks`、`kyc_risk_notice`、`ib_dashboard`。旧的 `referralLink`、`userKycRail`、`riskNotice`、`support_help` 只作为历史兼容输入处理，不作为新首页内容块输出；代理推广只允许用轻量 `referral_link_card` 承接。

## 模块样式变体矩阵

首页模块必须通过受控 `moduleStyles` 实现差异化，不允许每次临时写一套散乱样式。每个页面风格预设必须组合不同的模块变体，而不是复用同一套标准卡片。

| 模块 | 样式变体 | 用途 |
| --- | --- | --- |
| `welcome_header` | `minimal` / `personal` / `brand-line` | 可选轻量欢迎语，放顶部，不承载复杂业务数据 |
| `asset_overview` | `metric-strip` / `quiet-card` / `split-card` / `ticker-strip` | 展示 `total`、`wallet`、`tradingAccount` 中任意 1-3 项 |
| `quick_actions` | `icon-grid` / `action-dock` / `compact-menu` / `command-bar` | 后台配置入口的展示容器，AI 不写死入口内容 |
| `onboarding_guide` | `path` / `checklist` / `guide-cards` / `compact` | 新用户或未完成关键流程时的轻量引导 |
| `trading_account_highlight` | `clean-snapshot` / `sparkline-board` / `split-performance` | 一个重点交易账号的余额、净值、收益率、浮动盈亏和折线图 |
| `trading_accounts_list` | `workbench` / `dense-cards` / `calm-table` / `horizontal-cards` | 多个交易账号的列表、卡片组或横滑卡片 |
| `promo_banner` | `banner` / `editorial-cover` / `compact-strip` / `split-visual` | 租户已配置活动时展示的活动 Banner |
| `pamm_products` | `cards` / `ranking` / `yield-chart-cards` | PAMM 开启时的产品推荐 |
| `copytrading_signals` | `signal-cards` / `ranking` / `curve-cards` | CopyTrading 开启时的信号源推荐 |
| `referral_link_card` | `compact-card` / `link-first` / `stats-card` | 代理/IB/合作伙伴可见的轻量推广链接、邀请码和基础统计 |
| `announcements` | `list` / `priority-notice` / `compact-feed` | 公告通知，不抢核心模块优先级 |
| `market_news` | `feed` / `article-cards` / `education-list` | 市场资讯、平台资讯、教程或热门文章 |
| `risk_disclosure` | `compact-notice` / `margin-guard` / `legal-strip` | 风险披露、保证金提示和合规说明 |
| `faq_section` | `accordion` / `two-column` / `compact-list` | 后台配置的常见问题 |
| `support_contact` | `service-card` / `manager-card` / `compact-bar` | 客服、客户经理或服务时间入口 |
| `app_download` | `qr-card` / `store-buttons` / `compact-banner` | APP、MT5 或移动端下载入口 |

样式变体要求：

- 每个变体必须对应真实业务功能，不允许只有装饰效果。
- 默认样式必须保留，用于兼容原首页。
- 新增变体必须在 390px 和 1440px 下都可用。
- 变体切换应该通过配置字段驱动，不能依赖手动改 HTML。

## 图表语义和推荐模块布局

AI 在选择图表前必须先判断数据类型，再选择组件形态，不能看到数字就默认画柱状图。

| 数据类型 | 关键词 | 推荐图表 | 禁止 |
| --- | --- | --- | --- |
| 时间趋势 | 近 N 天、7/30/90 日、走势、曲线、收益变化、净值变化、PnL、回撤变化 | 折线图 / 面积折线图 | 柱状图、胶囊柱、装饰性条形图 |
| 类别对比 | 不同信号源、不同产品、不同渠道、不同账户组 | 柱状图 / 横向条形图 | 折线图 |
| 占比结构 | 构成、比例、分布、配置 | 环形图 / 堆叠条 / 分段指标 | 折线图 |
| 单一状态 | 风险等级、稳定型、当前状态、是否开启 | 指标卡 / 标签 / 状态 Badge | 复杂图表 |

硬规则：

- 只要字段或 prompt 同时出现“近 N 天 / 7 日 / 30 日 / 90 日”和“收益 / 净值 / 走势 / 曲线 / PnL / 回撤”，默认必须使用折线图或面积折线图。
- 除非用户明确要求柱状图，否则不得把连续时间趋势画成柱状图、胶囊柱或装饰性条形图。
- 趋势图必须让用户看出方向、波动幅度和关键节点，至少包含时间轴提示、趋势线和当前值/最高点/最低点/回撤点中的一种关键标注。
- 数据点少于 4 个时，不生成趋势图，改为指标卡或短说明。
- 图表区域必须承载真实数据语义，不允许只做成看起来像图表的装饰背景。

`copytrading_signals` 的曲线推荐卡应按以下层级组织：

1. 模块标题 + 一句话推荐结论。
2. 信号源名称 + 风险或稳定性标签，不使用大面积装饰横幅抢占空间。
3. 3 到 4 个核心指标等宽展示，例如近 30 日收益率、总收益、最大回撤、风险等级。
4. 以折线图或面积折线图展示收益曲线，作为主要判断依据。
5. AI 推荐理由紧贴图表下方，解释指标和曲线为何支持推荐。
6. 底部只保留一个主操作按钮，按钮高度控制在 44-56px，不能比数据区更抢眼。

不合格模式：

- 将“近 30 天收益走势”“收益率曲线”“净值变化”画成柱状图。
- 图表没有横轴时间、没有趋势线、没有关键点，只是渐变装饰块。
- 大面积渐变背景比真实数据更醒目。
- 卡片内部再套过多卡片，导致第一眼看不到信号源、指标、趋势和推荐理由。

## 首页积木组件库思路

组件库是首页生成系统的中间层，不是单纯展示页面。它承担三件事：

1. 把现有首页拆成可复用积木。
2. 让 AI 能继续生成新的组件积木并保存。
3. 让首页 AI 从已保存积木里选择、组合、再美化布局。

生成顺序必须是：先读取组件库积木内容，理解已有字段、按钮、标签、尺寸和布局节奏；再根据本次 prompt 的业务意图做新的组合、变体或样式发散。AI 可以有自由度，但不能脱离组件库语言空想一个与系统无关的新模块。

组件库必须同时维护两种粒度：

- 模块级积木：只面向 `welcome_header`、`asset_overview`、`quick_actions`、`onboarding_guide`、`trading_account_highlight`、`trading_accounts_list`、`promo_banner`、`pamm_products`、`copytrading_signals`、`referral_link_card`、`announcements`、`market_news`、`risk_disclosure`、`faq_section`、`support_contact`、`app_download` 这 16 个首页内容块。
- 细颗粒组件：从 `client-home.html` 拆出的 `WelcomeHeader`、`BalanceMetric`、`QuickActionTile`、`PromoBadge`、`AccountToolbar`、`ViewToggle` 等，只能作为上述内容块内部元素继续扩展。

积木尺寸用固定规格表达：

```text
1x1: 小卡片、小指标、紧凑资讯
1x2: 右侧侧栏、轻量引导、榜单摘要
2x1: 主内容横卡、资产概览、快捷入口
2x2: 资产驾驶舱、账号工作台、图表模块
3x1: 整行横幅、工具条、公告/资讯条
3x2: 长表格、交易账号列表、产品/信号源列表
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
| 欢迎模块、欢迎区 | `welcome_header` | 可选顶部轻量模块，不自动补齐，不抢业务首屏 |
| 账户余额总览、资产概览 | `asset_overview` | `assets.enabled = true`，`assets.visibleFields` 只能取 `total`、`wallet`、`tradingAccount` 中 1-3 个 |
| 快捷入口两行、一行几个 | `quick_actions` | `quickActions.enabled = true`，`quickActions.count` 可按面积设置，`quickActions.actions` 默认空数组 |
| 新手、新客、未开户、未入金 | `onboarding_guide` | 仅作为轻量引导，不生成 KYC/风控模块 |
| 重点交易账号、收益率、盈亏折线图 | `trading_account_highlight` | 展示一个账号的核心表现，数据和图表来自接口 |
| 多个交易账号、账号列表 | `trading_accounts_list` | 按账号数量选择列表、卡片组、横滑卡片或紧凑账户卡 |
| 活动、Banner、推广活动 | `promo_banner` | 仅租户已配置活动时展示，不编造奖励规则 |
| PAMM 产品 | `pamm_products` | 仅 PAMM 开启且接口有产品时展示 |
| CopyTrading、信号源、推荐交易员 | `copytrading_signals` | 仅 CopyTrading 开启且接口有信号源时展示 |
| 代理推广链接、邀请码 | `referral_link_card` | 仅代理/IB/合作伙伴或租户开启推广链接功能时展示；普通客户不展示 |
| 公告、通知、维护消息 | `announcements` | 可选，普通公告放中下部 |
| 市场资讯、交易教育、热门文章 | `market_news` | 可选，默认不优先于资产、账号和快捷入口 |

关键约束：

- 用户明确要求“两个列表”“真实列表 + 模拟列表”“Live/Demo 分开”时，绝不能只用一个筛选器列表替代，必须在默认全部状态下渲染两个独立列表区块。
- 用户明确要求“模拟账号列表在真实账号列表上面”时，默认 All 状态必须先展示 Demo List，再展示 Live List。
- 用户明确要求“列表形式，不是卡片”时，不能返回 `viewMode: "card"` 或 `switchable` 作为主结果。
- 用户要求活动、交易大赛、奖池等内容时，只在租户配置活动的前提下使用 `promo_banner`，不能编造活动或奖励规则。
- 用户要求“钱包列表”时，默认由 `asset_overview` 的 `wallet` 字段或后台返回的钱包摘要承接，不能新增独立钱包业务模块。
- 用户要求代理推广链接、邀请码时，只能在代理/IB/合作伙伴或租户开启推广链接功能的前提下使用 `referral_link_card`；不得生成返佣、团队层级、下级客户列表或完整 `ib_dashboard`。
- 用户同时要求新用户开户引导和 CopyTrading 推荐时，应走“新客跟单驾驶舱”结构：首屏放 `copytrading_signals` + `onboarding_guide`，快捷入口控制数量，真实账号卡片和模拟账号卡片在账号区明显分开。
- 积木组合可以参考已保存 AI 组件，但正式首页仍必须通过白名单模块渲染；未进入白名单的数据结构只能作为布局和样式参考。
- `sections` 不能有空数组，`layout` 不能包含禁用或不可渲染模块；如果某个功能关闭，生成器和标准化层必须把对应 slot 移除，而不是留一个空白模块。
- 小尺寸积木（`1x1`、`1x2`）不能孤立占据整行，必须和资产、账号、快捷入口、公告/资讯等相关积木成组排布；`3x1`、`3x2` 才适合整行视觉或长列表。
- 预览页和正式首页都不能展示 `brickName`、`brickSize`、`brickReason` 等积木说明条；管理员要看这些信息时，应在方案摘要、调用记录或 DOM 调试属性里查看。

## 页面治理契约

AI 生成首页不能只靠 prompt 自觉遵守结构。每个结果都要先经过 `pageIntent` 对应的治理契约，再进入预览和发布。治理契约在 `home-personalization.js` 的 `PAGE_GOVERNANCE_CONTRACTS` 与 `evaluatePageGovernance()` 中执行，服务端 prompt 与 mock/enforce 流程在 `server.js` 同步一份同名约束。

治理契约至少检查五件事：

1. 页面主目标是否清楚：首屏必须出现该意图的核心模块。
2. 主操作是否重复过度：入金、开户、报名等 CTA 只能来自系统能力或后台配置，不能因为多个积木相关而满屏重复。
3. 操作区是否早于账号区：快捷入口或新手引导应在长表格和账号列表之前。
4. 低优先级模块是否克制：和当前目标弱相关的模块不能挤进首屏主线。
5. 模块数量是否可控：优先做清晰分层，不把所有可用模块堆到一屏。

预览页左侧会展示 `页面质检` 分数。低于 90 分时，不要只改文案，应回到 `sections`、`moduleStyles`、`moduleSettings` 和 `brickPlan` 调整结构。

入金转化相关需求当前按受控内容块处理：

- 首屏优先使用 `asset_overview`，可在该模块内按系统能力展示入金/出金按钮。
- 只有租户配置活动时才使用 `promo_banner`，不得编造活动档位、赠金金额或奖励规则。
- `quick_actions` 只展示后台配置或接口返回的入口；AI 不得写死 `deposit`、`withdraw`、`openReal`、`contactService` 等动作。
- 独立资金操作区、钱包列表、KYC/风控、完整代理数据和客服帮助都不属于当前默认首页内容块；轻量推广链接只能由 `referral_link_card` 承接。
- 账号区可以展示交易账号、余额、净值、杠杆、收益率、浮动盈亏和轻量趋势，但数据必须来自接口。

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
      id: "asset-overview-hero",
      component: "asset_overview",
      slot: "hero | main | rail | full",
      priority: 20,
      brickId: "assetOverview.flexible",
      brickName: "资产概览区",
      brickFamily: "AssetOverview",
      brickSize: "2x1",
      brickZone: "hero",
      brickReason: "用户需要在首页上半部分快速了解资产情况。"
    }
  ],
  brickPlan: [
    {
      brickId: "tradingAccountHighlight.performance",
      brickName: "交易账户重点展示区",
      family: "TradingAccountHighlight",
      feature: "trading_account_highlight",
      component: "trading_account_highlight",
      size: "2x2",
      zone: "main",
      reason: "突出一个交易账号的收益率、浮动盈亏和盈亏折线图。"
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
- 用户端首页和 iframe 预览不能展示可见的积木标识条；积木尺寸、名称和选择理由只能保留在数据结构、调用记录和 DOM `data-*` 属性中。
- 未进入白名单的 AI 生成组件不能直接注入正式首页，只能先存在 `home-component-library.json`，再作为组合建议参与后续白名单扩展。

本地积木引擎必须覆盖这些策略：

| intent | 触发词 | 默认积木组合 |
| --- | --- | --- |
| `asset` | 资产、钱包、资金、余额 | `asset_overview`、`quick_actions`、`trading_account_highlight`、`trading_accounts_list` |
| `trader` | 专业交易、MT5、持仓、订单、表现图表 | `trading_account_highlight`、`trading_accounts_list`、`quick_actions`、`market_news` |
| `onboarding` | 新手、新客、未开户、未入金、未交易 | `welcome_header`、`onboarding_guide`、`asset_overview`、`quick_actions`、`trading_accounts_list` |
| `growth` | 活动、比赛、奖池、营销、转化、Banner | `promo_banner`、`quick_actions`、`asset_overview`、`trading_accounts_list` |
| `investment` | PAMM、资管、产品推荐 | `asset_overview`、`pamm_products`、`announcements`、`market_news` |
| `copytrading` | 跟单、CopyTrading、信号源、推荐交易员 | `copytrading_signals`、`trading_account_highlight`、`quick_actions`、`market_news` |
| `partner` | IB、代理用户、合作伙伴、推广链接、邀请码 | `referral_link_card`、`asset_overview`、`quick_actions`、`trading_accounts_list` |
| `standard` | 默认或无法判断 | `asset_overview`、`quick_actions`、`trading_account_highlight`、`trading_accounts_list` |

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
    { id: "overview", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] },
    { id: "accounts", type: "split", title: "交易账户", slots: ["trading_account_highlight", "trading_accounts_list"] }
  ],
  moduleStyles: {
    asset_overview: "metric-strip | quiet-card | split-card",
    quick_actions: "matrix | toolbar | compact-menu",
    trading_account_highlight: "clean-snapshot | sparkline-board",
    trading_accounts_list: "workbench | dense-cards | calm-table"
  },
  moduleSettings: {
    quickActions: { count: 4, display: "iconText | iconOnly | hoverText", actions: [] },
    assets: { enabled: true, visibleFields: ["total", "wallet", "tradingAccount"], showFundActions: false },
	    tradingAccounts: { realEnabled: true, demoEnabled: true, grouping: "combined | separated", viewMode: "card | list | switchable" },
	    pamm: { enabled: false },
	    copytrading: { enabled: false },
	    referralLinkCard: { enabled: false, showPromoLink: true, showInviteCode: true, showStats: false },
	    announcements: { enabled: false },
	    marketNews: { enabled: false }
  }
}
```

页面风格预设必须基于该配置模型整体切换，不允许只修改单个字段。一个有效的 preset 至少要同时定义 `layout`、`theme`、`density`、`personalizationStrength`、核心 `sections`、核心 `moduleStyles` 和关键 `moduleSettings`。

如果当前静态原型暂时没有完整后台字段，也要让前端结构靠近这个模型，避免后续接后台时重做。

## 体验规则

- 输入页只解决“想做什么”。不要在输入页放完整预览和复杂控制。
- 预览页只解决“怎么组合和选样式”。不要恢复批注层、随机按钮堆、默认展开 JSON 等重交互。
- 预览页的页面风格按钮应该一键切换成明显不同的首页方案，例如高净值黑金、活动增长、专业交易、新客引导、PAMM 推荐或 CopyTrading 推荐。
- 预览页的页面风格按钮不能只是换色。每个按钮必须切换到不同的 layout、theme、moduleStyles 和关键 moduleSettings，并在 1440px 预览下形成肉眼可见差异。
- 模块样式选择应该是少量明确选项，每个模块 2 到 3 个常用样式优先。
- 交易账号相关的查看详情、快速入金等动作应该靠近账号模块，但按钮是否出现取决于接口数据和系统能力。
- 入金、出金按钮如果出现在资产概览中，必须是可选操作，不得在快捷入口中被 AI 写死。
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
   - 高净值黑金：突出资产、重点账号和专业内容价值。
   - 活动增长：只在租户配置活动时突出 `promo_banner`，不编造奖励规则。
   - 专业交易：突出交易账号、账户状态、数据密度和市场资讯。
   - 新客引导：突出 `onboarding_guide`、资产理解和下一步操作。
   - PAMM/CopyTrading：分别突出 `pamm_products` 与 `copytrading_signals`，两者不能混成一个模块。

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
- 在 1440px 预览下，高净值黑金、活动增长、专业交易、新客引导、PAMM 推荐、CopyTrading 推荐等预设应能一眼区分。
- 390px 和 1440px 宽度不应出现首页工作区横向溢出。
- 1440px 预览下不应出现可见的 `ai-brick-meta`、积木尺寸标签、积木名称或选择理由条。
- 1440px 预览下首页模块应按 auto layout 紧凑填充，不应出现空 section、空 slot、孤立小卡独占整行或明显的无内容大空白。
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
