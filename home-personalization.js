(function () {
  const STORAGE_KEY = "forexcrm.home.personalization";
  const DRAFT_STORAGE_KEY = "forexcrm.home.personalization.draft";

  const MODULES = {
    accountOverview: "账户总览",
    onboardingProgress: "账户开通进度",
    promoBanner: "热门推广活动",
    quickActions: "快速操作",
    referralCard: "邀请链接",
    tradingAccounts: "交易账号",
  };

  const FEATURES = {
    welcome_header: "首页欢迎区",
    asset_overview: "资产概览区",
    quick_actions: "快捷操作区",
    onboarding_guide: "新手引导区",
    trading_account_highlight: "交易账户重点展示区",
    trading_accounts_list: "交易账户列表区",
    promo_banner: "活动 Banner 区",
    pamm_products: "PAMM 产品推荐区",
    copytrading_signals: "CopyTrading 信号源推荐区",
    referral_link_card: "推广链接卡片",
    announcements: "公告通知区",
    market_news: "市场资讯区",
    balanceTotal: "资产总览",
    walletBalance: "钱包余额",
    accountBalances: "账户与钱包余额",
    fundActions: "入金/出金",
    openAccountActions: "开户操作",
    onboardingProgress: "开户进度",
    promoHighlight: "活动亮点",
    adCarousel: "广告轮播图",
    quickActions: "快捷入口",
    referralLink: "邀请链接",
    tradingAccounts: "交易账号列表",
    userKycRail: "用户/KYC 侧栏",
    accountPerformance: "账号表现图表",
    walletList: "钱包列表",
    createAccountForm: "创建账户表单",
    marketInsight: "市场洞察",
    riskNotice: "风险提示",
  };

  const CANONICAL_HOME_BLOCKS = [
    "welcome_header",
    "asset_overview",
    "quick_actions",
    "onboarding_guide",
    "trading_account_highlight",
    "trading_accounts_list",
    "promo_banner",
    "pamm_products",
    "copytrading_signals",
    "referral_link_card",
    "announcements",
    "market_news",
  ];

  const FORBIDDEN_HOME_BLOCKS = [
    "reward_tasks",
    "kyc_risk_notice",
    "ib_dashboard",
    "support_help",
    "referralLink",
    "referral_link",
    "userKycRail",
    "user_kyc_rail",
    "riskNotice",
    "risk_notice",
  ];

  const LEGACY_SLOT_ALIASES = {
    welcomeHeader: "welcome_header",
    balanceTotal: "asset_overview",
    accountBalances: "asset_overview",
    walletBalance: "asset_overview",
    walletList: "asset_overview",
    fundActions: "asset_overview",
    quickActions: "quick_actions",
    openAccountActions: "onboarding_guide",
    onboardingProgress: "onboarding_guide",
    createAccountForm: "onboarding_guide",
    promoHighlight: "promo_banner",
    adCarousel: "promo_banner",
    accountPerformance: "trading_account_highlight",
    tradingAccounts: "trading_accounts_list",
    marketInsight: "market_news",
    copytradingSummary: "copytrading_signals",
    copytrading_summary: "copytrading_signals",
    referralLinkCard: "referral_link_card",
    referral_link_card: "referral_link_card",
  };

  const LEGACY_COMPONENT_ALIASES = {
    asset_summary: "asset_overview",
    wallet_balance: "asset_overview",
    wallet_list: "asset_overview",
    fund_actions: "asset_overview",
    open_account_panel: "onboarding_guide",
    onboarding_progress: "onboarding_guide",
    create_account_form: "onboarding_guide",
    account_performance: "trading_account_highlight",
    account_list: "trading_accounts_list",
    ad_carousel: "promo_banner",
    market_insight: "market_news",
    copytrading_summary: "copytrading_signals",
    referral_link_card: "referral_link_card",
  };

  const DISABLED_QUICK_ACTION_IDS = new Set(["contactService", "kyc", "risk", "referral", "inviteFriends", "viewCommission", "downloadMaterial"]);

  const THEMES = {
    default: "默认蓝白",
    blackGold: "黑金高净值",
    lightGold: "浅金扁平",
    blueFinance: "蓝色金融",
    darkTech: "暗色科技",
    minimalWhite: "极简白",
  };

  const LEGACY_THEME_MAP = {
    classic: "default",
    aurum: "blackGold",
    ocean: "blueFinance",
    energy: "darkTech",
  };

  const TENANT_THEME_TOKENS = {
    default: {
      primaryColor: "#2563eb",
      accentColor: "#facc15",
      backgroundStyle: "classic-blue-white",
      cardStyle: "raised-white",
      cardRadius: "8px",
      cardShadow: "soft",
      buttonStyle: "solid-primary",
      fontDensity: 1,
      numberStyle: "tabular",
      bannerStyle: "dark-campaign",
    },
    blackGold: {
      primaryColor: "#b7791f",
      accentColor: "#facc15",
      backgroundStyle: "black-gold-ambient",
      cardStyle: "warm-ivory",
      cardRadius: "8px",
      cardShadow: "warm-elevated",
      buttonStyle: "black-gold-gradient",
      fontDensity: 1.02,
      numberStyle: "executive",
      bannerStyle: "black-gold-campaign",
    },
    lightGold: {
      primaryColor: "#b7791f",
      accentColor: "#f5c451",
      backgroundStyle: "light-gold-air",
      cardStyle: "flat-warm-white",
      cardRadius: "8px",
      cardShadow: "low",
      buttonStyle: "soft-gold",
      fontDensity: 1,
      numberStyle: "tabular",
      bannerStyle: "light-gold-campaign",
    },
    blueFinance: {
      primaryColor: "#1d4ed8",
      accentColor: "#14b8a6",
      backgroundStyle: "blue-finance-air",
      cardStyle: "clean-white",
      cardRadius: "8px",
      cardShadow: "finance-soft",
      buttonStyle: "teal-blue-gradient",
      fontDensity: 1,
      numberStyle: "financial",
      bannerStyle: "teal-blue-campaign",
    },
    darkTech: {
      primaryColor: "#38bdf8",
      accentColor: "#a78bfa",
      backgroundStyle: "dark-tech-grid",
      cardStyle: "glass-dark",
      cardRadius: "8px",
      cardShadow: "deep-tech",
      buttonStyle: "blue-purple-gradient",
      fontDensity: 0.98,
      numberStyle: "terminal",
      bannerStyle: "neon-campaign",
    },
    minimalWhite: {
      primaryColor: "#111827",
      accentColor: "#64748b",
      backgroundStyle: "minimal-white",
      cardStyle: "flat-white",
      cardRadius: "4px",
      cardShadow: "none",
      buttonStyle: "ink-gradient",
      fontDensity: 0.96,
      numberStyle: "quiet",
      bannerStyle: "ink-band",
    },
  };

  const LAYOUTS = {
    standardDashboard: "标准工作台",
    conversionFirst: "转化优先首页",
    assetFirst: "资产优先首页",
    tradingPro: "专业交易首页",
    vipService: "VIP 服务首页",
    magazineCampaign: "杂志活动首页",
    tradingCommand: "交易指挥中心",
    onboardingJourney: "新客旅程首页",
    privateWealthDesk: "私行服务台",
    accountOpsConsole: "账户运营控制台",
  };

  const LEGACY_LAYOUT_MAP = {
    classicStack: "standardDashboard",
    conversionStack: "conversionFirst",
    executiveHero: "vipService",
    traderConsole: "tradingPro",
    partnerGrowth: "conversionFirst",
    magazine: "magazineCampaign",
    commandCenter: "tradingCommand",
    onboardingFlow: "onboardingJourney",
    wealthDesk: "privateWealthDesk",
    accountConsole: "accountOpsConsole",
  };

  const COMPONENTS = {
    welcome_header: "欢迎头部",
    asset_overview: "资产概览区",
    onboarding_guide: "新手引导区",
    trading_account_highlight: "交易账户重点展示区",
    trading_accounts_list: "交易账户列表区",
    pamm_products: "PAMM 产品推荐区",
    copytrading_signals: "CopyTrading 信号源推荐区",
    referral_link_card: "推广链接卡片",
    announcements: "公告通知区",
    market_news: "市场资讯区",
    ad_carousel: "广告轮播",
    promo_banner: "推广横幅",
    asset_summary: "资产摘要",
    wallet_balance: "钱包余额",
    fund_actions: "资金操作",
    quick_actions: "快捷操作",
    open_account_panel: "开户入口",
    onboarding_progress: "开户路径",
    account_list: "账号列表",
    referral_link: "邀请链接",
    user_kyc_rail: "用户/KYC 侧栏",
    account_performance: "账号表现图表",
    wallet_list: "钱包列表",
    create_account_form: "创建账户表单",
    market_insight: "市场洞察",
    risk_notice: "风险提示",
    copytrading_summary: "跟单摘要",
  };

  const COMPONENT_WHITELIST = Object.keys(COMPONENTS);
  const MAX_HOME_MODULES = COMPONENT_WHITELIST.length;
  const MAX_QUICK_ACTIONS = 8;
  const MAX_I18N_KEY_LENGTH = 72;
  const MAX_VALIDATION_ERRORS = 12;

  const LAYOUT_SLOT_SPANS = {
    hero: 12,
    main: 8,
    rail: 4,
    full: 12,
  };

  const FEATURE_COMPONENT_MAP = {
    welcome_header: "welcome_header",
    asset_overview: "asset_overview",
    quick_actions: "quick_actions",
    onboarding_guide: "onboarding_guide",
    trading_account_highlight: "trading_account_highlight",
    trading_accounts_list: "trading_accounts_list",
    promo_banner: "promo_banner",
    pamm_products: "pamm_products",
    copytrading_signals: "copytrading_signals",
    referral_link_card: "referral_link_card",
    announcements: "announcements",
    market_news: "market_news",
    balanceTotal: "asset_summary",
    accountBalances: "asset_summary",
    walletBalance: "wallet_balance",
    fundActions: "fund_actions",
    openAccountActions: "open_account_panel",
    onboardingProgress: "onboarding_progress",
    promoHighlight: "promo_banner",
    adCarousel: "ad_carousel",
    quickActions: "quick_actions",
    referralLink: "referral_link",
    tradingAccounts: "account_list",
    userKycRail: "user_kyc_rail",
    accountPerformance: "account_performance",
    walletList: "wallet_list",
    createAccountForm: "create_account_form",
    marketInsight: "market_insight",
    riskNotice: "risk_notice",
  };

  const COMPONENT_STYLE_FEATURE_MAP = {
    welcome_header: "welcome_header",
    asset_overview: "asset_overview",
    onboarding_guide: "onboarding_guide",
    trading_account_highlight: "trading_account_highlight",
    trading_accounts_list: "trading_accounts_list",
    pamm_products: "pamm_products",
    copytrading_signals: "copytrading_signals",
    referral_link_card: "referral_link_card",
    announcements: "announcements",
    market_news: "market_news",
    promo_banner: "promoHighlight",
    asset_summary: "balanceTotal",
    wallet_balance: "walletBalance",
    fund_actions: "fundActions",
    quick_actions: "quickActions",
    open_account_panel: "openAccountActions",
    onboarding_progress: "onboardingProgress",
    account_list: "tradingAccounts",
    ad_carousel: "adCarousel",
    referral_link: "referralLink",
    user_kyc_rail: "userKycRail",
    account_performance: "accountPerformance",
    wallet_list: "walletList",
    create_account_form: "createAccountForm",
    market_insight: "marketInsight",
    risk_notice: "riskNotice",
    copytrading_summary: "referralLink",
  };

  const PROTOCOL_MODULES = {
    AssetOverview: {
      label: "资产总览",
      component: "asset_summary",
      feature: "balanceTotal",
      variants: ["standard", "vipHero", "compactTable", "darkTerminal", "tickerStrip", "wealthPlate", "riskRadar"],
    },
    WalletBalance: {
      label: "钱包余额",
      component: "wallet_balance",
      feature: "walletBalance",
      variants: ["standard", "splitCurrency", "compact", "premiumCard"],
    },
    FundActions: {
      label: "资金操作",
      component: "fund_actions",
      feature: "fundActions",
      variants: ["dock", "splitButtons", "compactRow"],
    },
    QuickActions: {
      label: "快捷操作",
      component: "quick_actions",
      feature: "quickActions",
      variants: ["gridCards", "actionDock", "priorityButtons", "minimalIcons", "commandBar", "taskRail"],
    },
    PromotionBanner: {
      label: "活动广告",
      component: "promo_banner",
      feature: "promoHighlight",
      variants: ["imageBanner", "gradientHero", "blackGoldVip", "splitVisual", "editorialCover", "depositLadder"],
    },
    ReferralLink: {
      label: "邀请链接",
      component: "referral_link",
      feature: "referralLink",
      variants: ["console", "linkFirst", "compact"],
    },
    ReferralLinkCard: {
      label: "推广链接卡片",
      component: "referral_link_card",
      feature: "referral_link_card",
      variants: ["compactCard", "linkFirst", "statsCard"],
    },
    TradingAccounts: {
      label: "交易账号",
      component: "account_list",
      feature: "tradingAccounts",
      variants: ["workbench", "separatedList", "denseCards", "calmTable", "accountWall", "opsTable"],
    },
    OpenAccount: {
      label: "开户入口",
      component: "open_account_panel",
      feature: "openAccountActions",
      variants: ["sidePanel", "inlineActions", "softCard", "conversionPanel"],
    },
    OnboardingProgress: {
      label: "开户路径",
      component: "onboarding_progress",
      feature: "onboardingProgress",
      variants: ["path", "checklist", "compact", "journeyTimeline"],
    },
    UserKycRail: {
      label: "用户/KYC 侧栏",
      component: "user_kyc_rail",
      feature: "userKycRail",
      variants: ["profileWallet", "kycChecklist", "compactStatus"],
    },
    AccountPerformance: {
      label: "账号表现图表",
      component: "account_performance",
      feature: "accountPerformance",
      variants: ["proChart", "terminalChart", "cleanSnapshot", "sparklineBoard"],
    },
    WalletList: {
      label: "钱包列表",
      component: "wallet_list",
      feature: "walletList",
      variants: ["currencyTable", "compactRows", "actionTable", "walletTiles"],
    },
    CreateAccountForm: {
      label: "创建账户表单",
      component: "create_account_form",
      feature: "createAccountForm",
      variants: ["realAccountForm", "compactForm", "guidedForm"],
    },
  };

  const COMPONENT_MODULE_MAP = {
    asset_overview: "AssetOverview",
    trading_account_highlight: "AccountPerformance",
    trading_accounts_list: "TradingAccounts",
    onboarding_guide: "OnboardingProgress",
    referral_link_card: "ReferralLinkCard",
    asset_summary: "AssetOverview",
    balanceTotal: "AssetOverview",
    accountBalances: "AssetOverview",
    fundActions: "AssetOverview",
    wallet_balance: "WalletBalance",
    walletBalance: "WalletBalance",
    fund_actions: "FundActions",
    fundActions: "FundActions",
    quick_actions: "QuickActions",
    quickActions: "QuickActions",
    open_account_panel: "OpenAccount",
    openAccountActions: "OpenAccount",
    onboarding_progress: "OnboardingProgress",
    onboardingProgress: "OnboardingProgress",
    promo_banner: "PromotionBanner",
    promoHighlight: "PromotionBanner",
    ad_carousel: "PromotionBanner",
    adCarousel: "PromotionBanner",
    referral_link: "ReferralLink",
    referralLink: "ReferralLink",
    account_list: "TradingAccounts",
    tradingAccounts: "TradingAccounts",
    user_kyc_rail: "UserKycRail",
    userKycRail: "UserKycRail",
    account_performance: "AccountPerformance",
    accountPerformance: "AccountPerformance",
    wallet_list: "WalletList",
    walletList: "WalletList",
    create_account_form: "CreateAccountForm",
    createAccountForm: "CreateAccountForm",
  };

  const MODULE_VARIANT_OPTIONS = {
    AssetOverview: [
      { id: "standard", label: "标准资产卡", description: "稳定展示总资产、账号资产和钱包折算。" },
      { id: "vipHero", label: "VIP 资产 Hero", description: "把资产做成首屏主视觉，适合高净值客户。" },
      { id: "compactTable", label: "紧凑资产表", description: "压缩高度，适合专业交易或信息密集首页。" },
      { id: "darkTerminal", label: "暗色终端", description: "终端化数字界面，适合科技和交易工作台。" },
      { id: "tickerStrip", label: "行情 Ticker 条", description: "把资产拆成横向流动指标，适合账户运营控制台。" },
      { id: "wealthPlate", label: "私行资产牌", description: "像客户经理资产桌牌一样突出总资产和权益。" },
      { id: "riskRadar", label: "风险雷达盘", description: "用保证金、可用资金和风险等级承接风控首页。" },
    ],
    WalletBalance: [
      { id: "standard", label: "标准钱包", description: "独立钱包卡片，展示折算总额和币种。" },
      { id: "splitCurrency", label: "币种分栏", description: "USD/EUR 等币种拆分，便于扫描。" },
      { id: "compact", label: "紧凑钱包", description: "减少模块高度，适合下方辅助区。" },
      { id: "premiumCard", label: "高级钱包卡", description: "强调资金权益和入金/出金动作。" },
    ],
    FundActions: [
      { id: "dock", label: "资金 Dock", description: "入金和出金作为独立操作区。" },
      { id: "splitButtons", label: "双按钮", description: "两个资金动作并列展示，适合首屏。" },
      { id: "compactRow", label: "紧凑资金行", description: "在专业工作台中降低高度。" },
    ],
    QuickActions: [
      { id: "gridCards", label: "卡片矩阵", description: "完整入口矩阵，适合标准首页。" },
      { id: "actionDock", label: "操作 Dock", description: "横向 Dock 化，突出常用动作。" },
      { id: "priorityButtons", label: "优先按钮", description: "入金、开户等重点按钮更大。" },
      { id: "minimalIcons", label: "极简图标", description: "只保留图标密度，适合专业工作台。" },
      { id: "commandBar", label: "命令栏", description: "像交易终端命令条一样承载高频动作。" },
      { id: "taskRail", label: "任务按钮组", description: "把动作变成下一步任务，适合新客和留存。" },
    ],
    PromotionBanner: [
      { id: "imageBanner", label: "图片横幅", description: "沉浸式广告曝光，适合活动和品牌位。" },
      { id: "gradientHero", label: "渐变 Hero", description: "高对比活动 Hero，强化转化。" },
      { id: "blackGoldVip", label: "黑金 VIP", description: "会员权益与高净值服务导向。" },
      { id: "splitVisual", label: "图文分栏", description: "信息更克制，适合金融专业感。" },
      { id: "editorialCover", label: "杂志封面", description: "让活动首屏像专题封面，而不是普通 Banner。" },
      { id: "depositLadder", label: "入金阶梯", description: "三档入金奖励和最高赠金，适合入金转化首页。" },
    ],
    ReferralLink: [
      { id: "console", label: "邀请控制台", description: "数据、邀请码、链接和二维码完整呈现。" },
      { id: "linkFirst", label: "链接优先", description: "首要展示开户链接和复制动作，适合渠道转化。" },
      { id: "compact", label: "紧凑邀请", description: "只保留核心指标和复制入口，适合辅助区。" },
    ],
    TradingAccounts: [
      { id: "workbench", label: "账号工作台", description: "保留筛选、开户入口、卡片和列表切换。" },
      { id: "separatedList", label: "真实/模拟双列表", description: "真实账号和模拟账号分区展示，适合专业客户。" },
      { id: "denseCards", label: "紧凑账号卡", description: "压缩账号信息，适合增长型首页。" },
      { id: "calmTable", label: "安静表格", description: "降低装饰感，适合后台工作台和大客户。" },
      { id: "accountWall", label: "账户卡墙", description: "把账户作为可扫描的业务对象墙，适合账户运营。" },
      { id: "opsTable", label: "运营长表", description: "长表格强调筛选、状态和创建入口。" },
    ],
    OpenAccount: [
      { id: "sidePanel", label: "侧栏开户", description: "开真实、开模拟、绑定账号作为右侧操作面板。" },
      { id: "inlineActions", label: "横向开户", description: "开户动作放进首屏横向路径。" },
      { id: "softCard", label: "柔和开户卡", description: "弱化压迫感，作为辅助转化模块。" },
      { id: "conversionPanel", label: "转化面板", description: "用更强的下一步面板承接开户、KYC 和首存。" },
    ],
    OnboardingProgress: [
      { id: "path", label: "开户路径条", description: "KYC、开真实账号、首次入金串成路径。" },
      { id: "checklist", label: "任务清单", description: "用清单推动新客完成开户和入金。" },
      { id: "compact", label: "紧凑进度", description: "保留状态但降低模块面积。" },
      { id: "journeyTimeline", label: "旅程时间线", description: "把新客首页变成清晰的下一步旅程。" },
    ],
    UserKycRail: [
      { id: "profileWallet", label: "用户钱包侧栏", description: "用户、KYC、时间和钱包摘要组合。" },
      { id: "kycChecklist", label: "KYC 清单侧栏", description: "强调认证状态和下一步动作。" },
      { id: "compactStatus", label: "紧凑状态栏", description: "适合信息密集工作台右侧。" },
    ],
    AccountPerformance: [
      { id: "proChart", label: "专业表现图表", description: "账号余额、权益和 PnL 曲线首屏展示。" },
      { id: "terminalChart", label: "终端图表", description: "暗色交易终端感，适合专业交易员。" },
      { id: "cleanSnapshot", label: "清爽表现卡", description: "降低视觉强度，用作资产辅助分析。" },
      { id: "sparklineBoard", label: "Sparkline 看板", description: "多个小趋势合成专业交易指挥中心。" },
    ],
    WalletList: [
      { id: "currencyTable", label: "币种钱包卡", description: "只展示币种图标、钱包货币和钱包余额。" },
      { id: "compactRows", label: "紧凑钱包卡", description: "减少高度，只保留币种和余额。" },
      { id: "actionTable", label: "余额卡片组", description: "多币种余额用卡片组合展示。" },
      { id: "walletTiles", label: "钱包磁贴", description: "多币种钱包变成横向资金磁贴组。" },
    ],
    CreateAccountForm: [
      { id: "realAccountForm", label: "真实账户表单", description: "平台、账户类型、杠杆和创建动作。" },
      { id: "compactForm", label: "紧凑创建表单", description: "右侧 rail 内快速创建账号。" },
      { id: "guidedForm", label: "引导式表单", description: "新客开户流程中的下一步表单。" },
    ],
  };

  const MODULE_VARIANT_DEFAULTS = Object.keys(MODULE_VARIANT_OPTIONS).reduce((defaults, moduleId) => {
    defaults[moduleId] = MODULE_VARIANT_OPTIONS[moduleId][0].id;
    return defaults;
  }, {});

  const LEGACY_MODULE_STYLE_VARIANT_MAP = {
    balanceTotal: {
      command: "vipHero",
      "metric-strip": "compactTable",
      "quiet-card": "standard",
    },
    walletBalance: {
      "wallet-card": "standard",
      "wallet-strip": "splitCurrency",
      "wallet-actions": "premiumCard",
    },
    quickActions: {
      matrix: "gridCards",
      toolbar: "actionDock",
      "compact-grid": "priorityButtons",
    },
    promoHighlight: {
      banner: "imageBanner",
      clean: "splitVisual",
      scoreboard: "gradientHero",
    },
    adCarousel: {
      immersive: "imageBanner",
      clean: "splitVisual",
      compact: "splitVisual",
    },
  };

  const HOMEPAGE_CONFIG_JSON_SCHEMA = {
    $id: "HomepageConfig",
    type: "object",
    required: ["schemaVersion"],
    additionalProperties: true,
    properties: {
      schemaVersion: { enum: [3, 4] },
      blueprintVersion: { type: "number" },
      generationMode: { type: "string" },
      layoutPreset: { enum: Object.keys(LAYOUTS) },
      designGenome: { type: "string" },
      pageStory: { type: "string" },
      componentMorphs: { type: "object" },
      themePreset: { enum: Object.keys(THEMES) },
      theme: { enum: Object.keys(THEMES) },
      personalizationStrength: { enum: ["subtle", "medium", "strong"] },
      modules: {
        type: "object",
        properties: Object.keys(PROTOCOL_MODULES).reduce((properties, moduleId) => {
          properties[moduleId] = {
            type: "object",
            properties: {
              variant: { enum: PROTOCOL_MODULES[moduleId].variants },
            },
          };
          return properties;
        }, {}),
      },
      density: { enum: ["compact", "balanced", "spacious"] },
      heroFocus: { enum: COMPONENT_WHITELIST },
      layout: {
        type: "array",
        maxItems: MAX_HOME_MODULES,
        items: {
          type: "object",
          required: ["component", "slot", "props"],
          properties: {
            id: { type: "string", maxLength: 32 },
            component: { enum: COMPONENT_WHITELIST },
            slot: { enum: Object.keys(LAYOUT_SLOT_SPANS) },
            priority: { type: "number" },
            props: { type: "object" },
            brickId: { type: "string" },
            brickName: { type: "string" },
            brickFamily: { type: "string" },
            brickSize: { type: "string" },
            brickZone: { type: "string" },
            brickReason: { type: "string" },
          },
        },
      },
      brickPlan: {
        type: "array",
        maxItems: 14,
        items: {
          type: "object",
          properties: {
            brickId: { type: "string" },
            brickName: { type: "string" },
            family: { type: "string" },
            feature: { enum: Object.keys(FEATURES) },
            component: { enum: COMPONENT_WHITELIST },
            size: { type: "string" },
            zone: { enum: Object.keys(LAYOUT_SLOT_SPANS) },
            reason: { type: "string" },
          },
        },
      },
      brickTrace: {
        type: "object",
        properties: {
          intent: { type: "string" },
          strategy: { type: "string" },
          score: { type: "number" },
          selectedCount: { type: "number" },
          source: { type: "string" },
        },
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "type", "title", "slots"],
          properties: {
            id: { type: "string" },
            type: { enum: ["hero", "split", "full", "rail"] },
            title: { type: "string" },
            slots: {
              type: "array",
              items: { enum: Object.keys(FEATURES) },
            },
          },
        },
      },
      moduleStyles: {
        type: "object",
        properties: {
          balanceTotal: { enum: ["command", "metric-strip", "quiet-card"] },
          fundActions: { enum: ["dock", "split-buttons", "compact-row"] },
          adCarousel: { enum: ["immersive", "clean", "compact"] },
          quickActions: { enum: ["matrix", "toolbar", "compact-grid"] },
          referralLink: { enum: ["console", "link-first", "compact"] },
          referral_link_card: { enum: ["compact-card", "link-first", "stats-card"] },
          tradingAccounts: { enum: ["workbench", "dense-cards", "calm-table"] },
        },
      },
      moduleSettings: {
        type: "object",
        properties: {
          assets: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              visibleFields: {
                type: "array",
                minItems: 1,
                maxItems: 3,
                items: { enum: ["total", "wallet", "tradingAccount"] },
              },
              showFundActions: { type: "boolean" },
              showAccountBreakdown: { type: "boolean" },
              showWalletBreakdown: { type: "boolean" },
              showAvailable: { type: "boolean" },
              showMargin: { type: "boolean" },
              showRiskLevel: { type: "boolean" },
              wallets: {
                type: "array",
                items: { enum: ["USD", "EUR", "USDT", "XAU", "GBP", "JPY", "CNH"] },
              },
            },
          },
          quickActions: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              count: { type: "number", minimum: 3, maximum: 8 },
              display: { enum: ["iconText", "iconOnly", "hoverText"] },
              actions: {
                type: "array",
                items: {
                  anyOf: [
                    { type: "string" },
                    {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        href: { type: "string" },
                        icon: { type: "string" },
                        labelKey: { type: "string" },
                      },
                    },
                  ],
                },
              },
            },
          },
          wallet: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              placement: { enum: ["standalone", "mergedWithAssets"] },
              showFundActions: { type: "boolean" },
            },
          },
          tradingAccounts: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              realEnabled: { type: "boolean" },
              demoEnabled: { type: "boolean" },
              grouping: { enum: ["combined", "separated"] },
              viewMode: { enum: ["switchable", "card", "list"] },
              realViewMode: { enum: ["card", "list"] },
              demoViewMode: { enum: ["card", "list"] },
              demoFirst: { type: "boolean" },
            },
          },
          openAccount: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              real: { type: "boolean" },
              demo: { type: "boolean" },
              bind: { type: "boolean" },
              placement: { enum: ["insideTradingAccounts", "standalone"] },
            },
          },
          userKycRail: {
            type: "object",
            properties: {
              kycStatus: { enum: ["verified", "pending", "reviewing", "rejected"] },
            },
          },
          riskNotice: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
          pamm: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
          copytrading: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
          referralLinkCard: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              showPromoLink: { type: "boolean" },
              showInviteCode: { type: "boolean" },
              showShare: { type: "boolean" },
              showStats: { type: "boolean" },
              showOpens: { type: "boolean" },
              showRegistrations: { type: "boolean" },
              showAccounts: { type: "boolean" },
              showRegistrationRate: { type: "boolean" },
              showAccountRate: { type: "boolean" },
            },
          },
          announcements: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
          marketNews: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
        },
      },
    },
  };

  const COMPONENT_PROPS_SCHEMA = {
    welcome_header: {
      titleKey: "home.welcome.title",
      subtitleKey: "home.welcome.subtitle",
      actionKey: "home.welcome.customize",
      dateKey: "home.welcome.date",
    },
    asset_overview: {
      eyebrowKey: "home.asset.eyebrow",
      titleKey: "home.asset.title",
      totalLabelKey: "home.asset.totalLabel",
      accountsLabelKey: "home.asset.accountsLabel",
      walletLabelKey: "home.asset.walletLabel",
      walletNoteKey: "home.asset.walletNote",
    },
    onboarding_guide: {
      eyebrowKey: "home.onboarding.eyebrow",
      titleKey: "home.onboarding.title",
      summaryKey: "home.onboarding.summary",
    },
    trading_account_highlight: {
      eyebrowKey: "home.performance.eyebrow",
      titleKey: "home.performance.title",
      summaryKey: "home.performance.summary",
    },
    trading_accounts_list: {
      eyebrowKey: "home.accounts.eyebrow",
      titleKey: "home.accounts.title",
      fixedViewLabelKey: "home.accounts.fixedView",
    },
    pamm_products: {
      eyebrowKey: "home.pamm.eyebrow",
      titleKey: "home.pamm.title",
      summaryKey: "home.pamm.summary",
    },
    copytrading_signals: {
      eyebrowKey: "home.copytrading.eyebrow",
      titleKey: "home.copytrading.title",
      summaryKey: "home.copytrading.summary",
      leaderKey: "home.copytrading.leader",
      followersKey: "home.copytrading.followers",
    },
    referral_link_card: {
      eyebrowKey: "home.referralCard.eyebrow",
      titleKey: "home.referralCard.title",
      summaryKey: "home.referralCard.summary",
      promoLinkLabelKey: "home.referralCard.promoLink",
      inviteCodeLabelKey: "home.referralCard.inviteCode",
      copyLinkKey: "home.referralCard.copyLink",
      copyCodeKey: "home.referralCard.copyCode",
      shareKey: "home.referralCard.share",
      opensKey: "home.referralCard.opens",
      registrationsKey: "home.referralCard.registrations",
      accountsKey: "home.referralCard.accounts",
      registrationRateKey: "home.referralCard.registrationRate",
      accountRateKey: "home.referralCard.accountRate",
    },
    announcements: {
      eyebrowKey: "home.announcements.eyebrow",
      titleKey: "home.announcements.title",
      summaryKey: "home.announcements.summary",
    },
    market_news: {
      eyebrowKey: "home.market.eyebrow",
      titleKey: "home.market.title",
      summaryKey: "home.market.summary",
      metricOneKey: "home.market.metricOne",
      metricTwoKey: "home.market.metricTwo",
    },
    promo_banner: {
      badgeKey: "home.promo.badge",
      titleKey: "home.promo.title",
      metaKey: "home.promo.meta",
      ctaKey: "home.promo.cta",
      href: "#promo",
    },
    ad_carousel: {
      badgeKey: "home.promo.badge",
      titleKey: "home.promo.title",
      metaKey: "home.promo.meta",
      ctaKey: "home.promo.cta",
      href: "#promo",
    },
    asset_summary: {
      eyebrowKey: "home.asset.eyebrow",
      titleKey: "home.asset.title",
      totalLabelKey: "home.asset.totalLabel",
      accountsLabelKey: "home.asset.accountsLabel",
      walletLabelKey: "home.asset.walletLabel",
      walletNoteKey: "home.asset.walletNote",
    },
    wallet_balance: {
      eyebrowKey: "home.wallet.eyebrow",
      titleKey: "home.wallet.title",
      totalLabelKey: "home.wallet.totalLabel",
      noteKey: "home.wallet.note",
    },
    fund_actions: {
      eyebrowKey: "home.fund.eyebrow",
      titleKey: "home.fund.title",
      summaryKey: "home.fund.summary",
    },
    quick_actions: {
      eyebrowKey: "home.quick.eyebrow",
      titleKey: "home.quick.title",
      actions: [
        { id: "openAccount", href: "#accounts", icon: "user", labelKey: "home.action.openAccount" },
        { id: "deposit", href: "#fund-actions", icon: "deposit", labelKey: "home.action.deposit" },
        { id: "withdraw", href: "#fund-actions", icon: "withdraw", labelKey: "home.action.withdraw" },
        { id: "transfer", href: "#accounts", icon: "transfer", labelKey: "home.action.transfer" },
        { id: "orders", href: "#accounts", icon: "history", labelKey: "home.action.orders" },
        { id: "positions", href: "#accounts", icon: "positions", labelKey: "home.action.positions" },
        { id: "contest", href: "#promo", icon: "trophy", labelKey: "home.action.contest" },
        { id: "referral", href: "#referral", icon: "copy", labelKey: "home.action.referral" },
      ],
    },
    open_account_panel: {
      eyebrowKey: "home.open.eyebrow",
      titleKey: "home.open.title",
      summaryKey: "home.open.summary",
    },
    onboarding_progress: {
      eyebrowKey: "home.onboarding.eyebrow",
      titleKey: "home.onboarding.title",
      summaryKey: "home.onboarding.summary",
    },
    account_list: {
      eyebrowKey: "home.accounts.eyebrow",
      titleKey: "home.accounts.title",
      fixedViewLabelKey: "home.accounts.fixedView",
    },
    referral_link: {
      eyebrowKey: "home.referral.eyebrow",
      titleKey: "home.referral.title",
      summaryKey: "home.referral.summary",
    },
    user_kyc_rail: {
      eyebrowKey: "home.userRail.eyebrow",
      titleKey: "home.userRail.title",
      summaryKey: "home.userRail.summary",
    },
    account_performance: {
      eyebrowKey: "home.performance.eyebrow",
      titleKey: "home.performance.title",
      summaryKey: "home.performance.summary",
    },
    wallet_list: {
      eyebrowKey: "home.walletList.eyebrow",
      titleKey: "home.walletList.title",
      summaryKey: "home.walletList.summary",
    },
    create_account_form: {
      eyebrowKey: "home.createAccount.eyebrow",
      titleKey: "home.createAccount.title",
      summaryKey: "home.createAccount.summary",
    },
    market_insight: {
      eyebrowKey: "home.market.eyebrow",
      titleKey: "home.market.title",
      summaryKey: "home.market.summary",
      metricOneKey: "home.market.metricOne",
      metricTwoKey: "home.market.metricTwo",
    },
    risk_notice: {
      eyebrowKey: "home.risk.eyebrow",
      titleKey: "home.risk.title",
      summaryKey: "home.risk.summary",
      ctaKey: "home.risk.cta",
      href: "#accounts",
    },
    copytrading_summary: {
      eyebrowKey: "home.copytrading.eyebrow",
      titleKey: "home.copytrading.title",
      summaryKey: "home.copytrading.summary",
      leaderKey: "home.copytrading.leader",
      followersKey: "home.copytrading.followers",
    },
  };

  const I18N = {
    "home.welcome.title": "欢迎回来, Huang!",
    "home.welcome.subtitle": "集中查看交易表现、账户资产和常用操作。",
    "home.welcome.customize": "首页个性化",
    "home.welcome.date": "2026 年 5 月 3 日, 星期日",
    "home.asset.eyebrow": "资产摘要",
    "home.asset.title": "账户资产驾驶舱",
    "home.asset.totalLabel": "账户余额折算",
    "home.asset.accountsLabel": "交易账号",
    "home.asset.walletLabel": "钱包余额",
    "home.asset.walletNote": "按钱包币种统一折算",
    "home.asset.walletStandalone": "钱包余额已拆分为独立栏目",
    "home.asset.accountsOnly": "当前仅展示交易账号资产",
    "home.asset.totalOnly": "仅展示总览，不展开钱包和交易账号明细",
    "home.wallet.eyebrow": "钱包",
    "home.wallet.title": "钱包余额",
    "home.wallet.totalLabel": "钱包余额折算",
    "home.wallet.note": "按钱包币种统一折算",
    "home.fund.eyebrow": "Funding",
    "home.fund.title": "资金操作 Dock",
    "home.fund.summary": "入金和出金入口根据当前方案权重自动放大。",
    "home.action.deposit": "入金",
    "home.action.depositHint": "立即处理",
    "home.action.withdraw": "出金",
    "home.action.withdrawHint": "资金提取",
    "home.action.openAccount": "开新账户",
    "home.action.transfer": "转账",
    "home.action.orders": "订单历史",
    "home.action.positions": "持仓记录",
    "home.action.contest": "交易大赛",
    "home.action.referral": "推广链接",
    "home.action.inviteFriends": "邀请好友",
    "home.action.eventSignup": "活动报名",
    "home.action.viewCommission": "查看返佣",
    "home.action.downloadMaterial": "下载素材",
    "home.action.contactService": "联系客服",
    "home.action.openReal": "开真实账号",
    "home.action.downloadMt5": "下载 MT5",
    "home.action.switchAccount": "切换账号",
    "home.action.kyc": "KYC 状态",
    "home.action.risk": "风险提醒",
    "home.action.realAccount": "真实账号",
    "home.action.demoAccount": "模拟账号",
    "home.action.bindAccount": "绑定账号",
    "home.quick.eyebrow": "快捷入口",
    "home.quick.title": "快捷入口",
    "home.depositBonus.eyebrow": "入金奖励",
    "home.depositBonus.title": "入金奖励阶梯",
    "home.depositBonus.meta": "$500 / $2,000 / $10,000 三档入金，最高赠金 $300。",
    "home.depositBonus.cta": "立即入金",
    "home.open.eyebrow": "Account Opening",
    "home.open.title": "开户操作台",
    "home.open.summary": "根据当前客户状态推荐真实账号、模拟账号或绑定账号路径。",
    "home.onboarding.eyebrow": "Next Step",
    "home.onboarding.title": "开户激活路径",
    "home.onboarding.summary": "KYC、开真实账号和首次入金形成连续任务。",
    "home.promo.badge": "进行中",
    "home.promo.title": "五月盈利王挑战赛",
    "home.promo.meta": "奖池 9,600 美元 / 剩余 28 天 / 共 3 项活动",
    "home.promo.cta": "查看详情",
    "home.referral.eyebrow": "Promotion",
    "home.referral.title": "推广链接控制台",
    "home.referral.summary": "注册链接、邀请码和渠道转化数据集中展示。",
    "home.referralCard.eyebrow": "推广链接",
    "home.referralCard.title": "推广链接卡片",
    "home.referralCard.summary": "推广链接、邀请码和基础效果数据由接口返回。",
    "home.referralCard.promoLink": "推广链接",
    "home.referralCard.inviteCode": "邀请码",
    "home.referralCard.copyLink": "复制链接",
    "home.referralCard.copyCode": "复制邀请码",
    "home.referralCard.share": "分享",
    "home.referralCard.opens": "打开数",
    "home.referralCard.registrations": "注册数",
    "home.referralCard.accounts": "开户数",
    "home.referralCard.registrationRate": "注册转化率",
    "home.referralCard.accountRate": "开户转化率",
    "home.accounts.eyebrow": "账号",
    "home.accounts.title": "交易账号工作台",
    "home.accounts.fixedView": "固定视图",
    "home.userRail.eyebrow": "Client Status",
    "home.userRail.title": "用户状态与 KYC",
    "home.userRail.summary": "身份、认证、当地时间和钱包摘要放在右侧。",
    "home.performance.eyebrow": "Account Performance",
    "home.performance.title": "账号表现图表",
    "home.performance.summary": "余额、权益、信用和 PnL 曲线用于专业交易判断。",
    "home.walletList.eyebrow": "Wallets",
    "home.walletList.title": "多币种钱包列表",
    "home.walletList.summary": "展示币种余额、可用资金和资金动作。",
    "home.createAccount.eyebrow": "Create Account",
    "home.createAccount.title": "创建真实账户",
    "home.createAccount.summary": "平台、账户类型、杠杆和账户名称集中填写。",
    "home.market.eyebrow": "市场洞察",
    "home.market.title": "黄金与美元维持高波动",
    "home.market.summary": "重点关注晚间数据公布后的点差和保证金变化。",
    "home.market.metricOne": "黄金波动",
    "home.market.metricTwo": "美元指数",
    "home.announcements.eyebrow": "公告",
    "home.announcements.title": "公告通知",
    "home.announcements.summary": "系统公告、活动公告和维护通知由接口返回。",
    "home.pamm.eyebrow": "PAMM",
    "home.pamm.title": "PAMM 产品推荐",
    "home.pamm.summary": "仅在租户开启 PAMM 且接口返回产品时展示。",
    "home.risk.eyebrow": "风险提示",
    "home.risk.title": "账户杠杆与保证金需持续关注",
    "home.risk.summary": "当前真实账户持仓集中度较高, 建议检查止损和可用保证金。",
    "home.risk.cta": "查看持仓",
    "home.copytrading.eyebrow": "跟单摘要",
    "home.copytrading.title": "跟单策略表现稳定",
    "home.copytrading.summary": "近 30 天跟单收益保持正向, 可继续观察风险等级。",
    "home.copytrading.leader": "主策略",
    "home.copytrading.followers": "跟随人数",
  };

  const QUICK_ACTION_CATALOG = {
    openAccount: { id: "openAccount", href: "#accounts", icon: "user", labelKey: "home.action.openAccount" },
    openReal: { id: "openReal", href: "#accounts", icon: "user", labelKey: "home.action.openReal" },
    deposit: { id: "deposit", href: "#fund-actions", icon: "deposit", labelKey: "home.action.deposit" },
    withdraw: { id: "withdraw", href: "#fund-actions", icon: "withdraw", labelKey: "home.action.withdraw" },
    transfer: { id: "transfer", href: "#accounts", icon: "transfer", labelKey: "home.action.transfer" },
    orders: { id: "orders", href: "#accounts", icon: "history", labelKey: "home.action.orders" },
    positions: { id: "positions", href: "#accounts", icon: "positions", labelKey: "home.action.positions" },
    contest: { id: "contest", href: "#promo", icon: "trophy", labelKey: "home.action.contest" },
    eventSignup: { id: "eventSignup", href: "#promo", icon: "trophy", labelKey: "home.action.eventSignup" },
    referral: { id: "referral", href: "#referral", icon: "copy", labelKey: "home.action.referral" },
    inviteFriends: { id: "inviteFriends", href: "#referral", icon: "copy", labelKey: "home.action.inviteFriends" },
    viewCommission: { id: "viewCommission", href: "#referral", icon: "chart", labelKey: "home.action.viewCommission" },
    downloadMaterial: { id: "downloadMaterial", href: "#referral", icon: "copy", labelKey: "home.action.downloadMaterial" },
    contactService: { id: "contactService", href: "#accounts", icon: "user", labelKey: "home.action.contactService" },
    downloadMt5: { id: "downloadMt5", href: "#accounts", icon: "history", labelKey: "home.action.downloadMt5" },
    switchAccount: { id: "switchAccount", href: "#accounts", icon: "transfer", labelKey: "home.action.switchAccount" },
    kyc: { id: "kyc", href: "#risk", icon: "user", labelKey: "home.action.kyc" },
    risk: { id: "risk", href: "#risk", icon: "chart", labelKey: "home.action.risk" },
  };

  const QUICK_ACTION_ALIASES = {
    invite: "inviteFriends",
    inviteFriend: "inviteFriends",
    inviteFriends: "inviteFriends",
    event: "eventSignup",
    signup: "eventSignup",
    eventSignup: "eventSignup",
    commission: "viewCommission",
    viewCommission: "viewCommission",
    download: "downloadMaterial",
    material: "downloadMaterial",
    downloadMaterial: "downloadMaterial",
    service: "contactService",
    contact: "contactService",
    contactService: "contactService",
    openReal: "openReal",
    realAccount: "openReal",
    mt5: "downloadMt5",
    downloadMt5: "downloadMt5",
    switchAccount: "switchAccount",
    switch: "switchAccount",
    kycStatus: "kyc",
    kyc: "kyc",
  };

  const MODULE_STYLE_OPTIONS = {
    balanceTotal: [
      { id: "command", label: "资产驾驶舱", description: "大数字资产、账户和钱包拆分，适合首屏重点。" },
      { id: "metric-strip", label: "指标条", description: "横向指标摘要，适合与广告或快捷入口并排。" },
      { id: "quiet-card", label: "轻量卡片", description: "降低视觉权重，适合放在下方辅助区域。" },
      { id: "ticker-strip", label: "Ticker 指标条", description: "像行情带一样横向呈现资产、可用资金和风险。" },
      { id: "wealth-plate", label: "私行资产牌", description: "更高端、低噪声的资产服务台样式。" },
      { id: "risk-radar", label: "风险雷达盘", description: "强调保证金、风险等级和账户健康。" },
    ],
    walletBalance: [
      { id: "wallet-card", label: "钱包卡片", description: "单独展示钱包余额和币种折算。" },
      { id: "wallet-strip", label: "钱包指标条", description: "横向余额摘要，适合与资产并排。" },
      { id: "wallet-actions", label: "钱包操作条", description: "钱包余额和入金/出金动作结合。" },
    ],
    fundActions: [
      { id: "dock", label: "资金 Dock", description: "入金和出金做成明确操作区。" },
      { id: "split-buttons", label: "双按钮", description: "两个按钮平行展示，动作更直接。" },
      { id: "compact-row", label: "紧凑行", description: "减少高度，适合信息密集首页。" },
    ],
    openAccountActions: [
      { id: "stacked", label: "纵向开户", description: "真实、模拟、绑定账号分成三条入口。" },
      { id: "horizontal", label: "横向开户", description: "三个开户动作并排展示，适合首屏。" },
      { id: "soft-card", label: "柔和卡片", description: "弱化按钮压迫感，适合辅助区域。" },
      { id: "conversion-panel", label: "转化面板", description: "开户动作以强引导面板呈现。" },
    ],
    onboardingProgress: [
      { id: "path", label: "路径条", description: "强调开户步骤和下一步行动。" },
      { id: "checklist", label: "清单式", description: "把 KYC、资料、入金做成任务清单。" },
      { id: "compact", label: "紧凑进度", description: "保留状态，但减少模块面积。" },
      { id: "journey-timeline", label: "旅程时间线", description: "用纵向或横向时间线表达新客下一步。" },
    ],
    promoHighlight: [
      { id: "banner", label: "活动横幅", description: "高对比活动曝光，适合营销首页。" },
      { id: "clean", label: "简洁活动", description: "白底活动卡，适合专业风格。" },
      { id: "scoreboard", label: "赛事看板", description: "突出奖池、倒计时和活动状态。" },
      { id: "deposit-ladder", label: "入金阶梯", description: "突出三档入金奖励、最高赠金和转化 CTA。" },
    ],
    adCarousel: [
      { id: "immersive", label: "沉浸轮播", description: "大幅广告首屏，视觉冲击更强。" },
      { id: "clean", label: "清爽轮播", description: "更轻的背景和高度，适合工作台。" },
      { id: "compact", label: "短轮播", description: "减少高度，适合放在组合区。" },
      { id: "editorial-cover", label: "杂志封面", description: "活动首屏变成专题封面。" },
    ],
    quickActions: [
      { id: "matrix", label: "快捷矩阵", description: "完整操作入口，适合功能型首页。" },
      { id: "toolbar", label: "工具条", description: "横向入口，减少页面割裂。" },
      { id: "compact-grid", label: "紧凑网格", description: "缩短卡片高度，提升扫描效率。" },
      { id: "command-bar", label: "命令栏", description: "交易终端式高频入口。" },
      { id: "task-rail", label: "任务按钮组", description: "把入口转成下一步任务。" },
    ],
    referralLink: [
      { id: "console", label: "邀请控制台", description: "数据、邀请码和注册链接完整展示。" },
      { id: "link-first", label: "链接优先", description: "把可复制链接放到最前面。" },
      { id: "compact", label: "紧凑邀请", description: "只保留关键指标和复制入口。" },
    ],
    referral_link_card: [
      { id: "compact-card", label: "紧凑卡片", description: "只展示推广链接、邀请码和复制按钮。" },
      { id: "link-first", label: "链接优先", description: "推广链接与邀请码优先，统计数据弱化。" },
      { id: "stats-card", label: "数据卡片", description: "在链接基础上展示打开、注册、开户和转化率。" },
    ],
    tradingAccounts: [
      { id: "workbench", label: "账号工作台", description: "保留筛选、开户和视图切换。" },
      { id: "dense-cards", label: "紧凑卡片", description: "降低卡片高度，便于看更多账号。" },
      { id: "calm-table", label: "安静列表", description: "降低卡片装饰，适合后台感首页。" },
      { id: "account-wall", label: "账户卡墙", description: "账号卡片像对象墙一样铺开。" },
      { id: "ops-table", label: "运营长表", description: "强调筛选、状态和创建入口的表格形态。" },
    ],
    accountPerformance: [
      { id: "pro-chart", label: "专业图表", description: "余额、权益和 PnL 趋势图。" },
      { id: "terminal-chart", label: "终端图表", description: "更暗、更交易终端化的图表。" },
      { id: "sparkline-board", label: "Sparkline 看板", description: "多个小趋势组合成指挥中心。" },
    ],
    walletList: [
      { id: "currency-table", label: "币种表格", description: "多币种余额列表。" },
      { id: "wallet-tiles", label: "钱包磁贴", description: "多币种余额用横向磁贴展示。" },
    ],
    userKycRail: [
      { id: "profile-card", label: "用户状态卡", description: "用户、KYC 和钱包摘要。" },
      { id: "status-rail", label: "状态侧栏", description: "更紧凑的状态轨道。" },
    ],
    createAccountForm: [
      { id: "form-card", label: "表单卡", description: "默认开户表单。" },
      { id: "wizard-card", label: "向导卡", description: "更像步骤向导的创建账户形态。" },
    ],
  };

  const MODULE_STYLE_DEFAULTS = Object.keys(MODULE_STYLE_OPTIONS).reduce((defaults, feature) => {
    defaults[feature] = MODULE_STYLE_OPTIONS[feature][0].id;
    return defaults;
  }, {});

  const DEFAULT_MODULE_SETTINGS = {
    adCarousel: { enabled: false },
    promoHighlight: { enabled: true },
    quickActions: { enabled: true, count: 4, display: "iconText", actions: [] },
    wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
    assets: {
      enabled: true,
      visibleFields: ["total", "wallet", "tradingAccount"],
      showFundActions: false,
      showAccountBreakdown: true,
      showWalletBreakdown: true,
      showAvailable: false,
      showMargin: false,
      showRiskLevel: false,
      wallets: [],
    },
    referral: {
      enabled: false,
      showClicks: true,
      showRegistrations: true,
      showTradingAccounts: true,
      showPromoLink: true,
      showInviteCode: true,
      showQrCode: true,
    },
    referralLinkCard: {
      enabled: false,
      showPromoLink: true,
      showInviteCode: true,
      showShare: false,
      showStats: false,
      showOpens: true,
      showRegistrations: true,
      showAccounts: true,
      showRegistrationRate: true,
      showAccountRate: true,
    },
    tradingAccounts: {
      enabled: true,
      realEnabled: true,
      demoEnabled: true,
      grouping: "combined",
      viewMode: "switchable",
      realViewMode: "card",
      demoViewMode: "list",
      demoFirst: false,
    },
    openAccount: {
      enabled: false,
      real: true,
      demo: true,
      bind: false,
      placement: "insideTradingAccounts",
    },
    userKycRail: { kycStatus: "verified" },
    riskNotice: { enabled: false },
    pamm: { enabled: false },
    copytrading: { enabled: false },
    announcements: { enabled: false },
    marketNews: { enabled: false },
  };

  const DEFAULT_CONFIG = {
    schemaVersion: 4,
    blueprintVersion: 4,
    name: "默认纵向首页",
    layoutPreset: "standardDashboard",
    themePreset: "default",
    theme: "default",
    personalizationStrength: "medium",
    density: "balanced",
    heroFocus: "asset_summary",
    modules: Object.keys(MODULE_VARIANT_DEFAULTS).reduce((modules, moduleId) => {
      modules[moduleId] = { variant: MODULE_VARIANT_DEFAULTS[moduleId] };
      return modules;
    }, {}),
    moduleStyles: MODULE_STYLE_DEFAULTS,
    moduleSettings: DEFAULT_MODULE_SETTINGS,
    sections: [
      { id: "overview", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] },
      { id: "accounts-highlight", type: "split", title: "交易账户", slots: ["trading_account_highlight", "trading_accounts_list"] },
    ],
    emphasis: {
      deposit: "high",
      openAccount: "medium",
      promo: "medium",
      accounts: "medium",
    },
    aiSummary: "默认首页，功能保持完整，按现有信息层级展示。",
    annotations: [],
  };

  const PAGE_STORIES = {
    campaignLaunch: {
      id: "campaignLaunch",
      label: "活动封面叙事",
      summary: "第一眼先看到活动或权益，再用快捷入口、入金和账号证明承接转化。",
      featureOrder: ["adCarousel", "quickActions", "promoHighlight", "fundActions", "tradingAccounts", "balanceTotal"],
      zoneMap: {
        adCarousel: "hero",
        quickActions: "main",
        promoHighlight: "main",
        fundActions: "rail",
        tradingAccounts: "full",
      },
    },
    tradingEfficiency: {
      id: "tradingEfficiency",
      label: "交易效率叙事",
      summary: "先给交易动作和账号表现，再下钻到真实/模拟账号管理。",
      featureOrder: ["quickActions", "accountPerformance", "userKycRail", "balanceTotal", "riskNotice", "tradingAccounts", "adCarousel"],
      zoneMap: {
        quickActions: "hero",
        accountPerformance: "main",
        userKycRail: "rail",
        balanceTotal: "full",
        riskNotice: "rail",
        tradingAccounts: "full",
      },
    },
    accountActivation: {
      id: "accountActivation",
      label: "新客旅程叙事",
      summary: "把 KYC、开户、创建账号和首次入金做成连续下一步。",
      featureOrder: ["onboardingProgress", "openAccountActions", "createAccountForm", "fundActions", "quickActions", "tradingAccounts", "adCarousel"],
      zoneMap: {
        onboardingProgress: "hero",
        openAccountActions: "rail",
        createAccountForm: "rail",
        fundActions: "main",
        quickActions: "main",
        tradingAccounts: "full",
      },
    },
    depositConversion: {
      id: "depositConversion",
      label: "入金转化叙事",
      summary: "先给入金奖励和钱包上下文，再承接唯一主入金动作、开户和账号证明。",
      featureOrder: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions", "quickActions", "accountPerformance", "tradingAccounts"],
      zoneMap: {
        promoHighlight: "hero",
        walletBalance: "rail",
        fundActions: "rail",
        openAccountActions: "rail",
        quickActions: "main",
        accountPerformance: "main",
        tradingAccounts: "full",
      },
    },
    wealthService: {
      id: "wealthService",
      label: "私行服务叙事",
      summary: "先建立资产信任和专属权益，再提供资金动作与账户服务入口。",
      featureOrder: ["balanceTotal", "fundActions", "adCarousel", "walletBalance", "openAccountActions", "userKycRail", "tradingAccounts"],
      zoneMap: {
        balanceTotal: "hero",
        fundActions: "rail",
        adCarousel: "full",
        walletBalance: "rail",
        openAccountActions: "rail",
        userKycRail: "rail",
        tradingAccounts: "full",
      },
    },
    opsClarity: {
      id: "opsClarity",
      label: "账户运营叙事",
      summary: "让资产、钱包、表现、风险和账号列表形成一个可管理工作台。",
      featureOrder: ["balanceTotal", "fundActions", "walletList", "accountPerformance", "riskNotice", "quickActions", "tradingAccounts"],
      zoneMap: {
        balanceTotal: "hero",
        fundActions: "rail",
        walletList: "full",
        accountPerformance: "main",
        riskNotice: "rail",
        quickActions: "main",
        tradingAccounts: "full",
      },
    },
  };

  const DESIGN_GENOMES = {
    magazineCampaign: {
      id: "magazineCampaign",
      label: "Magazine Campaign",
      layoutPreset: "magazineCampaign",
      story: "campaignLaunch",
      density: "balanced",
      strength: "strong",
      themePreset: "darkTech",
      intents: ["growth", "partner", "brand"],
      requiredBricks: ["adCarousel.editorialCover", "quickActions.priorityMatrix", "promoBanner.scoreboard"],
      moduleVariants: {
        PromotionBanner: "editorialCover",
        QuickActions: "taskRail",
        TradingAccounts: "accountWall",
      },
      moduleStyles: {
        adCarousel: "editorial-cover",
        quickActions: "task-rail",
        promoHighlight: "scoreboard",
        tradingAccounts: "account-wall",
      },
      summary: "像专题封面一样组织活动、快捷入口和账号证明，避免普通后台卡片感。",
    },
    depositLadder: {
      id: "depositLadder",
      label: "Deposit Bonus Ladder",
      layoutPreset: "conversionFirst",
      story: "depositConversion",
      density: "balanced",
      strength: "strong",
      themePreset: "blueFinance",
      intents: ["deposit"],
      requiredBricks: ["promoBanner.depositLadder", "walletBalance.currencyRail", "fundActions.priorityDock", "openAccount.conversionPanel", "quickActions.taskRail"],
      moduleVariants: {
        PromotionBanner: "depositLadder",
        WalletBalance: "splitCurrency",
        FundActions: "splitButtons",
        OpenAccount: "conversionPanel",
        QuickActions: "taskRail",
        AccountPerformance: "cleanSnapshot",
        TradingAccounts: "accountWall",
      },
      moduleStyles: {
        promoHighlight: "deposit-ladder",
        walletBalance: "wallet-strip",
        fundActions: "split-buttons",
        openAccountActions: "conversion-panel",
        quickActions: "task-rail",
        accountPerformance: "pro-chart",
        tradingAccounts: "account-wall",
      },
      summary: "把入金奖励阶梯、钱包余额、主入金动作和开真实账号压进首屏，辅助信息下移。",
    },
    tradingCommand: {
      id: "tradingCommand",
      label: "Trading Command Center",
      layoutPreset: "tradingCommand",
      story: "tradingEfficiency",
      density: "compact",
      strength: "strong",
      themePreset: "darkTech",
      intents: ["trader", "insight", "risk"],
      requiredBricks: ["quickActions.commandBar", "accountPerformance.sparklineBoard", "userKycRail.profileWallet"],
      moduleVariants: {
        AssetOverview: "darkTerminal",
        QuickActions: "commandBar",
        AccountPerformance: "sparklineBoard",
        TradingAccounts: "opsTable",
      },
      moduleStyles: {
        balanceTotal: "ticker-strip",
        quickActions: "command-bar",
        accountPerformance: "sparkline-board",
        tradingAccounts: "ops-table",
      },
      summary: "把首页变成交易指挥中心，首屏强调动作、图表、状态和账号管理。",
    },
    onboardingJourney: {
      id: "onboardingJourney",
      label: "Onboarding Journey",
      layoutPreset: "onboardingJourney",
      story: "accountActivation",
      density: "balanced",
      strength: "strong",
      themePreset: "blueFinance",
      intents: ["onboarding", "deposit", "retention"],
      requiredBricks: ["onboardingProgress.timeline", "openAccount.conversionPanel", "createAccountForm.realAccount", "quickActions.taskRail"],
      moduleVariants: {
        OnboardingProgress: "journeyTimeline",
        OpenAccount: "conversionPanel",
        QuickActions: "taskRail",
        TradingAccounts: "accountWall",
      },
      moduleStyles: {
        onboardingProgress: "journey-timeline",
        openAccountActions: "conversion-panel",
        quickActions: "task-rail",
        tradingAccounts: "account-wall",
      },
      summary: "把首页从仪表盘改成新客旅程，所有模块围绕下一步推进。",
    },
    privateWealthDesk: {
      id: "privateWealthDesk",
      label: "Private Wealth Desk",
      layoutPreset: "privateWealthDesk",
      story: "wealthService",
      density: "spacious",
      strength: "strong",
      themePreset: "blackGold",
      intents: ["vip"],
      requiredBricks: ["assetOverview.wealthPlate", "fundActions.priorityDock", "adCarousel.heroCampaign", "openAccount.sidePanel"],
      moduleVariants: {
        AssetOverview: "wealthPlate",
        WalletBalance: "premiumCard",
        PromotionBanner: "blackGoldVip",
        TradingAccounts: "opsTable",
      },
      moduleStyles: {
        balanceTotal: "wealth-plate",
        walletBalance: "wallet-actions",
        adCarousel: "immersive",
        tradingAccounts: "ops-table",
      },
      summary: "把高净值首页做成服务台，资产、权益和专属开户路径更像客户经理桌面。",
    },
    accountOpsConsole: {
      id: "accountOpsConsole",
      label: "Account Ops Console",
      layoutPreset: "accountOpsConsole",
      story: "opsClarity",
      density: "balanced",
      strength: "medium",
      themePreset: "blueFinance",
      intents: ["asset", "standard", "mobile", "brand"],
      requiredBricks: ["assetOverview.tickerStrip", "fundActions.priorityDock", "walletList.tiles", "accountPerformance.proChart"],
      moduleVariants: {
        AssetOverview: "tickerStrip",
        WalletList: "walletTiles",
        TradingAccounts: "opsTable",
      },
      moduleStyles: {
        balanceTotal: "ticker-strip",
        walletList: "wallet-tiles",
        tradingAccounts: "ops-table",
      },
      summary: "把资产、钱包、风险和账号变成清晰的运营控制台。",
    },
  };

  const PAGE_GOVERNANCE_CONTRACTS = {
    standard: {
      label: "标准工作台契约",
      primaryGoal: "保留资产、资金、快捷入口和交易账号的平衡工作台。",
      primaryAction: "deposit",
      secondaryAction: "openAccount",
      firstScreenSlots: ["balanceTotal", "fundActions"],
      operationSlots: ["quickActions"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["adCarousel", "referralLink"],
      maxPrimaryActionSurfaces: 2,
    },
    asset: {
      label: "资产管理契约",
      primaryGoal: "先让客户看清资产、钱包、可用资金和账户风险。",
      primaryAction: "deposit",
      secondaryAction: "withdraw",
      firstScreenSlots: ["balanceTotal", "fundActions"],
      operationSlots: ["walletList", "accountPerformance", "riskNotice"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["adCarousel", "referralLink", "openAccountActions"],
      maxPrimaryActionSurfaces: 2,
    },
    deposit: {
      label: "入金转化契约",
      primaryGoal: "推动客户理解入金奖励并完成一次入金。",
      primaryAction: "deposit",
      secondaryAction: "openReal",
      firstScreenSlots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"],
      operationSlots: ["quickActions"],
      accountSlots: ["accountPerformance", "tradingAccounts"],
      weakSlots: ["withdraw", "walletList", "adCarousel", "referralLink", "createAccountForm", "balanceTotal"],
      maxPrimaryActionSurfaces: 1,
      forcedQuickActions: ["transfer", "orders", "positions", "contactService"],
    },
    onboarding: {
      label: "开户激活契约",
      primaryGoal: "引导客户完成 KYC、开真实账号和首次入金。",
      primaryAction: "openAccount",
      secondaryAction: "deposit",
      firstScreenSlots: ["onboardingProgress", "openAccountActions"],
      operationSlots: ["createAccountForm", "fundActions", "quickActions"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["referralLink", "adCarousel"],
      maxPrimaryActionSurfaces: 3,
    },
    growth: {
      label: "活动增长契约",
      primaryGoal: "用活动主视觉和快捷参与路径推动报名、入金或交易。",
      primaryAction: "eventSignup",
      secondaryAction: "deposit",
      firstScreenSlots: ["adCarousel"],
      operationSlots: ["quickActions", "promoHighlight", "fundActions"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["walletList", "createAccountForm"],
      maxPrimaryActionSurfaces: 2,
    },
    trader: {
      label: "交易效率契约",
      primaryGoal: "让交易员更快处理账号、持仓、订单和资金动作。",
      primaryAction: "switchAccount",
      secondaryAction: "deposit",
      firstScreenSlots: ["quickActions", "accountPerformance"],
      operationSlots: ["userKycRail", "balanceTotal", "riskNotice"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["adCarousel", "promoHighlight", "referralLink", "createAccountForm"],
      maxPrimaryActionSurfaces: 2,
    },
    brand: {
      label: "券商可信契约",
      primaryGoal: "先建立资金安全和余额可信度，再承接开户、主推活动和账号管理。",
      primaryAction: "openReal",
      secondaryAction: "deposit",
      firstScreenSlots: ["balanceTotal", "openAccountActions"],
      operationSlots: ["walletList", "quickActions", "promoHighlight"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["adCarousel", "referralLink", "createAccountForm"],
      maxPrimaryActionSurfaces: 2,
    },
  };

  const BLUEPRINT_PRESETS = [
    {
      id: "standard-workbench",
      name: "标准工作台",
      layout: "standardDashboard",
      themePreset: "default",
      personalizationStrength: "medium",
      density: "balanced",
      heroFocus: "balanceTotal",
      tags: ["默认", "标准", "平衡", "工作台", "完整", "稳健"],
      sections: [
        { id: "overview", type: "rail", title: "账户总览", slots: ["balanceTotal", "fundActions", "quickActions"] },
        { id: "promo", type: "split", title: "活动与开户", slots: ["adCarousel", "promoHighlight", "onboardingProgress"] },
        { id: "wallet", type: "split", title: "钱包摘要", slots: ["walletBalance"] },
        { id: "accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ],
      modules: {
        AssetOverview: { variant: "standard" },
        WalletBalance: { variant: "standard" },
        QuickActions: { variant: "gridCards" },
        PromotionBanner: { variant: "imageBanner" },
      },
      moduleSettings: {
        quickActions: { count: 7, display: "iconText" },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: { showFundActions: true },
        tradingAccounts: { grouping: "combined", viewMode: "switchable" },
      },
      summary: "适合通用租户：保留完整业务能力，资产、资金操作、快捷入口和交易账号保持均衡。",
    },
    {
      id: "asset-first",
      name: "资产优先首页",
      layout: "assetFirst",
      themePreset: "blueFinance",
      personalizationStrength: "medium",
      density: "spacious",
      heroFocus: "balanceTotal",
      tags: ["资产", "钱包", "余额", "资金", "入金", "出金", "安全", "资产优先"],
      sections: [
        { id: "asset-hero", type: "hero", title: "资产优先", variant: "asset", slots: ["balanceTotal", "walletBalance", "fundActions"] },
        { id: "actions", type: "rail", title: "常用动作", slots: ["quickActions", "onboardingProgress"] },
        { id: "campaign", type: "split", title: "活动辅助", slots: ["adCarousel", "promoHighlight"] },
        { id: "accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ],
      modules: {
        AssetOverview: { variant: "vipHero" },
        WalletBalance: { variant: "splitCurrency" },
        QuickActions: { variant: "actionDock" },
        PromotionBanner: { variant: "splitVisual" },
      },
      moduleSettings: {
        quickActions: { count: 5, display: "iconText" },
        wallet: { enabled: true, placement: "standalone", showFundActions: true },
        assets: { enabled: true, showFundActions: true },
        tradingAccounts: { grouping: "separated", viewMode: "list" },
      },
      summary: "适合资产管理诉求强的租户：首屏先建立资产安全感，再承接入金、出金和账号管理。",
    },
    {
      id: "executive-capital",
      name: "VIP 资产中枢",
      layout: "vipService",
      themePreset: "blackGold",
      personalizationStrength: "strong",
      density: "spacious",
      heroFocus: "balanceTotal",
      tags: ["vip", "高净值", "黑金", "专业", "机构", "大气", "入金", "资产", "广告", "banner", "轮播"],
      sections: [
        { id: "hero-capital", type: "hero", title: "资产中枢", variant: "capital", slots: ["balanceTotal", "fundActions", "adCarousel"] },
        { id: "open-rail", type: "rail", title: "开户与常用操作", slots: ["openAccountActions", "quickActions"] },
        { id: "trust-path", type: "split", title: "增长路径", slots: ["promoHighlight", "onboardingProgress"] },
        { id: "accounts-lower", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ],
      moduleStyles: {
        walletBalance: "wallet-actions",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        promoHighlight: "clean",
        quickActions: "toolbar",
        tradingAccounts: "calm-table",
      },
      modules: {
        AssetOverview: { variant: "vipHero" },
        WalletBalance: { variant: "premiumCard" },
        QuickActions: { variant: "actionDock" },
        PromotionBanner: { variant: "blackGoldVip" },
      },
      moduleSettings: {
        quickActions: { count: 5, display: "iconText" },
        wallet: { enabled: true, placement: "standalone", showFundActions: true },
        assets: { showFundActions: true },
        tradingAccounts: { grouping: "separated", viewMode: "list" },
      },
      summary: "适合高净值与品牌型券商：首屏把资产、入金、广告轮播和权益曝光放在一个强视觉区域，账号列表保留下方。",
    },
    {
      id: "campaign-growth",
      name: "活动增长首页",
      layout: "conversionFirst",
      themePreset: "lightGold",
      personalizationStrength: "strong",
      density: "balanced",
      heroFocus: "adCarousel",
      tags: ["活动", "比赛", "大赛", "营销", "增长", "转化", "奖池", "入金", "广告", "banner", "轮播"],
      sections: [
        { id: "campaign-hero", type: "hero", title: "活动转化", variant: "campaign", slots: ["adCarousel", "fundActions", "quickActions"] },
        { id: "capital-strip", type: "split", title: "资金与开户", slots: ["balanceTotal", "openAccountActions"] },
        { id: "account-proof", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
        { id: "supporting", type: "split", title: "辅助转化", slots: ["promoHighlight", "onboardingProgress"] },
      ],
      moduleStyles: {
        balanceTotal: "metric-strip",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        onboardingProgress: "checklist",
        promoHighlight: "scoreboard",
        quickActions: "compact-grid",
        tradingAccounts: "dense-cards",
      },
      modules: {
        AssetOverview: { variant: "compactTable" },
        WalletBalance: { variant: "splitCurrency" },
        QuickActions: { variant: "priorityButtons" },
        PromotionBanner: { variant: "gradientHero" },
      },
      moduleSettings: {
        quickActions: { count: 8, display: "iconText" },
        wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false },
        assets: { showFundActions: true },
        tradingAccounts: { grouping: "combined", viewMode: "card" },
      },
      summary: "适合活动运营：浅金扁平视觉，广告轮播独占首屏核心，保留 8 个快捷入口和账号转化路径。",
    },
    {
      id: "onboarding-path",
      name: "新客开户路径",
      layout: "conversionFirst",
      themePreset: "blueFinance",
      personalizationStrength: "medium",
      density: "compact",
      heroFocus: "onboardingProgress",
      tags: ["开户", "kyc", "新手", "注册", "首次", "引导", "转化"],
      sections: [
        { id: "onboarding-hero", type: "hero", title: "开户路径", variant: "onboarding", slots: ["onboardingProgress", "openAccountActions", "fundActions"] },
        { id: "starter-tools", type: "split", title: "新手工具", slots: ["balanceTotal", "quickActions"] },
        { id: "promo", type: "split", title: "激励活动", slots: ["adCarousel", "promoHighlight"] },
        { id: "accounts-base", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ],
      moduleStyles: {
        balanceTotal: "quiet-card",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        onboardingProgress: "checklist",
        promoHighlight: "clean",
        adCarousel: "clean",
        quickActions: "toolbar",
        tradingAccounts: "calm-table",
      },
      modules: {
        AssetOverview: { variant: "standard" },
        WalletBalance: { variant: "compact" },
        QuickActions: { variant: "priorityButtons" },
        PromotionBanner: { variant: "splitVisual" },
      },
      moduleSettings: {
        quickActions: { count: 4, display: "iconText" },
        wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
        assets: { showFundActions: true },
        tradingAccounts: { grouping: "combined", viewMode: "list" },
      },
      summary: "适合新客户转化：把开户、KYC、首次入金路径做成主线，避免客户进入首页后不知道下一步。",
    },
    {
      id: "trader-console",
      name: "专业交易工作台",
      layout: "tradingPro",
      themePreset: "default",
      personalizationStrength: "medium",
      density: "compact",
      heroFocus: "tradingAccounts",
      tags: ["交易", "账号", "mt4", "mt5", "持仓", "订单", "专业", "列表"],
      sections: [
        { id: "trader-top", type: "rail", title: "交易概览", slots: ["balanceTotal", "fundActions", "quickActions"] },
        { id: "accounts-main", type: "full", title: "账号工作台", slots: ["tradingAccounts"] },
        { id: "trader-secondary", type: "split", title: "辅助信息", slots: ["adCarousel", "promoHighlight", "onboardingProgress"] },
      ],
      moduleStyles: {
        balanceTotal: "metric-strip",
        fundActions: "compact-row",
        openAccountActions: "soft-card",
        onboardingProgress: "compact",
        promoHighlight: "clean",
        adCarousel: "compact",
        quickActions: "toolbar",
        tradingAccounts: "calm-table",
      },
      modules: {
        AssetOverview: { variant: "compactTable" },
        WalletBalance: { variant: "compact" },
        QuickActions: { variant: "minimalIcons" },
        PromotionBanner: { variant: "splitVisual" },
      },
      moduleSettings: {
        quickActions: { count: 6, display: "iconOnly" },
        wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false },
        assets: { showFundActions: true },
        tradingAccounts: { grouping: "separated", viewMode: "list" },
        openAccount: { placement: "insideTradingAccounts" },
      },
      summary: "适合活跃交易客户：账号列表和交易相关入口优先，信息密度更高。",
    },
    {
      id: "partner-growth",
      name: "代理裂变首页",
      layout: "conversionFirst",
      themePreset: "blueFinance",
      personalizationStrength: "strong",
      density: "balanced",
      heroFocus: "referral_link_card",
      tags: ["ib", "代理", "邀请", "推荐", "裂变", "渠道", "开户链接"],
      sections: [
        { id: "partner-referral", type: "rail", title: "推广链接", variant: "partner", slots: ["referral_link_card"] },
        { id: "capital-actions", type: "split", title: "资金与快捷入口", slots: ["balanceTotal", "quickActions"] },
        { id: "partner-path", type: "split", title: "活动与引导", slots: ["promoHighlight", "onboardingProgress"] },
        { id: "accounts-partner", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ],
      moduleStyles: {
        balanceTotal: "metric-strip",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        onboardingProgress: "checklist",
        promoHighlight: "scoreboard",
        adCarousel: "clean",
        quickActions: "compact-grid",
        referral_link_card: "compact-card",
        tradingAccounts: "dense-cards",
      },
      modules: {
        AssetOverview: { variant: "compactTable" },
        WalletBalance: { variant: "splitCurrency" },
        QuickActions: { variant: "priorityButtons" },
        PromotionBanner: { variant: "gradientHero" },
      },
      moduleSettings: {
        quickActions: { count: 8, display: "iconText" },
        wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false },
        assets: { showFundActions: true },
        referral: { enabled: false },
        referralLinkCard: { enabled: true, showPromoLink: true, showInviteCode: true, showShare: false, showStats: false },
        tradingAccounts: { grouping: "combined", viewMode: "card" },
      },
      summary: "适合 IB 和渠道型券商：轻量推广链接、邀请码、活动和账号信息组合，不展示完整代理数据。",
    },
  ];

  const HOME_BRICKS = [
    {
      id: "assetOverview.vipHero",
      name: "VIP 资产 Hero",
      family: "AssetOverview",
      feature: "balanceTotal",
      component: "asset_summary",
      size: "2x2",
      defaultZone: "hero",
      intents: ["vip", "asset"],
      tags: ["高净值", "vip", "黑金", "资产", "大客户"],
      moduleId: "AssetOverview",
      variant: "vipHero",
      moduleStyleFeature: "balanceTotal",
      moduleStyle: "command",
      settings: { assets: { enabled: true, showFundActions: true }, wallet: { enabled: true, placement: "standalone", showFundActions: true } },
      reason: "首屏先建立资金实力和信任感。",
    },
    {
      id: "assetOverview.assetCommand",
      name: "资产管理总览",
      family: "AssetOverview",
      feature: "balanceTotal",
      component: "asset_summary",
      size: "2x2",
      defaultZone: "hero",
      intents: ["asset"],
      tags: ["资产管理", "总资产", "多币种", "钱包列表", "可用资金", "保证金"],
      moduleId: "AssetOverview",
      variant: "standard",
      moduleStyleFeature: "balanceTotal",
      moduleStyle: "command",
      settings: {
        assets: {
          enabled: true,
          showFundActions: true,
          showAccountBreakdown: true,
          showWalletBreakdown: false,
          showAvailable: true,
          showMargin: true,
          showRiskLevel: true,
          wallets: ["USD", "EUR", "USDT"],
        },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
      },
      reason: "淡蓝扁平总资产看板承接资产管理首页重心。",
    },
    {
      id: "assetOverview.compactMetrics",
      name: "紧凑资产指标条",
      family: "AssetOverview",
      feature: "balanceTotal",
      component: "asset_summary",
      size: "3x1",
      defaultZone: "hero",
      intents: ["standard", "growth", "trader"],
      tags: ["资产", "余额", "紧凑", "专业", "工作台"],
      moduleId: "AssetOverview",
      variant: "compactTable",
      moduleStyleFeature: "balanceTotal",
      moduleStyle: "metric-strip",
      settings: { assets: { enabled: true, showFundActions: true }, wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false } },
      reason: "用低高度承接资产信息，为交易或活动模块让出空间。",
    },
    {
      id: "assetOverview.tickerStrip",
      name: "资产 Ticker 指标条",
      family: "AssetOverview",
      feature: "balanceTotal",
      component: "asset_summary",
      size: "3x1",
      defaultZone: "hero",
      intents: ["standard", "asset", "mobile"],
      tags: ["资产", "ticker", "运营", "指标", "横向"],
      moduleId: "AssetOverview",
      variant: "tickerStrip",
      moduleStyleFeature: "balanceTotal",
      moduleStyle: "ticker-strip",
      settings: { assets: { enabled: true, showFundActions: true, showAvailable: true }, wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false } },
      reason: "用横向指标带做账户运营控制台的第一屏。",
    },
    {
      id: "assetOverview.wealthPlate",
      name: "私行资产服务牌",
      family: "AssetOverview",
      feature: "balanceTotal",
      component: "asset_summary",
      size: "2x2",
      defaultZone: "hero",
      intents: ["vip"],
      tags: ["高净值", "vip", "私行", "权益", "服务"],
      moduleId: "AssetOverview",
      variant: "wealthPlate",
      moduleStyleFeature: "balanceTotal",
      moduleStyle: "wealth-plate",
      settings: { assets: { enabled: true, showFundActions: true, showAccountBreakdown: true }, wallet: { enabled: true, placement: "standalone", showFundActions: true } },
      reason: "把资产总览做成客户经理服务台，弱化普通卡片感。",
    },
    {
      id: "assetOverview.riskRadar",
      name: "资产风险雷达",
      family: "AssetOverview",
      feature: "balanceTotal",
      component: "asset_summary",
      size: "2x2",
      defaultZone: "hero",
      intents: ["risk", "insight"],
      tags: ["风险", "风控", "保证金", "雷达", "账户健康"],
      moduleId: "AssetOverview",
      variant: "riskRadar",
      moduleStyleFeature: "balanceTotal",
      moduleStyle: "risk-radar",
      settings: { assets: { enabled: true, showFundActions: true, showAvailable: true, showMargin: true, showRiskLevel: true }, riskNotice: { enabled: true } },
      reason: "风控首页先给可用资金、保证金和风险状态。",
    },
    {
      id: "fundActions.priorityDock",
      name: "资金操作 Dock",
      family: "FundActions",
      feature: "fundActions",
      component: "fund_actions",
      size: "1x1",
      defaultZone: "rail",
      intents: ["vip", "growth", "asset", "onboarding"],
      tags: ["入金", "出金", "资金", "转化"],
      moduleId: "FundActions",
      variant: "splitButtons",
      moduleStyleFeature: "fundActions",
      moduleStyle: "split-buttons",
      settings: { assets: { showFundActions: true }, wallet: { showFundActions: true } },
      reason: "把入金和出金从资产卡里拆出来，形成明确操作入口。",
    },
    {
      id: "walletBalance.currencyRail",
      name: "钱包币种侧栏",
      family: "WalletBalance",
      feature: "walletBalance",
      component: "wallet_balance",
      size: "1x1",
      defaultZone: "rail",
      intents: ["asset", "vip", "standard"],
      tags: ["钱包", "币种", "余额", "资金安全"],
      moduleId: "WalletBalance",
      variant: "splitCurrency",
      moduleStyleFeature: "walletBalance",
      moduleStyle: "wallet-strip",
      settings: { wallet: { enabled: true, placement: "standalone", showFundActions: false } },
      reason: "让钱包余额成为可独立扫描的资金积木。",
    },
    {
      id: "quickActions.actionDock",
      name: "交易操作 Dock",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "3x1",
      defaultZone: "hero",
      intents: ["trader", "asset", "standard"],
      tags: ["快捷", "交易", "订单", "持仓", "工具"],
      moduleId: "QuickActions",
      variant: "actionDock",
      moduleStyleFeature: "quickActions",
      moduleStyle: "toolbar",
      settings: { quickActions: { enabled: true, count: 6, display: "iconOnly" } },
      reason: "专业客户需要把订单、持仓、资金动作压缩成高效率工具条。",
    },
    {
      id: "quickActions.priorityMatrix",
      name: "转化快捷矩阵",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "2x1",
      defaultZone: "main",
      intents: ["growth", "onboarding", "partner"],
      tags: ["入金", "开户", "快捷", "转化", "两行"],
      moduleId: "QuickActions",
      variant: "priorityButtons",
      moduleStyleFeature: "quickActions",
      moduleStyle: "compact-grid",
      settings: { quickActions: { enabled: true, count: 8, display: "iconText" } },
      reason: "把入金、开户、转账等转化动作做成可扫的操作矩阵。",
    },
    {
      id: "quickActions.commandBar",
      name: "交易命令栏",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "3x1",
      defaultZone: "hero",
      intents: ["trader", "insight"],
      tags: ["命令栏", "交易", "高频", "终端", "工具条"],
      moduleId: "QuickActions",
      variant: "commandBar",
      moduleStyleFeature: "quickActions",
      moduleStyle: "command-bar",
      settings: { quickActions: { enabled: true, count: 8, display: "iconOnly" } },
      reason: "专业交易首页用命令栏替代普通快捷卡片。",
    },
    {
      id: "quickActions.taskRail",
      name: "下一步任务按钮组",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "2x1",
      defaultZone: "main",
      intents: ["onboarding", "deposit", "retention"],
      tags: ["任务", "下一步", "开户", "留存", "入金"],
      moduleId: "QuickActions",
      variant: "taskRail",
      moduleStyleFeature: "quickActions",
      moduleStyle: "task-rail",
      settings: { quickActions: { enabled: true, count: 6, display: "iconText" } },
      reason: "把普通入口转换成客户下一步任务。",
    },
    {
      id: "adCarousel.heroCampaign",
      name: "首屏广告轮播",
      family: "PromotionBanner",
      feature: "adCarousel",
      component: "ad_carousel",
      size: "3x1",
      defaultZone: "hero",
      intents: ["growth", "vip", "partner"],
      tags: ["广告", "轮播", "banner", "活动", "权益"],
      moduleId: "PromotionBanner",
      variant: "gradientHero",
      moduleStyleFeature: "adCarousel",
      moduleStyle: "immersive",
      settings: { adCarousel: { enabled: true } },
      reason: "把活动、权益或开户链接作为首屏视觉焦点。",
    },
    {
      id: "adCarousel.editorialCover",
      name: "专题封面轮播",
      family: "PromotionBanner",
      feature: "adCarousel",
      component: "ad_carousel",
      size: "3x1",
      defaultZone: "hero",
      intents: ["growth", "brand", "partner"],
      tags: ["杂志", "封面", "活动", "banner", "专题"],
      moduleId: "PromotionBanner",
      variant: "editorialCover",
      moduleStyleFeature: "adCarousel",
      moduleStyle: "editorial-cover",
      settings: { adCarousel: { enabled: true } },
      reason: "活动首页采用专题封面，而不是普通横幅卡片。",
    },
    {
      id: "promoBanner.scoreboard",
      name: "赛事活动看板",
      family: "PromotionBanner",
      feature: "promoHighlight",
      component: "promo_banner",
      size: "2x1",
      defaultZone: "main",
      intents: ["growth", "partner"],
      tags: ["活动", "比赛", "大赛", "奖池", "营销"],
      moduleId: "PromotionBanner",
      variant: "gradientHero",
      moduleStyleFeature: "promoHighlight",
      moduleStyle: "scoreboard",
      settings: { adCarousel: { enabled: true } },
      reason: "用奖池、倒计时和活动 CTA 承接运营转化。",
    },
    {
      id: "promoBanner.depositLadder",
      name: "入金奖励阶梯",
      family: "PromotionBanner",
      feature: "promoHighlight",
      component: "promo_banner",
      size: "2x2",
      defaultZone: "hero",
      intents: ["deposit"],
      tags: ["入金", "首存", "奖励", "赠金", "500", "2000", "10000"],
      moduleId: "PromotionBanner",
      variant: "depositLadder",
      moduleStyleFeature: "promoHighlight",
      moduleStyle: "deposit-ladder",
      settings: { adCarousel: { enabled: true } },
      reason: "把三档入金奖励和最高赠金做成首屏主价值，不再用普通活动卡替代。",
    },
    {
      id: "referralLink.growthConsole",
      name: "邀请增长控制台",
      family: "ReferralLink",
      feature: "referralLink",
      component: "referral_link",
      size: "3x1",
      defaultZone: "hero",
      intents: ["partner"],
      tags: ["ib", "代理", "渠道", "邀请", "推荐", "裂变"],
      moduleId: "ReferralLink",
      variant: "linkFirst",
      moduleStyleFeature: "referralLink",
      moduleStyle: "link-first",
      settings: { referral: { enabled: true, showClicks: true, showRegistrations: true, showTradingAccounts: true, showPromoLink: true, showInviteCode: true, showQrCode: true } },
      reason: "渠道型首页优先暴露注册链接、邀请码和转化数据。",
    },
    {
      id: "referralLinkCard.compact",
      name: "推广链接卡片",
      family: "ReferralLinkCard",
      feature: "referral_link_card",
      component: "referral_link_card",
      size: "1x1",
      defaultZone: "rail",
      intents: ["partner"],
      tags: ["ib", "代理用户", "合作伙伴", "推广链接", "邀请码"],
      moduleId: "ReferralLinkCard",
      variant: "compactCard",
      moduleStyleFeature: "referral_link_card",
      moduleStyle: "compact-card",
      settings: { referralLinkCard: { enabled: true, showPromoLink: true, showInviteCode: true, showShare: false, showStats: false } },
      reason: "代理、IB 或合作伙伴快速复制推广链接和邀请码，不承载完整代理数据。",
    },
    {
      id: "onboardingProgress.checklist",
      name: "新客开户清单",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "2x1",
      defaultZone: "hero",
      intents: ["onboarding"],
      tags: ["新手", "新客", "开户", "注册", "kyc", "首次"],
      moduleId: "OnboardingProgress",
      variant: "checklist",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "checklist",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "把 KYC、开真实账号和首次入金变成连续任务。",
    },
    {
      id: "onboardingProgress.timeline",
      name: "新客旅程时间线",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "2x1",
      defaultZone: "hero",
      intents: ["onboarding", "deposit", "retention"],
      tags: ["新客", "开户", "旅程", "时间线", "下一步"],
      moduleId: "OnboardingProgress",
      variant: "journeyTimeline",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "journey-timeline",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "新客首页用时间线表达当前状态和下一步。",
    },
    {
      id: "openAccount.sidePanel",
      name: "右侧开户操作台",
      family: "OpenAccount",
      feature: "openAccountActions",
      component: "open_account_panel",
      size: "1x2",
      defaultZone: "rail",
      intents: ["onboarding", "partner", "vip"],
      tags: ["开户", "真实账号", "模拟账号", "绑定账号"],
      moduleId: "OpenAccount",
      variant: "sidePanel",
      moduleStyleFeature: "openAccountActions",
      moduleStyle: "stacked",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "把开户入口从账号表里拆出来，形成独立转化面板。",
    },
    {
      id: "openAccount.conversionPanel",
      name: "开户转化面板",
      family: "OpenAccount",
      feature: "openAccountActions",
      component: "open_account_panel",
      size: "1x2",
      defaultZone: "rail",
      intents: ["onboarding", "deposit"],
      tags: ["开户", "转化", "真实账号", "首存"],
      moduleId: "OpenAccount",
      variant: "conversionPanel",
      moduleStyleFeature: "openAccountActions",
      moduleStyle: "conversion-panel",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "把开户动作做成更明确的下一步转化面板。",
    },
    {
      id: "createAccountForm.realAccount",
      name: "真实账户创建表单",
      family: "CreateAccountForm",
      feature: "createAccountForm",
      component: "create_account_form",
      size: "1x2",
      defaultZone: "rail",
      intents: ["onboarding"],
      tags: ["创建账户", "开户表单", "真实账户", "杠杆"],
      moduleId: "CreateAccountForm",
      variant: "realAccountForm",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "当目标是开户转化时，直接把创建账号表单放到右侧。",
    },
	    {
	      id: "userKycRail.profileWallet",
	      name: "用户/KYC 钱包侧栏",
      family: "UserKycRail",
      feature: "userKycRail",
      component: "user_kyc_rail",
      size: "1x2",
      defaultZone: "rail",
      intents: ["trader", "onboarding", "asset"],
      tags: ["用户", "kyc", "侧栏", "钱包", "状态"],
      moduleId: "UserKycRail",
	      variant: "profileWallet",
	      reason: "右侧承载身份、认证、时间和钱包摘要，让主栏留给核心业务。",
	    },
	    {
	      id: "marketInsight.healthPanel",
	      name: "账户健康洞察",
	      family: "MarketInsight",
	      feature: "marketInsight",
	      component: "market_insight",
	      size: "1x2",
	      defaultZone: "rail",
	      intents: ["insight", "risk", "retention"],
	      tags: ["洞察", "数据", "分析", "健康度", "资金流"],
	      reason: "用轻量指标补充账户健康、资金流和市场状态，避免所有分析都挤进资产卡。",
	    },
    {
      id: "accountPerformance.proChart",
      name: "账号表现图表",
      family: "AccountPerformance",
      feature: "accountPerformance",
      component: "account_performance",
      size: "2x2",
      defaultZone: "main",
      intents: ["trader", "asset"],
      tags: ["交易", "图表", "表现", "pnl", "权益", "余额"],
      moduleId: "AccountPerformance",
      variant: "proChart",
      reason: "活跃交易客户需要在首页直接看到账号表现和权益走势。",
    },
    {
      id: "accountPerformance.sparklineBoard",
      name: "Sparkline 指挥看板",
      family: "AccountPerformance",
      feature: "accountPerformance",
      component: "account_performance",
      size: "2x2",
      defaultZone: "main",
      intents: ["trader", "insight", "risk"],
      tags: ["sparkline", "交易", "表现", "指挥中心", "pnl"],
      moduleId: "AccountPerformance",
      variant: "sparklineBoard",
      moduleStyleFeature: "accountPerformance",
      moduleStyle: "sparkline-board",
      reason: "把单一图表变成多个趋势指标组成的交易指挥看板。",
    },
    {
      id: "tradingAccounts.separatedList",
      name: "真实/模拟账号双列表",
      family: "TradingAccounts",
      feature: "tradingAccounts",
      component: "account_list",
      size: "3x2",
      defaultZone: "full",
      intents: ["trader", "asset", "standard"],
      tags: ["交易账号", "live", "demo", "列表", "真实", "模拟"],
      moduleId: "TradingAccounts",
      variant: "separatedList",
      moduleStyleFeature: "tradingAccounts",
      moduleStyle: "calm-table",
      settings: { tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" } },
      reason: "真实账号和模拟账号分开，适合专业管理和客服排查。",
    },
    {
      id: "tradingAccounts.cardProof",
      name: "紧凑账号证明卡",
      family: "TradingAccounts",
      feature: "tradingAccounts",
      component: "account_list",
      size: "2x2",
      defaultZone: "main",
      intents: ["growth", "partner"],
      tags: ["交易账号", "活动", "卡片", "证明"],
      moduleId: "TradingAccounts",
      variant: "denseCards",
      moduleStyleFeature: "tradingAccounts",
      moduleStyle: "dense-cards",
      settings: { tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "card" } },
      reason: "增长型首页保留账号可信信息，但不让长表格抢首屏。",
    },
    {
      id: "walletList.currencyTable",
      name: "多币种钱包列表",
      family: "WalletList",
      feature: "walletList",
      component: "wallet_list",
      size: "3x2",
      defaultZone: "full",
      intents: ["asset"],
      tags: ["钱包列表", "多币种", "余额", "资金"],
      moduleId: "WalletList",
      variant: "currencyTable",
      settings: { wallet: { enabled: true, placement: "standalone", showFundActions: false } },
      reason: "资产优先首页需要把多币种钱包作为完整列表展示。",
    },
    {
      id: "walletList.tiles",
      name: "钱包磁贴组",
      family: "WalletList",
      feature: "walletList",
      component: "wallet_list",
      size: "3x2",
      defaultZone: "full",
      intents: ["asset", "standard", "mobile"],
      tags: ["钱包", "磁贴", "多币种", "余额"],
      moduleId: "WalletList",
      variant: "walletTiles",
      moduleStyleFeature: "walletList",
      moduleStyle: "wallet-tiles",
      settings: { wallet: { enabled: true, placement: "standalone", showFundActions: false } },
      reason: "多币种钱包用磁贴组呈现，和普通表格明显区分。",
    },
    {
      id: "riskNotice.marginGuard",
      name: "保证金风险提示",
      family: "RiskNotice",
      feature: "riskNotice",
      component: "risk_notice",
      size: "1x2",
      defaultZone: "rail",
      intents: ["asset", "trader"],
      tags: ["风险", "保证金", "杠杆", "预警"],
      settings: { riskNotice: { enabled: true }, assets: { showRiskLevel: true, showMargin: true, showAvailable: true } },
      reason: "把保证金、杠杆和风险等级从资产配置里独立提醒。",
    },
  ];

  const BRICK_STRATEGIES = {
    standard: {
      label: "标准工作台积木流",
      layoutPreset: "standardDashboard",
      themePreset: "default",
      density: "balanced",
      strength: "medium",
      bricks: ["assetOverview.compactMetrics", "fundActions.priorityDock", "quickActions.actionDock", "adCarousel.heroCampaign", "tradingAccounts.separatedList"],
      summary: "保留完整业务路径，用积木块重排为资产、资金、快捷、活动和账号的工作台。",
    },
    vip: {
      label: "高净值资产中枢",
      layoutPreset: "vipService",
      themePreset: "blackGold",
      density: "spacious",
      strength: "strong",
      bricks: ["assetOverview.vipHero", "fundActions.priorityDock", "adCarousel.heroCampaign", "walletBalance.currencyRail", "openAccount.sidePanel", "tradingAccounts.separatedList"],
      summary: "首屏用资产 Hero、资金 Dock 和广告权益形成高净值服务感。",
    },
    asset: {
      label: "资产管理纵向流",
      layoutPreset: "assetFirst",
      themePreset: "blueFinance",
      density: "spacious",
      strength: "medium",
      bricks: ["assetOverview.assetCommand", "fundActions.priorityDock", "walletList.currencyTable", "accountPerformance.proChart", "riskNotice.marginGuard", "tradingAccounts.separatedList"],
      summary: "总资产、资金动作、多币种钱包、账户表现和交易账号构成完整资产管理工作台。",
    },
    trader: {
      label: "专业交易工作台",
      layoutPreset: "tradingPro",
      themePreset: "default",
      density: "compact",
      strength: "medium",
      bricks: ["quickActions.actionDock", "accountPerformance.proChart", "userKycRail.profileWallet", "assetOverview.compactMetrics", "tradingAccounts.separatedList"],
      summary: "把操作 Dock、账号表现图表和真实/模拟双列表作为专业交易主线。",
    },
    onboarding: {
      label: "新客开户路径",
      layoutPreset: "conversionFirst",
      themePreset: "blueFinance",
      density: "compact",
      strength: "medium",
      bricks: ["onboardingProgress.checklist", "openAccount.sidePanel", "createAccountForm.realAccount", "fundActions.priorityDock", "quickActions.priorityMatrix", "tradingAccounts.separatedList"],
      summary: "用开户清单、右侧开户操作台和创建表单推动新客完成下一步。",
    },
    growth: {
      label: "活动增长转化流",
      layoutPreset: "conversionFirst",
      themePreset: "lightGold",
      density: "balanced",
      strength: "strong",
      bricks: ["adCarousel.heroCampaign", "quickActions.priorityMatrix", "promoBanner.scoreboard", "fundActions.priorityDock", "tradingAccounts.cardProof"],
      summary: "活动轮播、快捷矩阵和赛事看板优先，服务营销转化。",
    },
	    partner: {
	      label: "IB 渠道增长流",
	      layoutPreset: "conversionFirst",
	      themePreset: "blueFinance",
	      density: "balanced",
	      strength: "strong",
	      bricks: ["referralLinkCard.compact", "assetOverview.compactMetrics", "quickActions.priorityMatrix", "promoBanner.scoreboard", "tradingAccounts.cardProof"],
		      summary: "轻量推广链接卡、资产、快捷入口、活动和交易账号组成代理首页，不生成完整代理数据区。",
	    },
	    insight: {
	      label: "数据洞察驾驶舱",
	      layoutPreset: "tradingPro",
	      themePreset: "blueFinance",
	      density: "compact",
	      strength: "medium",
	      bricks: ["accountPerformance.proChart", "marketInsight.healthPanel", "assetOverview.compactMetrics", "riskNotice.marginGuard", "fundActions.priorityDock", "tradingAccounts.separatedList"],
	      summary: "把账户表现、PnL、资金流和风险提示组织成每日检查型首页。",
	    },
	    deposit: {
	      label: "入金转化路径",
	      layoutPreset: "conversionFirst",
	      themePreset: "blueFinance",
	      density: "balanced",
	      strength: "strong",
	      bricks: ["promoBanner.depositLadder", "walletBalance.currencyRail", "fundActions.priorityDock", "openAccount.conversionPanel", "quickActions.taskRail", "accountPerformance.proChart", "tradingAccounts.cardProof"],
	      summary: "首屏围绕入金奖励阶梯、钱包余额、唯一主入金入口和开真实账号完成转化。",
	    },
	    risk: {
	      label: "风险保护工作台",
	      layoutPreset: "assetFirst",
	      themePreset: "blueFinance",
	      density: "compact",
	      strength: "medium",
	      bricks: ["accountPerformance.proChart", "riskNotice.marginGuard", "marketInsight.healthPanel", "assetOverview.compactMetrics", "userKycRail.profileWallet", "tradingAccounts.separatedList"],
	      summary: "用账户表现、保证金风险、市场波动和账号列表形成冷静风控首页。",
	    },
	    retention: {
	      label: "留存唤醒任务流",
	      layoutPreset: "conversionFirst",
	      themePreset: "minimalWhite",
	      density: "balanced",
	      strength: "medium",
	      bricks: ["assetOverview.compactMetrics", "quickActions.priorityMatrix", "fundActions.priorityDock", "promoBanner.scoreboard", "accountPerformance.proChart", "marketInsight.healthPanel", "tradingAccounts.cardProof"],
	      summary: "面向沉睡客户，用账户状态、任务召回、温和权益和快捷入金重新激活。",
	    },
	    mobile: {
	      label: "移动优先轻量流",
	      layoutPreset: "standardDashboard",
	      themePreset: "blueFinance",
	      density: "compact",
	      strength: "medium",
	      bricks: ["assetOverview.compactMetrics", "fundActions.priorityDock", "quickActions.actionDock", "walletBalance.currencyRail", "tradingAccounts.cardProof"],
	      summary: "单列优先，压缩图表和账号信息，让移动端首屏更短更直接。",
	    },
	    brand: {
	      label: "白标资金可信流",
	      layoutPreset: "accountOpsConsole",
	      themePreset: "blueFinance",
	      density: "balanced",
	      strength: "strong",
	      bricks: ["assetOverview.tickerStrip", "openAccount.conversionPanel", "walletList.tiles", "quickActions.taskRail", "promoBanner.scoreboard", "tradingAccounts.separatedList"],
	      summary: "资金安全、余额、钱包、主推活动、开户转化和账号工作台靠前，形成成熟券商客户端的信任感。",
	    },
	  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function numberFromPromptToken(value) {
    const source = String(value || "").trim();
    const digit = Number(source);
    if (Number.isFinite(digit)) return digit;
    return {
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
    }[source] || null;
  }

  function extractNearbyPromptCount(source, keywordPattern, unitPattern, min = 1, max = 12) {
    const text = String(source || "");
    const pattern = new RegExp(`${keywordPattern}[\\s\\S]{0,40}?([3-9三四五六七八九])\\s*${unitPattern}`, "i");
    const match = text.match(pattern);
    if (!match) return null;
    const count = numberFromPromptToken(match[1]);
    return Number.isFinite(count) ? Math.max(min, Math.min(max, count)) : null;
  }

  function extractHomepageUnderstanding(prompt) {
    const source = String(prompt || "");
    const text = source.toLowerCase() + source;
    const quickActionCount = extractNearbyPromptCount(source, "快捷(?:入口|操作|矩阵)", "个", 3, MAX_QUICK_ACTIONS);
    const quickContextMatch = source.match(/快捷(?:入口|操作|矩阵)[\s\S]{0,48}?(?:[3-8三四五六七八]\s*个)/i);
    const quickContext = quickContextMatch?.[0] || "";
    const quickActionExact =
      quickActionCount !== null &&
      !/(至少|不少于|不低于|最少|起步|以上|超过|大于)/.test(quickContext);
    const visibleMetricCount = extractNearbyPromptCount(source, "可见(?:数值|数字|指标)|(?:保留|展示|至少)", "(?:个)?\\s*可见(?:数值|数字|指标)", 1, 9);
    const wantsCombinedAccountFilter =
      (/(?:真实(?:交易)?账(?:号|户)[、,，\/和与\s]+模拟(?:交易)?账(?:号|户)[\s\S]{0,24}(?:一起|同一|统一|一个|合并))/.test(source) ||
        /(真实|live)[\s\S]{0,16}(模拟|demo)[\s\S]{0,24}(一起|同一|统一|一个|合并)/i.test(source)) &&
      includesAny(text, ["胶囊", "筛选", "快速筛选", "按钮"]);
    const wantsMatureBrokerTrust = includesAny(text, ["成熟券商", "资金安全", "品牌可信", "白标", "可信", "信任"]);
    const wantsLightBlue = includesAny(text, ["淡蓝", "浅蓝", "蓝色金融", "light blue"]);
    const wantsFreshLayout = includesAny(text, ["不沿用上一版", "不要沿用上一版", "布局骨架", "耳目一新", "不要只换颜色", "不能只是换颜色"]);
    const recommendationMatch = source.match(/推荐编号\s*([a-z0-9_-]+)/i);

    return {
      quickActionCount,
      quickActionExact,
      visibleMetricCount,
      wantsCombinedAccountFilter,
      wantsMatureBrokerTrust,
      wantsLightBlue,
      wantsFreshLayout,
      recommendationId: recommendationMatch?.[1] || "",
    };
  }

  function completeQuickActionIds(actions, count, preferred = []) {
    const defaults = ["openReal", "deposit", "transfer", "orders", "contactService", "positions", "risk", "downloadMt5"];
    const seen = new Set();
    return preferred
      .concat(Array.isArray(actions) ? actions.map(quickActionId).filter(Boolean) : [], defaults)
      .filter((id) => {
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return QUICK_ACTION_CATALOG[id];
      })
      .slice(0, Math.max(3, Math.min(MAX_QUICK_ACTIONS, Number(count) || MAX_QUICK_ACTIONS)));
  }

  function ensureSectionContains(config, sectionSeed, slot) {
    if (!FEATURES[slot]) return;
    config.sections = Array.isArray(config.sections) ? config.sections : [];
    if (config.sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot))) return;
    const existing = config.sections.find((section) => section.id === sectionSeed.id);
    if (existing) {
      existing.slots = uniqueValidSlots([...(Array.isArray(existing.slots) ? existing.slots : []), slot]);
      return;
    }
    config.sections.push({
      id: sectionSeed.id,
      type: sectionSeed.type || "split",
      title: sectionSeed.title || FEATURES[slot],
      slots: [slot],
    });
  }

  function applyHomepageUnderstandingToConfig(baseConfig, prompt) {
    const understanding = extractHomepageUnderstanding(prompt);
    const config = normalizeConfig(baseConfig);
    const needsTrustLayout =
      understanding.wantsMatureBrokerTrust ||
      understanding.wantsLightBlue ||
      understanding.wantsCombinedAccountFilter ||
      understanding.wantsFreshLayout;

    if (needsTrustLayout) {
      config.name = understanding.recommendationId ? `AI ${understanding.recommendationId}`.slice(0, 28) : "AI 白标信任首页";
      if (understanding.wantsMatureBrokerTrust || understanding.wantsCombinedAccountFilter) {
        config.pageIntent = normalizePageIntent({ ...(config.pageIntent || {}), primaryIntent: "brand" }, "brand");
      }
      config.layoutPreset = "accountOpsConsole";
      config.designGenome = "accountOpsConsole";
      config.pageStory = "opsClarity";
      config.themePreset = understanding.wantsLightBlue ? "blueFinance" : config.themePreset;
      config.theme = config.themePreset;
      config.density = config.density === "spacious" ? "balanced" : config.density;
      config.personalizationStrength = understanding.wantsFreshLayout ? "strong" : config.personalizationStrength;
      config.heroFocus = "asset_summary";
      config.sections = [
        { id: "trust-hero", type: "hero", title: "资金安全", slots: ["balanceTotal", "openAccountActions"] },
        { id: "wallet-cards", type: "full", title: "钱包列表", slots: ["walletList"] },
        { id: "conversion-tools", type: "split", title: "快捷入口与活动", slots: ["quickActions", "promoHighlight"] },
        { id: "combined-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ];
      mergeModuleVariants(config, {
        AssetOverview: "tickerStrip",
        WalletList: "walletTiles",
        QuickActions: "taskRail",
        PromotionBanner: "splitVisual",
        OpenAccount: "conversionPanel",
        TradingAccounts: "opsTable",
      });
      mergeModuleStyles(config, {
        balanceTotal: "ticker-strip",
        fundActions: "split-buttons",
        adCarousel: "clean",
        walletList: "wallet-tiles",
        quickActions: "task-rail",
        promoHighlight: "scoreboard",
        openAccountActions: "conversion-panel",
        tradingAccounts: "ops-table",
      });
      mergeModuleSettings(config, {
        adCarousel: { enabled: false },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: {
          enabled: true,
          showFundActions: false,
          showAccountBreakdown: true,
          showWalletBreakdown: false,
          showAvailable: true,
          showMargin: true,
          showRiskLevel: true,
          wallets: ["USD", "EUR", "USDT"],
        },
        openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "standalone" },
        promoHighlight: { enabled: true },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true },
      });
      config.brickPlan = [
        { brickId: "assetOverview.tickerStrip", brickName: "资金安全指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏先呈现总余额、可用资金、保证金和风险等级。" },
        { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开户作为主转化，但不做营销页式大横幅。" },
        { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用卡片列表展示，形成资金余额主体。" },
        { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口严格按需求数量呈现，作为轻量工具区。" },
        { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "主推活动降为业务推动卡，不抢资金安全首屏。" },
        { brickId: "tradingAccounts.separatedList", brickName: "合并账号工作台", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实和模拟账号在同一列表，用胶囊筛选区分。" },
      ];
      config.brickTrace = { ...(config.brickTrace || {}), intent: "brand", pageIntent: "brand", strategy: "券商可信契约", score: 96, selectedCount: config.brickPlan.length };
    }

    if (understanding.visibleMetricCount >= 3) {
      mergeModuleSettings(config, {
        wallet: { enabled: true, placement: "standalone" },
        assets: {
          enabled: true,
          showAvailable: true,
          showMargin: true,
          showRiskLevel: true,
          wallets: ["USD", "EUR", "USDT"],
        },
      });
      if (!needsTrustLayout) {
        mergeModuleSettings(config, { riskNotice: { enabled: true } });
        ensureSectionContains(config, { id: "metrics-proof", type: "split", title: "资金指标" }, "riskNotice");
      }
    }

    if (understanding.quickActionCount) {
      const currentActions = config.moduleSettings.quickActions?.actions || [];
      const preferred = understanding.wantsMatureBrokerTrust
        ? ["openReal", "deposit", "transfer", "orders", "contactService"]
        : [];
      mergeModuleSettings(config, {
        quickActions: {
          enabled: true,
          count: understanding.quickActionExact
            ? understanding.quickActionCount
            : Math.max(Number(config.moduleSettings.quickActions?.count || 0), understanding.quickActionCount),
          display: "iconText",
          actions: completeQuickActionIds(currentActions, understanding.quickActionCount, preferred),
        },
      });
      ensureSectionContains(config, { id: "conversion-tools", type: "split", title: "快捷入口与开户" }, "quickActions");
    }

    if (understanding.wantsCombinedAccountFilter) {
      mergeModuleVariants(config, { TradingAccounts: "opsTable" });
      mergeModuleStyles(config, { tradingAccounts: "ops-table" });
      mergeModuleSettings(config, {
        tradingAccounts: {
          enabled: true,
          realEnabled: true,
          demoEnabled: true,
          grouping: "combined",
          viewMode: "list",
          realViewMode: "list",
          demoViewMode: "list",
          demoFirst: false,
        },
      });
      ensureSectionContains(config, { id: "combined-accounts", type: "full", title: "交易账号" }, "tradingAccounts");
    }

    if (understanding.recommendationId) {
      config.compositionStrategy = `${config.compositionStrategy || ""} 推荐编号 ${understanding.recommendationId} 已进入硬约束自检。`.trim();
    }

    config.sections = config.sections
      .map((section) => ({ ...section, slots: uniqueValidSlots(section.slots) }))
      .filter((section) => section.slots.length);
    config.layout = layoutFromSections(config.sections);

    const normalized = normalizeConfig(config);
    if (understanding.quickActionExact && normalized.moduleSettings.quickActions.count !== understanding.quickActionCount) {
      normalized.moduleSettings.quickActions.count = understanding.quickActionCount;
      normalized.moduleSettings.quickActions.actions = completeQuickActionIds(
        normalized.moduleSettings.quickActions.actions,
        understanding.quickActionCount,
      );
    }
    return normalized;
  }

  function pageGovernanceContract(intent) {
    return PAGE_GOVERNANCE_CONTRACTS[intent] || PAGE_GOVERNANCE_CONTRACTS.standard;
  }

  function pageIntentFromConfig(config, prompt = "") {
    const source = config && typeof config === "object" ? config : {};
    const explicit =
      source.pageIntent?.primaryIntent ||
      source.pageIntent?.intent ||
      source.brickTrace?.intent ||
      source.generationIntent ||
      "";
    if (PAGE_GOVERNANCE_CONTRACTS[explicit]) return explicit;
    if (prompt) return inferBrickIntent(prompt);
    return PAGE_GOVERNANCE_CONTRACTS[explicit] ? explicit : "standard";
  }

  function slotVisibleInConfig(config, slot) {
    const sections = Array.isArray(config?.sections) ? config.sections : [];
    const layout = Array.isArray(config?.layout) ? config.layout : [];
    return (
      sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot)) ||
      layout.some((block) => {
        const feature = COMPONENT_STYLE_FEATURE_MAP[block?.component] || COMPONENT_STYLE_FEATURE_MAP[block?.feature] || block?.feature;
        return feature === slot || block?.component === componentFromFeature(slot);
      })
    );
  }

  function featureIndex(config, slot) {
    const sections = Array.isArray(config?.sections) ? config.sections : [];
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const slots = Array.isArray(sections[sectionIndex].slots) ? sections[sectionIndex].slots : [];
      const slotIndex = slots.indexOf(slot);
      if (slotIndex >= 0) return sectionIndex * 10 + slotIndex;
    }
    return 999;
  }

  function hasStandaloneFundActions(config) {
    return slotVisibleInConfig(config, "fundActions");
  }

  function actionSurfaceCount(config, actionId) {
    const settings = config?.moduleSettings || {};
    const aliases = {
      deposit: ["deposit"],
      withdraw: ["withdraw"],
      openReal: ["openReal", "openAccount"],
      openAccount: ["openAccount", "openReal"],
      eventSignup: ["eventSignup", "contest"],
      switchAccount: ["switchAccount"],
    }[actionId] || [actionId];
    let count = 0;

    if (aliases.some((action) => ["deposit", "withdraw"].includes(action)) && hasStandaloneFundActions(config)) count += 1;
    if (aliases.includes("deposit") && settings.assets?.showFundActions && slotVisibleInConfig(config, "balanceTotal") && !hasStandaloneFundActions(config)) count += 1;
    if (aliases.includes("deposit") && settings.wallet?.showFundActions && slotVisibleInConfig(config, "walletBalance") && !hasStandaloneFundActions(config)) count += 1;
    if (aliases.some((action) => ["openReal", "openAccount"].includes(action)) && slotVisibleInConfig(config, "openAccountActions")) count += 1;
    if (aliases.some((action) => ["openReal", "openAccount"].includes(action)) && settings.openAccount?.placement === "insideTradingAccounts" && slotVisibleInConfig(config, "tradingAccounts")) count += 1;

    const quickActions = Array.isArray(settings.quickActions?.actions) ? settings.quickActions.actions : [];
    if (quickActions.some((action) => aliases.includes(typeof action === "string" ? action : action?.id))) count += 1;
    return count;
  }

  function evaluatePageGovernance(config, prompt = "") {
    const intent = pageIntentFromConfig(config, prompt);
    const contract = pageGovernanceContract(intent);
    const understanding = extractHomepageUnderstanding(prompt);
    const checks = [];
    let score = 100;

    function check(id, label, passed, penalty = 8, detail = "") {
      checks.push({ id, label, passed: Boolean(passed), detail });
      if (!passed) score -= penalty;
    }

    const firstScreenOk = contract.firstScreenSlots.some((slot) => slotVisibleInConfig(config, slot));
    const operationOrderOk =
      !contract.operationSlots.length ||
      !contract.accountSlots.length ||
      Math.min(...contract.operationSlots.map((slot) => featureIndex(config, slot))) <= Math.min(...contract.accountSlots.map((slot) => featureIndex(config, slot)));
    const weakSlotsOk = contract.weakSlots.filter((slot) => FEATURES[slot]).filter((slot) => slotVisibleInConfig(config, slot)).length <= 1;
    const primaryActionCount = actionSurfaceCount(config, contract.primaryAction);
    const moduleCount = Array.isArray(config.brickPlan) && config.brickPlan.length ? config.brickPlan.length : (config.sections || []).flatMap((section) => section.slots || []).length;
    const quickSettings = config.moduleSettings?.quickActions || {};
    const quickActionCount = Number(quickSettings.count || 0);
    const quickActionIds = Array.isArray(quickSettings.actions) ? quickSettings.actions.map(quickActionId).filter(Boolean) : [];
    const metricSlots = [
      config.moduleSettings?.assets?.showAvailable,
      config.moduleSettings?.assets?.showMargin,
      config.moduleSettings?.assets?.showRiskLevel,
      Array.isArray(config.moduleSettings?.assets?.wallets) && config.moduleSettings.assets.wallets.length,
      slotVisibleInConfig(config, "walletList"),
      slotVisibleInConfig(config, "balanceTotal"),
    ].filter(Boolean).length;

    check("goal", "页面主目标明确", firstScreenOk, 14, contract.primaryGoal);
    check("cta", "主操作不过度重复", primaryActionCount > 0 && primaryActionCount <= contract.maxPrimaryActionSurfaces, 18, `${contract.primaryAction} 出现 ${primaryActionCount} 处`);
    check("operation-order", "操作区早于账号区", operationOrderOk, 12, "快捷入口和资金动作应在账号长列表前出现");
    check("weak", "低优先级模块已克制", weakSlotsOk, 10, "弱化项不应挤进首屏主线");
    check("density", "模块数量可控", moduleCount <= 8, 10, `当前 ${moduleCount} 个业务积木`);
    if (understanding.quickActionExact) {
      check("quick-count", `快捷入口严格为 ${understanding.quickActionCount} 个`, quickActionCount === understanding.quickActionCount && quickActionIds.length >= understanding.quickActionCount, 16, `当前配置 ${quickActionCount} 个`);
    }
    if (understanding.visibleMetricCount >= 3) {
      check("visible-metrics", "可见数值支撑充分", metricSlots >= 3, 12, `当前指标来源 ${metricSlots} 组`);
    }
    if (understanding.wantsCombinedAccountFilter) {
      check("combined-accounts", "真实和模拟账号合并筛选", config.moduleSettings?.tradingAccounts?.grouping === "combined" && config.moduleSettings?.tradingAccounts?.viewMode === "list", 18, "应使用单列表和胶囊筛选");
    }
    if (understanding.wantsMatureBrokerTrust) {
      check("trust-first", "资金可信先于营销封面", featureIndex(config, "balanceTotal") <= featureIndex(config, "adCarousel"), 16, "白标可信首页不应以广告轮播开场");
    }

    return {
      intent,
      label: contract.label,
      primaryGoal: contract.primaryGoal,
      primaryAction: contract.primaryAction,
      secondaryAction: contract.secondaryAction,
      score: Math.max(0, Math.min(100, score)),
      checks,
      issues: checks.filter((item) => !item.passed).map((item) => item.label),
    };
  }

  function normalizePageIntent(source, fallbackIntent) {
    const pageIntent = source && typeof source === "object" ? source : {};
    const primaryIntent = PAGE_GOVERNANCE_CONTRACTS[pageIntent.primaryIntent] ? pageIntent.primaryIntent : fallbackIntent;
    const contract = pageGovernanceContract(primaryIntent);
    return {
      ...pageIntent,
      primaryIntent,
      label: cleanMetaText(pageIntent.label, contract.label, 40),
      primaryGoal: cleanMetaText(pageIntent.primaryGoal, contract.primaryGoal, 120),
      governance: {
        primaryAction: contract.primaryAction,
        secondaryAction: contract.secondaryAction,
        firstScreenSlots: contract.firstScreenSlots.slice(),
        operationSlots: contract.operationSlots.slice(),
        accountSlots: contract.accountSlots.slice(),
        weakSlots: contract.weakSlots.slice(),
        maxPrimaryActionSurfaces: contract.maxPrimaryActionSurfaces,
      },
    };
  }

  function depositGovernedBrickPlan() {
    return [
      { brickId: "promoBanner.depositLadder", brickName: "入金奖励阶梯", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x2", zone: "hero", reason: "首屏左侧突出 $500/$2,000/$10,000 三档奖励和最高赠金 $300。" },
      { brickId: "walletBalance.currencyRail", brickName: "钱包币种侧栏", family: "WalletBalance", feature: "walletBalance", component: "wallet_balance", size: "1x1", zone: "rail", reason: "右侧给出钱包余额，解释当前入金上下文。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "主入金动作只在首屏操作区放大一次。" },
      { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开真实账号作为入金前置动作，而不是散落在页面各处。" },
      { brickId: "quickActions.taskRail", brickName: "快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口紧跟首屏，承接转账、订单、持仓和客服，不重复主入金按钮。" },
      { brickId: "accountPerformance.proChart", brickName: "账号轻趋势", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "main", reason: "账号区保留轻量趋势，复杂图表下移并降噪。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "full", reason: "账号信息作为整栏证明区承接，不抢首屏入金主线。" },
    ];
  }

  function applyPageGovernanceRules(config, source = {}) {
    const intent = pageIntentFromConfig({ ...config, pageIntent: source.pageIntent || config.pageIntent }, source.sourcePrompt || "");
    const contract = pageGovernanceContract(intent);
    const next = config;

    next.pageIntent = normalizePageIntent(source.pageIntent || next.pageIntent, intent);

	    if (intent === "deposit") {
	      next.name = includesAny(String(next.name || ""), ["入金", "奖励"]) ? next.name : "入金奖励阶梯首页";
	      next.layoutPreset = "conversionFirst";
      next.designGenome = "depositLadder";
      next.pageStory = "depositConversion";
      next.heroFocus = "promo_banner";
      next.modules = {
        ...next.modules,
        PromotionBanner: { variant: "depositLadder" },
        WalletBalance: { variant: "splitCurrency" },
        FundActions: { variant: "splitButtons" },
        OpenAccount: { variant: "conversionPanel" },
        QuickActions: { variant: "taskRail" },
        AccountPerformance: { variant: "cleanSnapshot" },
        TradingAccounts: { variant: "accountWall" },
      };
      next.moduleStyles = {
        ...syncLegacyModuleStyles(next.modules),
        ...next.moduleStyles,
        promoHighlight: "deposit-ladder",
        walletBalance: "wallet-strip",
        fundActions: "split-buttons",
        openAccountActions: "conversion-panel",
        quickActions: "task-rail",
        accountPerformance: "pro-chart",
        tradingAccounts: "account-wall",
      };
      next.moduleSettings = normalizeModuleSettings(mergeSettingsObject(next.moduleSettings, {
        adCarousel: { enabled: true },
        quickActions: { enabled: true, count: 4, display: "iconText", actions: contract.forcedQuickActions || ["transfer", "orders", "positions", "contactService"] },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: { enabled: false, showFundActions: true, showAccountBreakdown: false, showWalletBreakdown: false, showAvailable: false, showMargin: false, showRiskLevel: false, wallets: [] },
        referral: { enabled: false },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: false, grouping: "combined", viewMode: "card", realViewMode: "card", demoViewMode: "list" },
        openAccount: { enabled: true, real: true, demo: false, bind: false, placement: "standalone" },
        riskNotice: { enabled: false },
      }));
      next.sections = [
        { id: "deposit-hero", type: "hero", title: "入金奖励", slots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"] },
        { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quickActions"] },
        { id: "deposit-accounts", type: "full", title: "账号与趋势", slots: ["accountPerformance", "tradingAccounts"] },
      ];
      next.brickPlan = depositGovernedBrickPlan();
      next.layout = enforceHomepageLayoutSafety(
        applyBrickMetadataToLayout(normalizeHomepageLayout(layoutFromSections(next.sections), next.sections).layout, next.brickPlan, next.modules),
        next.moduleSettings,
      );
	      next.emphasis = { ...next.emphasis, deposit: "high", openAccount: "high", promo: "high", accounts: "medium" };
	      next.aiSummary = "已按入金转化契约重排：首屏奖励阶梯、钱包余额、唯一主入金入口和开真实账号。";
	    }

    if (intent === "brand") {
      next.name = includesAny(String(next.name || ""), ["白标", "可信", "信任"]) ? next.name : "白标资金可信首页";
      next.layoutPreset = "accountOpsConsole";
      next.designGenome = "accountOpsConsole";
      next.pageStory = "opsClarity";
      next.themePreset = "blueFinance";
      next.theme = "blueFinance";
      next.density = next.density === "spacious" ? "balanced" : next.density || "balanced";
      next.personalizationStrength = "strong";
      next.heroFocus = "asset_summary";
      next.modules = {
        ...next.modules,
        AssetOverview: { variant: "tickerStrip" },
        WalletList: { variant: "walletTiles" },
        QuickActions: { variant: "taskRail" },
        PromotionBanner: { variant: "splitVisual" },
        OpenAccount: { variant: "conversionPanel" },
        TradingAccounts: { variant: "opsTable" },
      };
      next.moduleStyles = {
        ...syncLegacyModuleStyles(next.modules),
        ...next.moduleStyles,
        balanceTotal: "ticker-strip",
        adCarousel: "clean",
        walletList: "wallet-tiles",
        quickActions: "task-rail",
        promoHighlight: "scoreboard",
        openAccountActions: "conversion-panel",
        tradingAccounts: "ops-table",
      };
      next.moduleSettings = normalizeModuleSettings(mergeSettingsObject(next.moduleSettings, {
        adCarousel: { enabled: false },
        quickActions: { enabled: true, count: 5, display: "iconText", actions: ["openReal", "deposit", "transfer", "orders", "contactService"] },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: { enabled: true, showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: false, showAvailable: true, showMargin: true, showRiskLevel: true, wallets: ["USD", "EUR", "USDT"] },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list", demoFirst: false },
        openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "standalone" },
        promoHighlight: { enabled: true },
        referral: { enabled: false },
        riskNotice: { enabled: false },
      }));
      next.sections = [
        { id: "trust-hero", type: "hero", title: "资金安全", slots: ["balanceTotal", "openAccountActions"] },
        { id: "wallet-cards", type: "full", title: "钱包列表", slots: ["walletList"] },
        { id: "conversion-tools", type: "split", title: "快捷入口与活动", slots: ["quickActions", "promoHighlight"] },
        { id: "combined-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ];
      next.brickPlan = [
        { brickId: "assetOverview.tickerStrip", brickName: "资金安全指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏先呈现总余额、可用资金、保证金和风险等级。" },
        { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开户作为主转化，但不做营销页式大横幅。" },
        { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用卡片列表展示，形成资金余额主体。" },
        { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口严格按需求数量呈现，作为轻量工具区。" },
        { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "主推活动降为业务推动卡，不抢资金安全首屏。" },
        { brickId: "tradingAccounts.separatedList", brickName: "合并账号工作台", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实和模拟账号在同一列表，用胶囊筛选区分。" },
      ];
      next.brickTrace = { ...next.brickTrace, intent: "brand", pageIntent: "brand", strategy: "券商可信契约", score: 96, selectedCount: next.brickPlan.length };
      next.layout = enforceHomepageLayoutSafety(
        applyBrickMetadataToLayout(normalizeHomepageLayout(layoutFromSections(next.sections), next.sections).layout, next.brickPlan, next.modules),
        next.moduleSettings,
      );
      next.aiSummary = "已按券商可信契约重排：资金安全与余额首屏，钱包、五项快捷入口、活动和开户转化下接。";
    }

    if (intent === "growth") {
      next.moduleSettings = prioritizeQuickActions(next.moduleSettings, ["eventSignup", "deposit", "contest", "contactService"], { count: 4, display: "iconText" });
    }

    if (intent === "trader") {
      next.moduleSettings = prioritizeQuickActions(next.moduleSettings, ["switchAccount", "positions", "orders", "downloadMt5", "risk", "deposit"], { count: 6, display: "iconOnly" });
    }
    if (hasStandaloneFundActions(next)) {
      next.moduleSettings.wallet.showFundActions = false;
    }

    next.pageGovernance = evaluatePageGovernance(next, source.sourcePrompt || "");
    return next;
  }

  function hashText(value) {
    return String(value || "")
      .split("")
      .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  }

	  function positiveIntentText(prompt) {
	    let source = String(prompt || "");
    [
      "不要广告模块",
      "不要广告",
      "不需要广告",
      "隐藏广告",
      "弱化广告",
	      "不要轮播",
	      "不需要轮播",
	      "弱化复杂图表",
	      "不要复杂图表",
	      "不需要复杂图表",
	      "不要邀请模块",
      "不要邀请",
      "不需要邀请",
      "隐藏邀请",
      "弱化邀请",
      "不要推荐",
    ].forEach((phrase) => {
      source = source.split(phrase).join("");
    });

	    return source.toLowerCase() + source;
	  }

	  function dominantPromptText(prompt) {
	    const source = String(prompt || "");
	    const matches = [...source.matchAll(/(?:生成方向|独立生成目标|当前目标|目标场景)\s*[:：]\s*([^。；;\n]+)/g)];
	    if (matches.length) return matches[matches.length - 1][1];
	    return source;
	  }

  function cleanMetaText(value, fallback = "", limit = 180) {
    return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function brickById(id) {
    return HOME_BRICKS.find((brick) => brick.id === id) || null;
  }

	  function inferBrickIntent(prompt) {
	    const text = positiveIntentText(dominantPromptText(prompt));
	    const strongAssetIntent = includesAny(text, ["资产管理", "总资产", "多币种", "钱包列表", "资产配置", "可用资金", "保证金占用", "风险等级", "账户资产", "账号资产"]);
	    const brandTrustIntent = includesAny(text, ["白标", "品牌可信", "品牌露出", "成熟券商", "资金安全", "可信", "信任"]);
	    const explicitNewUserIntent = includesAny(text, ["新手", "新客", "刚注册", "未完成实名", "未实名", "kyc"]);

	    if (includesAny(text, ["ib", "代理", "渠道", "邀请", "推荐", "裂变", "开户链接"])) return "partner";
	    if (includesAny(text, ["入金转化", "首存", "充值", "首次入金", "完成首次入金"])) return "deposit";
	    if (brandTrustIntent && !explicitNewUserIntent) return "brand";
	    if (includesAny(text, ["新手", "新客", "开户", "注册", "kyc", "首次", "开户表单", "创建账户"])) return "onboarding";
	    if (includesAny(text, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) return "vip";
	    if (includesAny(text, ["数据洞察", "洞察首页", "账户健康", "健康度", "资金流向", "交易习惯", "分析首页"])) return "insight";
	    if (includesAny(text, ["风险提醒", "风控", "保证金状态", "持仓提醒", "资金保护", "风险保护"])) return "risk";
	    if (includesAny(text, ["留存", "召回", "沉睡", "唤醒", "重新开始交易"])) return "retention";
	    if (includesAny(text, ["移动端", "手机", "单列", "少滚动", "移动优先"])) return "mobile";
	    if (includesAny(text, ["白标", "品牌可信", "品牌露出", "成熟券商", "客户经理服务"])) return "brand";
	    if (includesAny(text, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化", "推广", "广告", "轮播", "banner"])) return "growth";
	    if (strongAssetIntent) return "asset";
    if (includesAny(text, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账号首屏", "账户首屏", "pnl"])) return "trader";
    if (includesAny(text, ["钱包列表", "资产优先", "资产", "钱包", "余额", "资金安全", "资金优先"])) return "asset";

    return "standard";
  }

  function mergeSettingsObject(base, updates) {
    const next = clone(base || {});

    Object.keys(updates || {}).forEach((group) => {
      next[group] = {
        ...(next[group] && typeof next[group] === "object" ? next[group] : {}),
        ...(updates[group] && typeof updates[group] === "object" ? updates[group] : {}),
      };
    });

    return next;
  }

  function quickActionId(action) {
    return typeof action === "string" ? action : action?.id;
  }

  function prioritizeQuickActions(settings, priorityIds, options = {}) {
    const quickActions = settings?.quickActions && typeof settings.quickActions === "object" ? settings.quickActions : {};
    const currentIds = Array.isArray(quickActions.actions) ? quickActions.actions.map(quickActionId).filter(Boolean) : [];
    const actions = [...new Set(priorityIds.concat(currentIds))].slice(0, MAX_QUICK_ACTIONS);

    return normalizeModuleSettings(
      mergeSettingsObject(settings, {
        quickActions: {
          enabled: true,
          count: Math.max(Number(quickActions.count || 0), options.count || actions.length),
          display: options.display || quickActions.display || "iconText",
          actions,
        },
      }),
    );
  }

  function addBrickId(ids, id, mode = "append") {
    if (!brickById(id) || ids.includes(id)) return ids;
    return mode === "front" ? [id].concat(ids) : ids.concat(id);
  }

  function removeBrickFamily(ids, families) {
    const familySet = new Set(families);
    return ids.filter((id) => {
      const brick = brickById(id);
      return brick && !familySet.has(brick.family);
    });
  }

	  function applyPromptBrickOverrides(ids, prompt) {
	    const text = positiveIntentText(dominantPromptText(prompt));
	    const targetIntent = inferBrickIntent(prompt);
	    const wantsAssetManagement = targetIntent === "asset";
	    let next = ids.slice();

    if (wantsAssetManagement) {
      next = removeBrickFamily(next, ["AssetOverview", "PromotionBanner", "ReferralLink", "OnboardingProgress", "OpenAccount", "CreateAccountForm"]);
      next = addBrickId(next, "assetOverview.assetCommand", "front");
      next = addBrickId(next, "walletList.currencyTable");
      next = addBrickId(next, "accountPerformance.proChart");
      next = addBrickId(next, "riskNotice.marginGuard");
    }

    if (includesAny(text, ["广告", "轮播", "banner", "焦点图", "广告图", "广告位"])) {
      next = addBrickId(next, "adCarousel.heroCampaign", "front");
    }

    if (includesAny(text, ["交易大赛", "大赛", "奖池", "活动看板", "比赛看板"])) {
      next = addBrickId(next, "promoBanner.scoreboard");
    }

	    if (wantsReferralLinkCardPrompt(prompt)) {
	      next = removeBrickFamily(next, ["ReferralLink"]);
	      next = addBrickId(next, "referralLinkCard.compact");
	    }

    if (includesAny(text, ["钱包列表", "多币种钱包", "wallet list"])) {
      next = addBrickId(next, "walletList.currencyTable");
    }

    if (includesAny(text, ["钱包余额", "钱包摘要", "钱包侧栏", "wallet balance"])) {
      next = addBrickId(next, "walletBalance.currencyRail");
    }

    if (includesAny(text, ["开户表单", "创建账户", "创建真实账户", "create account"])) {
      next = addBrickId(next, "createAccountForm.realAccount", "front");
      next = addBrickId(next, "openAccount.sidePanel", "front");
    }

	    if (includesAny(text, ["账号表现", "账户表现", "pnl", "权益曲线", "图表", "交易图表"])) {
	      next = addBrickId(next, "accountPerformance.proChart", "front");
	    }

	    if (includesAny(text, ["数据洞察", "账户健康", "健康度", "资金流向", "交易习惯", "分析首页"])) {
	      next = removeBrickFamily(next, ["PromotionBanner", "ReferralLink", "OnboardingProgress", "OpenAccount", "CreateAccountForm"]);
	      next = addBrickId(next, "accountPerformance.proChart", "front");
	      next = addBrickId(next, "marketInsight.healthPanel");
	      next = addBrickId(next, "riskNotice.marginGuard");
	    }

	    if (includesAny(text, ["风险提醒", "风控", "保证金状态", "持仓提醒", "资金保护", "风险保护"])) {
	      next = removeBrickFamily(next, ["PromotionBanner", "ReferralLink", "OnboardingProgress", "OpenAccount", "CreateAccountForm"]);
	      next = addBrickId(next, "accountPerformance.proChart", "front");
	      next = addBrickId(next, "riskNotice.marginGuard");
	      next = addBrickId(next, "marketInsight.healthPanel");
	      next = addBrickId(next, "userKycRail.profileWallet");
	    }

	    if (includesAny(text, ["入金转化", "首存", "充值", "首次入金", "完成首次入金"])) {
	      next = removeBrickFamily(next, ["AssetOverview", "OnboardingProgress", "CreateAccountForm", "ReferralLink", "PromotionBanner"]);
	      next = addBrickId(next, "promoBanner.depositLadder", "front");
	      next = addBrickId(next, "walletBalance.currencyRail");
	      next = addBrickId(next, "fundActions.priorityDock");
	      next = addBrickId(next, "openAccount.conversionPanel");
	      next = addBrickId(next, "quickActions.taskRail");
	    }

    if (includesAny(text, ["kyc", "用户信息", "用户侧栏", "右侧信息", "状态侧栏"])) {
      next = addBrickId(next, "userKycRail.profileWallet");
    }

    if (includesAny(text, ["真实账号", "模拟账号", "live", "demo", "两个列表", "分开", "列表"])) {
      next = removeBrickFamily(next, ["TradingAccounts"]);
      next = addBrickId(next, "tradingAccounts.separatedList");
    }

    if (includesAny(text, ["首屏核心", "独占", "整栏", "一整栏", "首屏大横幅"]) && includesAny(text, ["广告", "轮播", "banner", "交易大赛", "大赛"])) {
      if (!includesAny(text, ["推广链接", "邀请链接", "开户链接", "注册链接", "邀请码", "referral"])) {
        next = removeBrickFamily(next, ["ReferralLink"]);
      }
      if (!includesAny(text, ["活动看板", "赛事看板", "单独看板"])) {
        next = removeBrickFamily(next, ["PromotionBanner"]);
        next = addBrickId(next, "adCarousel.heroCampaign", "front");
      }
      if (!includesAny(text, ["资金dock", "资金操作", "入金出金独立", "入金出金模块"])) {
        next = removeBrickFamily(next, ["FundActions"]);
      }
    }

    if (includesAny(String(prompt || ""), ["不要广告模块", "不要广告", "不需要广告", "隐藏广告", "弱化广告", "不要轮播", "不需要轮播"])) {
      next = removeBrickFamily(next, ["PromotionBanner"]);
    }

    if (includesAny(String(prompt || ""), ["不要邀请模块", "不要邀请", "不需要邀请", "隐藏邀请", "弱化邀请", "不要推荐"])) {
      next = removeBrickFamily(next, ["ReferralLink"]);
    }

    if (includesAny(String(prompt || ""), ["不要开户", "不需要开户", "隐藏开户"])) {
      next = removeBrickFamily(next, ["OpenAccount", "OnboardingProgress", "CreateAccountForm"]);
    }

    return next;
  }

	  function rotateBrickIds(ids, variant) {
	    const count = Number(variant || 0);
	    if (!ids.length || !count) return ids;
	    const first = ids[0];
	    const rest = ids.slice(1);
	    const offset = Math.abs(count) % Math.max(rest.length, 1);
	    return [first].concat(rest.slice(offset), rest.slice(0, offset));
	  }

	  function sortBrickPlanByFeature(plan, featureOrder) {
	    const order = new Map(featureOrder.map((feature, index) => [feature, index]));
	    return plan
	      .slice()
	      .sort((a, b) => (order.has(a.feature) ? order.get(a.feature) : 99) - (order.has(b.feature) ? order.get(b.feature) : 99));
	  }

	  function applyBrickPlanZones(plan, zoneMap) {
	    return plan.map((item) => ({
	      ...item,
	      zone: zoneMap[item.feature] || item.zone,
	    }));
	  }

  function variantMode(variant) {
    return Math.abs(Number(variant || 0)) % 3;
  }

  const GENOME_ROTATION = {
    standard: ["accountOpsConsole", "magazineCampaign", "tradingCommand", "onboardingJourney"],
    asset: ["accountOpsConsole", "tradingCommand", "privateWealthDesk"],
    vip: ["privateWealthDesk", "magazineCampaign", "accountOpsConsole"],
    trader: ["tradingCommand", "accountOpsConsole", "magazineCampaign"],
    insight: ["tradingCommand", "accountOpsConsole"],
    risk: ["tradingCommand", "accountOpsConsole"],
    onboarding: ["onboardingJourney", "accountOpsConsole", "magazineCampaign"],
    deposit: ["depositLadder", "onboardingJourney", "accountOpsConsole"],
    growth: ["magazineCampaign", "onboardingJourney", "accountOpsConsole"],
    partner: ["magazineCampaign", "onboardingJourney", "accountOpsConsole"],
    retention: ["onboardingJourney", "accountOpsConsole"],
    mobile: ["accountOpsConsole", "onboardingJourney"],
    brand: ["accountOpsConsole", "privateWealthDesk", "magazineCampaign"],
  };

  function selectDesignGenome(prompt, intent, variant = 0) {
    const text = positiveIntentText(dominantPromptText(prompt));
    if (includesAny(text, ["杂志", "封面", "专题", "大视觉", "大图", "campaign cover"])) return DESIGN_GENOMES.magazineCampaign;
    if (includesAny(text, ["指挥中心", "命令中心", "专业交易", "交易终端", "command center"])) return DESIGN_GENOMES.tradingCommand;
    if (includesAny(text, ["旅程", "路径", "下一步", "任务流", "onboarding journey"])) return DESIGN_GENOMES.onboardingJourney;
    if (includesAny(text, ["私行", "客户经理", "专属服务", "wealth desk"])) return DESIGN_GENOMES.privateWealthDesk;
    if (includesAny(text, ["运营控制台", "账户运营", "管理台", "ops console"])) return DESIGN_GENOMES.accountOpsConsole;

    const rotation = GENOME_ROTATION[intent] || ["accountOpsConsole"];
    const index = Math.abs(Number(variant || 0)) % rotation.length;
    return DESIGN_GENOMES[rotation[index]] || DESIGN_GENOMES.accountOpsConsole;
  }

  function applyDesignGenomeBrickIds(ids, genome, prompt) {
    const text = positiveIntentText(prompt);
    let next = ids.slice();

    (genome?.requiredBricks || []).forEach((id, index) => {
      const brick = brickById(id);
      if (brick?.component) {
        next = next.filter((existingId) => brickById(existingId)?.component !== brick.component);
      }
      next = addBrickId(next, id, index === 0 ? "front" : "append");
    });

    if (genome?.id === "magazineCampaign" && !includesAny(text, ["推广链接", "邀请链接", "开户链接", "注册链接", "邀请码", "referral"])) {
      next = removeBrickFamily(next, ["ReferralLink"]);
    }

    if (genome?.id === "tradingCommand") {
      next = addBrickId(next, "riskNotice.marginGuard");
    }

    if (genome?.id === "accountOpsConsole" && includesAny(text, ["资产", "钱包", "多币种", "运营", "管理"])) {
      next = addBrickId(next, "riskNotice.marginGuard");
    }

    return next;
  }

  function applyBrickPlanVariant(plan, intent, variant) {
	    const mode = variantMode(variant);
	    if (!mode) return plan;

	    if (intent === "asset" && mode === 1) {
	      return applyBrickPlanZones(sortBrickPlanByFeature(plan, ["accountPerformance", "riskNotice", "balanceTotal", "fundActions", "walletList", "tradingAccounts"]), {
	        accountPerformance: "hero",
	        riskNotice: "rail",
	        balanceTotal: "main",
	        fundActions: "rail",
	        walletList: "full",
	        tradingAccounts: "full",
	      });
	    }

	    if (intent === "asset" && mode === 2) {
	      return applyBrickPlanZones(sortBrickPlanByFeature(plan, ["walletList", "balanceTotal", "fundActions", "accountPerformance", "riskNotice", "tradingAccounts"]), {
	        walletList: "full",
	        balanceTotal: "main",
	        fundActions: "rail",
	        accountPerformance: "main",
	        riskNotice: "rail",
	        tradingAccounts: "full",
	      });
	    }

    return plan;
  }

  function applyDesignGenomeToPlan(plan, genome) {
    const story = PAGE_STORIES[genome?.story] || PAGE_STORIES.opsClarity;
    const ordered = sortBrickPlanByFeature(plan, story.featureOrder || []);
    return applyBrickPlanZones(ordered, story.zoneMap || {});
  }

	  function brickVariantMeta(strategy, intent, variant) {
	    const mode = variantMode(variant);
	    if (!mode) return strategy;

	    const variants = {
	      asset: [
	        null,
	        { label: "资产洞察并列版", layoutPreset: "tradingPro", density: "compact", summary: "先看账户表现和风险，再回到资产和钱包管理。" },
	        { label: "钱包管理全景版", layoutPreset: "assetFirst", density: "spacious", summary: "多币种钱包独占首个业务区，资产和表现图表向下承接。" },
	      ],
	    };

	    return {
	      ...strategy,
	      ...(variants[intent]?.[mode] || {}),
	    };
	  }

	  function uniqueBricksForLayout(ids, intent = "standard", prompt = "") {
    const seenComponents = new Set();
    const selected = [];

    ids.forEach((id) => {
      const brick = brickById(id);
      if (!brick || seenComponents.has(brick.component)) return;
      seenComponents.add(brick.component);
      selected.push(brick);
    });

    if (!selected.some((brick) => brick.family === "AssetOverview") && intent !== "deposit" && !isCampaignCorePrompt(prompt, intent)) {
      const fallbackAsset = brickById("assetOverview.compactMetrics");
      if (["growth", "partner"].includes(intent)) {
        selected.splice(Math.min(selected.length, 3), 0, fallbackAsset);
      } else {
        selected.unshift(fallbackAsset);
      }
    }
    if (!selected.some((brick) => brick.family === "TradingAccounts")) selected.push(brickById("tradingAccounts.separatedList"));
    if (!selected.some((brick) => brick.family === "FundActions") && !isCampaignCorePrompt(prompt, intent)) {
      selected.splice(1, 0, brickById("fundActions.priorityDock"));
    }

    return selected.filter(Boolean).slice(0, CANONICAL_HOME_BLOCKS.length);
  }

  function isCampaignCorePrompt(prompt, intent) {
    if (intent !== "growth") return false;
    const text = positiveIntentText(prompt);
    return includesAny(text, ["首屏核心", "独占", "整栏", "一整栏", "单独一个长模块", "长模块", "首屏大横幅", "广告首屏", "轮播首屏", "banner首屏"]);
  }

  function wantsReferralLinkCardPrompt(prompt) {
    const source = String(prompt || "");
    const text = positiveIntentText(dominantPromptText(prompt));
    const hasIbIdentity = /(^|[^a-z])ib([^a-z]|$)/i.test(source);
    return (
      hasIbIdentity ||
      includesAny(text, ["代理用户", "代理首页", "合作伙伴", "partner", "affiliate", "推广链接", "推广功能", "邀请链接", "邀请码", "开户链接", "注册链接", "referral"])
    );
  }

  function wantsReferralStatsPrompt(prompt) {
    const text = positiveIntentText(dominantPromptText(prompt));
    return includesAny(text, ["打开数", "注册数", "开户数", "注册转化率", "开户转化率", "转化率", "推广效果", "基础统计", "统计数据"]);
  }

  function wantsReferralCoreOnlyPrompt(prompt) {
    const source = String(prompt || "");
    return /(只|仅|只展示|仅展示).{0,16}(推广链接|邀请链接).{0,16}(邀请码)|不展示.{0,8}(统计|打开数|注册数|开户数|转化率)/.test(source);
  }

  function themePresetForPrompt(strategy, prompt, intent) {
    const text = positiveIntentText(prompt);
    if (includesAny(text, ["极简白", "极简", "白色", "minimal"])) return "minimalWhite";
    if (includesAny(text, ["黑金", "高净值", "vip", "尊贵", "机构", "大客户"])) return "blackGold";
    if (includesAny(text, ["淡金", "浅金", "轻金", "香槟金", "金色", "金色调", "gold"])) return "lightGold";
    if (intent === "growth" && includesAny(text, ["轻快", "清晰", "清爽", "明亮", "浅色", "轻量"])) return "blueFinance";
    return strategy.themePreset;
  }

  function brickZoneFor(brick, index, prompt) {
    const text = positiveIntentText(prompt);
    const campaignCore = isCampaignCorePrompt(prompt, inferBrickIntent(prompt));
    if (campaignCore) {
      if (brick.feature === "adCarousel") return "hero";
      if (brick.feature === "referralLink") return "full";
      if (brick.family === "AssetOverview") return "main";
    }
    if (includesAny(text, ["交易账号放下方", "账号放下方", "列表放下方"]) && brick.family === "TradingAccounts") return "full";
    if (includesAny(text, ["广告首屏", "轮播首屏", "banner首屏"]) && brick.feature === "adCarousel") return "hero";
    if (index === 0) return "hero";
    return brick.defaultZone || "main";
  }

  function slotFromBrickZone(zone, component) {
    if (zone === "rail") return "rail";
    if (zone === "hero") return "hero";
    if (zone === "full") return "full";
    return slotFromSectionType("full", component);
  }

  function priorityForBrick(zone, index) {
    return 20 + index * 10;
  }

  function spanFromBrickSize(size) {
    const normalized = String(size || "").trim().toLowerCase();
    if (/^3x[12]$/.test(normalized)) return 12;
    if (/^2x[12]$/.test(normalized)) return 8;
    if (/^1x[12]$/.test(normalized)) return 4;
    return 0;
  }

  function accountListNeedsFullRow(moduleSettings) {
    const settings = moduleSettings?.tradingAccounts || DEFAULT_MODULE_SETTINGS.tradingAccounts;
    return settings.grouping === "separated" || settings.viewMode === "list";
  }

  function layoutBlockWithBrick(block, brickId, slot, reason) {
    const brick = brickById(brickId);
    if (!brick) return { ...block, slot: slot || block.slot };

    return {
      ...block,
      slot: slot || brick.defaultZone || block.slot,
      brickId: brick.id,
      brickName: brick.name,
      brickFamily: brick.family,
      brickSize: brick.size,
      brickZone: brick.defaultZone || slot || block.brickZone,
      brickReason: reason || block.brickReason || brick.reason,
    };
  }

  function brickPlanItemWithBrick(item, brickId, zone, reason) {
    const brick = brickById(brickId);
    if (!brick) return { ...item, zone: zone || item.zone };

    return {
      ...item,
      brickId: brick.id,
      brickName: brick.name,
      family: brick.family,
      feature: brick.feature,
      component: brick.component,
      size: brick.size,
      zone: zone || brick.defaultZone || item.zone,
      reason: reason || item.reason || brick.reason,
    };
  }

  function enforceLayoutBlockGeometry(block, moduleSettings) {
    const component = block.component;
    const size = String(block.brickSize || "").toLowerCase();
    const quickCount = Number(moduleSettings?.quickActions?.count || 0);

    if (component === "account_list") {
      if (accountListNeedsFullRow(moduleSettings)) {
        return layoutBlockWithBrick(block, "tradingAccounts.separatedList", "full", "账号分区或列表视图强制整行，避免表格压缩和侧栏留白。");
      }

      if (/^1x/.test(size) || block.slot === "rail") {
        return layoutBlockWithBrick(block, "tradingAccounts.cardProof", "main", "账号卡片至少使用主栏高模块，避免挤入窄侧栏。");
      }
    }

    if (component === "wallet_list") {
      const walletBrick = block.brickId === "walletList.tiles" ? "walletList.tiles" : "walletList.currencyTable";
      return layoutBlockWithBrick(block, walletBrick, "full", "钱包列表属于多币种内容，强制整行展示。");
    }

    if (component === "quick_actions" && quickCount >= 8 && (/^1x/.test(size) || block.slot === "rail")) {
      return layoutBlockWithBrick(block, "quickActions.priorityMatrix", "main", "8 个快捷入口使用主栏矩阵，避免侧栏拥挤。");
    }

    if (component === "ad_carousel" && (/^1x/.test(size) || block.slot === "rail")) {
      return layoutBlockWithBrick(block, "adCarousel.heroCampaign", "hero", "广告轮播至少使用主视觉宽度，避免侧栏裁切。");
    }

    if (component === "account_performance" && /^1x/.test(size)) {
      return layoutBlockWithBrick(block, "accountPerformance.proChart", "main", "账号表现图表需要主栏宽度承载趋势信息。");
    }

    return block;
  }

  function enforceHomepageLayoutSafety(layout, moduleSettings) {
    return layout.map((block) => enforceLayoutBlockGeometry(block, moduleSettings));
  }

  function enforceBrickPlanSafety(plan, moduleSettings) {
    const quickCount = Number(moduleSettings?.quickActions?.count || 0);

    return plan.map((item) => {
      const size = String(item.size || "").toLowerCase();

      if (item.component === "account_list") {
        if (accountListNeedsFullRow(moduleSettings)) {
          return brickPlanItemWithBrick(item, "tradingAccounts.separatedList", "full", "账号分区或列表视图强制整行，避免表格压缩和侧栏留白。");
        }

        if (/^1x/.test(size) || item.zone === "rail") {
          return brickPlanItemWithBrick(item, "tradingAccounts.cardProof", "main", "账号卡片至少使用主栏高模块，避免挤入窄侧栏。");
        }
      }

      if (item.component === "wallet_list") {
        const walletBrick = item.brickId === "walletList.tiles" ? "walletList.tiles" : "walletList.currencyTable";
        return brickPlanItemWithBrick(item, walletBrick, "full", "钱包列表属于多币种内容，强制整行展示。");
      }

      if (item.component === "quick_actions" && quickCount >= 8 && (/^1x/.test(size) || item.zone === "rail")) {
        return brickPlanItemWithBrick(item, "quickActions.priorityMatrix", "main", "8 个快捷入口使用主栏矩阵，避免侧栏拥挤。");
      }

      if (item.component === "ad_carousel" && (/^1x/.test(size) || item.zone === "rail")) {
        return brickPlanItemWithBrick(item, "adCarousel.heroCampaign", "hero", "广告轮播至少使用主视觉宽度，避免侧栏裁切。");
      }

      if (item.component === "account_performance" && /^1x/.test(size)) {
        return brickPlanItemWithBrick(item, "accountPerformance.proChart", "main", "账号表现图表需要主栏宽度承载趋势信息。");
      }

      return item;
    });
  }

  function layoutSpanForBlock(block, heroBlockCount = 0) {
    if (block.component === "welcome_header") return 12;

    const sizeSpan = spanFromBrickSize(block.brickSize);
    if (block.slot === "full") return 12;
    if (block.slot === "rail") return Math.min(sizeSpan || 4, 4);
    if (block.slot === "main") return sizeSpan || 8;
    if (block.slot === "hero") {
      if (heroBlockCount > 1 && sizeSpan && sizeSpan < 12) return sizeSpan;
      return sizeSpan || 12;
    }

    return LAYOUT_SLOT_SPANS[block.slot] || 12;
  }

  function isHomepageFullRowBlock(block) {
    if (block.component === "welcome_header") return true;
    return ["account_list", "trading_accounts_list"].includes(block.component) && /^3x/i.test(String(block.brickSize || ""));
  }

  function isHomepageCompactBlock(block) {
    return ["quick_actions", "onboarding_guide", "pamm_products", "copytrading_signals", "referral_link_card", "announcements", "market_news", "fund_actions", "wallet_balance", "open_account_panel", "user_kyc_rail", "create_account_form", "market_insight", "risk_notice", "copytrading_summary"].includes(block.component);
  }

  function canPairHomepageBlocks(first, second, heroBlockCount = 0) {
    if (!first || !second) return false;
    if (isHomepageFullRowBlock(first) || isHomepageFullRowBlock(second)) return false;
    if (first.component === second.component) return false;
    if (layoutSpanForBlock(first, heroBlockCount) >= 12 || layoutSpanForBlock(second, heroBlockCount) >= 12) return false;
    return true;
  }

  function pairedHomepageSpans(first, second, heroBlockCount = 0) {
    const firstIsRail = first.slot === "rail" || isHomepageCompactBlock(first);
    const secondIsRail = second.slot === "rail" || isHomepageCompactBlock(second);
    const firstBase = layoutSpanForBlock(first, heroBlockCount);
    const secondBase = layoutSpanForBlock(second, heroBlockCount);

    if (firstIsRail && !secondIsRail) return [4, 8];
    if (!firstIsRail && secondIsRail) return [8, 4];
    if (firstBase === 4 && secondBase !== 4) return [4, 8];
    if (firstBase !== 4 && secondBase === 4) return [8, 4];
    return [6, 6];
  }

  function rowMinHeightForBlocks(blocks) {
    const components = new Set(blocks.map((block) => block.component));
    const sizes = new Set(blocks.map((block) => String(block.brickSize || "").toLowerCase()));

    if (components.has("ad_carousel")) return 260;
    if (components.has("trading_accounts_list") || components.has("wallet_list") || components.has("account_performance") || components.has("trading_account_highlight")) return 240;
    if ([...sizes].some((size) => size.endsWith("2"))) return 220;
    if (components.has("asset_overview") || components.has("asset_summary")) return 210;
    return 180;
  }

  function buildHomepageRows(blocks, heroBlockCount = 0) {
    const rows = [];
    let pending = null;

    function addRow(items) {
      const rowBlocks = items.map((item) => item.block);
      rows.push({
        id: `home-row-${rows.length + 1}`,
        items,
        minHeight: rowMinHeightForBlocks(rowBlocks),
      });
    }

    function flushPending() {
      if (!pending) return;
      addRow([{ block: pending, span: 12 }]);
      pending = null;
    }

    blocks.forEach((block) => {
      if (isHomepageFullRowBlock(block)) {
        flushPending();
        addRow([{ block, span: 12 }]);
        return;
      }

      if (!pending) {
        pending = block;
        return;
      }

      if (canPairHomepageBlocks(pending, block, heroBlockCount)) {
        const [firstSpan, secondSpan] = pairedHomepageSpans(pending, block, heroBlockCount);
        addRow([
          { block: pending, span: firstSpan },
          { block, span: secondSpan },
        ]);
        pending = null;
        return;
      }

      flushPending();
      pending = block;
    });

    flushPending();
    return rows;
  }

  function sectionsFromBrickPlan(plan, strategy) {
    const zoneLabels = {
      hero: "首屏积木",
      main: "主业务积木",
      rail: "右侧状态积木",
      full: "下方管理积木",
    };

    return ["hero", "main", "rail", "full"]
      .map((zone) => {
        const slots = plan.filter((item) => item.zone === zone).map((item) => item.feature).filter(Boolean);
        if (!slots.length) return null;
        return {
          id: `brick-${zone}`,
          type: zone === "rail" ? "rail" : zone === "hero" ? "hero" : "full",
          title: zone === "hero" ? strategy.label : zoneLabels[zone],
          slots,
        };
      })
      .filter(Boolean);
  }

	  function buildBrickPlan(prompt, variant = 0) {
	    const intent = inferBrickIntent(prompt);
	    const strategy = BRICK_STRATEGIES[intent] || BRICK_STRATEGIES.standard;
	    const genome = selectDesignGenome(prompt, intent, variant);
	    const ids = rotateBrickIds(applyDesignGenomeBrickIds(applyPromptBrickOverrides(strategy.bricks, prompt), genome, prompt), variant);
	    const bricks = uniqueBricksForLayout(ids, intent, prompt);
	    const basePlan = bricks.map((brick, index) => {
	      const zone = brickZoneFor(brick, index, prompt);
	      return {
	        brickId: brick.id,
        brickName: brick.name,
        family: brick.family,
        feature: brick.feature,
        component: brick.component,
        size: brick.size,
        zone,
	        reason: brick.reason,
	      };
	    });
	    const plan = applyDesignGenomeToPlan(applyBrickPlanVariant(basePlan, intent, variant), genome);

	    return { intent, strategy, genome, story: PAGE_STORIES[genome.story] || PAGE_STORIES.opsClarity, bricks, plan };
	  }

	  function buildBrickDrivenConfig(prompt, variant = 0, sourceConfig = null) {
		    const { intent, strategy, genome, story, bricks, plan } = buildBrickPlan(prompt, variant);
		    const strategyMeta = brickVariantMeta(strategy, intent, variant);
		    const profile = promptProfile(prompt);
    const campaignCore = isCampaignCorePrompt(prompt, intent);
    let modules = clone(DEFAULT_CONFIG.modules);
    let moduleStyles = syncLegacyModuleStyles(modules);
    let moduleSettings = clone(DEFAULT_MODULE_SETTINGS);
	    const promptText = positiveIntentText(prompt);
	    const shouldIncludeWelcome = includesAny(promptText, ["欢迎模块", "欢迎头部", "欢迎区", "welcome"]);
    const includeReferralLinkCard = wantsReferralLinkCardPrompt(prompt);
    const referralStatsRequested = wantsReferralStatsPrompt(prompt);
    const referralCoreOnly = wantsReferralCoreOnlyPrompt(prompt);
    const referralPlan = plan.filter((item) => item.component !== "referral_link_card" || includeReferralLinkCard);
    const activePlan =
      includeReferralLinkCard && !referralPlan.some((item) => item.component === "referral_link_card")
        ? referralPlan.concat([
            {
              brickId: "referralLinkCard.compact",
              brickName: "推广链接卡片",
              family: "ReferralLinkCard",
              feature: "referral_link_card",
              component: "referral_link_card",
              size: "1x1",
              zone: "rail",
              reason: "代理、IB 或合作伙伴快速复制推广链接和邀请码，不承载完整代理数据。",
            },
          ])
        : referralPlan;
	    const welcomeLayout = !shouldIncludeWelcome
	      ? []
      : [
          {
            id: "welcome",
            component: "welcome_header",
            slot: "hero",
            priority: 10,
            props: clone(COMPONENT_PROPS_SCHEMA.welcome_header),
            brickId: "system.welcomeHeader",
            brickName: "欢迎头部",
            brickFamily: "WelcomeHeader",
            brickSize: "3x1",
            brickZone: "hero",
            brickReason: "公共欢迎区保留为首页入口和个性化管理入口。",
          },
        ];
	    const layout = welcomeLayout.concat(
	      activePlan.map((item, index) => {
        return {
          id: cleanMetaText(item.brickId.replace(/\./g, "-"), `brick-${index + 1}`, 32),
          component: item.component,
          slot: slotFromBrickZone(item.zone, item.component),
          priority: priorityForBrick(item.zone, index),
          props: clone(COMPONENT_PROPS_SCHEMA[item.component] || {}),
          brickId: item.brickId,
          brickName: item.brickName,
          brickFamily: item.family,
          brickSize: item.size,
          brickZone: item.zone,
          brickReason: item.reason,
        };
      }),
	    );

    const activeBrickIds = new Set(activePlan.map((item) => item.brickId).filter(Boolean));
	    bricks.forEach((brick) => {
      if (!activeBrickIds.has(brick.id)) return;
	      if (brick.moduleId && brick.variant && validModuleVariant(brick.moduleId, brick.variant)) {
	        modules[brick.moduleId] = { variant: brick.variant };
	      }
      if (brick.moduleStyleFeature && brick.moduleStyle) {
        moduleStyles[brick.moduleStyleFeature] = brick.moduleStyle;
      }
      moduleSettings = mergeSettingsObject(moduleSettings, brick.settings);
    });

    Object.keys(genome.moduleVariants || {}).forEach((moduleId) => {
      const variantId = genome.moduleVariants[moduleId];
      if (validModuleVariant(moduleId, variantId)) modules[moduleId] = { variant: variantId };
    });

    moduleStyles = {
      ...moduleStyles,
      ...(genome.moduleStyles || {}),
    };

    if (wantsRealAccountCards(prompt) && wantsDemoAccountList(prompt)) {
      modules.TradingAccounts = { variant: "separatedList" };
      moduleStyles.tradingAccounts = "dense-cards";
      moduleSettings = mergeSettingsObject(moduleSettings, {
        tradingAccounts: {
          enabled: true,
          realEnabled: true,
          demoEnabled: true,
          grouping: "separated",
          viewMode: "card",
          realViewMode: "card",
          demoViewMode: "list",
        },
        openAccount: { enabled: true, real: true, demo: true, placement: "insideTradingAccounts" },
      });
    }

	    if (campaignCore && intent === "growth") {
      moduleSettings = mergeSettingsObject(moduleSettings, {
        adCarousel: { enabled: true },
        quickActions: { enabled: true, count: 8, display: "iconText" },
        assets: { enabled: false, showFundActions: false, showAccountBreakdown: false, showWalletBreakdown: false },
        wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
      });
      moduleStyles = {
        ...moduleStyles,
        adCarousel: "clean",
        quickActions: "matrix",
      };
	    }

    if (includeReferralLinkCard) {
      moduleSettings = mergeSettingsObject(moduleSettings, {
        referralLinkCard: {
          enabled: true,
          showPromoLink: true,
          showInviteCode: true,
          showShare: includesAny(promptText, ["分享", "share"]),
          showStats: referralCoreOnly ? false : referralStatsRequested,
          showOpens: true,
          showRegistrations: true,
          showAccounts: true,
          showRegistrationRate: true,
          showAccountRate: true,
        },
      });
      moduleStyles.referral_link_card = referralStatsRequested && !referralCoreOnly ? "stats-card" : "compact-card";
    }

	    const selectedFamilies = new Set(activePlan.map((item) => item.family));
    if (!selectedFamilies.has("PromotionBanner")) moduleSettings.adCarousel.enabled = false;
    if (!selectedFamilies.has("ReferralLink")) moduleSettings.referral.enabled = false;
    if (!selectedFamilies.has("QuickActions")) moduleSettings.quickActions.enabled = false;
    if (!selectedFamilies.has("OpenAccount") && !selectedFamilies.has("OnboardingProgress") && !selectedFamilies.has("CreateAccountForm")) {
      moduleSettings.openAccount.placement = "insideTradingAccounts";
    }

    moduleStyles = {
      ...syncLegacyModuleStyles(modules),
      ...moduleStyles,
    };

    const genomeMeta = {
      ...strategyMeta,
      label: `${genome.label} · ${story.label}`,
      layoutPreset: genome.layoutPreset || strategyMeta.layoutPreset,
      themePreset: genome.themePreset || strategyMeta.themePreset,
      density: genome.density || strategyMeta.density,
      strength: genome.strength || strategyMeta.strength,
      summary: `${genome.summary} ${story.summary}`,
    };

	    const themePreset = sourceConfig?.themePreset || sourceConfig?.theme ? normalizeThemeId(sourceConfig.themePreset || sourceConfig.theme) : themePresetForPrompt(genomeMeta, prompt, intent);

	    const heroBlock = layout.find((block) => block.slot === "hero" && block.component !== "welcome_header") || layout[0];
	    const score = Math.min(98, 72 + activePlan.length * 2 + (strategy.strength === "strong" ? 8 : 4));

    const generatedConfig = normalizeConfig({
      schemaVersion: 4,
      blueprintVersion: 5,
      generationMode: "brick-v2",
	      name: `${story.label}`.slice(0, 28),
	      layoutPreset: genomeMeta.layoutPreset,
        designGenome: genome.id,
        pageStory: story.id,
	      themePreset,
	      theme: themePreset,
	      personalizationStrength: inferPersonalizationStrength(prompt, { personalizationStrength: genomeMeta.strength }),
	      density: genomeMeta.density,
	      heroFocus: heroBlock?.component || componentFromFeature(activePlan[0]?.feature),
      modules,
      moduleStyles,
      componentMorphs: componentMorphsFromModules(modules, moduleStyles),
      moduleSettings,
		      sections: sectionsFromBrickPlan(activePlan, { label: story.label }),
	      layout,
	      brickPlan: activePlan,
      brickTrace: {
        intent,
	        strategy: genomeMeta.label,
        score,
	        selectedCount: activePlan.length,
        source: "local-brick-engine",
      },
	      compositionStrategy: genomeMeta.summary,
      emphasis: {
	        deposit: activePlan.some((item) => item.family === "FundActions" || item.feature === "adCarousel") ? "high" : "medium",
	        openAccount: activePlan.some((item) => ["OpenAccount", "OnboardingProgress", "CreateAccountForm"].includes(item.family)) ? "high" : "medium",
	        promo: activePlan.some((item) => ["PromotionBanner", "ReferralLink", "ReferralLinkCard"].includes(item.family)) ? "high" : "medium",
	        accounts: activePlan.some((item) => ["TradingAccounts", "AccountPerformance"].includes(item.family)) ? "high" : "medium",
	      },
		      aiSummary: `已识别${profile.audience}，采用${genome.label}，按${story.label}选择 ${activePlan.length} 个积木。`,
	    });

    return applyHomepageUnderstandingToConfig(generatedConfig, prompt);
	  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function t(key) {
    return I18N[key] || key;
  }

  function canonicalHomeBlock(id) {
    const value = String(id || "").trim();
    if (!value) return "";
    if (FORBIDDEN_HOME_BLOCKS.includes(value)) return "";
    if (CANONICAL_HOME_BLOCKS.includes(value)) return value;
    return LEGACY_SLOT_ALIASES[value] || LEGACY_COMPONENT_ALIASES[value] || "";
  }

  function isForbiddenHomeBlock(id) {
    return FORBIDDEN_HOME_BLOCKS.includes(String(id || "").trim());
  }

  function isI18nKey(value) {
    return typeof value === "string" && value.length <= MAX_I18N_KEY_LENGTH && /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/i.test(value);
  }

  function i18nKey(value, fallback) {
    return isI18nKey(value) ? value : fallback;
  }

  function componentFromFeature(id) {
    if (isForbiddenHomeBlock(id)) return "";
    const canonical = canonicalHomeBlock(id);
    if (canonical && COMPONENTS[canonical]) return canonical;
    return COMPONENTS[id] ? id : FEATURE_COMPONENT_MAP[id] || "asset_overview";
  }

  function addValidationError(errors, message) {
    if (errors.length < MAX_VALIDATION_ERRORS) errors.push(message);
  }

  function safeHref(value, fallback = "#") {
    const source = typeof value === "string" ? value.trim() : "";
    if (!source) return fallback;
    if (/^(?:\.{0,2}\/|#|\?)/.test(source) || /^https?:\/\//i.test(source)) return source.slice(0, 180);
    return fallback;
  }

  function sanitizeQuickActions(actions, fallbackActions, errors) {
    const source = Array.isArray(actions) && actions.length ? actions : fallbackActions;
    const seen = new Set();
    const normalized = [];

    source.forEach((action, index) => {
      const actionSource = typeof action === "string" ? { id: action } : action;
      if (!actionSource || typeof actionSource !== "object") return;

      const rawId = String(actionSource.id || "").trim().slice(0, 32);
      const id = QUICK_ACTION_ALIASES[rawId] || rawId;
      const preset = QUICK_ACTION_CATALOG[id] || null;
      if (DISABLED_QUICK_ACTION_IDS.has(id)) return;
      if (!id) {
        addValidationError(errors, `quick_actions.actions[${index}] 缺少 id`);
        return;
      }

      if (seen.has(id)) {
        addValidationError(errors, `quick_actions.actions 重复: ${id}`);
        return;
      }

      seen.add(id);
      normalized.push({
        id: preset?.id || id,
        href: safeHref(actionSource.href, preset?.href || fallbackActions[normalized.length]?.href || "#"),
        icon: ["user", "deposit", "withdraw", "transfer", "history", "positions", "trophy", "copy", "chart"].includes(actionSource.icon)
          ? actionSource.icon
          : preset?.icon || "chart",
        labelKey: i18nKey(actionSource.labelKey, preset?.labelKey || fallbackActions[normalized.length]?.labelKey || "home.action.deposit"),
      });
    });

    if (normalized.length > MAX_QUICK_ACTIONS) {
      addValidationError(errors, `quick_actions.actions 超过 ${MAX_QUICK_ACTIONS} 个`);
    }

    return normalized.slice(0, MAX_QUICK_ACTIONS);
  }

  function sanitizeComponentProps(component, props, errors) {
    const defaults = clone(COMPONENT_PROPS_SCHEMA[component] || {});
    const source = props && typeof props === "object" ? props : {};
    const normalized = {};

    Object.keys(defaults).forEach((key) => {
      const fallback = defaults[key];
      const value = source[key];

      if (key === "actions") {
        normalized.actions = sanitizeQuickActions(value, fallback, errors);
        return;
      }

      if (key === "href") {
        normalized.href = safeHref(value, fallback);
        return;
      }

      normalized[key] = i18nKey(value, fallback);
      if (value !== undefined && !isI18nKey(value)) {
        addValidationError(errors, `${component}.${key} 必须是 i18n key`);
      }
    });

    return normalized;
  }

  function slotFromSectionType(type, component, slotIndex = 0) {
    if (component === "welcome_header") return "hero";
    if (type === "hero" && slotIndex > 0) {
      return ["quick_actions", "onboarding_guide", "referral_link_card", "announcements", "market_news", "pamm_products", "copytrading_signals"].includes(component) ? "rail" : "main";
    }
    if (type === "hero") return "hero";
    if (["trading_accounts_list", "asset_overview", "quick_actions", "promo_banner", "onboarding_guide", "trading_account_highlight", "pamm_products", "copytrading_signals", "referral_link_card", "announcements", "market_news"].includes(component)) return "main";
    if (type === "rail") return "rail";
    if (["onboarding_guide", "referral_link_card", "announcements", "market_news", "pamm_products", "copytrading_signals"].includes(component)) return "rail";
    return "main";
  }

  function defaultHomepageLayout() {
    return [
      { id: "assets", component: "asset_overview", slot: "main", priority: 20, props: clone(COMPONENT_PROPS_SCHEMA.asset_overview) },
      { id: "quick", component: "quick_actions", slot: "rail", priority: 30, props: clone(COMPONENT_PROPS_SCHEMA.quick_actions) },
      { id: "highlight", component: "trading_account_highlight", slot: "main", priority: 40, props: clone(COMPONENT_PROPS_SCHEMA.trading_account_highlight) },
      { id: "accounts", component: "trading_accounts_list", slot: "main", priority: 50, props: clone(COMPONENT_PROPS_SCHEMA.trading_accounts_list) },
      { id: "updates", component: "market_news", slot: "main", priority: 60, props: clone(COMPONENT_PROPS_SCHEMA.market_news) },
    ];
  }

  function layoutFromSections(sections) {
    const blocks = [];
    const seen = new Set();

    (sections || []).forEach((section, sectionIndex) => {
      (section.slots || []).forEach((slot, slotIndex) => {
        const component = componentFromFeature(slot);
        if (seen.has(component)) return;

        seen.add(component);
        blocks.push({
          id: `${component}-${sectionIndex + 1}-${slotIndex + 1}`,
          component,
          slot: slotFromSectionType(section.type, component, slotIndex),
          priority: 20 + sectionIndex * 100 + slotIndex * 10,
          props: clone(COMPONENT_PROPS_SCHEMA[component]),
        });
      });
    });

    return blocks.length > 1 ? blocks : defaultHomepageLayout();
  }

  function normalizeHomepageLayout(sourceLayout, sections) {
    const errors = [];
    const source = Array.isArray(sourceLayout) ? sourceLayout : layoutFromSections(sections);

    if (source.length > MAX_HOME_MODULES) {
      addValidationError(errors, `layout 超过最大模块数 ${MAX_HOME_MODULES}`);
    }

    const seenComponents = new Set();
    const blocks = [];

    source.slice(0, MAX_HOME_MODULES).forEach((block, index) => {
      if (!block || typeof block !== "object") return;

      const rawComponent = String(block.component || "");
      if (isForbiddenHomeBlock(rawComponent)) return;
      const component = canonicalHomeBlock(rawComponent) || rawComponent;
      if (!COMPONENTS[component]) {
        addValidationError(errors, `非法组件: ${rawComponent || `index-${index}`}`);
        return;
      }

      if (seenComponents.has(component)) {
        addValidationError(errors, `重复模块: ${component}`);
        return;
      }

      seenComponents.add(component);
      blocks.push({
        id: String(block.id || `${component}-${index + 1}`).replace(/[^\w-]/g, "").slice(0, 32) || `${component}-${index + 1}`,
        component,
        slot: LAYOUT_SLOT_SPANS[block.slot] ? block.slot : slotFromSectionType("full", component),
        priority: Number.isFinite(Number(block.priority)) ? Number(block.priority) : (index + 1) * 10,
        props: sanitizeComponentProps(component, block.props, errors),
        brickId: cleanMetaText(block.brickId, "", 90),
        brickName: cleanMetaText(block.brickName, "", 80),
        brickFamily: cleanMetaText(block.brickFamily, "", 48),
        brickSize: cleanMetaText(block.brickSize, "", 12),
        brickZone: cleanMetaText(block.brickZone, "", 24),
        brickReason: cleanMetaText(block.brickReason, "", 180),
      });
    });

    const normalized = blocks.length ? blocks.sort((a, b) => a.priority - b.priority) : defaultHomepageLayout();
    return {
      layout: normalized,
      validationErrors: errors,
    };
  }

  function validateHomepageConfig(config) {
    const normalized = normalizeConfig(config);
    return {
      valid: normalized.validationErrors.length === 0,
      config: normalized.validationErrors.length ? normalizeConfig(DEFAULT_CONFIG) : normalized,
      errors: normalized.validationErrors,
      schema: HOMEPAGE_CONFIG_JSON_SCHEMA,
    };
  }

  function uniqueValidSlots(slots) {
    const next = [];

    (Array.isArray(slots) ? slots : []).forEach((slot) => {
      const canonical = canonicalHomeBlock(slot);
      if (canonical && FEATURES[canonical] && !next.includes(canonical)) next.push(canonical);
    });

    return next;
  }

  function normalizeSections(sections) {
    const source = Array.isArray(sections) && sections.length ? sections : DEFAULT_CONFIG.sections;
    return source
      .map((section, index) => {
        const slots = uniqueValidSlots(section.slots);
        if (!slots.length) return null;

        return {
          id: String(section.id || `section-${index + 1}`).slice(0, 32),
          type: ["hero", "rail", "split", "full"].includes(section.type) ? section.type : "full",
          title: String(section.title || "").slice(0, 28),
          variant: String(section.variant || "").slice(0, 24),
          slots,
        };
      })
      .filter(Boolean);
  }

  function boolValue(value, fallback = true) {
    return typeof value === "boolean" ? value : fallback;
  }

  function oneOf(value, options, fallback) {
    return options.includes(value) ? value : fallback;
  }

  function normalizeThemeId(value) {
    const theme = LEGACY_THEME_MAP[value] || value;
    return THEMES[theme] ? theme : DEFAULT_CONFIG.theme;
  }

  function normalizeLayoutPreset(value) {
    const layout = LEGACY_LAYOUT_MAP[value] || value;
    return LAYOUTS[layout] ? layout : DEFAULT_CONFIG.layoutPreset;
  }

  function normalizeDesignGenome(value, fallback = "accountOpsConsole") {
    return DESIGN_GENOMES[value] ? value : fallback;
  }

  function designGenomeForLayout(layoutPreset) {
    return (
      Object.keys(DESIGN_GENOMES).find((id) => DESIGN_GENOMES[id].layoutPreset === layoutPreset) ||
      {
        conversionFirst: "onboardingJourney",
        assetFirst: "accountOpsConsole",
        tradingPro: "tradingCommand",
        vipService: "privateWealthDesk",
        standardDashboard: "accountOpsConsole",
      }[layoutPreset] ||
      "accountOpsConsole"
    );
  }

  function normalizePageStory(value, fallback = "opsClarity") {
    return PAGE_STORIES[value] ? value : fallback;
  }

  function componentMorphsFromModules(modules, moduleStyles = {}) {
    return Object.keys(PROTOCOL_MODULES).reduce((morphs, moduleId) => {
      const featureId = PROTOCOL_MODULES[moduleId].feature;
      const variant = modules?.[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId];
      morphs[moduleId] = {
        variant,
        variantLabel: moduleVariantLabel(moduleId, variant),
        style: moduleStyles[featureId] || "",
      };
      return morphs;
    }, {});
  }

  function normalizeComponentMorphs(source, modules, moduleStyles) {
    const base = componentMorphsFromModules(modules, moduleStyles);
    const explicit = source && typeof source === "object" && !Array.isArray(source) ? source : {};

    Object.keys(explicit).forEach((moduleId) => {
      if (!PROTOCOL_MODULES[moduleId]) return;
      const variant = explicit[moduleId]?.variant || base[moduleId]?.variant;
      if (!validModuleVariant(moduleId, variant)) return;
      base[moduleId] = {
        ...base[moduleId],
        variant,
        variantLabel: moduleVariantLabel(moduleId, variant),
        reason: cleanMetaText(explicit[moduleId]?.reason, "", 140),
      };
    });

    return base;
  }

  function normalizePersonalizationStrength(value, fallback = DEFAULT_CONFIG.personalizationStrength) {
    return ["subtle", "medium", "strong"].includes(value) ? value : fallback;
  }

  function moduleKeyFor(value) {
    return COMPONENT_MODULE_MAP[value] || (PROTOCOL_MODULES[value] ? value : "");
  }

  function validModuleVariant(moduleId, variant) {
    return Boolean(PROTOCOL_MODULES[moduleId]?.variants.includes(variant));
  }

  function normalizeModuleVariants(source) {
    const modulesSource = source.modules && typeof source.modules === "object" ? source.modules : {};
    const variantsSource = source.moduleVariants && typeof source.moduleVariants === "object" ? source.moduleVariants : {};
    const stylesSource = source.moduleStyles && typeof source.moduleStyles === "object" ? source.moduleStyles : {};
    const next = clone(DEFAULT_CONFIG.modules || {});

    Object.keys(stylesSource).forEach((featureId) => {
      const moduleId = moduleKeyFor(featureId);
      const mapped = LEGACY_MODULE_STYLE_VARIANT_MAP[featureId]?.[stylesSource[featureId]];
      if (moduleId && mapped && validModuleVariant(moduleId, mapped)) {
        next[moduleId] = { variant: mapped };
      }
    });

    Object.keys(next).forEach((moduleId) => {
      const explicitVariant = modulesSource[moduleId]?.variant || variantsSource[moduleId];
      if (validModuleVariant(moduleId, explicitVariant)) {
        next[moduleId] = { variant: explicitVariant };
      }
    });

    (Array.isArray(source.layout) ? source.layout : []).forEach((block) => {
      const moduleId = moduleKeyFor(block?.module?.id || block?.component);
      const variant = block?.module?.variant || block?.variant;
      if (moduleId && validModuleVariant(moduleId, variant)) {
        next[moduleId] = { variant };
      }
    });

    if (normalizeThemeId(source.themePreset || source.theme) === "blackGold" && !modulesSource.PromotionBanner?.variant && !variantsSource.PromotionBanner) {
      next.PromotionBanner = { variant: "blackGoldVip" };
    }

    return next;
  }

  function syncLegacyModuleStyles(modules) {
    const styles = { ...MODULE_STYLE_DEFAULTS };
    const variants = modules || {};

    if (variants.AssetOverview?.variant === "vipHero") styles.balanceTotal = "command";
    if (variants.AssetOverview?.variant === "compactTable" || variants.AssetOverview?.variant === "darkTerminal") styles.balanceTotal = "metric-strip";
    if (variants.AssetOverview?.variant === "tickerStrip") styles.balanceTotal = "ticker-strip";
    if (variants.AssetOverview?.variant === "wealthPlate") styles.balanceTotal = "wealth-plate";
    if (variants.AssetOverview?.variant === "riskRadar") styles.balanceTotal = "risk-radar";
    if (variants.WalletBalance?.variant === "splitCurrency") styles.walletBalance = "wallet-strip";
    if (variants.WalletBalance?.variant === "premiumCard") styles.walletBalance = "wallet-actions";
    if (variants.WalletBalance?.variant === "compact") styles.walletBalance = "wallet-strip";
    if (variants.FundActions?.variant === "dock") styles.fundActions = "dock";
    if (variants.FundActions?.variant === "splitButtons") styles.fundActions = "split-buttons";
    if (variants.FundActions?.variant === "compactRow") styles.fundActions = "compact-row";
    if (variants.QuickActions?.variant === "actionDock") styles.quickActions = "toolbar";
    if (variants.QuickActions?.variant === "priorityButtons") styles.quickActions = "compact-grid";
    if (variants.QuickActions?.variant === "minimalIcons") styles.quickActions = "toolbar";
    if (variants.QuickActions?.variant === "commandBar") styles.quickActions = "command-bar";
    if (variants.QuickActions?.variant === "taskRail") styles.quickActions = "task-rail";
    if (variants.PromotionBanner?.variant === "gradientHero") {
      styles.promoHighlight = "scoreboard";
      styles.adCarousel = "immersive";
    }
    if (variants.PromotionBanner?.variant === "blackGoldVip") {
      styles.promoHighlight = "banner";
      styles.adCarousel = "immersive";
    }
    if (variants.PromotionBanner?.variant === "splitVisual") {
      styles.promoHighlight = "clean";
      styles.adCarousel = "clean";
    }
    if (variants.PromotionBanner?.variant === "editorialCover") {
      styles.promoHighlight = "scoreboard";
      styles.adCarousel = "editorial-cover";
    }
    if (variants.PromotionBanner?.variant === "depositLadder") {
      styles.promoHighlight = "deposit-ladder";
      styles.adCarousel = "clean";
    }
    if (variants.ReferralLink?.variant === "linkFirst") styles.referralLink = "link-first";
    if (variants.ReferralLink?.variant === "compact") styles.referralLink = "compact";
    if (variants.TradingAccounts?.variant === "separatedList" || variants.TradingAccounts?.variant === "calmTable") styles.tradingAccounts = "calm-table";
    if (variants.TradingAccounts?.variant === "denseCards") styles.tradingAccounts = "dense-cards";
    if (variants.TradingAccounts?.variant === "accountWall") styles.tradingAccounts = "account-wall";
    if (variants.TradingAccounts?.variant === "opsTable") styles.tradingAccounts = "ops-table";
    if (variants.OpenAccount?.variant === "sidePanel") styles.openAccountActions = "stacked";
    if (variants.OpenAccount?.variant === "inlineActions") styles.openAccountActions = "horizontal";
    if (variants.OpenAccount?.variant === "softCard") styles.openAccountActions = "soft-card";
    if (variants.OpenAccount?.variant === "conversionPanel") styles.openAccountActions = "conversion-panel";
    if (variants.OnboardingProgress?.variant === "checklist") styles.onboardingProgress = "checklist";
    if (variants.OnboardingProgress?.variant === "compact") styles.onboardingProgress = "compact";
    if (variants.OnboardingProgress?.variant === "journeyTimeline") styles.onboardingProgress = "journey-timeline";
    if (variants.AccountPerformance?.variant === "terminalChart") styles.accountPerformance = "terminal-chart";
    if (variants.AccountPerformance?.variant === "sparklineBoard") styles.accountPerformance = "sparkline-board";
    if (variants.WalletList?.variant === "walletTiles") styles.walletList = "wallet-tiles";
    if (variants.UserKycRail?.variant === "compactStatus") styles.userKycRail = "status-rail";
    if (variants.CreateAccountForm?.variant === "guidedForm") styles.createAccountForm = "wizard-card";

    return styles;
  }

  function attachModuleMetadata(block, modules) {
    const moduleId = moduleKeyFor(block.component);
    if (!moduleId) return block;

    return {
      ...block,
      module: {
        id: moduleId,
        variant: modules[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId],
      },
      variant: modules[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId],
    };
  }

  function normalizeModuleSettings(settings) {
    const source = settings && typeof settings === "object" ? settings : {};
    const defaults = clone(DEFAULT_MODULE_SETTINGS);
    const quickActions = source.quickActions && typeof source.quickActions === "object" ? source.quickActions : {};
    const referral = source.referral && typeof source.referral === "object" ? source.referral : {};
    const referralLinkCard = source.referralLinkCard && typeof source.referralLinkCard === "object" ? source.referralLinkCard : {};
    const tradingAccounts = source.tradingAccounts && typeof source.tradingAccounts === "object" ? source.tradingAccounts : {};
    const openAccount = source.openAccount && typeof source.openAccount === "object" ? source.openAccount : {};
    const wallet = source.wallet && typeof source.wallet === "object" ? source.wallet : {};
    const assets = source.assets && typeof source.assets === "object" ? source.assets : {};
    const adCarousel = source.adCarousel && typeof source.adCarousel === "object" ? source.adCarousel : {};
    const promoHighlight = source.promoHighlight && typeof source.promoHighlight === "object" ? source.promoHighlight : {};
    const userKycRail = source.userKycRail && typeof source.userKycRail === "object" ? source.userKycRail : {};
    const riskNotice = source.riskNotice && typeof source.riskNotice === "object" ? source.riskNotice : {};
    const pamm = source.pamm && typeof source.pamm === "object" ? source.pamm : {};
    const copytrading = source.copytrading && typeof source.copytrading === "object" ? source.copytrading : {};
    const announcements = source.announcements && typeof source.announcements === "object" ? source.announcements : {};
    const marketNews = source.marketNews && typeof source.marketNews === "object" ? source.marketNews : {};
    const tradingAccountViewMode = oneOf(tradingAccounts.viewMode, ["switchable", "card", "list"], defaults.tradingAccounts.viewMode);
    const visibleAssetFields = Array.isArray(assets.visibleFields)
      ? assets.visibleFields
          .map((field) => String(field || "").trim())
          .filter((field, index, list) => ["total", "wallet", "tradingAccount"].includes(field) && list.indexOf(field) === index)
          .slice(0, 3)
      : defaults.assets.visibleFields;
    const walletCodes = Array.isArray(assets.wallets)
      ? assets.wallets
          .map((code) => String(code || "").trim().toUpperCase())
          .filter((code, index, list) => ["USD", "EUR", "USDT", "XAU", "GBP", "JPY", "CNH"].includes(code) && list.indexOf(code) === index)
          .slice(0, 6)
      : defaults.assets.wallets;

    const normalized = {
      adCarousel: {
        enabled: boolValue(adCarousel.enabled, defaults.adCarousel.enabled),
      },
      promoHighlight: {
        enabled: boolValue(promoHighlight.enabled, defaults.promoHighlight.enabled),
      },
      quickActions: {
        enabled: boolValue(quickActions.enabled, defaults.quickActions.enabled),
        count: Math.max(3, Math.min(8, Number(quickActions.count || defaults.quickActions.count))),
        display: oneOf(quickActions.display, ["iconText", "iconOnly", "hoverText"], defaults.quickActions.display),
        actions: sanitizeQuickActions(quickActions.actions, [], []),
      },
      wallet: {
        enabled: boolValue(wallet.enabled, defaults.wallet.enabled),
        placement: oneOf(wallet.placement, ["standalone", "mergedWithAssets"], defaults.wallet.placement),
        showFundActions: boolValue(wallet.showFundActions, defaults.wallet.showFundActions),
      },
      assets: {
        enabled: boolValue(assets.enabled, defaults.assets.enabled),
        visibleFields: visibleAssetFields.length ? visibleAssetFields : defaults.assets.visibleFields,
        showFundActions: boolValue(assets.showFundActions, defaults.assets.showFundActions),
        showAccountBreakdown: boolValue(assets.showAccountBreakdown, defaults.assets.showAccountBreakdown),
        showWalletBreakdown: boolValue(assets.showWalletBreakdown, defaults.assets.showWalletBreakdown),
        showAvailable: boolValue(assets.showAvailable, defaults.assets.showAvailable),
        showMargin: boolValue(assets.showMargin, defaults.assets.showMargin),
        showRiskLevel: boolValue(assets.showRiskLevel, defaults.assets.showRiskLevel),
        wallets: walletCodes,
      },
      referral: {
        enabled: boolValue(referral.enabled, defaults.referral.enabled),
        showClicks: boolValue(referral.showClicks, defaults.referral.showClicks),
        showRegistrations: boolValue(referral.showRegistrations, defaults.referral.showRegistrations),
        showTradingAccounts: boolValue(referral.showTradingAccounts, defaults.referral.showTradingAccounts),
        showPromoLink: boolValue(referral.showPromoLink, defaults.referral.showPromoLink),
        showInviteCode: boolValue(referral.showInviteCode, defaults.referral.showInviteCode),
        showQrCode: boolValue(referral.showQrCode, defaults.referral.showQrCode),
      },
      referralLinkCard: {
        enabled: boolValue(referralLinkCard.enabled, defaults.referralLinkCard.enabled),
        showPromoLink: boolValue(referralLinkCard.showPromoLink, defaults.referralLinkCard.showPromoLink),
        showInviteCode: boolValue(referralLinkCard.showInviteCode, defaults.referralLinkCard.showInviteCode),
        showShare: boolValue(referralLinkCard.showShare, defaults.referralLinkCard.showShare),
        showStats: boolValue(referralLinkCard.showStats, defaults.referralLinkCard.showStats),
        showOpens: boolValue(referralLinkCard.showOpens, defaults.referralLinkCard.showOpens),
        showRegistrations: boolValue(referralLinkCard.showRegistrations, defaults.referralLinkCard.showRegistrations),
        showAccounts: boolValue(referralLinkCard.showAccounts, defaults.referralLinkCard.showAccounts),
        showRegistrationRate: boolValue(referralLinkCard.showRegistrationRate, defaults.referralLinkCard.showRegistrationRate),
        showAccountRate: boolValue(referralLinkCard.showAccountRate, defaults.referralLinkCard.showAccountRate),
      },
      tradingAccounts: {
        enabled: boolValue(tradingAccounts.enabled, defaults.tradingAccounts.enabled),
        realEnabled: boolValue(tradingAccounts.realEnabled, defaults.tradingAccounts.realEnabled),
        demoEnabled: boolValue(tradingAccounts.demoEnabled, defaults.tradingAccounts.demoEnabled),
        grouping: oneOf(tradingAccounts.grouping, ["combined", "separated"], defaults.tradingAccounts.grouping),
        viewMode: tradingAccountViewMode,
        realViewMode: oneOf(tradingAccounts.realViewMode, ["card", "list"], tradingAccountViewMode === "list" ? "list" : "card"),
        demoViewMode: oneOf(tradingAccounts.demoViewMode, ["card", "list"], tradingAccountViewMode === "card" ? "card" : "list"),
        demoFirst: boolValue(tradingAccounts.demoFirst, defaults.tradingAccounts.demoFirst),
      },
      openAccount: {
        enabled: boolValue(openAccount.enabled, defaults.openAccount.enabled),
        real: boolValue(openAccount.real, defaults.openAccount.real),
        demo: boolValue(openAccount.demo, defaults.openAccount.demo),
        bind: boolValue(openAccount.bind, defaults.openAccount.bind),
        placement: oneOf(openAccount.placement, ["insideTradingAccounts", "standalone"], defaults.openAccount.placement),
      },
      userKycRail: {
        kycStatus: oneOf(userKycRail.kycStatus, ["verified", "pending", "reviewing", "rejected"], defaults.userKycRail.kycStatus),
      },
      riskNotice: {
        enabled: boolValue(riskNotice.enabled, defaults.riskNotice.enabled),
      },
      pamm: {
        enabled: boolValue(pamm.enabled, defaults.pamm.enabled),
      },
      copytrading: {
        enabled: boolValue(copytrading.enabled, defaults.copytrading.enabled),
      },
      announcements: {
        enabled: boolValue(announcements.enabled, defaults.announcements.enabled),
      },
      marketNews: {
        enabled: boolValue(marketNews.enabled, defaults.marketNews.enabled),
      },
    };

    if (!normalized.tradingAccounts.realEnabled && !normalized.tradingAccounts.demoEnabled) {
      normalized.tradingAccounts.enabled = false;
    }

    if (!normalized.openAccount.real && !normalized.openAccount.demo && !normalized.openAccount.bind) {
      normalized.openAccount.enabled = false;
    }

    if (!normalized.referral.showPromoLink && !normalized.referral.showInviteCode && !normalized.referral.showQrCode) {
      normalized.referral.showPromoLink = true;
    }

    if (!normalized.referralLinkCard.showPromoLink && !normalized.referralLinkCard.showInviteCode) {
      normalized.referralLinkCard.showPromoLink = true;
    }

    return normalized;
  }

  function mergeModuleSettings(config, updates) {
    const nextSettings = clone(config.moduleSettings);

    Object.keys(updates || {}).forEach((group) => {
      nextSettings[group] = {
        ...(nextSettings[group] && typeof nextSettings[group] === "object" ? nextSettings[group] : {}),
        ...(updates[group] && typeof updates[group] === "object" ? updates[group] : {}),
      };
    });

    config.moduleSettings = normalizeModuleSettings(nextSettings);
  }

  function mergeModuleStyles(config, updates) {
    config.moduleStyles = {
      ...config.moduleStyles,
      ...(updates || {}),
    };
  }

  function normalizeModuleStyles(sourceStyles, modules) {
    const styles = syncLegacyModuleStyles(modules);
    const explicit = sourceStyles && typeof sourceStyles === "object" ? sourceStyles : {};

    Object.keys(MODULE_STYLE_OPTIONS).forEach((featureId) => {
      const value = explicit[featureId];
      if (MODULE_STYLE_OPTIONS[featureId].some((option) => option.id === value)) {
        styles[featureId] = value;
      }
    });

    return styles;
  }

  function mergeModuleVariants(config, updates) {
    const modules = clone(config.modules || DEFAULT_CONFIG.modules);

    Object.keys(updates || {}).forEach((moduleId) => {
      const variant = updates[moduleId]?.variant || updates[moduleId];
      if (validModuleVariant(moduleId, variant)) {
        modules[moduleId] = { variant };
      }
    });

    config.modules = modules;
    config.moduleVariants = Object.keys(modules).reduce((variants, moduleId) => {
      variants[moduleId] = modules[moduleId].variant;
      return variants;
    }, {});
    config.moduleStyles = syncLegacyModuleStyles(modules);
  }

  function normalizeBrickPlan(plan) {
    return (Array.isArray(plan) ? plan : [])
      .map((item) => {
        const brickId = cleanMetaText(item?.brickId || item?.id, "", 90);
        const brick = brickById(brickId);
        const rawFeature = item?.feature || brick?.feature || "";
        const feature = canonicalHomeBlock(rawFeature);
        const rawComponent = item?.component || brick?.component || componentFromFeature(feature);
        const component = canonicalHomeBlock(rawComponent) || componentFromFeature(feature);

        return {
          brickId,
          brickName: cleanMetaText(item?.brickName || item?.name || brick?.name, "", 80),
          family: cleanMetaText(item?.family || item?.brickFamily || brick?.family, "", 48),
          feature,
          component: COMPONENTS[component] ? component : "",
          size: cleanMetaText(item?.size || item?.brickSize || brick?.size, "", 12),
          zone: ["hero", "main", "rail", "full"].includes(item?.zone || item?.brickZone)
            ? item.zone || item.brickZone
            : brick?.defaultZone || "main",
          reason: cleanMetaText(item?.reason || item?.brickReason || brick?.reason, "", 180),
        };
      })
      .filter((item) => item.brickId && item.feature && item.component && CANONICAL_HOME_BLOCKS.includes(item.component))
      .slice(0, 14);
  }

  function normalizeBrickTrace(trace) {
    const source = trace && typeof trace === "object" ? trace : {};
    return {
      intent: cleanMetaText(source.intent, "", 32),
      strategy: cleanMetaText(source.strategy, "", 80),
      score: Number.isFinite(Number(source.score)) ? Math.max(0, Math.min(100, Math.round(Number(source.score)))) : 0,
      selectedCount: Number.isFinite(Number(source.selectedCount)) ? Math.max(0, Math.min(20, Math.round(Number(source.selectedCount)))) : 0,
      source: cleanMetaText(source.source, "", 48),
    };
  }

  function fallbackBrickForComponent(component, modules) {
    const canonicalFallbacks = {
      asset_overview: {
        id: "assetOverview.flexible",
        name: "资产概览区",
        family: "AssetOverview",
        component: "asset_overview",
        feature: "asset_overview",
        size: "2x1",
        defaultZone: "hero",
        reason: "资产概览可展示 Total、钱包余额、交易账号余额中的 1-3 项。",
      },
      quick_actions: {
        id: "quickActions.configDriven",
        name: "后台配置快捷入口",
        family: "QuickActions",
        component: "quick_actions",
        feature: "quick_actions",
        size: "2x1",
        defaultZone: "main",
        reason: "快捷入口内容由后台配置或接口返回，AI 只决定展示方式。",
      },
      onboarding_guide: {
        id: "onboardingGuide.flexible",
        name: "新手引导区",
        family: "OnboardingGuide",
        component: "onboarding_guide",
        feature: "onboarding_guide",
        size: "2x1",
        defaultZone: "main",
        reason: "仅在新用户或关键流程未完成时展示下一步引导。",
      },
      trading_account_highlight: {
        id: "tradingAccount.highlight",
        name: "交易账户重点展示",
        family: "TradingAccountHighlight",
        component: "trading_account_highlight",
        feature: "trading_account_highlight",
        size: "2x2",
        defaultZone: "main",
        reason: "突出一个交易账号的余额、净值、收益率和盈亏趋势。",
      },
      trading_accounts_list: {
        id: "tradingAccounts.list",
        name: "交易账户列表",
        family: "TradingAccountsList",
        component: "trading_accounts_list",
        feature: "trading_accounts_list",
        size: "3x2",
        defaultZone: "full",
        reason: "展示多个交易账号的简要信息和详情入口。",
      },
      promo_banner: {
        id: "promoBanner.configured",
        name: "活动 Banner 区",
        family: "PromotionBanner",
        component: "promo_banner",
        feature: "promo_banner",
        size: "3x1",
        defaultZone: "main",
        reason: "仅在租户配置活动时展示活动 Banner。",
      },
      pamm_products: {
        id: "pammProducts.recommendations",
        name: "PAMM 产品推荐",
        family: "PammProducts",
        component: "pamm_products",
        feature: "pamm_products",
        size: "2x1",
        defaultZone: "main",
        reason: "仅在 PAMM 功能开启且接口返回产品时展示。",
      },
      copytrading_signals: {
        id: "copytradingSignals.recommendations",
        name: "CopyTrading 信号源推荐",
        family: "CopytradingSignals",
        component: "copytrading_signals",
        feature: "copytrading_signals",
        size: "2x1",
        defaultZone: "main",
        reason: "仅在 CopyTrading 功能开启且接口返回信号源时展示。",
      },
      referral_link_card: {
        id: "referralLinkCard.compact",
        name: "推广链接卡片",
        family: "ReferralLinkCard",
        component: "referral_link_card",
        feature: "referral_link_card",
        size: "1x1",
        defaultZone: "rail",
        reason: "仅代理、IB、合作伙伴或开启推广链接功能时展示轻量推广链接和邀请码。",
      },
      announcements: {
        id: "announcements.feed",
        name: "公告通知区",
        family: "Announcements",
        component: "announcements",
        feature: "announcements",
        size: "2x1",
        defaultZone: "main",
        reason: "展示系统公告、活动公告和维护通知。",
      },
      market_news: {
        id: "marketNews.feed",
        name: "市场资讯区",
        family: "MarketNews",
        component: "market_news",
        feature: "market_news",
        size: "2x1",
        defaultZone: "main",
        reason: "展示市场新闻、平台资讯、教程或热门文章。",
      },
    };

    if (canonicalFallbacks[component]) return canonicalFallbacks[component];

    if (component === "welcome_header") {
      return {
        id: "system.welcomeHeader",
        name: "欢迎头部",
        family: "WelcomeHeader",
        component: "welcome_header",
        size: "3x1",
        defaultZone: "hero",
        reason: "公共欢迎区保留为首页入口和个性化管理入口。",
      };
    }

    const candidates = HOME_BRICKS.filter((brick) => brick.component === component);
    if (!candidates.length) return null;

    const moduleId = moduleKeyFor(component);
    const activeVariant = moduleId ? modules?.[moduleId]?.variant : "";

    return (
      candidates.find((brick) => brick.moduleId === moduleId && brick.variant === activeVariant) ||
      candidates.find((brick) => brick.moduleId === moduleId) ||
      candidates[0]
    );
  }

  function applyBrickMetadataToLayout(layout, brickPlan, modules) {
    const planByComponent = new Map();

    brickPlan.forEach((item) => {
      if (item.component && !planByComponent.has(item.component)) planByComponent.set(item.component, item);
    });

    return layout.map((block) => {
      if (block.brickId) return block;

      const planItem = planByComponent.get(block.component);
      const brick = planItem || fallbackBrickForComponent(block.component, modules);
      if (!brick) return block;

      return {
        ...block,
        brickId: cleanMetaText(brick.brickId || brick.id, "", 90),
        brickName: cleanMetaText(brick.brickName || brick.name, "", 80),
        brickFamily: cleanMetaText(brick.family || brick.brickFamily, "", 48),
        brickSize: cleanMetaText(brick.size || brick.brickSize, "", 12),
        brickZone: cleanMetaText(brick.zone || brick.defaultZone || block.slot, "", 24),
        brickReason: cleanMetaText(brick.reason || brick.brickReason, "由 AI section 自动映射到首页积木库。", 180),
      };
    });
  }

  function brickPlanFromLayout(layout) {
    return layout
      .filter((block) => block.brickId && block.component !== "welcome_header")
      .map((block) => ({
        brickId: block.brickId,
        brickName: block.brickName,
        family: block.brickFamily,
        feature: HOME_BRICKS.find((brick) => brick.id === block.brickId)?.feature || COMPONENT_STYLE_FEATURE_MAP[block.component] || "",
        component: block.component,
        size: block.brickSize,
        zone: ["hero", "main", "rail", "full"].includes(block.brickZone) ? block.brickZone : block.slot,
        reason: block.brickReason,
      }))
      .filter((item) => item.brickId && item.component)
      .slice(0, 14);
  }

  function promptProfile(prompt) {
    const source = String(prompt || "");
    const text = positiveIntentText(source);
    const goals = [];
    let audience = "综合交易客户";
    let tone = "稳健清晰";

    if (includesAny(text, ["资产管理", "总资产", "多币种", "钱包列表", "资产配置", "可用资金", "保证金占用", "风险等级", "账户资产", "账号资产"])) {
      audience = "资产管理客户";
      tone = "清爽专业";
      goals.push("资产总览", "钱包管理", "账号表现");
    }

    if (includesAny(text, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) {
      audience = "高净值 / 机构客户";
      tone = "高端信任";
      goals.push("资产信任", "入金转化");
    }

    if (includesAny(text, ["新手", "新客", "开户", "注册", "kyc", "首次"])) {
      audience = "新开户客户";
      tone = "清晰引导";
      goals.push("开户路径", "首次入金");
    }

    if (includesAny(text, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化"])) {
      audience = audience === "综合交易客户" ? "活动转化客户" : audience;
      tone = "高能转化";
      goals.push("活动曝光", "快速参与");
    }

    if (audience !== "资产管理客户" && includesAny(text, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账户列表", "账号列表"])) {
      audience = audience === "综合交易客户" ? "活跃交易客户" : audience;
      tone = tone === "稳健清晰" ? "专业高效" : tone;
      goals.push("账号管理", "交易效率");
    }

    if (includesAny(text, ["ib", "代理", "渠道", "邀请", "推荐", "裂变", "开户链接"])) {
      audience = "IB / 渠道代理";
      tone = "增长导向";
      goals.push("邀请转化", "注册链接曝光");
    }

    if (includesAny(text, ["清爽", "科技", "国际", "global", "蓝"])) tone = "科技清爽";
    if (includesAny(text, ["大气", "留白", "品牌", "舒展"])) tone = tone === "稳健清晰" ? "品牌舒展" : tone;
    if (includesAny(text, ["紧凑", "密集", "信息多"])) tone = "信息密集";

    return {
      audience,
      tone,
      goals: Array.from(new Set(goals)).slice(0, 4),
    };
  }

  function inferPersonalizationStrength(prompt, preset) {
    const signal = `${String(prompt || "").toLowerCase()} ${String(prompt || "")}`;
    if (includesAny(signal, ["强", "明显", "大胆", "沉浸", "高对比", "差异化", "vip", "高净值", "黑金", "活动", "大赛"])) return "strong";
    if (includesAny(signal, ["轻微", "克制", "稳健", "极简", "白色", "minimal", "不要太花"])) return "subtle";
    if (preset?.personalizationStrength) return preset.personalizationStrength;
    return "medium";
  }

  function sectionsFromLegacyOrder(order) {
    const map = {
      accountOverview: ["balanceTotal", "fundActions"],
      onboardingProgress: ["onboardingProgress"],
      promoBanner: ["promoHighlight"],
      adCarousel: ["adCarousel"],
      quickActions: ["quickActions"],
      referralCard: ["referralLink"],
      tradingAccounts: ["tradingAccounts"],
    };

    const source = Array.isArray(order) && order.length ? order : Object.keys(map);
    return source
      .filter((id) => map[id])
      .map((id) => ({
        id,
        type: "full",
        title: MODULES[id],
        slots: map[id],
      }));
  }

  function sanitizeCanonicalHomepageConfig(config) {
    const next = config;
    const settings = next.moduleSettings || {};

    next.sections = normalizeSections(next.sections);
    next.layout = (Array.isArray(next.layout) ? next.layout : [])
      .map((block) => {
        const component = canonicalHomeBlock(block?.component) || block?.component;
        if (!component || isForbiddenHomeBlock(component) || !CANONICAL_HOME_BLOCKS.includes(component)) return null;
        return {
          ...block,
          component,
          props: clone(COMPONENT_PROPS_SCHEMA[component] || block.props || {}),
        };
      })
      .filter(Boolean)
      .filter((block, index, list) => list.findIndex((item) => item.component === block.component) === index);

    if (!next.layout.length) {
      next.layout = layoutFromSections(next.sections);
    }

    next.brickPlan = normalizeBrickPlan(next.brickPlan);
    next.heroFocus = componentFromFeature(next.heroFocus);

    settings.referral = { ...(settings.referral || {}), enabled: false };
    settings.riskNotice = { ...(settings.riskNotice || {}), enabled: false };
    settings.userKycRail = { ...(settings.userKycRail || {}), kycStatus: "verified" };
    next.sections.forEach((section) => {
      (section.slots || []).forEach((slot) => {
        if (slot === "asset_overview") settings.assets = { ...(settings.assets || {}), enabled: true };
        if (slot === "quick_actions") settings.quickActions = { ...(settings.quickActions || {}), enabled: true };
        if (slot === "onboarding_guide") settings.openAccount = { ...(settings.openAccount || {}), enabled: true };
        if (slot === "trading_account_highlight" || slot === "trading_accounts_list") settings.tradingAccounts = { ...(settings.tradingAccounts || {}), enabled: true };
	        if (slot === "promo_banner") settings.promoHighlight = { ...(settings.promoHighlight || {}), enabled: true };
	        if (slot === "pamm_products") settings.pamm = { ...(settings.pamm || {}), enabled: true };
	        if (slot === "copytrading_signals") settings.copytrading = { ...(settings.copytrading || {}), enabled: true };
	        if (slot === "referral_link_card") settings.referralLinkCard = { ...(settings.referralLinkCard || {}), enabled: true };
	        if (slot === "announcements") settings.announcements = { ...(settings.announcements || {}), enabled: true };
        if (slot === "market_news") settings.marketNews = { ...(settings.marketNews || {}), enabled: true };
      });
    });
    if (settings.openAccount) settings.openAccount.bind = false;
    if (settings.quickActions) {
      settings.quickActions.actions = [];
    }
    next.moduleSettings = settings;

    return next;
  }

  function normalizeConfig(config) {
    const source = config && typeof config === "object" ? config : {};
    const emphasis = source.emphasis && typeof source.emphasis === "object" ? source.emphasis : {};
    const moduleSettings = normalizeModuleSettings(source.moduleSettings);
    const legacySections = !source.sections && source.moduleOrder ? sectionsFromLegacyOrder(source.moduleOrder) : null;
    const sourceBrickPlan = enforceBrickPlanSafety(normalizeBrickPlan(source.brickPlan), moduleSettings);
    const brickSections =
      !source.sections && !legacySections && sourceBrickPlan.length
        ? sectionsFromBrickPlan(sourceBrickPlan, { label: cleanMetaText(source.name, "AI 积木编排", 28) })
        : null;
    const sections = normalizeSections(source.sections || legacySections || brickSections || DEFAULT_CONFIG.sections);
    const layoutPreset = normalizeLayoutPreset(source.layoutPreset || (typeof source.layout === "string" ? source.layout : ""));
    const modules = normalizeModuleVariants(source);
    const shouldUseExplicitLayout = Array.isArray(source.layout) && (source.generationMode === "brick-v2" || (!source.sections && !legacySections));
    const normalizedLayout = normalizeHomepageLayout(shouldUseExplicitLayout ? source.layout : null, sections);
    const moduleStyles = normalizeModuleStyles(source.moduleStyles, modules);
    const themePreset = normalizeThemeId(source.themePreset || source.theme);
    const personalizationStrength = normalizePersonalizationStrength(source.personalizationStrength);
    const designGenome = normalizeDesignGenome(source.designGenome || source.layoutGene || source.genome, designGenomeForLayout(layoutPreset));
    const pageStory = normalizePageStory(source.pageStory || source.heroNarrative || source.story, DESIGN_GENOMES[designGenome]?.story || "opsClarity");
    const shouldHydrateBricks =
      source.generationMode === "brick-v2" ||
      Number(source.blueprintVersion) >= 5 ||
      sourceBrickPlan.length > 0 ||
      normalizedLayout.layout.some((block) => block.brickId);
    const hydratedLayout = shouldHydrateBricks
      ? applyBrickMetadataToLayout(normalizedLayout.layout, sourceBrickPlan, modules)
      : normalizedLayout.layout;
    const layout = enforceHomepageLayoutSafety(hydratedLayout, moduleSettings);
    const brickPlan = sourceBrickPlan.length ? sourceBrickPlan : shouldHydrateBricks ? brickPlanFromLayout(layout) : [];

    const normalized = {
      schemaVersion: 4,
      blueprintVersion: Number(source.blueprintVersion) >= 5 ? 5 : 4,
      generationMode:
        source.generationMode === "brick-v2" || Number(source.blueprintVersion) >= 5
          ? "brick-v2"
          : source.generationMode
          ? cleanMetaText(source.generationMode, "", 32)
          : "preset-compatible",
      name: String(source.name || DEFAULT_CONFIG.name).slice(0, 28),
      layoutPreset,
      designGenome,
      pageStory,
      layout: layout.map((block) => attachModuleMetadata(block, modules)),
      themePreset,
      theme: themePreset,
      personalizationStrength,
      modules,
      moduleVariants: Object.keys(modules).reduce((variants, moduleId) => {
        variants[moduleId] = modules[moduleId].variant;
        return variants;
      }, {}),
      density: ["compact", "balanced", "spacious"].includes(source.density) ? source.density : DEFAULT_CONFIG.density,
      heroFocus: componentFromFeature(source.heroFocus || DEFAULT_CONFIG.heroFocus),
      moduleStyles,
      componentMorphs: normalizeComponentMorphs(source.componentMorphs, modules, moduleStyles),
      moduleSettings,
      sections,
      emphasis: {
        deposit: ["low", "medium", "high"].includes(emphasis.deposit) ? emphasis.deposit : DEFAULT_CONFIG.emphasis.deposit,
        openAccount: ["low", "medium", "high"].includes(emphasis.openAccount) ? emphasis.openAccount : DEFAULT_CONFIG.emphasis.openAccount,
        promo: ["low", "medium", "high"].includes(emphasis.promo) ? emphasis.promo : DEFAULT_CONFIG.emphasis.promo,
        accounts: ["low", "medium", "high"].includes(emphasis.accounts) ? emphasis.accounts : DEFAULT_CONFIG.emphasis.accounts,
      },
      heroTitleKey: i18nKey(source.heroTitleKey, COMPONENT_PROPS_SCHEMA.welcome_header.titleKey),
      heroSubtitleKey: i18nKey(source.heroSubtitleKey, COMPONENT_PROPS_SCHEMA.welcome_header.subtitleKey),
      aiSummary: String(source.aiSummary || DEFAULT_CONFIG.aiSummary).slice(0, 260),
      brickPlan,
      brickTrace: normalizeBrickTrace(source.brickTrace),
      pageIntent: source.pageIntent && typeof source.pageIntent === "object" ? clone(source.pageIntent) : null,
      compositionStrategy: cleanMetaText(source.compositionStrategy, "", 260),
      annotations: Array.isArray(source.annotations) ? source.annotations.slice(0, 24) : [],
    validationErrors: normalizedLayout.validationErrors,
    };

    return sanitizeCanonicalHomepageConfig(applyPageGovernanceRules(normalized, source));
  }

  function presetToConfig(preset, prompt) {
    return normalizeConfig({
      schemaVersion: 4,
      blueprintVersion: 4,
      name: preset.name,
      layoutPreset: preset.layout,
      themePreset: preset.themePreset || preset.theme,
      theme: preset.themePreset || preset.theme,
      personalizationStrength: preset.personalizationStrength || inferPersonalizationStrength(prompt, preset),
      density: preset.density,
      heroFocus: preset.heroFocus,
      modules: preset.modules,
      moduleStyles: preset.moduleStyles,
      moduleSettings: preset.moduleSettings,
      sections: preset.sections,
      emphasis: {
        deposit: preset.tags.includes("入金") || preset.tags.includes("转化") ? "high" : "medium",
        openAccount: preset.tags.includes("开户") || preset.tags.includes("新手") ? "high" : "medium",
        promo: preset.tags.includes("活动") || preset.tags.includes("比赛") ? "high" : "medium",
        accounts: preset.tags.includes("交易") || preset.tags.includes("账号") ? "high" : "medium",
      },
      aiSummary: preset.summary,
    });
  }

  function scorePreset(preset, text) {
    return preset.tags.reduce((score, tag) => score + (text.includes(tag.toLowerCase()) || text.includes(tag) ? 2 : 0), 0);
  }

  function presetByIntent(text) {
    const match = (id) => BLUEPRINT_PRESETS.find((preset) => preset.id === id);

    if (includesAny(text, ["ib", "代理", "渠道", "邀请", "推荐", "裂变", "开户链接"])) return match("partner-growth");
    if (includesAny(text, ["新手", "新客", "开户", "注册", "kyc", "首次"])) return match("onboarding-path");
    if (includesAny(text, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账号首屏", "账户首屏"])) return match("trader-console");
    if (includesAny(text, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) return match("executive-capital");
    if (includesAny(text, ["资产优先", "资产", "钱包", "余额", "资金安全", "资金优先"])) return match("asset-first");
    if (includesAny(text, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化"])) return match("campaign-growth");

    return match("standard-workbench");
  }

  function moveSlot(config, slot, position) {
    config.sections.forEach((section) => {
      section.slots = section.slots.filter((item) => item !== slot);
    });

    config.sections = config.sections.filter((section) => section.slots.length);

    if (position === "end") {
      config.sections.push({ id: `${slot}-lower`, type: "full", title: FEATURES[slot], slots: [slot] });
      return;
    }

    const target = config.sections[0] || { id: "ai-hero", type: "hero", title: "首页重点", slots: [] };
    target.slots = uniqueValidSlots(position === "front" ? [slot].concat(target.slots) : target.slots.concat(slot));
    config.sections[0] = target;
  }

  function applyInstructionToConfig(baseConfig, prompt) {
    const config = normalizeConfig(baseConfig);
    const text = String(prompt || "");
    const lower = text.toLowerCase();

    function setTheme(themePreset) {
      config.themePreset = themePreset;
      config.theme = themePreset;
    }

    if (includesAny(lower + text, ["活动", "增长", "营销", "比赛", "大赛", "转化"])) setTheme("darkTech");
    if (includesAny(lower + text, ["科技", "蓝", "清爽", "国际", "global", "金融"])) setTheme("blueFinance");
    if (includesAny(lower + text, ["淡金", "浅金", "轻金", "香槟金", "金色", "金色调", "gold"])) setTheme("lightGold");
    if (includesAny(lower + text, ["高净值", "vip", "黑金", "尊贵", "机构"])) setTheme("blackGold");
    if (includesAny(lower + text, ["极简", "白色", "极简白", "minimal"])) setTheme("minimalWhite");

    config.personalizationStrength = inferPersonalizationStrength(prompt, config);

    if (includesAny(lower + text, ["紧凑", "密集", "信息多"])) config.density = "compact";
    if (includesAny(lower + text, ["大气", "留白", "高端", "舒展", "品牌"])) config.density = "spacious";

    if (includesAny(lower + text, ["入金放大", "突出入金", "入金首屏", "入金更明显", "资金优先"])) {
      moveSlot(config, "fundActions", "front");
      config.emphasis.deposit = "high";
      config.heroFocus = "fundActions";
    }

    if (includesAny(lower + text, ["活动放大", "突出活动", "活动首屏", "比赛首屏", "奖池首屏"])) {
      moveSlot(config, "promoHighlight", "front");
      config.emphasis.promo = "high";
      config.heroFocus = "promoHighlight";
    }

    if (includesAny(lower + text, ["广告", "轮播", "banner", "焦点图", "首页轮播", "广告图", "广告位"])) {
      moveSlot(config, "adCarousel", "front");
      config.emphasis.promo = "high";
      config.heroFocus = "adCarousel";
    }

    if (includesAny(lower + text, ["开户首屏", "开户放大", "突出开户", "kyc优先", "新手优先"])) {
      moveSlot(config, "openAccountActions", "front");
      moveSlot(config, "onboardingProgress", "front");
      config.emphasis.openAccount = "high";
      config.heroFocus = "onboardingProgress";
    }

    if (includesAny(lower + text, ["交易账号列表放下方", "账号列表放下方", "账户列表放下方", "交易账号放下方", "账号放下方"])) {
      moveSlot(config, "tradingAccounts", "end");
      config.emphasis.accounts = "medium";
      if (config.heroFocus === "tradingAccounts") config.heroFocus = "balanceTotal";
    } else if (includesAny(lower + text, ["交易账号提前", "账号提前", "账号首屏", "交易工作台", "mt5优先"])) {
      moveSlot(config, "tradingAccounts", "front");
      config.emphasis.accounts = "high";
      config.heroFocus = "tradingAccounts";
    }

    if (wantsReferralLinkCardPrompt(text) && includesAny(lower + text, ["邀请首屏", "邀请码突出", "代理优先", "ib优先", "推荐链接放大", "推广链接"])) {
      moveSlot(config, "referral_link_card", "front");
      config.heroFocus = "referral_link_card";
    }

    config.layout = layoutFromSections(config.sections);
    return normalizeConfig(config);
  }

  function wantsRealAccountCards(text) {
    const source = String(text || "");
    return /真实(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(source) || /卡片[\s\S]{0,32}真实(?:交易)?账(?:号|户)/.test(source);
  }

  function wantsDemoAccountList(text) {
    const source = String(text || "");
    return /模拟(?:交易)?账(?:号|户)(?:列表)?/.test(source) || /demo\s*(account\s*)?list/i.test(source);
  }

  function applySmartIntentToConfig(baseConfig, prompt) {
    const config = normalizeConfig(baseConfig);
    const text = String(prompt || "");
    const signal = text.toLowerCase() + text;
    const positiveSignal = positiveIntentText(text);
    const realCardsRequested = wantsRealAccountCards(text);
    const demoListRequested = wantsDemoAccountList(text);
    const goldToneRequested = includesAny(positiveSignal, ["淡金", "浅金", "轻金", "香槟金", "金色", "金色调", "gold"]);

    if (goldToneRequested && !includesAny(positiveSignal, ["黑金", "高净值", "vip", "尊贵", "机构", "大客户"])) {
      config.themePreset = "lightGold";
      config.theme = "lightGold";
    }

    if (includesAny(positiveSignal, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) {
      mergeModuleVariants(config, {
        AssetOverview: "vipHero",
        WalletBalance: "premiumCard",
        QuickActions: "actionDock",
        PromotionBanner: "blackGoldVip",
      });
      mergeModuleStyles(config, {
        balanceTotal: "command",
        walletBalance: "wallet-actions",
        fundActions: "split-buttons",
        adCarousel: "immersive",
        promoHighlight: "clean",
        quickActions: "toolbar",
        tradingAccounts: "calm-table",
      });
      mergeModuleSettings(config, {
        wallet: { enabled: true, placement: "standalone", showFundActions: true },
        assets: { enabled: true, showFundActions: true },
        quickActions: { enabled: true, count: 5, display: "iconText" },
        tradingAccounts: { grouping: "separated", viewMode: "list" },
        openAccount: { placement: "insideTradingAccounts" },
      });
    }

    if (includesAny(positiveSignal, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化"])) {
      mergeModuleVariants(config, {
        AssetOverview: "compactTable",
        WalletBalance: "splitCurrency",
        QuickActions: "priorityButtons",
        PromotionBanner: "gradientHero",
      });
      mergeModuleStyles(config, {
        balanceTotal: "metric-strip",
        fundActions: "split-buttons",
        promoHighlight: "scoreboard",
        adCarousel: "immersive",
        quickActions: "compact-grid",
        tradingAccounts: "dense-cards",
      });
      mergeModuleSettings(config, {
        adCarousel: { enabled: true },
        quickActions: { enabled: true, count: 8, display: "iconText" },
        tradingAccounts: { grouping: "combined", viewMode: "card" },
      });
    }

    if (includesAny(positiveSignal, ["新手", "新客", "开户", "注册", "kyc", "首次"])) {
      mergeModuleVariants(config, {
        AssetOverview: "standard",
        WalletBalance: "compact",
        QuickActions: "priorityButtons",
        PromotionBanner: "splitVisual",
      });
      mergeModuleStyles(config, {
        balanceTotal: "quiet-card",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        onboardingProgress: "checklist",
        adCarousel: "clean",
        quickActions: "toolbar",
        tradingAccounts: "calm-table",
      });
      mergeModuleSettings(config, {
        wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
        quickActions: { enabled: true, count: 4, display: "iconText" },
        openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" },
        tradingAccounts: { grouping: "combined", viewMode: "list" },
      });
    }

    if (includesAny(positiveSignal, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账号首屏", "账户首屏"])) {
      mergeModuleVariants(config, {
        AssetOverview: "compactTable",
        WalletBalance: "compact",
        QuickActions: "minimalIcons",
        PromotionBanner: config.themePreset === "darkTech" ? "gradientHero" : "splitVisual",
      });
      mergeModuleStyles(config, {
        balanceTotal: "metric-strip",
        fundActions: "compact-row",
        onboardingProgress: "compact",
        adCarousel: "compact",
        quickActions: "toolbar",
        tradingAccounts: "workbench",
      });
      mergeModuleSettings(config, {
        quickActions: { enabled: true, count: 6, display: "iconOnly" },
        wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false },
        tradingAccounts: { grouping: "separated", viewMode: "switchable" },
        openAccount: { placement: "insideTradingAccounts" },
      });
    }

    if (wantsReferralLinkCardPrompt(text)) {
      mergeModuleVariants(config, {
        AssetOverview: "compactTable",
        WalletBalance: "splitCurrency",
        QuickActions: "priorityButtons",
        PromotionBanner: "gradientHero",
        ReferralLinkCard: "compactCard",
      });
      mergeModuleStyles(config, {
        referral_link_card: wantsReferralStatsPrompt(text) && !wantsReferralCoreOnlyPrompt(text) ? "stats-card" : "compact-card",
        promoHighlight: "scoreboard",
        quickActions: "compact-grid",
        openAccountActions: "horizontal",
        tradingAccounts: "dense-cards",
      });
      mergeModuleSettings(config, {
        referral: { enabled: false },
        referralLinkCard: {
          enabled: true,
          showPromoLink: true,
          showInviteCode: true,
          showShare: includesAny(positiveSignal, ["分享", "share"]),
          showStats: wantsReferralStatsPrompt(text) && !wantsReferralCoreOnlyPrompt(text),
          showOpens: true,
          showRegistrations: true,
          showAccounts: true,
          showRegistrationRate: true,
          showAccountRate: true,
        },
        openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" },
      });
    }

    if (includesAny(signal, ["不要广告", "不需要广告", "隐藏广告", "弱化广告", "不要轮播", "不需要轮播"])) {
      mergeModuleSettings(config, { adCarousel: { enabled: false } });
      config.sections.forEach((section) => {
        section.slots = section.slots.filter((slot) => slot !== "adCarousel");
      });
    }

    if (includesAny(signal, ["不要邀请", "不需要邀请", "隐藏邀请", "弱化邀请", "不要推荐"])) {
      mergeModuleSettings(config, { referral: { enabled: false }, referralLinkCard: { enabled: false } });
      config.sections.forEach((section) => {
        section.slots = section.slots.filter((slot) => slot !== "referralLink" && slot !== "referral_link_card");
      });
    }

    if (includesAny(signal, ["只要真实", "只看真实", "隐藏模拟", "不要模拟", "live only"])) {
      mergeModuleSettings(config, { tradingAccounts: { realEnabled: true, demoEnabled: false } });
    }

    if (includesAny(signal, ["只要模拟", "只看模拟", "demo only", "模拟优先"])) {
      mergeModuleSettings(config, { tradingAccounts: { realEnabled: false, demoEnabled: true } });
    }

    if (
      realCardsRequested &&
      demoListRequested
    ) {
      mergeModuleVariants(config, { TradingAccounts: "separatedList" });
      mergeModuleStyles(config, { tradingAccounts: "dense-cards" });
      mergeModuleSettings(config, {
        tradingAccounts: {
          enabled: true,
          realEnabled: true,
          demoEnabled: true,
          grouping: "separated",
          viewMode: "card",
          realViewMode: "card",
          demoViewMode: "list",
        },
      });
      moveSlot(config, "tradingAccounts", "end");
      config.emphasis.accounts = "high";
    } else if (
      includesAny(signal, [
        "两个列表",
        "两个账号列表",
        "分成两个列表",
        "分为两个列表",
        "真实交易账号列表",
        "模拟账号列表",
        "真实账号列表",
        "模拟账户列表",
        "live account 表格",
        "demo account 表格",
        "live list",
        "demo list",
      ])
    ) {
      mergeModuleStyles(config, { tradingAccounts: "calm-table" });
      mergeModuleSettings(config, {
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list" },
      });
      moveSlot(config, "tradingAccounts", "end");
      config.emphasis.accounts = "high";
    }

    if (!realCardsRequested && includesAny(signal, ["都是列表", "列表形式", "表格形式", "不要卡片", "不是卡片", "非卡片"])) {
      mergeModuleStyles(config, { tradingAccounts: "calm-table" });
      mergeModuleSettings(config, { tradingAccounts: { viewMode: "list" } });
    }

    if (includesAny(signal, ["快捷入口希望是2行", "快捷入口两行", "两行四个", "一行有4个", "一行4个", "2行", "两行"])) {
      mergeModuleStyles(config, { quickActions: "matrix" });
      mergeModuleSettings(config, { quickActions: { enabled: true, count: 8, display: "iconText" } });
    }

    if (includesAny(signal, ["不要绑定账号", "不要绑定账户", "不需要绑定账号", "不需要绑定账户", "不要绑定的入口"])) {
      mergeModuleSettings(config, { openAccount: { enabled: true, real: true, demo: true, bind: false } });
    }

    if (
      includesAny(signal, [
        "总览中不需要展示钱包余额",
        "总览不需要展示钱包余额",
        "不需要展示钱包余额、交易账户余额",
        "不需要展示钱包余额、交易账号余额",
        "不要展示钱包余额、交易账户余额",
        "不要展示钱包余额、交易账号余额",
      ])
    ) {
      mergeModuleSettings(config, { assets: { showAccountBreakdown: false, showWalletBreakdown: false } });
    }

    if (includesAny(signal, ["淡色", "浅色", "扁平化", "扁平", "简洁白"])) {
      if (!goldToneRequested) {
        config.themePreset = "minimalWhite";
        config.theme = "minimalWhite";
      }
      config.density = config.density === "compact" ? "balanced" : config.density;
      mergeModuleStyles(config, {
        balanceTotal: "quiet-card",
        adCarousel: "clean",
        quickActions: "matrix",
        tradingAccounts: "calm-table",
      });
    }

    if (includesAny(signal, ["极简", "少一点", "减少入口", "少操作"])) {
      mergeModuleVariants(config, {
        QuickActions: "minimalIcons",
        PromotionBanner: "splitVisual",
      });
      mergeModuleSettings(config, { quickActions: { count: 4, display: "iconOnly" } });
      config.density = "spacious";
    }

    if (includesAny(signal, ["信息多", "高频", "密集", "紧凑"])) {
      mergeModuleVariants(config, {
        AssetOverview: "compactTable",
        QuickActions: "minimalIcons",
      });
      mergeModuleSettings(config, { quickActions: { count: 8, display: "iconOnly" } });
      config.density = "compact";
    }

    config.sections = config.sections
      .map((section) => ({ ...section, slots: uniqueValidSlots(section.slots) }))
      .filter((section) => section.slots.length);

    const visibleSlots = config.sections.flatMap((section) => section.slots);
    if (!visibleSlots.includes(config.heroFocus)) {
      config.heroFocus = visibleSlots[0] || "balanceTotal";
    }

    config.layout = layoutFromSections(config.sections);
    return normalizeConfig(config);
  }

  function promptToConfig(prompt, variant = 0) {
    const text = String(prompt || "");
    const directConfig = parseConfigFromText(text);
    if (directConfig) return directConfig;

    return buildBrickDrivenConfig(text, variant);
  }

  function parseConfigFromText(text) {
    const source = String(text || "").trim();
    if (!source) return null;

    const candidates = [];
    const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) candidates.push(fenced[1].trim());
    candidates.push(source);

    const jsonLike = source.match(/\{[\s\S]*\}/);
    if (jsonLike?.[0]) candidates.push(jsonLike[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && (Array.isArray(parsed.layout) || parsed.sections || parsed.layoutPreset || parsed.theme)) {
          const normalized = normalizeConfig({
            ...parsed,
            aiSummary: parsed.aiSummary || "已解析粘贴的 AI 首页蓝图，并完成必需功能校验。",
          });
          normalized.aiSummary = normalized.validationErrors.length
            ? `已拦截 ${normalized.validationErrors.length} 个非法配置项，并使用安全组件继续渲染。`
            : "已解析粘贴的 AI 首页蓝图，并完成必需功能校验。";
          return normalized;
        }
      } catch (error) {
        // Continue trying other candidate snippets.
      }
    }

    return null;
  }

  function generateSchemeOptions(prompt, count = 4) {
    const text = String(prompt || "");
    return Array.from({ length: count }, (_, index) => buildBrickDrivenConfig(text, index));
  }

  function randomConfig(prompt) {
    const salt = Math.floor(Math.random() * HOME_BRICKS.length);
    return buildBrickDrivenConfig(prompt || "", salt);
  }

  function optimizeConfig(config, details) {
    const prompt = details?.prompt || "";
    const annotationText = (details?.annotations || [])
      .map((item, index) => `批注${index + 1}${item.target ? `（${item.target}）` : ""}: ${item.text}`)
      .join("。");
    const source = normalizeConfig(config);
    const optimized = buildBrickDrivenConfig(`${prompt}。${annotationText}`, details?.variant || 0, source);

    optimized.aiSummary = annotationText
      ? `已根据右侧预览批注优化布局。${optimized.aiSummary}`
      : `已根据当前输入优化布局。${optimized.aiSummary}`;
    optimized.annotations = details?.annotations || [];

    return normalizeConfig(optimized);
  }

  function readStoredConfig(key, fallback) {
    try {
      const saved = window.localStorage.getItem(key);
      const normalized = normalizeConfig(saved ? JSON.parse(saved) : fallback);
      if (normalized.validationErrors.length) {
        return {
          ...normalizeConfig(fallback),
          aiSummary: "已检测到非法首页配置，自动启用默认安全首页。",
        };
      }
      return normalized;
    } catch (error) {
      return normalizeConfig(fallback);
    }
  }

  function loadConfig() {
    return readStoredConfig(STORAGE_KEY, DEFAULT_CONFIG);
  }

  function saveConfig(config) {
    const candidate = normalizeConfig(config);
    const normalized = candidate.validationErrors.length ? normalizeConfig(DEFAULT_CONFIG) : candidate;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function loadDraft() {
    return readStoredConfig(DRAFT_STORAGE_KEY, loadConfig());
  }

  function saveDraft(config) {
    const candidate = normalizeConfig(config);
    const normalized = candidate.validationErrors.length ? normalizeConfig(DEFAULT_CONFIG) : candidate;
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  function resetConfig() {
    window.localStorage.removeItem(STORAGE_KEY);
    return normalizeConfig(DEFAULT_CONFIG);
  }

  function cleanClone(node) {
    if (!node) return null;

    const cloneNode = node.cloneNode(true);
    cloneNode.classList.remove("is-home-spotlight");
    cloneNode.removeAttribute("style");
    delete cloneNode.dataset.homeModuleLabel;

    return cloneNode;
  }

  function collectTemplates(target) {
    const view = target.defaultView || window;
    if (view.__homeBlueprintTemplates) return view.__homeBlueprintTemplates;

    const templates = {
      accountOverview: cleanClone(target.querySelector('[data-home-module="accountOverview"], .balance-overview')),
      onboardingProgress: cleanClone(target.querySelector('[data-home-module="onboardingProgress"], .account-progress-card')),
      promoBanner: cleanClone(target.querySelector('[data-home-module="promoBanner"], .promo-banner')),
      quickActions: cleanClone(target.querySelector('[data-home-module="quickActions"], .quick-panel')),
      referralCard: cleanClone(target.querySelector('[data-home-module="referralCard"], .refer-card')),
      tradingAccounts: cleanClone(target.querySelector('[data-home-module="tradingAccounts"], .accounts-panel')),
    };

    view.__homeBlueprintTemplates = templates;
    return templates;
  }

  function icon(name) {
    const icons = {
      user: '<circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M18 8v6" /><path d="M15 11h6" />',
      demo: '<rect x="4" y="5" width="16" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="M8 9h8" />',
      link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />',
    };

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.user}</svg>`;
  }

  function actionIcon(name) {
    const icons = {
      deposit: '<path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 19h14" />',
      withdraw: '<path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 5h14" />',
      transfer: '<path d="M7 7h11" /><path d="m15 4 3 3-3 3" /><path d="M17 17H6" /><path d="m9 14-3 3 3 3" />',
      history: '<rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 9h6" /><path d="M9 13h4" />',
      positions: '<rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8" /><path d="M8 13h5" />',
      copy: '<rect x="9" y="5" width="10" height="14" rx="2" /><rect x="5" y="9" width="10" height="10" rx="2" />',
      trophy: '<path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 7H4a3 3 0 0 0 3 3" /><path d="M17 7h3a3 3 0 0 1-3 3" />',
      chart: '<path d="M4 19h16" /><path d="M6 16v3" /><path d="M10 12v7" /><path d="M14 14v5" /><path d="M18 8v11" />',
    };

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chart}</svg>`;
  }

  function moduleStyle(config, slot) {
    const styleSlot = COMPONENT_STYLE_FEATURE_MAP[slot] || slot;
    return config?.moduleStyles?.[styleSlot] || MODULE_STYLE_DEFAULTS[styleSlot] || "standard";
  }

  function moduleVariant(config, slot) {
    const moduleId = moduleKeyFor(slot);
    return moduleId ? config?.modules?.[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId] : moduleStyle(config, slot);
  }

  function wrapFeature(doc, slot, className, config) {
    const element = doc.createElement("section");
    element.className = `ai-feature-slot ${className || ""}`.trim();
    element.dataset.homeFeature = slot;
    element.dataset.homeFeatureLabel = featureLabel(slot);
    element.dataset.moduleVariant = moduleVariant(config, slot);
    element.dataset.moduleStyle = moduleStyle(config, slot);
    return element;
  }

  function fundActionsEnabled(config) {
    const settings = config.moduleSettings;
    return Boolean(settings.assets.showFundActions || (settings.wallet.enabled && settings.wallet.showFundActions));
  }

  function openAccountChoices(config) {
    const settings = config.moduleSettings.openAccount;
    if (!settings.enabled) return [];

    return [
      settings.real ? { id: "real", icon: "user", label: t("home.action.realAccount"), primary: true, action: "openAccount" } : null,
      settings.demo ? { id: "demo", icon: "demo", label: t("home.action.demoAccount"), action: "openAccount" } : null,
      settings.bind ? { id: "bind", icon: "link", label: t("home.action.bindAccount"), action: "bindAccount" } : null,
    ].filter(Boolean);
  }

  function actionLinks(config) {
    const intent = pageIntentFromConfig(config || {});
    if (intent === "deposit") {
      return `
        <a class="ai-fund-command primary" data-home-action="deposit" href="#fund-actions">
          ${actionIcon("deposit")}
          <span><b>${t("home.action.deposit")}</b><small>最高赠金 $300</small></span>
        </a>
      `;
    }

    return `
      <a class="ai-fund-command primary" data-home-action="deposit" href="#fund-actions">
        ${actionIcon("deposit")}
        <span><b>${t("home.action.deposit")}</b><small>${t("home.action.depositHint")}</small></span>
      </a>
      <a class="ai-fund-command" data-home-action="withdraw" href="#fund-actions">
        ${actionIcon("withdraw")}
        <span><b>${t("home.action.withdraw")}</b><small>${t("home.action.withdrawHint")}</small></span>
      </a>
    `;
  }

  function renderWelcomeHeader(doc, config, props = {}) {
    const feature = wrapFeature(doc, "welcome_header", "ai-welcome-feature", config);
    const safeProps = sanitizeComponentProps("welcome_header", props, []);
    feature.innerHTML = `
      <div>
        <span>${escapeHtml(t(safeProps.actionKey))}</span>
        <h1 data-home-title>${escapeHtml(t(safeProps.titleKey))}</h1>
        <p data-home-subtitle>${escapeHtml(t(safeProps.subtitleKey))}</p>
      </div>
      <div class="welcome-actions">
        <a class="dashboard-customize-link" href="./home-layout-admin.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /><path d="M4 12h2" /><path d="M18 12h2" /><path d="m6.3 6.3 1.4 1.4" /><path d="m16.3 16.3 1.4 1.4" /><path d="M12 4v2" /><path d="M12 18v2" /><path d="m17.7 6.3-1.4 1.4" /><path d="m7.7 16.3-1.4 1.4" /></svg>
          ${escapeHtml(t(safeProps.actionKey))}
        </a>
        <span>${escapeHtml(t(safeProps.dateKey))}</span>
      </div>
    `;
    return feature;
  }

  function walletMetricRows(walletCodes = []) {
    const samples = {
      USD: { label: "USD", balance: "--", available: "--" },
      EUR: { label: "EUR", balance: "--", available: "--" },
      USDT: { label: "USDT", balance: "--", available: "--" },
      XAU: { label: "XAU", balance: "--", available: "--" },
      GBP: { label: "GBP", balance: "--", available: "--" },
      JPY: { label: "JPY", balance: "--", available: "--" },
      CNH: { label: "CNH", balance: "--", available: "--" },
    };
    const source = Array.isArray(walletCodes) && walletCodes.length ? walletCodes : ["USD", "EUR", "USDT"];

    return source.map((code) => samples[code] || { label: code, balance: "--", available: "--" });
  }

  function walletCurrencyMark(currency) {
    const code = String(currency || "").toUpperCase();
    const marks = {
      AUD: "🇦🇺",
      CAD: "🇨🇦",
      CHF: "🇨🇭",
      CNH: "🇨🇳",
      CNY: "🇨🇳",
      EUR: "🇪🇺",
      GBP: "🇬🇧",
      HKD: "🇭🇰",
      JPY: "🇯🇵",
      NZD: "🇳🇿",
      SGD: "🇸🇬",
      USD: "🇺🇸",
      USDT: "₮",
      XAU: "Au",
    };
    return marks[code] || code.slice(0, 1) || "?";
  }

  function renderBalanceTotal(doc, config, props = {}) {
    const feature = wrapFeature(doc, "asset_overview", "ai-balance-feature", config);
    const safeProps = sanitizeComponentProps("asset_overview", props, []);
    const assetSettings = config.moduleSettings.assets;
    const visibleFields = Array.isArray(assetSettings.visibleFields) && assetSettings.visibleFields.length
      ? assetSettings.visibleFields
      : ["total", "wallet", "tradingAccount"];
    const isTrustHomepage = pageIntentFromConfig(config) === "brand";
    const walletMerged =
      assetSettings.showWalletBreakdown &&
      config.moduleSettings.wallet.enabled &&
      config.moduleSettings.wallet.placement === "mergedWithAssets";
    const primaryMetric = visibleFields.includes("total")
      ? { label: safeProps.totalLabelKey, target: "data-summary-total" }
      : visibleFields.includes("wallet")
      ? { label: safeProps.walletLabelKey, target: "data-summary-wallets" }
      : { label: safeProps.accountsLabelKey, target: "data-summary-accounts" };
    const accountMarkup = visibleFields.includes("tradingAccount") && assetSettings.showAccountBreakdown
      ? `
        <span>
          <small>${escapeHtml(t(safeProps.accountsLabelKey))}</small>
          <b data-summary-accounts>--</b>
        </span>
      `
      : "";
    const walletMarkup = visibleFields.includes("wallet") && walletMerged
      ? `
        <span>
          <small>${escapeHtml(t(safeProps.walletLabelKey))}</small>
          <b data-summary-wallets>--</b>
        </span>
      `
      : "";
    const walletCodeMarkup = visibleFields.includes("wallet") && assetSettings.wallets.length
      ? walletMetricRows(assetSettings.wallets)
          .slice(0, 4)
          .map(
            (wallet) => `
              <span>
                <small>${escapeHtml(wallet.label)} Wallet</small>
                <b>${escapeHtml(wallet.balance)}</b>
              </span>
            `,
          )
          .join("")
      : "";
    const availableMarkup = assetSettings.showAvailable
      ? `
        <span>
          <small>可用资金</small>
          <b>--</b>
        </span>
      `
      : "";
    const marginMarkup = assetSettings.showMargin
      ? `
        <span>
          <small>保证金占用</small>
          <b>--</b>
        </span>
      `
      : "";
    const riskMarkup = assetSettings.showRiskLevel
      ? `
        <span>
          <small>风险等级</small>
          <b>--</b>
        </span>
      `
      : "";
    const detailMarkup = [accountMarkup, walletMarkup, walletCodeMarkup, availableMarkup, marginMarkup, riskMarkup].filter(Boolean).join("");
    const hasBreakdown = Boolean(detailMarkup);
    const trustMarkup = isTrustHomepage
      ? `
        <div class="ai-trust-status" aria-label="资金安全状态">
          <span><small>资金安全</small><b>隔离托管</b></span>
          <span><small>平台可用性</small><b>99.99%</b></span>
          <span><small>服务时间</small><b>24/5</b></span>
        </div>
      `
      : "";
    const noteMarkup = !hasBreakdown
      ? `<p>${escapeHtml(t("home.asset.totalOnly"))}</p>`
      : walletMerged
      ? `<p data-summary-wallet-note>${escapeHtml(t(safeProps.walletNoteKey))}</p>`
      : `<p>${escapeHtml(config.moduleSettings.wallet.enabled ? t("home.asset.walletStandalone") : t("home.asset.accountsOnly"))}</p>`;
    const fundMarkup = assetSettings.showFundActions && !hasStandaloneFundActions(config)
      ? `<div class="ai-inline-fund-actions">${actionLinks(config)}</div>`
      : "";

    feature.innerHTML = `
      <div class="ai-orbit-label">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <b>${escapeHtml(t(safeProps.titleKey))}</b>
      </div>
	      <div class="ai-balance-amount">
	        <small>${escapeHtml(t(primaryMetric.label))}</small>
	        <strong ${primaryMetric.target}>--</strong>
	      </div>
	      ${trustMarkup}
	      ${hasBreakdown ? `<div class="ai-balance-breakdown">${detailMarkup}</div>` : ""}
      ${noteMarkup}
      ${fundMarkup}
    `;

    return feature;
  }

  function renderWalletBalance(doc, config, props = {}) {
    const feature = wrapFeature(doc, "wallet_balance", "ai-wallet-feature", config);
    const safeProps = sanitizeComponentProps("wallet_balance", props, []);
    const fundMarkup = config.moduleSettings.wallet.showFundActions && !hasStandaloneFundActions(config)
      ? `<div class="ai-inline-fund-actions">${actionLinks(config)}</div>`
      : "";

    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <div class="ai-wallet-amount">
        <small>${escapeHtml(t(safeProps.totalLabelKey))}</small>
        <strong data-summary-wallets>--</strong>
        <p data-summary-wallet-note>${escapeHtml(t(safeProps.noteKey))}</p>
      </div>
      <div class="ai-wallet-breakdown">
        <span><small>USD</small><b>9,999.99</b></span>
        <span><small>EUR</small><b>1,200.00</b></span>
      </div>
      ${fundMarkup}
    `;

    return feature;
  }

  function renderFundActions(doc, config) {
    const feature = wrapFeature(doc, "fundActions", "ai-action-feature", config);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t("home.quick.eyebrow"))}</span>
        <strong>${escapeHtml(t("home.quick.title"))}</strong>
      </div>
      <div class="ai-fund-dock">
        ${actionLinks(config)}
      </div>
    `;

    return feature;
  }

  function renderOpenAccountActions(doc, config) {
    const feature = wrapFeature(doc, "openAccountActions", "ai-open-feature", config);
    const choices = openAccountChoices(config);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t("home.action.openAccount"))}</span>
        <strong>${escapeHtml(t("home.action.openAccount"))}</strong>
      </div>
      <div class="ai-open-actions">
        ${choices
          .map(
            (choice) =>
              `<button class="account-entry-action${choice.primary ? " primary" : ""}" data-home-action="${escapeHtml(choice.action)}" data-account-entry-kind="${escapeHtml(choice.id)}" type="button"><span>${icon(choice.icon)}</span><b>${escapeHtml(choice.label)}</b></button>`,
          )
          .join("")}
      </div>
    `;
    return feature;
  }

  function renderOnboardingProgress(doc, config) {
    const feature = wrapFeature(doc, "onboarding_guide", "ai-onboarding-feature", config);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t("home.onboarding.eyebrow"))}</span>
        <strong>${escapeHtml(t("home.onboarding.title"))}</strong>
      </div>
      <div class="ai-path-meter"><span></span></div>
      <div class="ai-path-steps">
        <a class="active" data-home-action="openAccount" href="#accounts"><b>01</b><span>${escapeHtml(t("home.action.openAccount"))}</span></a>
        <a data-home-action="deposit" href="#fund-actions"><b>02</b><span>${escapeHtml(t("home.action.deposit"))}</span></a>
        <a data-home-action="orders" href="#accounts"><b>03</b><span>${escapeHtml(t("home.action.positions"))}</span></a>
      </div>
    `;
    return feature;
  }

  function renderPromoHighlight(doc, config, props = {}) {
    const feature = wrapFeature(doc, "promo_banner", "ai-promo-feature", config);
    const safeProps = sanitizeComponentProps("promo_banner", props, []);
    feature.id = "promo";
    if (pageIntentFromConfig(config) === "deposit" || moduleVariant(config, "promoHighlight") === "depositLadder") {
      const tiers = [
        { amount: "--", bonus: "--", label: "Tier 1" },
        { amount: "--", bonus: "--", label: "Tier 2" },
        { amount: "--", bonus: "--", label: "Tier 3" },
      ];
      feature.innerHTML = `
        <div class="ai-deposit-ladder-copy">
          <span>${escapeHtml(t("home.depositBonus.eyebrow"))}</span>
          <strong>${escapeHtml(t("home.depositBonus.title"))}</strong>
          <p>${escapeHtml(t("home.depositBonus.meta"))}</p>
        </div>
        <div class="ai-deposit-ladder-tiers" aria-label="入金奖励档位">
          ${tiers
            .map(
              (tier) => `
                <article>
                  <small>${escapeHtml(tier.label)}</small>
                  <b>${escapeHtml(tier.amount)}</b>
                  <span>赠金 ${escapeHtml(tier.bonus)}</span>
                </article>
              `,
            )
            .join("")}
        </div>
        <p class="ai-deposit-ladder-note">主入金入口已放在右侧资金操作区，避免首屏重复按钮。</p>
      `;
      return feature;
    }
    feature.innerHTML = `
      <div class="ai-promo-mark">${actionIcon("trophy")}</div>
      <div class="ai-promo-copy">
        <span>${escapeHtml(t(safeProps.badgeKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
        <p>${escapeHtml(t(safeProps.metaKey))}</p>
      </div>
      <a data-home-action="promo" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.ctaKey))}</a>
    `;
    return feature;
  }

  function renderAdCarousel(doc, config) {
    const feature = wrapFeature(doc, "adCarousel", "ai-ad-carousel-feature", config);
    const isCampaign = config.layoutPreset === "conversionFirst" || moduleVariant(config, "adCarousel") === "gradientHero";
    const slides = isCampaign
      ? [
          {
            badge: "Contest",
            title: "五月盈利王挑战赛",
            copy: "奖池 $9,600，真实账户与模拟账户均可参与。",
            href: "#promo",
            action: "promo",
            cta: "查看详情",
          },
          {
            badge: "Prize Pool",
            title: "交易大赛奖池加码",
            copy: "按净入金、交易量和收益率拆分奖励，活动入口首屏直达。",
            href: "#fund-actions",
            action: "deposit",
            cta: "立即入金",
          },
          {
            badge: "Promotion",
            title: "推广链接同步投放",
            copy: "开户链接、邀请码和二维码单独成模块，便于运营追踪。",
            href: "#referral",
            action: "referral",
            cta: "查看推广",
          },
        ]
      : [
          {
            badge: "Featured",
            title: "Black Gold VIP Trading Month",
            copy: "高净值客户专属点差权益、入金礼包和一对一账户服务。",
            href: "#fund-actions",
            action: "deposit",
            cta: "立即入金",
          },
          {
            badge: "Contest",
            title: "5月盈利王挑战赛",
            copy: "奖池 $9,600，真实账户与模拟账户均可参与活动曝光。",
            href: "#promo",
            action: "promo",
            cta: "查看活动",
          },
          {
            badge: "New Account",
            title: "开通 MT5 Live 账户",
            copy: "开户链接、KYC、首次入金入口集中呈现，减少客户流失。",
            href: "#accounts",
            action: "openAccount",
            cta: "去开户",
          },
        ];

    feature.innerHTML = `
      <div class="ai-ad-carousel" data-ad-carousel>
        <div class="ai-ad-slides">
          ${slides
            .map(
              (slide, index) => `
                <article class="ai-ad-slide${index === 0 ? " active" : ""}" data-ad-slide>
                  <span>${escapeHtml(slide.badge)}</span>
                  <strong>${escapeHtml(slide.title)}</strong>
                  <p>${escapeHtml(slide.copy)}</p>
                  <a href="${escapeHtml(slide.href)}" data-home-action="${escapeHtml(slide.action)}">${escapeHtml(slide.cta)}</a>
                </article>
              `,
            )
            .join("")}
        </div>
        <div class="ai-ad-controls">
          <button type="button" data-ad-prev aria-label="上一张广告">‹</button>
          <div class="ai-ad-dots" aria-label="广告轮播分页">
            ${slides
              .map((slide, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-ad-dot="${index}" aria-label="广告 ${index + 1}"></button>`)
              .join("")}
          </div>
          <button type="button" data-ad-next aria-label="下一张广告">›</button>
        </div>
      </div>
    `;
    return feature;
  }

  function renderQuickActions(doc, config, props = {}) {
    const feature = wrapFeature(doc, "quick_actions", "ai-quick-feature", config);
    const quickSettings = config.moduleSettings.quickActions;
    const variant = moduleVariant(config, "quickActions");
    const safeProps = sanitizeComponentProps("quick_actions", props, []);
    const configuredActions = Array.isArray(quickSettings.actions) ? quickSettings.actions : [];
    const actionPool = configuredActions;
    const actions = actionPool.slice(0, Math.min(quickSettings.count, MAX_QUICK_ACTIONS));

    feature.dataset.quickDisplay = variant === "minimalIcons" ? "iconOnly" : quickSettings.display;
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <div class="ai-shortcut-matrix">
        ${actions.length
          ? actions
          .map(
            (item) => `
              <a data-home-action="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(t(item.labelKey))}" data-tooltip="${escapeHtml(t(item.labelKey))}">
                ${item.icon === "user" ? icon("user") : actionIcon(item.icon)}<span>${escapeHtml(t(item.labelKey))}</span>
              </a>
            `,
          )
          .join("")
          : Array.from({ length: Math.min(quickSettings.count, 6) })
              .map(() => `<span class="ai-shortcut-placeholder" aria-hidden="true"></span>`)
              .join("")}
      </div>
    `;
    return feature;
  }

  function renderReferralLinkCard(doc, config, props = {}) {
    const feature = wrapFeature(doc, "referral_link_card", "ai-referral-feature ai-referral-card-feature", config);
    const safeProps = sanitizeComponentProps("referral_link_card", props, []);
    const settings = config.moduleSettings.referralLinkCard || DEFAULT_MODULE_SETTINGS.referralLinkCard;
    const copyButton = (labelKey) => `
      <button type="button" aria-label="${escapeHtml(t(labelKey))}" disabled>
        ${actionIcon("copy")}
      </button>
    `;
    const core = [
      settings.showPromoLink
        ? `<div class="ai-referral-line wide"><small>${escapeHtml(t(safeProps.promoLinkLabelKey))}</small><span>--</span>${copyButton(safeProps.copyLinkKey)}</div>`
        : "",
      settings.showInviteCode
        ? `<div class="ai-referral-line"><small>${escapeHtml(t(safeProps.inviteCodeLabelKey))}</small><span>--</span>${copyButton(safeProps.copyCodeKey)}</div>`
        : "",
      settings.showShare ? `<button class="ai-referral-qr" type="button" disabled>${actionIcon("copy")}<span>${escapeHtml(t(safeProps.shareKey))}</span></button>` : "",
    ]
      .filter(Boolean)
      .join("");
    const stats = settings.showStats
      ? [
          settings.showOpens ? `<span><small>${escapeHtml(t(safeProps.opensKey))}</small><b>--</b></span>` : "",
          settings.showRegistrations ? `<span><small>${escapeHtml(t(safeProps.registrationsKey))}</small><b>--</b></span>` : "",
          settings.showAccounts ? `<span><small>${escapeHtml(t(safeProps.accountsKey))}</small><b>--</b></span>` : "",
          settings.showRegistrationRate ? `<span><small>${escapeHtml(t(safeProps.registrationRateKey))}</small><b>--</b></span>` : "",
          settings.showAccountRate ? `<span><small>${escapeHtml(t(safeProps.accountRateKey))}</small><b>--</b></span>` : "",
        ]
          .filter(Boolean)
          .join("")
      : "";

    feature.id = "referral-link-card";
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      ${stats ? `<div class="ai-referral-stats">${stats}</div>` : ""}
      <div class="ai-referral-core">${core}</div>
    `;
    return feature;
  }

  function renderReferralLink(doc, config) {
    const feature = wrapFeature(doc, "referralLink", "ai-referral-feature", config);
    const settings = config.moduleSettings.referral;
    const stats = [
      settings.showClicks ? "<span><small>打开</small><b>123</b></span>" : "",
      settings.showRegistrations ? "<span><small>邀请注册</small><b>123</b></span>" : "",
      settings.showTradingAccounts ? "<span><small>交易账号</small><b>50</b></span>" : "",
    ]
      .filter(Boolean)
      .join("");
    const core = [
      settings.showInviteCode
        ? `<div class="ai-referral-line"><span>555555690-123</span><button type="button" aria-label="复制邀请码" data-copy-value="555555690-123">${actionIcon("copy")}</button></div>`
        : "",
      settings.showPromoLink
        ? `<div class="ai-referral-line wide"><span>http://user-1.hcs55.com:38080/regist-real?invitid=555555690-123</span><button type="button" aria-label="复制注册链接" data-copy-value="http://user-1.hcs55.com:38080/regist-real?invitid=555555690-123">${actionIcon("copy")}</button></div>`
        : "",
      settings.showQrCode
        ? `<button class="ai-referral-qr" type="button" aria-label="打开邀请二维码">${actionIcon("copy")}<span>二维码</span></button>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t("home.referral.eyebrow"))}</span>
        <strong>${escapeHtml(t("home.referral.title"))}</strong>
      </div>
      ${stats ? `<div class="ai-referral-stats">${stats}</div>` : ""}
      <div class="ai-referral-core">${core}</div>
    `;
    feature.id = "referral";
    return feature;
  }

  function renderTradingAccounts(doc, config, props = {}) {
    const feature = wrapFeature(doc, "trading_accounts_list", "ai-accounts-feature", config);
    const safeProps = sanitizeComponentProps("trading_accounts_list", props, []);
    const accountSettings = config.moduleSettings.tradingAccounts;
    const isSeparated = accountSettings.grouping === "separated" && accountSettings.realEnabled && accountSettings.demoEnabled;
    const realViewMode = accountSettings.realViewMode || (accountSettings.viewMode === "list" ? "list" : "card");
    const demoViewMode = accountSettings.demoViewMode || (accountSettings.viewMode === "card" ? "card" : "list");
    const realOrder = accountSettings.demoFirst ? 2 : 1;
    const demoOrder = accountSettings.demoFirst ? 1 : 2;

    if (isSeparated) {
      feature.id = "accounts";
      feature.classList.add("is-split-accounts");
      feature.dataset.accountPresentation = realViewMode === "card" && demoViewMode === "list" ? "real-cards-demo-list" : "separated";
      feature.innerHTML = `
        <div class="ai-accounts-command split">
          <div>
            <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
            <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
          </div>
        </div>
        <div class="accounts-split-view" data-accounts-split-view>
          <section class="account-split-module account-split-module-real" data-account-section="real" data-account-view="${escapeHtml(realViewMode)}" style="order:${realOrder}">
            <header>
              <div>
                <span class="section-kicker">真实账号</span>
                <strong>真实交易账号列表</strong>
              </div>
              <div class="account-section-tools">
                <b data-real-account-count>0</b>
                <button class="account-create-button" data-home-action="openAccount" data-account-entry-kind="real" type="button">
                  <span>${icon("user")}</span>
                  创建真实交易账号
                </button>
              </div>
            </header>
            <div class="real-account-card-grid" data-real-account-cards></div>
          </section>
          <section class="account-split-module account-split-module-demo" data-account-section="demo" data-account-view="${escapeHtml(demoViewMode)}" style="order:${demoOrder}">
            <header>
              <div>
                <span class="section-kicker">模拟账号</span>
                <strong>模拟交易账号列表</strong>
              </div>
              <b data-demo-account-count>0</b>
            </header>
            <div data-demo-account-list></div>
          </section>
        </div>
        <div class="accounts-card-view" data-accounts-card-view hidden></div>
        <div class="accounts-list-view" data-accounts-list-view hidden></div>
      `;
      return feature;
    }

    const filterButtons = [
      accountSettings.realEnabled && accountSettings.demoEnabled ? '<button class="active" data-account-filter="all" type="button">全部</button>' : "",
      accountSettings.realEnabled ? '<button data-account-filter="real" type="button">真实</button>' : "",
      accountSettings.demoEnabled ? '<button data-account-filter="demo" type="button">模拟</button>' : "",
    ].join("");
    const viewToggle =
      accountSettings.viewMode === "switchable"
        ? `
          <div class="view-toggle" aria-label="交易账号展示方式">
            <button class="active" data-view-mode="card" type="button" aria-label="卡片视图">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
            </button>
            <button data-view-mode="list" type="button" aria-label="列表视图">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12" /><path d="M8 12h12" /><path d="M8 18h12" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></svg>
            </button>
          </div>
        `
        : `<span class="ai-fixed-view-label">${escapeHtml(t(safeProps.fixedViewLabelKey))}</span>`;

    feature.id = "accounts";
    feature.innerHTML = `
      <div class="ai-accounts-command">
        <div>
          <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
          <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
        </div>
        <div class="account-toolbar">
          <div class="account-filter" role="tablist" aria-label="账号类型筛选">
            ${filterButtons}
          </div>
          <div class="account-open-menu" data-account-open-menu></div>
          ${viewToggle}
        </div>
      </div>
      <div class="accounts-card-view" data-accounts-card-view></div>
      <div class="accounts-list-view" data-accounts-list-view hidden></div>
    `;
    return feature;
  }

  function renderUserKycRail(doc, config, props = {}) {
    const feature = wrapFeature(doc, "user_kyc_rail", "ai-user-rail-feature", config);
    const safeProps = sanitizeComponentProps("user_kyc_rail", props, []);
    const kycStatus = config.moduleSettings.userKycRail?.kycStatus || "verified";
    const kycLabel = {
      verified: "Verified",
      pending: "待完成",
      reviewing: "审核中",
      rejected: "需补充",
    }[kycStatus] || "Verified";
    const summaryText =
      kycStatus === "verified"
        ? t(safeProps.summaryKey)
        : kycStatus === "reviewing"
        ? "KYC 正在审核中，完成后即可解锁真实账号和入金路径。"
        : kycStatus === "rejected"
        ? "KYC 资料需补充，请先处理认证再继续交易流程。"
        : "KYC 待完成，开户和首次入金路径已放在首页。";
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <div class="ai-user-card">
        <span class="ai-user-avatar">H</span>
        <div>
          <b>Huang</b>
          <small>${escapeHtml(summaryText)}</small>
        </div>
      </div>
      <div class="ai-status-list" data-kyc-status="${escapeHtml(kycStatus)}">
        <span><small>KYC</small><b>${escapeHtml(kycLabel)}</b></span>
        <span><small>Local Time</small><b>13:47</b></span>
        <span><small>Wallet</small><b data-summary-wallets>--</b></span>
      </div>
    `;
    return feature;
  }

  function renderAccountPerformance(doc, config, props = {}) {
    const feature = wrapFeature(doc, "trading_account_highlight", "ai-performance-feature", config);
    const safeProps = sanitizeComponentProps("trading_account_highlight", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-performance-metrics">
        <span><small>Trading Account</small><b>--</b></span>
        <span><small>Balance</small><b>--</b></span>
        <span><small>Equity</small><b>--</b></span>
        <span><small>Return</small><b>--</b></span>
        <span><small>Floating P/L</small><b>--</b></span>
        <span><small>Leverage</small><b>--</b></span>
      </div>
      <div class="ai-performance-chart" aria-label="PnL curve">
        <i style="height: 34%"></i>
        <i style="height: 52%"></i>
        <i style="height: 45%"></i>
        <i style="height: 68%"></i>
        <i style="height: 61%"></i>
        <i style="height: 78%"></i>
        <i style="height: 72%"></i>
      </div>
    `;
    return feature;
  }

  function renderWalletList(doc, config, props = {}) {
    const feature = wrapFeature(doc, "wallet_list", "ai-wallet-list-feature", config);
    const safeProps = sanitizeComponentProps("wallet_list", props, []);
    const rows = walletMetricRows(config.moduleSettings.assets.wallets);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <div class="ai-wallet-card-list" role="list" aria-label="${escapeHtml(t(safeProps.titleKey))}">
        ${rows
          .map(
            (row) => `
              <article role="listitem">
                <span class="ai-wallet-currency">
                  <i aria-hidden="true">${escapeHtml(walletCurrencyMark(row.label))}</i>
                  <b>${escapeHtml(row.label)}</b>
                </span>
                <strong>${escapeHtml(row.balance)}</strong>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
    feature.id = "wallets";
    return feature;
  }

  function renderCreateAccountForm(doc, config, props = {}) {
    const feature = wrapFeature(doc, "create_account_form", "ai-create-account-feature", config);
    const safeProps = sanitizeComponentProps("create_account_form", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-create-form" aria-label="${escapeHtml(t(safeProps.titleKey))}">
        <label><span>Platform</span><b>MT5</b></label>
        <label><span>Account Type</span><b>Standard</b></label>
        <label><span>Leverage</span><b>1:100</b></label>
        <button type="button" data-home-action="openAccount">${escapeHtml(t("home.action.realAccount"))}</button>
      </div>
    `;
    return feature;
  }

  function renderMarketInsight(doc, config, props = {}) {
    const feature = wrapFeature(doc, "market_news", "ai-market-feature", config);
    const safeProps = sanitizeComponentProps("market_news", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-side-metrics">
        <span><small>${escapeHtml(t(safeProps.metricOneKey))}</small><b>--</b></span>
        <span><small>${escapeHtml(t(safeProps.metricTwoKey))}</small><b>--</b></span>
      </div>
    `;
    return feature;
  }

  function renderRiskNotice(doc, config, props = {}) {
    const feature = wrapFeature(doc, "risk_notice", "ai-risk-feature", config);
    const safeProps = sanitizeComponentProps("risk_notice", props, []);
    feature.id = "risk";
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <a data-home-action="orders" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.ctaKey))}</a>
    `;
    return feature;
  }

  function renderAnnouncements(doc, config, props = {}) {
    const feature = wrapFeature(doc, "announcements", "ai-announcements-feature", config);
    const safeProps = sanitizeComponentProps("announcements", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-side-metrics">
        <span><small>Important</small><b>--</b></span>
        <span><small>Latest</small><b>--</b></span>
      </div>
    `;
    return feature;
  }

  function renderPammProducts(doc, config, props = {}) {
    const feature = wrapFeature(doc, "pamm_products", "ai-pamm-feature", config);
    const safeProps = sanitizeComponentProps("pamm_products", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-side-metrics">
        <span><small>Return</small><b>--</b></span>
        <span><small>Max Drawdown</small><b>--</b></span>
        <span><small>Risk</small><b>--</b></span>
      </div>
    `;
    return feature;
  }

  function renderCopyTradingSummary(doc, config, props = {}) {
    const feature = wrapFeature(doc, "copytrading_signals", "ai-copytrading-feature", config);
    const safeProps = sanitizeComponentProps("copytrading_signals", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-side-metrics">
        <span><small>${escapeHtml(t(safeProps.leaderKey))}</small><b>--</b></span>
        <span><small>${escapeHtml(t(safeProps.followersKey))}</small><b>--</b></span>
        <span><small>Win Rate</small><b>--</b></span>
      </div>
    `;
    return feature;
  }

  const COMPONENT_MAP = {
    welcome_header: renderWelcomeHeader,
    asset_overview: renderBalanceTotal,
    onboarding_guide: renderOnboardingProgress,
    trading_account_highlight: renderAccountPerformance,
    trading_accounts_list: renderTradingAccounts,
    pamm_products: renderPammProducts,
    copytrading_signals: renderCopyTradingSummary,
    referral_link_card: renderReferralLinkCard,
    announcements: renderAnnouncements,
    market_news: renderMarketInsight,
    ad_carousel: renderAdCarousel,
    promo_banner: renderPromoHighlight,
    asset_summary: renderBalanceTotal,
    wallet_balance: renderWalletBalance,
    fund_actions: renderFundActions,
    quick_actions: renderQuickActions,
    open_account_panel: renderOpenAccountActions,
    onboarding_progress: renderOnboardingProgress,
    account_list: renderTradingAccounts,
    referral_link: renderReferralLink,
    user_kyc_rail: renderUserKycRail,
    account_performance: renderAccountPerformance,
    wallet_list: renderWalletList,
    create_account_form: renderCreateAccountForm,
    market_insight: renderMarketInsight,
    risk_notice: renderRiskNotice,
    copytrading_summary: renderCopyTradingSummary,
  };

  function slotEnabled(slot, config) {
    const settings = config.moduleSettings;

    if (slot === "welcome_header") return true;
    if (slot === "asset_overview") return settings.assets.enabled;
    if (slot === "quick_actions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (slot === "onboarding_guide") return settings.openAccount.enabled || settings.tradingAccounts.enabled;
    if (slot === "trading_account_highlight") return settings.tradingAccounts.enabled || settings.assets.enabled;
    if (slot === "trading_accounts_list") return settings.tradingAccounts.enabled;
    if (slot === "promo_banner") return settings.promoHighlight?.enabled !== false || settings.adCarousel.enabled;
    if (slot === "pamm_products") return settings.pamm.enabled;
    if (slot === "copytrading_signals") return settings.copytrading.enabled;
    if (slot === "referral_link_card") return settings.referralLinkCard?.enabled;
    if (slot === "announcements") return settings.announcements.enabled;
    if (slot === "market_news") return settings.marketNews.enabled;
    if (slot === "balanceTotal" || slot === "accountBalances") return settings.assets.enabled;
    if (slot === "walletBalance") return settings.wallet.enabled && settings.wallet.placement === "standalone";
    if (slot === "fundActions") return fundActionsEnabled(config);
    if (slot === "openAccountActions") return openAccountChoices(config).length > 0 && settings.openAccount.placement === "standalone";
    if (slot === "adCarousel") return settings.adCarousel.enabled;
    if (slot === "promoHighlight") return settings.promoHighlight?.enabled !== false;
    if (slot === "quickActions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (slot === "referralLink") return settings.referral.enabled;
    if (slot === "tradingAccounts") return settings.tradingAccounts.enabled;
    if (slot === "walletList") return settings.wallet.enabled;
    if (slot === "createAccountForm") return openAccountChoices(config).length > 0;
    if (slot === "accountPerformance") return settings.tradingAccounts.enabled || settings.assets.enabled;
    if (slot === "riskNotice") return settings.riskNotice.enabled;
    return true;
  }

  function expandSlots(slots, config) {
    const expanded = [];
    const hasWalletList =
      (Array.isArray(config.brickPlan) && config.brickPlan.some((item) => item.feature === "walletList" || item.component === "wallet_list")) ||
      (Array.isArray(config.layout) && config.layout.some((item) => item.component === "wallet_list")) ||
      (Array.isArray(config.sections) && config.sections.some((section) => Array.isArray(section.slots) && section.slots.includes("walletList")));

    slots.forEach((slot) => {
      if (slot === "balanceTotal" && config.moduleSettings.wallet.enabled && config.moduleSettings.wallet.placement === "standalone" && !hasWalletList) {
        if (slotEnabled(slot, config)) expanded.push(slot);
        if (slotEnabled("walletBalance", config)) expanded.push("walletBalance");
        return;
      }

      if (slotEnabled(slot, config)) expanded.push(slot);
    });

    return uniqueValidSlots(expanded);
  }

  function effectiveSections(config) {
    const normalized = normalizeConfig(config);
    return normalized.sections
      .map((section) => ({
        ...section,
        slots: expandSlots(section.slots, normalized),
      }))
      .filter((section) => section.slots.length);
  }

  function renderSlot(doc, slot, config) {
    if (slot === "welcome_header") return renderWelcomeHeader(doc, config);
    if (slot === "asset_overview") return renderBalanceTotal(doc, config);
    if (slot === "quick_actions") return renderQuickActions(doc, config);
    if (slot === "onboarding_guide") return renderOnboardingProgress(doc, config);
    if (slot === "trading_account_highlight") return renderAccountPerformance(doc, config);
    if (slot === "trading_accounts_list") return renderTradingAccounts(doc, config);
    if (slot === "promo_banner") return renderPromoHighlight(doc, config);
    if (slot === "pamm_products") return renderPammProducts(doc, config);
    if (slot === "copytrading_signals") return renderCopyTradingSummary(doc, config);
    if (slot === "referral_link_card") return renderReferralLinkCard(doc, config);
    if (slot === "announcements") return renderAnnouncements(doc, config);
    if (slot === "market_news") return renderMarketInsight(doc, config);
    if (slot === "balanceTotal" || slot === "accountBalances") return renderBalanceTotal(doc, config);
    if (slot === "walletBalance") return renderWalletBalance(doc, config);
    if (slot === "fundActions") return renderFundActions(doc, config);
    if (slot === "openAccountActions") return renderOpenAccountActions(doc, config);
    if (slot === "onboardingProgress") return renderOnboardingProgress(doc, config);
    if (slot === "promoHighlight") return renderPromoHighlight(doc, config);
    if (slot === "adCarousel") return renderAdCarousel(doc, config);
    if (slot === "quickActions") return renderQuickActions(doc, config);
    if (slot === "referralLink") return renderReferralLink(doc, config);
    if (slot === "tradingAccounts") return renderTradingAccounts(doc, config);
    if (slot === "userKycRail") return renderUserKycRail(doc, config);
    if (slot === "accountPerformance") return renderAccountPerformance(doc, config);
    if (slot === "walletList") return renderWalletList(doc, config);
    if (slot === "createAccountForm") return renderCreateAccountForm(doc, config);
    if (slot === "marketInsight") return renderMarketInsight(doc, config);
    if (slot === "riskNotice") return renderRiskNotice(doc, config);

    return wrapFeature(doc, slot, "ai-empty-feature", config);
  }

  function componentEnabled(component, config) {
    const settings = config.moduleSettings;
    if (component === "welcome_header") return true;
    if (component === "asset_overview") return settings.assets.enabled;
    if (component === "quick_actions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (component === "onboarding_guide") return settings.openAccount.enabled || settings.tradingAccounts.enabled;
    if (component === "trading_account_highlight") return settings.tradingAccounts.enabled || settings.assets.enabled;
    if (component === "trading_accounts_list") return settings.tradingAccounts.enabled;
    if (component === "promo_banner") return settings.promoHighlight?.enabled !== false || settings.adCarousel.enabled;
    if (component === "pamm_products") return settings.pamm.enabled;
    if (component === "copytrading_signals") return settings.copytrading.enabled;
    if (component === "referral_link_card") return settings.referralLinkCard?.enabled;
    if (component === "announcements") return settings.announcements.enabled;
    if (component === "market_news") return settings.marketNews.enabled;
    if (isForbiddenHomeBlock(component)) return false;
    if (component === "asset_summary") return settings.assets.enabled;
    if (component === "wallet_balance") return settings.wallet.enabled;
    if (component === "fund_actions") return fundActionsEnabled(config);
    if (component === "quick_actions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (component === "open_account_panel") return openAccountChoices(config).length > 0 && settings.openAccount.placement === "standalone";
    if (component === "onboarding_progress") return settings.openAccount.enabled;
    if (component === "ad_carousel") return settings.adCarousel.enabled;
    if (component === "promo_banner") return settings.promoHighlight?.enabled !== false;
    if (component === "referral_link" || component === "copytrading_summary") return settings.referral.enabled;
    if (component === "account_list") return settings.tradingAccounts.enabled;
    if (component === "wallet_list") return settings.wallet.enabled;
    if (component === "create_account_form") return openAccountChoices(config).length > 0;
    if (component === "account_performance") return settings.tradingAccounts.enabled || settings.assets.enabled;
    if (component === "risk_notice") return settings.riskNotice.enabled;
    return true;
  }

  function renderBlueprint(config, target) {
    const shell = target.querySelector("[data-home-shell]");
    if (!shell) return;

    const doc = target;
    const renderableBlocks = config.layout.filter((block) => COMPONENT_MAP[block.component] && componentEnabled(block.component, config));
    const heroBlocks = renderableBlocks.filter((block) => block.slot === "hero" && block.component !== "welcome_header");

    shell.querySelectorAll(".client-welcome, [data-home-row], [data-home-module], [data-layout-section], [data-home-feature]").forEach((node) => node.remove());
    shell.classList.add("is-blueprint-home");
    shell.className = shell.className
      .split(/\s+/)
      .filter((className) => className && !className.startsWith("ai-blueprint-layout-"))
      .concat(`ai-blueprint-layout-${config.layoutPreset}`)
      .join(" ");

    buildHomepageRows(renderableBlocks, heroBlocks.length).forEach((row) => {
      const rowNode = doc.createElement("div");
      rowNode.className = "ai-home-row";
      rowNode.dataset.homeRow = row.id;
      rowNode.dataset.rowItems = String(row.items.length);
      rowNode.dataset.rowKind = row.items.length > 1 ? "paired" : "single";
      rowNode.style.setProperty("--home-row-min-height", `${row.minHeight}px`);

      row.items.forEach((item) => {
        const block = item.block;
        const renderComponent = COMPONENT_MAP[block.component];
        const isWelcomeBlock = block.component === "welcome_header";

        const node = renderComponent(doc, config, block.props);
        node.classList.add("ai-home-block", `ai-home-block-${block.slot}`, `ai-component-${block.component}`);
        node.dataset.homeComponent = block.component;
        if (block.brickId) node.dataset.homeBrick = block.brickId;
        if (block.brickName) node.dataset.homeBrickName = block.brickName;
        if (block.brickReason) node.dataset.homeBrickReason = block.brickReason;
        node.dataset.homeSlot = block.slot;
        node.dataset.homeSpan = String(item.span);
        if (!isWelcomeBlock && row.items.length > 1) {
          node.classList.add("ai-home-block-polished");
        } else {
          node.classList.remove("ai-home-block-polished");
        }
        node.style.setProperty("--home-span", String(item.span || 12));
        node.style.order = String(block.priority);
        rowNode.appendChild(node);
      });

      shell.appendChild(rowNode);
    });
  }

  function applyConfig(config, root) {
    const target = root || document;
    const body = target.body || document.body;
    const normalized = normalizeConfig(config);

    if (!body) return normalized;

    if (body.dataset.layoutPage === "client-home") {
      renderBlueprint(normalized, target);
    }

    body.dataset.homeTheme = normalized.themePreset;
    body.dataset.tenantTheme = normalized.themePreset;
    body.dataset.homeDensity = normalized.density;
    body.dataset.homeLayout = normalized.layoutPreset;
    body.dataset.homeGenome = normalized.designGenome;
    body.dataset.homeStory = normalized.pageStory;
    body.dataset.homeHero = normalized.heroFocus;
    body.dataset.homePersonalizationStrength = normalized.personalizationStrength;
    body.dataset.homeEmphasisDeposit = normalized.emphasis.deposit;
    body.dataset.homeEmphasisOpenAccount = normalized.emphasis.openAccount;
    body.dataset.homeEmphasisPromo = normalized.emphasis.promo;
    body.dataset.homeEmphasisAccounts = normalized.emphasis.accounts;
    body.dataset.homeQuickCount = String(normalized.moduleSettings.quickActions.count);
    body.dataset.homeQuickDisplay = normalized.moduleSettings.quickActions.display;
    body.dataset.homeAccountReal = normalized.moduleSettings.tradingAccounts.realEnabled ? "true" : "false";
    body.dataset.homeAccountDemo = normalized.moduleSettings.tradingAccounts.demoEnabled ? "true" : "false";
    body.dataset.homeAccountGrouping = normalized.moduleSettings.tradingAccounts.grouping;
    body.dataset.homeAccountView = normalized.moduleSettings.tradingAccounts.viewMode;
    body.dataset.homeAccountRealView = normalized.moduleSettings.tradingAccounts.realViewMode;
    body.dataset.homeAccountDemoView = normalized.moduleSettings.tradingAccounts.demoViewMode;
    body.dataset.homeAccountDemoFirst = normalized.moduleSettings.tradingAccounts.demoFirst ? "true" : "false";
    body.dataset.homeOpenAccountReal = normalized.moduleSettings.openAccount.real ? "true" : "false";
    body.dataset.homeOpenAccountDemo = normalized.moduleSettings.openAccount.demo ? "true" : "false";
    body.dataset.homeOpenAccountBind = normalized.moduleSettings.openAccount.bind ? "true" : "false";
    body.dataset.homeOpenAccountEnabled = normalized.moduleSettings.openAccount.enabled ? "true" : "false";

    const view = target.defaultView || window;
    if (view.NXBrokerTheme?.applyTenantTheme) {
      view.NXBrokerTheme.applyTenantTheme(normalized.themePreset);
    } else if (target.documentElement) {
      target.documentElement.dataset.tenantTheme = normalized.themePreset;
    }

    target.querySelectorAll(".is-home-spotlight").forEach((node) => node.classList.remove("is-home-spotlight"));
    target.querySelectorAll(`[data-home-feature="${normalized.heroFocus}"]`).forEach((node) => {
      node.classList.add("is-home-spotlight");
    });

    const title = target.querySelector("[data-home-title]");
    const subtitle = target.querySelector("[data-home-subtitle]");

    if (title) title.textContent = t(normalized.heroTitleKey);
    if (subtitle) subtitle.textContent = t(normalized.heroSubtitleKey);

    if (target.defaultView?.ClientHome?.refresh) {
      target.defaultView.ClientHome.refresh();
    }

    return normalized;
  }

  function featureLabel(id) {
    return COMPONENTS[id] || FEATURES[id] || MODULES[id] || id;
  }

  function moduleLabel(id) {
    return MODULES[id] || FEATURES[id] || id;
  }

  function themeLabel(id) {
    const theme = normalizeThemeId(id);
    return THEMES[theme] || id;
  }

  function layoutLabel(id) {
    return LAYOUTS[normalizeLayoutPreset(id)] || id;
  }

  function densityLabel(id) {
    return {
      compact: "紧凑",
      balanced: "平衡",
      spacious: "舒展",
    }[id] || id;
  }

  function strengthLabel(id) {
    return {
      subtle: "轻度差异",
      medium: "中度差异",
      strong: "强差异",
    }[id] || id;
  }

  function moduleVariantLabel(moduleId, variant) {
    const options = MODULE_VARIANT_OPTIONS[moduleId] || [];
    return options.find((option) => option.id === variant)?.label || variant || "";
  }

  function moduleVariantSummary(config) {
    const normalized = normalizeConfig(config);
    return Object.keys(PROTOCOL_MODULES).map((moduleId) => ({
      id: moduleId,
      label: PROTOCOL_MODULES[moduleId].label,
      variant: normalized.modules[moduleId].variant,
      variantLabel: moduleVariantLabel(moduleId, normalized.modules[moduleId].variant),
    }));
  }

  function describeDecision(config, prompt) {
    const normalized = normalizeConfig(config);
    const profile = promptProfile(prompt);
    const activeFamilies = new Set(normalized.brickPlan.map((item) => item.family).filter(Boolean));
    const variants = moduleVariantSummary(normalized)
      .filter((item) => !activeFamilies.size || activeFamilies.has(item.id))
      .map((item) => `${item.label}: ${item.variantLabel}`)
      .join("；");
    const brickNames = normalized.brickPlan.map((item) => item.brickName).filter(Boolean).slice(0, 6).join(" / ");

    return [
      {
        label: "版式基因",
        value: DESIGN_GENOMES[normalized.designGenome]?.label || normalized.designGenome,
        reason: PAGE_STORIES[normalized.pageStory]?.summary || "先决定首页骨架和首屏叙事，再选择积木。",
      },
      normalized.brickPlan.length
        ? {
            label: "积木选择",
            value: `${normalized.brickTrace.strategy || "积木编排"} · ${normalized.brickPlan.length} 个`,
            reason: brickNames ? `已选择 ${brickNames}，再按 hero/main/rail/full 自动拼版。` : "先选择业务积木，再生成页面结构。",
          }
        : null,
      {
        label: "主题选择",
        value: themeLabel(normalized.themePreset),
        reason: `匹配 ${profile.tone} 的品牌语气，并通过 theme token 控制颜色、背景、圆角和阴影。`,
      },
      {
        label: "布局选择",
        value: layoutLabel(normalized.layoutPreset),
        reason: `面向 ${profile.audience}，首屏按${PAGE_STORIES[normalized.pageStory]?.label || "页面叙事"}优先承接 ${featureLabel(normalized.heroFocus)}。`,
      },
      {
        label: "视觉强度",
        value: strengthLabel(normalized.personalizationStrength),
        reason: "用于控制方案差异感，避免不同租户只改颜色和文案。",
      },
      {
        label: "组件变体",
        value: variants,
        reason: "组件形态来自白名单形态池，AI 只选择 JSON 配置，不生成页面代码。",
      },
    ].filter(Boolean);
  }

  function describeIntelligence(config, prompt) {
    const normalized = normalizeConfig(config);
    const profile = promptProfile(prompt);
    const governance = evaluatePageGovernance(normalized, prompt);
    const firstSection = effectiveSections(normalized)[0];
    const firstScreen = firstSection?.slots?.map((slot) => featureLabel(slot)).filter(Boolean).join(" / ") || featureLabel(normalized.heroFocus);
    const settings = normalized.moduleSettings;
    const choices = [];
    const brickSummary = normalized.brickPlan
      .map((item) => `${item.brickName || item.brickId}(${item.size || item.zone})`)
      .filter(Boolean)
      .slice(0, 5)
      .join(" / ");

    choices.push(settings.wallet.enabled && settings.wallet.placement === "standalone" ? "钱包独立展示" : "钱包聚合到资产");
    choices.push(settings.quickActions.enabled ? `快捷入口保留 ${settings.quickActions.count} 个` : "弱化快捷入口");
    choices.push(settings.adCarousel.enabled ? "保留广告曝光" : "隐藏广告轮播");
    choices.push(settings.referral.enabled ? "保留邀请转化" : "隐藏邀请模块");
    choices.push(
      settings.tradingAccounts.grouping === "separated" &&
        settings.tradingAccounts.realViewMode === "card" &&
        settings.tradingAccounts.demoViewMode === "list"
        ? "真实账号卡片展示，模拟账号列表展示"
        : settings.tradingAccounts.grouping === "separated" && settings.tradingAccounts.viewMode === "list"
        ? "真实/模拟账号分成两个列表"
        : settings.tradingAccounts.viewMode === "list"
        ? "交易账号固定列表"
        : settings.tradingAccounts.viewMode === "card"
        ? "交易账号固定卡片"
        : "交易账号可切换视图",
    );

    return [
      { label: "目标判断", value: profile.audience },
      { label: "版式基因", value: `${DESIGN_GENOMES[normalized.designGenome]?.label || normalized.designGenome} · ${PAGE_STORIES[normalized.pageStory]?.label || normalized.pageStory}` },
      { label: "视觉语气", value: `${profile.tone} · ${THEMES[normalized.theme]} · ${densityLabel(normalized.density)}` },
      { label: "差异强度", value: strengthLabel(normalized.personalizationStrength) },
      { label: "首页重心", value: `${featureLabel(normalized.heroFocus)}优先，首屏组合为 ${firstScreen}` },
      { label: "积木编排", value: brickSummary || "使用默认模块组合" },
      { label: "页面质检", value: `${governance.label} · ${governance.score} 分${governance.issues.length ? ` · 待优化 ${governance.issues[0]}` : " · 通过"}` },
      { label: "自动取舍", value: choices.join("；") },
    ];
  }

  window.HomePersonalization = {
    COMPONENTS,
    COMPONENT_MAP,
    COMPONENT_PROPS_SCHEMA: clone(COMPONENT_PROPS_SCHEMA),
    DEFAULT_CONFIG: normalizeConfig(DEFAULT_CONFIG),
    DEFAULT_MODULE_SETTINGS: clone(DEFAULT_MODULE_SETTINGS),
    DESIGN_GENOMES: clone(DESIGN_GENOMES),
    FEATURES,
    HOME_BRICKS: clone(HOME_BRICKS),
    HOMEPAGE_CONFIG_JSON_SCHEMA: clone(HOMEPAGE_CONFIG_JSON_SCHEMA),
    PAGE_GOVERNANCE_CONTRACTS: clone(PAGE_GOVERNANCE_CONTRACTS),
    MODULE_VARIANT_OPTIONS,
    MODULE_STYLE_OPTIONS,
    MODULES,
    PAGE_STORIES: clone(PAGE_STORIES),
    PROTOCOL_MODULES: clone(PROTOCOL_MODULES),
    TENANT_THEME_TOKENS: clone(TENANT_THEME_TOKENS),
    THEMES,
    applyConfig,
    clearDraft,
    densityLabel,
    describeDecision,
    describeIntelligence,
    effectiveSections,
    evaluatePageGovernance,
    featureLabel,
    generateSchemeOptions,
    layoutLabel,
    loadConfig,
    loadDraft,
    moduleLabel,
    moduleVariantLabel,
    moduleVariantSummary,
    normalizeConfig,
    optimizeConfig,
    promptToConfig,
    randomConfig,
    resetConfig,
    saveDraft,
    saveConfig,
    t,
    themeLabel,
    strengthLabel,
    validateHomepageConfig,
  };

  function bootClientHome() {
    if (document.body?.dataset.layoutPage === "client-home") {
      const params = new URLSearchParams(window.location.search);
      const tenantTheme = params.get("tenantTheme") || params.get("tenant-theme");
      if (params.has("preview")) document.body.dataset.homePreview = "content-only";
      const config = params.has("preview") ? loadDraft() : loadConfig();
      applyConfig(tenantTheme ? { ...config, themePreset: normalizeThemeId(tenantTheme), theme: normalizeThemeId(tenantTheme) } : config, document);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootClientHome);
  } else {
    bootClientHome();
  }
})();
