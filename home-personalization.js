(function () {
  const STORAGE_KEY = "forexcrm.home.personalization";
  const DRAFT_STORAGE_KEY = "forexcrm.home.personalization.draft";
  const VOLATILE_STORAGE_KEYS = ["forexcrm.home.ai.call.history", "forexcrm.home.ai.suggestion.history"];
  const ECHARTS_RUNTIME_URL = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
  let chartRuntimePromise = null;
  const chartInstances = new WeakMap();

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
    referral_link_card: "推广链接",
    kyc_status_card: "KYC 状态卡",
    announcements: "公告通知区",
    market_news: "市场资讯区",
    risk_disclosure: "风险提示区",
    faq_section: "FAQ 常见问题区",
    support_contact: "在线客服区",
    app_download: "APP 下载区",
    balanceTotal: "资产概览",
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
    "wallet_list",
    "quick_actions",
    "onboarding_guide",
    "trading_account_highlight",
    "trading_accounts_list",
    "promo_banner",
    "pamm_products",
    "copytrading_signals",
    "referral_link_card",
    "kyc_status_card",
    "announcements",
    "market_news",
    "risk_disclosure",
    "faq_section",
    "support_contact",
    "app_download",
  ];

  const LARGE_FULL_ROW_HOME_BLOCKS = new Set([
    "trading_accounts_list",
    "copytrading_signals",
    "trading_account_highlight",
    "onboarding_guide",
    "promo_banner",
    "pamm_products",
    "wallet_list",
  ]);

  const LARGE_FULL_ROW_HOME_BLOCK_SIZES = {
    trading_accounts_list: "3x2",
    copytrading_signals: "3x2",
    trading_account_highlight: "3x2",
    onboarding_guide: "3x1",
    promo_banner: "3x1",
    pamm_products: "3x2",
    wallet_list: "3x2",
  };

  // Large blocks that read fine at ~8 columns and may sit beside a compact (4-col)
  // companion instead of always taking a full row. True wide tables / dense curve
  // modules (trading_accounts_list, wallet_list, copytrading_signals) stay full-row.
  const WIDE_PAIRABLE_HOME_BLOCKS = new Set([
    "trading_account_highlight",
    "onboarding_guide",
    "promo_banner",
    "pamm_products",
  ]);

  // Low-priority compact modules that may be pulled up to sit beside a wide block
  // (look-ahead pairing). High-value modules (asset_overview, quick_actions) are
  // never moved. Mirrors server COMPACT_COMPANION_HOME_BLOCKS.
  const WIDE_COMPANION_HOME_BLOCKS = new Set([
    "faq_section",
    "app_download",
    "support_contact",
    "announcements",
    "market_news",
    "referral_link_card",
    "kyc_status_card",
  ]);

  const FORBIDDEN_HOME_BLOCKS = [
    "reward_tasks",
    "kyc_risk_notice",
    "ib_dashboard",
    "referralLink",
    "referral_link",
  ];

  const LEGACY_SLOT_ALIASES = {
    welcomeHeader: "welcome_header",
    首页欢迎: "welcome_header",
    balanceTotal: "asset_overview",
    资产概览: "asset_overview",
    accountBalances: "asset_overview",
    walletBalance: "asset_overview",
    walletList: "wallet_list",
    fundActions: "asset_overview",
    quickActions: "quick_actions",
    快捷操作: "quick_actions",
    快捷入口: "quick_actions",
    openAccountActions: "onboarding_guide",
    新手引导: "onboarding_guide",
    开户引导: "onboarding_guide",
    onboardingProgress: "onboarding_guide",
    createAccountForm: "onboarding_guide",
    promoHighlight: "promo_banner",
    adCarousel: "promo_banner",
    accountPerformance: "trading_account_highlight",
    账号表现: "trading_account_highlight",
    账户表现: "trading_account_highlight",
    trading_performance: "trading_account_highlight",
    tradingAccounts: "trading_accounts_list",
    交易账号: "trading_accounts_list",
    交易账户: "trading_accounts_list",
    marketInsight: "market_news",
    copytradingSummary: "copytrading_signals",
    copytrading_summary: "copytrading_signals",
    referralLinkCard: "referral_link_card",
    推广链接: "referral_link_card",
    referral: "referral_link_card",
    "referral link": "referral_link_card",
    "invite code": "referral_link_card",
    referral_link_card: "referral_link_card",
    accountKycStatus: "kyc_status_card",
    "CRM 账户 KYC 状态": "kyc_status_card",
    "KYC 状态": "kyc_status_card",
    "kyc status": "kyc_status_card",
    account_kyc_status: "kyc_status_card",
    kycStatus: "kyc_status_card",
    kyc_status: "kyc_status_card",
    kyc_status_card: "kyc_status_card",
    userKycRail: "kyc_status_card",
    user_kyc_rail: "kyc_status_card",
    support_help: "support_contact",
    riskNotice: "risk_disclosure",
    risk_notice: "risk_disclosure",
    faq: "faq_section",
    faqSection: "faq_section",
    customerService: "support_contact",
    supportContact: "support_contact",
    appDownload: "app_download",
    app_download: "app_download",
  };

  const LEGACY_COMPONENT_ALIASES = {
    asset_summary: "asset_overview",
    wallet_balance: "asset_overview",
    wallet_list: "wallet_list",
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
    account_kyc_status: "kyc_status_card",
    kyc_status: "kyc_status_card",
    kyc_status_card: "kyc_status_card",
    user_kyc_rail: "kyc_status_card",
    support_help: "support_contact",
    risk_notice: "risk_disclosure",
    faq: "faq_section",
    customer_service: "support_contact",
    app_download: "app_download",
  };

  const DISABLED_QUICK_ACTION_IDS = new Set(["contactService", "kyc", "risk", "referral", "inviteFriends", "viewCommission", "downloadMaterial"]);

  const THEMES = {
    default: "默认蓝白",
    blackGold: "黑金高净值",
    lightGold: "浅金扁平",
    blueFinance: "蓝色金融",
    darkTech: "暗色科技",
    minimalWhite: "极简白",
    emeraldTrust: "翡翠信任",
    cobaltTeal: "钴蓝青绿",
    crimsonPromo: "赤红活动",
    graphiteSilver: "石墨银",
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
      cardRadius: "10px",
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
      primaryColor: "#475569",
      accentColor: "#64748b",
      backgroundStyle: "minimal-white",
      cardStyle: "flat-white",
      cardRadius: "4px",
      cardShadow: "none",
      buttonStyle: "quiet-outline",
      fontDensity: 0.96,
      numberStyle: "quiet",
      bannerStyle: "paper-band",
    },
    emeraldTrust: {
      primaryColor: "#059669",
      accentColor: "#0ea5e9",
      backgroundStyle: "emerald-trust-air",
      cardStyle: "clean-white",
      cardRadius: "8px",
      cardShadow: "trust-soft",
      buttonStyle: "emerald-blue-gradient",
      fontDensity: 1,
      numberStyle: "financial",
      bannerStyle: "emerald-trust-campaign",
    },
    cobaltTeal: {
      primaryColor: "#0f766e",
      accentColor: "#2563eb",
      backgroundStyle: "cobalt-teal-grid",
      cardStyle: "clean-white",
      cardRadius: "8px",
      cardShadow: "finance-soft",
      buttonStyle: "cobalt-teal-gradient",
      fontDensity: 1,
      numberStyle: "financial",
      bannerStyle: "cobalt-teal-campaign",
    },
    crimsonPromo: {
      primaryColor: "#be123c",
      accentColor: "#f97316",
      backgroundStyle: "crimson-promo-air",
      cardStyle: "warm-white",
      cardRadius: "8px",
      cardShadow: "promo-soft",
      buttonStyle: "crimson-orange-gradient",
      fontDensity: 1,
      numberStyle: "tabular",
      bannerStyle: "crimson-promo-campaign",
    },
    graphiteSilver: {
      primaryColor: "#334155",
      accentColor: "#0ea5e9",
      backgroundStyle: "graphite-silver-air",
      cardStyle: "flat-white",
      cardRadius: "6px",
      cardShadow: "low",
      buttonStyle: "graphite-silver",
      fontDensity: 0.98,
      numberStyle: "quiet",
      bannerStyle: "graphite-silver-campaign",
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
    referral_link_card: "推广链接",
    kyc_status_card: "KYC 状态卡",
    announcements: "公告通知区",
    market_news: "市场资讯区",
    risk_disclosure: "风险提示",
    faq_section: "FAQ 常见问题",
    support_contact: "在线客服",
    app_download: "APP 下载",
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
  const HOME_GRID_COLUMNS = 12;

  function homeGridSpanForSize(size, fallback = 12) {
    const span = spanFromBrickSize(size);
    return span || fallback;
  }

  function homeGridRowsForSize(size, fallback = 1) {
    const rows = rowUnitsFromBrickSize(size);
    return rows || fallback;
  }

  function homeGridContractForSize(size, options = {}) {
    const normalizedSize = String(size || options.fallbackSize || "3x1").trim().toLowerCase().replace(/[×*]/g, "x");
    const desktopSpan = Math.min(HOME_GRID_COLUMNS, Math.max(1, Number(options.desktopSpan) || homeGridSpanForSize(normalizedSize, 12)));
    const rowSpan = Math.max(1, Number(options.rowSpan) || homeGridRowsForSize(normalizedSize, 1));
    return {
      gridColumns: HOME_GRID_COLUMNS,
      size: normalizedSize,
      desktopSpan,
      tabletSpan: HOME_GRID_COLUMNS,
      mobileSpan: HOME_GRID_COLUMNS,
      rowSpan,
      rowRecipe: desktopSpan >= 12 ? "12+0" : desktopSpan === 8 ? "8+4" : desktopSpan === 6 ? "6+6" : "4+8",
      zone: options.zone || "",
      slot: options.slot || "",
      sectionType: options.sectionType || "",
    };
  }

  const AUTO_LAYOUT_STRATEGIES = ["responsive-grid", "mobile-first-stack"];
  const AUTO_LAYOUT_BREAKPOINTS = ["desktop", "tablet", "mobile"];
  const AUTO_LAYOUT_MODULES = [
    "promo_banner",
    "onboarding_guide",
    "pamm_products",
    "copytrading_signals",
    "quick_actions",
    "trading_account_highlight",
    "trading_accounts_list",
    "wallet_list",
  ];

  const FEATURE_COMPONENT_MAP = {
    welcome_header: "welcome_header",
    asset_overview: "asset_overview",
    wallet_list: "wallet_list",
    quick_actions: "quick_actions",
    onboarding_guide: "onboarding_guide",
    trading_account_highlight: "trading_account_highlight",
    trading_accounts_list: "trading_accounts_list",
    promo_banner: "promo_banner",
    pamm_products: "pamm_products",
    copytrading_signals: "copytrading_signals",
    referral_link_card: "referral_link_card",
    kyc_status_card: "kyc_status_card",
    account_kyc_status: "kyc_status_card",
    kycStatus: "kyc_status_card",
    "kycStatus.current": "kyc_status_card",
    announcements: "announcements",
    market_news: "market_news",
    risk_disclosure: "risk_disclosure",
    faq_section: "faq_section",
    support_contact: "support_contact",
    app_download: "app_download",
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
    userKycRail: "kyc_status_card",
    accountPerformance: "account_performance",
    walletList: "wallet_list",
    createAccountForm: "create_account_form",
    marketInsight: "market_insight",
    riskNotice: "risk_disclosure",
  };

  const COMPONENT_STYLE_FEATURE_MAP = {
    welcome_header: "welcome_header",
    asset_overview: "balanceTotal",
    onboarding_guide: "onboardingProgress",
    trading_account_highlight: "accountPerformance",
    trading_accounts_list: "tradingAccounts",
    quick_actions: "quickActions",
    promo_banner: "promoHighlight",
    pamm_products: "pamm_products",
    copytrading_signals: "copytrading_signals",
    referral_link_card: "referral_link_card",
    kyc_status_card: "userKycRail",
    announcements: "announcements",
    market_news: "market_news",
    risk_disclosure: "risk_disclosure",
    faq_section: "faq_section",
    support_contact: "support_contact",
    app_download: "app_download",
    asset_summary: "balanceTotal",
    wallet_balance: "walletBalance",
    fund_actions: "fundActions",
    open_account_panel: "openAccountActions",
    onboarding_progress: "onboardingProgress",
    account_list: "tradingAccounts",
    ad_carousel: "adCarousel",
    referral_link: "referralLink",
    user_kyc_rail: "userKycRail",
    kyc_status_card: "userKycRail",
    account_performance: "accountPerformance",
    wallet_list: "walletList",
    create_account_form: "createAccountForm",
    market_insight: "marketInsight",
    risk_notice: "risk_disclosure",
    copytrading_summary: "referralLink",
  };

  const PROTOCOL_MODULES = {
    AssetOverview: {
      label: "资产概览",
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
      variants: ["gridCards", "actionDock", "priorityButtons", "minimalIcons", "commandBar", "taskRail", "tileCards", "accentCards", "compactMenu", "segmentedMenu"],
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
      label: "推广链接",
      component: "referral_link_card",
      feature: "referral_link_card",
      variants: ["compactCard", "linkFirst", "statsCard"],
    },
    PammProducts: {
      label: "PAMM 产品推荐",
      component: "pamm_products",
      feature: "pamm_products",
      variants: ["cards", "ranking", "yieldChartCards"],
    },
    CopytradingSignals: {
      label: "CopyTrading 信号源",
      component: "copytrading_signals",
      feature: "copytrading_signals",
      variants: ["signalCards", "ranking", "curveCards"],
    },
    RiskDisclosure: {
      label: "风险提示",
      component: "risk_disclosure",
      feature: "risk_disclosure",
      variants: ["compactNotice", "marginGuard", "legalStrip"],
    },
    FaqSection: {
      label: "FAQ 常见问题",
      component: "faq_section",
      feature: "faq_section",
      variants: ["accordion", "twoColumn", "compactList"],
    },
    SupportContact: {
      label: "在线客服",
      component: "support_contact",
      feature: "support_contact",
      variants: ["serviceCard", "managerCard", "compactBar"],
    },
    AppDownload: {
      label: "APP 下载",
      component: "app_download",
      feature: "app_download",
      variants: ["qrCard", "storeButtons", "compactBanner"],
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
      variants: ["path", "checklist", "compact", "guideCards", "journeyTimeline", "missionBoard", "ribbonRail", "nextStepHero"],
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
      variants: ["proChart", "summaryChart", "metricTrend", "dualChart", "riskPanel", "positionPanel", "terminalChart", "cleanSnapshot", "sparklineBoard", "costBoard"],
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
    pamm_products: "PammProducts",
    copytrading_signals: "CopytradingSignals",
    risk_disclosure: "RiskDisclosure",
    faq_section: "FaqSection",
    support_contact: "SupportContact",
    app_download: "AppDownload",
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
    kyc_status_card: "UserKycRail",
    account_kyc_status: "UserKycRail",
    kycStatus: "UserKycRail",
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
      { id: "tileCards", label: "入口磁贴", description: "每个入口都是独立磁贴，适合资产和品牌工作台。" },
      { id: "accentCards", label: "强调入口卡", description: "用顶部色条区分入口优先级，适合活动和转化首页。" },
      { id: "compactMenu", label: "紧凑菜单", description: "短按钮菜单，适合移动端和高密度工具区。" },
      { id: "segmentedMenu", label: "分段面板", description: "把入口收进分段面板，适合专业和留存场景。" },
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
    ReferralLinkCard: [
      { id: "compactCard", label: "紧凑卡片", description: "只保留推广链接、邀请码和复制动作。" },
      { id: "linkFirst", label: "链接优先", description: "优先展示推广链接和邀请码，统计弱化。" },
      { id: "statsCard", label: "统计卡片", description: "在链接基础上展示后台返回的基础推广统计。" },
    ],
    PammProducts: [
      { id: "cards", label: "产品卡片", description: "PAMM 产品以卡片展示，适合投资推荐区。" },
      { id: "ranking", label: "收益排行", description: "按收益、回撤和风险做排名展示。" },
      { id: "yieldChartCards", label: "收益曲线卡", description: "产品数据和收益曲线结合展示。" },
    ],
    CopytradingSignals: [
      { id: "signalCards", label: "信号源卡片", description: "展示信号源名称、收益和风险。" },
      { id: "ranking", label: "信号源排行", description: "适合比较多个跟单信号源。" },
      { id: "curveCards", label: "曲线推荐卡", description: "把收益率、总收益、回撤和收益曲线作为推荐亮点。" },
    ],
    RiskDisclosure: [
      { id: "compactNotice", label: "紧凑提示", description: "用短文案和状态标签承接合规风险提示。" },
      { id: "marginGuard", label: "保证金提示", description: "强调杠杆、保证金和持仓风险。" },
      { id: "legalStrip", label: "合规说明条", description: "适合作为页面底部或辅助说明。" },
    ],
    FaqSection: [
      { id: "accordion", label: "折叠问答", description: "常见问题用折叠列表承接。" },
      { id: "twoColumn", label: "双列 FAQ", description: "适合展示 4 到 6 个常见问题。" },
      { id: "compactList", label: "紧凑列表", description: "降低面积，作为辅助信息区。" },
    ],
    SupportContact: [
      { id: "serviceCard", label: "客服卡片", description: "展示在线客服、客户经理和服务时间入口。" },
      { id: "managerCard", label: "客户经理卡", description: "适合高净值或 IB 场景的一对一协助。" },
      { id: "compactBar", label: "紧凑联系条", description: "把客服入口压缩成横向辅助条。" },
    ],
    AppDownload: [
      { id: "qrCard", label: "二维码卡片", description: "APP 下载二维码和移动端说明并列。" },
      { id: "storeButtons", label: "商店按钮", description: "展示 iOS、Android 或 MT5 下载入口占位。" },
      { id: "compactBanner", label: "下载横条", description: "适合移动优先或活动页的轻量下载提示。" },
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
      { id: "guideCards", label: "精美任务卡", description: "用带图标的路径卡强化新客完成下一步的欲望。" },
      { id: "journeyTimeline", label: "旅程时间线", description: "把新客首页变成清晰的下一步旅程。" },
      { id: "missionBoard", label: "开通进度面板", description: "像任务面板一样显示完成数、进度条和三个开户步骤。" },
      { id: "ribbonRail", label: "里程碑票据", description: "用低高度横向票据展示 KYC、开户和入金节点。" },
      { id: "nextStepHero", label: "下一步主面板", description: "把当前下一步放大成主 CTA，两侧保留完成和待办状态。" },
    ],
    UserKycRail: [
      { id: "profileWallet", label: "用户钱包侧栏", description: "用户、KYC、时间和钱包摘要组合。" },
      { id: "kycChecklist", label: "KYC 清单侧栏", description: "强调认证状态和下一步动作。" },
      { id: "compactStatus", label: "紧凑状态栏", description: "适合信息密集工作台右侧。" },
    ],
    AccountPerformance: [
      { id: "proChart", label: "专业表现图表", description: "账号余额、权益和 PnL 曲线首屏展示。" },
      { id: "summaryChart", label: "摘要 + 趋势", description: "左侧账号摘要，右侧保留趋势图，适合稳健工作台。" },
      { id: "metricTrend", label: "指标带趋势", description: "先看关键指标，再看单条趋势，信息更扁平。" },
      { id: "dualChart", label: "净值/PnL 双图", description: "把净值和盈亏拆成双图，适合对比分析。" },
      { id: "riskPanel", label: "风险检查面板", description: "账号表现和保证金风险并列展示。" },
      { id: "positionPanel", label: "持仓表现面板", description: "突出当前持仓和 PnL 变化。" },
      { id: "terminalChart", label: "终端图表", description: "暗色交易终端感，适合专业交易员。" },
      { id: "cleanSnapshot", label: "清爽表现卡", description: "降低视觉强度，用作资产辅助分析。" },
      { id: "sparklineBoard", label: "Sparkline 看板", description: "多个小趋势合成专业交易指挥中心。" },
      { id: "costBoard", label: "成本执行看板", description: "点差、佣金、执行效率和持仓 PnL 同屏。" },
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

  const COMPONENT_MORPH_REGISTRY = {
    AssetOverview: [
      { id: "summaryHero", label: "总资产 Hero", structure: "primary-amount + metric-row + optional-action" },
      { id: "metricTriplet", label: "三指标横条", structure: "title + 3 metric cells" },
      { id: "wealthPlate", label: "私行资产牌", structure: "service header + large balance + trust badges" },
      { id: "riskRadar", label: "风险雷达", structure: "radar center + risk metric ring" },
      { id: "waterfall", label: "账户资金瀑布", structure: "total + wallet/account waterfall lanes" },
      { id: "splitLedger", label: "左右分栏资产板", structure: "summary column + ledger column" },
      { id: "compactTable", label: "紧凑数据表", structure: "dense rows + numeric columns" },
      { id: "terminalStrip", label: "交易终端指标带", structure: "terminal header + ticker cells" },
      { id: "trustProof", label: "资金安全证明区", structure: "asset summary + proof chips" },
      { id: "actionFusion", label: "资产主行动合并区", structure: "balance + primary action area" },
    ],
    WalletList: [
      { id: "currencyCards", label: "币种卡片", structure: "currency icon card grid" },
      { id: "tileBoard", label: "钱包磁贴", structure: "large balance tiles" },
      { id: "compactLedger", label: "紧凑账本", structure: "ledger rows" },
      { id: "horizontalStrip", label: "横向资金带", structure: "scrollable inline strip" },
      { id: "currencyTable", label: "币种表格", structure: "table rows" },
      { id: "featuredPrimary", label: "主币种突出", structure: "featured wallet + secondary list" },
      { id: "groupedWallets", label: "钱包分组", structure: "fiat/crypto/metals groups" },
      { id: "balanceRanking", label: "余额排行", structure: "ranked balance list" },
      { id: "availabilityRows", label: "可用状态行", structure: "currency + balance + status" },
      { id: "mobileCarousel", label: "移动滑动卡组", structure: "snap carousel cards" },
    ],
    QuickActions: [
      { id: "gridCards", label: "九宫格", structure: "card grid" },
      { id: "actionDock", label: "工具 Dock", structure: "horizontal dock" },
      { id: "priorityPanel", label: "主次按钮组", structure: "hero action + secondary actions" },
      { id: "iconBelt", label: "图标菜单", structure: "icon-only belt" },
      { id: "commandBar", label: "命令栏", structure: "terminal command bar" },
      { id: "taskRail", label: "任务列表", structure: "next-step task rail" },
      { id: "tileBoard", label: "磁贴板", structure: "large tool tiles" },
      { id: "accentCards", label: "强调入口卡", structure: "accented cards" },
      { id: "compactMenu", label: "紧凑菜单", structure: "short menu rows" },
      { id: "segmentedPanel", label: "分段面板", structure: "segmented groups" },
    ],
    TradingAccounts: [
      { id: "accountWall", label: "账号卡墙", structure: "account card wall" },
      { id: "opsTable", label: "运营表格", structure: "toolbar + table" },
      { id: "liveDemoSplit", label: "真实/模拟双列表", structure: "two account sections" },
      { id: "liveCardsDemoList", label: "Live 卡片 + Demo 列表", structure: "mixed account presentation" },
      { id: "compactRows", label: "紧凑行列表", structure: "compact account rows" },
      { id: "statusBoard", label: "账号状态看板", structure: "status board + cards" },
      { id: "groupPanels", label: "账户分组面板", structure: "group panels" },
      { id: "platformGroups", label: "平台分组", structure: "MT4/MT5 groups" },
      { id: "heroAccountList", label: "重点账号 + 次要列表", structure: "featured account + list" },
      { id: "mobileStack", label: "移动堆叠", structure: "stacked account cards" },
    ],
    OnboardingProgress: [
      { id: "pathSteps", label: "三步路径", structure: "path summary + step nodes" },
      { id: "checklist", label: "任务清单", structure: "checklist rows" },
      { id: "missionBoard", label: "任务面板", structure: "progress board" },
      { id: "nextStepHero", label: "下一步主卡", structure: "featured next action" },
      { id: "journeyTimeline", label: "旅程时间线", structure: "timeline milestones" },
      { id: "ribbonRail", label: "票据横条", structure: "ticket rail" },
      { id: "guideCards", label: "图标任务卡", structure: "icon cards" },
      { id: "wizardFlow", label: "流程向导", structure: "wizard panels" },
      { id: "kycActionPanel", label: "KYC 状态 + 动作", structure: "status card + action zone" },
      { id: "progressGauge", label: "进度仪表", structure: "gauge + checklist" },
    ],
    AccountPerformance: [
      { id: "proChart", label: "专业折线图", structure: "metrics + line chart" },
      { id: "sparklineBoard", label: "Sparkline 看板", structure: "multiple sparkline tiles" },
      { id: "costBoard", label: "成本执行看板", structure: "cost strip + PnL curve" },
      { id: "dualChart", label: "净值/PnL 双图", structure: "two chart panes" },
      { id: "summaryChart", label: "账号摘要 + 图表", structure: "summary column + chart" },
      { id: "metricTrend", label: "指标带 + 趋势图", structure: "metric strip + trend" },
      { id: "riskPanel", label: "风险检查面板", structure: "risk summary + chart" },
      { id: "positionPanel", label: "持仓表现面板", structure: "positions + PnL chart" },
      { id: "terminalChart", label: "终端图表", structure: "terminal shell + chart" },
      { id: "cleanSnapshot", label: "轻量快照", structure: "snapshot + small chart" },
    ],
    PromotionBanner: [
      { id: "campaignHero", label: "活动横幅", structure: "hero copy + CTA" },
      { id: "scoreboard", label: "赛事看板", structure: "prize + countdown + state" },
      { id: "depositLadder", label: "入金阶梯", structure: "tier ladder" },
      { id: "editorialCover", label: "专题封面", structure: "cover story" },
      { id: "splitVisual", label: "左右分栏活动卡", structure: "copy + visual" },
      { id: "countdownCard", label: "倒计时卡", structure: "countdown + action" },
      { id: "benefitList", label: "权益列表", structure: "benefits + CTA" },
      { id: "noticeBanner", label: "公告式 Banner", structure: "notice row" },
      { id: "imageHero", label: "图片主视觉", structure: "image-led hero" },
      { id: "ctaPanel", label: "活动 + CTA 合并面板", structure: "campaign panel" },
    ],
    ReferralLinkCard: [
      { id: "copyCard", label: "纯链接复制卡", structure: "link + copy button" },
      { id: "inviteCodeCard", label: "邀请码卡", structure: "code + copy button" },
      { id: "linkFirstPanel", label: "链接优先面板", structure: "wide link first" },
      { id: "qrPanel", label: "二维码面板", structure: "QR placeholder + link" },
      { id: "statsCard", label: "基础统计卡", structure: "stats + link" },
      { id: "shareToolbar", label: "分享工具条", structure: "toolbar actions" },
      { id: "stepCards", label: "推广步骤卡", structure: "steps + link" },
      { id: "compactStrip", label: "紧凑横条", structure: "single row strip" },
      { id: "conversionSummary", label: "代理转化摘要", structure: "conversion stats" },
      { id: "mainReferralCard", label: "开户链接主卡", structure: "featured referral card" },
    ],
    RiskDisclosure: [
      { id: "legalStrip", label: "底部合规条", structure: "legal strip" },
      { id: "marginGuard", label: "保证金提示卡", structure: "margin warning" },
      { id: "riskLevelPanel", label: "风险等级面板", structure: "risk level board" },
      { id: "compactNotice", label: "紧凑提示", structure: "compact notice" },
      { id: "splitDisclosure", label: "分栏说明", structure: "two columns" },
      { id: "iconWarnings", label: "图标提示组", structure: "warning icons" },
      { id: "accordionDisclosure", label: "可折叠披露", structure: "accordion" },
      { id: "tradeRiskSummary", label: "交易风险摘要", structure: "trade risk summary" },
      { id: "complianceBlock", label: "合规声明块", structure: "statement block" },
      { id: "riskFaqCombo", label: "风险 + FAQ 合并区", structure: "risk plus faq" },
    ],
  };

  const COMPONENT_MORPH_ALIASES = {
    AssetOverview: {
      standard: "summaryHero",
      vipHero: "summaryHero",
      compactTable: "compactTable",
      darkTerminal: "terminalStrip",
      tickerStrip: "metricTriplet",
      wealthPlate: "wealthPlate",
      riskRadar: "riskRadar",
    },
    WalletList: {
      currencyTable: "currencyCards",
      compactRows: "compactLedger",
      actionTable: "availabilityRows",
      walletTiles: "tileBoard",
    },
    QuickActions: {
      gridCards: "gridCards",
      actionDock: "actionDock",
      priorityButtons: "priorityPanel",
      minimalIcons: "iconBelt",
      commandBar: "commandBar",
      taskRail: "taskRail",
      tileCards: "tileBoard",
      accentCards: "accentCards",
      compactMenu: "compactMenu",
      segmentedMenu: "segmentedPanel",
    },
    TradingAccounts: {
      workbench: "statusBoard",
      separatedList: "liveDemoSplit",
      denseCards: "accountWall",
      calmTable: "compactRows",
      accountWall: "accountWall",
      opsTable: "opsTable",
    },
    OnboardingProgress: {
      path: "pathSteps",
      checklist: "checklist",
      compact: "checklist",
      guideCards: "guideCards",
      journeyTimeline: "journeyTimeline",
      missionBoard: "missionBoard",
      ribbonRail: "ribbonRail",
      nextStepHero: "nextStepHero",
    },
    AccountPerformance: {
      proChart: "proChart",
      summaryChart: "summaryChart",
      metricTrend: "metricTrend",
      dualChart: "dualChart",
      riskPanel: "riskPanel",
      positionPanel: "positionPanel",
      costBoard: "costBoard",
      terminalChart: "terminalChart",
      cleanSnapshot: "cleanSnapshot",
      sparklineBoard: "sparklineBoard",
    },
    PromotionBanner: {
      imageBanner: "imageHero",
      gradientHero: "campaignHero",
      blackGoldVip: "benefitList",
      splitVisual: "splitVisual",
      editorialCover: "editorialCover",
      depositLadder: "depositLadder",
    },
    ReferralLinkCard: {
      compactCard: "compactStrip",
      linkFirst: "linkFirstPanel",
      statsCard: "statsCard",
    },
    RiskDisclosure: {
      compactNotice: "compactNotice",
      marginGuard: "marginGuard",
      legalStrip: "legalStrip",
    },
  };

  const COMPONENT_REFERENCE_STYLE_FEATURES = {
    AssetOverview: ["balanceTotal", "asset_overview"],
    WalletList: ["walletList", "wallet_list"],
    QuickActions: ["quickActions", "quick_actions"],
    TradingAccounts: ["tradingAccounts", "trading_accounts_list"],
    OnboardingProgress: ["onboardingProgress", "onboarding_guide"],
    UserKycRail: ["userKycRail", "kyc_status_card"],
    AccountPerformance: ["accountPerformance", "trading_account_highlight"],
    PromotionBanner: ["promoHighlight", "promo_banner", "adCarousel"],
    ReferralLinkCard: ["referral_link_card"],
    PammProducts: ["pamm_products"],
    CopytradingSignals: ["copytrading_signals"],
    RiskDisclosure: ["risk_disclosure"],
    FaqSection: ["faq_section"],
    SupportContact: ["support_contact"],
    AppDownload: ["app_download"],
  };

  const COMPONENT_REFERENCE_RULES = {
    AssetOverview: [
      { keys: ["riskradar", "risk-radar", "风险雷达"], variant: "riskRadar", morph: "riskRadar", style: "risk-radar" },
      { keys: ["wealthplate", "wealth-plate", "私行", "高净值"], variant: "wealthPlate", morph: "wealthPlate", style: "wealth-plate" },
      { keys: ["tickerstrip", "ticker-strip", "指标带"], variant: "tickerStrip", morph: "metricTriplet", style: "ticker-strip" },
      { keys: ["compacttable", "compact-table", "紧凑", "表格"], variant: "compactTable", morph: "compactTable", style: "metric-strip" },
      { keys: ["metrictriplet", "metric-triplet", "三项", "三栏"], variant: "tickerStrip", morph: "metricTriplet", style: "ticker-strip" },
      { keys: ["summaryhero", "summary-hero", "viphero"], variant: "vipHero", morph: "summaryHero", style: "command" },
    ],
    WalletList: [
      { keys: ["wallettiles", "tileboard", "tile-board", "磁贴", "矩阵"], variant: "walletTiles", morph: "tileBoard", style: "wallet-tiles" },
      { keys: ["currencytable", "currency-table", "表格", "table"], variant: "currencyTable", morph: "currencyTable", style: "currency-table" },
      { keys: ["compactrows", "compactledger", "紧凑"], variant: "compactRows", morph: "compactLedger", style: "currency-table" },
    ],
    QuickActions: [
      { keys: ["compactmenu", "compact-menu", "紧凑菜单"], variant: "compactMenu", morph: "compactMenu", style: "compact-menu" },
      { keys: ["commandbar", "command-bar", "命令栏"], variant: "commandBar", morph: "commandBar", style: "command-bar" },
      { keys: ["taskrail", "task-rail", "任务轨"], variant: "taskRail", morph: "taskRail", style: "task-rail" },
      { keys: ["tileboard", "tilecards", "tile-board", "磁贴"], variant: "tileCards", morph: "tileBoard", style: "tile-board" },
      { keys: ["accentcards", "accent-cards", "强调入口"], variant: "accentCards", morph: "accentCards", style: "accent-cards" },
      { keys: ["segmentedpanel", "segmentedmenu", "分段"], variant: "segmentedMenu", morph: "segmentedPanel", style: "segmented-panel" },
      { keys: ["operationdock", "actiondock", "操作坞", "dock"], variant: "actionDock", morph: "actionDock", style: "toolbar" },
    ],
    TradingAccounts: [
      { keys: ["opstable", "ops-table", "运营表", "table"], variant: "opsTable", morph: "opsTable", style: "ops-table" },
      { keys: ["accountwall", "account-wall", "卡墙"], variant: "accountWall", morph: "accountWall", style: "account-wall" },
      { keys: ["livedemosplit", "separatedlist", "dualcolumn", "双列", "真实/模拟", "真实模拟"], variant: "separatedList", morph: "liveDemoSplit", style: "calm-table" },
      { keys: ["compactrows", "紧凑"], variant: "calmTable", morph: "compactRows", style: "calm-table" },
      { keys: ["statusboard", "status-board", "状态看板"], variant: "workbench", morph: "statusBoard", style: "workbench" },
    ],
    OnboardingProgress: [
      { keys: ["nextstephero", "next-step-hero", "主行动"], variant: "nextStepHero", morph: "nextStepHero", style: "next-step-hero" },
      { keys: ["missionboard", "mission-board", "任务板", "任务看板"], variant: "missionBoard", morph: "missionBoard", style: "mission-board" },
      { keys: ["journeytimeline", "journey-timeline", "时间线"], variant: "journeyTimeline", morph: "journeyTimeline", style: "journey-timeline" },
      { keys: ["ribbonrail", "ribbon-rail", "票据", "里程碑票据"], variant: "ribbonRail", morph: "ribbonRail", style: "ribbon-rail" },
      { keys: ["guidecards", "guide-cards", "任务卡"], variant: "guideCards", morph: "guideCards", style: "guide-cards" },
      { keys: ["pathsteps", "path-steps", "路径", "里程碑"], variant: "path", morph: "pathSteps", style: "path" },
    ],
    UserKycRail: [
      { keys: ["statusbar", "status-rail", "横栏", "状态横栏"], variant: "compactStatus", style: "status-rail" },
      { keys: ["checklist", "清单"], variant: "kycChecklist", style: "status-card" },
      { keys: ["profilewallet", "profile-wallet", "钱包侧栏"], variant: "profileWallet", style: "profile-card" },
    ],
    AccountPerformance: [
      { keys: ["costboard", "cost-board", "成本", "执行"], variant: "costBoard", morph: "costBoard", style: "cost-board" },
      { keys: ["sparklineboard", "sparkline-board", "sparkline"], variant: "sparklineBoard", morph: "sparklineBoard", style: "sparkline-board" },
      { keys: ["terminalchart", "terminal-chart", "终端"], variant: "terminalChart", morph: "terminalChart", style: "terminal-chart" },
      { keys: ["cleansnapshot", "clean-snapshot", "compact", "紧凑"], variant: "cleanSnapshot", morph: "cleanSnapshot", style: "pro-chart" },
      { keys: ["dualchart", "dual-chart", "双图"], variant: "dualChart", morph: "dualChart", style: "pro-chart" },
      { keys: ["metrictrend", "metric-trend", "indicatorband", "指标带"], variant: "metricTrend", morph: "metricTrend", style: "pro-chart" },
    ],
    PromotionBanner: [
      { keys: ["depositladder", "deposit-ladder", "阶梯", "入金奖励"], variant: "depositLadder", morph: "depositLadder", style: "deposit-ladder" },
      { keys: ["editorialcover", "editorial-cover", "专题", "封面"], variant: "editorialCover", morph: "editorialCover", style: "scoreboard" },
      { keys: ["splitvisual", "split-visual", "分栏"], variant: "splitVisual", morph: "splitVisual", style: "clean" },
      { keys: ["scoreboard", "countdown", "倒计时"], variant: "gradientHero", morph: "scoreboard", style: "scoreboard" },
    ],
    ReferralLinkCard: [
      { keys: ["statscard", "stats-card", "统计", "指标带"], variant: "statsCard", morph: "statsCard", style: "stats-card" },
      { keys: ["linkfirst", "link-first", "链接优先"], variant: "linkFirst", morph: "linkFirstPanel", style: "link-first" },
      { keys: ["compact", "紧凑"], variant: "compactCard", morph: "compactStrip", style: "compact-card" },
    ],
    PammProducts: [
      { keys: ["yieldchart", "yield-chart", "收益曲线"], variant: "yieldChartCards", style: "yield-chart-cards" },
      { keys: ["ranking", "排行"], variant: "ranking", style: "ranking" },
    ],
    CopytradingSignals: [
      { keys: ["curvecards", "curve-cards", "曲线"], variant: "curveCards", style: "curve-cards" },
      { keys: ["ranking", "排行"], variant: "ranking", style: "ranking" },
    ],
    RiskDisclosure: [
      { keys: ["marginguard", "margin-guard", "保证金"], variant: "marginGuard", morph: "marginGuard", style: "margin-guard" },
      { keys: ["legalstrip", "legal-strip", "合规条", "指标带", "底部披露"], variant: "legalStrip", morph: "legalStrip", style: "legal-strip" },
      { keys: ["compactnotice", "compact-notice", "紧凑"], variant: "compactNotice", morph: "compactNotice", style: "compact-notice" },
    ],
    FaqSection: [
      { keys: ["twocolumn", "two-column", "双列"], variant: "twoColumn", style: "two-column" },
      { keys: ["compactlist", "compact-list", "紧凑"], variant: "compactList", style: "compact-list" },
      { keys: ["accordion", "折叠"], variant: "accordion", style: "accordion" },
    ],
    SupportContact: [
      { keys: ["manager", "客户经理"], variant: "managerCard", style: "manager-card" },
      { keys: ["compactbar", "compact-bar", "横条"], variant: "compactBar", style: "compact-bar" },
      { keys: ["service", "客服"], variant: "serviceCard", style: "service-card" },
    ],
    AppDownload: [
      { keys: ["storebuttons", "store-buttons", "商店"], variant: "storeButtons", style: "store-buttons" },
      { keys: ["compactbanner", "compact-banner", "横条"], variant: "compactBanner", style: "compact-banner" },
      { keys: ["qrcard", "qr-card", "二维码"], variant: "qrCard", style: "qr-card" },
    ],
  };

  const CORE_COMPONENT_MORPH_MODULES = [
    "AssetOverview",
    "WalletList",
    "QuickActions",
    "TradingAccounts",
    "OnboardingProgress",
    "AccountPerformance",
    "PromotionBanner",
    "ReferralLinkCard",
    "RiskDisclosure",
  ];

  function componentMorphOptions(moduleId) {
    return COMPONENT_MORPH_REGISTRY[moduleId] || [];
  }

  function componentMorphIds(moduleId) {
    return componentMorphOptions(moduleId).map((item) => item.id);
  }

  function componentMorphById(moduleId, morphId) {
    return componentMorphOptions(moduleId).find((item) => item.id === morphId) || null;
  }

  function defaultComponentMorphId(moduleId, variant) {
    const ids = componentMorphIds(moduleId);
    if (!ids.length) return "";
    const mapped = COMPONENT_MORPH_ALIASES[moduleId]?.[variant];
    return ids.includes(mapped) ? mapped : ids[0];
  }

  function normalizeComponentMorphId(moduleId, value, variant) {
    const ids = componentMorphIds(moduleId);
    if (!ids.length) return "";
    const raw =
      typeof value === "string"
        ? value
        : value?.morph || value?.morphId || value?.id || value?.structureId || value?.domMorph || value?.variant;
    const alias = COMPONENT_MORPH_ALIASES[moduleId]?.[raw] || raw;
    return ids.includes(alias) ? alias : defaultComponentMorphId(moduleId, variant);
  }

  function componentMorphPayload(moduleId, variant, source = {}) {
    const morphId = normalizeComponentMorphId(moduleId, source, variant);
    const morph = componentMorphById(moduleId, morphId);
    return {
      variant,
      variantLabel: moduleVariantLabel(moduleId, variant),
      morph: morphId,
      morphId,
      morphLabel: morph?.label || morphId,
      structure: morph?.structure || "",
      reason: cleanMetaText(source?.reason, "", 140),
    };
  }

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
      "command-bar": "commandBar",
      "task-rail": "taskRail",
      "tile-board": "tileCards",
      "accent-cards": "accentCards",
      "compact-menu": "compactMenu",
      "segmented-panel": "segmentedMenu",
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
    onboardingProgress: {
      path: "path",
      checklist: "checklist",
      compact: "compact",
      "guide-cards": "guideCards",
      "journey-timeline": "journeyTimeline",
      "mission-board": "missionBoard",
      "ribbon-rail": "ribbonRail",
      "next-step-hero": "nextStepHero",
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
      colorMode: { enum: ["auto", "light", "dark"] },
	      themeCustom: {
	        type: "object",
	        properties: {
	          input: { type: "string" },
	          primaryColor: { type: "string" },
	        },
	      },
	      styleContract: { type: "object" },
	      goldenStyleContract: { type: "object" },
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
      density: { enum: ["compact", "comfortable", "balanced", "spacious"] },
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
      autoLayout: {
        type: "object",
        properties: {
          strategy: { enum: AUTO_LAYOUT_STRATEGIES },
          desktop: { type: "object" },
          tablet: { type: "object" },
          mobile: { type: "object" },
          moduleRules: { type: "object" },
          notes: { type: "array", items: { type: "string" } },
        },
      },
      moduleStyles: {
        type: "object",
        properties: {
          balanceTotal: { enum: ["command", "metric-strip", "quiet-card"] },
          fundActions: { enum: ["dock", "split-buttons", "compact-row"] },
          adCarousel: { enum: ["immersive", "clean", "compact"] },
          quickActions: { enum: ["matrix", "toolbar", "compact-grid", "command-bar", "task-rail", "tile-board", "accent-cards", "compact-menu", "segmented-panel"] },
          referralLink: { enum: ["console", "link-first", "compact"] },
          referral_link_card: { enum: ["compact-card", "link-first", "stats-card"] },
          announcements: { enum: ["list", "priority-notice", "compact-feed", "ticker-strip"] },
          risk_disclosure: { enum: ["compact-notice", "margin-guard", "legal-strip"] },
          faq_section: { enum: ["accordion", "two-column", "compact-list"] },
          support_contact: { enum: ["service-card", "manager-card", "compact-bar"] },
          app_download: { enum: ["qr-card", "store-buttons", "compact-banner"] },
          tradingAccounts: { enum: ["workbench", "dense-cards", "calm-table", "account-wall", "ops-table"] },
          onboardingProgress: { enum: ["path", "checklist", "compact", "guide-cards", "journey-timeline", "mission-board", "ribbon-rail", "next-step-hero"] },
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
          riskDisclosure: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              demoFallback: { type: "boolean" },
              demoCopy: { type: "array" },
            },
          },
          faq: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
          supportContact: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
            },
          },
          appDownload: {
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
    risk_disclosure: {
      eyebrowKey: "home.riskDisclosure.eyebrow",
      titleKey: "home.riskDisclosure.title",
      summaryKey: "home.riskDisclosure.summary",
      ctaKey: "home.riskDisclosure.cta",
      href: "#risk",
    },
    faq_section: {
      eyebrowKey: "home.faq.eyebrow",
      titleKey: "home.faq.title",
      summaryKey: "home.faq.summary",
      questionOneKey: "home.faq.questionOne",
      answerOneKey: "home.faq.answerOne",
      questionTwoKey: "home.faq.questionTwo",
      answerTwoKey: "home.faq.answerTwo",
    },
    support_contact: {
      eyebrowKey: "home.support.eyebrow",
      titleKey: "home.support.title",
      summaryKey: "home.support.summary",
      primaryKey: "home.support.primary",
      secondaryKey: "home.support.secondary",
      href: "#support",
    },
    app_download: {
      eyebrowKey: "home.appDownload.eyebrow",
      titleKey: "home.appDownload.title",
      summaryKey: "home.appDownload.summary",
      primaryKey: "home.appDownload.primary",
      secondaryKey: "home.appDownload.secondary",
      href: "#download",
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
        { id: "deposit", href: "#fund-actions", icon: "deposit", labelKey: "home.action.deposit" },
        { id: "openReal", href: "#accounts", icon: "user", labelKey: "home.action.openReal" },
        { id: "openDemo", href: "#accounts", icon: "demo", labelKey: "home.action.openDemo" },
        { id: "copytrading", href: "#copytrading", icon: "chart", labelKey: "home.action.copytrading" },
        { id: "transfer", href: "#accounts", icon: "transfer", labelKey: "home.action.transfer" },
        { id: "openAccount", href: "#accounts", icon: "user", labelKey: "home.action.openAccount" },
        { id: "withdraw", href: "#fund-actions", icon: "withdraw", labelKey: "home.action.withdraw" },
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
    kyc_status_card: {
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
    "home.welcome.subtitle": "查看账户净值、资金状态和待办事项，常用交易入口都在这里。",
    "home.welcome.customize": "首页个性化",
    "home.welcome.date": "2026 年 5 月 3 日, 星期日",
    "home.asset.eyebrow": "资产摘要",
    "home.asset.title": "资产概览",
    "home.asset.totalLabel": "余额合计",
    "home.asset.accountsLabel": "交易账号余额",
    "home.asset.walletLabel": "钱包余额",
    "home.asset.walletNote": "按钱包币种统一折算",
    "home.asset.walletStandalone": "钱包余额已拆分为独立栏目",
    "home.asset.accountsOnly": "当前仅展示交易账号资产",
    "home.asset.totalOnly": "仅展示总览，不展开钱包和交易账号明细",
    "home.wallet.eyebrow": "钱包",
    "home.wallet.title": "钱包余额",
    "home.wallet.totalLabel": "钱包余额折算",
    "home.wallet.note": "按钱包币种统一折算",
    "home.fund.eyebrow": "",
    "home.fund.title": "资金操作 Dock",
    "home.fund.summary": "入金和出金入口根据当前方案权重自动放大。",
    "home.action.deposit": "入金",
    "home.action.depositHint": "立即处理",
    "home.action.withdraw": "出金",
    "home.action.withdrawHint": "资金提取",
    "home.action.openAccount": "开新账户",
    "home.action.openDemo": "开模拟账户",
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
    "home.action.copytrading": "Copytrading",
    "home.action.downloadMt5": "下载 MT5",
    "home.action.switchAccount": "切换账号",
    "home.action.kyc": "KYC 状态",
    "home.action.risk": "风险提醒",
    "home.action.realAccount": "真实账号",
    "home.action.demoAccount": "模拟账号",
    "home.action.bindAccount": "绑定账号",
    "home.quick.eyebrow": "",
    "home.quick.title": "快捷入口",
    "home.depositBonus.eyebrow": "入金奖励",
    "home.depositBonus.title": "入金奖励阶梯",
    "home.depositBonus.meta": "$500 / $2,000 / $10,000 三档入金，最高赠金 $300。",
    "home.depositBonus.cta": "立即入金",
    "home.open.eyebrow": "",
    "home.open.title": "开户操作台",
    "home.open.summary": "根据当前客户状态推荐真实账号、模拟账号或绑定账号路径。",
    "home.onboarding.eyebrow": "",
    "home.onboarding.title": "3步成为交易大师",
    "home.onboarding.summary": "让新客户完成 KYC、创建真实账户和首次入金三步。",
    "home.promo.badge": "进行中",
    "home.promo.title": "五月盈利王挑战赛",
    "home.promo.meta": "奖池 9,600 美元 / 剩余 28 天 / 共 3 项活动",
    "home.promo.cta": "查看详情",
    "home.referral.eyebrow": "",
    "home.referral.title": "推广链接控制台",
    "home.referral.summary": "注册链接、邀请码和渠道转化数据集中展示。",
    "home.referralCard.eyebrow": "",
    "home.referralCard.title": "推广链接",
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
    "home.accounts.eyebrow": "",
    "home.accounts.title": "交易账号",
    "home.accounts.fixedView": "固定视图",
    "home.userRail.eyebrow": "",
    "home.userRail.title": "CRM 账户 KYC 状态",
    "home.userRail.summary": "当前 CRM 账户 KYC 已通过，可继续开户注册流程。",
    "home.performance.eyebrow": "",
    "home.performance.title": "账号表现图表",
    "home.performance.summary": "余额、权益、信用和 PnL 曲线用于专业交易判断。",
    "home.walletList.eyebrow": "",
    "home.walletList.title": "多币种钱包列表",
    "home.walletList.summary": "展示币种余额、可用资金和资金动作。",
    "home.createAccount.eyebrow": "",
    "home.createAccount.title": "创建真实账户",
    "home.createAccount.summary": "平台、账户类型、杠杆和账户名称集中填写。",
    "home.market.eyebrow": "市场洞察",
    "home.market.title": "黄金与美元维持高波动",
    "home.market.summary": "重点关注晚间数据公布后的点差和保证金变化。",
    "home.market.metricOne": "黄金波动",
    "home.market.metricTwo": "美元指数",
    "home.announcements.eyebrow": "",
    "home.announcements.title": "公告通知",
    "home.announcements.summary": "系统公告、活动公告和维护通知由接口返回。",
    "home.riskDisclosure.eyebrow": "",
    "home.riskDisclosure.title": "风险提示",
    "home.riskDisclosure.summary": "以下风险披露正式内容应由后台富文本或合规接口返回；缺少数据时使用 Demo 参考文案展示界面效果。",
    "home.riskDisclosure.cta": "查看风险说明",
    "home.faq.eyebrow": "",
    "home.faq.title": "常见问题",
    "home.faq.summary": "开户、入金、平台下载和交易规则的常见问题由后台内容配置。",
    "home.faq.questionOne": "入金一般多久可以到账？",
    "home.faq.answerOne": "到账时间取决于支付通道和审核状态，请以资金记录中的最新状态为准。",
    "home.faq.questionTwo": "在哪里下载交易 APP？",
    "home.faq.answerTwo": "请使用官方 APP 下载入口或后台配置的 MT5 下载链接。",
    "home.support.eyebrow": "",
    "home.support.title": "在线客服",
    "home.support.summary": "服务入口、服务时间和客户经理信息由后台配置，不在首页静态写死。",
    "home.support.primary": "在线咨询",
    "home.support.secondary": "客户经理",
    "home.appDownload.eyebrow": "",
    "home.appDownload.title": "APP 下载",
    "home.appDownload.summary": "APP、MT5 或移动端入口由后台配置，首页只负责展示下载区域和占位。",
    "home.appDownload.primary": "下载 APP",
    "home.appDownload.secondary": "MT5 入口",
    "home.pamm.eyebrow": "PAMM",
    "home.pamm.title": "PAMM 产品推荐",
    "home.pamm.summary": "AI 按回撤、净值曲线和产品期限筛出可作为新手观察仓的 PAMM 候选。",
    "home.risk.eyebrow": "风险提示",
    "home.risk.title": "账户杠杆与保证金需持续关注",
    "home.risk.summary": "当前真实账户持仓集中度较高, 建议检查止损和可用保证金。",
    "home.risk.cta": "查看持仓",
    "home.copytrading.eyebrow": "",
    "home.copytrading.title": "适合新手的信号源",
    "home.copytrading.summary": "按账户阶段、可承受回撤和近 30 日稳定性筛选。",
    "home.copytrading.leader": "主策略",
    "home.copytrading.followers": "跟随人数",
  };

  const QUICK_ACTION_CATALOG = {
    openAccount: { id: "openAccount", href: "#accounts", icon: "user", labelKey: "home.action.openAccount" },
    openReal: { id: "openReal", href: "#accounts", icon: "user", labelKey: "home.action.openReal" },
    openDemo: { id: "openDemo", href: "#accounts", icon: "demo", labelKey: "home.action.openDemo" },
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
    copytrading: { id: "copytrading", href: "#copytrading", icon: "chart", labelKey: "home.action.copytrading" },
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
    openDemo: "openDemo",
    demoAccount: "openDemo",
    copytrading: "copytrading",
    copyTrading: "copytrading",
    mt5: "downloadMt5",
    downloadMt5: "downloadMt5",
    switchAccount: "switchAccount",
    switch: "switchAccount",
    kycStatus: "kyc",
    kyc: "kyc",
  };

  const MODULE_STYLE_OPTIONS = {
    balanceTotal: [
      { id: "command", label: "资产概览", description: "大数字资产、账户和钱包拆分，适合首屏重点。" },
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
      { id: "guide-cards", label: "精美路径卡", description: "每一步都用更精致的图标卡承接动作。" },
      { id: "journey-timeline", label: "交易大师旅程", description: "用更大胆的三步旅程表达新客下一步。" },
      { id: "mission-board", label: "开通面板", description: "完成数、进度条、步骤卡和下一步 CTA 组合成一块。" },
      { id: "ribbon-rail", label: "票据路径", description: "低高度横向票据，适合和推荐卡片同屏。" },
      { id: "next-step-hero", label: "下一步主推", description: "把当前动作变成主按钮和状态摘要。" },
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
      { id: "tile-board", label: "入口磁贴板", description: "每个入口是独立磁贴，适合品牌、资产和标准工作台。" },
      { id: "accent-cards", label: "强调入口卡", description: "用色条表达优先级，适合活动、转化和代理首页。" },
      { id: "compact-menu", label: "紧凑菜单", description: "短按钮菜单，适合移动端和信息密集工作台。" },
      { id: "segmented-panel", label: "分段面板", description: "把入口收进一个分段面板，适合专业和留存场景。" },
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
    announcements: [
      { id: "list", label: "公告列表", description: "系统公告、活动公告和维护通知按列表展示。" },
      { id: "priority-notice", label: "重点公告", description: "突出一条重要公告，其余通知弱化为摘要列表。" },
      { id: "compact-feed", label: "紧凑信息流", description: "降低高度，适合放在辅助栏目。" },
      { id: "ticker-strip", label: "滚动公告条", description: "适合首页第一栏的跑马灯公告。" },
    ],
    pamm_products: [
      { id: "cards", label: "产品卡片", description: "PAMM 产品以卡片展示。" },
      { id: "ranking", label: "收益排行", description: "用排行承接产品比较。" },
      { id: "yield-chart-cards", label: "收益曲线卡", description: "产品指标和收益曲线并列展示。" },
    ],
    copytrading_signals: [
      { id: "signal-cards", label: "信号源卡片", description: "展示信号源名称、收益和风险。" },
      { id: "ranking", label: "信号源排行", description: "多个信号源比较。" },
      { id: "curve-cards", label: "曲线推荐卡", description: "把收益曲线和推荐理由做成视觉亮点。" },
    ],
    risk_disclosure: [
      { id: "compact-notice", label: "紧凑提示", description: "短文案、合规提示和风险状态并列。" },
      { id: "margin-guard", label: "保证金提示", description: "强调保证金、杠杆和持仓风险。" },
      { id: "legal-strip", label: "合规说明条", description: "低干扰地呈现风险披露。" },
    ],
    faq_section: [
      { id: "accordion", label: "折叠问答", description: "标准 FAQ 折叠列表。" },
      { id: "two-column", label: "双列问答", description: "适合展示多个常见问题。" },
      { id: "compact-list", label: "紧凑列表", description: "辅助区低高度 FAQ。" },
    ],
    support_contact: [
      { id: "service-card", label: "客服卡片", description: "在线客服和服务时间入口。" },
      { id: "manager-card", label: "客户经理卡", description: "突出专属经理或一对一协助。" },
      { id: "compact-bar", label: "联系条", description: "横向紧凑客服入口。" },
    ],
    app_download: [
      { id: "qr-card", label: "二维码卡", description: "APP 下载二维码和终端入口。" },
      { id: "store-buttons", label: "商店按钮", description: "移动端下载按钮占位。" },
      { id: "compact-banner", label: "下载横条", description: "低高度下载提示。" },
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
      { id: "cost-board", label: "成本执行看板", description: "点差、佣金、持仓 PnL、保证金和 MT5 执行效率同屏。" },
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
    adCarousel: { enabled: false, autoRotate: true, slideCount: 3 },
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
    userKycRail: { enabled: false, kycStatus: "verified" },
    riskNotice: { enabled: false },
    pamm: { enabled: false },
    copytrading: { enabled: false },
    announcements: { enabled: false },
    marketNews: { enabled: false },
    riskDisclosure: {
      enabled: false,
      demoFallback: true,
      demoCopy: [
        "外汇、贵金属、差价合约及其他保证金产品涉及杠杆，价格波动可能导致本金损失。",
        "交易前请确认您理解保证金要求、强平机制、滑点、流动性、系统中断及汇率波动等风险。",
        "过往表现、收益展示或模拟交易结果不构成未来收益承诺。",
      ],
    },
    faq: { enabled: false },
    supportContact: { enabled: false },
    appDownload: { enabled: false },
  };

  const DEFAULT_CONFIG = {
    schemaVersion: 4,
    blueprintVersion: 4,
    name: "AI 新客账户概览",
    layoutPreset: "onboardingJourney",
    designGenome: "onboardingJourney",
    pageStory: "accountActivation",
	    themePreset: "blueFinance",
	    theme: "blueFinance",
	    themeCustom: null,
	    styleContract: null,
	    goldenStyleContract: null,
    personalizationStrength: "strong",
    density: "balanced",
    heroFocus: "copytrading_signals",
    modules: {
      ...Object.keys(MODULE_VARIANT_DEFAULTS).reduce((modules, moduleId) => {
        modules[moduleId] = { variant: MODULE_VARIANT_DEFAULTS[moduleId] };
        return modules;
      }, {}),
      CopytradingSignals: { variant: "curveCards" },
      PammProducts: { variant: "yieldChartCards" },
      OnboardingProgress: { variant: "missionBoard" },
      QuickActions: { variant: "taskRail" },
      TradingAccounts: { variant: "separatedList" },
      AssetOverview: { variant: "compactTable" },
    },
    moduleStyles: {
      ...MODULE_STYLE_DEFAULTS,
      copytrading_signals: "curve-cards",
      pamm_products: "yield-chart-cards",
      onboardingProgress: "mission-board",
      quickActions: "task-rail",
      tradingAccounts: "dense-cards",
      balanceTotal: "metric-strip",
    },
    moduleSettings: {
      ...DEFAULT_MODULE_SETTINGS,
      quickActions: { ...DEFAULT_MODULE_SETTINGS.quickActions, enabled: true, count: 5, display: "iconText", actions: [] },
      assets: {
        ...DEFAULT_MODULE_SETTINGS.assets,
        enabled: true,
        showFundActions: false,
        showAccountBreakdown: true,
        showWalletBreakdown: true,
      },
      wallet: { ...DEFAULT_MODULE_SETTINGS.wallet, enabled: false, placement: "mergedWithAssets", showFundActions: false },
      openAccount: { ...DEFAULT_MODULE_SETTINGS.openAccount, enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" },
      tradingAccounts: {
        ...DEFAULT_MODULE_SETTINGS.tradingAccounts,
        enabled: true,
        realEnabled: true,
        demoEnabled: true,
        grouping: "separated",
        viewMode: "card",
        realViewMode: "card",
        demoViewMode: "card",
      },
      pamm: { enabled: true },
      copytrading: { enabled: true },
      promoHighlight: { ...DEFAULT_MODULE_SETTINGS.promoHighlight, enabled: false },
      adCarousel: { ...DEFAULT_MODULE_SETTINGS.adCarousel, enabled: false },
    },
    sections: [
      { id: "activation-copytrading", type: "full", title: "CopyTrading 推荐", slots: ["copytrading_signals"] },
      { id: "activation-onboarding", type: "full", title: "新客启动", slots: ["onboarding_guide"] },
      { id: "ai-products", type: "full", title: "PAMM 推荐", slots: ["pamm_products"] },
      { id: "activation-actions", type: "split", title: "下一步操作", slots: ["quick_actions", "asset_overview"] },
      { id: "activation-accounts", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
    ],
    brickPlan: [
      { brickId: "copytradingSignals.curveCards", brickName: "AI 跟单信号源推荐", family: "CopytradingSignals", feature: "copytrading_signals", component: "copytrading_signals", size: "3x2", zone: "full", reason: "CopyTrading 作为首屏视觉亮点，用整横栏承载信号源、收益和曲线。" },
      { brickId: "onboardingProgress.missionBoard", brickName: "账户开通进度面板", family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_guide", size: "3x1", zone: "full", reason: "用整横栏承接 KYC、创建真实账户、首次入金三步旅程。" },
      { brickId: "pammProducts.recommendations", brickName: "AI PAMM 产品推荐", family: "PammProducts", feature: "pamm_products", component: "pamm_products", size: "3x2", zone: "full", reason: "PAMM 作为独立 AI 推荐模块，用整横栏展示产品、收益、风险和曲线。" },
      { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "固定 5 个新客高频操作入口。" },
      { brickId: "assetOverview.compactMetrics", brickName: "轻量资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_overview", size: "3x1", zone: "main", reason: "资产降级为辅助指标，不抢新客引导和跟单推荐。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实与模拟账号卡片", family: "TradingAccounts", feature: "tradingAccounts", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号都用卡片，分区展示形成明显区分。" },
    ],
    brickTrace: { intent: "copytrading", pageIntent: "copytrading", strategy: "默认新客账户概览", score: 97, selectedCount: 6 },
    emphasis: {
      deposit: "high",
      openAccount: "medium",
      promo: "medium",
      accounts: "medium",
    },
    aiSummary: "默认进入新客账户概览：首屏展示开户下一步和 AI Copytrading 推荐，PAMM 与账户卡片向下承接。",
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
      featureOrder: ["quickActions", "accountPerformance", "userKycRail", "balanceTotal", "risk_disclosure", "tradingAccounts", "adCarousel"],
      zoneMap: {
        quickActions: "hero",
        accountPerformance: "main",
        userKycRail: "rail",
        balanceTotal: "full",
        risk_disclosure: "rail",
        tradingAccounts: "full",
      },
    },
    accountActivation: {
      id: "accountActivation",
      label: "新客旅程叙事",
      summary: "把 KYC、开户、创建账号、跟单机会和首次入金做成连续下一步。",
      featureOrder: ["onboardingProgress", "copytrading_signals", "openAccountActions", "createAccountForm", "fundActions", "quickActions", "tradingAccounts", "adCarousel"],
      zoneMap: {
        onboardingProgress: "hero",
        copytrading_signals: "main",
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
      summary: "先给入金奖励和账户摘要，再承接开户进度、快捷入口、账号表现和 Live/Demo 账号证明。",
      featureOrder: ["promo_banner", "asset_overview", "onboarding_guide", "quick_actions", "trading_account_highlight", "trading_accounts_list"],
      zoneMap: {
        promo_banner: "hero",
        asset_overview: "hero",
        onboarding_guide: "main",
        quick_actions: "rail",
        trading_account_highlight: "full",
        trading_accounts_list: "full",
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
      featureOrder: ["balanceTotal", "fundActions", "walletList", "accountPerformance", "risk_disclosure", "quickActions", "tradingAccounts"],
      zoneMap: {
        balanceTotal: "hero",
        fundActions: "rail",
        walletList: "full",
        accountPerformance: "main",
        risk_disclosure: "rail",
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
      requiredBricks: ["promoBanner.depositLadder", "assetOverview.tickerStrip", "onboardingProgress.nextStepHero", "quickActions.accentCards", "accountPerformance.proChart", "tradingAccounts.separatedList"],
      moduleVariants: {
        PromotionBanner: "depositLadder",
        AssetOverview: "tickerStrip",
        OnboardingProgress: "nextStepHero",
        QuickActions: "accentCards",
        AccountPerformance: "proChart",
        TradingAccounts: "separatedList",
      },
      moduleStyles: {
        promo_banner: "deposit-ladder",
        promoHighlight: "deposit-ladder",
        asset_overview: "ticker-strip",
        balanceTotal: "ticker-strip",
        onboarding_guide: "next-step-hero",
        onboardingProgress: "next-step-hero",
        quick_actions: "accent-cards",
        quickActions: "accent-cards",
        trading_account_highlight: "pro-chart",
        accountPerformance: "pro-chart",
        trading_accounts_list: "calm-table",
        tradingAccounts: "calm-table",
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
      requiredBricks: ["quickActions.commandBar", "accountPerformance.sparklineBoard", "tradingAccounts.separatedList"],
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
      requiredBricks: ["onboardingProgress.missionBoard", "openAccount.conversionPanel", "createAccountForm.realAccount", "quickActions.taskRail"],
      moduleVariants: {
        OnboardingProgress: "missionBoard",
        OpenAccount: "conversionPanel",
        QuickActions: "taskRail",
        TradingAccounts: "accountWall",
      },
      moduleStyles: {
        onboardingProgress: "mission-board",
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

  const SKELETON_STYLE_CONTRACTS = {
    accountOpsConsole: {
      id: "ops-console",
      label: "账户运营控制台契约",
      personality: "ops-console",
      tone: "冷静、清晰、可扫描",
      surface: "薄边框白底模块，浅蓝灰背景，只用一套主色强调状态和主操作。",
      tokens: {
        cardRadius: "8px",
        buttonRadius: "8px",
        sectionGap: "14px",
        cardPadding: "16px",
        cardShadow: "none",
      },
      chromePolicy: {
        mode: "cardedDashboard",
        sectionChrome: "group",
        defaultSlotChrome: "contained",
        slotOverrides: {
          trading_account_highlight: "tableSurface",
          trading_accounts_list: "tableSurface",
          wallet_list: "tableSurface",
          risk_disclosure: "legalStrip",
          support_contact: "rail",
          app_download: "rail",
        },
        componentBoundary: "component-contained",
        promptRule: "页面背景、模块表面和模块边界必须清楚分层；普通 slot 保留轻量卡片边界，不把不同业务模块融成一个外壳。",
      },
      componentRules: [
        "所有业务模块保持薄边框、低阴影、紧凑标题栏和一致的指标字号。",
        "列表、钱包、账号和图表都用同一套状态点、标签、分隔线和按钮高度。",
        "模块之间可以换结构，但不能换成另一套品牌色、圆角、阴影或营销海报语言。",
      ],
      ctaRules: [
        "全页只保留一个最强主 CTA，其余动作降级为描边、文本或工具按钮。",
        "资金动作、快捷入口和账号动作不能重复放大同一个按钮。",
      ],
      moduleGrammar: "指标带、运营表格、钱包矩阵、账号证明和轻量趋势图共同组成工作台。",
      differenceRule: "本方案差异来自运营工作台的信息编排，不靠随机颜色、厚重阴影或大面积装饰。",
    },
    tradingCommand: {
      id: "trading-command",
      label: "交易指挥中心契约",
      personality: "trading-command",
      tone: "高密度、行动优先、终端感克制",
      surface: "紧凑工具栏、趋势图和状态面板优先，背景可以更深但仍要保持金融客户端克制。",
      tokens: {
        cardRadius: "6px",
        buttonRadius: "6px",
        sectionGap: "12px",
        cardPadding: "14px",
        cardShadow: "none",
      },
      chromePolicy: {
        mode: "workbench",
        sectionChrome: "workbench",
        defaultSlotChrome: "tableSurface",
        slotOverrides: {
          quick_actions: "inline",
          asset_overview: "inline",
          risk_disclosure: "legalStrip",
          support_contact: "rail",
        },
        componentBoundary: "shared-workbench",
        promptRule: "slot 之间共享工作台表面，优先用工具栏、状态条、表格和图表区衔接，避免每块独立白卡。",
      },
      componentRules: [
        "所有模块围绕交易动作、账号状态和趋势图组织，避免营销 Banner 抢首屏。",
        "指标、图表、账号列表使用统一的终端式密度和短标签。",
        "卡片可以更紧凑，但同屏组件必须共享边框粗细、标题高度和图表线条风格。",
      ],
      ctaRules: [
        "主操作偏交易或切换账号，入金只能作为辅助动作。",
        "按钮使用短命令式文案，避免多个大面积蓝色按钮并排。",
      ],
      moduleGrammar: "命令栏、净值趋势、账号表格、风险/保证金状态共同组成交易控制台。",
      differenceRule: "本方案差异必须体现首屏交易指挥感，而不是普通资产卡片重排。",
    },
    onboardingJourney: {
      id: "onboarding-journey",
      label: "新客旅程契约",
      personality: "onboarding-journey",
      tone: "有秩序、推进感、低压力",
      surface: "开户、资产、快捷操作和账号证明共享连续工作台表面，辅助内容用轻分割线收口。",
      tokens: {
        cardRadius: "8px",
        buttonRadius: "8px",
        sectionGap: "12px",
        cardPadding: "16px",
        cardShadow: "none",
      },
      chromePolicy: {
        mode: "flatConnected",
        sectionChrome: "connected",
        defaultSlotChrome: "flat",
        slotOverrides: {
          onboarding_guide: "featured",
          trading_accounts_list: "tableSurface",
          trading_account_highlight: "tableSurface",
          risk_disclosure: "legalStrip",
          faq_section: "bare",
          support_contact: "rail",
        },
        componentBoundary: "page-owned",
        promptRule: "页面骨架负责统一外壳和分区衔接，普通 slot 输出内容片段；只有开户主路径可轻量 featured。",
      },
      componentRules: [
        "开户进度、资产摘要、快捷入口和账号证明要像同一组账户启动区，避免各自独立成卡。",
        "步骤编号、进度、状态标签和下一步按钮必须共享同一视觉语法。",
        "资产和账号模块只能做证明或承接，不能抢走旅程主线。",
      ],
      ctaRules: [
        "唯一主 CTA 应指向下一步，新手路径以外的动作保持低干扰。",
        "已完成、待完成和下一步状态必须清楚区分。",
      ],
      moduleGrammar: "旅程主面板、任务轨、资产证明、账号工作台和辅助 FAQ 共同组成连续激活流程。",
      differenceRule: "本方案差异必须体现连续旅程，不要退回普通仪表盘。",
    },
    magazineCampaign: {
      id: "magazine-campaign",
      label: "活动专题契约",
      personality: "magazine-campaign",
      tone: "专题化、转化明确、仍然克制",
      surface: "活动权益可以做强视觉，但下方模块必须用同一套专题卡片和数据证明承接。",
      tokens: {
        cardRadius: "8px",
        buttonRadius: "8px",
        sectionGap: "16px",
        cardPadding: "18px",
        cardShadow: "0 14px 34px rgba(15,23,42,.10)",
      },
      chromePolicy: {
        mode: "heroProof",
        sectionChrome: "band",
        defaultSlotChrome: "contained",
        slotOverrides: {
          promo_banner: "featured",
          welcome_header: "bare",
          quick_actions: "inline",
          risk_disclosure: "legalStrip",
        },
        componentBoundary: "mixed",
        promptRule: "专题首屏可以强视觉，下方证明区降噪；禁止每个 slot 使用不同大卡片和不同按钮语言。",
      },
      componentRules: [
        "活动、快捷入口、账号证明和风险提示要像同一篇专题里的不同段落。",
        "允许更强首屏，但禁止每个组件各自使用不同渐变、插画或按钮样式。",
        "下方运营模块要降噪，避免与活动主视觉争抢。",
      ],
      ctaRules: [
        "活动报名或查看权益是主 CTA，入金和开户只作为承接动作。",
        "同一屏不重复出现多个同权重活动按钮。",
      ],
      moduleGrammar: "专题封面、权益摘要、参与路径、账号证明和合规说明共同组成活动页面。",
      differenceRule: "本方案差异必须来自专题叙事和首屏重心，而不是把工作台染成活动色。",
    },
    privateWealthDesk: {
      id: "wealth-desk",
      label: "私行服务台契约",
      personality: "wealth-desk",
      tone: "稳重、留白更足、服务感",
      surface: "资产、权益和服务入口使用更舒展的分组，但圆角、边框和标签必须统一。",
      tokens: {
        cardRadius: "8px",
        buttonRadius: "8px",
        sectionGap: "18px",
        cardPadding: "18px",
        cardShadow: "0 16px 36px rgba(15,23,42,.08)",
      },
      chromePolicy: {
        mode: "heroProof",
        sectionChrome: "group",
        defaultSlotChrome: "contained",
        slotOverrides: {
          asset_overview: "featured",
          trading_accounts_list: "tableSurface",
          risk_disclosure: "legalStrip",
          support_contact: "rail",
        },
        componentBoundary: "mixed",
        promptRule: "资产和服务模块可独立成块，但边框、标题、状态标签和按钮节奏必须像同一张服务台。",
      },
      componentRules: [
        "资产和专属服务是主线，交易账号和活动只能做辅助证明。",
        "模块密度可舒展，但标题、金额、标签和分隔线必须保持同一节奏。",
        "黑金或轻金色只作为克制强调，不把每个模块做成不同奢华卡片。",
      ],
      ctaRules: [
        "主 CTA 偏专属服务、开户或咨询，资金动作降级。",
        "服务入口不能和普通快捷入口混成同权重按钮组。",
      ],
      moduleGrammar: "资产信任、权益服务、客户经理入口和账号证明共同组成服务台。",
      differenceRule: "本方案差异必须体现服务台和资产信任，不要做成普通营销落地页。",
    },
    depositLadder: {
      id: "deposit-ladder",
      label: "入金转化契约",
      personality: "deposit-ladder",
      tone: "转化清晰、奖励明确、辅助信息降噪",
      surface: "奖励阶梯、账户摘要和下一步路径使用同一套转化组件语言。",
      tokens: {
        cardRadius: "8px",
        buttonRadius: "8px",
        sectionGap: "14px",
        cardPadding: "16px",
        cardShadow: "0 12px 30px rgba(37,99,235,.08)",
      },
      chromePolicy: {
        mode: "sectionBand",
        sectionChrome: "band",
        defaultSlotChrome: "flat",
        sectionOverrides: {
          "welcome-header": "connected",
          "deposit-hero": "connected",
          "deposit-actions": "plain",
          "deposit-activation": "plain",
          "deposit-kyc-status": "plain",
          "deposit-copytrading": "band",
          "deposit-referral-faq": "band",
          "deposit-performance": "workbench",
          "deposit-accounts": "workbench",
          "risk-disclosure-footer": "band",
        },
        slotOverrides: {
          promo_banner: "featured",
          asset_overview: "inline",
          onboarding_guide: "inline",
          trading_account_highlight: "tableSurface",
          trading_accounts_list: "tableSurface",
          risk_disclosure: "legalStrip",
        },
        componentBoundary: "page-owned",
        promptRule: "入金路径可以按顺序靠近，但奖励、账户摘要和快捷入口必须保留可识别模块边界；不要用连续浅色带把不同业务模块糊成一个外壳。",
      },
      componentRules: [
        "入金奖励和账户摘要是首屏主线，钱包长列表、出金和复杂图表必须降级。",
        "阶梯、进度、权益和账号证明的标签样式要统一。",
        "不要在快捷入口、资产卡和活动卡里同时放大入金按钮。",
      ],
      ctaRules: [
        "首次入金是唯一主 CTA，其他动作只做辅助承接。",
        "活动规则和风险说明必须低干扰但可见。",
      ],
      moduleGrammar: "奖励阶梯、资产摘要、新手路径、账号证明和规则说明共同组成入金转化页。",
      differenceRule: "本方案差异必须体现入金路径，不要只是把普通首页顶部换成活动文案。",
      layoutRules: {
        blockRelation: "欢迎、奖励、账户摘要和开户路径必须连续成组；CopyTrading、推广帮助、账号证明和风险披露之间使用明确硬断点。",
      },
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
      primaryGoal: "先让客户看清余额合计、交易账号余额、钱包余额和多币种钱包列表。",
      primaryAction: "deposit",
      secondaryAction: "withdraw",
      firstScreenSlots: ["balanceTotal", "quickActions"],
      operationSlots: ["walletList", "accountPerformance", "risk_disclosure"],
      accountSlots: ["tradingAccounts"],
      weakSlots: ["adCarousel", "referralLink", "openAccountActions"],
      maxPrimaryActionSurfaces: 2,
    },
    deposit: {
      label: "入金转化契约",
      primaryGoal: "用首次入金主 CTA 串联账户摘要、开户进度、交易账号证明和运营推荐。",
      primaryAction: "deposit",
      secondaryAction: "quickActions",
      firstScreenSlots: ["promo_banner", "asset_overview", "onboarding_guide"],
      operationSlots: ["quickActions"],
      accountSlots: ["accountPerformance", "tradingAccounts"],
      weakSlots: ["withdraw", "walletList", "adCarousel", "referralLink", "createAccountForm"],
      maxPrimaryActionSurfaces: 1,
      forcedQuickActions: [],
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
    copytrading: {
      label: "跟单推荐契约",
      primaryGoal: "首屏展示可解释的 CopyTrading 信号源机会，并用账号和快捷入口承接下一步。",
      primaryAction: "copytrading",
      secondaryAction: "openAccount",
      firstScreenSlots: ["copytrading_signals", "onboarding_guide"],
      operationSlots: ["quick_actions", "quickActions"],
      accountSlots: ["trading_accounts_list", "tradingAccounts"],
      weakSlots: ["referralLink", "promo_banner", "adCarousel"],
      maxPrimaryActionSurfaces: 2,
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
      operationSlots: ["userKycRail", "balanceTotal", "risk_disclosure"],
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
      settings: { assets: { enabled: true, visibleFields: ["total", "tradingAccount", "wallet"], showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: true }, wallet: { enabled: true, placement: "standalone", showFundActions: false } },
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
          visibleFields: ["total", "tradingAccount", "wallet"],
          showFundActions: false,
          showAccountBreakdown: true,
          showWalletBreakdown: true,
          showAvailable: false,
          showMargin: false,
          showRiskLevel: false,
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
      settings: { assets: { enabled: true, visibleFields: ["total", "tradingAccount", "wallet"], showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: true }, wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false } },
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
      settings: { assets: { enabled: true, visibleFields: ["total", "tradingAccount", "wallet"], showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: true, showAvailable: false }, wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false } },
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
      settings: { assets: { enabled: true, visibleFields: ["total", "tradingAccount", "wallet"], showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: true }, wallet: { enabled: true, placement: "standalone", showFundActions: false } },
      reason: "把资产概览做成客户经理服务台，弱化普通卡片感。",
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
      settings: { assets: { enabled: true, visibleFields: ["total", "tradingAccount", "wallet"], showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: true, showAvailable: false, showMargin: false, showRiskLevel: false }, riskDisclosure: { enabled: true } },
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
      id: "quickActions.tileBoard",
      name: "快捷入口磁贴板",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "2x1",
      defaultZone: "main",
      intents: ["standard", "asset", "brand", "vip"],
      tags: ["快捷", "磁贴", "品牌", "资产", "服务"],
      moduleId: "QuickActions",
      variant: "tileCards",
      moduleStyleFeature: "quickActions",
      moduleStyle: "tile-board",
      settings: { quickActions: { enabled: true, count: 6, display: "iconText" } },
      reason: "每个入口都有独立磁贴，用更清晰的边界承接账户服务动作。",
    },
    {
      id: "quickActions.accentCards",
      name: "强调快捷入口卡",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "2x1",
      defaultZone: "main",
      intents: ["growth", "partner", "deposit", "retention"],
      tags: ["快捷", "活动", "转化", "代理", "优先级"],
      moduleId: "QuickActions",
      variant: "accentCards",
      moduleStyleFeature: "quickActions",
      moduleStyle: "accent-cards",
      settings: { quickActions: { enabled: true, count: 8, display: "iconText" } },
      reason: "用带色条的入口卡区分业务优先级，避免普通裸排入口。",
    },
    {
      id: "quickActions.compactMenu",
      name: "紧凑快捷菜单",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "2x1",
      defaultZone: "main",
      intents: ["mobile", "trader", "insight"],
      tags: ["快捷", "紧凑", "移动", "专业", "菜单"],
      moduleId: "QuickActions",
      variant: "compactMenu",
      moduleStyleFeature: "quickActions",
      moduleStyle: "compact-menu",
      settings: { quickActions: { enabled: true, count: 6, display: "iconText" } },
      reason: "高密度场景把入口收成短菜单，同时保留每个入口的独立边界。",
    },
    {
      id: "quickActions.segmentedPanel",
      name: "快捷入口分段面板",
      family: "QuickActions",
      feature: "quickActions",
      component: "quick_actions",
      size: "2x1",
      defaultZone: "main",
      intents: ["trader", "retention", "asset"],
      tags: ["快捷", "分段", "专业", "留存", "面板"],
      moduleId: "QuickActions",
      variant: "segmentedMenu",
      moduleStyleFeature: "quickActions",
      moduleStyle: "segmented-panel",
      settings: { quickActions: { enabled: true, count: 6, display: "iconText" } },
      reason: "分段面板把多个入口组织成一组，同时每个入口仍有独立卡片边界。",
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
      size: "3x1",
      defaultZone: "full",
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
      size: "3x1",
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
      name: "推广链接",
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
      id: "copytradingSignals.curveCards",
      name: "AI 跟单信号源推荐",
      family: "CopytradingSignals",
      feature: "copytrading_signals",
      component: "copytrading_signals",
      size: "3x2",
      defaultZone: "full",
      intents: ["copytrading", "onboarding", "standard"],
      tags: ["copytrading", "跟单", "信号源", "推荐", "收益率", "收益曲线"],
      moduleId: "CopytradingSignals",
      variant: "curveCards",
      moduleStyleFeature: "copytrading_signals",
      moduleStyle: "curve-cards",
      settings: { copytrading: { enabled: true } },
      reason: "把信号源名称、收益率、总收益、回撤和收益曲线做成跟单推荐亮点。",
    },
    {
      id: "onboardingProgress.checklist",
      name: "3步成为交易大师清单",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "3x1",
      defaultZone: "full",
      intents: ["onboarding"],
      tags: ["新手", "新客", "开户", "注册", "kyc", "首次", "交易大师", "三步"],
      moduleId: "OnboardingProgress",
      variant: "checklist",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "checklist",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "把 KYC、创建真实账号和首次入金包装成三步成为交易大师的任务。",
    },
    {
      id: "onboardingProgress.guideCards",
      name: "新客精美任务卡",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "3x1",
      defaultZone: "full",
      intents: ["onboarding", "deposit", "retention"],
      tags: ["新手", "新客", "开户", "卡片", "图标", "美观", "有欲望", "下一步"],
      moduleId: "OnboardingProgress",
      variant: "guideCards",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "guide-cards",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "用非方格的精美图标卡片展示 KYC、开真实账户和首次入金。",
    },
    {
      id: "onboardingProgress.timeline",
      name: "3步交易大师时间线",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "3x1",
      defaultZone: "full",
      intents: ["onboarding", "deposit", "retention"],
      tags: ["新客", "开户", "旅程", "时间线", "下一步", "交易大师", "三步"],
      moduleId: "OnboardingProgress",
      variant: "journeyTimeline",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "journey-timeline",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "新客首页用三步旅程表达当前状态和下一步。",
    },
    {
      id: "onboardingProgress.missionBoard",
      name: "账户开通进度面板",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "3x1",
      defaultZone: "full",
      intents: ["onboarding", "copytrading", "deposit", "retention"],
      tags: ["新手", "新客", "开户", "账户开通", "进度", "0/3", "下一步", "任务面板"],
      moduleId: "OnboardingProgress",
      variant: "missionBoard",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "mission-board",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "用账户开通进度、进度条、步骤卡和主 CTA 组合成更强的新客转化面板。",
    },
    {
      id: "onboardingProgress.ribbonRail",
      name: "开户里程碑票据",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "3x1",
      defaultZone: "full",
      intents: ["onboarding", "copytrading", "retention"],
      tags: ["开户", "里程碑", "票据", "横向", "紧凑", "路径"],
      moduleId: "OnboardingProgress",
      variant: "ribbonRail",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "ribbon-rail",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "把三步开户路径压缩成横向票据，降低高度但保持每一步的状态和动作。",
    },
    {
      id: "onboardingProgress.nextStepHero",
      name: "下一步开户主面板",
      family: "OnboardingProgress",
      feature: "onboardingProgress",
      component: "onboarding_progress",
      size: "3x1",
      defaultZone: "full",
      intents: ["onboarding", "deposit", "retention"],
      tags: ["下一步", "主按钮", "CTA", "开户", "KYC", "入金"],
      moduleId: "OnboardingProgress",
      variant: "nextStepHero",
      moduleStyleFeature: "onboardingProgress",
      moduleStyle: "next-step-hero",
      settings: { openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "standalone" } },
      reason: "把当前最该完成的一步放大成主行动面板，减少用户判断成本。",
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
	      name: "KYC 当前状态卡",
      family: "UserKycRail",
      feature: "kyc_status_card",
      component: "kyc_status_card",
      size: "1x1",
      defaultZone: "rail",
      intents: ["trader", "onboarding", "asset"],
      tags: ["kyc", "状态", "认证", "当前状态"],
      moduleId: "UserKycRail",
	      variant: "compactStatus",
	      moduleStyleFeature: "kyc_status_card",
	      moduleStyle: "status-card",
	      settings: { userKycRail: { enabled: true } },
	      reason: "只展示当前 CRM KYC 状态和对应提交动作。",
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
      size: "3x2",
      defaultZone: "full",
      intents: ["trader", "asset"],
      tags: ["交易", "图表", "表现", "pnl", "权益", "余额"],
      moduleId: "AccountPerformance",
      variant: "proChart",
      moduleStyleFeature: "accountPerformance",
      moduleStyle: "pro-chart",
      reason: "账号表现包含账号上下文、主数值和趋势图，默认独占整横栏获得更好的展示空间。",
    },
    {
      id: "accountPerformance.sparklineBoard",
      name: "Sparkline 指挥看板",
      family: "AccountPerformance",
      feature: "accountPerformance",
      component: "account_performance",
      size: "3x2",
      defaultZone: "full",
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
      size: "3x2",
      defaultZone: "full",
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
	      id: "riskDisclosure.marginGuard",
	      name: "保证金风险提示",
	      family: "RiskDisclosure",
	      feature: "risk_disclosure",
      component: "risk_disclosure",
      size: "1x2",
      defaultZone: "rail",
      intents: ["asset", "trader", "risk"],
      tags: ["风险", "保证金", "杠杆", "预警", "合规"],
      moduleId: "RiskDisclosure",
      variant: "marginGuard",
      moduleStyleFeature: "risk_disclosure",
      moduleStyle: "margin-guard",
	      settings: { riskDisclosure: { enabled: true }, assets: { showRiskLevel: true, showMargin: true, showAvailable: true } },
	      reason: "把保证金、杠杆和风险提示作为可见合规模块，而不是隐藏在公告里。",
	    },
	    {
	      id: "riskDisclosure.legalStrip",
	      name: "底部合规风险披露",
	      family: "RiskDisclosure",
	      feature: "risk_disclosure",
	      component: "risk_disclosure",
	      size: "3x1",
	      defaultZone: "full",
	      intents: ["asset", "trader", "risk", "onboarding", "growth", "standard"],
	      tags: ["风险", "风险披露", "合规", "免责声明", "底部", "富文本"],
	      moduleId: "RiskDisclosure",
	      variant: "legalStrip",
	      moduleStyleFeature: "risk_disclosure",
	      moduleStyle: "legal-strip",
	      settings: { riskDisclosure: { enabled: true } },
	      reason: "外汇和 CFD 平台通常把完整风险披露、免责声明和监管说明稳定放在页面底部。",
	    },
	    {
	      id: "faqSection.topQuestions",
      name: "常见问题折叠区",
      family: "FaqSection",
      feature: "faq_section",
      component: "faq_section",
      size: "2x1",
      defaultZone: "main",
      intents: ["onboarding", "growth", "deposit", "standard"],
      tags: ["faq", "常见问题", "开户", "入金", "下载"],
      moduleId: "FaqSection",
      variant: "accordion",
      moduleStyleFeature: "faq_section",
      moduleStyle: "accordion",
      settings: { faq: { enabled: true } },
      reason: "把开户、入金、下载等常见问题作为独立内容模块，帮助用户自助决策。",
    },
    {
      id: "supportContact.serviceCard",
      name: "在线客服卡片",
      family: "SupportContact",
      feature: "support_contact",
      component: "support_contact",
      size: "1x1",
      defaultZone: "rail",
      intents: ["onboarding", "growth", "partner", "vip", "deposit"],
      tags: ["客服", "客户经理", "在线咨询", "帮助"],
      moduleId: "SupportContact",
      variant: "serviceCard",
      moduleStyleFeature: "support_contact",
      moduleStyle: "service-card",
      settings: { supportContact: { enabled: true } },
      reason: "管理员选择客服时必须有可见服务入口，具体在线状态和链接由后台配置。",
    },
    {
      id: "appDownload.qrCard",
      name: "APP 下载卡片",
      family: "AppDownload",
      feature: "app_download",
      component: "app_download",
      size: "1x1",
      defaultZone: "rail",
      intents: ["mobile", "onboarding", "growth", "retention"],
      tags: ["app", "下载", "mt5", "移动端", "二维码"],
      moduleId: "AppDownload",
      variant: "qrCard",
      moduleStyleFeature: "app_download",
      moduleStyle: "qr-card",
      settings: { appDownload: { enabled: true } },
      reason: "APP 下载和移动端交易入口作为独立栏目，避免被快捷入口占位吞掉。",
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
      density: "balanced",
      strength: "medium",
      bricks: ["assetOverview.tickerStrip", "quickActions.taskRail", "walletList.currencyTable", "accountPerformance.proChart", "riskDisclosure.marginGuard", "tradingAccounts.separatedList"],
      summary: "资产概览只做三项汇总，多币种钱包放到钱包列表，快捷入口与资产同行。",
    },
    trader: {
      label: "专业交易工作台",
      layoutPreset: "tradingPro",
      themePreset: "default",
      density: "compact",
      strength: "medium",
      bricks: ["quickActions.actionDock", "accountPerformance.proChart", "assetOverview.compactMetrics", "tradingAccounts.separatedList"],
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
    copytrading: {
      label: "AI 跟单推荐流",
      layoutPreset: "onboardingJourney",
      themePreset: "blueFinance",
      density: "balanced",
      strength: "strong",
      bricks: ["copytradingSignals.curveCards", "onboardingProgress.missionBoard", "quickActions.taskRail", "accountPerformance.proChart", "tradingAccounts.separatedList"],
      summary: "把跟单信号源推荐放进首屏，账户和开户路径作为承接。",
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
	      bricks: ["accountPerformance.proChart", "marketInsight.healthPanel", "assetOverview.compactMetrics", "riskDisclosure.marginGuard", "fundActions.priorityDock", "tradingAccounts.separatedList"],
	      summary: "把账户表现、PnL、资金流和风险提示组织成每日检查型首页。",
	    },
	    deposit: {
	      label: "入金转化路径",
	      layoutPreset: "conversionFirst",
	      themePreset: "blueFinance",
	      density: "balanced",
	      strength: "strong",
	      bricks: ["promoBanner.depositLadder", "assetOverview.tickerStrip", "onboardingProgress.nextStepHero", "quickActions.accentCards", "accountPerformance.proChart", "tradingAccounts.separatedList"],
	      summary: "首屏围绕入金奖励阶梯、账户摘要、开户进度、快捷入口和 Live/Demo 账号证明完成首次入金转化。",
	    },
	    risk: {
	      label: "风险保护工作台",
	      layoutPreset: "assetFirst",
	      themePreset: "blueFinance",
	      density: "compact",
	      strength: "medium",
	      bricks: ["accountPerformance.proChart", "riskDisclosure.marginGuard", "marketInsight.healthPanel", "assetOverview.compactMetrics", "supportContact.serviceCard", "tradingAccounts.separatedList"],
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
      bricks: ["assetOverview.tickerStrip", "quickActions.taskRail", "walletList.tiles", "promoBanner.scoreboard", "tradingAccounts.separatedList"],
      summary: "资产三项汇总、快捷入口和钱包列表靠前，形成成熟券商客户端的信任感。",
	    },
	  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(word));
  }

  function onboardingPresentationFromPrompt(text, designGenome = "", variant = 0) {
    const positive = positiveIntentText(text);
    const source = positive.toLowerCase() + positive;
    const wantsSpaceEfficiency = includesAny(source, ["大面积空白", "空白区域", "大空白", "少留白", "减少留白", "不要留白", "压缩留白", "空间利用", "利用空间", "空间利用率", "省空间", "压缩高度"]);
    const wantsGuideCards = includesAny(source, ["卡片", "路径卡", "任务卡", "图标", "icon", "美观", "精美", "欲望", "多种形式", "不一定", "方格"]);
    const wantsTimeline = includesAny(source, ["旅程", "时间线", "横向", "交易大师", "journey", "timeline"]);
    const wantsChecklist = includesAny(source, ["清单", "checklist", "列表"]);
    const wantsCompact = includesAny(source, ["紧凑", "compact", "小卡", "侧栏"]);
    const wantsMissionBoard = includesAny(source, ["开通进度", "账户开通", "进度面板", "0/3", "1/3", "完成以下", "任务面板", "progress board"]);
    const wantsRibbon = includesAny(source, ["票据", "里程碑", "ribbon", "低高度路径", "横条路径"]);
    const wantsNextStepHero = includesAny(source, ["下一步主", "主按钮", "主行动", "强引导", "cta", "直接推动"]);
    const wantsCreative = includesAny(source, ["创意", "更好的方案", "样式很多", "很多选", "多种样式", "样式更多", "icon不好看", "图标不好看", "高级", "精致", "不要模板"]);
    const presentationMap = {
      compact: {
        brickId: "onboardingProgress.compact",
        brickName: "紧凑开户进度",
        variant: "compact",
        style: "compact",
        reason: "管理员要求减少空白并提升空间利用率，保留关键状态但压缩模块面积。",
      },
      guideCards: {
        brickId: "onboardingProgress.guideCards",
        brickName: "新客精美任务卡",
        variant: "guideCards",
        style: "guide-cards",
        reason: "用更精致的业务图标卡片展示 KYC、开真实账户和首次入金。",
      },
      journeyTimeline: {
        brickId: "onboardingProgress.timeline",
        brickName: "3步交易大师时间线",
        variant: "journeyTimeline",
        style: "journey-timeline",
        reason: "新客首页用三步旅程表达当前状态和下一步。",
      },
      missionBoard: {
        brickId: "onboardingProgress.missionBoard",
        brickName: "账户开通进度面板",
        variant: "missionBoard",
        style: "mission-board",
        reason: "用账户开通进度、进度条、步骤卡和主 CTA 组合成更强的新客转化面板。",
      },
      ribbonRail: {
        brickId: "onboardingProgress.ribbonRail",
        brickName: "开户里程碑票据",
        variant: "ribbonRail",
        style: "ribbon-rail",
        reason: "用横向里程碑票据压缩开户路径高度，同时保持步骤状态清晰。",
      },
      nextStepHero: {
        brickId: "onboardingProgress.nextStepHero",
        brickName: "下一步开户主面板",
        variant: "nextStepHero",
        style: "next-step-hero",
        reason: "把当前最该完成的一步放大成主行动面板，减少用户判断成本。",
      },
      checklist: {
        brickId: "onboardingProgress.checklist",
        brickName: "3步成为交易大师清单",
        variant: "checklist",
        style: "checklist",
        reason: "把 KYC、创建真实账号和首次入金包装成任务清单。",
      },
    };
    const pick = (keys) => {
      const seed = hashText(`${source}:${designGenome}:${variant}:onboarding-presentation`);
      return presentationMap[keys[Math.abs(seed) % keys.length]];
    };

    if (wantsSpaceEfficiency) return presentationMap.compact;
    if (wantsMissionBoard) return presentationMap.missionBoard;
    if (wantsNextStepHero) return presentationMap.nextStepHero;
    if (wantsRibbon) return presentationMap.ribbonRail;

    if (wantsCreative) return pick(["missionBoard", "nextStepHero", "guideCards", "ribbonRail"]);
    if (wantsGuideCards) return pick(["guideCards", "missionBoard", "nextStepHero"]);

    if (wantsTimeline) return pick(["missionBoard", "ribbonRail", "journeyTimeline"]);
    if (designGenome === "onboardingJourney") return pick(["missionBoard", "nextStepHero", "ribbonRail", "guideCards"]);

    if (wantsCompact) return { ...presentationMap.compact, reason: "保留进度但压缩模块面积。" };
    if (wantsChecklist) return presentationMap.checklist;
    return presentationMap.checklist;
  }

  function inferKycStatusFromPrompt(prompt, fallback = "verified") {
    const text = String(prompt || "").toLowerCase();
    if (!text) return fallback;
    const statusListOnly = /未提交[、,，/\\\s]+待审[、,，/\\\s]+通过[、,，/\\\s]+拒绝/.test(text);
    const explicitCurrentStatus = text.match(/(?:当前|当前状态|实际状态|默认状态|状态为|状态是|current\s+status)\s*(?:为|是|:|：|=)?\s*(未提交|待审|待审核|审核中|通过|已通过|拒绝|驳回|未通过|pending|reviewing|verified|approved|rejected|declined)/i);
    const genericSingleStatus = !statusListOnly
      ? text.match(/(?:kyc\s*状态|crm\s*账户\s*kyc\s*状态|认证状态)\s*(?:为|是|:|：|=)\s*(未提交|待审|待审核|审核中|通过|已通过|拒绝|驳回|未通过|pending|reviewing|verified|approved|rejected|declined)/i)
      : null;
    const explicitStatus = explicitCurrentStatus?.[1] || genericSingleStatus?.[1] || "";
    if (explicitStatus) {
      if (/拒绝|驳回|未通过|rejected|declined/i.test(explicitStatus)) return "rejected";
      if (/待审|待审核|审核中|reviewing/i.test(explicitStatus)) return "reviewing";
      if (/未提交|pending/i.test(explicitStatus)) return "pending";
      if (/通过|已通过|verified|approved/i.test(explicitStatus)) return "verified";
    }
    if (statusListOnly) return fallback;
    if (/拒绝|驳回|未通过|rejected|declined/i.test(text)) return "rejected";
    if (/待审|待审核|审核中|reviewing|under review/i.test(text)) return "reviewing";
    if (/未提交|未实名|未认证|未完成实名|kyc\s*未|待\s*kyc|pending/i.test(text)) return "pending";
    if (/通过|已通过|已认证|verified|approved/i.test(text)) return "verified";
    if (includesAny(text, ["新手", "新客", "新用户", "刚注册", "开户注册"])) return "pending";
    return fallback;
  }

  function referralLinkCardStyleFromPrompt(prompt, statsRequested = false, coreOnly = false) {
    const text = positiveIntentText(dominantPromptText(prompt));
    if (statsRequested && !coreOnly) return "stats-card";
    if (includesAny(text, ["链接优先", "邀请码优先", "复制", "分享", "样式", "积木块", "引申", "卡片"])) return "link-first";
    return "compact-card";
  }

  function quickActionPresentationFromIntent(intent, designGenome, prompt = "", variant = 0) {
    const source = positiveIntentText(dominantPromptText(prompt));
    const wantsModuleFeeling = includesAny(source, ["每一个", "每个", "加框", "框", "背景色", "卡片", "模块", "磁贴", "按钮"]);
    const wantsStyleVariety = includesAny(source, ["个性化", "意图", "风格", "分格", "更多方案", "多方案", "多种样式", "样式更多"]);
    const pools = {
      trader: [
        { variant: "commandBar", style: "command-bar", count: 6, display: "iconText", brickId: "quickActions.commandBar", name: "交易命令栏" },
        { variant: "segmentedMenu", style: "segmented-panel", count: 6, display: "iconText", brickId: "quickActions.segmentedPanel", name: "快捷入口分段面板" },
        { variant: "compactMenu", style: "compact-menu", count: 6, display: "iconText", brickId: "quickActions.compactMenu", name: "紧凑快捷菜单" },
      ],
      insight: [
        { variant: "segmentedMenu", style: "segmented-panel", count: 6, display: "iconText", brickId: "quickActions.segmentedPanel", name: "快捷入口分段面板" },
        { variant: "compactMenu", style: "compact-menu", count: 6, display: "iconText", brickId: "quickActions.compactMenu", name: "紧凑快捷菜单" },
      ],
      onboarding: [
        { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", name: "下一步任务按钮组" },
        { variant: "accentCards", style: "accent-cards", count: 5, display: "iconText", brickId: "quickActions.accentCards", name: "强调快捷入口卡" },
      ],
      copytrading: [
        { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", name: "五项快捷入口" },
        { variant: "tileCards", style: "tile-board", count: 5, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
      ],
      growth: [
        { variant: "accentCards", style: "accent-cards", count: 8, display: "iconText", brickId: "quickActions.accentCards", name: "强调快捷入口卡" },
        { variant: "priorityButtons", style: "compact-grid", count: 8, display: "iconText", brickId: "quickActions.priorityMatrix", name: "转化快捷矩阵" },
        { variant: "tileCards", style: "tile-board", count: 8, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
      ],
      partner: [
        { variant: "accentCards", style: "accent-cards", count: 8, display: "iconText", brickId: "quickActions.accentCards", name: "强调快捷入口卡" },
        { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
      ],
      deposit: [
        { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", name: "快捷入口" },
        { variant: "accentCards", style: "accent-cards", count: 5, display: "iconText", brickId: "quickActions.accentCards", name: "强调快捷入口卡" },
      ],
      retention: [
        { variant: "segmentedMenu", style: "segmented-panel", count: 5, display: "iconText", brickId: "quickActions.segmentedPanel", name: "快捷入口分段面板" },
        { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", name: "下一步任务按钮组" },
      ],
      mobile: [
        { variant: "compactMenu", style: "compact-menu", count: 5, display: "iconText", brickId: "quickActions.compactMenu", name: "紧凑快捷菜单" },
        { variant: "actionDock", style: "toolbar", count: 5, display: "iconText", brickId: "quickActions.actionDock", name: "交易操作 Dock" },
      ],
      vip: [
        { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
        { variant: "actionDock", style: "toolbar", count: 6, display: "iconText", brickId: "quickActions.actionDock", name: "交易操作 Dock" },
      ],
      asset: [
        { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
        { variant: "segmentedMenu", style: "segmented-panel", count: 5, display: "iconText", brickId: "quickActions.segmentedPanel", name: "快捷入口分段面板" },
      ],
      brand: [
        { variant: "tileCards", style: "tile-board", count: 5, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
        { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", name: "五项快捷入口" },
      ],
      standard: [
        { variant: "gridCards", style: "matrix", count: 6, display: "iconText", brickId: "quickActions.actionDock", name: "快捷入口卡片矩阵" },
        { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", name: "快捷入口磁贴板" },
      ],
    };
    const key = pools[intent] ? intent : designGenome === "tradingCommand" ? "trader" : designGenome === "onboardingJourney" ? "onboarding" : "standard";
    const options = pools[key];
    const seed = hashText(`${source}:${intent}:${designGenome}:${variant}:${wantsStyleVariety ? "variety" : "stable"}`);
    let picked = options[seed % options.length];
    if (wantsModuleFeeling && ["toolbar", "matrix"].includes(picked.style)) {
      picked = options.find((item) => ["tile-board", "accent-cards", "segmented-panel", "task-rail"].includes(item.style)) || picked;
    }
	    if (!variantMode(variant) && includesAny(source, ["命令栏", "交易终端", "mt5", "专业交易"])) {
	      picked = pools.trader[0];
	    }
    if (includesAny(source, ["紧凑", "移动端", "手机", "短入口"])) {
      picked = pools.mobile[0];
    }
    return {
      ...picked,
      reason: wantsStyleVariety
        ? "根据页面意图选择更个性化的快捷入口形态，并保证每个入口都有独立视觉模块。"
        : "按当前首页意图选择快捷入口形态，并保持每个入口有独立边界。",
    };
  }

  function wantsTradingCostWorkbenchPrompt(prompt) {
    const text = positiveIntentText(dominantPromptText(prompt));
    const source = dominantPromptText(prompt);
    const explicitCostBoard =
      /(?:首屏|首页|第一屏|核心|重点|突出|主打|围绕|优先)[\s\S]{0,24}(?:交易成本|成本效率|执行效率|点差佣金|点差|佣金|cost)/i.test(source) ||
      /(?:交易成本|成本效率|执行效率|点差佣金|点差|佣金|cost)[\s\S]{0,24}(?:看板|工作台|首屏|核心|重点|突出|主打|优先|board|workbench)/i.test(source) ||
      /cost[\s_-]*(?:board|workbench)|spread[\s\S]{0,16}commission|点差[\s\S]{0,16}佣金[\s\S]{0,16}看板/i.test(source);
    const hasCostSignal = explicitCostBoard && includesAny(text, ["交易成本", "成本效率", "执行效率", "点差", "佣金", "eurusd", "spread", "commission", "cost"]);
    const hasTraderSignal = includesAny(text, ["专业交易", "交易工作台", "mt5", "持仓", "pnl", "保证金占用"]);
    return hasCostSignal && hasTraderSignal;
  }

  function wantsTradingDataContractPrompt(prompt) {
    const source = String(prompt || "");
    return (
      /(?:交易成本|pnl|盈亏|保证金|图表数据|图表|真实数值|真实数据)[\s\S]{0,42}(?:接口|后台|api|占位|不要写死|不写死|缺失时)/i.test(source) ||
      /(?:接口|后台|api)[\s\S]{0,42}(?:交易成本|pnl|盈亏|保证金|图表数据|图表|真实数值|真实数据)/i.test(source)
    );
  }

  function wantsCombinedTradingAccountCardsPrompt(prompt) {
    const source = String(prompt || "");
    const wantsTogether =
      /(?:真实(?:交易)?账(?:号|户)[、,，\/和与\s]+模拟(?:交易)?账(?:号|户)|live[\s\S]{0,12}demo)[\s\S]{0,32}(?:一起|同一|统一|一个|合并|在一起)/i.test(source) ||
      /(?:一起|同一|统一|一个|合并|在一起)[\s\S]{0,32}(?:真实(?:交易)?账(?:号|户)|live)[\s\S]{0,18}(?:模拟(?:交易)?账(?:号|户)|demo)/i.test(source);
    const wantsCards = /卡片|card/i.test(source);
    return wantsTogether && wantsCards;
  }

	  function wantsProfessionalTraderWorkbenchPrompt(prompt) {
	    const source = String(prompt || "");
	    const text = source.toLowerCase() + source;
	    const strongOnboarding = includesAny(text, ["开户引导", "开户流程", "账户开通", "开通进度", "创建真实账户", "开真实账户", "首次入金", "已注册未开户", "新访客", "新客", "新用户", "kyc", "onboarding"]);
	    if (strongOnboarding) return false;
	    const explicitWorkbench = includesAny(text, ["专业交易客户首页", "专业交易客户", "交易客户首页", "交易工作台", "专业交易首页"]);
	    const accountStatusSignal = includesAny(text, ["交易账号状态", "账号状态", "交易账户状态", "交易账号"]);
	    const performanceSignal = includesAny(text, ["账户表现图表", "账户表现", "账号表现", "净值曲线", "权益曲线", "pnl"]);
	    const operationSignal = includesAny(text, ["持仓入口", "持仓", "mt5 操作入口", "mt5操作入口", "mt5"]);
	    const comboCount = [accountStatusSignal, performanceSignal, operationSignal].filter(Boolean).length;
	    const traderGoal = explicitWorkbench && comboCount >= 2;
	    const firstScreenStack =
	      /首屏[\s\S]{0,90}(交易账(?:号|户)状态|账(?:号|户)状态)[\s\S]{0,90}(账(?:号|户)表现|表现图表)[\s\S]{0,90}(持仓|mt5)/i.test(source) ||
	      includesAny(text, ["交易账号状态", "账户表现图表", "持仓入口", "mt5 操作入口", "mt5操作入口"]);
	    return !wantsTradingCostWorkbenchPrompt(prompt) && (traderGoal || (firstScreenStack && comboCount >= 2));
	  }

	  function homepageDataContractFromUnderstanding(understanding = {}) {
	    if (!understanding.wantsTradingDataContract && !understanding.wantsProfessionalTraderWorkbench) return null;
	    const field = (label, binding) => ({
	      label,
	      previewSample: true,
      dataBindingRequired: true,
	      binding,
	      fallback: "--",
	    });
	    const tradingAccountFields = ["accountKind", "platform", "server", "account", "balance", "equity", "credit", "accountType", "leverage", "marginRatio"];
	    return {
	      mode: "api-bound-preview",
	      previewSample: true,
	      dataBindingRequired: true,
	      fallback: "placeholder",
	      note: "预览阶段可以填充 sample data；正式运行时交易账号、交易成本、PnL、保证金和图表必须来自后台或接口，缺失显示占位；交易账号卡片/列表只使用约定字段。",
	      fields: {
	        tradingAccounts: {
	          ...field("交易账号卡片/列表字段", "api.trading.accounts"),
	          allowedFields: tradingAccountFields,
	          forbiddenFields: ["pnl", "usage", "positions", "marginUsed", "riskStatus", "actions"],
	        },
	        tradingCost: field("交易成本", "api.trading.costs"),
	        pnl: field("PnL / 盈亏", "api.trading.pnl"),
	        margin: field("保证金", "api.trading.margin"),
	        charts: field("账户表现图表", "api.trading.performanceSeries"),
      },
    };
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
    const wantsMatureBrokerTrust = includesAny(text, ["成熟券商", "资金安全", "品牌可信", "资金可信", "白标品牌", "白标首页", "隔离资金"]);
    const wantsLightBlue = includesAny(text, ["淡蓝", "浅蓝", "蓝色金融", "light blue"]);
    const wantsMinimalLight = includesAny(text, ["极简", "极简白", "淡色", "浅色", "简洁白", "minimal", "white", "留白", "克制"]);
    const wantsFreshLayout = includesAny(text, ["不沿用上一版", "不要沿用上一版", "布局骨架", "耳目一新", "不要只换颜色", "不能只是换颜色"]);
    const wantsSpaceEfficiency = includesAny(text, ["大面积空白", "空白区域", "大空白", "少留白", "减少留白", "不要留白", "压缩留白", "空间利用", "利用空间", "空间利用率", "省空间", "压缩高度"]);
    const wantsCopyTrading = includesAny(text, ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐"]);
    const wantsPamm = includesAny(text, ["pamm", "资管产品", "pamm产品", "资金管理产品"]);
    const wantsNewUserJourney = includesAny(text, ["新手", "新客", "新用户", "刚注册", "开户", "开户注册", "账户开通", "开通进度", "注册", "首次"]);
    const wantsDemoAccountCard = /模拟(?:交易)?账(?:号|户)[\s\S]{0,16}卡片|demo[\s\S]{0,16}card/i.test(source);
    const wantsDemoAccountList = /模拟(?:交易)?账(?:号|户)[\s\S]{0,16}列表|demo[\s\S]{0,16}list/i.test(source);
    const recommendationMatch = source.match(/推荐编号\s*([a-z0-9_-]+)/i);
    const wantsTradingCostWorkbench = wantsTradingCostWorkbenchPrompt(source);
    const wantsProfessionalTraderWorkbench = wantsProfessionalTraderWorkbenchPrompt(source);
    const wantsTradingDataContract = wantsTradingDataContractPrompt(source);
    const wantsCombinedAccountCards = wantsCombinedTradingAccountCardsPrompt(source);
    const wantsFourColumnAccountCards = wantsFourColumnTradingAccountCards(source);
    const wantsFaqSection = /faq|常见问题|问题解答|帮助中心/i.test(source);

    return {
      sourcePrompt: source,
      quickActionCount,
      quickActionExact,
      visibleMetricCount,
      wantsCombinedAccountFilter,
      wantsMatureBrokerTrust,
      wantsLightBlue,
      wantsMinimalLight,
      wantsFreshLayout,
      wantsSpaceEfficiency,
      wantsCopyTrading,
      wantsPamm,
      wantsNewUserJourney,
      wantsDemoAccountCard,
      wantsDemoAccountList,
      wantsTradingCostWorkbench,
      wantsProfessionalTraderWorkbench,
      wantsTradingDataContract,
      wantsCombinedAccountCards,
      wantsFourColumnAccountCards,
      wantsFaqSection,
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

	  function applyTradingCostWorkbenchConfig(config, understanding = {}, variant = 0) {
	    const recommendationName = understanding.recommendationId
	      ? `AI ${understanding.recommendationId}`.slice(0, 28)
	      : "AI 交易成本工作台";
	    const mode = variantMode(variant);

    config.name = recommendationName;
    config.layoutPreset = "tradingCommand";
    config.designGenome = "tradingCommand";
    config.pageStory = "tradingEfficiency";
    config.themePreset = "darkTech";
    config.theme = "darkTech";
    config.personalizationStrength = "strong";
    config.density = "compact";
    config.heroFocus = "trading_account_highlight";
    config.pageIntent = normalizePageIntent({ ...(config.pageIntent || {}), primaryIntent: "trader" }, "trader");
	    config.sections =
	      mode === 1
	        ? [
	            { id: "cost-account-ledger", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
	            { id: "cost-execution-chart", type: "full", title: "交易成本与执行", slots: ["trading_account_highlight"] },
	            { id: "cost-execution-actions", type: "split", title: "MT5 操作", slots: ["quick_actions"] },
	            { id: "cost-margin-strip", type: "full", title: "持仓与保证金", slots: ["asset_overview"] },
	          ]
	        : mode === 2
	        ? [
	            { id: "cost-execution-actions", type: "split", title: "MT5 操作", slots: ["quick_actions"] },
	            { id: "cost-execution-chart", type: "full", title: "交易成本与执行", slots: ["trading_account_highlight"] },
	            { id: "cost-account-ledger", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
	            { id: "cost-margin-strip", type: "full", title: "持仓与保证金", slots: ["asset_overview"] },
	          ]
	        : [
	            { id: "cost-execution-chart", type: "full", title: "交易成本与执行", slots: ["trading_account_highlight"] },
	            { id: "cost-execution-actions", type: "split", title: "MT5 操作", slots: ["quick_actions"] },
	            { id: "cost-margin-strip", type: "full", title: "持仓与保证金", slots: ["asset_overview"] },
	            { id: "cost-account-ledger", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
	          ];

    mergeModuleVariants(config, {
	      AccountPerformance: "sparklineBoard",
	      QuickActions: mode === 1 ? "segmentedMenu" : "commandBar",
	      AssetOverview: "darkTerminal",
	      TradingAccounts: "opsTable",
	    });
	    mergeModuleStyles(config, {
	      accountPerformance: "cost-board",
	      quickActions: mode === 1 ? "segmented-panel" : "command-bar",
      balanceTotal: "ticker-strip",
      tradingAccounts: "ops-table",
      adCarousel: "clean",
    });
    mergeModuleSettings(config, {
      adCarousel: { enabled: false },
      promoHighlight: { enabled: false },
      quickActions: {
        enabled: true,
        count: 6,
        display: "iconText",
        actions: ["switchAccount", "positions", "orders", "downloadMt5", "deposit", "openDemo"],
      },
      assets: {
        enabled: true,
        visibleFields: ["tradingAccount", "wallet"],
        showFundActions: false,
        showAccountBreakdown: true,
        showWalletBreakdown: false,
        showAvailable: true,
        showMargin: true,
        showRiskLevel: false,
        wallets: [],
      },
      wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
      openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" },
      tradingAccounts: {
        enabled: true,
        realEnabled: true,
        demoEnabled: true,
        grouping: "separated",
        viewMode: "list",
        realViewMode: "list",
        demoViewMode: "list",
        demoFirst: false,
      },
      pamm: { enabled: false },
      copytrading: { enabled: false },
      announcements: { enabled: false },
      marketNews: { enabled: false },
      riskNotice: { enabled: false },
    });

	    config.brickPlan =
	      mode === 1
	        ? [
	            { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "本轮先扫描真实/模拟账号，再进入成本执行看板。" },
	            { brickId: "accountPerformance.costBoard", brickName: "交易成本与执行看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "交易成本、PnL 和保证金仍由整横栏承载。" },
	            { brickId: "quickActions.segmentedPanel", brickName: "MT5 分段操作入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "2x1", zone: "main", reason: "MT5、持仓和订单入口改成分段面板。" },
	            { brickId: "assetOverview.marginTicker", brickName: "保证金与资产 Ticker", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "3x1", zone: "full", reason: "保证金和可用资金仍以横向指标收口。" },
	          ]
	        : mode === 2
	        ? [
	            { brickId: "quickActions.mt5CommandBar", brickName: "MT5 快捷命令栏", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "2x1", zone: "main", reason: "本轮用操作层先承接持仓、订单和 MT5。" },
	            { brickId: "accountPerformance.costBoard", brickName: "交易成本与执行看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "成本效率和 PnL 仍保持整横栏分析。" },
	            { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "账号列表下移做执行后的管理区。" },
	            { brickId: "assetOverview.marginTicker", brickName: "保证金与资产 Ticker", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "3x1", zone: "full", reason: "保证金和可用资金作为底部状态条。" },
	          ]
	        : [
	            { brickId: "accountPerformance.costBoard", brickName: "交易成本与执行看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "交易成本与账号表现属于大图表模块，用整横栏承载 PnL、保证金占用和执行效率。" },
	            { brickId: "quickActions.mt5CommandBar", brickName: "MT5 快捷命令栏", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x2", zone: "rail", reason: "MT5、持仓、订单和切换账号作为专业交易高频操作。" },
	            { brickId: "assetOverview.marginTicker", brickName: "保证金与资产 Ticker", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "3x1", zone: "full", reason: "把保证金占用和可用资金压缩为行情式横向指标，不复用新手路径。" },
	            { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号分区列表展示，适合专业交易排查与切换。" },
	          ];
    config.brickTrace = {
      ...(config.brickTrace || {}),
      intent: "trader",
      pageIntent: "trader",
      strategy: "专业交易成本工作台契约",
      score: 98,
      selectedCount: config.brickPlan.length,
    };
    config.emphasis = { ...config.emphasis, deposit: "medium", openAccount: "low", promo: "low", accounts: "high" };
    config.aiSummary = "已按专业交易成本工作台重排：首屏保留 EURUSD 点差 0.2 起、佣金 $7/手、持仓 PnL、保证金占用和 MT5 快捷操作，真实/模拟账号分开。";
    config.layout = layoutFromSections(config.sections);
  }

	  function applyProfessionalTraderWorkbenchConfig(config, understanding = {}, variant = 0) {
	    const mode = variantMode(variant);
	    config.name = understanding.recommendationId ? `AI ${understanding.recommendationId}`.slice(0, 28) : "AI 专业交易客户首页";
    config.layoutPreset = "tradingCommand";
    config.designGenome = "tradingCommand";
    config.pageStory = "tradingEfficiency";
    config.themePreset = understanding.wantsMinimalLight ? "minimalWhite" : "blueFinance";
    config.theme = config.themePreset;
    config.colorMode = colorModeFromPromptText(understanding.sourcePrompt || config.sourcePrompt, config.colorMode);
    config.personalizationStrength = "strong";
    config.density = "balanced";
    config.heroFocus = "trading_accounts_list";
    config.pageIntent = normalizePageIntent(
      {
        ...(config.pageIntent || {}),
        primaryIntent: "trader",
        label: "专业交易客户首页",
        primaryGoal: "首屏聚焦交易账号状态、账户表现图表、持仓入口和 MT5 操作入口，不把数据接口要求误解成成本看板。",
      },
      "trader",
    );
	    config.sections =
	      mode === 1
	        ? [
	            { id: "trader-performance-row", type: "full", title: "账户表现", slots: ["trading_account_highlight"] },
	            { id: "trader-account-status-row", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
	            { id: "trader-operation-layer", type: "split", title: "持仓与 MT5 操作", slots: ["quick_actions"] },
	            ...(understanding.wantsFaqSection ? [{ id: "trader-faq", type: "full", title: "FAQ", slots: ["faq_section"] }] : []),
	          ]
	        : mode === 2
	        ? [
	            { id: "trader-operation-layer", type: "split", title: "持仓与 MT5 操作", slots: ["quick_actions"] },
	            { id: "trader-account-status-row", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
	            { id: "trader-performance-row", type: "full", title: "账户表现", slots: ["trading_account_highlight"] },
	            ...(understanding.wantsFaqSection ? [{ id: "trader-faq", type: "full", title: "FAQ", slots: ["faq_section"] }] : []),
	          ]
	        : [
	            { id: "trader-account-status-row", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
	            { id: "trader-performance-row", type: "full", title: "账户表现", slots: ["trading_account_highlight"] },
	            { id: "trader-operation-layer", type: "split", title: "持仓与 MT5 操作", slots: ["quick_actions"] },
	            ...(understanding.wantsFaqSection ? [{ id: "trader-faq", type: "full", title: "FAQ", slots: ["faq_section"] }] : []),
	          ];
    mergeModuleVariants(config, {
      TradingAccounts: "accountWall",
      AccountPerformance: "proChart",
	      QuickActions: mode === 1 ? "compactMenu" : mode === 2 ? "commandBar" : "segmentedMenu",
      FaqSection: "accordion",
    });
    mergeModuleStyles(config, {
      tradingAccounts: "account-wall",
      accountPerformance: "pro-chart",
	      quickActions: mode === 1 ? "compact-menu" : mode === 2 ? "command-bar" : "segmented-panel",
	      quick_actions: mode === 1 ? "compact-menu" : mode === 2 ? "command-bar" : "segmented-panel",
      faq_section: understanding.wantsFaqSection ? "accordion" : config.moduleStyles.faq_section,
    });
    mergeModuleSettings(config, {
      adCarousel: { enabled: false },
      promoHighlight: { enabled: false },
      assets: {
        enabled: false,
        showFundActions: false,
        showAccountBreakdown: false,
        showWalletBreakdown: false,
        showAvailable: false,
        showMargin: false,
        showRiskLevel: false,
        wallets: [],
      },
      wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
      quickActions: {
        enabled: true,
        count: 4,
        display: "iconText",
        actions: [],
      },
      tradingAccounts: {
        enabled: true,
        realEnabled: true,
        demoEnabled: true,
        grouping: "combined",
        viewMode: "card",
        realViewMode: "card",
        demoViewMode: "card",
        demoFirst: false,
      },
      openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" },
      riskNotice: { enabled: false },
      riskDisclosure: { enabled: false },
      faq: { enabled: Boolean(understanding.wantsFaqSection) },
      copytrading: { enabled: false },
      pamm: { enabled: false },
      announcements: { enabled: false },
      marketNews: { enabled: false },
    });
    config.dataContract = homepageDataContractFromUnderstanding(understanding);
	    const quickBrick =
	      mode === 1
	        ? { brickId: "quickActions.compactMenu", brickName: "紧凑 MT5 操作菜单", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "2x1", zone: "main", reason: "持仓和 MT5 操作收成短菜单，减少和账号区抢层级。" }
	        : mode === 2
	        ? { brickId: "quickActions.commandBar", brickName: "MT5 命令栏", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "3x1", zone: "hero", reason: "本轮先给 MT5 与持仓命令层，再承接账号状态。" }
	        : { brickId: "quickActions.segmentedPanel", brickName: "持仓与 MT5 操作入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "2x1", zone: "main", reason: "持仓入口和 MT5 操作入口作为操作层，不抢账号状态主层级。" };
	    const accountBrick = { brickId: "tradingAccounts.cardProof", brickName: "Live / Demo 合并账号卡片", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号在同一账号卡片区，用整横栏展示账号状态，避免与图表互相挤压。" };
	    const performanceBrick = { brickId: "accountPerformance.proChart", brickName: "账户表现趋势图", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账户表现图表需要完整横向空间展示账号上下文、主数值、趋势图和指标带。" };
	    const faqBrick = understanding.wantsFaqSection
	      ? [{ brickId: "faqSection.topQuestions", brickName: "简约 FAQ", family: "FaqSection", feature: "faq_section", component: "faq_section", size: "3x1", zone: "full", reason: "FAQ 使用简约折叠或紧凑列表，作为低干扰解释区。" }]
	      : [];
	    config.brickPlan =
	      mode === 1
	        ? [performanceBrick, accountBrick, quickBrick, ...faqBrick]
	        : mode === 2
	        ? [quickBrick, accountBrick, performanceBrick, ...faqBrick]
	        : [accountBrick, performanceBrick, quickBrick, ...faqBrick];
    config.brickTrace = {
      ...(config.brickTrace || {}),
      intent: "trader",
      pageIntent: "trader",
      strategy: "专业交易客户首页契约",
      score: 97,
      selectedCount: config.brickPlan.length,
    };
    config.emphasis = { ...config.emphasis, deposit: "low", openAccount: "medium", promo: "low", accounts: "high" };
    config.aiSummary = "已按专业交易客户首页重排：账号状态、账户表现、持仓与 MT5 入口优先，数据走接口契约。";
    config.layout = layoutFromSections(config.sections);
  }

  function applyHomepageUnderstandingToConfig(baseConfig, prompt, variant = 0) {
    const understanding = extractHomepageUnderstanding(prompt);
    const config = normalizeConfig(baseConfig);
    const onboardingPresentation = onboardingPresentationFromPrompt(prompt, config.designGenome, variant);
    const needsTrustLayout =
      understanding.wantsMatureBrokerTrust ||
      understanding.wantsCombinedAccountFilter;

    if (understanding.wantsMinimalLight) {
      config.themePreset = "minimalWhite";
      config.theme = "minimalWhite";
    } else if (understanding.wantsLightBlue) {
      config.themePreset = "blueFinance";
      config.theme = "blueFinance";
    }

    config.colorMode = colorModeFromPromptText(prompt, config.colorMode);

    if (understanding.wantsFreshLayout) {
      config.personalizationStrength = "strong";
    }

    if (understanding.wantsSpaceEfficiency) {
      config.density = "compact";
      const efficientStyles = { onboardingProgress: "compact" };
      if (config.moduleStyles.quickActions === "matrix") efficientStyles.quickActions = "compact-grid";
      mergeModuleStyles(config, efficientStyles);
      mergeModuleVariants(config, {
        OnboardingProgress: "compact",
      });
    }

    if (understanding.wantsTradingCostWorkbench) {
	      applyTradingCostWorkbenchConfig(config, understanding, variant);
	    } else if (understanding.wantsProfessionalTraderWorkbench) {
	      applyProfessionalTraderWorkbenchConfig(config, understanding, variant);
    } else if (understanding.wantsTradingDataContract) {
      config.dataContract = homepageDataContractFromUnderstanding(understanding);
    }

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
      config.heroFocus = "asset_overview";
      config.sections = [
        { id: "trust-hero", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
        { id: "wallet-cards", type: "full", title: "钱包列表", slots: ["wallet_list"] },
        { id: "conversion-tools", type: "split", title: "活动", slots: ["promoHighlight"] },
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
          visibleFields: ["total", "tradingAccount", "wallet"],
          showFundActions: false,
          showAccountBreakdown: true,
          showWalletBreakdown: true,
          showAvailable: false,
          showMargin: false,
          showRiskLevel: false,
          wallets: ["USD", "EUR", "USDT"],
        },
        openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "standalone" },
        promoHighlight: { enabled: true },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true },
      });
      config.brickPlan = [
        { brickId: "assetOverview.tickerStrip", brickName: "三项资产汇总", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "main", reason: "首屏只展示余额合计、交易账号余额和钱包余额汇总。" },
        { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "与资产概览同行，避免右侧快捷入口下方大面积留白。" },
        { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "wallet_list", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包卡片只在钱包列表模块展示。" },
        { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "3x1", zone: "full", reason: "主推活动作为 Banner 大模块整横栏承接，不挤入侧栏。" },
        { brickId: "tradingAccounts.separatedList", brickName: "合并账号工作台", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实和模拟账号在同一列表，用胶囊筛选区分。" },
      ];
      config.brickTrace = { ...(config.brickTrace || {}), intent: "brand", pageIntent: "brand", strategy: "券商可信契约", score: 96, selectedCount: config.brickPlan.length };
    }

    const shouldProtectDepositIntent = pageIntentFromConfig(config, prompt) === "deposit" || inferBrickIntent(prompt) === "deposit";
    if (understanding.wantsCopyTrading) {
      mergeModuleVariants(config, { CopytradingSignals: "curveCards" });
      mergeModuleStyles(config, { copytrading_signals: "curve-cards" });
      mergeModuleSettings(config, { copytrading: { enabled: true } });
      ensureSectionContains(config, { id: "copytrading", type: "full", title: "CopyTrading 推荐" }, "copytrading_signals");

      if (understanding.wantsNewUserJourney && !shouldProtectDepositIntent) {
        config.name = "AI 新客跟单驾驶舱";
        config.layoutPreset = "onboardingJourney";
        config.designGenome = "onboardingJourney";
        config.pageStory = "accountActivation";
        config.themePreset = "blueFinance";
        config.theme = "blueFinance";
        config.personalizationStrength = "strong";
        config.density = config.density === "spacious" ? "balanced" : config.density || "balanced";
        config.heroFocus = "copytrading_signals";
        config.pageIntent = normalizePageIntent({ ...(config.pageIntent || {}), primaryIntent: "copytrading" }, "copytrading");
        config.sections = [
          { id: "activation-copytrading", type: "full", title: "CopyTrading 推荐", slots: ["copytrading_signals"] },
          { id: "activation-onboarding", type: "full", title: "新客启动", slots: ["onboarding_guide"] },
          ...(understanding.wantsPamm ? [{ id: "activation-pamm", type: "full", title: "PAMM 推荐", slots: ["pamm_products"] }] : []),
          { id: "activation-actions", type: "split", title: "下一步操作", slots: ["quick_actions", "asset_overview"] },
          { id: "activation-accounts", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
        ];
        mergeModuleVariants(config, {
          OnboardingProgress: onboardingPresentation.variant,
          QuickActions: "taskRail",
          TradingAccounts: "separatedList",
          CopytradingSignals: "curveCards",
          PammProducts: "yieldChartCards",
          AssetOverview: "compactTable",
        });
        mergeModuleStyles(config, {
          onboardingProgress: onboardingPresentation.style,
          quickActions: "task-rail",
          tradingAccounts: "dense-cards",
          copytrading_signals: "curve-cards",
          pamm_products: "yield-chart-cards",
          balanceTotal: "metric-strip",
        });
        mergeModuleSettings(config, {
          adCarousel: { enabled: false },
          copytrading: { enabled: true },
          pamm: { enabled: understanding.wantsPamm },
          quickActions: {
            enabled: true,
            count: understanding.quickActionCount || 5,
            display: "iconText",
          },
          assets: {
            enabled: true,
            showFundActions: false,
            showAccountBreakdown: true,
            showWalletBreakdown: true,
          },
          wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
          openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" },
          tradingAccounts: {
            enabled: true,
            realEnabled: true,
            demoEnabled: true,
            grouping: "separated",
            viewMode: "card",
            realViewMode: "card",
            demoViewMode: understanding.wantsDemoAccountList && !understanding.wantsDemoAccountCard ? "list" : "card",
          },
          promoHighlight: { enabled: false },
        });
        config.brickPlan = [
          { brickId: "copytradingSignals.curveCards", brickName: "AI 跟单信号源推荐", family: "CopytradingSignals", feature: "copytrading_signals", component: "copytrading_signals", size: "3x2", zone: "hero", reason: "CopyTrading 进入首屏，用整横栏展示信号源、收益、总收益和曲线。" },
          { brickId: onboardingPresentation.brickId, brickName: onboardingPresentation.brickName, family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_guide", size: "3x1", zone: "full", reason: onboardingPresentation.reason },
          ...(understanding.wantsPamm
            ? [{ brickId: "pammProducts.recommendations", brickName: "AI PAMM 产品推荐", family: "PammProducts", feature: "pamm_products", component: "pamm_products", size: "3x2", zone: "full", reason: "PAMM 作为独立 AI 推荐模块，用整横栏展示产品、收益、风险和曲线。" }]
            : []),
          { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "入口作为下一步任务组，避免空白快捷框。" },
          { brickId: "assetOverview.compactMetrics", brickName: "轻量资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "main", reason: "资产降级为辅助指标，不抢新客引导和跟单推荐。" },
          { brickId: "tradingAccounts.separatedList", brickName: "真实与模拟账号卡片", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号都用卡片，分区展示形成明显区分。" },
        ];
        config.brickTrace = { ...(config.brickTrace || {}), intent: "copytrading", pageIntent: "copytrading", strategy: "新客跟单驾驶舱契约", score: 97, selectedCount: config.brickPlan.length };
        config.aiSummary = "已按新客跟单驾驶舱重排：首屏开户旅程 + CopyTrading 曲线推荐，资产降级。";
      }
    }

    if (/banner|广告|轮播|活动|奖励|赠金|权益|promo/i.test(prompt) && !/(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:banner|广告|轮播|活动|奖励|权益|promo)/i.test(prompt)) {
      mergeModuleVariants(config, { PromotionBanner: "splitVisual" });
      mergeModuleStyles(config, { promo_banner: "clean", promoHighlight: "clean", adCarousel: "clean" });
      mergeModuleSettings(config, { promoHighlight: { enabled: true }, adCarousel: { enabled: true } });
      ensureSectionContains(config, { id: "promo-banner", type: "full", title: "首页 Banner" }, "promo_banner");
    }

    if (wantsReferralLinkCardPrompt(prompt)) {
      const referralStatsRequested = wantsReferralStatsPrompt(prompt);
      const referralCoreOnly = wantsReferralCoreOnlyPrompt(prompt);
      const referralCardStyle = referralLinkCardStyleFromPrompt(prompt, referralStatsRequested, referralCoreOnly);
      mergeModuleVariants(config, { ReferralLinkCard: referralCardStyle === "stats-card" ? "statsCard" : referralCardStyle === "link-first" ? "linkFirst" : "compactCard" });
      mergeModuleStyles(config, { referral_link_card: referralCardStyle });
      mergeModuleSettings(config, {
        referralLinkCard: {
          enabled: true,
          showPromoLink: true,
          showInviteCode: true,
          showShare: includesAny(prompt, ["分享", "share"]),
          showStats: referralStatsRequested && !referralCoreOnly,
          showOpens: true,
          showRegistrations: true,
          showAccounts: true,
          showRegistrationRate: true,
          showAccountRate: true,
        },
      });
      ensureSectionContains(config, { id: "referral-link", type: "rail", title: "推广链接" }, "referral_link_card");
    }

    if (understanding.wantsFourColumnAccountCards) {
      mergeModuleVariants(config, { TradingAccounts: "denseCards" });
      mergeModuleStyles(config, { tradingAccounts: "dense-cards", trading_accounts_list: "dense-cards" });
      mergeModuleSettings(config, {
        tradingAccounts: {
          enabled: true,
          realEnabled: true,
          demoEnabled: true,
          grouping: "combined",
          viewMode: "card",
          realViewMode: "card",
          demoViewMode: "card",
          preferredColumns: 4,
        },
      });
    }

    if (understanding.wantsPamm && !slotVisibleInConfig(config, "pamm_products")) {
      mergeModuleVariants(config, { PammProducts: "yieldChartCards" });
      mergeModuleStyles(config, { pamm_products: "yield-chart-cards" });
      mergeModuleSettings(config, { pamm: { enabled: true } });
      ensureSectionContains(config, { id: "pamm-products", type: "full", title: "PAMM 推荐" }, "pamm_products");
    }

    if (understanding.visibleMetricCount >= 3 && !shouldProtectDepositIntent) {
      mergeModuleSettings(config, {
        wallet: { enabled: true, placement: "standalone" },
        assets: {
          enabled: true,
          visibleFields: ["total", "tradingAccount", "wallet"],
          showAccountBreakdown: true,
          showWalletBreakdown: true,
          showAvailable: false,
          showMargin: false,
          showRiskLevel: false,
          wallets: ["USD", "EUR", "USDT"],
        },
      });
      if (!needsTrustLayout) {
        mergeModuleSettings(config, { riskDisclosure: { enabled: true } });
        ensureSectionContains(config, { id: "metrics-proof", type: "split", title: "资金指标" }, "risk_disclosure");
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

    if (wantsFlatAccountOptimization(prompt)) {
      const forceAccountList = wantsTradingAccountSingleViewCorrection(prompt);
      const refineCards = wantsAccountCardRefinement(prompt) && !wantsTradingAccountList(prompt) && !forceAccountList;
      const promptText = String(prompt || "");
      const keepSeparatedCards = wantsRealAccountCards(promptText) || /模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(promptText);
      mergeModuleVariants(config, {
        AccountPerformance: "cleanSnapshot",
        TradingAccounts: refineCards ? "denseCards" : "separatedList",
      });
      mergeModuleStyles(config, {
        accountPerformance: "pro-chart",
        tradingAccounts: refineCards ? "dense-cards" : "calm-table",
      });
      mergeModuleSettings(config, {
        tradingAccounts: refineCards
          ? { enabled: true, realEnabled: true, demoEnabled: true, grouping: keepSeparatedCards ? "separated" : "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" }
          : { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
      });
      const flatSignal = String(prompt || "").toLowerCase() + String(prompt || "");
      if (wantsAccountPerformanceLinePrompt(prompt) || includesAny(flatSignal, ["账号表现", "账户表现", "数据指标", "指标排版", "持仓 pnl", "pnl"])) {
        if (!slotVisibleInConfig(config, "accountPerformance") && !slotVisibleInConfig(config, "trading_account_highlight")) {
          ensureSectionContains(config, { id: "flat-account-performance", type: "full", title: "账号表现" }, "trading_account_highlight");
        }
      }
    }

    if (understanding.recommendationId) {
      config.compositionStrategy = `${config.compositionStrategy || ""} 推荐编号 ${understanding.recommendationId} 已进入硬约束自检。`.trim();
    }

    const announcementSignal = positiveIntentText(prompt);
    const rejectsAnnouncements = /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:公告|通知|维护|平台消息)/.test(String(prompt || ""));
    if (!rejectsAnnouncements && includesAny(announcementSignal, ["公告", "通知", "维护", "平台消息"])) {
      const wantsTicker = includesAny(announcementSignal, ["跑马灯", "滚动公告", "公告滚动", "首页第一栏", "顶部公告", "首栏公告"]);
      mergeModuleSettings(config, { announcements: { enabled: true } });
      mergeModuleStyles(config, { announcements: wantsTicker ? "ticker-strip" : config.moduleStyles.announcements || "list" });
      if (wantsTicker) {
        moveSlot(config, "announcements", "front");
      } else {
        ensureSectionContains(config, { id: "announcements", type: "split", title: "公告通知" }, "announcements");
      }
    }

    config.sections = config.sections
      .map((section) => ({ ...section, slots: uniqueValidSlots(section.slots) }))
      .filter((section) => section.slots.length);
	    config.layout = layoutFromSections(config.sections);
	    config.sourcePrompt = prompt;
	    config.generationVariant = variant;

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
      copytrading: ["copytrading"],
    }[actionId] || [actionId];
    let count = 0;

    if (aliases.some((action) => ["deposit", "withdraw"].includes(action)) && hasStandaloneFundActions(config)) count += 1;
    if (aliases.includes("deposit") && pageIntentFromConfig(config) === "deposit" && slotVisibleInConfig(config, "promo_banner")) count += 1;
    if (aliases.includes("deposit") && settings.assets?.showFundActions && slotVisibleInConfig(config, "balanceTotal") && !hasStandaloneFundActions(config)) count += 1;
    if (aliases.includes("deposit") && settings.wallet?.showFundActions && slotVisibleInConfig(config, "walletBalance") && !hasStandaloneFundActions(config)) count += 1;
    if (aliases.some((action) => ["openReal", "openAccount"].includes(action)) && slotVisibleInConfig(config, "openAccountActions")) count += 1;
    if (aliases.some((action) => ["openReal", "openAccount"].includes(action)) && settings.openAccount?.placement === "insideTradingAccounts" && slotVisibleInConfig(config, "tradingAccounts")) count += 1;
    if (aliases.includes("copytrading") && slotVisibleInConfig(config, "copytrading_signals")) count += 1;

    const quickActions = Array.isArray(settings.quickActions?.actions) ? settings.quickActions.actions : [];
    if (quickActions.some((action) => aliases.includes(typeof action === "string" ? action : action?.id))) {
      count += 1;
    } else if (aliases.includes("switchAccount") && isTradingCostWorkbenchConfig(config) && (slotVisibleInConfig(config, "quickActions") || slotVisibleInConfig(config, "quick_actions"))) {
      count += 1;
    }
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
      understanding.wantsProfessionalTraderWorkbench
        ? Math.min(...contract.accountSlots.map((slot) => featureIndex(config, slot))) <= Math.min(...contract.operationSlots.map((slot) => featureIndex(config, slot)))
        : !contract.operationSlots.length ||
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
    if (understanding.wantsProfessionalTraderWorkbench) {
      const accountSettings = config.moduleSettings?.tradingAccounts || {};
      const contractFields = config.dataContract?.fields || {};
      check("professional-theme", "专业交易首页使用淡蓝商务风", ["blueFinance", "minimalWhite"].includes(config.themePreset), 18, "不能被旧交易规则覆盖成 darkTech");
      check("professional-first-screen", "首屏聚焦账号状态和账户表现", featureIndex(config, "trading_accounts_list") <= 1 && featureIndex(config, "trading_account_highlight") <= 1, 18, "账号状态与账户表现应进入第一屏");
      check("combined-card-accounts", "Live/Demo 在同一账号卡片区", accountSettings.grouping === "combined" && accountSettings.viewMode === "card" && accountSettings.realViewMode === "card" && accountSettings.demoViewMode === "card", 18, "真实账号和模拟账号不应拆成两个区");
      check("no-cost-board", "未误触发成本看板", moduleStyle(config, "accountPerformance") !== "cost-board" && !isTradingCostWorkbenchConfig(config), 18, "接口数据要求不等于成本看板");
	      check("data-contract", "预览样例与正式接口契约分离", config.dataContract?.previewSample === true && config.dataContract?.dataBindingRequired === true && ["tradingAccounts", "tradingCost", "pnl", "margin", "charts"].every((key) => contractFields[key]?.dataBindingRequired), 18, "需要标记 previewSample/dataBindingRequired/fallback");
      if (understanding.wantsFaqSection) {
        check("faq-minimal", "FAQ 简约低干扰", slotVisibleInConfig(config, "faq_section") && ["accordion", "compact-list"].includes(config.moduleStyles?.faq_section), 10, "FAQ 应使用 accordion 或 compact-list");
      }
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

  function depositGovernedBrickPlan(variant = 0) {
    const mode = variantMode(variant);
    const base = [
      { brickId: "promoBanner.depositLadder", brickName: "入金奖励阶梯", family: "PromotionBanner", feature: "promo_banner", component: "promo_banner", size: "3x1", zone: "hero", reason: "首屏用整横栏三档入金奖励和唯一主 CTA 承接首次入金目标。" },
      { brickId: "assetOverview.tickerStrip", brickName: "账户摘要指标带", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "1x1", zone: "hero", reason: "在同屏展示账户余额、钱包余额和交易账号余额，给入金前资金上下文。" },
      { brickId: "onboardingProgress.nextStepHero", brickName: "新手下一步引导", family: "OnboardingProgress", feature: "onboarding_guide", component: "onboarding_guide", size: "3x1", zone: "full", reason: "KYC、开真实账户和首次入金形成连续路径，用整横栏避免旧开户面板散落。" },
      { brickId: "quickActions.accentCards", brickName: "强调快捷入口卡", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "4-10 个常用入口用精致图标卡承接交易、转账、跟单和账号动作。" },
      { brickId: "accountPerformance.proChart", brickName: "账号表现双趋势", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账号表现整横栏呈现账号上下文、净值/PnL 趋势和操作闭环。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "真实交易账号和模拟交易账号必须同时出现，并用分组列表提升扫描效率。" },
    ];
    if (mode === 1) {
      return [
        base[0],
        base[1],
        base[2],
        base[3],
        base[5],
        base[4],
      ];
    }
    if (mode === 2) {
      return [
        base[0],
        { ...base[2], brickId: "onboardingProgress.missionBoard", brickName: "开户任务面板", reason: "新手路径改成任务看板，清楚标记 KYC、开真实账户和首次入金状态。" },
        base[1],
        { ...base[3], brickId: "quickActions.segmentedPanel", brickName: "分段快捷入口", reason: "资金、交易和推广入口分组展示，避免普通灰色宫格。" },
        { ...base[4], brickId: "accountPerformance.dualChart", brickName: "净值/PnL 双图表", reason: "账号表现优先净值面积图，可切换至 PnL 面积图。" },
        base[5],
      ];
    }
    return base;
  }

  function applyPageGovernanceRules(config, source = {}) {
    const intent = pageIntentFromConfig({ ...config, pageIntent: source.pageIntent || config.pageIntent }, source.sourcePrompt || "");
    const contract = pageGovernanceContract(intent);
    const next = config;
    const isProfessionalTraderWorkbench =
      source?.dataContract?.mode === "api-bound-preview" &&
      String(source?.brickTrace?.strategy || next?.brickTrace?.strategy || "").includes("专业交易客户首页");

    next.pageIntent = normalizePageIntent(source.pageIntent || next.pageIntent, intent);

	    if (intent === "deposit") {
	      const depositMode = variantMode(source.generationVariant ?? source.variant ?? next.generationVariant ?? 0);
	      const promptText = String(source.sourcePrompt || next.sourcePrompt || "").toLowerCase() + String(source.sourcePrompt || next.sourcePrompt || "");
	      const wantsWelcomeHeader = slotVisibleInConfig(next, "welcome_header") || includesAny(promptText, ["欢迎模块", "欢迎头部", "欢迎区", "客户姓名", "问候", "welcome"]);
	      next.name = includesAny(String(next.name || ""), ["入金", "奖励"]) ? next.name : "首次入金专业首页";
	      next.layoutPreset = "conversionFirst";
      next.designGenome = "depositLadder";
      next.pageStory = "depositConversion";
      next.heroFocus = "promo_banner";
      next.modules = {
        ...next.modules,
        PromotionBanner: { variant: "depositLadder" },
        AssetOverview: { variant: "tickerStrip" },
        OnboardingProgress: { variant: depositMode === 2 ? "missionBoard" : "nextStepHero" },
	        QuickActions: { variant: depositMode === 2 ? "segmentedMenu" : "accentCards" },
	        AccountPerformance: { variant: depositMode === 2 ? "dualChart" : "proChart" },
	        TradingAccounts: { variant: "separatedList" },
      };
      next.moduleStyles = {
        ...syncLegacyModuleStyles(next.modules),
        ...next.moduleStyles,
        promo_banner: "deposit-ladder",
        promoHighlight: "deposit-ladder",
        asset_overview: "ticker-strip",
        balanceTotal: "ticker-strip",
        onboarding_guide: depositMode === 2 ? "mission-board" : "next-step-hero",
        onboardingProgress: depositMode === 2 ? "mission-board" : "next-step-hero",
	        quick_actions: depositMode === 2 ? "segmented-panel" : "accent-cards",
	        quickActions: depositMode === 2 ? "segmented-panel" : "accent-cards",
        trading_account_highlight: "pro-chart",
	        accountPerformance: "pro-chart",
        trading_accounts_list: "calm-table",
	        tradingAccounts: "calm-table",
	      };
      next.componentMorphs = {
        ...(next.componentMorphs || {}),
        PromotionBanner: { variant: "depositLadder", morphId: "depositLadder", morph: "depositLadder" },
        AssetOverview: { variant: "tickerStrip", morphId: "metricTriplet", morph: "metricTriplet" },
        OnboardingProgress: {
          variant: next.modules.OnboardingProgress.variant,
          morphId: next.modules.OnboardingProgress.variant === "missionBoard" ? "missionBoard" : "nextStepHero",
          morph: next.modules.OnboardingProgress.variant === "missionBoard" ? "missionBoard" : "nextStepHero",
        },
        QuickActions: {
          variant: next.modules.QuickActions.variant,
          morphId: next.modules.QuickActions.variant === "segmentedMenu" ? "segmentedPanel" : "accentCards",
          morph: next.modules.QuickActions.variant === "segmentedMenu" ? "segmentedPanel" : "accentCards",
        },
        AccountPerformance: {
          variant: next.modules.AccountPerformance.variant,
          morphId: next.modules.AccountPerformance.variant === "dualChart" ? "dualChart" : "proChart",
          morph: next.modules.AccountPerformance.variant === "dualChart" ? "dualChart" : "proChart",
        },
        TradingAccounts: { variant: "separatedList", morphId: "liveDemoSplit", morph: "liveDemoSplit" },
      };
      next.moduleSettings = normalizeModuleSettings(mergeSettingsObject(next.moduleSettings, {
        adCarousel: { enabled: false },
        promoHighlight: { enabled: true },
        quickActions: { enabled: true, count: 8, display: "iconText", actions: [] },
        wallet: { enabled: false, placement: "mergedWithAssets", showFundActions: false },
        assets: { enabled: true, visibleFields: ["total", "wallet", "tradingAccount"], showFundActions: false, showAccountBreakdown: true, showWalletBreakdown: true, showAvailable: false, showMargin: false, showRiskLevel: false, wallets: ["USD"] },
        referral: { enabled: false },
        onboardingProgress: { enabled: true },
        accountPerformance: { enabled: true },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
        openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" },
        riskNotice: { enabled: false },
      }));
		      next.sections = [
		        ...(wantsWelcomeHeader ? [{ id: "welcome-header", type: "full", title: "欢迎", transition: "connected", slots: ["welcome_header"] }] : []),
		        { id: "deposit-hero", type: "full", title: "首次入金", transition: "connected", slots: ["promo_banner"] },
		        { id: "deposit-actions", type: "split", title: "账户与快捷入口", transition: "plain", slots: ["asset_overview", "quick_actions"] },
		        { id: "deposit-activation", type: "full", title: "开户引导", transition: "plain", slots: ["onboarding_guide"] },
		        ...(slotVisibleInConfig(next, "kyc_status_card") ? [{ id: "deposit-kyc-status", type: "rail", title: "KYC 状态", transition: "plain", slots: ["kyc_status_card"] }] : []),
		        ...(slotVisibleInConfig(next, "copytrading_signals") ? [{ id: "deposit-copytrading", type: "full", title: "CopyTrading", transition: "hard-break", slots: ["copytrading_signals"] }] : []),
		        ...(slotVisibleInConfig(next, "referral_link_card") || slotVisibleInConfig(next, "faq_section")
		          ? [{ id: "deposit-referral-faq", type: "split", title: "推广与帮助", transition: "hard-break", slots: ["referral_link_card", "faq_section"].filter((slot) => slotVisibleInConfig(next, slot)) }]
		          : []),
		        { id: "deposit-performance", type: "full", title: "账号表现", transition: "hard-break", slots: ["trading_account_highlight"] },
		        { id: "deposit-accounts", type: "full", title: "交易账号", transition: "connected", slots: ["trading_accounts_list"] },
		        ...(slotVisibleInConfig(next, "risk_disclosure") ? [{ id: "risk-disclosure-footer", type: "full", title: "风险提示", transition: "hard-break", slots: ["risk_disclosure"] }] : []),
		      ];
	      next.brickPlan = depositGovernedBrickPlan(depositMode);
      next.layout = enforceHomepageLayoutSafety(
        applyBrickMetadataToLayout(normalizeHomepageLayout(layoutFromSections(next.sections), next.sections).layout, next.brickPlan, next.modules),
        next.moduleSettings,
      );
      next.pageIntent = {
        ...next.pageIntent,
        primaryIntent: "deposit",
        primaryAction: "deposit",
        primaryCta: { label: "立即入金", action: "deposit", selector: "[data-home-action=\"deposit\"]" },
      };
	      next.emphasis = { ...next.emphasis, deposit: "high", openAccount: "high", promo: "high", accounts: "medium" };
	      next.aiSummary = "已按首次入金转化契约重排：欢迎首栏、入金奖励、账户摘要、新手路径、专业账号表现和 Live/Demo 账号证明。";
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
      next.heroFocus = "asset_overview";
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
        assets: {
          enabled: true,
          visibleFields: ["total", "tradingAccount", "wallet"],
          showFundActions: false,
          showAccountBreakdown: true,
          showWalletBreakdown: true,
          showAvailable: false,
          showMargin: false,
          showRiskLevel: false,
          wallets: ["USD", "EUR", "USDT"],
        },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list", demoFirst: false },
        openAccount: { enabled: true, real: true, demo: true, bind: false, placement: "standalone" },
        promoHighlight: { enabled: true },
        referral: { enabled: false },
        riskNotice: { enabled: false },
      }));
      next.sections = [
        { id: "trust-hero", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
        { id: "wallet-cards", type: "full", title: "钱包列表", slots: ["wallet_list"] },
        { id: "conversion-tools", type: "split", title: "活动", slots: ["promoHighlight"] },
        { id: "combined-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ];
      next.brickPlan = [
        { brickId: "assetOverview.tickerStrip", brickName: "三项资产汇总", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "main", reason: "首屏只展示余额合计、交易账号余额和钱包余额汇总。" },
        { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "与资产概览同行，避免右侧快捷入口下方大面积留白。" },
        { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "wallet_list", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包卡片只在钱包列表模块展示。" },
        { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "3x1", zone: "full", reason: "主推活动作为 Banner 大模块整横栏承接，不抢资金安全首屏。" },
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

    if (intent === "trader" && !isProfessionalTraderWorkbench) {
      next.moduleSettings = prioritizeQuickActions(next.moduleSettings, ["switchAccount", "positions", "orders", "downloadMt5", "risk", "deposit"], {
        count: 6,
        display: isTradingCostWorkbenchConfig(next) ? "iconText" : "iconOnly",
      });
    }
    if (hasStandaloneFundActions(next)) {
      next.moduleSettings.wallet.showFundActions = false;
    }

    next.pageGovernance = evaluatePageGovernance(next, source.sourcePrompt || next.sourcePrompt || "");
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

  function escapeRegExpText(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function rejectsPromptConcept(prompt, keywords) {
    const source = String(prompt || "");
    return keywords.some((keyword) => new RegExp(`(?:不要|不需要|隐藏|去掉|移除|关闭|禁用|别放)[^。；;\\n]{0,32}${escapeRegExpText(keyword)}`, "i").test(source));
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

  function normalizeHomepageRenderMode(value, fallback = "config") {
    const raw = cleanMetaText(value, fallback, 24);
    return ["config", "aiHtml", "skeletonHtml", "compare"].includes(raw) ? raw : fallback;
  }

  function normalizeHomeColorMode(value, fallback = "auto") {
    const raw = cleanMetaText(value, fallback, 24).toLowerCase();
    if (["dark", "night", "night-mode", "暗夜", "夜间", "黑夜"].includes(raw)) return "dark";
    if (["light", "day", "day-mode", "白天", "日间", "亮色"].includes(raw)) return "light";
    return "auto";
  }

  function colorModeFromPromptText(prompt, fallback = "auto") {
    const source = String(prompt || "");
    const text = source.toLowerCase() + source;
    const wantsDark = includesAny(text, ["暗夜", "夜间", "黑夜", "夜色", "dark mode", "night mode", "暗色模式"]);
    const wantsLight = includesAny(text, ["白天", "日间", "亮色", "浅色模式", "light mode", "day mode"]);
    if (wantsDark && !wantsLight) return "dark";
    if (wantsLight && !wantsDark) return "light";
    if (wantsDark && wantsLight) return "auto";
    return normalizeHomeColorMode(fallback);
  }

  function renderModeWantsAiHtml(mode) {
    return mode === "aiHtml" || mode === "compare";
  }

  function renderModeWantsSkeletonHtml(mode) {
    return mode === "skeletonHtml";
  }

  function sanitizeAiHtmlMarkup(value) {
    return String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<(?:iframe|object|embed|link|meta|base|form|input|textarea|select)\b[\s\S]*?<\/(?:iframe|object|embed|link|meta|base|form|input|textarea|select)>/gi, "")
      .replace(/<(?:iframe|object|embed|link|meta|base|form|input|textarea|select)\b[^>]*\/?>/gi, "")
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\sstyle\s*=\s*"[^"]*"/gi, "")
      .replace(/\sstyle\s*=\s*'[^']*'/gi, "")
      .replace(/javascript:/gi, "")
      .slice(0, 18000);
  }

  function sanitizeAiHtmlCss(value) {
    return String(value || "")
      .replace(/@import[^;]+;/gi, "")
      .replace(/url\(\s*javascript:[^)]+\)/gi, "")
      .replace(/position\s*:\s*fixed\s*;?/gi, "")
      .slice(0, 18000);
  }

  function normalizeAiHtmlScheme(source, enabled = false) {
    const scheme = source && typeof source === "object" ? source : {};
    const html = sanitizeAiHtmlMarkup(scheme.html);
    const css = sanitizeAiHtmlCss(scheme.css);
    const hasHtml = Boolean(html && css);
	    const qualityScore = Number.isFinite(Number(scheme.qualityScore))
	      ? Math.max(0, Math.min(100, Math.round(Number(scheme.qualityScore))))
	      : null;
	    const sourceType = cleanMetaText(scheme.sourceType, "", 48);
	    const mock = Boolean(scheme.mock || sourceType === "mock" || sourceType.startsWith("fallback/mock"));
	    const isFallback = Boolean(scheme.isFallback || mock || /fallback/i.test(sourceType) || /fallback/i.test(scheme.generationPipeline || ""));
	    const rawQualityStatus = cleanMetaText(scheme.qualityStatus, qualityScore === null ? "" : qualityScore >= 82 ? "passed" : "needs-polish", 40);
    const normalizeTextList = (value, limit = 8, itemLimit = 140) =>
      (Array.isArray(value) ? value : [])
        .map((item) => cleanMetaText(item, "", itemLimit))
        .filter(Boolean)
        .slice(0, limit);
    const normalizeTextMap = (value, entryLimit = 12, valueLimit = 180) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return {};
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, item]) => [cleanMetaText(key, "", 64), cleanMetaText(typeof item === "string" ? item : JSON.stringify(item), "", valueLimit)])
          .filter(([key, item]) => key && item)
          .slice(0, entryLimit),
      );
    };
    const normalizeReferences = (value) =>
      (Array.isArray(value) ? value : [])
        .map((item) => {
          if (typeof item === "string") return { componentId: cleanMetaText(item, "", 80), family: "", module: "", reason: "" };
          if (!item || typeof item !== "object") return null;
          return {
            componentId: cleanMetaText(item.componentId || item.id || item.name, "", 80),
            family: cleanMetaText(item.family, "", 60),
            module: cleanMetaText(item.module || item.block || item.component, "", 60),
            reason: cleanMetaText(item.reason || item.usedFor || item.inspiration, "", 180),
          };
        })
        .filter((item) => item && (item.componentId || item.family || item.module || item.reason))
        .slice(0, 12);
    const normalizeImplementationContract = (value) =>
      (Array.isArray(value) ? value : [])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const list = (sourceValue, limit = 8, itemLimit = 90) =>
            (Array.isArray(sourceValue) ? sourceValue : [])
              .map((entry) => cleanMetaText(entry, "", itemLimit))
              .filter(Boolean)
              .slice(0, limit);
          return {
            module: cleanMetaText(item.module || item.component || item.block || item.id, "", 80),
            label: cleanMetaText(item.label || item.name || item.title, "", 80),
            family: cleanMetaText(item.family || item.componentFamily, "", 80),
            dataFields: list(item.dataFields || item.fields || item.dataBindings, 10, 72),
            states: list(item.states || item.stateCoverage || item.requiredStates, 8, 72),
            actions: list(item.actions || item.actionCoverage || item.requiredActions, 8, 72),
            interactions: list(item.interactions || item.behaviors || item.userFlows, 8, 100),
            renderEvidence: list(item.renderEvidence || item.evidence || item.htmlEvidence, 8, 120),
            emptyShellRisk: Boolean(item.emptyShellRisk || item.fakeComponentRisk || item.staticShellRisk),
            note: cleanMetaText(item.note || item.implementationNote || item.rationale, "", 160),
          };
        })
        .filter((item) => item && (item.module || item.label || item.family))
        .slice(0, 12);
    const normalizeLayoutContract = (value) => {
      const source = value && typeof value === "object" ? value : {};
      const rowRecipes = Array.isArray(source.rowRecipes)
        ? source.rowRecipes.map((item) => cleanMetaText(item, "", 20)).filter(Boolean).slice(0, 6)
        : [];
      return {
        gridColumns: HOME_GRID_COLUMNS,
        desktopSpans: [12, 8, 6, 4],
        rowRecipes: rowRecipes.length ? rowRecipes : ["12+0", "8+4", "6+6", "4+8"],
        tablet: cleanMetaText(source.tablet, "single-column", 40),
        mobile: cleanMetaText(source.mobile, "single-column", 40),
        dataAttributes: ["data-ai-html-grid=\"12\"", "data-ai-html-span=\"12|8|6|4\""],
      };
    };
    return {
      enabled: Boolean(enabled || scheme.enabled) && hasHtml,
      name: cleanMetaText(scheme.name, "AI HTML 视觉方案", 56),
      summary: cleanMetaText(scheme.summary, "AI 生成 HTML/CSS 视觉草稿，已进行安全清洗。", 220),
      visualBrief: cleanMetaText(scheme.visualBrief, "用更自由的排版、留白和视觉层级提升页面美感。", 260),
      moduleUnderstanding:
        scheme.moduleUnderstanding && typeof scheme.moduleUnderstanding === "object" && !Array.isArray(scheme.moduleUnderstanding)
          ? {
              pageIntent: cleanMetaText(scheme.moduleUnderstanding.pageIntent || scheme.moduleUnderstanding.intent, "", 80),
              visualGoal: cleanMetaText(scheme.moduleUnderstanding.visualGoal || scheme.moduleUnderstanding.visualTone, "", 160),
              layoutDirection: cleanMetaText(scheme.moduleUnderstanding.layoutDirection || scheme.moduleUnderstanding.layoutIdea, "", 200),
              moduleStrategy: cleanMetaText(scheme.moduleUnderstanding.moduleStrategy || scheme.moduleUnderstanding.strategy, "", 220),
            }
          : {},
      requiredModules: normalizeTextList(scheme.requiredModules, 16, 80),
      moduleMapping: normalizeTextMap(scheme.moduleMapping),
      implementationContract: normalizeImplementationContract(scheme.implementationContract || scheme.moduleImplementation || scheme.capabilityContract),
      componentReferences: normalizeReferences(scheme.componentReferences),
      layoutContract: normalizeLayoutContract(scheme.layoutContract),
      designNotes: normalizeTextList(scheme.designNotes, 8, 180),
      html,
      css,
	      dataBindings: (Array.isArray(scheme.dataBindings) ? scheme.dataBindings : [])
	        .map((item) => cleanMetaText(item, "", 80))
	        .filter(Boolean)
	        .slice(0, 12),
	      qualityScore,
	      qualityStatus: isFallback ? (mock ? "mock-preview" : "fallback-preview") : rawQualityStatus,
      qualityIssues: normalizeTextList(scheme.qualityIssues, 8, 180),
      aestheticChecks: normalizeTextList(scheme.aestheticChecks, 10, 160),
      safetyStatus: cleanMetaText(scheme.safetyStatus, hasHtml ? "sanitized" : "empty", 32),
      safetyNotes: (Array.isArray(scheme.safetyNotes) ? scheme.safetyNotes : ["已移除脚本、内联事件和危险 URL。"])
        .map((item) => cleanMetaText(item, "", 120))
        .filter(Boolean)
        .slice(0, 8),
      provider: cleanMetaText(scheme.provider, "", 48),
      model: cleanMetaText(scheme.model, "", 80),
	      generatedAt: cleanMetaText(scheme.generatedAt, "", 48),
	      generationPipeline: cleanMetaText(scheme.generationPipeline, "", 48),
	      correctionStatus: cleanMetaText(scheme.correctionStatus, hasHtml ? "sanitized" : "empty", 48),
	      sourceType,
	      isFallback,
	      fallbackReason: cleanMetaText(scheme.fallbackReason || scheme.reason, "", 220),
	      modelAttempted: typeof scheme.modelAttempted === "boolean" ? scheme.modelAttempted : /^model/.test(sourceType) || sourceType.startsWith("fallback/"),
	      mock,
	      correctionNotes: (Array.isArray(scheme.correctionNotes) ? scheme.correctionNotes : [])
        .map((item) => cleanMetaText(item, "", 140))
        .filter(Boolean)
        .slice(0, 8),
    };
  }

  function skeletonSlotKey(value) {
    return cleanMetaText(value, "", 80).replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function skeletonSectionClass(type) {
    return `home-skeleton-section-${cleanMetaText(type, "full", 24).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  }

  function normalizeSkeletonStatus(value, fallback = "pending-fill") {
    const raw = cleanMetaText(value, fallback, 32);
    return ["pending-fill", "generating", "filled", "locked", "failed", "review", "final"].includes(raw) ? raw : fallback;
  }

  function normalizeSkeletonChromeMode(value, fallback = "cardedDashboard") {
    const raw = cleanMetaText(value, fallback, 40);
    return ["cardedDashboard", "flatConnected", "sectionBand", "workbench", "heroProof"].includes(raw) ? raw : fallback;
  }

  function normalizeSkeletonSlotChrome(value, fallback = "contained") {
    const raw = cleanMetaText(value, fallback, 32);
    return ["contained", "flat", "inline", "bare", "featured", "rail", "tableSurface", "legalStrip"].includes(raw) ? raw : fallback;
  }

  function normalizeSkeletonSectionChrome(value, fallback = "group") {
    const raw = cleanMetaText(value, fallback, 32);
    return ["group", "connected", "band", "workbench", "hero", "plain"].includes(raw) ? raw : fallback;
  }

	  function normalizeSkeletonChromePolicy(source, fallback = {}) {
    const policy = source && typeof source === "object" ? source : {};
    const fallbackPolicy = fallback && typeof fallback === "object" ? fallback : {};
    const mode = normalizeSkeletonChromeMode(policy.mode || fallbackPolicy.mode);
    const defaultSlotChrome = normalizeSkeletonSlotChrome(
      policy.defaultSlotChrome || fallbackPolicy.defaultSlotChrome,
      mode === "flatConnected" ? "flat" : mode === "workbench" ? "tableSurface" : "contained",
    );
    const slotOverrides = policy.slotOverrides && typeof policy.slotOverrides === "object" ? policy.slotOverrides : fallbackPolicy.slotOverrides || {};
    const sectionOverrides = policy.sectionOverrides && typeof policy.sectionOverrides === "object" ? policy.sectionOverrides : fallbackPolicy.sectionOverrides || {};

    return {
      mode,
      sectionChrome: normalizeSkeletonSectionChrome(
        policy.sectionChrome || fallbackPolicy.sectionChrome,
        mode === "flatConnected" ? "connected" : mode === "sectionBand" ? "band" : mode === "workbench" ? "workbench" : "group",
      ),
      defaultSlotChrome,
      slotOverrides: Object.fromEntries(
        Object.entries(slotOverrides)
          .map(([key, item]) => [skeletonSlotKey(key), normalizeSkeletonSlotChrome(item, defaultSlotChrome)])
          .filter(([key]) => key),
      ),
      sectionOverrides: Object.fromEntries(
        Object.entries(sectionOverrides)
          .map(([key, item]) => [cleanMetaText(key, "", 64), normalizeSkeletonSectionChrome(item)])
          .filter(([key]) => key),
      ),
      componentBoundary: cleanMetaText(
        policy.componentBoundary || fallbackPolicy.componentBoundary,
        mode === "flatConnected"
          ? "page-owned"
          : mode === "workbench"
            ? "shared-workbench"
            : "component-contained",
        48,
      ),
      promptRule: cleanMetaText(
        policy.promptRule || fallbackPolicy.promptRule,
        mode === "flatConnected"
          ? "页面骨架负责外壳和分隔线，slot 组件优先输出无外框内容片段。"
          : mode === "workbench"
            ? "页面骨架负责工作台表面，slot 组件使用工具栏、表格、状态条和图表区域衔接。"
            : "slot 可以保留轻量卡片外壳，但圆角、边框、阴影和按钮必须继承页面契约。",
        180,
      ),
	    };
	  }

  function normalizeSkeletonComponentScore(value) {
    if (value === null || value === undefined || value === "") return null;
    const score = Number(value);
    if (!Number.isFinite(score)) return null;
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  function skeletonComponentReferenceTier(score, fallback = "") {
    const normalized = normalizeSkeletonComponentScore(score);
    if (normalized == null) return cleanMetaText(fallback, "", 24);
    if (normalized >= 8) return "strong";
    if (normalized >= 6) return "moderate";
    return "blocked";
  }

	  function normalizeSkeletonSlotComponent(component, slot) {
	    const source = component && typeof component === "object" ? component.component || component : {};
	    const slotKey = skeletonSlotKey(component?.slot || slot);
	    const html = sanitizeAiHtmlMarkup(source.html || component?.html);
	    const css = sanitizeAiHtmlCss(source.css || component?.css);
	    const id = cleanMetaText(source.id || source.componentId || component?.componentId || `${slotKey}-component`, "", 90);
	    if (!slotKey || (!id && !html && !css)) return null;
    const score = normalizeSkeletonComponentScore(source.score ?? component?.score);
    const referenceScore = normalizeSkeletonComponentScore(source.referenceScore ?? component?.referenceScore);
    const referenceTier = skeletonComponentReferenceTier(score ?? referenceScore, source.referenceTier || component?.referenceTier);
    if (referenceTier === "blocked" || (score != null && score <= 5)) return null;
	    if (slotKey === "support_contact") {
	      const supportSource = `${source.name || ""} ${source.description || ""} ${html}`;
      const leaksAdminPrompt = /首页目标|当前步骤|slot：|模块名称：|Client Home Atom/i.test(supportSource);
      const looksLikeWrongModule = /KYC Verified|Wallet\s+\d|Open Account|账户余额|钱包余额|开真实账户/i.test(supportSource);
      const hasSupportSemantics = /在线客服|联系客服|客服|客户经理|服务时间|帮助中心|工单|实时对话|Support|Contact|Ticket|Live Chat/i.test(supportSource);
      if (leaksAdminPrompt || looksLikeWrongModule || !hasSupportSemantics) return null;
    }

    return {
      id,
      slot: slotKey,
      name: cleanMetaText(source.name || component?.name || featureLabel(slotKey), featureLabel(slotKey), 80),
      family: cleanMetaText(source.family || component?.family, "", 80),
      size: cleanMetaText(source.size || component?.size, "", 24),
      description: cleanMetaText(source.description || component?.description, "", 220),
      tags: (Array.isArray(source.tags || component?.tags) ? source.tags || component.tags : [])
        .map((item) => cleanMetaText(item, "", 32))
        .filter(Boolean)
        .slice(0, 8),
      chrome: normalizeSkeletonSlotChrome(source.chrome || component?.chrome || component?.slotChrome, "contained"),
      html,
      css,
      sourceType: cleanMetaText(source.sourceType || component?.sourceType, "component-ai", 48),
      fallbackReason: cleanMetaText(source.fallbackReason || component?.fallbackReason, "", 220),
      referenceComponentId: cleanMetaText(source.referenceComponentId || component?.referenceComponentId, "", 90),
	      referenceComponentName: cleanMetaText(source.referenceComponentName || component?.referenceComponentName, "", 90),
	      referenceFamily: cleanMetaText(source.referenceFamily || component?.referenceFamily, "", 80),
      score,
      referenceScore,
      referenceTier,
	      requestedSize: cleanMetaText(source.requestedSize || component?.requestedSize, "", 24),
      sourcePrompt: cleanMetaText(source.sourcePrompt || component?.sourcePrompt, "", 1200),
      originalSlotPrompt: cleanMetaText(source.originalSlotPrompt || component?.originalSlotPrompt, "", 1200),
      slotPromptContractSummary: cleanMetaText(source.slotPromptContractSummary || component?.slotPromptContractSummary, "", 1800),
      lastAdjustmentPrompt: cleanMetaText(source.lastAdjustmentPrompt || component?.lastAdjustmentPrompt, "", 500),
      model: cleanMetaText(source.model || component?.model, "", 80),
      provider: cleanMetaText(source.provider || component?.provider, "", 48),
      generatedAt: cleanMetaText(source.generatedAt || source.updatedAt || component?.generatedAt, "", 48),
      locked: Boolean(source.locked || component?.locked),
    };
  }

  function normalizeSkeletonSlotComponents(source) {
    const components = source && typeof source === "object" && !Array.isArray(source) ? source : {};
    return Object.fromEntries(
      Object.entries(components)
        .map(([slot, component]) => {
          const slotKey = skeletonSlotKey(slot);
          const normalized = normalizeSkeletonSlotComponent(component, slotKey);
          return slotKey && normalized ? [slotKey, normalized] : null;
        })
        .filter(Boolean),
    );
  }

  function skeletonSlotRecord(slot, config, section, index, designContract = {}) {
    const moduleId = moduleKeyFor(slot);
    const variant = moduleId ? config?.modules?.[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId] || "" : "";
    const morph = moduleId ? config?.componentMorphs?.[moduleId]?.morphId || "" : "";
    const slotKey = skeletonSlotKey(slot);
    const size = skeletonSlotSizeForGrid(slotKey, section);
    const layoutContract = homeGridContractForSize(size, {
      slot: slotKey,
      sectionType: section?.type || "full",
      zone: section?.type || "",
    });
    return {
      id: slotKey,
      slot: slotKey,
      label: cleanMetaText(featureLabel(slotKey), slot, 80),
      sectionId: cleanMetaText(section?.id, "", 64),
      sectionTitle: cleanMetaText(section?.title, "", 80),
      sectionType: cleanMetaText(section?.type, "full", 24),
      moduleId,
      variant,
      morph,
      size,
      layoutContract,
      chrome: skeletonSlotChrome(slotKey, config, section, designContract),
      status: "pending-fill",
      filledAt: "",
      index,
    };
  }

  function skeletonSlotSizeForGrid(slotId, section = {}) {
    const key = skeletonSlotKey(slotId);
    const largeSize = largeFullRowHomeBlockSize(key);
    if (largeSize) return largeSize;
    if (["asset_overview", "risk_disclosure"].includes(key)) return "3x1";
    if (section?.type === "rail") return "1x1";
    if (section?.type === "split") return "2x1";
    if (section?.type === "hero" || section?.type === "full") return "3x1";
    return "2x1";
  }

	  function skeletonContractArray(value, fallback = []) {
	    const source = Array.isArray(value) ? value : fallback;
	    return source.map((item) => cleanMetaText(item, "", 180)).filter(Boolean).slice(0, 8);
	  }

	  function skeletonContractToken(value, fallback = "", limit = 120) {
	    return cleanMetaText(value, fallback, limit);
	  }

	  function normalizeSkeletonLayoutRules(source = {}, fallback = {}) {
	    const rules = source && typeof source === "object" ? source : {};
	    const fallbackRules = fallback && typeof fallback === "object" ? fallback : {};
	    return {
	      maxWidth: cleanMetaText(rules.maxWidth || fallbackRules.maxWidth, "1280px", 24),
	      gridColumns: Number(rules.gridColumns || fallbackRules.gridColumns || HOME_GRID_COLUMNS) || HOME_GRID_COLUMNS,
	      rowRecipes: (Array.isArray(rules.rowRecipes) ? rules.rowRecipes : fallbackRules.rowRecipes || [])
	        .map((item) => cleanMetaText(item, "", 24))
	        .filter(Boolean)
	        .slice(0, 6),
	      sectionGrouping: cleanMetaText(rules.sectionGrouping || fallbackRules.sectionGrouping, "", 180),
	      backgroundRule: cleanMetaText(rules.backgroundRule || fallbackRules.backgroundRule, "", 180),
	      blockRelation: cleanMetaText(rules.blockRelation || fallbackRules.blockRelation, "", 180),
	    };
	  }

	  function compactSkeletonThemeCustom(source = {}, fallback = {}) {
	    const theme = source && typeof source === "object" ? source : {};
	    const fallbackTheme = fallback && typeof fallback === "object" ? fallback : {};
	    return compactThemeObject({
	      input: cleanMetaText(theme.input || fallbackTheme.input, "", 96),
	      primaryColor: cleanMetaText(theme.primaryColor || fallbackTheme.primaryColor, "", 40),
	      primaryStrong: cleanMetaText(theme.primaryStrong || fallbackTheme.primaryStrong, "", 40),
	      primaryText: cleanMetaText(theme.primaryText || fallbackTheme.primaryText, "", 40),
	      accentColor: cleanMetaText(theme.accentColor || fallbackTheme.accentColor, "", 40),
	      backgroundStyle: cleanMetaText(theme.backgroundStyle || fallbackTheme.backgroundStyle, "", 180),
	      cardStyle: cleanMetaText(theme.cardStyle || fallbackTheme.cardStyle, "", 80),
	      surfaceColor: cleanMetaText(theme.surfaceColor || fallbackTheme.surfaceColor, "", 80),
	      surfaceSoft: cleanMetaText(theme.surfaceSoft || fallbackTheme.surfaceSoft, "", 80),
	      surfaceMuted: cleanMetaText(theme.surfaceMuted || fallbackTheme.surfaceMuted, "", 80),
	      textStrong: cleanMetaText(theme.textStrong || fallbackTheme.textStrong, "", 40),
	      textColor: cleanMetaText(theme.textColor || fallbackTheme.textColor, "", 40),
	      textSoft: cleanMetaText(theme.textSoft || fallbackTheme.textSoft, "", 40),
	      textMuted: cleanMetaText(theme.textMuted || fallbackTheme.textMuted, "", 40),
	      borderColor: cleanMetaText(theme.borderColor || fallbackTheme.borderColor, "", 80),
	      borderSoft: cleanMetaText(theme.borderSoft || fallbackTheme.borderSoft, "", 80),
	      buttonStyle: cleanMetaText(theme.buttonStyle || fallbackTheme.buttonStyle, "", 160),
	      buttonText: cleanMetaText(theme.buttonText || fallbackTheme.buttonText, "", 40),
	      cardShadow: cleanMetaText(theme.cardShadow || fallbackTheme.cardShadow, "", 120),
	    });
	  }

	  function mergeSkeletonDesignContracts(base = {}, override = {}) {
	    const source = base && typeof base === "object" ? base : {};
	    const patch = override && typeof override === "object" ? override : {};
	    return {
	      ...source,
	      ...patch,
	      tokens: {
	        ...(source.tokens && typeof source.tokens === "object" ? source.tokens : {}),
	        ...(patch.tokens && typeof patch.tokens === "object" ? patch.tokens : {}),
	      },
	      chromePolicy: {
	        ...(source.chromePolicy && typeof source.chromePolicy === "object" ? source.chromePolicy : {}),
	        ...(patch.chromePolicy && typeof patch.chromePolicy === "object" ? patch.chromePolicy : {}),
	        slotOverrides: {
	          ...(source.chromePolicy?.slotOverrides && typeof source.chromePolicy.slotOverrides === "object" ? source.chromePolicy.slotOverrides : {}),
	          ...(patch.chromePolicy?.slotOverrides && typeof patch.chromePolicy.slotOverrides === "object" ? patch.chromePolicy.slotOverrides : {}),
	        },
	        sectionOverrides: {
	          ...(source.chromePolicy?.sectionOverrides && typeof source.chromePolicy.sectionOverrides === "object" ? source.chromePolicy.sectionOverrides : {}),
	          ...(patch.chromePolicy?.sectionOverrides && typeof patch.chromePolicy.sectionOverrides === "object" ? patch.chromePolicy.sectionOverrides : {}),
	        },
	      },
	      layoutRules: {
	        ...(source.layoutRules && typeof source.layoutRules === "object" ? source.layoutRules : {}),
	        ...(patch.layoutRules && typeof patch.layoutRules === "object" ? patch.layoutRules : {}),
	      },
	      themeCustom: {
	        ...(source.themeCustom && typeof source.themeCustom === "object" ? source.themeCustom : {}),
	        ...(patch.themeCustom && typeof patch.themeCustom === "object" ? patch.themeCustom : {}),
	      },
	    };
	  }

	  function normalizeSkeletonDesignContract(source, fallback = {}) {
	    const contract = source && typeof source === "object" ? source : fallback && typeof fallback === "object" ? fallback : {};
	    const fallbackTokens = fallback.tokens && typeof fallback.tokens === "object" ? fallback.tokens : {};
	    const tokens = contract.tokens && typeof contract.tokens === "object" ? contract.tokens : fallbackTokens;
	    const chromePolicy = normalizeSkeletonChromePolicy(contract.chromePolicy, fallback.chromePolicy);
	    const layoutRules = normalizeSkeletonLayoutRules(contract.layoutRules, fallback.layoutRules);
	    return {
	      id: cleanMetaText(contract.id || fallback.id, "ops-console", 48),
	      label: cleanMetaText(contract.label || fallback.label, "账户运营控制台契约", 80),
	      sourceSampleId: cleanMetaText(contract.sourceSampleId || fallback.sourceSampleId, "", 80),
	      sourceSampleName: cleanMetaText(contract.sourceSampleName || fallback.sourceSampleName, "", 100),
	      sourceSampleIds: (Array.isArray(contract.sourceSampleIds) ? contract.sourceSampleIds : fallback.sourceSampleIds || [])
	        .map((item) => cleanMetaText(item, "", 80))
	        .filter(Boolean)
	        .slice(0, 5),
	      sourceSampleNames: (Array.isArray(contract.sourceSampleNames) ? contract.sourceSampleNames : fallback.sourceSampleNames || [])
	        .map((item) => cleanMetaText(item, "", 100))
	        .filter(Boolean)
	        .slice(0, 5),
	      personality: cleanMetaText(contract.personality || fallback.personality, "ops-console", 48),
	      tone: cleanMetaText(contract.tone || fallback.tone, "冷静、清晰、可扫描", 120),
	      surface: cleanMetaText(contract.surface || fallback.surface, "薄边框白底模块，浅蓝灰背景，只用一套主色强调状态和主操作。", 180),
	      narrative: cleanMetaText(contract.narrative || fallback.narrative, "先决定整页叙事，再按 slot 填充模块。", 180),
	      density: cleanMetaText(contract.density || fallback.density, "balanced", 32),
	      theme: cleanMetaText(contract.theme || fallback.theme, "blueFinance", 48),
	      tokens: {
	        pageMaxWidth: skeletonContractToken(tokens.pageMaxWidth || layoutRules.maxWidth, "1320px", 24),
	        pageGutter: skeletonContractToken(tokens.pageGutter, "16px", 24),
	        cardRadius: skeletonContractToken(tokens.cardRadius, "8px", 24),
	        buttonRadius: skeletonContractToken(tokens.buttonRadius, "8px", 24),
	        sectionGap: skeletonContractToken(tokens.sectionGap, "14px", 24),
	        rowGap: skeletonContractToken(tokens.rowGap || tokens.sectionGap, "14px", 24),
	        cardPadding: skeletonContractToken(tokens.cardPadding, "16px", 24),
	        cardShadow: skeletonContractToken(tokens.cardShadow, "none", 100),
	        cardBorder: skeletonContractToken(tokens.cardBorder, "var(--home-border-soft)", 80),
	        background: skeletonContractToken(tokens.background, "var(--home-bg)", 180),
	        surface: skeletonContractToken(tokens.surface, "var(--home-card-bg)", 80),
	        surfaceSoft: skeletonContractToken(tokens.surfaceSoft, "var(--home-surface-soft)", 80),
	        surfaceMuted: skeletonContractToken(tokens.surfaceMuted, "var(--home-surface-muted)", 80),
	        primaryColor: skeletonContractToken(tokens.primaryColor, "var(--home-primary)", 40),
	        primaryStrong: skeletonContractToken(tokens.primaryStrong, "var(--home-primary-strong)", 40),
	        accentColor: skeletonContractToken(tokens.accentColor, "var(--home-accent)", 40),
	        textStrong: skeletonContractToken(tokens.textStrong, "var(--home-text-strong)", 40),
	        textMuted: skeletonContractToken(tokens.textMuted, "var(--home-text-muted)", 40),
	      },
	      componentRules: skeletonContractArray(contract.componentRules, fallback.componentRules),
	      ctaRules: skeletonContractArray(contract.ctaRules, fallback.ctaRules),
	      moduleGrammar: cleanMetaText(contract.moduleGrammar || fallback.moduleGrammar, "用统一模块语法组织整页。", 220),
	      differenceRule: cleanMetaText(contract.differenceRule || fallback.differenceRule, "差异来自整页叙事和结构分叉，不靠随机换色。", 220),
	      layoutRules,
	      themeCustom: compactSkeletonThemeCustom(contract.themeCustom, fallback.themeCustom),
	      chromePolicy,
	    };
	  }

	  function buildSkeletonDesignContract(config = {}) {
	    const source = config && typeof config === "object" ? config : {};
	    const layoutPreset = normalizeLayoutPreset(source.layoutPreset || (typeof source.layout === "string" ? source.layout : ""));
	    const designGenome = normalizeDesignGenome(source.designGenome || source.layoutGene || source.genome, designGenomeForLayout(layoutPreset));
	    const genome = DESIGN_GENOMES[designGenome] || DESIGN_GENOMES.accountOpsConsole;
	    const storyId = normalizePageStory(source.pageStory || source.heroNarrative || source.story, genome.story || "opsClarity");
	    const story = PAGE_STORIES[storyId] || PAGE_STORIES.opsClarity;
	    const template = SKELETON_STYLE_CONTRACTS[designGenome] || SKELETON_STYLE_CONTRACTS[genome.id] || SKELETON_STYLE_CONTRACTS.accountOpsConsole;
	    const density = ["compact", "comfortable", "balanced", "spacious"].includes(source.density) ? source.density : genome.density || DEFAULT_CONFIG.density;
	    const theme = normalizeThemeId(source.themePreset || source.theme || genome.themePreset || DEFAULT_CONFIG.themePreset);
	    const explicitContract =
	      (source.styleContract && typeof source.styleContract === "object" ? source.styleContract : null) ||
	      (source.goldenStyleContract && typeof source.goldenStyleContract === "object" ? source.goldenStyleContract : null);
	    const baseContract = explicitContract ? mergeSkeletonDesignContracts(template, explicitContract) : template;
	    return normalizeSkeletonDesignContract(
	      {
	        ...baseContract,
	        narrative: explicitContract?.narrative || `${story.label || storyId}：${story.summary || baseContract.differenceRule || template.differenceRule}`,
	        density: explicitContract?.density || density,
	        theme: explicitContract?.theme || theme,
	      },
	      SKELETON_STYLE_CONTRACTS.accountOpsConsole,
	    );
	  }

  function skeletonDesignContractPrompt(contract = {}) {
    const normalized = normalizeSkeletonDesignContract(contract, SKELETON_STYLE_CONTRACTS.accountOpsConsole);
    return [
	      `整页风格契约：${normalized.label} / ${normalized.tone}`,
	      `叙事规则：${normalized.narrative}`,
	      `视觉表面：${normalized.surface}`,
	      `全局 token：页面宽度 ${normalized.tokens.pageMaxWidth}，背景 ${normalized.tokens.background}，圆角 ${normalized.tokens.cardRadius}，按钮圆角 ${normalized.tokens.buttonRadius}，区块间距 ${normalized.tokens.sectionGap}，行间距 ${normalized.tokens.rowGap}，卡片内距 ${normalized.tokens.cardPadding}，边框 ${normalized.tokens.cardBorder}，阴影 ${normalized.tokens.cardShadow}`,
	      normalized.layoutRules.blockRelation ? `块关系：${normalized.layoutRules.blockRelation}` : "",
	      normalized.componentRules.length ? `组件统一规则：${normalized.componentRules.join("；")}` : "",
      normalized.ctaRules.length ? `CTA 统一规则：${normalized.ctaRules.join("；")}` : "",
      `模块语法：${normalized.moduleGrammar}`,
      `外壳策略：${normalized.chromePolicy.mode} / ${normalized.chromePolicy.componentBoundary}。${normalized.chromePolicy.promptRule}`,
      `差异规则：${normalized.differenceRule}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

	  function skeletonContractCssValue(value, fallback) {
	    const source = String(value || fallback || "").trim();
	    return /^[#\w\s.,:%()+-]+$/.test(source) ? source.slice(0, 180) : fallback;
	  }

	  function applySkeletonContractStyleVars(node, contract = {}) {
	    if (!node?.style) return;
	    const normalized = normalizeSkeletonDesignContract(contract, SKELETON_STYLE_CONTRACTS.accountOpsConsole);
	    node.style.setProperty("--home-skeleton-contract-max-width", skeletonContractCssValue(normalized.tokens.pageMaxWidth, "1320px"));
	    node.style.setProperty("--home-skeleton-contract-page-gutter", skeletonContractCssValue(normalized.tokens.pageGutter, "16px"));
	    node.style.setProperty("--home-skeleton-contract-radius", skeletonContractCssValue(normalized.tokens.cardRadius, "8px"));
	    node.style.setProperty("--home-skeleton-contract-button-radius", skeletonContractCssValue(normalized.tokens.buttonRadius, "8px"));
	    node.style.setProperty("--home-skeleton-contract-gap", skeletonContractCssValue(normalized.tokens.sectionGap, "14px"));
	    node.style.setProperty("--home-skeleton-contract-row-gap", skeletonContractCssValue(normalized.tokens.rowGap, "14px"));
	    node.style.setProperty("--home-skeleton-contract-padding", skeletonContractCssValue(normalized.tokens.cardPadding, "16px"));
	    node.style.setProperty("--home-skeleton-contract-shadow", skeletonContractCssValue(normalized.tokens.cardShadow, "none"));
	    node.style.setProperty("--home-skeleton-contract-border", skeletonContractCssValue(normalized.tokens.cardBorder, "var(--home-border-soft)"));
	    node.style.setProperty("--home-skeleton-contract-bg", skeletonContractCssValue(normalized.tokens.background, "var(--home-bg)"));
	    node.style.setProperty("--home-skeleton-contract-surface", skeletonContractCssValue(normalized.tokens.surface, "var(--home-card-bg)"));
	    node.style.setProperty("--home-skeleton-contract-surface-soft", skeletonContractCssValue(normalized.tokens.surfaceSoft, "var(--home-surface-soft)"));
	    node.style.setProperty("--home-skeleton-contract-surface-muted", skeletonContractCssValue(normalized.tokens.surfaceMuted, "var(--home-surface-muted)"));
	    node.style.setProperty("--home-skeleton-contract-primary", skeletonContractCssValue(normalized.tokens.primaryColor, "var(--home-primary)"));
	    node.style.setProperty("--home-skeleton-contract-primary-strong", skeletonContractCssValue(normalized.tokens.primaryStrong, "var(--home-primary-strong)"));
	    node.style.setProperty("--home-skeleton-contract-accent", skeletonContractCssValue(normalized.tokens.accentColor, "var(--home-accent)"));
	  }

  function skeletonSectionChrome(section = {}, designContract = {}) {
    const contract = normalizeSkeletonDesignContract(designContract, SKELETON_STYLE_CONTRACTS.accountOpsConsole);
    const policy = contract.chromePolicy || {};
    const sectionId = cleanMetaText(section.id, "", 64);
    if (sectionId && policy.sectionOverrides?.[sectionId]) return normalizeSkeletonSectionChrome(policy.sectionOverrides[sectionId]);
    if (section.type === "hero") return "hero";
    if (section.type === "full" && policy.mode === "workbench") return "workbench";
    if (policy.mode === "flatConnected") return "connected";
    if (policy.mode === "sectionBand" || policy.mode === "heroProof") return "band";
    return normalizeSkeletonSectionChrome(policy.sectionChrome, "group");
  }

  function skeletonSlotChrome(slotId, config = {}, section = {}, designContract = {}) {
    const key = skeletonSlotKey(slotId);
    const contract = normalizeSkeletonDesignContract(designContract, SKELETON_STYLE_CONTRACTS.accountOpsConsole);
    const policy = contract.chromePolicy || {};
    if (key && policy.slotOverrides?.[key]) return normalizeSkeletonSlotChrome(policy.slotOverrides[key]);
    if (["trading_accounts_list", "trading_account_highlight", "wallet_list", "copytrading_signals", "pamm_products"].includes(key)) return "tableSurface";
    if (["risk_disclosure", "risk_notice"].includes(key)) return "legalStrip";
    if (["support_contact", "app_download", "referral_link_card", "kyc_status_card"].includes(key) || section.type === "rail") return "rail";
    if (section.type === "hero" || key === config.heroFocus || ["promo_banner", "ad_carousel"].includes(key)) return "featured";
    if (policy.mode === "flatConnected" || policy.mode === "sectionBand") return normalizeSkeletonSlotChrome(policy.defaultSlotChrome, "flat");
    if (policy.mode === "workbench") return normalizeSkeletonSlotChrome(policy.defaultSlotChrome, "tableSurface");
    return normalizeSkeletonSlotChrome(policy.defaultSlotChrome, "contained");
  }

  function normalizeSectionTransition(value, fallback = "") {
    const raw = cleanMetaText(value, "", 24);
    return ["connected", "soft-break", "hard-break", "workbench", "plain"].includes(raw) ? raw : fallback;
  }

  function skeletonSectionTransition(section = {}, sectionChrome = "", index = 0, designContract = {}) {
    const explicit = normalizeSectionTransition(section.transition);
    if (explicit) return explicit;
    const contract = normalizeSkeletonDesignContract(designContract, SKELETON_STYLE_CONTRACTS.accountOpsConsole);
    const sectionId = cleanMetaText(section.id, "", 64);
    if (/risk|disclosure|footer|copytrading|referral|faq|performance/i.test(sectionId) && index > 0) return "hard-break";
    if (sectionChrome === "connected") return "connected";
    if (sectionChrome === "workbench") return "workbench";
    if (sectionChrome === "band" && contract.chromePolicy?.mode === "sectionBand") return index <= 3 ? "connected" : "hard-break";
    return index === 0 ? "plain" : "soft-break";
  }

  function buildSkeletonHtmlMarkup(sections, slots, designContract = {}) {
    const contract = normalizeSkeletonDesignContract(designContract, SKELETON_STYLE_CONTRACTS.accountOpsConsole);
    const slotByKey = Object.fromEntries(slots.map((slot) => [slot.id, slot]));
    return `
      <section class="home-skeleton-html-page" data-home-skeleton-root data-home-skeleton-contract="${escapeHtml(contract.id)}" data-home-skeleton-chrome-mode="${escapeHtml(contract.chromePolicy.mode)}" data-home-skeleton-component-boundary="${escapeHtml(contract.chromePolicy.componentBoundary)}" data-home-skeleton-personality="${escapeHtml(contract.personality)}" data-home-skeleton-density="${escapeHtml(contract.density)}">
        <header class="home-skeleton-top">
          <span>${escapeHtml(contract.label)}</span>
          <strong>整页骨架 HTML</strong>
          <small>${escapeHtml(contract.narrative)} 此层先声明统一风格契约、外壳策略、section 与 slot，再按 slot 填充模块内容。</small>
        </header>
        <main class="home-skeleton-flow">
          ${sections
            .map((section, sectionIndex) => {
              const sectionSlots = (section.slots || []).map((slot) => slotByKey[skeletonSlotKey(slot)]).filter(Boolean);
              if (!sectionSlots.length) return "";
              const sectionChrome = skeletonSectionChrome(section, contract);
              const sectionTransition = skeletonSectionTransition(section, sectionChrome, sectionIndex, contract);
              return `
                <section class="home-skeleton-section ${skeletonSectionClass(section.type)}" data-home-skeleton-section="${escapeHtml(section.id || `section-${sectionIndex + 1}`)}" data-home-skeleton-section-type="${escapeHtml(section.type || "full")}" data-home-skeleton-section-chrome="${escapeHtml(sectionChrome)}" data-home-skeleton-section-transition="${escapeHtml(sectionTransition)}">
                  <header class="home-skeleton-section-head">
                    <span>${escapeHtml(sectionChrome)}</span>
                    <strong>${escapeHtml(section.title || `Section ${sectionIndex + 1}`)}</strong>
                  </header>
                  <div class="home-skeleton-slot-grid" data-home-skeleton-section-slots>
                    ${sectionSlots
                      .map((slot, slotIndex) => {
                        const slotContract = slot.layoutContract || homeGridContractForSize(slot.size || "3x1");
                        const desktopSpan = Math.min(HOME_GRID_COLUMNS, Math.max(1, Number(slotContract.desktopSpan) || 12));
                        const rowSpan = Math.max(1, Number(slotContract.rowSpan) || 1);
                        return `
                          <article class="home-skeleton-slot" data-home-skeleton-slot="${escapeHtml(slot.id)}" data-home-skeleton-module="${escapeHtml(slot.moduleId)}" data-home-skeleton-variant="${escapeHtml(slot.variant)}" data-home-skeleton-chrome="${escapeHtml(slot.chrome || contract.chromePolicy.defaultSlotChrome)}" data-home-skeleton-slot-index="${slotIndex}" data-home-skeleton-size="${escapeHtml(slot.size || "3x1")}" data-home-skeleton-grid-columns="${HOME_GRID_COLUMNS}" data-home-skeleton-slot-span="${desktopSpan}" style="--home-skeleton-slot-span:${desktopSpan};--home-skeleton-row-span:${rowSpan};">
                            <div class="home-skeleton-placeholder" data-home-skeleton-placeholder>
                              <span>slot ${String(slotIndex + 1).padStart(2, "0")}</span>
                              <strong>${escapeHtml(slot.label)}</strong>
                              <small>${escapeHtml(slot.id)} · ${desktopSpan}/12 栏 · ${escapeHtml(slot.chrome || "contained")} · 等待填充</small>
                            </div>
                          </article>
                        `;
                      })
                      .join("")}
                  </div>
                </section>
              `;
            })
            .join("")}
        </main>
      </section>
    `;
  }

  function buildSkeletonHtmlScheme(config, options = {}) {
    const normalized = config?.sections && config?.layout ? config : normalizeConfig(config);
    const designContract = normalizeSkeletonDesignContract(options.designContract, buildSkeletonDesignContract(normalized));
    const sections = (Array.isArray(normalized.sections) ? normalized.sections : [])
      .map((section) => ({
        ...section,
        slots: expandSlots(section.slots || [], normalized),
      }))
      .filter((section) => section.slots.length);
    const slots = sections.flatMap((section) => (section.slots || []).map((slot, index) => skeletonSlotRecord(slot, normalized, section, index, designContract)));
    return normalizeSkeletonHtmlScheme(
      {
        enabled: true,
        name: cleanMetaText(options.name || `${normalized.name || "AI 首页"}骨架填充`, "骨架 HTML 填充", 56),
        summary: cleanMetaText(options.reason || "先生成整页骨架 HTML，再按 slot 填充模块内容。", "骨架 HTML 填充", 220),
        sourceType: cleanMetaText(options.sourceType, "local-skeleton", 48),
        generatedAt: new Date().toISOString(),
        status: normalizeSkeletonStatus(options.status, "pending-fill"),
        designContract,
        slots,
        skeletonHtml: buildSkeletonHtmlMarkup(sections, slots, designContract),
        slotComponents: options.slotComponents && typeof options.slotComponents === "object" ? options.slotComponents : {},
        slotRegenerationLog: Array.isArray(options.slotRegenerationLog) ? options.slotRegenerationLog : [],
      },
      true,
    );
  }

  function normalizeSkeletonHtmlScheme(source, enabled = false) {
    const scheme = source && typeof source === "object" ? source : {};
    const slotComponents = normalizeSkeletonSlotComponents(scheme.slotComponents);
    const slots = (Array.isArray(scheme.slots) ? scheme.slots : [])
      .map((item, index) => {
        const id = skeletonSlotKey(item?.id || item?.slot);
        if (!id) return null;
        const component = slotComponents[id];
        const locked = Boolean(item.locked || component?.locked);
        const status = locked ? "locked" : component?.html ? "filled" : normalizeSkeletonStatus(item.status);
        const sectionType = cleanMetaText(item.sectionType, "full", 24);
        const size = cleanMetaText(item.size || skeletonSlotSizeForGrid(id, { type: sectionType }), "2x1", 12);
        return {
          id,
          slot: id,
          label: cleanMetaText(item.label || featureLabel(id), id, 80),
          sectionId: cleanMetaText(item.sectionId, "", 64),
          sectionTitle: cleanMetaText(item.sectionTitle, "", 80),
          sectionType,
          moduleId: cleanMetaText(item.moduleId, "", 80),
          variant: cleanMetaText(item.variant, "", 80),
          morph: cleanMetaText(item.morph || item.morphId, "", 80),
          size,
          layoutContract: homeGridContractForSize(size, { slot: id, zone: sectionType, sectionType }),
          chrome: normalizeSkeletonSlotChrome(item.chrome || item.slotChrome, "contained"),
          status,
          filledAt: cleanMetaText(item.filledAt, "", 48),
          componentId: cleanMetaText(item.componentId || component?.id, "", 90),
          locked,
          index: Number.isFinite(Number(item.index)) ? Number(item.index) : index,
        };
      })
      .filter(Boolean)
      .slice(0, 32);
    const skeletonHtml = sanitizeAiHtmlMarkup(scheme.skeletonHtml || scheme.html);
    const filledCount = slots.filter((slot) => ["filled", "locked", "final"].includes(slot.status)).length;
    const schemeStatus = normalizeSkeletonStatus(
      scheme.status,
      slots.length && filledCount >= slots.length ? "review" : filledCount > 0 ? "filled" : "pending-fill",
    );
    return {
      enabled: Boolean(enabled || scheme.enabled) && Boolean(skeletonHtml || slots.length),
      name: cleanMetaText(scheme.name, "骨架 HTML 填充", 56),
      summary: cleanMetaText(scheme.summary, "先生成整页骨架 HTML，再按 slot 填充模块内容。", 220),
      sourceType: cleanMetaText(scheme.sourceType, "local-skeleton", 48),
      generatedAt: cleanMetaText(scheme.generatedAt, "", 48),
      status: schemeStatus,
      designContract: normalizeSkeletonDesignContract(scheme.designContract || scheme.styleContract, SKELETON_STYLE_CONTRACTS.accountOpsConsole),
      skeletonHtml,
      slots,
      slotComponents,
      slotRegenerationLog: (Array.isArray(scheme.slotRegenerationLog) ? scheme.slotRegenerationLog : [])
        .map((item) => ({
          slot: skeletonSlotKey(item?.slot),
          label: cleanMetaText(item?.label, "", 80),
          action: cleanMetaText(item?.action, "", 32),
          moduleId: cleanMetaText(item?.moduleId, "", 80),
          variant: cleanMetaText(item?.variant, "", 80),
          at: cleanMetaText(item?.at, "", 48),
        }))
        .filter((item) => item.slot)
        .slice(0, 20),
    };
  }

		  const STRONG_ONBOARDING_SIGNALS = [
	    "新手",
	    "新客",
	    "新用户",
	    "刚注册",
	    "开户链接",
	    "开户注册",
	    "开户引导",
	    "开户路径",
	    "开户流程",
		    "账户开通",
		    "开通进度",
		    "已注册未开户",
		    "新访客",
		    "创建真实账户",
		    "开真实账户",
		    "真实账户开户",
		    "立即开户",
		    "创建账户",
		    "首次入金",
		    "kyc",
	    "未实名",
	    "未完成实名",
	    "三步",
	    "三步旅程",
	    "onboarding",
	    "onboarding journey",
	  ];
	  const REFERRAL_LINK_SIGNALS = ["推广链接", "邀请链接", "开户链接", "注册链接", "邀请码", "代理", "渠道", "ib", "referral", "partner", "affiliate"];
	  const DEPOSIT_CONVERSION_SIGNALS = [
	    "入金转化",
	    "入金奖励",
	    "入金奖励阶梯",
	    "入金阶梯",
	    "立即入金",
	    "推动首次入金",
	    "首次入金转化",
	    "data-home-action=deposit",
	    "首存",
	    "首存奖励",
	    "充值",
	    "首充",
	    "首充奖励",
	    "赠金",
	    "赠金梯度",
	    "存款奖励",
	    "deposit bonus",
	    "deposit ladder",
	    "deposit conversion",
	  ];
	  const PAGE_GOAL_DEPOSIT_PATTERNS = [
	    /页面目标.{0,32}(?:推动|完成|促进|引导).{0,12}(?:首次)?入金/i,
	    /全页主\s*CTA.{0,24}(?:立即)?入金/i,
	    /主\s*CTA.{0,24}(?:立即)?入金/i,
	    /data-home-action\s*=\s*["']?deposit["']?/i,
	    /primary\s*cta.{0,24}deposit/i,
	  ];

	  function hasStrongOnboardingIntent(text) {
	    const source = String(text || "");
	    const nonKycSignals = STRONG_ONBOARDING_SIGNALS.filter((signal) => signal !== "kyc");
	    const hasNonKycSignal = includesAny(source, nonKycSignals);
	    const hasKycJourneySignal =
	      includesAny(source, ["kyc"]) &&
	      includesAny(source, ["开户引导", "开户路径", "开户流程", "开户注册", "账户开通", "开通进度", "创建真实账户", "创建账户", "首次入金", "新手", "新客", "新用户", "onboarding"]);
	    if (!hasNonKycSignal && !hasKycJourneySignal) return false;
	    const referralOnly =
	      includesAny(source, REFERRAL_LINK_SIGNALS) &&
	      !includesAny(source, ["新手", "新客", "新用户", "刚注册", "开户注册", "开户引导", "开户路径", "开户流程", "账户开通", "开通进度", "创建真实账户", "创建账户", "未实名", "未完成实名", "三步", "三步旅程", "onboarding"]);
	    return !referralOnly;
	  }

	  function hasExplicitDepositConversionIntent(text) {
	    const source = String(text || "");
	    return includesAny(source, DEPOSIT_CONVERSION_SIGNALS) || PAGE_GOAL_DEPOSIT_PATTERNS.some((pattern) => pattern.test(source));
	  }

	  function brickById(id) {
	    return HOME_BRICKS.find((brick) => brick.id === id) || null;
	  }

	  function inferBrickIntent(prompt) {
	    const text = positiveIntentText(dominantPromptText(prompt));
	    const strongAssetIntent = includesAny(text, ["资产管理", "总资产", "多币种", "钱包列表", "资产配置", "可用资金", "保证金占用", "风险等级", "账户资产", "账号资产"]);
	    const brandTrustIntent = includesAny(text, ["白标", "品牌可信", "品牌露出", "成熟券商", "资金安全", "资金可信", "隔离资金"]);
		    const explicitNewUserIntent = hasStrongOnboardingIntent(text);
		    const explicitDepositIntent = hasExplicitDepositConversionIntent(text);
		    const copytradingIntent = includesAny(text, ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐"]);
		    const tradingCostIntent = wantsTradingCostWorkbenchPrompt(prompt);

		    if (explicitDepositIntent) return "deposit";
		    if (copytradingIntent && explicitNewUserIntent) return "onboarding";
		    if (copytradingIntent) return "copytrading";
		    if (explicitNewUserIntent) return "onboarding";
		    if (includesAny(text, ["ib", "代理", "渠道", "邀请", "推荐好友", "裂变", "开户链接"])) return "partner";
		    if (brandTrustIntent && !explicitNewUserIntent) return "brand";
		    if (hasStrongOnboardingIntent(text) || includesAny(text, ["新手", "新客", "开户", "注册", "开户表单", "创建账户", "账户开通", "开通进度"])) return "onboarding";
	    if (includesAny(text, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) return "vip";
	    if (includesAny(text, ["数据洞察", "洞察首页", "账户健康", "健康度", "资金流向", "交易习惯", "分析首页"])) return "insight";
	    if (includesAny(text, ["风险提醒", "风控", "保证金状态", "持仓提醒", "资金保护", "风险保护"])) return "risk";
	    if (includesAny(text, ["留存", "召回", "沉睡", "唤醒", "重新开始交易"])) return "retention";
	    if (includesAny(text, ["移动端", "手机", "单列", "少滚动", "移动优先"])) return "mobile";
	    if (includesAny(text, ["白标", "品牌可信", "品牌露出", "成熟券商", "客户经理服务"])) return "brand";
	    if (includesAny(text, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化", "推广", "广告", "轮播", "banner"])) return "growth";
	    if (tradingCostIntent || includesAny(text, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账号首屏", "账户首屏", "账号表现", "账户表现", "净值曲线", "权益曲线", "pnl", "点差", "佣金", "执行效率", "交易成本", "eurusd"])) return "trader";
	    if (strongAssetIntent) return "asset";
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

	  function wantsAccountPerformanceLinePrompt(text) {
	    const source = positiveIntentText(String(text || ""));
	    return (
	      includesAny(source, ["账号表现", "账户表现", "账号净值", "账户净值", "净值曲线", "权益曲线", "账号盈亏", "账户盈亏", "交易图表"]) ||
	      (includesAny(source, ["7日", "7 日", "30日", "30 日", "7d", "30d"]) && includesAny(source, ["账号", "账户"]) && includesAny(source, ["净值", "权益", "pnl", "盈亏", "走势", "曲线"]))
	    );
	  }

			  function applyPromptBrickOverrides(ids, prompt) {
			    const text = positiveIntentText(dominantPromptText(prompt));
			    const targetIntent = inferBrickIntent(prompt);
		    const wantsAssetManagement = targetIntent === "asset";
	    const strongOnboardingIntent = hasStrongOnboardingIntent(text);
	    const explicitDepositIntent = hasExplicitDepositConversionIntent(text);
	    const rejectsRisk = rejectsPromptConcept(prompt, ["风险提示", "风险披露", "合规声明", "风险提醒", "风控", "风险保护", "kyc"]);
	    const rejectsSupport = rejectsPromptConcept(prompt, ["客服帮助", "客服", "在线客服", "联系客服", "帮助中心"]);
		    let next = ids.slice();

    if (wantsAssetManagement) {
      next = removeBrickFamily(next, ["AssetOverview", "FundActions", "PromotionBanner", "ReferralLink", "OnboardingProgress", "OpenAccount", "CreateAccountForm"]);
      next = addBrickId(next, "assetOverview.tickerStrip", "front");
      next = addBrickId(next, "quickActions.taskRail");
      next = addBrickId(next, "walletList.currencyTable");
      next = addBrickId(next, "accountPerformance.proChart");
      next = addBrickId(next, "riskDisclosure.marginGuard");
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

	    if (includesAny(text, ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐"])) {
	      next = removeBrickFamily(next, ["CopytradingSignals"]);
	      next = addBrickId(next, "copytradingSignals.curveCards", "front");
	    }

    if (!rejectsRisk && includesAny(text, ["风险提示", "风险披露", "合规声明", "保证金状态", "持仓提醒", "杠杆", "爆仓", "预警"])) {
      next = addBrickId(next, "riskDisclosure.marginGuard");
    }

    if (includesAny(text, ["faq", "常见问题", "问题解答", "帮助中心"])) {
      next = addBrickId(next, "faqSection.topQuestions");
    }

    if (!rejectsSupport && includesAny(text, ["在线客服", "联系客服", "客户经理", "一对一协助", "咨询入口", "服务入口"])) {
      next = addBrickId(next, "supportContact.serviceCard");
    }

    if (includesAny(text, ["app下载", "app 下载", "下载 app", "下载APP", "移动端", "手机端", "mt5 下载", "下载 mt5", "download app"])) {
      next = addBrickId(next, "appDownload.qrCard");
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

		    if (wantsAccountPerformanceLinePrompt(text)) {
		      next = addBrickId(next, "accountPerformance.proChart", "front");
		    }

	    if (includesAny(text, ["数据洞察", "账户健康", "健康度", "资金流向", "交易习惯", "分析首页"])) {
	      next = removeBrickFamily(next, ["PromotionBanner", "ReferralLink", "OnboardingProgress", "OpenAccount", "CreateAccountForm"]);
	      next = addBrickId(next, "accountPerformance.proChart", "front");
	      next = addBrickId(next, "marketInsight.healthPanel");
	      next = addBrickId(next, "riskDisclosure.marginGuard");
	    }

	    if (!rejectsRisk && includesAny(text, ["风险提醒", "风控", "保证金状态", "持仓提醒", "资金保护", "风险保护"])) {
	      next = removeBrickFamily(next, ["PromotionBanner", "ReferralLink", "OnboardingProgress", "OpenAccount", "CreateAccountForm"]);
	      next = addBrickId(next, "accountPerformance.proChart", "front");
	      next = addBrickId(next, "riskDisclosure.marginGuard");
	      next = addBrickId(next, "marketInsight.healthPanel");
	      if (!rejectsSupport) next = addBrickId(next, "supportContact.serviceCard");
	    }

		    if (explicitDepositIntent && !strongOnboardingIntent) {
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
    copytrading: ["onboardingJourney", "tradingCommand", "accountOpsConsole"],
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
    if (includesAny(text, ["入金奖励阶梯", "赠金梯度", "deposit bonus ladder"])) return DESIGN_GENOMES.depositLadder;
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
	      next = addBrickId(next, "riskDisclosure.marginGuard");
    }

    if (genome?.id === "accountOpsConsole" && includesAny(text, ["资产", "钱包", "多币种", "运营", "管理"])) {
	      next = addBrickId(next, "riskDisclosure.marginGuard");
    }

    return next;
  }

	  function applyBrickPlanVariant(plan, intent, variant) {
		    const mode = variantMode(variant);
		    if (!mode) return plan;

	    if (intent === "trader" && mode === 1) {
	      const next = plan.map((item) => {
	        if (item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.compactMenu", "main", "把高频入口压缩成短菜单，和账号状态形成不同首屏节奏。");
	        }
	        if (item.feature === "accountPerformance" || item.component === "account_performance") {
	          return brickPlanItemWithBrick(item, "accountPerformance.proChart", "hero", "本轮先用账号表现趋势图建立交易状态。");
	        }
	        if (item.feature === "tradingAccounts" || item.component === "account_list") {
	          return brickPlanItemWithBrick(item, "tradingAccounts.cardProof", "full", "交易账号改为合并卡片墙，区别于双列表方案。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["accountPerformance", "quickActions", "tradingAccounts", "risk_disclosure", "faq_section", "balanceTotal"]), {
	        accountPerformance: "hero",
	        quickActions: "main",
	        tradingAccounts: "full",
	        risk_disclosure: "full",
	        faq_section: "full",
	        balanceTotal: "rail",
	      });
	    }

	    if (intent === "trader" && mode === 2) {
	      const next = plan.map((item) => {
	        if (item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.segmentedPanel", "hero", "本轮把 MT5、持仓和订单入口做成分段面板。");
	        }
	        if (item.feature === "accountPerformance" || item.component === "account_performance") {
	          return brickPlanItemWithBrick(item, "accountPerformance.sparklineBoard", "full", "趋势指标回到整横栏指挥看板。");
	        }
	        if (item.feature === "tradingAccounts" || item.component === "account_list") {
	          return brickPlanItemWithBrick(item, "tradingAccounts.separatedList", "full", "真实与模拟账号恢复双列表，形成排查型结构。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["quickActions", "tradingAccounts", "accountPerformance", "risk_disclosure", "faq_section", "balanceTotal"]), {
	        quickActions: "hero",
	        tradingAccounts: "full",
	        accountPerformance: "full",
	        risk_disclosure: "full",
	        faq_section: "rail",
	        balanceTotal: "rail",
	      });
	    }

	    if (intent === "asset" && mode === 1) {
	      return applyBrickPlanZones(sortBrickPlanByFeature(plan, ["accountPerformance", "risk_disclosure", "balanceTotal", "quickActions", "walletList", "tradingAccounts"]), {
	        accountPerformance: "hero",
        risk_disclosure: "rail",
        balanceTotal: "main",
        quickActions: "rail",
        walletList: "full",
        tradingAccounts: "full",
      });
    }

    if (intent === "asset" && mode === 2) {
      return applyBrickPlanZones(sortBrickPlanByFeature(plan, ["walletList", "balanceTotal", "quickActions", "accountPerformance", "risk_disclosure", "tradingAccounts"]), {
        walletList: "full",
        balanceTotal: "main",
        quickActions: "rail",
        accountPerformance: "main",
        risk_disclosure: "rail",
        tradingAccounts: "full",
		      });
		    }

	    if (intent === "deposit" && mode === 1) {
	      const next = plan.map((item) => {
	        if (item.feature === "quick_actions" || item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.accentCards", "main", "入金动作改成强调入口卡，区别于任务轨道。");
	        }
	        if (item.feature === "trading_account_highlight" || item.feature === "accountPerformance" || item.component === "trading_account_highlight" || item.component === "account_performance") {
	          return brickPlanItemWithBrick(item, "accountPerformance.proChart", "full", "账号趋势下移成转化后的证明模块。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["promo_banner", "asset_overview", "onboarding_guide", "quick_actions", "trading_account_highlight", "trading_accounts_list"]), {
	        promo_banner: "hero",
	        asset_overview: "hero",
	        onboarding_guide: "main",
	        quick_actions: "main",
	        trading_account_highlight: "full",
	        trading_accounts_list: "full",
	      });
	    }

	    if (intent === "deposit" && mode === 2) {
	      const next = plan.map((item) => {
	        if (item.feature === "quick_actions" || item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.segmentedPanel", "main", "快捷入口按资金、交易、推广分段，首屏更聚焦奖励阶梯。");
	        }
	        if (item.feature === "trading_accounts_list" || item.feature === "tradingAccounts" || item.component === "trading_accounts_list" || item.component === "account_list") {
	          return brickPlanItemWithBrick(item, "tradingAccounts.separatedList", "full", "账号证明改为真实/模拟双列表承接。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["promo_banner", "onboarding_guide", "asset_overview", "quick_actions", "trading_account_highlight", "trading_accounts_list"]), {
	        promo_banner: "hero",
	        onboarding_guide: "main",
	        asset_overview: "hero",
	        quick_actions: "main",
	        trading_account_highlight: "full",
	        trading_accounts_list: "full",
	      });
	    }

	    if (intent === "growth" && mode === 1) {
	      const next = plan.map((item) => {
	        if (item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.accentCards", "main", "活动入口用强调卡承接报名和入金。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["adCarousel", "promoHighlight", "quickActions", "tradingAccounts", "fundActions", "balanceTotal"]), {
	        adCarousel: "hero",
	        promoHighlight: "main",
	        quickActions: "main",
	        tradingAccounts: "full",
	        fundActions: "rail",
	        balanceTotal: "rail",
	      });
	    }

	    if (intent === "growth" && mode === 2) {
	      const next = plan.map((item) => {
	        if (item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.tileBoard", "main", "快捷入口改成磁贴板，减少活动封面同质感。");
	        }
	        if (item.feature === "tradingAccounts" || item.component === "account_list") {
	          return brickPlanItemWithBrick(item, "tradingAccounts.separatedList", "full", "账号证明改成列表承接活动参与资格。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["promoHighlight", "adCarousel", "quickActions", "balanceTotal", "tradingAccounts", "fundActions"]), {
	        promoHighlight: "hero",
	        adCarousel: "full",
	        quickActions: "main",
	        balanceTotal: "rail",
	        tradingAccounts: "full",
	        fundActions: "rail",
	      });
	    }

	    if (intent === "partner" && mode === 1) {
	      const next = plan.map((item) => {
	        if (item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.tileBoard", "main", "渠道操作改成磁贴板，区分推广链接主模块。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["referral_link_card", "quickActions", "promoHighlight", "balanceTotal", "tradingAccounts"]), {
	        referral_link_card: "hero",
	        quickActions: "main",
	        promoHighlight: "main",
	        balanceTotal: "rail",
	        tradingAccounts: "full",
	      });
	    }

	    if (intent === "partner" && mode === 2) {
	      const next = plan.map((item) => {
	        if (item.feature === "quickActions" || item.component === "quick_actions") {
	          return brickPlanItemWithBrick(item, "quickActions.accentCards", "main", "渠道入口用强调卡突出开户链接和素材下载。");
	        }
	        if (item.feature === "tradingAccounts" || item.component === "account_list") {
	          return brickPlanItemWithBrick(item, "tradingAccounts.separatedList", "full", "账号转化改为列表，便于扫描注册后的账号状态。");
	        }
	        return item;
	      });
	      return applyBrickPlanZones(sortBrickPlanByFeature(next, ["balanceTotal", "referral_link_card", "quickActions", "promoHighlight", "tradingAccounts"]), {
	        balanceTotal: "hero",
	        referral_link_card: "rail",
	        quickActions: "main",
	        promoHighlight: "main",
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
    if (intent !== "deposit" && !selected.some((brick) => brick.family === "FundActions") && !isCampaignCorePrompt(prompt, intent)) {
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
    const rawReferralRequest = /推广链接|推广功能|邀请链接|邀请码|开户链接|注册链接|referral|invite code|referral link/i.test(source);
    return (
      hasIbIdentity ||
      rawReferralRequest ||
      includesAny(text, ["代理用户", "代理首页", "合作伙伴", "partner", "affiliate", "agent", "推广链接", "推广功能", "邀请链接", "邀请码", "开户链接", "注册链接", "referral", "invite code", "referral link"])
    );
  }

  function wantsKycStatusCardPrompt(prompt) {
    const source = String(prompt || "");
    return /CRM 账户 KYC 状态|KYC 状态|kyc_status_card|account_kyc_status|kycStatus\.current|kyc\s*status|未提交|待审|待审核|审核中|通过|拒绝|未通过/i.test(source);
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
    if (!includesAny(text, ["机构灰"]) && includesAny(text, ["黑金", "高净值", "vip", "尊贵", "机构", "大客户"])) return "blackGold";
    if (includesAny(text, ["淡金", "浅金", "轻金", "香槟金", "金色", "金色调", "gold"])) return "lightGold";
    if (includesAny(text, ["翡翠", "信任绿", "资金安全绿", "emerald"])) return "emeraldTrust";
    if (includesAny(text, ["钴蓝", "青绿", "青蓝科技", "teal", "cobalt"])) return "cobaltTeal";
    if (includesAny(text, ["赤红", "红色活动", "红橙", "crimson"])) return "crimsonPromo";
    if (includesAny(text, ["石墨", "银色", "机构灰", "graphite", "silver"])) return "graphiteSilver";
    if (includesAny(text, ["淡蓝", "浅蓝", "蓝色金融", "light blue"])) return "blueFinance";
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
    const normalized = String(size || "").trim().toLowerCase().replace(/[×*]/g, "x");
    const match = normalized.match(/^([1-9]\d?)x([1-9]\d?)$/);
    if (!match) return 0;
    const columns = Number(match[1]);
    if (columns >= 3) return 12;
    if (columns === 2) return 8;
    if (columns === 1) return 4;
    return 0;
  }

  function rowUnitsFromBrickSize(size) {
    const match = String(size || "").trim().toLowerCase().replace(/[×*]/g, "x").match(/^[1-9]\d?x([1-9]\d?)$/);
    return match ? Number(match[1]) || 1 : 1;
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

  function preferredLargeFullRowBrickId(component, currentBrickId = "") {
    const current = String(currentBrickId || "");
    if (current && brickById(current)) return current;
    if (component === "trading_accounts_list") return "tradingAccounts.separatedList";
    if (component === "trading_account_highlight") return "accountPerformance.proChart";
    if (component === "wallet_list") return "walletList.tiles";
    if (component === "promo_banner") return "promoBanner.scoreboard";
    if (component === "copytrading_signals") return "copytradingSignals.curveCards";
    if (component === "onboarding_guide") return "onboardingProgress.missionBoard";
    return "";
  }

  function enforceLargeFullRowLayoutBlock(block) {
    const component = canonicalHomeBlock(block.component) || block.component;
    const size = largeFullRowHomeBlockSize(component);
    if (!size) return block;
    const reason = largeFullRowHomeBlockReason(component);
    const brick = brickById(preferredLargeFullRowBrickId(component, block.brickId));
    return {
      ...block,
      component,
      slot: "full",
      brickId: brick?.id || block.brickId,
      brickName: brick?.name || block.brickName,
      brickFamily: brick?.family || block.brickFamily,
      brickSize: size,
      brickZone: "full",
      brickReason: block.brickReason || reason,
    };
  }

  function enforceLargeFullRowBrickPlanItem(item) {
    const component = canonicalHomeBlock(item.component || item.feature) || item.component || item.feature;
    const size = largeFullRowHomeBlockSize(component);
    if (!size) return item;
    const reason = largeFullRowHomeBlockReason(component);
    const brick = brickById(preferredLargeFullRowBrickId(component, item.brickId));
    return {
      ...item,
      brickId: brick?.id || item.brickId,
      brickName: brick?.name || item.brickName,
      family: brick?.family || item.family,
      feature: component,
      component,
      size,
      zone: "full",
      reason: item.reason || reason,
    };
  }

  function enforceLayoutBlockGeometry(block, moduleSettings) {
    const component = block.component;
    const size = String(block.brickSize || "").toLowerCase();
    const quickCount = Number(moduleSettings?.quickActions?.count || 0);

    if (component === "account_list" || component === "trading_accounts_list") {
      if (accountListNeedsFullRow(moduleSettings)) {
        return layoutBlockWithBrick(block, "tradingAccounts.separatedList", "full", "账号分区或列表视图强制整行，避免表格压缩和侧栏留白。");
      }

      if (/^1x/.test(size) || block.slot === "rail") {
        return layoutBlockWithBrick(block, "tradingAccounts.cardProof", "full", "账号卡片至少使用整横栏，避免挤入窄侧栏。");
      }
    }

    if (component === "wallet_list") {
      const walletBrick = block.brickId === "walletList.tiles" ? "walletList.tiles" : "walletList.currencyTable";
      return layoutBlockWithBrick(block, walletBrick, "full", "钱包列表属于多币种内容，强制整行展示。");
    }

    if (component === "account_performance" || component === "trading_account_highlight") {
      const isCostBoard = String(block.brickId || "").includes("costBoard");
      if (block.slot !== "full" || spanFromBrickSize(size) < 12) {
        return isCostBoard
          ? {
              ...block,
              slot: "full",
              brickSize: "3x2",
              brickZone: "full",
              brickReason: block.brickReason || "账号表现/交易成本图表属于大模块，独占整横栏提升趋势展示体验。",
            }
          : layoutBlockWithBrick(block, "accountPerformance.proChart", "full", "账号表现图表属于大模块，独占整横栏展示账号上下文、趋势和指标。");
      }
    }

    if (component === "quick_actions" && quickCount >= 8 && (/^1x/.test(size) || block.slot === "rail")) {
      return layoutBlockWithBrick(block, "quickActions.priorityMatrix", "main", "8 个快捷入口使用主栏矩阵，避免侧栏拥挤。");
    }

    if (component === "ad_carousel" && (/^1x/.test(size) || block.slot === "rail")) {
      return layoutBlockWithBrick(block, "adCarousel.heroCampaign", "hero", "广告轮播至少使用主视觉宽度，避免侧栏裁切。");
    }

    if (isLargeFullRowHomeBlock(component) && (block.slot !== "full" || spanFromBrickSize(size) < 12)) {
      return enforceLargeFullRowLayoutBlock(block);
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

      if (item.component === "account_list" || item.component === "trading_accounts_list") {
        if (accountListNeedsFullRow(moduleSettings)) {
          return brickPlanItemWithBrick(item, "tradingAccounts.separatedList", "full", "账号分区或列表视图强制整行，避免表格压缩和侧栏留白。");
        }

        if (/^1x/.test(size) || item.zone === "rail") {
          return brickPlanItemWithBrick(item, "tradingAccounts.cardProof", "full", "账号卡片至少使用整横栏，避免挤入窄侧栏。");
        }
      }

      if (item.component === "wallet_list") {
        const walletBrick = item.brickId === "walletList.tiles" ? "walletList.tiles" : "walletList.currencyTable";
        return brickPlanItemWithBrick(item, walletBrick, "full", "钱包列表属于多币种内容，强制整行展示。");
      }

      if (item.component === "account_performance" || item.component === "trading_account_highlight") {
        if (item.zone !== "full" || spanFromBrickSize(size) < 12) {
          return String(item.brickId || "").includes("costBoard")
            ? {
                ...item,
                size: "3x2",
                zone: "full",
                reason: item.reason || "账号表现/交易成本图表属于大模块，独占整横栏提升趋势展示体验。",
              }
            : brickPlanItemWithBrick(item, "accountPerformance.proChart", "full", "账号表现图表属于大模块，独占整横栏展示账号上下文、趋势和指标。");
        }
      }

      if (item.component === "quick_actions" && quickCount >= 8 && (/^1x/.test(size) || item.zone === "rail")) {
        return brickPlanItemWithBrick(item, "quickActions.priorityMatrix", "main", "8 个快捷入口使用主栏矩阵，避免侧栏拥挤。");
      }

      if (item.component === "ad_carousel" && (/^1x/.test(size) || item.zone === "rail")) {
        return brickPlanItemWithBrick(item, "adCarousel.heroCampaign", "hero", "广告轮播至少使用主视觉宽度，避免侧栏裁切。");
      }

      if (item.component === "account_performance" && /^1x/.test(size)) {
        return brickPlanItemWithBrick(item, "accountPerformance.proChart", "full", "账号表现图表属于大模块，至少使用整横栏承载趋势信息。");
      }

      if (isLargeFullRowHomeBlock(item.component || item.feature) && (item.zone !== "full" || spanFromBrickSize(size) < 12)) {
        return enforceLargeFullRowBrickPlanItem(item);
      }

      return item;
    });
  }

  function isWidePairableHomeBlock(id) {
    const component = canonicalHomeBlock(id) || String(id || "").trim();
    return WIDE_PAIRABLE_HOME_BLOCKS.has(component);
  }

  function layoutSpanForBlock(block, heroBlockCount = 0) {
    if (block.component === "welcome_header") return 12;
    // Wide-pairable blocks default to 8 so they can pair with a 4-col compact
    // companion; when left unpaired they still flush to a full 12-col row.
    if (isWidePairableHomeBlock(block.component)) return 8;
    if (isLargeFullRowHomeBlock(block.component)) return 12;

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
    if (block.component === "risk_disclosure") return true;
    // Wide-pairable blocks are not unconditionally full-row: they may pair with a
    // compact companion. If they stay unpaired, buildHomepageRows flushes them full.
    if (isWidePairableHomeBlock(block.component)) return false;
    if (isLargeFullRowHomeBlock(block.component)) return true;
    return ["account_list", "account_performance"].includes(block.component) && spanFromBrickSize(block.brickSize) >= 12;
  }

  function isHomepageCompactBlock(block) {
    if (isLargeFullRowHomeBlock(block.component)) return false;
    return ["quick_actions", "referral_link_card", "kyc_status_card", "announcements", "market_news", "risk_disclosure", "faq_section", "support_contact", "app_download", "fund_actions", "wallet_balance", "open_account_panel", "user_kyc_rail", "create_account_form", "market_insight", "risk_notice", "copytrading_summary"].includes(block.component);
  }

  function canPairHomepageBlocks(first, second, heroBlockCount = 0) {
    if (!first || !second) return false;
    if (isHomepageFullRowBlock(first) || isHomepageFullRowBlock(second)) return false;
    if (first.component === second.component) return false;
    // Compact and wide-pairable blocks may always shrink to share a row even if their
    // section assigned them slot="full"; only a genuinely full-width block blocks pairing.
    const firstFlexible = isHomepageCompactBlock(first) || isWidePairableHomeBlock(first.component);
    const secondFlexible = isHomepageCompactBlock(second) || isWidePairableHomeBlock(second.component);
    if (!firstFlexible && layoutSpanForBlock(first, heroBlockCount) >= 12) return false;
    if (!secondFlexible && layoutSpanForBlock(second, heroBlockCount) >= 12) return false;
    // A wide-pairable block only pairs with a compact companion (8/4); never two
    // wide blocks side by side, and never a wide block beside a non-compact one.
    const firstWide = isWidePairableHomeBlock(first.component);
    const secondWide = isWidePairableHomeBlock(second.component);
    if (firstWide && secondWide) return false;
    if (firstWide && !isHomepageCompactBlock(second)) return false;
    if (secondWide && !isHomepageCompactBlock(first)) return false;
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
    const maxRows = Math.max(1, ...[...sizes].map((size) => rowUnitsFromBrickSize(size)));

    if (components.has("ad_carousel")) return 260;
    if (components.has("trading_accounts_list") || components.has("wallet_list") || components.has("account_performance") || components.has("trading_account_highlight")) return 240;
    if (maxRows >= 3) return 300;
    if (maxRows >= 2) return 220;
    if (components.has("asset_overview") || components.has("asset_summary")) return 210;
    return 180;
  }

  // Look-ahead pairing: when a wide-pairable block has no adjacent compact companion,
  // pull the next eligible low-priority companion up to sit beside it. Only low-priority
  // companions move; high-value modules keep their position and reading order.
  function reorderBlocksForWidePairing(blocks, heroBlockCount = 0) {
    const source = Array.isArray(blocks) ? blocks.slice() : [];
    const used = new Array(source.length).fill(false);
    const result = [];
    const isCompanion = (block) =>
      block && WIDE_COMPANION_HOME_BLOCKS.has(canonicalHomeBlock(block.component) || block.component);

    for (let i = 0; i < source.length; i += 1) {
      if (used[i]) continue;
      const block = source[i];
      result.push(block);
      used[i] = true;
      if (!isWidePairableHomeBlock(block.component)) continue;

      // Already followed by an eligible companion? leave order untouched.
      const nextIndex = source.findIndex((_, j) => !used[j]);
      if (nextIndex >= 0 && isCompanion(source[nextIndex]) && canPairHomepageBlocks(block, source[nextIndex], heroBlockCount)) {
        continue;
      }
      // Otherwise pull the first later eligible companion up next to this wide block.
      const companionIndex = source.findIndex(
        (candidate, j) => !used[j] && isCompanion(candidate) && canPairHomepageBlocks(block, candidate, heroBlockCount),
      );
      if (companionIndex >= 0) {
        result.push(source[companionIndex]);
        used[companionIndex] = true;
      }
    }
    return result;
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
		    const plan = applyBrickPlanVariant(applyDesignGenomeToPlan(basePlan, genome), intent, variant);

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
    const kycStatus = inferKycStatusFromPrompt(promptText, moduleSettings.userKycRail.kycStatus);
    const shouldIncludeWelcome = includesAny(promptText, ["欢迎模块", "欢迎头部", "欢迎区", "welcome"]);
    const includeReferralLinkCard = wantsReferralLinkCardPrompt(prompt);
    const includeKycStatusCard = wantsKycStatusCardPrompt(prompt);
    const referralStatsRequested = wantsReferralStatsPrompt(prompt);
    const referralCoreOnly = wantsReferralCoreOnlyPrompt(prompt);
    const referralCardStyle = referralLinkCardStyleFromPrompt(prompt, referralStatsRequested, referralCoreOnly);
    const rejectsAnnouncements = /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:公告|通知|维护|平台消息)/.test(promptText);
    const includeAnnouncements = !rejectsAnnouncements && includesAny(promptText, ["公告", "通知", "维护", "平台消息"]);
    const announcementStyle = includesAny(promptText, ["跑马灯", "滚动公告", "公告滚动", "首页第一栏", "顶部公告", "首栏公告"]) ? "ticker-strip" : "list";
    const rejectsPromoBanner = /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:banner|广告|轮播|活动|奖励|权益|promo)/i.test(prompt);
    const includePromoBanner = !rejectsPromoBanner && /banner|广告|轮播|活动|奖励|赠金|权益|promo/i.test(prompt);
    const referralPlan = plan.filter((item) => item.component !== "referral_link_card" || includeReferralLinkCard);
    let activePlan =
      includeReferralLinkCard && !referralPlan.some((item) => item.component === "referral_link_card")
        ? referralPlan.concat([
            {
              brickId: "referralLinkCard.compact",
              brickName: "推广链接",
              family: "ReferralLinkCard",
              feature: "referral_link_card",
              component: "referral_link_card",
              size: "1x1",
              zone: "rail",
              reason: "代理、IB 或合作伙伴快速复制推广链接和邀请码，不承载完整代理数据。",
            },
          ])
        : referralPlan;
    if (includePromoBanner && !activePlan.some((item) => item.component === "promo_banner")) {
      activePlan = activePlan.concat([
        {
          brickId: "promoBanner.imageHero",
          brickName: "首页 Banner / 广告轮播",
          family: "PromotionBanner",
          feature: "promo_banner",
          component: "promo_banner",
          size: "3x1",
          zone: "full",
          reason: "提示词明确要求首页 Banner / 广告轮播，作为独立推广横幅保留。",
        },
      ]);
    }
    if (includeKycStatusCard && !activePlan.some((item) => item.component === "kyc_status_card")) {
      activePlan = activePlan.concat([
        {
          brickId: "kycStatus.current",
          brickName: "KYC 当前状态",
          family: "UserKycRail",
          feature: "kyc_status_card",
          component: "kyc_status_card",
          size: "1x1",
          zone: "rail",
          reason: "只展示当前 CRM KYC 状态和对应提交动作。",
        },
      ]);
    }
    if (includeAnnouncements && !activePlan.some((item) => item.component === "announcements")) {
      const announcementBrick = {
        brickId: "announcements.feed",
        brickName: "公告通知",
        family: "Announcements",
        feature: "announcements",
        component: "announcements",
        size: announcementStyle === "ticker-strip" ? "3x1" : "2x1",
        zone: announcementStyle === "ticker-strip" ? "full" : "main",
        reason: announcementStyle === "ticker-strip" ? "顶部滚动公告承接系统、活动和维护通知。" : "列表展示系统公告、活动公告和维护通知。",
      };
      activePlan = announcementStyle === "ticker-strip" ? [announcementBrick].concat(activePlan) : activePlan.concat(announcementBrick);
    }
    const onboardingPresentation = onboardingPresentationFromPrompt(promptText, genome.id, variant);
    activePlan.forEach((item) => {
      if (item.family !== "OnboardingProgress") return;
      item.brickId = onboardingPresentation.brickId;
      item.brickName = onboardingPresentation.brickName;
      item.reason = onboardingPresentation.reason;
    });
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

    if (activePlan.some((item) => item.family === "OnboardingProgress")) {
      modules.OnboardingProgress = { variant: onboardingPresentation.variant };
      moduleStyles.onboardingProgress = onboardingPresentation.style;
    }

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

    if (wantsFourColumnTradingAccountCards(prompt)) {
      modules.TradingAccounts = { variant: "denseCards" };
      moduleStyles.tradingAccounts = "dense-cards";
      moduleStyles.trading_accounts_list = "dense-cards";
      moduleSettings = mergeSettingsObject(moduleSettings, {
        tradingAccounts: {
          enabled: true,
          realEnabled: true,
          demoEnabled: true,
          grouping: "combined",
          viewMode: "card",
          realViewMode: "card",
          demoViewMode: "card",
          preferredColumns: 4,
        },
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
      modules.ReferralLinkCard = {
        variant: referralCardStyle === "stats-card" ? "statsCard" : referralCardStyle === "link-first" ? "linkFirst" : "compactCard",
      };
	      moduleStyles.referral_link_card = referralCardStyle;
	    }

    if (includeAnnouncements) {
      moduleSettings = mergeSettingsObject(moduleSettings, { announcements: { enabled: true } });
      moduleStyles.announcements = announcementStyle;
    }

    if (includeKycStatusCard || activePlan.some((item) => item.component === "kyc_status_card")) {
      moduleSettings = mergeSettingsObject(moduleSettings, {
        userKycRail: {
          enabled: true,
          kycStatus,
        },
      });
      modules.UserKycRail = { variant: "compactStatus" };
      moduleStyles.kyc_status_card = "status-card";
      moduleStyles.userKycRail = "status-rail";
    }

    if (wantsAccountPerformanceLinePrompt(promptText)) {
      modules.AccountPerformance = { variant: "proChart" };
      moduleStyles.accountPerformance = "pro-chart";
    }

    if (activePlan.some((item) => item.family === "QuickActions" || item.component === "quick_actions")) {
      const quickPresentation = quickActionPresentationFromIntent(intent, genome.id, prompt, variant);
      if (validModuleVariant("QuickActions", quickPresentation.variant)) {
        modules.QuickActions = { variant: quickPresentation.variant };
      }
      moduleStyles.quickActions = quickPresentation.style;
      moduleSettings = mergeSettingsObject(moduleSettings, {
        quickActions: {
          enabled: true,
          count: Math.max(Number(moduleSettings.quickActions?.count || 0), quickPresentation.count),
          display: quickPresentation.display,
        },
      });
      activePlan = activePlan.map((item) => {
        if (item.family !== "QuickActions" && item.component !== "quick_actions") return item;
        return {
          ...item,
          brickId: quickPresentation.brickId || item.brickId,
          brickName: quickPresentation.name || item.brickName,
          reason: quickPresentation.reason || item.reason,
        };
      });
      layout.forEach((block) => {
        if (block.component !== "quick_actions") return;
        block.brickId = quickPresentation.brickId || block.brickId;
        block.brickName = quickPresentation.name || block.brickName;
        block.brickReason = quickPresentation.reason || block.brickReason;
      });
    }

    moduleSettings.userKycRail = {
      ...(moduleSettings.userKycRail || {}),
      enabled: Boolean(moduleSettings.userKycRail?.enabled || includeKycStatusCard),
      kycStatus,
    };

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
	      colorMode: colorModeFromPromptText(prompt),
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

    return applyHomepageUnderstandingToConfig(generatedConfig, prompt, variant);
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
	    return Object.prototype.hasOwnProperty.call(I18N, key) ? I18N[key] : key;
	  }

	  function featureTitleHtml(safeProps) {
	    const eyebrow = t(safeProps.eyebrowKey).trim();
	    const title = t(safeProps.titleKey).trim();
	    return `
	      <div class="ai-feature-title">
	        <strong>${escapeHtml(title || eyebrow)}</strong>
	      </div>
	    `;
	  }

  function canonicalHomeBlock(id) {
    const value = String(id || "").trim();
    if (!value) return "";
    if (FORBIDDEN_HOME_BLOCKS.includes(value)) return "";
    if (CANONICAL_HOME_BLOCKS.includes(value)) return value;
    return LEGACY_SLOT_ALIASES[value] || LEGACY_SLOT_ALIASES[value.toLowerCase()] || LEGACY_COMPONENT_ALIASES[value] || LEGACY_COMPONENT_ALIASES[value.toLowerCase()] || "";
  }

  function isLargeFullRowHomeBlock(id) {
    const component = canonicalHomeBlock(id) || String(id || "").trim();
    return LARGE_FULL_ROW_HOME_BLOCKS.has(component);
  }

  function largeFullRowHomeBlockSize(id) {
    const component = canonicalHomeBlock(id) || String(id || "").trim();
    return LARGE_FULL_ROW_HOME_BLOCK_SIZES[component] || "";
  }

  function largeFullRowHomeBlockReason(id) {
    const component = canonicalHomeBlock(id) || String(id || "").trim();
    if (component === "copytrading_signals") return "推荐信号源属于收益、风险和曲线信息密集模块，强制整横栏展示。";
    if (component === "pamm_products") return "PAMM 产品属于产品、收益、风险和曲线信息密集模块，强制整横栏展示。";
    if (component === "onboarding_guide") return "新手 Onboarding 承接 KYC、开户和首次入金旅程，强制整横栏展示。";
    if (component === "promo_banner") return "首页 Banner/轮播图属于首屏大模块，强制整横栏展示。";
    if (component === "trading_account_highlight") return "账号表现图表属于大模块，独占整横栏展示账号上下文、趋势和指标。";
    if (component === "trading_accounts_list") return "交易账号列表属于大模块，强制整横栏展示。";
    if (component === "wallet_list") return "钱包列表属于多币种内容，强制整行展示。";
    return "大型首页模块强制整横栏展示。";
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
    const hasExplicitActions = Array.isArray(actions) && actions.length;
    const source = hasExplicitActions ? actions : fallbackActions;
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
        icon: ["user", "demo", "deposit", "withdraw", "transfer", "history", "positions", "trophy", "copy", "chart"].includes(actionSource.icon)
          ? actionSource.icon
          : preset?.icon || "chart",
        labelKey: i18nKey(actionSource.labelKey, preset?.labelKey || fallbackActions[normalized.length]?.labelKey || "home.action.deposit"),
      });
    });

    if (hasExplicitActions && normalized.length > MAX_QUICK_ACTIONS) {
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
        normalized.actions = sanitizeQuickActions(value, fallback, component === "quick_actions" ? [] : errors);
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
	    const canonicalComponent = canonicalHomeBlock(component) || component;
	    if (canonicalComponent === "welcome_header") return "hero";
	    if (isLargeFullRowHomeBlock(canonicalComponent)) return type === "hero" && slotIndex === 0 ? "hero" : "full";
	    if (type === "hero" && slotIndex > 0) {
	      return ["quick_actions", "referral_link_card", "kyc_status_card", "announcements", "market_news", "risk_disclosure", "faq_section", "support_contact", "app_download"].includes(canonicalComponent) ? "rail" : "main";
	    }
	    if (type === "hero") return "hero";
	    if (type === "full") return "full";
	    if (["asset_overview", "quick_actions", "referral_link_card", "kyc_status_card", "announcements", "market_news", "risk_disclosure", "faq_section", "support_contact", "app_download"].includes(canonicalComponent)) return "main";
	    if (type === "rail") return "rail";
	    if (["referral_link_card", "kyc_status_card", "announcements", "market_news", "risk_disclosure", "faq_section", "support_contact", "app_download"].includes(canonicalComponent)) return "rail";
	    return "main";
  }

	  function defaultHomepageLayout() {
	    return [
	      { id: "assets", component: "asset_overview", slot: "main", priority: 20, props: clone(COMPONENT_PROPS_SCHEMA.asset_overview) },
	      { id: "quick", component: "quick_actions", slot: "rail", priority: 30, props: clone(COMPONENT_PROPS_SCHEMA.quick_actions) },
	      { id: "highlight", component: "trading_account_highlight", slot: "full", priority: 40, props: clone(COMPONENT_PROPS_SCHEMA.trading_account_highlight) },
	      { id: "accounts", component: "trading_accounts_list", slot: "full", priority: 50, props: clone(COMPONENT_PROPS_SCHEMA.trading_accounts_list) },
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
          sectionId: cleanMetaText(section.id, "", 64),
          sectionTitle: cleanMetaText(section.title, "", 80),
          sectionType: cleanMetaText(section.type, "", 24),
          sectionTransition: cleanMetaText(section.transition, "", 24),
          groupId: cleanMetaText(section.groupId, "", 48),
          compositeId: cleanMetaText(section.compositeId, "", 64),
          compositeTitle: cleanMetaText(section.compositeTitle, "", 80),
          compositeSurface: cleanMetaText(section.compositeSurface, "", 32),
          compositeRole: cleanMetaText(section.compositeRole, "", 24),
          compositeIndex: Number.isFinite(Number(section.compositeIndex)) ? Number(section.compositeIndex) : sectionIndex,
        });
      });
    });

    return blocks.length > 1 ? blocks : defaultHomepageLayout();
  }

  function layoutCoversSections(sourceLayout, sections) {
    if (!Array.isArray(sourceLayout) || !Array.isArray(sections)) return false;

    const sectionComponents = new Set(
      sections
        .flatMap((section) => (Array.isArray(section.slots) ? section.slots : []))
        .map((slot) => componentFromFeature(slot))
        .filter(Boolean),
    );
    const layoutComponents = new Set(
      sourceLayout
        .map((block) => canonicalHomeBlock(block?.component) || block?.component)
        .filter(Boolean),
    );

    return [...sectionComponents].every((component) => layoutComponents.has(component));
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
        sectionId: cleanMetaText(block.sectionId, "", 64),
        sectionTitle: cleanMetaText(block.sectionTitle, "", 80),
        sectionType: cleanMetaText(block.sectionType, "", 24),
        sectionTransition: cleanMetaText(block.sectionTransition, "", 24),
        groupId: cleanMetaText(block.groupId, "", 48),
        compositeId: cleanMetaText(block.compositeId, "", 64),
        compositeTitle: cleanMetaText(block.compositeTitle, "", 80),
        compositeSurface: cleanMetaText(block.compositeSurface, "", 32),
        compositeRole: cleanMetaText(block.compositeRole, "", 24),
        compositeIndex: Number.isFinite(Number(block.compositeIndex)) ? Number(block.compositeIndex) : index,
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

  function sectionTitleForSlot(slot, fallback = "") {
    if (slot === "trading_account_highlight") return "账号表现";
    if (slot === "trading_accounts_list") return "交易账号";
    if (slot === "wallet_list") return "钱包列表";
    if (slot === "copytrading_signals") return "推荐信号源";
    if (slot === "onboarding_guide") return "新手 Onboarding";
    if (slot === "promo_banner") return "首页 Banner";
    if (slot === "pamm_products") return "PAMM";
    return FEATURES[slot] || fallback || slot;
  }

  function splitLargeFullRowSections(sections) {
    return sections.flatMap((section) => {
      const slots = Array.isArray(section.slots) ? section.slots.map((slot) => canonicalHomeBlock(slot) || slot).filter(Boolean) : [];
      if (!slots.some(isLargeFullRowHomeBlock)) return [{ ...section, slots }];

      const splitSections = [];
      let compactSlots = [];
      const flushCompactSlots = () => {
        if (!compactSlots.length) return;
        for (let offset = 0; offset < compactSlots.length; offset += 2) {
          const group = compactSlots.slice(offset, offset + 2);
          splitSections.push({
            ...section,
            id: splitSections.length ? `${section.id || "section"}-${splitSections.length + 1}`.slice(0, 32) : section.id,
            slots: group,
            type: group.length === 1 ? (section.type === "rail" ? "rail" : "full") : section.type === "hero" && !splitSections.length ? "hero" : "split",
          });
        }
        compactSlots = [];
      };

      slots.forEach((slot, index) => {
        if (!isLargeFullRowHomeBlock(slot)) {
          compactSlots.push(slot);
          return;
        }

        flushCompactSlots();
        splitSections.push({
          ...section,
          id: `${section.id || "section"}-${index + 1}`.slice(0, 32) || `full-row-${index + 1}`,
          type: "full",
          title: sectionTitleForSlot(slot, section.title),
          slots: [slot],
        });
      });

      flushCompactSlots();
      return splitSections;
    });
  }

  function normalizeSections(sections) {
    const source = Array.isArray(sections) && sections.length ? sections : DEFAULT_CONFIG.sections;
    const normalized = source
      .map((section, index) => {
        const slots = uniqueValidSlots(section.slots);
        if (!slots.length) return null;

        return {
          id: String(section.id || `section-${index + 1}`).slice(0, 32),
          type: ["hero", "rail", "split", "full"].includes(section.type) ? section.type : "full",
          title: String(section.title || "").slice(0, 28),
          variant: String(section.variant || "").slice(0, 24),
          transition: ["connected", "soft-break", "hard-break", "workbench", "plain"].includes(section.transition)
            ? section.transition
            : "",
          groupId: cleanMetaText(section.groupId, "", 48),
          compositeId: cleanMetaText(section.compositeId, "", 64),
          compositeTitle: cleanMetaText(section.compositeTitle, "", 80),
          compositeSurface: cleanMetaText(section.compositeSurface, "", 32),
          compositeRole: cleanMetaText(section.compositeRole, "", 24),
          compositeIndex: Number.isFinite(Number(section.compositeIndex)) ? Number(section.compositeIndex) : index,
          slots,
        };
      })
      .filter(Boolean);
    return splitLargeFullRowSections(normalized);
  }

  function normalizeAutoLayoutBreakpoint(source, fallback) {
    const value = source && typeof source === "object" ? source : {};
    return {
      columns: Number.isFinite(Number(value.columns)) ? Math.max(1, Math.min(12, Number(value.columns))) : fallback.columns,
      collapseAt: Number.isFinite(Number(value.collapseAt)) ? Math.max(320, Math.min(1440, Number(value.collapseAt))) : fallback.collapseAt,
      rowMode: cleanMetaText(value.rowMode, fallback.rowMode, 32),
      moduleFlow: cleanMetaText(value.moduleFlow, fallback.moduleFlow, 40),
      equalHeight: typeof value.equalHeight === "boolean" ? value.equalHeight : fallback.equalHeight,
    };
  }

	  function normalizeAutoLayoutModuleRules(source) {
	    const rules = source && typeof source === "object" ? source : {};
	    return AUTO_LAYOUT_MODULES.reduce((next, moduleId) => {
	      const rule = rules[moduleId] && typeof rules[moduleId] === "object" ? rules[moduleId] : {};
	      const defaultDesktop = LARGE_FULL_ROW_HOME_BLOCKS.has(moduleId)
	        ? moduleId === "trading_account_highlight"
	          ? "full-row-chart"
	          : "full-row-module"
	        : "natural-grid";
	      next[moduleId] = {
	        desktop: cleanMetaText(rule.desktop, defaultDesktop, 48),
	        tablet: cleanMetaText(rule.tablet, "stack-or-two-column", 48),
	        mobile: cleanMetaText(rule.mobile, "single-column", 48),
	      };
      return next;
    }, {});
  }

  function normalizeAutoLayout(source, sections = [], layout = []) {
    const value = source && typeof source === "object" ? source : {};
    const hasPairedSections = sections.some((section) => ["hero", "split", "rail"].includes(section.type) && (section.slots || []).length > 1);
    const hasPairedLayout = layout.some((block) => ["main", "rail"].includes(block.slot));
    const strategy = oneOf(value.strategy, AUTO_LAYOUT_STRATEGIES, "responsive-grid");
    const defaults = {
      desktop: {
        columns: 12,
        collapseAt: 1040,
        rowMode: hasPairedSections || hasPairedLayout ? "fill-paired-rows" : "full-row",
        moduleFlow: "3x, 2x+1x, 2x+2x",
        equalHeight: true,
      },
      tablet: {
        columns: 1,
        collapseAt: 1040,
        rowMode: "stack-paired-rows",
        moduleFlow: "one-module-per-row",
        equalHeight: false,
      },
      mobile: {
        columns: 1,
        collapseAt: 720,
        rowMode: "single-column",
        moduleFlow: "stack-module-internals",
        equalHeight: false,
      },
    };

    return {
      strategy,
      desktop: normalizeAutoLayoutBreakpoint(value.desktop, defaults.desktop),
      tablet: normalizeAutoLayoutBreakpoint(value.tablet, defaults.tablet),
      mobile: normalizeAutoLayoutBreakpoint(value.mobile, defaults.mobile),
      moduleRules: normalizeAutoLayoutModuleRules(value.moduleRules),
      notes: (Array.isArray(value.notes) ? value.notes : [])
        .map((note) => cleanMetaText(note, "", 120))
        .filter(Boolean)
        .slice(0, 6),
    };
  }

  function boolValue(value, fallback = true) {
    return typeof value === "boolean" ? value : fallback;
  }

  function oneOf(value, options, fallback) {
    return options.includes(value) ? value : fallback;
  }

  function normalizeAssetVisibleFields(fields, fallback = DEFAULT_MODULE_SETTINGS.assets.visibleFields) {
    const source = Array.isArray(fields) ? fields : fallback;
    const requested = source
      .map((field) => String(field || "").trim())
      .filter((field, index, list) => ["total", "wallet", "tradingAccount"].includes(field) && list.indexOf(field) === index);
    if (requested.includes("total") && requested.includes("tradingAccount") && !requested.includes("wallet")) {
      requested.push("wallet");
    }
    const ordered = ["total", "wallet", "tradingAccount"].filter((field) => requested.includes(field));
    return ordered.length ? ordered : fallback.slice();
  }

  function normalizeThemeId(value) {
    const theme = LEGACY_THEME_MAP[value] || value;
    return THEMES[theme] ? theme : DEFAULT_CONFIG.theme;
  }

	  function normalizeHexColor(value) {
	    const match = String(value || "").match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);
	    if (!match) return "";

    const raw = match[0].toLowerCase();
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
	    return raw;
	  }

	  function compactThemeObject(source) {
	    return Object.fromEntries(Object.entries(source || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined));
	  }

	  function themeCustomPaletteForText(input, explicitPrimaryColor = "") {
	    const source = String(input || "");
	    const text = source.toLowerCase() + source;
	    const palette =
	      includesAny(text, ["莫兰迪", "morandi"])
	        ? {
	            primaryColor: "#7c8f8a",
	            accentColor: "#b08b7d",
	            backgroundStyle: "linear-gradient(180deg, #f7f5f1 0%, #ece8df 100%)",
	            cardStyle: "#fbfaf7",
	            surfaceColor: "#fbfaf7",
	            surfaceSoft: "#f1eee7",
	            surfaceMuted: "#ebe6dd",
	            textStrong: "#28322f",
	            textColor: "#394743",
	            textSoft: "#65706c",
	            textMuted: "#7d8782",
	            borderColor: "#d8d1c7",
	            borderSoft: "#e6e0d8",
	            buttonStyle: "linear-gradient(135deg, #394743, #7c8f8a)",
	            buttonText: "#ffffff",
	            cardShadow: "0 14px 34px rgba(57, 71, 67, 0.12)",
	          }
	        : includesAny(text, ["黑金", "高净值", "vip", "尊贵", "机构", "大客户"])
	        ? {
	            primaryColor: "#b7791f",
	            accentColor: "#f5c451",
	            backgroundStyle:
	              includesAny(text, ["不要太暗", "不太暗", "清爽", "浅", "明亮"])
	                ? "linear-gradient(180deg, #1b1720 0%, #f7f2e7 54%, #fbfaf7 100%)"
	                : "radial-gradient(circle at 78% 4%, rgba(245, 196, 81, 0.18), transparent 28%), linear-gradient(180deg, #121826 0%, #f7f4ed 62%, #f9fafb 100%)",
	            cardStyle: "rgba(255, 252, 245, 0.98)",
	            surfaceColor: "#fffaf0",
	            surfaceSoft: "#fff6dc",
	            surfaceMuted: "#fbedd0",
	            textStrong: "#1f2937",
	            textColor: "#2f2a20",
	            textSoft: "#5f5140",
	            textMuted: "#766953",
	            borderColor: "#e3c98b",
	            borderSoft: "#f0dfb6",
	            buttonStyle: "linear-gradient(135deg, #171923 0%, #b7791f 100%)",
	            buttonText: "#fffaf0",
	            cardShadow: "0 18px 42px rgba(38, 28, 12, 0.14)",
	          }
	        : includesAny(text, ["暗色科技", "科技黑", "终端", "赛博", "cyber", "dark tech", "terminal"])
	        ? {
	            primaryColor: "#38bdf8",
	            accentColor: "#a78bfa",
	            backgroundStyle: "radial-gradient(circle at 76% 6%, rgba(56, 189, 248, 0.22), transparent 30%), linear-gradient(180deg, #06111f 0%, #0b1220 100%)",
	            cardStyle: "rgba(13, 24, 40, 0.92)",
	            surfaceColor: "#0d1828",
	            surfaceSoft: "#111f33",
	            surfaceMuted: "#16243a",
	            textStrong: "#f8fbff",
	            textColor: "#e5edf8",
	            textSoft: "#b8c7d9",
	            textMuted: "#92a4ba",
	            borderColor: "rgba(56, 189, 248, 0.28)",
	            borderSoft: "rgba(148, 163, 184, 0.22)",
	            buttonStyle: "linear-gradient(135deg, #38bdf8, #7c3aed)",
	            buttonText: "#06111f",
	            cardShadow: "0 22px 52px rgba(0, 0, 0, 0.3)",
	          }
		        : includesAny(text, ["清爽", "科技", "高级", "国际", "金融", "蓝", "fresh", "clean", "global"])
		        ? {
		            primaryColor: "#2f66e8",
		            accentColor: "#275bd5",
		            backgroundStyle: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 52%, #f7faff 100%)",
		            cardStyle: "#ffffff",
		            surfaceColor: "#ffffff",
		            surfaceSoft: "#f7faff",
		            surfaceMuted: "#eef4ff",
		            textStrong: "#0f172a",
		            textColor: "#172033",
		            textSoft: "#475569",
		            textMuted: "#64748b",
		            borderColor: "#d8e1ef",
		            borderSoft: "#e8edf5",
		            buttonStyle: "linear-gradient(135deg, #2f66e8, #275bd5)",
		            buttonText: "#ffffff",
		            cardShadow: "0 10px 24px rgba(15, 23, 42, 0.07)",
		          }
	        : includesAny(text, ["极简", "minimal", "白", "留白", "克制"])
	        ? {
	            primaryColor: "#475569",
	            accentColor: "#64748b",
	            backgroundStyle: "linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%)",
	            cardStyle: "#ffffff",
	            surfaceColor: "#ffffff",
	            surfaceSoft: "#f8fafc",
	            surfaceMuted: "#f1f5f9",
	            textStrong: "#111827",
	            textColor: "#1f2937",
	            textSoft: "#475569",
	            textMuted: "#64748b",
	            borderColor: "#e5e7eb",
	            borderSoft: "#edf2f7",
	            buttonStyle: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
	            buttonText: "#111827",
	            cardShadow: "none",
	          }
	        : explicitPrimaryColor
	        ? {
	            primaryColor: explicitPrimaryColor,
	            accentColor: "color-mix(in srgb, " + explicitPrimaryColor + " 68%, #14b8a6)",
	            backgroundStyle: "linear-gradient(180deg, color-mix(in srgb, " + explicitPrimaryColor + " 7%, #ffffff), #ffffff)",
	            cardStyle: "rgba(255, 255, 255, 0.98)",
	            surfaceColor: "#ffffff",
	            surfaceSoft: "color-mix(in srgb, " + explicitPrimaryColor + " 8%, #ffffff)",
	            surfaceMuted: "color-mix(in srgb, " + explicitPrimaryColor + " 5%, #ffffff)",
	            textStrong: "#0f172a",
	            textColor: "#172033",
	            textSoft: "#475569",
	            textMuted: "#64748b",
	            borderColor: "color-mix(in srgb, " + explicitPrimaryColor + " 32%, #dce6f4)",
	            borderSoft: "color-mix(in srgb, " + explicitPrimaryColor + " 18%, #edf2f7)",
	            buttonStyle: "linear-gradient(135deg, " + explicitPrimaryColor + ", color-mix(in srgb, " + explicitPrimaryColor + " 78%, #111827))",
	            buttonText: "#ffffff",
	            cardShadow: "0 16px 34px color-mix(in srgb, " + explicitPrimaryColor + " 13%, transparent)",
	          }
	        : null;

	    if (!palette) return null;
	    const primaryColor = explicitPrimaryColor || palette.primaryColor;
	    return compactThemeObject({
	      ...palette,
	      primaryColor,
	      primaryStrong: palette.primaryStrong || primaryColor,
	      primaryText: palette.primaryText || primaryColor,
	      primarySoft: palette.primarySoft || `color-mix(in srgb, ${primaryColor} 12%, ${palette.surfaceColor || "#ffffff"})`,
	      primaryFaint: palette.primaryFaint || `color-mix(in srgb, ${primaryColor} 8%, ${palette.surfaceColor || "#ffffff"})`,
	      primaryBorder: palette.primaryBorder || palette.borderColor,
	      primaryBorderStrong: palette.primaryBorderStrong || `color-mix(in srgb, ${primaryColor} 48%, ${palette.borderColor || "#dce6f4"})`,
	      primarySurface: palette.primarySurface || `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 13%, ${palette.surfaceColor || "#ffffff"}), ${palette.surfaceColor || "#ffffff"})`,
	    });
	  }

	  function normalizeThemeCustom(value) {
	    const source = typeof value === "string" ? { input: value } : value && typeof value === "object" ? value : null;
	    const input = String(source?.input || source?.value || "").trim().slice(0, 96);
		    const primaryColor = normalizeHexColor(source?.primaryColor || input);
		    const palette = themeCustomPaletteForText(input, primaryColor);
		    return input ? compactThemeObject({ ...palette, ...source, input, primaryColor: primaryColor || palette?.primaryColor || source?.primaryColor || "" }) : null;
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
        ...componentMorphPayload(moduleId, variant),
        style: moduleStyles[featureId] || "",
      };
      return morphs;
    }, {});
  }

  function normalizeComponentMorphs(source, modules, moduleStyles, componentReferences = []) {
    const base = componentMorphsFromModules(modules, moduleStyles);
    const explicit = source && typeof source === "object" && !Array.isArray(source) ? source : {};

    componentReferences.forEach((reference) => {
      if (!base[reference.module]) return;
      const variant = modules?.[reference.module]?.variant || base[reference.module]?.variant || MODULE_VARIANT_DEFAULTS[reference.module];
      base[reference.module] = {
        ...base[reference.module],
        ...componentMorphPayload(reference.module, variant, {
          morph: reference.morphHint,
          morphId: reference.morphHint,
          reason: reference.reason,
        }),
        referenceComponentId: reference.componentId,
        referenceComponentName: reference.name,
        referenceFamily: reference.family,
        referenceReason: reference.reason,
      };
    });

    Object.keys(explicit).forEach((moduleId) => {
      if (!PROTOCOL_MODULES[moduleId]) return;
      const requestedVariant = explicit[moduleId]?.variant;
      const variant = validModuleVariant(moduleId, requestedVariant) ? requestedVariant : base[moduleId]?.variant;
      if (!validModuleVariant(moduleId, variant)) return;
      base[moduleId] = {
        ...base[moduleId],
        ...componentMorphPayload(moduleId, variant, explicit[moduleId]),
        reason: cleanMetaText(explicit[moduleId]?.reason, "", 140),
        referenceComponentId: cleanMetaText(explicit[moduleId]?.referenceComponentId || base[moduleId]?.referenceComponentId, "", 96),
        referenceComponentName: cleanMetaText(explicit[moduleId]?.referenceComponentName || base[moduleId]?.referenceComponentName, "", 80),
        referenceFamily: cleanMetaText(explicit[moduleId]?.referenceFamily || base[moduleId]?.referenceFamily, "", 80),
        referenceReason: cleanMetaText(explicit[moduleId]?.referenceReason || base[moduleId]?.referenceReason, "", 180),
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

  function componentReferenceText(reference) {
    return String(
      [
        reference?.componentId,
        reference?.id,
        reference?.name,
        reference?.family,
        reference?.module,
        reference?.component,
        reference?.size,
        reference?.description,
        reference?.visibleText,
        reference?.variantHint,
        reference?.morphHint,
        reference?.styleHint,
        ...(Array.isArray(reference?.tags) ? reference.tags : []),
        ...(Array.isArray(reference?.layoutHints) ? reference.layoutHints : []),
        ...(Array.isArray(reference?.styleSignals) ? reference.styleSignals : []),
      ].join(" "),
    ).toLowerCase();
  }

	  function inferComponentReferenceHints(moduleId, reference) {
	    const text = componentReferenceText(reference);
	    const rule = (COMPONENT_REFERENCE_RULES[moduleId] || []).find((item) => item.keys.some((key) => text.includes(String(key || "").toLowerCase())));
	    return {
	      variant: rule?.variant || "",
      morph: rule?.morph || "",
      style: rule?.style || "",
      styleFeature: (COMPONENT_REFERENCE_STYLE_FEATURES[moduleId] || [])[0] || "",
	    };
	  }

	  function componentReferenceRendererVisibleText(reference = {}) {
	    return cleanMetaText(
	      reference.visibleText ||
	        sanitizeAiHtmlMarkup(reference.rendererHtml || reference.html || "")
	          .replace(/<[^>]*>/g, " ")
	          .replace(/\s+/g, " "),
	      "",
	      600,
	    );
	  }

	  function componentReferenceRendererLooksPublishable(reference = {}) {
	    const source = `${componentReferenceRendererVisibleText(reference)} ${reference.rendererHtml || reference.html || ""}`;
	    return !/Invite\s+Link\s+First|Link,\s*invite\s+code|conversion\s+metrics\s+stay\s+visible|--\s*(?:Opens|Accounts|Clicks|Registrations)|\b(?:Primary Action|Lorem ipsum|Sample Data|Untitled Module)\b/i.test(source);
	  }

	  function normalizeHomepageComponentReferences(value) {
	    return (Array.isArray(value) ? value : [])
	      .map((item) => {
	        const moduleId = moduleKeyFor(item?.module || item?.moduleId || item?.family || item?.component || item?.feature);
        if (!moduleId) return null;
        const hints = inferComponentReferenceHints(moduleId, item);
        const requestedVariant = cleanMetaText(item?.variantHint || item?.variant || hints.variant, "", 48);
        const requestedMorph = cleanMetaText(item?.morphHint || item?.morph || item?.morphId || hints.morph, "", 48);
	        const styleHint = cleanMetaText(item?.styleHint || item?.style || hints.style, "", 48);
	        const score = Number.isFinite(Number(item?.score)) ? Math.max(1, Math.min(10, Math.round(Number(item.score)))) : null;
	        const referenceTier = cleanMetaText(item?.referenceTier || item?.tier, score != null && score >= 8 ? "strong" : score != null && score <= 5 ? "blocked" : "", 24);
	        const canRenderStrongReference = referenceTier !== "blocked" && score != null && score >= 8 && componentReferenceRendererLooksPublishable(item);
	        return {
          componentId: cleanMetaText(item?.componentId || item?.id, "", 96),
          id: cleanMetaText(item?.id || item?.componentId, "", 96),
          name: cleanMetaText(item?.name, "", 80),
          family: cleanMetaText(item?.family, moduleId, 80),
          module: moduleId,
          component: componentFromFeature(item?.component || item?.feature || PROTOCOL_MODULES[moduleId]?.component || ""),
          size: cleanMetaText(item?.size, "", 16),
          score,
          referenceTier,
          referenceRule: cleanMetaText(item?.referenceRule, "", 180),
          tags: (Array.isArray(item?.tags) ? item.tags : []).map((tag) => cleanMetaText(tag, "", 32)).filter(Boolean).slice(0, 8),
          layoutHints: (Array.isArray(item?.layoutHints) ? item.layoutHints : []).map((hint) => cleanMetaText(hint, "", 120)).filter(Boolean).slice(0, 6),
          styleSignals: (Array.isArray(item?.styleSignals) ? item.styleSignals : []).map((signal) => cleanMetaText(signal, "", 80)).filter(Boolean).slice(0, 8),
          visibleText: cleanMetaText(item?.visibleText, "", 260),
          variantHint: validModuleVariant(moduleId, requestedVariant) ? requestedVariant : "",
          morphHint: requestedMorph,
          styleHint,
          styleFeature: cleanMetaText(item?.styleFeature || hints.styleFeature, "", 48),
          rendererMode: canRenderStrongReference ? cleanMetaText(item?.rendererMode || "high-score-component", "high-score-component", 40) : "",
          rendererHtml: canRenderStrongReference ? sanitizeAiHtmlMarkup(item?.rendererHtml || item?.html) : "",
          rendererCss: canRenderStrongReference ? sanitizeAiHtmlCss(item?.rendererCss || item?.css) : "",
          rendererQualityFloor: canRenderStrongReference ? 8 : null,
          reason: cleanMetaText(item?.reason, "", 180),
          source: cleanMetaText(item?.source, "home-component-library", 48),
          applied: Boolean(item?.applied),
        };
      })
	      .filter((item) => item && item.componentId && item.name && item.referenceTier !== "blocked" && componentReferenceRendererLooksPublishable(item))
	      .slice(0, 12);
	  }

  function shouldApplyComponentReferenceVariant(source, moduleId, variant) {
    if (!validModuleVariant(moduleId, variant)) return false;
    const modulesSource = source.modules && typeof source.modules === "object" ? source.modules : {};
    const variantsSource = source.moduleVariants && typeof source.moduleVariants === "object" ? source.moduleVariants : {};
    const explicitVariant = modulesSource[moduleId]?.variant || variantsSource[moduleId];
    return !explicitVariant || explicitVariant === variant || explicitVariant === MODULE_VARIANT_DEFAULTS[moduleId] || explicitVariant === "standard";
  }

  function normalizeModuleVariants(source, componentReferences = []) {
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

    componentReferences.forEach((reference) => {
      if (shouldApplyComponentReferenceVariant(source, reference.module, reference.variantHint)) {
        next[reference.module] = { variant: reference.variantHint };
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
    if (variants.QuickActions?.variant === "tileCards") styles.quickActions = "tile-board";
    if (variants.QuickActions?.variant === "accentCards") styles.quickActions = "accent-cards";
    if (variants.QuickActions?.variant === "compactMenu") styles.quickActions = "compact-menu";
    if (variants.QuickActions?.variant === "segmentedMenu") styles.quickActions = "segmented-panel";
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
    if (variants.PammProducts?.variant === "ranking") styles.pamm_products = "ranking";
    if (variants.PammProducts?.variant === "yieldChartCards") styles.pamm_products = "yield-chart-cards";
    if (variants.CopytradingSignals?.variant === "ranking") styles.copytrading_signals = "ranking";
    if (variants.CopytradingSignals?.variant === "curveCards") styles.copytrading_signals = "curve-cards";
    if (variants.ReferralLink?.variant === "linkFirst") styles.referralLink = "link-first";
    if (variants.ReferralLink?.variant === "compact") styles.referralLink = "compact";
    if (variants.ReferralLinkCard?.variant === "linkFirst") styles.referral_link_card = "link-first";
    if (variants.ReferralLinkCard?.variant === "statsCard") styles.referral_link_card = "stats-card";
    if (variants.ReferralLinkCard?.variant === "compactCard") styles.referral_link_card = "compact-card";
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
    if (variants.OnboardingProgress?.variant === "guideCards") styles.onboardingProgress = "guide-cards";
    if (variants.OnboardingProgress?.variant === "journeyTimeline") styles.onboardingProgress = "journey-timeline";
    if (variants.OnboardingProgress?.variant === "missionBoard") styles.onboardingProgress = "mission-board";
    if (variants.OnboardingProgress?.variant === "ribbonRail") styles.onboardingProgress = "ribbon-rail";
    if (variants.OnboardingProgress?.variant === "nextStepHero") styles.onboardingProgress = "next-step-hero";
    if (variants.AccountPerformance?.variant === "terminalChart") styles.accountPerformance = "terminal-chart";
    if (variants.AccountPerformance?.variant === "sparklineBoard") styles.accountPerformance = "sparkline-board";
    if (variants.AccountPerformance?.variant === "costBoard") styles.accountPerformance = "cost-board";
    if (variants.AccountPerformance?.variant === "dualChart") styles.accountPerformance = "split-performance";
    if (variants.AccountPerformance?.variant === "summaryChart") styles.accountPerformance = "pro-chart";
    if (variants.AccountPerformance?.variant === "metricTrend") styles.accountPerformance = "pro-chart";
    if (variants.AccountPerformance?.variant === "riskPanel") styles.accountPerformance = "pro-chart";
    if (variants.AccountPerformance?.variant === "positionPanel") styles.accountPerformance = "pro-chart";
    if (variants.WalletList?.variant === "walletTiles") styles.walletList = "wallet-tiles";
    if (variants.UserKycRail?.variant === "compactStatus") {
      styles.userKycRail = "status-rail";
      styles.kyc_status_card = "status-card";
    }
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
    const riskDisclosure = source.riskDisclosure && typeof source.riskDisclosure === "object" ? source.riskDisclosure : {};
    const faq = source.faq && typeof source.faq === "object" ? source.faq : {};
    const supportContact = source.supportContact && typeof source.supportContact === "object" ? source.supportContact : {};
    const appDownload = source.appDownload && typeof source.appDownload === "object" ? source.appDownload : {};
    const tradingAccountViewMode = oneOf(tradingAccounts.viewMode, ["switchable", "card", "list"], defaults.tradingAccounts.viewMode);
    const visibleAssetFields = normalizeAssetVisibleFields(assets.visibleFields, defaults.assets.visibleFields);
    const walletCodes = Array.isArray(assets.wallets)
      ? assets.wallets
          .map((code) => String(code || "").trim().toUpperCase())
          .filter((code, index, list) => ["USD", "EUR", "USDT", "XAU", "GBP", "JPY", "CNH"].includes(code) && list.indexOf(code) === index)
          .slice(0, 6)
      : defaults.assets.wallets;

    const normalized = {
      adCarousel: {
        enabled: boolValue(adCarousel.enabled, defaults.adCarousel.enabled),
        autoRotate: boolValue(adCarousel.autoRotate, defaults.adCarousel.autoRotate),
        slideCount: Math.min(6, Math.max(1, Number(adCarousel.slideCount || defaults.adCarousel.slideCount || 3))),
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
        visibleFields: visibleAssetFields,
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
        enabled: boolValue(userKycRail.enabled, defaults.userKycRail.enabled),
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
      riskDisclosure: {
        enabled: boolValue(riskDisclosure.enabled, defaults.riskDisclosure.enabled),
        demoFallback: boolValue(riskDisclosure.demoFallback, defaults.riskDisclosure.demoFallback),
        demoCopy: Array.isArray(riskDisclosure.demoCopy) && riskDisclosure.demoCopy.length ? riskDisclosure.demoCopy.slice(0, 4) : defaults.riskDisclosure.demoCopy,
      },
      faq: {
        enabled: boolValue(faq.enabled, defaults.faq.enabled),
      },
      supportContact: {
        enabled: boolValue(supportContact.enabled, defaults.supportContact.enabled),
      },
      appDownload: {
        enabled: boolValue(appDownload.enabled, defaults.appDownload.enabled),
      },
    };

    normalized.tradingAccounts.enabled = true;
    normalized.tradingAccounts.realEnabled = true;
    normalized.tradingAccounts.demoEnabled = true;

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

  function normalizeModuleStyles(sourceStyles, modules, componentReferences = []) {
    const styles = syncLegacyModuleStyles(modules);
    const explicit = sourceStyles && typeof sourceStyles === "object" ? sourceStyles : {};

    componentReferences.forEach((reference) => {
      if (!reference.styleHint) return;
      const variant = modules?.[reference.module]?.variant || "";
      const canApplyStyle =
        !variant || variant === reference.variantHint || variant === MODULE_VARIANT_DEFAULTS[reference.module] || variant === "standard";
      if (!canApplyStyle) return;
      const featureIds = COMPONENT_REFERENCE_STYLE_FEATURES[reference.module] || [reference.styleFeature].filter(Boolean);
      featureIds.forEach((featureId) => {
        const isAllowed = MODULE_STYLE_OPTIONS[featureId]?.some((option) => option.id === reference.styleHint);
        if (isAllowed && !explicit[featureId]) styles[featureId] = reference.styleHint;
      });
    });

    Object.keys(MODULE_STYLE_OPTIONS).forEach((featureId) => {
      const value = explicit[featureId];
      if (MODULE_STYLE_OPTIONS[featureId].some((option) => option.id === value)) {
        styles[featureId] = value;
      }
    });

    return styles;
  }

	  function normalizeDataContract(source) {
	    const contract = source && typeof source === "object" ? source : null;
	    if (!contract) return null;
	    const basePreviewSample = boolValue(contract.previewSample, false);
	    const baseBindingRequired = boolValue(contract.dataBindingRequired, false);
	    const sourceFields = contract.fields && typeof contract.fields === "object" ? contract.fields : {};
	    const defaultTradingAccountFields = ["accountKind", "platform", "server", "account", "balance", "equity", "credit", "accountType", "leverage", "marginRatio"];
	    const cleanFieldList = (value, fallback) => {
	      const source = Array.isArray(value) && value.length ? value : fallback;
	      return source.map((item) => cleanMetaText(item, "", 32)).filter(Boolean).slice(0, 12);
	    };
	    const normalizeField = (key, label, binding) => {
	      const field = sourceFields[key] && typeof sourceFields[key] === "object" ? sourceFields[key] : {};
	      const normalized = {
	        label: cleanMetaText(field.label, label, 48),
	        previewSample: boolValue(field.previewSample, basePreviewSample),
	        dataBindingRequired: boolValue(field.dataBindingRequired, baseBindingRequired),
	        binding: cleanMetaText(field.binding, binding, 80),
	        fallback: cleanMetaText(field.fallback, "--", 24),
	      };
	      if (key === "tradingAccounts") {
	        normalized.allowedFields = cleanFieldList(field.allowedFields, defaultTradingAccountFields);
	        normalized.forbiddenFields = cleanFieldList(field.forbiddenFields, ["pnl", "usage", "positions", "marginUsed", "riskStatus", "actions"]);
	      }
	      return normalized;
	    };
	    return {
      mode: cleanMetaText(contract.mode, "api-bound-preview", 48),
      previewSample: basePreviewSample,
      dataBindingRequired: baseBindingRequired,
      fallback: cleanMetaText(contract.fallback, "placeholder", 32),
	      note: cleanMetaText(contract.note, "", 220),
	      fields: {
	        tradingAccounts: normalizeField("tradingAccounts", "交易账号卡片/列表字段", "api.trading.accounts"),
	        tradingCost: normalizeField("tradingCost", "交易成本", "api.trading.costs"),
        pnl: normalizeField("pnl", "PnL / 盈亏", "api.trading.pnl"),
        margin: normalizeField("margin", "保证金", "api.trading.margin"),
        charts: normalizeField("charts", "账户表现图表", "api.trading.performanceSeries"),
      },
    };
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
        size: "3x1",
        defaultZone: "full",
        reason: "仅在新用户或关键流程未完成时，用整横栏展示下一步引导。",
      },
      trading_account_highlight: {
        id: "tradingAccount.highlight",
        name: "交易账户重点展示",
        family: "TradingAccountHighlight",
        component: "trading_account_highlight",
        feature: "trading_account_highlight",
        size: "3x2",
        defaultZone: "full",
        reason: "突出一个交易账号的余额、净值、收益率和盈亏趋势，用整横栏承载图表。",
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
        defaultZone: "full",
        reason: "仅在租户配置活动时，用整横栏展示活动 Banner。",
      },
      pamm_products: {
        id: "pammProducts.recommendations",
        name: "PAMM 产品推荐",
        family: "PammProducts",
        component: "pamm_products",
        feature: "pamm_products",
        size: "3x2",
        defaultZone: "full",
        reason: "仅在 PAMM 功能开启且接口返回产品时，用整横栏展示产品、收益和曲线。",
      },
      copytrading_signals: {
        id: "copytradingSignals.recommendations",
        name: "CopyTrading 信号源推荐",
        family: "CopytradingSignals",
        component: "copytrading_signals",
        feature: "copytrading_signals",
        size: "3x2",
        defaultZone: "full",
        reason: "仅在 CopyTrading 功能开启且接口返回信号源时，用整横栏展示收益、风险和曲线。",
      },
      referral_link_card: {
        id: "referralLinkCard.compact",
        name: "推广链接",
        family: "ReferralLinkCard",
        component: "referral_link_card",
        feature: "referral_link_card",
        size: "1x1",
        defaultZone: "rail",
        reason: "仅代理、IB、合作伙伴或开启推广链接功能时展示轻量推广链接和邀请码。",
      },
      kyc_status_card: {
        id: "kycStatus.current",
        name: "KYC 当前状态",
        family: "UserKycRail",
        component: "kyc_status_card",
        feature: "kyc_status_card",
        size: "1x1",
        defaultZone: "rail",
        reason: "只展示当前 CRM KYC 状态和对应动作。",
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
      risk_disclosure: {
        id: "riskDisclosure.marginGuard",
        name: "风险提示区",
        family: "RiskDisclosure",
        component: "risk_disclosure",
        feature: "risk_disclosure",
        size: "1x2",
        defaultZone: "rail",
        reason: "展示后台配置的风险披露、保证金提示和合规说明。",
      },
      faq_section: {
        id: "faqSection.topQuestions",
        name: "FAQ 常见问题区",
        family: "FaqSection",
        component: "faq_section",
        feature: "faq_section",
        size: "2x1",
        defaultZone: "main",
        reason: "展示开户、入金、下载等常见问题，内容来自后台配置。",
      },
      support_contact: {
        id: "supportContact.serviceCard",
        name: "在线客服区",
        family: "SupportContact",
        component: "support_contact",
        feature: "support_contact",
        size: "1x1",
        defaultZone: "rail",
        reason: "展示客服或客户经理入口，不编造在线状态。",
      },
      app_download: {
        id: "appDownload.qrCard",
        name: "APP 下载区",
        family: "AppDownload",
        component: "app_download",
        feature: "app_download",
        size: "1x1",
        defaultZone: "rail",
        reason: "展示后台配置的 APP、MT5 或移动端下载入口。",
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
    const tradingCostIntent = wantsTradingCostWorkbenchPrompt(source);
    const goals = [];
    let audience = "综合交易客户";
    let tone = "稳健清晰";

    if (includesAny(text, ["资产管理", "总资产", "多币种", "钱包列表", "资产配置", "可用资金", "保证金占用", "风险等级", "账户资产", "账号资产"])) {
      audience = "资产管理客户";
      tone = "清爽专业";
      goals.push("资产概览", "钱包管理", "账号表现");
    }

    if (includesAny(text, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) {
      audience = "高净值 / 机构客户";
      tone = "高端信任";
      goals.push("资产信任", "入金转化");
    }

    if (includesAny(text, ["新手", "新客", "开户", "注册", "kyc", "首次", "账户开通", "开通进度"])) {
      audience = "新开户客户";
      tone = "清晰引导";
      goals.push("开户路径", "首次入金");
    }

    if (includesAny(text, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化"])) {
      audience = audience === "综合交易客户" ? "活动转化客户" : audience;
      tone = "高能转化";
      goals.push("活动曝光", "快速参与");
    }

    if (tradingCostIntent || (audience !== "资产管理客户" && includesAny(text, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账户列表", "账号列表", "点差", "佣金", "执行效率"]))) {
      audience = tradingCostIntent || audience === "综合交易客户" ? "活跃交易客户" : audience;
      tone = tone === "稳健清晰" ? "专业高效" : tone;
      goals.push("账号管理", "交易效率");
    }

    if (includesAny(text, ["ib", "代理", "渠道", "邀请", "推荐好友", "裂变", "开户链接"])) {
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
    if (includesAny(signal, ["强", "明显", "大胆", "沉浸", "高对比", "差异化", "个性化", "意图", "更多方案", "多方案", "样式更多", "vip", "高净值", "黑金", "活动", "大赛"])) return "strong";
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

	  function homepageHasSlot(config, slot) {
	    return (
	      (Array.isArray(config.sections) && config.sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot))) ||
	      (Array.isArray(config.layout) && config.layout.some((block) => block.component === slot)) ||
	      (Array.isArray(config.brickPlan) && config.brickPlan.some((brick) => brick.component === slot || brick.feature === slot))
	    );
	  }

	  function enforceWelcomeHeaderTop(config) {
	    if (!homepageHasSlot(config, "welcome_header")) return config;

	    const existingBlock = (Array.isArray(config.layout) ? config.layout : []).find((block) => block.component === "welcome_header");
	    const welcomeBlock = {
	      ...(existingBlock || {}),
	      id: "welcome-header",
	      component: "welcome_header",
	      slot: "hero",
	      priority: 0,
	      props: clone(COMPONENT_PROPS_SCHEMA.welcome_header),
	      brickId: existingBlock?.brickId || "system.welcomeHeader",
	      brickName: existingBlock?.brickName || "欢迎头部",
	      brickFamily: existingBlock?.brickFamily || "WelcomeHeader",
	      brickSize: "3x1",
	      brickZone: "hero",
	      brickReason: "欢迎栏如果出现，固定作为页面顶部的轻量横栏。",
	    };

	    config.sections = (Array.isArray(config.sections) ? config.sections : [])
	      .map((section) => ({ ...section, slots: (section.slots || []).filter((slot) => slot !== "welcome_header") }))
	      .filter((section) => section.slots.length);
	    const welcomeSectionType = pageIntentFromConfig(config) === "deposit" ? "full" : "hero";
	    config.sections.unshift({ id: "welcome-header", type: welcomeSectionType, title: "欢迎", slots: ["welcome_header"] });
	    config.layout = [welcomeBlock].concat((Array.isArray(config.layout) ? config.layout : []).filter((block) => block.component !== "welcome_header"));
	    config.brickPlan = (Array.isArray(config.brickPlan) ? config.brickPlan : [])
	      .filter((brick) => brick.component !== "welcome_header" && brick.feature !== "welcome_header");

	    return config;
	  }

	  function removeHomepageSlot(config, slot) {
	    config.sections = (Array.isArray(config.sections) ? config.sections : [])
	      .map((section) => ({ ...section, slots: (section.slots || []).filter((item) => item !== slot) }))
	      .filter((section) => section.slots.length);
	    return config;
	  }

	  function enforceAssetOverviewHeroFocus(config) {
	    if (config.heroFocus !== "asset_overview" || !homepageHasSlot(config, "asset_overview")) return config;
	    const assetIndex = (Array.isArray(config.sections) ? config.sections : []).findIndex((section) => section.slots?.includes("asset_overview"));
	    const onboardingIndex = (Array.isArray(config.sections) ? config.sections : []).findIndex((section) => section.slots?.includes("onboarding_guide"));
	    if (assetIndex >= 0 && assetIndex <= 1 && (onboardingIndex < 0 || assetIndex < onboardingIndex)) return config;
	    const hadWelcome = homepageHasSlot(config, "welcome_header");
	    const hadQuick = homepageHasSlot(config, "quick_actions");
	    const hadOnboarding = homepageHasSlot(config, "onboarding_guide");
	    removeHomepageSlot(config, "asset_overview");
	    if (hadWelcome) removeHomepageSlot(config, "welcome_header");
	    if (hadQuick && hadOnboarding) {
	      removeHomepageSlot(config, "quick_actions");
	      removeHomepageSlot(config, "onboarding_guide");
	    }

	    if (hadWelcome) {
	      config.sections.unshift({ id: "hero-asset-overview", type: "hero", title: "首页概览", slots: ["welcome_header", "asset_overview"] });
	    } else if (config.sections[0]?.type === "hero" && config.sections[0].slots.length < 2) {
	      config.sections[0] = { ...config.sections[0], slots: [...new Set([...config.sections[0].slots, "asset_overview"])] };
	    } else {
	      config.sections.unshift({ id: "hero-asset-overview", type: "hero", title: "资产概览", slots: ["asset_overview"] });
	    }

	    if (hadQuick && hadOnboarding) {
	      config.sections.splice(
	        Math.min(1, config.sections.length),
	        0,
	        { id: "quick-actions", type: "full", title: "快捷操作", slots: ["quick_actions"] },
	        { id: "onboarding-journey", type: "full", title: "开户引导", slots: ["onboarding_guide"] },
	      );
	    }
	    config.sections = normalizeSections(config.sections);
	    config.layout = layoutFromSections(config.sections);
	    return config;
	  }

	  function enforceJourneyTimelineFullRow(config) {
	    const needsFullRowJourney =
      config?.moduleStyles?.onboardingProgress === "journey-timeline" ||
      config?.moduleStyles?.onboardingProgress === "guide-cards" ||
      config?.moduleStyles?.onboardingProgress === "mission-board" ||
      config?.moduleStyles?.onboardingProgress === "next-step-hero" ||
      config?.modules?.OnboardingProgress?.variant === "journeyTimeline" ||
      config?.modules?.OnboardingProgress?.variant === "guideCards" ||
      config?.modules?.OnboardingProgress?.variant === "missionBoard" ||
      config?.modules?.OnboardingProgress?.variant === "nextStepHero";
	    if (!needsFullRowJourney || !homepageHasSlot(config, "onboarding_guide")) return config;

	    config.sections = (Array.isArray(config.sections) ? config.sections : [])
	      .map((section) => {
	        const slots = (section.slots || []).filter((slot) => slot !== "onboarding_guide");
	        return { ...section, type: section.type === "split" && slots.length === 1 ? "full" : section.type, slots };
	      })
	      .filter((section) => section.slots.length);
	    const depositHeroIndex =
	      pageIntentFromConfig(config) === "deposit"
	        ? config.sections.findIndex((section) => section.slots?.includes("promo_banner") || section.slots?.includes("asset_overview"))
	        : -1;
	    const insertIndex = depositHeroIndex >= 0 ? depositHeroIndex + 1 : config.sections[0]?.slots?.includes("welcome_header") ? 1 : 0;
	    config.sections.splice(insertIndex, 0, { id: "onboarding-journey", type: "full", title: "开户进度", slots: ["onboarding_guide"] });

	    config.layout = (Array.isArray(config.layout) ? config.layout : []).map((block) =>
	      block.component === "onboarding_guide"
	        ? { ...block, slot: "full", priority: Math.min(Number(block.priority) || 20, 8), brickSize: "3x1", brickZone: "full" }
	        : block,
	    );
	    config.layout.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));

	    return config;
	  }

	  function enforceRiskDisclosureFooter(config) {
	    const settings = config.moduleSettings || {};
	    const riskEnabled = Boolean(settings.riskDisclosure?.enabled || homepageHasSlot(config, "risk_disclosure"));
	    if (!riskEnabled) return config;

	    const riskBrick = brickById("riskDisclosure.legalStrip");
	    const maxPriority = Array.isArray(config.layout) && config.layout.length ? Math.max(...config.layout.map((block) => Number(block.priority) || 0)) : 100;
	    const existingBlock = (Array.isArray(config.layout) ? config.layout : []).find((block) => block.component === "risk_disclosure");
	    const riskBlock = {
	      ...(existingBlock || {}),
	      id: "risk-disclosure-footer",
	      component: "risk_disclosure",
	      slot: "full",
	      priority: maxPriority + 100,
	      props: clone(COMPONENT_PROPS_SCHEMA.risk_disclosure),
	      brickId: riskBrick?.id || "riskDisclosure.legalStrip",
	      brickName: riskBrick?.name || "底部合规风险披露",
	      brickFamily: "RiskDisclosure",
	      brickSize: "3x1",
	      brickZone: "full",
	      brickReason: riskBrick?.reason || "风险披露固定在页面底部，承载后台富文本合规文案。",
	    };

	    config.moduleStyles = { ...(config.moduleStyles || {}), risk_disclosure: "legal-strip" };
	    config.modules = { ...(config.modules || {}), RiskDisclosure: { variant: "legalStrip" } };
	    config.moduleSettings = {
	      ...(config.moduleSettings || {}),
	      riskDisclosure: { ...(settings.riskDisclosure || {}), enabled: true },
	    };

	    config.sections = (Array.isArray(config.sections) ? config.sections : [])
	      .map((section) => ({ ...section, slots: (section.slots || []).filter((slot) => slot !== "risk_disclosure") }))
	      .filter((section) => section.slots.length);
	    config.sections.push({
	      id: "risk-disclosure-footer",
	      type: "full",
	      title: "风险提示",
	      variant: "legal-strip",
	      slots: ["risk_disclosure"],
	    });

	    config.layout = (Array.isArray(config.layout) ? config.layout : []).filter((block) => block.component !== "risk_disclosure").concat(riskBlock);
	    config.brickPlan = (Array.isArray(config.brickPlan) ? config.brickPlan : [])
	      .filter((brick) => brick.component !== "risk_disclosure" && brick.feature !== "risk_disclosure")
	      .concat([
	        {
	          brickId: riskBlock.brickId,
	          brickName: riskBlock.brickName,
	          family: "RiskDisclosure",
	          feature: "risk_disclosure",
	          component: "risk_disclosure",
	          size: "3x1",
	          zone: "full",
	          reason: riskBlock.brickReason,
	        },
	      ]);

	    return config;
	  }

	  function sanitizeCanonicalHomepageConfig(config, sourceConfig = {}) {
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
    settings.userKycRail = {
      ...(settings.userKycRail || {}),
      enabled: Boolean(settings.userKycRail?.enabled),
      kycStatus: ["verified", "pending", "reviewing", "rejected"].includes(settings.userKycRail?.kycStatus)
        ? settings.userKycRail.kycStatus
        : "verified",
    };
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
	        if (slot === "kyc_status_card") settings.userKycRail = { ...(settings.userKycRail || {}), enabled: true };
	        if (slot === "announcements") settings.announcements = { ...(settings.announcements || {}), enabled: true };
        if (slot === "market_news") settings.marketNews = { ...(settings.marketNews || {}), enabled: true };
        if (slot === "risk_disclosure") settings.riskDisclosure = { ...(settings.riskDisclosure || {}), enabled: true };
        if (slot === "faq_section") settings.faq = { ...(settings.faq || {}), enabled: true };
        if (slot === "support_contact") settings.supportContact = { ...(settings.supportContact || {}), enabled: true };
        if (slot === "app_download") settings.appDownload = { ...(settings.appDownload || {}), enabled: true };
      });
    });
    if (settings.openAccount) settings.openAccount.bind = false;
    if (settings.quickActions) {
      settings.quickActions.actions = [];
    }
    const optionalSlotSettings = {
      risk_disclosure: "riskDisclosure",
      faq_section: "faq",
      support_contact: "supportContact",
      app_download: "appDownload",
    };
    const disabledOptionalSlots = new Set(
      Object.entries(optionalSlotSettings)
        .filter(([, key]) => !settings[key]?.enabled)
        .map(([slot]) => slot),
    );
    if (disabledOptionalSlots.size) {
      next.sections = next.sections
        .map((section) => ({ ...section, slots: section.slots.filter((slot) => !disabledOptionalSlots.has(slot)) }))
        .filter((section) => section.slots.length);
      next.layout = next.layout.filter((block) => !disabledOptionalSlots.has(block.component));
      next.brickPlan = next.brickPlan.filter((brick) => !disabledOptionalSlots.has(brick.component));
	    }
	    next.moduleSettings = settings;
	    enforceWelcomeHeaderTop(next);
	    enforceAssetOverviewHeroFocus(next);
	    enforceJourneyTimelineFullRow(next);
	    enforceRiskDisclosureFooter(next);

	    return next;
	  }

  function runtimePagePlanText(value, fallback = "", limit = 80) {
    if (value && typeof value === "object") return cleanMetaText(value.label || value.title || value.action || fallback, fallback, limit);
    return cleanMetaText(value, fallback, limit);
  }

  function homepageRuntimePlanWeight(slot, mainVisual = "") {
    const key = canonicalHomeBlock(slot) || cleanMetaText(slot, "", 80);
    if (key && key === mainVisual) return 100;
    return {
      welcome_header: 25,
      asset_overview: 80,
      onboarding_guide: 78,
      trading_account_highlight: 76,
      trading_accounts_list: 68,
      quick_actions: 56,
      wallet_list: 50,
      promo_banner: 52,
      pamm_products: 48,
      copytrading_signals: 58,
      referral_link_card: 42,
      kyc_status_card: 46,
      announcements: 34,
      market_news: 34,
      faq_section: 30,
      support_contact: 32,
      app_download: 32,
      risk_disclosure: 24,
    }[key] || 40;
  }

  function homepageRuntimePlanGroups(visibleModules = [], mainVisual = "", pageGoal = "") {
    const visibleSet = new Set((Array.isArray(visibleModules) ? visibleModules : []).map(canonicalHomeBlock).filter(Boolean));
    const pick = (items) => items.map(canonicalHomeBlock).filter((slot) => slot && visibleSet.has(slot));
    const groups = [
      {
        id: "activation_overview",
        title: "账户启动区",
        role: "primary",
        surface: "connected-panel",
        guidance: "欢迎、开户进度、资产状态和下一步动作可以同屏成组，但资产概览和快捷入口必须保留独立模块边界，不用共享外壳硬粘。",
        modules: pick(["welcome_header", "onboarding_guide", "asset_overview", "quick_actions", "kyc_status_card"]),
      },
      {
        id: "opportunities",
        title: "交易机会区",
        role: "support",
        surface: "light-section",
        guidance: "活动、跟单、PAMM、公告和推广链接降低权重，作为增长辅助内容。",
        modules: pick(["promo_banner", "copytrading_signals", "pamm_products", "announcements", "market_news", "referral_link_card"]),
      },
      {
        id: "account_workspace",
        title: "账户与交易区",
        role: "proof",
        surface: "shared-workbench",
        guidance: "账号列表、账号表现和钱包信息使用统一工作台语言。",
        modules: pick(["trading_account_highlight", "trading_accounts_list", "wallet_list"]),
      },
      {
        id: "support_compliance",
        title: "帮助与合规区",
        role: "decision",
        surface: "minimal",
        guidance: "FAQ、客服、下载和风险披露只做低干扰收口。",
        modules: pick(["faq_section", "support_contact", "app_download", "risk_disclosure"]),
      },
    ].filter((group) => group.modules.length);
    const goalOrder = {
      deposit: ["activation_overview", "opportunities", "account_workspace", "support_compliance"],
      copytrading: ["opportunities", "activation_overview", "account_workspace", "support_compliance"],
      pamm: ["opportunities", "activation_overview", "account_workspace", "support_compliance"],
      trading: ["account_workspace", "activation_overview", "opportunities", "support_compliance"],
      startTrading: ["account_workspace", "activation_overview", "opportunities", "support_compliance"],
      contactSupport: ["activation_overview", "support_compliance", "account_workspace", "opportunities"],
      downloadApp: ["activation_overview", "support_compliance", "account_workspace", "opportunities"],
    }[pageGoal] || ["activation_overview", "account_workspace", "opportunities", "support_compliance"];
    return groups
      .map((group) => ({
        ...group,
        visualWeight: Math.max(...group.modules.map((slot) => homepageRuntimePlanWeight(slot, mainVisual))),
      }))
      .sort((first, second) => {
        const firstHasMain = first.modules.includes(mainVisual);
        const secondHasMain = second.modules.includes(mainVisual);
        if (firstHasMain !== secondHasMain) return firstHasMain ? -1 : 1;
        return goalOrder.indexOf(first.id) - goalOrder.indexOf(second.id);
      })
      .slice(0, 4);
  }

  function homepageRuntimePlanLooksUsable(plan = {}) {
    if (!plan || typeof plan !== "object") return false;
    return Boolean(
      runtimePagePlanText(plan.pageGoal, "", 40) ||
        runtimePagePlanText(plan.mainVisual, "", 48) ||
        Object.keys(plan.visualHierarchy || {}).length ||
        Object.keys(plan.moduleRoles || {}).length ||
        (Array.isArray(plan.compositionGroups) && plan.compositionGroups.length),
    );
  }

  function normalizeHomepageRuntimePagePlan(plan, source = {}, sections = [], heroFocus = "") {
    const sourcePlan = plan && typeof plan === "object" ? plan : {};
    if (homepageRuntimePlanLooksUsable(sourcePlan)) {
      return {
        ...clone(sourcePlan),
        pageGoal: runtimePagePlanText(sourcePlan.pageGoal, "", 40),
        primaryCta: runtimePagePlanText(sourcePlan.primaryCta || sourcePlan.primaryAction, "", 80),
        mainVisual: canonicalHomeBlock(sourcePlan.mainVisual) || cleanMetaText(sourcePlan.mainVisual, "", 48),
      };
    }
    const visibleModules = [
      ...new Set(
        (Array.isArray(sections) ? sections : [])
          .flatMap((section) => (Array.isArray(section?.slots) ? section.slots : []))
          .map(canonicalHomeBlock)
          .filter(Boolean),
      ),
    ];
    if (!visibleModules.length) return null;
    const pageIntent = source.pageIntent && typeof source.pageIntent === "object" ? source.pageIntent : {};
    const mainVisual = visibleModules.includes(heroFocus) ? heroFocus : visibleModules[0] || heroFocus || "";
    const pageGoal = runtimePagePlanText(source.pageGoal || pageIntent.pageGoal || pageIntent.primaryIntent || "", "", 40);
    const primaryCta = runtimePagePlanText(source.primaryCta || pageIntent.primaryCta || pageIntent.primaryAction || "", "", 80);
    const visualHierarchy = Object.fromEntries(visibleModules.map((slot) => [slot, homepageRuntimePlanWeight(slot, mainVisual)]));
    const compositionGroups = homepageRuntimePlanGroups(visibleModules, mainVisual, pageGoal);
    return {
      planVersion: 1,
      inferred: true,
      pageGoal,
      primaryCta,
      mainVisual,
      layoutStrategy: "grouped-workbench",
      compositionGroups,
      visualHierarchy,
      moduleRoles: Object.fromEntries(
        visibleModules.map((slot) => [
          slot,
          {
            role: slot === mainVisual ? "primary" : visualHierarchy[slot] >= 70 ? "proof" : visualHierarchy[slot] >= 50 ? "support" : "decision",
            weight: visualHierarchy[slot],
          },
        ]),
      ),
      compositionRules: [
        "全页只能有一个最高视觉权重模块。",
        "页面优先组织成 3-4 个业务组，不要把每个 slot 拆成独立 section。",
        "同一业务组共享节奏和间距，但不同业务模块必须保留可见卡片边界；asset_overview 与 quick_actions 只允许同屏分栏，不合成一个视觉模块。",
        "FAQ、风险、客服、活动等低权重模块必须低干扰收口。",
      ],
    };
  }

	  function normalizeConfig(config) {
	    const source = config && typeof config === "object" ? config : {};
    const emphasis = source.emphasis && typeof source.emphasis === "object" ? source.emphasis : {};
    const moduleSettings = normalizeModuleSettings(source.moduleSettings);
    const legacySections = !source.sections && source.moduleOrder ? sectionsFromLegacyOrder(source.moduleOrder) : null;
    const sourceBrickPlan = enforceBrickPlanSafety(normalizeBrickPlan(source.brickPlan), moduleSettings);
    const componentReferences = normalizeHomepageComponentReferences(source.componentReferences);
    const brickSections =
      !source.sections && !legacySections && sourceBrickPlan.length
        ? sectionsFromBrickPlan(sourceBrickPlan, { label: cleanMetaText(source.name, "AI 积木编排", 28) })
        : null;
    let sections = normalizeSections(source.sections || legacySections || brickSections || DEFAULT_CONFIG.sections);
    const requiredSectionShell = { sections };
    ensureSectionContains(requiredSectionShell, { id: "trading-accounts", type: "full", title: "交易账号" }, "trading_accounts_list");
    sections = requiredSectionShell.sections;
    const layoutPreset = normalizeLayoutPreset(source.layoutPreset || (typeof source.layout === "string" ? source.layout : ""));
    const modules = normalizeModuleVariants(source, componentReferences);
    const hasExplicitLayout = Array.isArray(source.layout);
    const explicitLayoutCoversSections = hasExplicitLayout && layoutCoversSections(source.layout, sections);
    const shouldUseExplicitLayout =
      hasExplicitLayout &&
      (source.generationMode === "brick-v2" || (!source.sections && !legacySections)) &&
      (!source.sections || explicitLayoutCoversSections);
    const normalizedLayout = normalizeHomepageLayout(shouldUseExplicitLayout ? source.layout : null, sections);
    const moduleStyles = normalizeModuleStyles(source.moduleStyles, modules, componentReferences);
	    const themePreset = normalizeThemeId(source.themePreset || source.theme);
	    const personalizationStrength = normalizePersonalizationStrength(source.personalizationStrength);
	    const designGenome = normalizeDesignGenome(source.designGenome || source.layoutGene || source.genome, designGenomeForLayout(layoutPreset));
	    const pageStory = normalizePageStory(source.pageStory || source.heroNarrative || source.story, DESIGN_GENOMES[designGenome]?.story || "opsClarity");
	    const rawStyleContract =
	      (source.styleContract && typeof source.styleContract === "object" ? source.styleContract : null) ||
	      (source.goldenStyleContract && typeof source.goldenStyleContract === "object" ? source.goldenStyleContract : null);
	    const styleContract = rawStyleContract ? normalizeSkeletonDesignContract(rawStyleContract, SKELETON_STYLE_CONTRACTS.accountOpsConsole) : null;
	    const themeCustomSource = source.themeCustom || source.customTheme || source.themeCustomInput || styleContract?.themeCustom;
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
    const renderMode = normalizeHomepageRenderMode(
      source.renderMode,
      source.skeletonHtmlEnabled ? "skeletonHtml" : source.htmlGenerationEnabled ? "compare" : "config",
    );
	    const htmlScheme = normalizeAiHtmlScheme(source.htmlScheme, renderModeWantsAiHtml(renderMode) || Boolean(source.htmlGenerationEnabled));
	    const skeletonHtmlScheme = normalizeSkeletonHtmlScheme(source.skeletonHtmlScheme, renderModeWantsSkeletonHtml(renderMode) || Boolean(source.skeletonHtmlEnabled));
	    const requestedActiveRenderMode = source.activeRenderMode || (renderMode === "aiHtml" ? "aiHtml" : renderMode === "skeletonHtml" ? "skeletonHtml" : "config");
	    let activeRenderMode = "config";
	    if (requestedActiveRenderMode === "aiHtml" && htmlScheme.enabled) activeRenderMode = "aiHtml";
	    if (requestedActiveRenderMode === "skeletonHtml" && (skeletonHtmlScheme.enabled || renderModeWantsSkeletonHtml(renderMode))) activeRenderMode = "skeletonHtml";
    const heroFocus = componentFromFeature(source.heroFocus || DEFAULT_CONFIG.heroFocus);
    const pagePlan = normalizeHomepageRuntimePagePlan(source.pagePlan, source, sections, heroFocus);

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
	      themeCustom: normalizeThemeCustom(themeCustomSource),
	      styleContract,
	      goldenStyleContract: source.goldenStyleContract && typeof source.goldenStyleContract === "object" ? styleContract : null,
	      colorMode: normalizeHomeColorMode(source.colorMode || source.themeMode || source.appearanceMode || source.homeColorMode),
      personalizationStrength,
      modules,
      moduleVariants: Object.keys(modules).reduce((variants, moduleId) => {
        variants[moduleId] = modules[moduleId].variant;
        return variants;
      }, {}),
      density: ["compact", "comfortable", "balanced", "spacious"].includes(source.density) ? source.density : DEFAULT_CONFIG.density,
	      heroFocus,
      moduleStyles,
      componentMorphs: normalizeComponentMorphs(source.componentMorphs, modules, moduleStyles, componentReferences),
      moduleSettings,
      sections,
      autoLayout: normalizeAutoLayout(source.autoLayout, sections, layout),
      emphasis: {
        deposit: ["low", "medium", "high"].includes(emphasis.deposit) ? emphasis.deposit : DEFAULT_CONFIG.emphasis.deposit,
        openAccount: ["low", "medium", "high"].includes(emphasis.openAccount) ? emphasis.openAccount : DEFAULT_CONFIG.emphasis.openAccount,
        promo: ["low", "medium", "high"].includes(emphasis.promo) ? emphasis.promo : DEFAULT_CONFIG.emphasis.promo,
        accounts: ["low", "medium", "high"].includes(emphasis.accounts) ? emphasis.accounts : DEFAULT_CONFIG.emphasis.accounts,
      },
      heroTitleKey: i18nKey(source.heroTitleKey, COMPONENT_PROPS_SCHEMA.welcome_header.titleKey),
      heroSubtitleKey: i18nKey(source.heroSubtitleKey, COMPONENT_PROPS_SCHEMA.welcome_header.subtitleKey),
      aiSummary: String(source.aiSummary || DEFAULT_CONFIG.aiSummary).slice(0, 260),
      sourcePrompt: cleanMetaText(source.sourcePrompt, "", 1000),
      brickPlan,
      componentReferences,
      componentRenderPolicy:
        source.componentRenderPolicy && typeof source.componentRenderPolicy === "object"
          ? {
              mode: cleanMetaText(source.componentRenderPolicy.mode, "", 48),
              minimumRendererScore: Number.isFinite(Number(source.componentRenderPolicy.minimumRendererScore))
                ? Math.max(1, Math.min(10, Math.round(Number(source.componentRenderPolicy.minimumRendererScore))))
                : 8,
              fallbackWhenGeneratedScoreBelow: Number.isFinite(Number(source.componentRenderPolicy.fallbackWhenGeneratedScoreBelow))
                ? Math.max(0, Math.min(100, Math.round(Number(source.componentRenderPolicy.fallbackWhenGeneratedScoreBelow))))
                : 68,
              appliedModules: (Array.isArray(source.componentRenderPolicy.appliedModules) ? source.componentRenderPolicy.appliedModules : [])
                .map((module) => moduleKeyFor(module))
                .filter(Boolean)
                .slice(0, 12),
              source: cleanMetaText(source.componentRenderPolicy.source, "", 48),
            }
          : null,
      brickTrace: normalizeBrickTrace(source.brickTrace),
      dataContract: normalizeDataContract(source.dataContract),
      pageIntent: source.pageIntent && typeof source.pageIntent === "object" ? clone(source.pageIntent) : null,
	      pagePlan,
      compositionStrategy: cleanMetaText(source.compositionStrategy, "", 260),
      annotations: Array.isArray(source.annotations) ? source.annotations.slice(0, 24) : [],
      renderMode,
      htmlGenerationEnabled: htmlScheme.enabled,
      skeletonHtmlEnabled: skeletonHtmlScheme.enabled || renderModeWantsSkeletonHtml(renderMode),
      activeRenderMode,
      htmlScheme,
      skeletonHtmlScheme,
      publishedRenderMode: normalizeHomepageRenderMode(source.publishedRenderMode, ""),
      publishedRenderModeLabel: cleanMetaText(source.publishedRenderModeLabel, "", 32),
      publishedAt: cleanMetaText(source.publishedAt, "", 48),
	      validationErrors: normalizedLayout.validationErrors,
	    };

	    if (normalized.styleContract && normalized.skeletonHtmlScheme?.enabled) {
	      normalized.skeletonHtmlScheme = {
	        ...normalized.skeletonHtmlScheme,
	        designContract: normalizeSkeletonDesignContract(
	          mergeSkeletonDesignContracts(normalized.skeletonHtmlScheme.designContract, normalized.styleContract),
	          normalized.styleContract,
	        ),
	      };
	    }

	    if (renderModeWantsSkeletonHtml(renderMode) && !normalized.skeletonHtmlScheme.enabled) {
      normalized.skeletonHtmlScheme = buildSkeletonHtmlScheme(normalized, {
        reason: "按当前首页配置生成整页 slot 骨架。",
        sourceType: "local-skeleton",
      });
      normalized.skeletonHtmlEnabled = true;
      normalized.activeRenderMode = requestedActiveRenderMode === "skeletonHtml" ? "skeletonHtml" : normalized.activeRenderMode;
    }

    return sanitizeCanonicalHomepageConfig(applyPageGovernanceRules(normalized, source), source);
  }

  function presetToConfig(preset, prompt) {
    return normalizeConfig({
      schemaVersion: 4,
      blueprintVersion: 4,
      name: preset.name,
      layoutPreset: preset.layout,
      themePreset: preset.themePreset || preset.theme,
      theme: preset.themePreset || preset.theme,
      colorMode: colorModeFromPromptText(prompt),
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
    if (includesAny(text, ["新手", "新客", "开户", "注册", "kyc", "首次", "账户开通", "开通进度"])) return match("onboarding-path");
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
    if (includesAny(lower + text, ["翡翠", "信任绿", "资金安全绿", "emerald"])) setTheme("emeraldTrust");
    if (includesAny(lower + text, ["钴蓝", "青绿", "青蓝科技", "teal", "cobalt"])) setTheme("cobaltTeal");
    if (includesAny(lower + text, ["赤红", "红色活动", "红橙", "crimson"])) setTheme("crimsonPromo");
    if (includesAny(lower + text, ["石墨", "银色", "机构灰", "graphite", "silver"])) setTheme("graphiteSilver");
    if (!includesAny(lower + text, ["机构灰"]) && includesAny(lower + text, ["高净值", "vip", "黑金", "尊贵", "机构"])) setTheme("blackGold");
    if (includesAny(lower + text, ["极简", "白色", "极简白", "minimal"])) setTheme("minimalWhite");

    config.colorMode = colorModeFromPromptText(prompt, config.colorMode);

    config.personalizationStrength = inferPersonalizationStrength(prompt, config);

    if (includesAny(lower + text, ["紧凑", "密集", "信息多", "大面积空白", "空白区域", "大空白", "少留白", "减少留白", "不要留白", "压缩留白", "空间利用", "利用空间", "空间利用率", "省空间", "压缩高度"])) config.density = "compact";
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

    const rejectsAnnouncements = /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:公告|通知|维护|平台消息)/.test(text);
    if (!rejectsAnnouncements && includesAny(lower + text, ["公告", "通知", "维护", "平台消息"])) {
      const wantsTicker = includesAny(lower + text, ["跑马灯", "滚动公告", "公告滚动", "首页第一栏", "顶部公告", "首栏公告"]);
      mergeModuleSettings(config, { announcements: { enabled: true } });
      mergeModuleStyles(config, { announcements: wantsTicker ? "ticker-strip" : "list" });
      if (wantsTicker) {
        moveSlot(config, "announcements", "front");
      } else {
        ensureSectionContains(config, { id: "announcements", type: "split", title: "公告通知" }, "announcements");
      }
    }

    config.layout = layoutFromSections(config.sections);
    return normalizeConfig(config);
  }

		  function wantsRealAccountCards(text) {
		    const source = String(text || "");
		    if (/卡片[\s\S]{0,8}(?:不要|不能|不应|别|禁止)|(?:不要|不能|不应|别|禁止)[\s\S]{0,16}卡片/.test(source)) return false;
		    return /真实(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(source) || /卡片[\s\S]{0,32}真实(?:交易)?账(?:号|户)/.test(source);
		  }

		  function wantsTradingAccountCards(text) {
		    const source = String(text || "");
		    if (/卡片[\s\S]{0,8}(?:不要|不能|不应|别|禁止)|(?:不要|不能|不应|别|禁止)[\s\S]{0,16}卡片/.test(source)) return false;
		    return (
		      wantsRealAccountCards(source) ||
	      /模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(source) ||
	      /卡片[\s\S]{0,32}模拟(?:交易)?账(?:号|户)/.test(source) ||
	      /交易账(?:号|户)[\s\S]{0,24}卡片/.test(source)
	    );
	  }

	  function wantsFourColumnTradingAccountCards(text) {
	    const source = String(text || "");
	    if (/(?:不要|不能|不应|别|禁止)(?:用|使用|展示|做成)?\s*卡片|(?:不是|非)卡片/.test(source)) return false;
	    const wantsCards = /卡片|card/i.test(source);
	    const wantsFourAcross =
	      /一行[\s\S]{0,16}(?:至少|最少|不少于|能|可|可以)?[\s\S]{0,10}(?:放|展示|容纳|排)[\s\S]{0,8}(?:4|四)\s*个?[\s\S]{0,8}卡片/i.test(source) ||
	      /(?:4|四)\s*个?[\s\S]{0,8}卡片[\s\S]{0,16}(?:一行|同一行|每行)/i.test(source);
	    const wantsModerateWidth = /卡片[\s\S]{0,18}(?:宽度适中|不要过大|不(?:要)?太大|适中)|(?:宽度适中|不要过大|不(?:要)?太大)[\s\S]{0,18}卡片/.test(source);
	    return wantsCards && (wantsFourAcross || wantsModerateWidth);
	  }

	  function wantsDemoAccountList(text) {
	    const source = String(text || "");
	    return /模拟(?:交易)?账(?:号|户)(?:列表)?/.test(source) || /demo\s*(account\s*)?list/i.test(source);
	  }

	  function wantsTradingAccountList(text) {
	    const source = String(text || "");
	    return /交易账(?:号|户)[\s\S]{0,24}(?:列表|表格)|账(?:号|户)[\s\S]{0,12}(?:列表|表格)|列表形式|表格形式|不是卡片|非卡片|live\s*(account\s*)?list|demo\s*(account\s*)?list/i.test(source);
	  }

	  function wantsTradingAccountSingleViewCorrection(text) {
	    const source = String(text || "");
	    return /交易账(?:号|户)[\s\S]{0,48}(?:重复|叠加|两套|同时|混在一起|上方[\s\S]{0,16}下方|卡片[\s\S]{0,16}表格|摘要[\s\S]{0,16}表格)|账号卡片[\s\S]{0,28}(?:重复|叠加|表格|模块太多|重点太多|信息太多)|小卡片[\s\S]{0,28}(?:模块太多|重点太多|信息太多)|卡片(?:的)?问题|内容重复|模块套模块/.test(source);
	  }

	  function applyTradingAccountsListContract(config) {
	    mergeModuleVariants(config, { TradingAccounts: "separatedList" });
	    mergeModuleStyles(config, { tradingAccounts: "calm-table" });
	    mergeModuleSettings(config, {
	      tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
	    });
	  }

		  function wantsTradingAccountStyleVariety(text) {
		    const source = String(text || "");
		    return /交易账(?:号|户)[\s\S]{0,40}(?:灵活|变化|智能|多版式|多种样式|不固定|不要总是卡片)|(?:卡片|card)[\s\S]{0,16}(?:列表|表格|list|table)|(?:列表|表格|list|table)[\s\S]{0,16}(?:卡片|card)|耳目一新|明显区别|明显差异|不沿用上一版|不要沿用上一版|不要只换颜色|不能只是换颜色|布局骨架|重排模块|重排\s*sections/i.test(source);
		  }

  function wantsFlatAccountOptimization(text) {
    const source = String(text || "");
    return /简洁|扁平|平铺|降噪|少重点|主次|视觉优化|排版不行|指标(?:排版|布局)|模块内[\s\S]{0,12}模块|不要[\s\S]{0,12}嵌套|小卡片[\s\S]{0,18}(?:模块太多|重点太多|信息太多)|卡片[\s\S]{0,18}(?:模块太多|重点太多|信息太多)/.test(source);
  }

  function wantsAccountCardRefinement(text) {
    const source = String(text || "");
    return /交易账(?:号|户)[\s\S]{0,36}卡片|账号卡片|账户卡片|小卡片|卡片[\s\S]{0,18}(?:排版|视觉|优化|模块太多|重点太多|信息太多)/.test(source);
  }

	  function applyTradingAccountPresentationVariety(config, prompt) {
	    const settings = config.moduleSettings?.tradingAccounts || {};
	    if (!settings.enabled) return;

	    const source = String(prompt || "");
	    if (wantsFourColumnTradingAccountCards(source)) {
	      mergeModuleVariants(config, { TradingAccounts: "denseCards" });
	      mergeModuleStyles(config, { tradingAccounts: "dense-cards", trading_accounts_list: "dense-cards" });
	      mergeModuleSettings(config, {
	        tradingAccounts: {
	          enabled: true,
	          realEnabled: true,
	          demoEnabled: true,
	          grouping: "combined",
	          viewMode: "card",
	          realViewMode: "card",
	          demoViewMode: "card",
	          preferredColumns: 4,
	        },
	      });
	      return;
	    }
	    const explicitCards = wantsTradingAccountCards(source);
		    const explicitList = wantsTradingAccountList(source);
		    const wantsVariety = wantsTradingAccountStyleVariety(source);
		    const preferNonCard = /耳目一新|明显区别|明显差异|不沿用上一版|不要沿用上一版|不要只换颜色|不能只是换颜色|布局骨架|重排模块|重排\s*sections/i.test(source);

    if (wantsTradingAccountSingleViewCorrection(source)) {
      applyTradingAccountsListContract(config);
      return;
    }
	    if (!wantsVariety && (isTradingCostWorkbenchConfig(config) || (settings.grouping === "separated" && settings.viewMode === "list"))) return;
	    if (explicitCards && !wantsVariety) return;
	    if (explicitList && !wantsVariety) {
	      mergeModuleVariants(config, { TradingAccounts: "separatedList" });
	      mergeModuleStyles(config, { tradingAccounts: "calm-table" });
	      mergeModuleSettings(config, {
	        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
	      });
	      return;
	    }

		    const styleSeeds = preferNonCard
		      ? [
		          {
		            variant: "opsTable",
		            style: "ops-table",
		            settings: { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
		          },
		          {
		            variant: "separatedList",
		            style: "calm-table",
		            settings: { grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
		          },
		          {
		            variant: "workbench",
		            style: "workbench",
		            settings: { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
		          },
		        ]
		      : [
		          {
		            variant: "opsTable",
		            style: "ops-table",
		            settings: { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
		          },
		          {
		            variant: "separatedList",
		            style: "calm-table",
		            settings: { grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
		          },
		          {
		            variant: "workbench",
		            style: "workbench",
		            settings: { grouping: "combined", viewMode: "switchable", realViewMode: "card", demoViewMode: "list" },
		          },
		          {
		            variant: "accountWall",
		            style: "account-wall",
		            settings: { grouping: "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" },
		          },
		        ];
	    const index = hashText(`${source}:${config.designGenome}:${config.pageStory}:${config.layoutPreset}`) % styleSeeds.length;
	    const picked = styleSeeds[index];
	    mergeModuleVariants(config, { TradingAccounts: picked.variant });
	    mergeModuleStyles(config, { tradingAccounts: picked.style });
	    mergeModuleSettings(config, { tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, ...picked.settings } });
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

    if (includesAny(positiveSignal, ["新手", "新客", "开户", "注册", "kyc", "首次", "账户开通", "开通进度"])) {
      const onboardingPresentation = onboardingPresentationFromPrompt(positiveSignal, config.designGenome || "");
      mergeModuleVariants(config, {
        AssetOverview: "standard",
        WalletBalance: "compact",
        QuickActions: "priorityButtons",
        OnboardingProgress: onboardingPresentation.variant,
        PromotionBanner: "splitVisual",
      });
      mergeModuleStyles(config, {
        balanceTotal: "quiet-card",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        onboardingProgress: onboardingPresentation.style,
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

	    if (includesAny(positiveSignal, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账号首屏", "账户首屏"]) || wantsAccountPerformanceLinePrompt(positiveSignal)) {
	      mergeModuleVariants(config, {
	        AssetOverview: "compactTable",
	        WalletBalance: "compact",
	        QuickActions: "minimalIcons",
	        AccountPerformance: "proChart",
	        PromotionBanner: config.themePreset === "darkTech" ? "gradientHero" : "splitVisual",
	      });
	      mergeModuleStyles(config, {
	        balanceTotal: "metric-strip",
	        fundActions: "compact-row",
	        onboardingProgress: "compact",
	        adCarousel: "compact",
	        quickActions: "toolbar",
	        accountPerformance: "pro-chart",
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
      const referralStatsRequested = wantsReferralStatsPrompt(text);
      const referralCoreOnly = wantsReferralCoreOnlyPrompt(text);
      const referralCardStyle = referralLinkCardStyleFromPrompt(text, referralStatsRequested, referralCoreOnly);
      mergeModuleVariants(config, {
        AssetOverview: "compactTable",
        WalletBalance: "splitCurrency",
        QuickActions: "priorityButtons",
        PromotionBanner: "gradientHero",
        ReferralLinkCard: referralCardStyle === "stats-card" ? "statsCard" : referralCardStyle === "link-first" ? "linkFirst" : "compactCard",
      });
      mergeModuleStyles(config, {
        referral_link_card: referralCardStyle,
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
          showStats: referralStatsRequested && !referralCoreOnly,
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
      mergeModuleSettings(config, { tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true } });
    }

    if (includesAny(signal, ["只要模拟", "只看模拟", "demo only", "模拟优先"])) {
      mergeModuleSettings(config, { tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true } });
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

    if (wantsFourColumnTradingAccountCards(text)) {
      mergeModuleVariants(config, { TradingAccounts: "denseCards" });
      mergeModuleStyles(config, { tradingAccounts: "dense-cards", trading_accounts_list: "dense-cards" });
      mergeModuleSettings(config, {
        tradingAccounts: {
          enabled: true,
          realEnabled: true,
          demoEnabled: true,
          grouping: "combined",
          viewMode: "card",
          realViewMode: "card",
          demoViewMode: "card",
          preferredColumns: 4,
        },
      });
    } else if (wantsFlatAccountOptimization(text)) {
      const forceAccountList = wantsTradingAccountSingleViewCorrection(text);
      const refineCards = wantsAccountCardRefinement(text) && !wantsTradingAccountList(text) && !forceAccountList;
      const keepSeparatedCards = wantsRealAccountCards(text) || /模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(text);
      mergeModuleVariants(config, {
        AccountPerformance: "cleanSnapshot",
        TradingAccounts: refineCards ? "denseCards" : "separatedList",
      });
      mergeModuleStyles(config, {
        accountPerformance: "pro-chart",
        tradingAccounts: refineCards ? "dense-cards" : "calm-table",
      });
      mergeModuleSettings(config, {
        tradingAccounts: refineCards
          ? { grouping: keepSeparatedCards ? "separated" : "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" }
          : { grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" },
      });
      if (wantsAccountPerformanceLinePrompt(signal) || includesAny(signal, ["账号表现", "账户表现", "数据指标", "指标排版", "持仓 pnl", "pnl"])) {
        moveSlot(config, "accountPerformance", "front");
      }
    }

	    if (includesAny(signal, ["信息多", "高频", "密集", "紧凑"])) {
	      mergeModuleVariants(config, {
	        AssetOverview: "compactTable",
	        QuickActions: "minimalIcons",
	      });
	      mergeModuleSettings(config, { quickActions: { count: 8, display: "iconOnly" } });
	      config.density = "compact";
	    }

    if (
      config.moduleSettings.quickActions?.enabled &&
      includesAny(positiveSignal, ["每一个", "每个", "加框", "框", "背景色", "卡片", "模块", "磁贴", "个性化", "意图", "风格", "分格", "更多方案", "多方案", "样式更多"])
    ) {
      const quickIntent = pageIntentFromConfig(config, text);
      const quickPresentation = quickActionPresentationFromIntent(quickIntent, config.designGenome, text);
      mergeModuleVariants(config, { QuickActions: quickPresentation.variant });
      mergeModuleStyles(config, { quickActions: quickPresentation.style });
      mergeModuleSettings(config, {
        quickActions: {
          enabled: true,
          display: quickPresentation.display,
        },
      });
      config.personalizationStrength = "strong";
    }

	    applyTradingAccountPresentationVariety(config, text);

	    config.sections = config.sections
	      .map((section) => ({ ...section, slots: uniqueValidSlots(section.slots) }))
      .filter((section) => section.slots.length);

    const visibleSlots = config.sections.flatMap((section) => section.slots);
    if (!visibleSlots.includes(config.heroFocus)) {
      config.heroFocus = visibleSlots[0] || "balanceTotal";
    }

		    config.layout = layoutFromSections(config.sections);
		    config.sourcePrompt = prompt;
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

  function writeStoredConfig(key, config) {
    const payload = JSON.stringify(config);
    try {
      window.localStorage.setItem(key, payload);
      return;
    } catch (error) {
      VOLATILE_STORAGE_KEYS.forEach((storageKey) => {
        if (storageKey !== key) {
          try {
            window.localStorage.removeItem(storageKey);
          } catch (removeError) {
            // Continue clearing the remaining volatile caches.
          }
        }
      });
      window.localStorage.setItem(key, payload);
    }
  }

  function loadConfig() {
    return readStoredConfig(STORAGE_KEY, DEFAULT_CONFIG);
  }

  function saveConfig(config) {
    const candidate = normalizeConfig(config);
    const normalized = candidate.validationErrors.length ? normalizeConfig(DEFAULT_CONFIG) : candidate;
    writeStoredConfig(STORAGE_KEY, normalized);
    return normalized;
  }

  function loadDraft() {
    return readStoredConfig(DRAFT_STORAGE_KEY, loadConfig());
  }

  function saveDraft(config) {
    const candidate = normalizeConfig(config);
    const normalized = candidate.validationErrors.length ? normalizeConfig(DEFAULT_CONFIG) : candidate;
    writeStoredConfig(DRAFT_STORAGE_KEY, normalized);
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
      demo: '<rect x="4" y="5" width="16" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="M8 9h8" />',
      shieldCheck: '<path d="M12 3 19 6v5c0 4.2-2.8 7.7-7 10-4.2-2.3-7-5.8-7-10V6l7-3Z" /><path d="m8.8 12 2 2 4.4-4.8" />',
      accountCard: '<rect x="4" y="5" width="16" height="14" rx="3" /><path d="M8 10h4" /><path d="M8 14h8" /><path d="M16 9.5h.01" />',
      depositSpark: '<path d="M12 3v11" /><path d="m7.5 9.5 4.5 4.5 4.5-4.5" /><path d="M5 19h14" /><path d="M18 4v4" /><path d="M16 6h4" />',
      idBadge: '<rect x="4" y="5" width="16" height="14" rx="3" /><path d="M8.5 9.5h7" /><path d="M8.5 13.5h3.5" /><path d="m14 14 1.5 1.5 3-3" />',
      accountPlus: '<rect x="4" y="5" width="16" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M6.5 16a3.5 3.5 0 0 1 5 0" /><path d="M16 10v5" /><path d="M13.5 12.5h5" />',
      banknoteIn: '<rect x="4" y="6" width="16" height="12" rx="3" /><circle cx="12" cy="12" r="2" /><path d="M8 10h.01" /><path d="M16 14h.01" /><path d="M12 2v5" /><path d="m9.5 4.5 2.5 2.5 2.5-2.5" />',
    };

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chart}</svg>`;
  }

  function loadEchartsRuntime(view) {
    const targetView = view || window;
    const targetDocument = targetView.document || document;
    if (targetView.echarts) return Promise.resolve(targetView.echarts);
    if (chartRuntimePromise) return chartRuntimePromise;

    const existingScript = targetDocument.querySelector("script[data-home-chart-runtime]");
    chartRuntimePromise = new Promise((resolve, reject) => {
      const handleReady = () => {
        if (targetView.echarts) resolve(targetView.echarts);
        else reject(new Error("ECharts runtime loaded without exposing window.echarts"));
      };

      if (existingScript) {
        existingScript.addEventListener("load", handleReady, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = targetDocument.createElement("script");
      script.src = ECHARTS_RUNTIME_URL;
      script.async = true;
      script.dataset.homeChartRuntime = "echarts";
      script.onload = handleReady;
      script.onerror = () => reject(new Error("Unable to load ECharts runtime"));
      targetDocument.head.appendChild(script);
    });

    return chartRuntimePromise;
  }

  function chartTheme(target) {
    const view = target?.ownerDocument?.defaultView || window;
    const styles = view.getComputedStyle(target);
    const color = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

    return {
      text: color("--home-text-strong", "#172033"),
      muted: color("--home-text-muted", "#64748b"),
      border: color("--home-border", "#dbe3ef"),
      primary: color("--home-primary", "#2563eb"),
      success: color("--home-success", "#059669"),
      danger: color("--home-danger", "#ef4444"),
      panel: color("--home-surface", "#ffffff"),
    };
  }

  function chartDateLabels(period, count = 7) {
    const weekly = ["05/05", "05/06", "05/07", "05/08", "05/09", "05/10", "05/11"];
    const monthly = ["04/12", "04/17", "04/22", "04/27", "05/02", "05/07", "05/11"];
    const source = period === "30" ? monthly : weekly;
    if (count === source.length) return source;
    return source.slice(Math.max(0, source.length - count));
  }

  function chartSeriesForPeriod(period, kind) {
    if (kind === "trading-cost-pnl") {
      return {
        labels: chartDateLabels(period),
        equity: period === "30" ? [72, 76, 74, 84, 92, 96, 104] : [72, 78, 76, 86, 92, 101, 106],
        pnl: period === "30" ? [42, 46, 44, 52, 58, 62, 66] : [42, 48, 46, 54, 61, 64, 68],
      };
    }

    return period === "30"
      ? {
          labels: chartDateLabels(period),
          equity: [100, 104, 101, 112, 121, 126, 118],
          pnl: [80, 86, 84, 92, 101, 104, 96],
        }
      : {
          labels: chartDateLabels(period),
          equity: [100, 108, 104, 118, 126, 130, 116],
          pnl: [80, 89, 86, 96, 104, 109, 98],
        };
  }

  function parseChartValues(value) {
    try {
      const values = JSON.parse(value || "[]");
      return Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
    } catch (error) {
      return [];
    }
  }

  function homeChartOption(node) {
    const kind = node.dataset.chartKind || "account-performance";
    const period = node.dataset.chartPeriod === "30" ? "30" : "7";
    const theme = chartTheme(node);
    const customValues = parseChartValues(node.dataset.chartValues);
    const customPnlValues = parseChartValues(node.dataset.chartPnlValues);
    const series = customValues.length >= 4
      ? {
          labels: chartDateLabels(period, customValues.length),
          equity: customValues,
          pnl: customPnlValues.length === customValues.length ? customPnlValues : [],
        }
      : chartSeriesForPeriod(period, kind);
    const isCost = kind === "trading-cost-pnl";
    const isRecommendation = kind === "recommendation-curve";
    const axisMode = node.dataset.chartAxisMode || (isRecommendation ? "minimal" : "xy");
    const showFullAxes = axisMode === "xy";
    const accent = isCost ? "#5eead4" : theme.primary;
    const secondary = isCost ? "#fbbf24" : theme.success;
    const allValues = [...series.equity, ...(series.pnl || [])].filter(Number.isFinite);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;
    const showPnl = Array.isArray(series.pnl) && series.pnl.length > 0;

    return {
      animationDuration: 700,
      animationEasing: "cubicOut",
      color: [accent, secondary],
      backgroundColor: "transparent",
      grid: {
        top: isRecommendation ? 16 : 24,
        right: showFullAxes ? 10 : 4,
        bottom: showFullAxes ? 28 : 8,
        left: showFullAxes ? 38 : 4,
        containLabel: showFullAxes,
      },
      legend: {
        show: !isRecommendation,
        top: 0,
        right: 0,
        itemWidth: 14,
        itemHeight: 6,
        textStyle: { color: isCost ? "#cbd5e1" : theme.muted, fontSize: 11, fontWeight: 700 },
      },
      tooltip: {
        trigger: "axis",
        appendToBody: true,
        className: "ai-chart-tooltip",
        formatter(params) {
          const axisLabel = params?.[0]?.axisValue || "";
          if (isRecommendation) return `${axisLabel}<br/>Return curve`;
          return `${axisLabel}<br/>Equity trend<br/>Floating P/L trend`;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: series.labels,
        axisTick: { show: false },
        axisLine: { show: showFullAxes, lineStyle: { color: isCost ? "rgba(148, 163, 184, 0.32)" : theme.border } },
        axisLabel: { show: showFullAxes, color: isCost ? "#94a3b8" : theme.muted, fontSize: 11, fontWeight: 700 },
      },
      yAxis: {
        type: "value",
        min: Math.floor(minValue - valueRange * 0.18),
        max: Math.ceil(maxValue + valueRange * 0.18),
        splitNumber: 4,
        axisLabel: { show: showFullAxes, color: isCost ? "#94a3b8" : theme.muted, fontSize: 11, fontWeight: 700 },
        axisTick: { show: false },
        axisLine: { show: showFullAxes, lineStyle: { color: isCost ? "rgba(148, 163, 184, 0.32)" : theme.border } },
        splitLine: { show: showFullAxes, lineStyle: { color: isCost ? "rgba(148, 163, 184, 0.16)" : theme.border, type: "dashed" } },
      },
      series: [
        {
          name: isRecommendation ? "Return" : "Equity",
          type: "line",
          data: series.equity,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3, color: accent },
          itemStyle: { color: accent },
          areaStyle: { color: accent, opacity: isCost ? 0.18 : 0.14 },
          emphasis: { focus: "series" },
        },
        showPnl
          ? {
              name: "P/L",
              type: "line",
              data: series.pnl,
              smooth: true,
              symbol: "circle",
              symbolSize: 5,
              lineStyle: { width: 2, color: secondary, type: isCost ? "solid" : "dashed" },
              itemStyle: { color: secondary },
              emphasis: { focus: "series" },
            }
          : null,
      ].filter(Boolean),
    };
  }

  function bindChartResize(view, target) {
    const doc = target || view.document;
    if (doc.documentElement?.dataset.homeChartsResizeBound) return;
    if (doc.documentElement) doc.documentElement.dataset.homeChartsResizeBound = "true";
    view.addEventListener("resize", () => {
      view.requestAnimationFrame(() => {
        doc.querySelectorAll("[data-home-echart]").forEach((node) => {
          chartInstances.get(node)?.resize();
        });
      });
    });
  }

  function initializeHomeCharts(root) {
    const target = root || document;
    const view = target.defaultView || window;
    const charts = Array.from(target.querySelectorAll("[data-home-echart]"));
    if (!charts.length) return;

    bindChartResize(view, target);
    loadEchartsRuntime(view)
      .then((echarts) => {
        charts.forEach((node) => {
          if (!node.isConnected) return;
          const instance = chartInstances.get(node) || echarts.init(node, null, { renderer: "canvas" });
          chartInstances.set(node, instance);
          instance.setOption(homeChartOption(node), true);
          node.classList.add("is-chart-ready");
          node.classList.remove("is-chart-fallback");
          node.closest("[data-home-feature]")?.classList.add("has-ready-echarts");
          view.requestAnimationFrame(() => instance.resize());
        });
      })
      .catch(() => {
        charts.forEach((node) => {
          node.classList.add("is-chart-fallback");
          node.classList.remove("is-chart-ready");
          node.closest("[data-home-feature]")?.classList.remove("has-ready-echarts");
        });
      });
  }

  function bindHomeChartInteractions(root) {
    const target = root || document;
    target.querySelectorAll("[data-chart-period-switch]").forEach((group) => {
      if (group.dataset.chartPeriodBound) return;
      group.dataset.chartPeriodBound = "true";
      group.addEventListener("click", (event) => {
        const button = event.target.closest("[data-chart-period]");
        if (!button) return;
        const period = button.dataset.chartPeriod === "30" ? "30" : "7";
        group.querySelectorAll("[data-chart-period]").forEach((item) => {
          item.classList.toggle("active", item === button);
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        const feature = group.closest("[data-home-feature]");
        feature?.querySelectorAll("[data-home-echart]").forEach((node) => {
          node.dataset.chartPeriod = period;
        });
        feature?.querySelectorAll("[data-chart-current-period]").forEach((node) => {
          node.textContent = `${period}D`;
        });
        feature?.querySelectorAll("[data-chart-date-labels]").forEach((group) => {
          const labels = chartDateLabels(period);
          const visibleLabels = [labels[0], labels[Math.floor(labels.length / 2)], labels[labels.length - 1]];
          group.querySelectorAll("span").forEach((node, index) => {
            if (visibleLabels[index]) node.textContent = visibleLabels[index];
          });
        });
        initializeHomeCharts(target);
      });
    });
  }

  function moduleStyle(config, slot) {
    const styleSlot = COMPONENT_STYLE_FEATURE_MAP[slot] || slot;
    return config?.moduleStyles?.[styleSlot] || MODULE_STYLE_DEFAULTS[styleSlot] || "standard";
  }

  function moduleVariant(config, slot) {
    const moduleId = moduleKeyFor(slot);
    return moduleId ? config?.modules?.[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId] : moduleStyle(config, slot);
  }

  function moduleMorph(config, slot) {
    const moduleId = moduleKeyFor(slot);
    if (!moduleId) return null;
    const variant = config?.modules?.[moduleId]?.variant || MODULE_VARIANT_DEFAULTS[moduleId];
    const source = config?.componentMorphs?.[moduleId] || {};
    return componentMorphPayload(moduleId, variant, source);
  }

  function moduleMorphId(config, slot) {
    return moduleMorph(config, slot)?.morphId || "";
  }

  function componentReferenceForModule(config, slot) {
    const moduleId = moduleKeyFor(slot);
    if (!moduleId) return null;
    const references = Array.isArray(config?.componentReferences) ? config.componentReferences : [];
    return references.find((reference) => reference.module === moduleId || moduleKeyFor(reference.component) === moduleId) || null;
  }

  function highScoreComponentReferenceForModule(config, slot) {
    const moduleId = moduleKeyFor(slot);
    if (!moduleId) return null;
    const minimumScore = Number(config?.componentRenderPolicy?.minimumRendererScore) || 8;
    const references = Array.isArray(config?.componentReferences) ? config.componentReferences : [];
    return references
      .filter((reference) => reference.module === moduleId || moduleKeyFor(reference.component) === moduleId)
      .filter(
	        (reference) =>
	          reference.referenceTier !== "blocked" &&
	          Number(reference.score) >= minimumScore &&
	          reference.rendererHtml &&
	          reference.rendererCss &&
	          componentReferenceRendererLooksPublishable(reference),
	      )
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0] || null;
  }

  function renderHighScoreComponentReference(doc, slot, config) {
    const reference = highScoreComponentReferenceForModule(config, slot);
    if (!reference) return null;
    const element = wrapFeature(doc, slot, "ai-reference-feature", config);
    element.dataset.componentReferenceRenderer = reference.rendererMode || "high-score-component";
    element.dataset.componentReferenceScore = String(reference.score || "");
    element.dataset.componentReferenceTier = reference.referenceTier || "";
    const css = sanitizeAiHtmlCss(reference.rendererCss);
    const html = sanitizeAiHtmlMarkup(reference.rendererHtml);
    if (!html || !css) return null;
    if (typeof element.attachShadow === "function") {
      const shadow = element.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          :host{display:block;height:100%;min-width:0;color:var(--home-text,#172033);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}
          *,*::before,*::after{box-sizing:border-box;}
          .ai-reference-component-host{height:100%;min-width:0;}
          ${css}
        </style>
        <div class="ai-reference-component-host">${html}</div>
      `;
      return element;
    }
    const style = doc.createElement("style");
    style.textContent = css;
    const host = doc.createElement("div");
    host.className = "ai-reference-component-host";
    host.innerHTML = html;
    element.appendChild(style);
    element.appendChild(host);
    return element;
  }

  function wrapFeature(doc, slot, className, config) {
    const element = doc.createElement("section");
    const morph = moduleMorph(config, slot);
    const reference = componentReferenceForModule(config, slot);
    element.className = `ai-feature-slot ${className || ""}`.trim();
    element.dataset.homeFeature = slot;
    element.dataset.homeFeatureLabel = featureLabel(slot);
    element.dataset.moduleVariant = moduleVariant(config, slot);
    element.dataset.moduleStyle = moduleStyle(config, slot);
    if (morph?.morphId) {
      element.dataset.componentMorph = morph.morphId;
      element.dataset.componentMorphLabel = morph.morphLabel;
      element.dataset.componentMorphStructure = morph.structure;
    }
    if (reference?.componentId) {
      element.dataset.componentReference = reference.componentId;
      element.dataset.componentReferenceName = reference.name;
      element.dataset.componentReferenceFamily = reference.family;
      element.dataset.componentReferenceReason = reference.reason;
    }
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
          <span><b>${t("home.depositBonus.cta")}</b><small>最高赠金 $300</small></span>
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

  function isTradingCostWorkbenchConfig(config) {
    const traceText = `${config?.brickTrace?.strategy || ""} ${config?.aiSummary || ""} ${config?.name || ""}`.toLowerCase();
    return (
      moduleStyle(config, "accountPerformance") === "cost-board" ||
      (Array.isArray(config?.brickPlan) && config.brickPlan.some((brick) => String(brick?.brickId || "").includes("costBoard"))) ||
      traceText.includes("交易成本") ||
      traceText.includes("cost")
    );
  }

  function renderWelcomeHeader(doc, config, props = {}) {
    const feature = wrapFeature(doc, "welcome_header", "ai-welcome-feature", config);
    const safeProps = sanitizeComponentProps("welcome_header", props, []);
    if (pageIntentFromConfig(config) === "deposit") {
      const kycStatus = config.moduleSettings?.userKycRail?.kycStatus || "verified";
      const kycLabel = {
        verified: "KYC 已通过",
        pending: "KYC 未提交",
        reviewing: "KYC 待审",
        rejected: "KYC 已拒绝",
      }[kycStatus] || "KYC 已通过";
      const subtitle = kycStatus === "verified"
        ? "账户已准备好，完成首次入金后即可开始真实交易。"
        : "先完成账户认证，再衔接真实账户入金与交易。";
      feature.dataset.welcomeMode = "deposit";
      feature.innerHTML = `
        <div class="ai-welcome-main">
          <span>ForexCRM Client</span>
          <h1 data-home-title>张明，欢迎回来</h1>
          <p data-home-subtitle>${escapeHtml(subtitle)}</p>
        </div>
        <div class="welcome-actions ai-welcome-deposit-actions">
          <span>${escapeHtml(kycLabel)}</span>
          <span>Live MT5-88291</span>
          <a data-home-action="deposit" href="#fund-actions">${escapeHtml(t("home.depositBonus.cta"))}</a>
        </div>
      `;
      return feature;
    }
    feature.innerHTML = `
      <div>
        <h1 data-home-title>${escapeHtml(t(safeProps.titleKey))}</h1>
        <p data-home-subtitle>${escapeHtml(t(safeProps.subtitleKey))}</p>
      </div>
      <div class="welcome-actions">
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

  function assetLabelWithCurrency(labelKey, fallbackLabel = "", currency = "USD") {
    const label = fallbackLabel || t(labelKey);
    return `${label} (${currency})`;
  }

  function assetMetricItem({ label, value = "--", valueAttr = "", kind = "", primary = false }) {
    const safeAttr = valueAttr ? ` ${valueAttr}` : "";
    const kindAttr = kind ? ` data-balance-kind="${escapeHtml(kind)}"` : "";
    const primaryAttr = primary ? ` data-balance-primary="true"` : "";
    return `
      <span class="ai-balance-metric-item"${kindAttr}${primaryAttr}>
        <small>${escapeHtml(label)}</small>
        <b${safeAttr}>${escapeHtml(value)}</b>
      </span>
    `;
  }

  function renderBalanceTotal(doc, config, props = {}) {
    const feature = wrapFeature(doc, "asset_overview", "ai-balance-feature", config);
    const safeProps = sanitizeComponentProps("asset_overview", props, []);
    const assetSettings = config.moduleSettings.assets;
    const visibleFields = Array.isArray(assetSettings.visibleFields) && assetSettings.visibleFields.length
      ? assetSettings.visibleFields
      : ["total", "wallet", "tradingAccount"];
    const showWalletSummary = visibleFields.includes("wallet") && assetSettings.showWalletBreakdown !== false;
    const metricMeta = {
      total: { label: assetLabelWithCurrency(safeProps.totalLabelKey, "余额合计"), target: "data-summary-total", kind: "total" },
      wallet: { label: assetLabelWithCurrency(safeProps.walletLabelKey, "钱包余额"), target: "data-summary-wallets", kind: "wallet" },
      tradingAccount: { label: assetLabelWithCurrency(safeProps.accountsLabelKey, "交易账号余额"), target: "data-summary-accounts", kind: "trading-account" },
    };
    const renderedFields = visibleFields.filter((field) => {
      if (field === "wallet") return showWalletSummary;
      if (field === "tradingAccount") return assetSettings.showAccountBreakdown;
      return field === "total";
    });
    const primaryMetric = metricMeta[renderedFields[0] || "total"];
    const hasMetricRow = renderedFields.length > 1;
    feature.dataset.balanceDensity = hasMetricRow ? "metric-row" : "summary-only";
    const metricMarkup = renderedFields
      .map((field) => assetMetricItem({ ...metricMeta[field], primary: field === "total" }))
      .join("");
    const noteText = !hasMetricRow
      ? t("home.asset.totalOnly")
      : showWalletSummary
      ? t(safeProps.walletNoteKey)
      : config.moduleSettings.wallet.enabled
      ? t("home.asset.walletStandalone")
      : t("home.asset.accountsOnly");
    const noteMarkup = noteText
      ? `<button class="ai-balance-info" type="button" aria-label="${escapeHtml(noteText)}" data-tooltip="${escapeHtml(noteText)}">i</button>`
      : "";
    const fundMarkup = assetSettings.showFundActions && !hasStandaloneFundActions(config)
      ? `<div class="ai-inline-fund-actions">${actionLinks(config)}</div>`
      : "";
    const morphId = moduleMorphId(config, "AssetOverview") || "summaryHero";
    const titleMarkup = `
      <div class="ai-orbit-label">
        <div class="ai-orbit-title">
          <b>${escapeHtml(t(safeProps.titleKey))}</b>
          ${noteMarkup}
        </div>
      </div>
    `;
    const tableRows = renderedFields
      .map((field) => {
        const metric = metricMeta[field];
        return `<tr><th>${escapeHtml(metric.label)}</th><td><strong ${metric.target}>--</strong></td></tr>`;
      })
      .join("");
    const ledgerRows = renderedFields
      .map((field, index) => {
        const metric = metricMeta[field];
        return `<span><small>${escapeHtml(metric.label)}</small><b ${metric.target}>--</b><em>${index === 0 ? "核心汇总" : index === 1 ? "可核对" : "交易承接"}</em></span>`;
      })
      .join("");
    const metricRow = `<div class="ai-balance-metric-row" data-balance-metric-count="${renderedFields.length}">${metricMarkup}</div>`;
    const simpleAmount = `<div class="ai-balance-amount"><small>${escapeHtml(primaryMetric.label)}</small><strong ${primaryMetric.target}>--</strong></div>`;
    const assetMorphMarkup =
      {
        metricTriplet: `
          ${titleMarkup}
          <div class="ai-balance-morph ai-balance-triplet">${metricRow}</div>
          ${fundMarkup}
        `,
        wealthPlate: `
          <div class="ai-balance-morph ai-balance-wealth-plate">
            <header><small>Private Desk</small><b>${escapeHtml(t(safeProps.titleKey))}</b></header>
            ${simpleAmount}
            <div class="ai-balance-proof-row"><span>Segregated Funds</span><span>CRM Verified</span><span>24h Settlement</span></div>
          </div>
          ${fundMarkup}
        `,
        riskRadar: `
          <div class="ai-balance-morph ai-balance-risk-radar">
            <div class="ai-risk-dial"><small>Risk</small><b>Low</b></div>
            <div>
              ${titleMarkup}
              ${metricRow}
            </div>
          </div>
          ${fundMarkup}
        `,
        waterfall: `
          ${titleMarkup}
          <div class="ai-balance-morph ai-balance-waterfall" aria-label="资金来源瀑布">
            ${renderedFields
              .map((field, index) => {
                const metric = metricMeta[field];
                return `<span style="--lane:${index + 1}"><small>${escapeHtml(metric.label)}</small><b ${metric.target}>--</b></span>`;
              })
              .join("")}
          </div>
          ${fundMarkup}
        `,
        splitLedger: `
          <div class="ai-balance-morph ai-balance-split-ledger">
            <div>${titleMarkup}${simpleAmount}</div>
            <div class="ai-balance-ledger">${ledgerRows}</div>
          </div>
          ${fundMarkup}
        `,
        compactTable: `
          ${titleMarkup}
          <table class="ai-balance-morph ai-balance-compact-table"><tbody>${tableRows}</tbody></table>
          ${fundMarkup}
        `,
        terminalStrip: `
          <div class="ai-balance-morph ai-balance-terminal">
            <header><span>ACCOUNT_SUMMARY</span><b>LIVE</b></header>
            ${metricRow}
          </div>
          ${fundMarkup}
        `,
        trustProof: `
          <div class="ai-balance-morph ai-balance-trust-proof">
            <div>${titleMarkup}${simpleAmount}</div>
            <ul><li>资金隔离</li><li>余额校验</li><li>账户审计</li></ul>
          </div>
          ${fundMarkup}
        `,
        actionFusion: `
          <div class="ai-balance-morph ai-balance-action-fusion">
            ${titleMarkup}
            ${hasMetricRow ? metricRow : simpleAmount}
            <div class="ai-balance-primary-action">${fundMarkup || actionLinks(config)}</div>
          </div>
        `,
      }[morphId] ||
      `
        ${titleMarkup}
        ${hasMetricRow ? metricRow : simpleAmount}
        ${fundMarkup}
      `;

    feature.innerHTML = assetMorphMarkup;

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
      ${featureTitleHtml({ eyebrowKey: "home.quick.eyebrow", titleKey: "home.quick.title" })}
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
    const kycStatus = config.moduleSettings.userKycRail?.kycStatus || "verified";
    const kycMeta =
      {
        pending: {
          label: "未提交",
          copy: "当前 CRM 账户尚未提交 KYC，完成认证后才能继续开真实账户。",
          cta: "下一步：提交 KYC",
          action: "kyc",
          href: "#accounts",
        },
        reviewing: {
          label: "待审",
          copy: "KYC 资料已提交，正在等待审核结果，通过后继续开真实账户。",
          cta: "等待审核结果",
          action: "kyc",
          href: "#accounts",
        },
        verified: {
          label: "通过",
          copy: "KYC 已通过，下一步开真实账户并完成首次入金。",
          cta: "下一步：开真实账户",
          action: "openAccount",
          href: "#accounts",
        },
        rejected: {
          label: "拒绝",
          copy: "KYC 审核未通过，请先补充资料，再继续开户和首次入金。",
          cta: "下一步：补充资料",
          action: "kyc",
          href: "#accounts",
        },
      }[kycStatus] || {
        label: "通过",
        copy: "KYC 已通过，下一步开真实账户并完成首次入金。",
        cta: "下一步：开真实账户",
        action: "openAccount",
        href: "#accounts",
    };
    const kycDone = kycStatus === "verified";
	    const progressPercent =
	      {
	        pending: "18%",
	        reviewing: "38%",
	        verified: "66%",
	        rejected: "18%",
	      }[kycStatus] || "66%";
    const completedCount =
      {
        pending: 0,
        reviewing: 0,
        verified: 1,
        rejected: 0,
      }[kycStatus] || 1;
    const progressCount = `${completedCount}/3`;
	    const journeySteps = [
	      {
	        no: "01",
	        title: "KYC 通过",
	        short: "KYC",
	        detail: kycDone ? "已完成" : kycMeta.label,
	        state: kycDone ? "done" : "active",
	        action: "kyc",
	        href: "#accounts",
	        icon: "idBadge",
	        accent: "verify",
	      },
	      {
        no: "02",
        title: "创建真实账户",
        short: "开真实账户",
	        detail: kycDone ? "下一步" : "通过后解锁",
	        state: kycDone ? "active" : "locked",
	        action: "openAccount",
	        href: "#accounts",
	        icon: "accountPlus",
	        accent: "account",
	      },
	      {
        no: "03",
        title: "首次入金",
        short: "首次入金",
	        detail: "待完成",
	        state: "pending",
	        action: "deposit",
	        href: "#fund-actions",
	        icon: "banknoteIn",
	        accent: "fund",
	      },
	    ];
    const stateLabel = {
      done: "已完成",
      active: "下一步",
      pending: "待完成",
      locked: "未解锁",
    };
    const activeStep = journeySteps.find((step) => step.state === "active") || journeySteps[0];
	    const guideCardsMarkup = journeySteps
	      .map(
        (step) => `
        <a class="ai-guide-card ${escapeHtml(step.state)}" data-journey-step="${escapeHtml(step.accent)}" data-home-action="${escapeHtml(step.action)}" href="${escapeHtml(step.href)}">
          <span class="ai-guide-card-icon">${actionIcon(step.icon)}</span>
          <span class="ai-guide-card-copy">
            <b>${escapeHtml(step.title)}</b>
            <small>${escapeHtml(step.detail)}</small>
          </span>
          <em>${escapeHtml(step.no)}</em>
        </a>
      `,
      )
      .join("");
    const masterStepsMarkup = journeySteps
      .map(
        (step) => `
        <a class="ai-master-step ${escapeHtml(step.state)}" data-journey-step="${escapeHtml(step.accent)}" data-home-action="${escapeHtml(step.action)}" href="${escapeHtml(step.href)}">
          <span class="ai-master-step-icon">${actionIcon(step.icon)}</span>
          <b>${escapeHtml(step.title)}</b>
          <small>${escapeHtml(step.detail)}</small>
        </a>
      `,
	      )
	      .join("");
    const missionCardsMarkup = journeySteps
      .map(
        (step) => `
        <a class="ai-mission-step ${escapeHtml(step.state)}" data-journey-step="${escapeHtml(step.accent)}" data-home-action="${escapeHtml(step.action)}" href="${escapeHtml(step.href)}">
          <span class="ai-mission-step-icon">${actionIcon(step.icon)}</span>
          <span class="ai-mission-step-copy">
            <b>${escapeHtml(step.title)}</b>
            <small>${escapeHtml(step.detail)}</small>
          </span>
          <em>${escapeHtml(stateLabel[step.state] || step.detail)}</em>
        </a>
      `,
      )
      .join("");
    const ribbonStepsMarkup = journeySteps
      .map(
        (step) => `
        <a class="ai-ribbon-step ${escapeHtml(step.state)}" data-journey-step="${escapeHtml(step.accent)}" data-home-action="${escapeHtml(step.action)}" href="${escapeHtml(step.href)}">
          <span>${actionIcon(step.icon)}</span>
          <b>${escapeHtml(step.no)}</b>
          <strong>${escapeHtml(step.short)}</strong>
          <small>${escapeHtml(stateLabel[step.state] || step.detail)}</small>
        </a>
      `,
      )
      .join("");
	    const progressNodesMarkup = journeySteps
      .map(
        (step) => `
        <a class="${escapeHtml(step.state)}" data-home-action="${escapeHtml(step.action)}" href="${escapeHtml(step.href)}">
          <b>${escapeHtml(step.no)}</b>
          <span>${escapeHtml(step.short)}</span>
          <small>${escapeHtml(step.detail)}</small>
        </a>
      `,
      )
      .join("");
    const pathStepsMarkup = journeySteps
      .map(
        (step) => `
        <a class="${escapeHtml(step.state)}" data-home-action="${escapeHtml(step.action)}" href="${escapeHtml(step.href)}">
          <b>${escapeHtml(step.no)}</b>
          <span>${escapeHtml(step.short)}</span>
          <small>${escapeHtml(step.detail)}</small>
        </a>
      `,
      )
      .join("");
    feature.dataset.kycStatus = kycStatus;
    feature.style.setProperty("--journey-progress", progressPercent);
    const morphId = moduleMorphId(config, "OnboardingProgress") || "missionBoard";
    const onboardingTitle = `<div class="ai-feature-title"><strong>${escapeHtml(t("home.onboarding.title"))}</strong></div>`;
    const missionBoardMarkup = `
      <div class="ai-mission-board" aria-label="账户开通进度">
        <div class="ai-mission-head">
          <span class="ai-mission-mark">${actionIcon(activeStep.icon)}</span>
          <span class="ai-mission-title">
            <b>账户开通进度 <em>${escapeHtml(progressCount)}</em></b>
            <small>${escapeHtml(kycMeta.copy)}</small>
          </span>
          <a data-home-action="${escapeHtml(kycMeta.action)}" href="${escapeHtml(kycMeta.href)}">${escapeHtml(kycMeta.cta.replace("下一步：", ""))}</a>
        </div>
        <div class="ai-mission-meter"><span style="width:${escapeHtml(progressPercent)}"></span></div>
        <div class="ai-mission-steps">${missionCardsMarkup}</div>
      </div>
    `;
    const nextStepMarkup = `
      <div class="ai-next-step-panel" aria-label="下一步开户动作">
        <div class="ai-next-step-primary" data-journey-step="${escapeHtml(activeStep.accent)}">
          <span>${actionIcon(activeStep.icon)}</span>
          <small>当前最优下一步</small>
          <b>${escapeHtml(activeStep.title)}</b>
          <p>${escapeHtml(kycMeta.copy)}</p>
          <a data-home-action="${escapeHtml(kycMeta.action)}" href="${escapeHtml(kycMeta.href)}">${escapeHtml(kycMeta.cta)}</a>
        </div>
        <div class="ai-next-step-side">${missionCardsMarkup}</div>
      </div>
    `;
    const onboardingMorphMarkup =
      {
        pathSteps: `
          ${onboardingTitle}
          <div class="ai-path-summary" data-kyc-status="${escapeHtml(kycStatus)}">
            <span>KYC ${escapeHtml(kycMeta.label)}</span>
            <p>${escapeHtml(kycMeta.copy)}</p>
            <a data-home-action="${escapeHtml(kycMeta.action)}" href="${escapeHtml(kycMeta.href)}">${escapeHtml(kycMeta.cta)}</a>
          </div>
          <div class="ai-path-meter"><span style="width:${escapeHtml(progressPercent)}"></span></div>
          <div class="ai-path-steps">${pathStepsMarkup}</div>
        `,
        checklist: `
          ${onboardingTitle}
          <div class="ai-onboarding-checklist">${missionCardsMarkup}</div>
        `,
        missionBoard: `${onboardingTitle}${missionBoardMarkup}`,
        nextStepHero: nextStepMarkup,
        journeyTimeline: `
          ${onboardingTitle}
          <div class="ai-master-journey" aria-label="三步成为交易大师">${masterStepsMarkup}</div>
        `,
        ribbonRail: `
          <div class="ai-ribbon-rail" aria-label="开户里程碑">
            <div class="ai-ribbon-copy">
              <b>${escapeHtml(activeStep.title)}</b>
              <small>${escapeHtml(kycMeta.copy)}</small>
              <a data-home-action="${escapeHtml(kycMeta.action)}" href="${escapeHtml(kycMeta.href)}">${escapeHtml(kycMeta.cta)}</a>
            </div>
            <div class="ai-ribbon-steps">${ribbonStepsMarkup}</div>
          </div>
        `,
        guideCards: `
          ${onboardingTitle}
          <div class="ai-guide-cards" aria-label="新手任务路径">${guideCardsMarkup}</div>
        `,
        wizardFlow: `
          ${onboardingTitle}
          <div class="ai-onboarding-wizard">
            <header><b>${escapeHtml(activeStep.title)}</b><small>${escapeHtml(progressCount)}</small></header>
            <div class="ai-progress-journey" aria-label="开户进度">
              <div class="ai-progress-rail"><span style="width:${escapeHtml(progressPercent)}"></span></div>
              <div class="ai-progress-nodes">${progressNodesMarkup}</div>
            </div>
          </div>
        `,
        kycActionPanel: `
          <div class="ai-onboarding-kyc-panel" data-kyc-status="${escapeHtml(kycStatus)}">
            <strong>KYC ${escapeHtml(kycMeta.label)}</strong>
            <p>${escapeHtml(kycMeta.copy)}</p>
            <a data-home-action="${escapeHtml(kycMeta.action)}" href="${escapeHtml(kycMeta.href)}">${escapeHtml(kycMeta.cta)}</a>
          </div>
        `,
        progressGauge: `
          ${onboardingTitle}
          <div class="ai-onboarding-gauge">
            <div><b>${escapeHtml(progressCount)}</b><small>完成进度</small></div>
            <section>${missionCardsMarkup}</section>
          </div>
        `,
      }[morphId] || `${onboardingTitle}${missionBoardMarkup}`;

    feature.innerHTML = onboardingMorphMarkup;
    return feature;
  }

  function renderPromoHighlight(doc, config, props = {}) {
    const feature = wrapFeature(doc, "promo_banner", "ai-promo-feature", config);
    const safeProps = sanitizeComponentProps("promo_banner", props, []);
    const morphId = moduleMorphId(config, "PromotionBanner") || "campaignHero";
    feature.id = "promo";
    if (pageIntentFromConfig(config) === "deposit" || moduleVariant(config, "promoHighlight") === "depositLadder" || morphId === "depositLadder") {
      const tiers = [
        { amount: "$500", bonus: "$30", label: "Tier 1" },
        { amount: "$2,000", bonus: "$120", label: "Tier 2" },
        { amount: "$10,000", bonus: "$300", label: "Tier 3" },
      ];
      feature.innerHTML = `
        <div class="ai-deposit-ladder-copy">
          <span>${escapeHtml(t("home.depositBonus.eyebrow"))}</span>
          <strong>${escapeHtml(t("home.depositBonus.title"))}</strong>
          <p>${escapeHtml(t("home.depositBonus.meta"))}</p>
          <a class="ai-deposit-ladder-cta" data-home-action="deposit" href="#fund-actions">${escapeHtml(t("home.depositBonus.cta"))}</a>
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
        <p class="ai-deposit-ladder-note">入金到账后，账户概览和交易账号余额会同步更新。</p>
      `;
      return feature;
    }
    const promoCopy = `
      <div class="ai-promo-copy">
        <span>${escapeHtml(t(safeProps.badgeKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
        <p>${escapeHtml(t(safeProps.metaKey))}</p>
      </div>
    `;
    const promoCta = `<a data-home-action="promo" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.ctaKey))}</a>`;
    feature.innerHTML =
      {
        scoreboard: `
          <div class="ai-promo-scoreboard">
            <small>Prize Pool</small>
            <b>$9,600</b>
            <span>28D</span>
          </div>
          ${promoCopy}
          ${promoCta}
        `,
        editorialCover: `
          <article class="ai-promo-editorial-cover">
            <span>${escapeHtml(t(safeProps.badgeKey))}</span>
            <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
            <p>${escapeHtml(t(safeProps.metaKey))}</p>
            ${promoCta}
          </article>
        `,
        splitVisual: `
          <div class="ai-promo-split-copy">${promoCopy}${promoCta}</div>
          <div class="ai-promo-split-visual"><b>FX</b><span>Campaign</span></div>
        `,
        countdownCard: `
          ${promoCopy}
          <div class="ai-promo-countdown"><span>07</span><span>12</span><span>30</span></div>
          ${promoCta}
        `,
        benefitList: `
          ${promoCopy}
          <ul class="ai-promo-benefits"><li>点差权益</li><li>专属客服</li><li>交易奖励</li></ul>
          ${promoCta}
        `,
        noticeBanner: `
          <div class="ai-promo-notice-row">
            <b>${escapeHtml(t(safeProps.titleKey))}</b>
            <span>${escapeHtml(t(safeProps.metaKey))}</span>
            ${promoCta}
          </div>
        `,
        imageHero: `
          <div class="ai-promo-image-hero">
            <div class="ai-promo-mark">${actionIcon("trophy")}</div>
            ${promoCopy}
            ${promoCta}
          </div>
        `,
        ctaPanel: `
          <div class="ai-promo-cta-panel">
            ${promoCopy}
            <div><span>Configured Campaign</span>${promoCta}</div>
          </div>
        `,
      }[morphId] ||
      `
        <div class="ai-promo-mark">${actionIcon("trophy")}</div>
        ${promoCopy}
        ${promoCta}
      `;
    return feature;
  }

  function renderAdCarousel(doc, config, props = {}, featureSlot = "adCarousel") {
    const feature = wrapFeature(doc, featureSlot, "ai-ad-carousel-feature", config);
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

  function renderPromotionBanner(doc, config, props = {}) {
    if (config.moduleSettings?.adCarousel?.enabled) {
      return renderAdCarousel(doc, config, props, "promo_banner");
    }
    return renderPromoHighlight(doc, config, props);
  }

  function renderQuickActions(doc, config, props = {}) {
    const feature = wrapFeature(doc, "quick_actions", "ai-quick-feature", config);
    const quickSettings = config.moduleSettings.quickActions;
    const variant = moduleVariant(config, "quickActions");
    const safeProps = sanitizeComponentProps("quick_actions", props, []);
    const configuredActions = Array.isArray(quickSettings.actions) ? quickSettings.actions : [];
    const commandDefaults = ["switchAccount", "positions", "orders", "downloadMt5", "deposit", "openDemo"]
      .map((id) => QUICK_ACTION_CATALOG[id])
      .filter(Boolean);
    const actionPool = configuredActions.length
      ? configuredActions
      : isTradingCostWorkbenchConfig(config) || moduleStyle(config, "quickActions") === "command-bar"
      ? commandDefaults
      : safeProps.actions || [];
    const actions = actionPool.slice(0, Math.min(quickSettings.count, MAX_QUICK_ACTIONS));

    feature.dataset.quickDisplay = variant === "minimalIcons" ? "iconOnly" : quickSettings.display;
    const morphId = moduleMorphId(config, "QuickActions") || "gridCards";
    const quickLabel = (item) => (pageIntentFromConfig(config) === "deposit" && item.id === "deposit" ? t("home.depositBonus.cta") : t(item.labelKey));
    const actionLink = (item, index = 0) => `
      <a data-home-action="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(quickLabel(item))}" data-tooltip="${escapeHtml(quickLabel(item))}" data-action-index="${index + 1}">
        ${item.icon === "user" ? icon("user") : actionIcon(item.icon)}<span>${escapeHtml(quickLabel(item))}</span>
      </a>
    `;
    const placeholders = Array.from({ length: Math.min(quickSettings.count, 6) })
      .map(() => `<span class="ai-shortcut-placeholder" aria-hidden="true"></span>`)
      .join("");
    const actionLinksMarkup = actions.length ? actions.map(actionLink).join("") : placeholders;
    const primaryAction = actions[0];
    const secondaryActions = actions.slice(1);
    const quickMorphMarkup =
      {
        actionDock: `
          ${featureTitleHtml(safeProps)}
          <nav class="ai-shortcut-dock" aria-label="${escapeHtml(t(safeProps.titleKey))}">${actionLinksMarkup}</nav>
        `,
        priorityPanel: `
          ${featureTitleHtml(safeProps)}
          <div class="ai-shortcut-priority-panel">
            ${
              primaryAction
                ? `<a class="ai-shortcut-primary" data-home-action="${escapeHtml(primaryAction.id)}" href="${escapeHtml(primaryAction.href)}">${primaryAction.icon === "user" ? icon("user") : actionIcon(primaryAction.icon)}<strong>${escapeHtml(quickLabel(primaryAction))}</strong><small>优先动作</small></a>`
                : `<span class="ai-shortcut-placeholder" aria-hidden="true"></span>`
            }
            <div>${secondaryActions.map(actionLink).join("") || placeholders}</div>
          </div>
        `,
        iconBelt: `
          <nav class="ai-shortcut-icon-belt" aria-label="${escapeHtml(t(safeProps.titleKey))}">${actionLinksMarkup}</nav>
        `,
        commandBar: `
          <div class="ai-command-action-bar">
            <span>CMD</span>
            <div>${actionLinksMarkup}</div>
          </div>
        `,
        taskRail: `
          ${featureTitleHtml(safeProps)}
          <ol class="ai-action-task-rail">
            ${
              actions.length
                ? actions
                    .map(
                      (item, index) => `
                        <li>
                          <b>${String(index + 1).padStart(2, "0")}</b>
                          ${actionLink(item, index)}
                        </li>
                      `,
                    )
                    .join("")
                : `<li>${placeholders}</li>`
            }
          </ol>
        `,
        tileBoard: `
          ${featureTitleHtml(safeProps)}
          <div class="ai-shortcut-tile-board">${actionLinksMarkup}</div>
        `,
        accentCards: `
          ${featureTitleHtml(safeProps)}
          <div class="ai-shortcut-accent-cards">${actionLinksMarkup}</div>
        `,
        compactMenu: `
          <ul class="ai-shortcut-compact-menu" aria-label="${escapeHtml(t(safeProps.titleKey))}">
            ${actions.length ? actions.map((item, index) => `<li>${actionLink(item, index)}</li>`).join("") : `<li>${placeholders}</li>`}
          </ul>
        `,
        segmentedPanel: `
          ${featureTitleHtml(safeProps)}
          <div class="ai-shortcut-segmented-panel">
            <section><small>资金</small>${actions.slice(0, Math.ceil(actions.length / 2)).map(actionLink).join("") || placeholders}</section>
            <section><small>交易</small>${actions.slice(Math.ceil(actions.length / 2)).map(actionLink).join("") || placeholders}</section>
          </div>
        `,
      }[morphId] ||
      `
        ${featureTitleHtml(safeProps)}
        <div class="ai-shortcut-matrix">
          ${actionLinksMarkup}
        </div>
      `;
    feature.innerHTML = quickMorphMarkup;
    return feature;
  }

  function renderReferralLinkCard(doc, config, props = {}) {
    const feature = wrapFeature(doc, "referral_link_card", "ai-referral-feature ai-referral-card-feature", config);
    const safeProps = sanitizeComponentProps("referral_link_card", props, []);
    const settings = config.moduleSettings.referralLinkCard || DEFAULT_MODULE_SETTINGS.referralLinkCard;
    const referralData =
      (config.referralData && typeof config.referralData === "object" ? config.referralData : null) ||
      (config.data?.referral && typeof config.data.referral === "object" ? config.data.referral : null) ||
      {};
    const promoLink = String(referralData.promoLink || referralData.link || referralData.url || "").trim();
    const inviteCode = String(referralData.inviteCode || referralData.code || "").trim();
    const promoDisplay = promoLink || "--";
    const inviteDisplay = inviteCode || "--";
    const copyButton = (labelKey, value) => `
      <button type="button" aria-label="${escapeHtml(t(labelKey))}" ${value ? `data-copy-value="${escapeHtml(value)}"` : "disabled aria-disabled=\"true\""}>
        ${actionIcon("copy")}
      </button>
    `;
    const core = [
      settings.showPromoLink
        ? `<div class="ai-referral-line wide"><small>${escapeHtml(t(safeProps.promoLinkLabelKey))}</small><span>${escapeHtml(promoDisplay)}</span>${copyButton(safeProps.copyLinkKey, promoLink)}</div>`
        : "",
      settings.showInviteCode
        ? `<div class="ai-referral-line"><small>${escapeHtml(t(safeProps.inviteCodeLabelKey))}</small><span>${escapeHtml(inviteDisplay)}</span>${copyButton(safeProps.copyCodeKey, inviteCode)}</div>`
        : "",
      settings.showShare ? `<button class="ai-referral-qr" type="button" ${promoLink ? `data-copy-value="${escapeHtml(promoLink)}"` : "disabled aria-disabled=\"true\""}>${actionIcon("copy")}<span>${escapeHtml(t(safeProps.shareKey))}</span></button>` : "",
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
    const morphId = moduleMorphId(config, "ReferralLinkCard") || "copyCard";
    const titleMarkup = featureTitleHtml(safeProps);
    const statsMarkup = stats ? `<div class="ai-referral-stats">${stats}</div>` : "";
    const coreMarkup = `<div class="ai-referral-core">${core}</div>`;
	    feature.innerHTML =
      {
        inviteCodeCard: `
          ${titleMarkup}
          <div class="ai-referral-code-card"><small>${escapeHtml(t(safeProps.inviteCodeLabelKey))}</small><strong>${escapeHtml(inviteDisplay)}</strong>${copyButton(safeProps.copyCodeKey, inviteCode)}</div>
        `,
        linkFirstPanel: `
          ${titleMarkup}
          <div class="ai-referral-link-first">${coreMarkup}</div>
          ${statsMarkup}
        `,
        qrPanel: `
          ${titleMarkup}
          <div class="ai-referral-qr-panel"><span>QR</span>${coreMarkup}</div>
        `,
        statsCard: `
          ${titleMarkup}
          ${statsMarkup}
          ${coreMarkup}
        `,
        shareToolbar: `
          ${titleMarkup}
          <div class="ai-referral-share-toolbar">${core}${settings.showShare ? "" : `<button type="button" ${promoLink ? `data-copy-value="${escapeHtml(promoLink)}"` : "disabled aria-disabled=\"true\""}>${actionIcon("copy")}<span>分享</span></button>`}</div>
        `,
        stepCards: `
          ${titleMarkup}
          <div class="ai-referral-step-cards">
            <article><b>01</b><span>复制链接</span></article>
            <article><b>02</b><span>发送客户</span></article>
            <article><b>03</b><span>查看统计</span></article>
          </div>
          ${coreMarkup}
        `,
        compactStrip: `
          <div class="ai-referral-compact-strip">${core}</div>
        `,
        conversionSummary: `
          ${titleMarkup}
          ${statsMarkup}
          <div class="ai-referral-conversion-summary">${core}</div>
        `,
        mainReferralCard: `
          <div class="ai-referral-main-card">
            ${titleMarkup}
            ${coreMarkup}
          </div>
        `,
      }[morphId] ||
      `
        ${titleMarkup}
        ${coreMarkup}
      `;
    return feature;
  }

  function renderReferralLink(doc, config) {
    const feature = wrapFeature(doc, "referralLink", "ai-referral-feature", config);
    const settings = config.moduleSettings.referral;
    const referralData =
      (config.referralData && typeof config.referralData === "object" ? config.referralData : null) ||
      (config.data?.referral && typeof config.data.referral === "object" ? config.data.referral : null) ||
      {};
    const promoLink = String(referralData.promoLink || referralData.link || referralData.url || "").trim();
    const inviteCode = String(referralData.inviteCode || referralData.code || "").trim();
    const promoDisplay = promoLink || "--";
    const inviteDisplay = inviteCode || "--";
    const stats = [
      settings.showClicks ? "<span><small>打开</small><b>--</b></span>" : "",
      settings.showRegistrations ? "<span><small>邀请注册</small><b>--</b></span>" : "",
      settings.showTradingAccounts ? "<span><small>交易账号</small><b>--</b></span>" : "",
    ]
      .filter(Boolean)
      .join("");
    const core = [
      settings.showInviteCode
        ? `<div class="ai-referral-line"><span>${escapeHtml(inviteDisplay)}</span><button type="button" aria-label="复制邀请码" ${inviteCode ? `data-copy-value="${escapeHtml(inviteCode)}"` : "disabled aria-disabled=\"true\""}>${actionIcon("copy")}</button></div>`
        : "",
      settings.showPromoLink
        ? `<div class="ai-referral-line wide"><span>${escapeHtml(promoDisplay)}</span><button type="button" aria-label="复制注册链接" ${promoLink ? `data-copy-value="${escapeHtml(promoLink)}"` : "disabled aria-disabled=\"true\""}>${actionIcon("copy")}</button></div>`
        : "",
      settings.showQrCode
        ? `<button class="ai-referral-qr" type="button" aria-label="打开邀请二维码">${actionIcon("copy")}<span>二维码</span></button>`
        : "",
    ]
      .filter(Boolean)
      .join("");

	    feature.innerHTML = `
	      ${featureTitleHtml({ eyebrowKey: "home.referral.eyebrow", titleKey: "home.referral.title" })}
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
    const hasBothAccountTypes = accountSettings.realEnabled && accountSettings.demoEnabled;
    const realViewMode = accountSettings.realViewMode || (accountSettings.viewMode === "list" ? "list" : "card");
	    const demoViewMode = accountSettings.demoViewMode || (accountSettings.viewMode === "card" ? "card" : "list");
	    const realOrder = accountSettings.demoFirst ? 2 : 1;
	    const demoOrder = accountSettings.demoFirst ? 1 : 2;
		    const accountCardSamples = [
		      { kind: "real", label: "Live", platform: "MT5", server: "后台绑定", account: "--", balance: "--", equity: "--", credit: "--", accountType: "真实账号", leverage: "--", marginRatio: "--" },
		      { kind: "real", label: "Live", platform: "MT4", server: "后台绑定", account: "--", balance: "--", equity: "--", credit: "--", accountType: "真实账号", leverage: "--", marginRatio: "--" },
		      { kind: "demo", label: "Demo", platform: "MT5", server: "后台绑定", account: "--", balance: "--", equity: "--", credit: "--", accountType: "模拟账号", leverage: "--", marginRatio: "--" },
		      { kind: "demo", label: "Demo", platform: "XOH", server: "后台绑定", account: "--", balance: "--", equity: "--", credit: "--", accountType: "模拟账号", leverage: "--", marginRatio: "--" },
		    ];
	    const accountCardMarkup = (account) => {
	      const environment = `${account.platform} · ${account.server}`;
	      return `
	        <article class="trade-account-card" data-kind="${escapeHtml(account.kind)}">
	          <div class="account-card-head">
	            <span class="account-status${account.kind === "demo" ? " demo" : ""}">${escapeHtml(account.label)}</span>
	            <span class="account-number">${escapeHtml(account.account)}</span>
	            <span class="account-environment" title="${escapeHtml(environment)}">${escapeHtml(environment)}</span>
	          </div>
	          <div class="account-card-hero">
	            <div><span>净值(USD)</span><strong>${escapeHtml(account.equity)}</strong></div>
	          </div>
	          <div class="account-card-flat-meta" aria-label="账号概要">
	            <span><small>余额</small><b>${escapeHtml(account.balance)}</b></span>
	            <span><small>信用金</small><b>${escapeHtml(account.credit)}</b></span>
	            <span><small>账户类型</small><b>${escapeHtml(account.accountType)}</b></span>
	            <span><small>杠杆</small><b>${escapeHtml(account.leverage)}</b></span>
	            <span><small>保证金比例</small><b>${escapeHtml(account.marginRatio)}</b></span>
	          </div>
	        </article>
	      `;
	    };
	    const previewAccountCards = accountCardSamples.map(accountCardMarkup).join("");
    const previewRealCards = accountCardSamples.filter((account) => account.kind === "real").map(accountCardMarkup).join("");
    const previewDemoCards = accountCardSamples.filter((account) => account.kind === "demo").map(accountCardMarkup).join("");
    const morphId = moduleMorphId(config, "TradingAccounts") || "statusBoard";
		    const accountRowsMarkup = `
		      <div class="ai-account-morph-row" data-kind="real"><b>Live</b><span>--</span><span>MT5 · 后台绑定</span><strong>--</strong><strong>--</strong><span>--</span><span>真实账号</span><span>--</span><span>--</span></div>
		      <div class="ai-account-morph-row" data-kind="demo"><b>Demo</b><span>--</span><span>MT5 · 后台绑定</span><strong>--</strong><strong>--</strong><span>--</span><span>模拟账号</span><span>--</span><span>--</span></div>
		    `;

    if (isSeparated) {
      feature.id = "accounts";
      feature.classList.add("is-split-accounts");
      feature.dataset.accountPresentation = morphId === "liveCardsDemoList" || (realViewMode === "card" && demoViewMode === "list") ? "real-cards-demo-list" : "separated";
      feature.innerHTML = `
        <div class="ai-accounts-command split">
          <div>
            <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
          </div>
        </div>
        <div class="accounts-split-view" data-accounts-split-view>
          <section class="account-split-module account-split-module-real" data-account-section="real" data-account-view="${escapeHtml(realViewMode)}" style="order:${realOrder}">
            <header>
              <div>
                <strong>真实交易账号列表</strong>
              </div>
              <div class="account-section-tools">
                <button class="account-create-button" data-home-action="openAccount" data-account-entry-kind="real" type="button">
                  <span>${icon("user")}</span>
                  创建账号
                </button>
              </div>
            </header>
            <div class="real-account-card-grid" data-real-account-cards>${previewRealCards}</div>
          </section>
          <section class="account-split-module account-split-module-demo" data-account-section="demo" data-account-view="${escapeHtml(demoViewMode)}" style="order:${demoOrder}">
            <header>
              <div>
                <strong>模拟交易账号列表</strong>
              </div>
              <div class="account-section-tools">
                <button class="account-create-button" data-home-action="openAccount" data-account-entry-kind="demo" type="button">
                  <span>${icon("demo")}</span>
                  创建账号
                </button>
              </div>
            </header>
            <div data-demo-account-list><div class="real-account-card-grid">${previewDemoCards}</div></div>
          </section>
        </div>
        <div class="accounts-card-view" data-accounts-card-view hidden></div>
        <div class="accounts-list-view" data-accounts-list-view hidden></div>
      `;
      return feature;
    }

	    if (morphId === "opsTable") {
	      feature.id = "accounts";
	      feature.innerHTML = `
	        <div class="ai-accounts-command"><strong>${escapeHtml(t(safeProps.titleKey))}</strong></div>
	        <div class="ai-account-ops-table" role="table" aria-label="${escapeHtml(t(safeProps.titleKey))}">
	          <div role="row"><b role="columnheader">账号类型</b><b role="columnheader">账号</b><b role="columnheader">交易环境</b><b role="columnheader">余额</b><b role="columnheader">净值</b><b role="columnheader">信用金</b><b role="columnheader">账户类型</b><b role="columnheader">杠杆</b><b role="columnheader">保证金比例</b></div>
	          ${accountRowsMarkup}
	        </div>
        <div class="accounts-card-view" data-accounts-card-view hidden>${previewAccountCards}</div>
        <div class="accounts-list-view" data-accounts-list-view hidden></div>
      `;
      return feature;
    }

	    if (morphId === "accountWall" || morphId === "mobileStack") {
	      feature.id = "accounts";
	      feature.innerHTML = `
	        <div class="ai-accounts-command"><strong>${escapeHtml(t(safeProps.titleKey))}</strong></div>
	        <div class="${morphId === "mobileStack" ? "ai-account-mobile-stack" : "accounts-card-view"}" data-accounts-card-view>${previewAccountCards}</div>
	        <div class="accounts-list-view" data-accounts-list-view hidden></div>
	      `;
      return feature;
    }

    if (morphId === "compactRows") {
      feature.id = "accounts";
      feature.innerHTML = `
        <div class="ai-accounts-command"><strong>${escapeHtml(t(safeProps.titleKey))}</strong></div>
        <div class="ai-account-compact-rows">${accountRowsMarkup}</div>
        <div class="accounts-card-view" data-accounts-card-view hidden>${previewAccountCards}</div>
        <div class="accounts-list-view" data-accounts-list-view hidden></div>
      `;
      return feature;
    }

	    if (["statusBoard", "groupPanels", "platformGroups", "heroAccountList"].includes(morphId)) {
	      feature.id = "accounts";
	      feature.innerHTML = `
	        <div class="ai-account-${escapeHtml(morphId)}">
	          <header><strong>${escapeHtml(t(safeProps.titleKey))}</strong></header>
	          <section class="ai-account-morph-list">${accountRowsMarkup}</section>
	        </div>
	        <div class="accounts-card-view" data-accounts-card-view hidden>${previewAccountCards}</div>
        <div class="accounts-list-view" data-accounts-list-view hidden></div>
      `;
      return feature;
    }

    const filterButtons = hasBothAccountTypes
      ? [
          '<button class="active" data-account-filter="all" type="button">全部</button>',
          '<button data-account-filter="real" type="button">真实</button>',
          '<button data-account-filter="demo" type="button">模拟</button>',
        ].join("")
      : "";
    const filterMarkup = hasBothAccountTypes
      ? `
          <div class="account-filter" role="tablist" aria-label="账号类型筛选">
            ${filterButtons}
          </div>
        `
      : `<span class="account-kind-pill">${accountSettings.demoEnabled ? "模拟账号" : "真实账号"}</span>`;
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
          <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
        </div>
        <div class="account-toolbar">
          ${filterMarkup}
          <div class="account-open-menu" data-account-open-menu></div>
          ${viewToggle}
        </div>
      </div>
      <div class="accounts-card-view" data-accounts-card-view>${previewAccountCards}</div>
      <div class="accounts-list-view" data-accounts-list-view hidden></div>
    `;
    return feature;
  }

  function renderUserKycRail(doc, config, props = {}) {
    const feature = wrapFeature(doc, "user_kyc_rail", "ai-user-rail-feature", config);
    const safeProps = sanitizeComponentProps("user_kyc_rail", props, []);
    const kycStatus = config.moduleSettings.userKycRail?.kycStatus || "verified";
    const kycLabel = {
      verified: "通过",
      pending: "未提交",
      reviewing: "待审",
      rejected: "拒绝",
    }[kycStatus] || "通过";
    const summaryText =
      kycStatus === "verified"
        ? t(safeProps.summaryKey)
      : kycStatus === "reviewing"
        ? "KYC 资料已提交，正在等待 CRM 审核结果。"
        : kycStatus === "rejected"
        ? "KYC 审核被拒绝，请先补充资料再继续开户流程。"
        : "KYC 尚未提交，请先完成认证资料。";
    feature.innerHTML = `
      <div class="ai-feature-title">
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

  function renderKycStatusCard(doc, config, props = {}) {
    const feature = wrapFeature(doc, "kyc_status_card", "ai-kyc-status-feature", config);
    const safeProps = sanitizeComponentProps("kyc_status_card", props, []);
    const kycStatus = config.moduleSettings.userKycRail?.kycStatus || "verified";
    const state = {
      pending: {
        label: "未提交",
        statusText: "Not Submitted",
        actionLabel: "Submit KYC",
        action: "kyc",
        copy: "当前 CRM 账户 KYC 状态：未提交",
      },
      reviewing: {
        label: "待审",
        statusText: "Pending Review",
        actionLabel: "",
        action: "",
        copy: "当前 CRM 账户 KYC 状态：待审",
      },
      verified: {
        label: "通过",
        statusText: "Verified",
        actionLabel: "",
        action: "",
        copy: "当前 CRM 账户 KYC 状态：通过",
      },
      rejected: {
        label: "拒绝",
        statusText: "Rejected",
        actionLabel: "Resubmit",
        action: "kyc",
        copy: "当前 CRM 账户 KYC 状态：拒绝",
      },
    }[kycStatus] || {
      label: "通过",
      statusText: "Verified",
      actionLabel: "",
      action: "",
      copy: "当前 CRM 账户 KYC 状态：通过",
    };

    feature.innerHTML = `
      <div class="ai-feature-title">
        <strong>${escapeHtml(t(safeProps.titleKey) || "KYC 状态")}</strong>
      </div>
      <div class="ai-kyc-current" data-kyc-status="${escapeHtml(kycStatus)}">
        <span>${escapeHtml(state.label)}</span>
        <strong>${escapeHtml(state.statusText)}</strong>
        <small>${escapeHtml(state.copy)}</small>
        ${
          state.actionLabel
            ? `<button type="button" data-home-action="${escapeHtml(state.action)}">${escapeHtml(state.actionLabel)}</button>`
            : ""
        }
      </div>
    `;
    return feature;
  }

  function renderAccountPerformance(doc, config, props = {}) {
    const feature = wrapFeature(doc, "trading_account_highlight", "ai-performance-feature", config);
    const safeProps = sanitizeComponentProps("trading_account_highlight", props, []);

	    if (isTradingCostWorkbenchConfig(config)) {
	      feature.innerHTML = `
	        <div class="ai-trader-cost-head">
	          <div>
	            <strong>交易成本与执行效率</strong>
	          </div>
	          <b>MT5 · 后台绑定</b>
	        </div>
	        <div class="ai-cost-strip" aria-label="交易成本指标">
	          <span><small>EURUSD 点差</small><b>--</b></span>
	          <span><small>佣金</small><b>--</b></span>
	          <span><small>平均执行</small><b>--</b></span>
	          <span><small>MT5 快捷操作</small><b>接口绑定</b></span>
	        </div>
	        <div class="ai-cost-position-grid">
	          <article>
	            <small>持仓 PnL</small>
	            <strong>--</strong>
	            <span>持仓接口返回后展示</span>
	          </article>
	          <article>
	            <small>保证金占用</small>
	            <strong>--</strong>
	            <span>保证金接口返回后展示</span>
	          </article>
        </div>
        <div class="ai-cost-curve" aria-label="持仓 PnL 曲线">
          <div class="ai-chart-stage">
            <div class="ai-echart-panel ai-cost-echart" data-home-echart data-chart-kind="trading-cost-pnl" data-chart-axis-mode="xy" data-chart-period="7" role="img" aria-label="ECharts 持仓 PnL 日期走势"></div>
            <svg class="ai-chart-fallback" viewBox="0 0 320 116" role="img" aria-label="持仓 PnL 走势">
              <path class="ai-cost-area" d="M8 94 L58 82 L110 86 L162 62 L214 50 L268 30 L312 18 L312 104 L8 104 Z" />
              <path class="ai-cost-line" d="M8 94 L58 82 L110 86 L162 62 L214 50 L268 30 L312 18" />
              <circle class="ai-cost-dot low" cx="8" cy="94" r="4" />
              <circle class="ai-cost-dot" cx="162" cy="62" r="4" />
              <circle class="ai-cost-dot current" cx="312" cy="18" r="5" />
            </svg>
          </div>
          <div data-chart-date-labels>
            <span>05/05</span>
            <span>05/08</span>
            <span>05/11</span>
          </div>
        </div>
        <div class="ai-cost-actions">
          <a data-home-action="downloadMt5" href="#accounts">MT5 Web</a>
          <a data-home-action="positions" href="#accounts">查看持仓</a>
          <a data-home-action="orders" href="#accounts">订单历史</a>
        </div>
      `;
      return feature;
    }

    feature.dataset.accountPerformance = "";

	    const accountOptions = [
	      { id: "live-account", label: "Live 账号 · 后台绑定" },
	      { id: "demo-account", label: "Demo 账号 · 后台绑定" },
	    ]
      .map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.label)}</option>`)
      .join("");

	    const accountMetrics = [
	      { key: "pnl", label: "Floating P/L", value: "--", tone: "" },
	      { key: "margin", label: "Margin Ratio", value: "--", tone: "" },
	      { key: "credit", label: "Credit", value: "--", tone: "" },
	      { key: "leverage", label: "Leverage", value: "--", tone: "" },
    ]
      .map(
        (metric) => `
          <span class="ai-performance-flat-metric">
            <small>${escapeHtml(metric.label)}</small>
            <b class="${escapeHtml(metric.tone)}" data-performance-metric-value="${escapeHtml(metric.key)}">${escapeHtml(metric.value)}</b>
          </span>
        `,
      )
      .join("");

    const morphId = moduleMorphId(config, "AccountPerformance") || "proChart";
    const chartPanel = (kind = "account-performance", label = "ECharts 账号净值和盈亏日期走势") => `
      <div class="ai-chart-stage">
        <div class="ai-echart-panel ai-performance-echart" data-home-echart data-chart-kind="${escapeHtml(kind)}" data-chart-axis-mode="xy" data-chart-period="7" role="img" aria-label="${escapeHtml(label)}"></div>
        <svg class="ai-chart-fallback" viewBox="0 0 320 128" role="img" aria-label="${escapeHtml(label)}">
          <path class="ai-performance-grid" d="M24 28H300M24 64H300M24 100H300" />
          <path class="ai-performance-area" d="M26 98 C72 72 110 90 148 60 C188 30 230 42 298 68 L298 112 L26 112 Z" />
          <path class="ai-performance-line" d="M26 98 C72 72 110 90 148 60 C188 30 230 42 298 68" />
        </svg>
      </div>
    `;
    if (!["proChart", "summaryChart"].includes(morphId)) {
      feature.innerHTML =
        {
	          sparklineBoard: `
	            <div class="ai-performance-spark-board">
	              <header><strong>${escapeHtml(t(safeProps.titleKey))}</strong><span>7D</span></header>
	              <div class="ai-performance-spark-grid">
	                <article><small>Equity</small><b>--</b>${chartPanel("account-performance")}</article>
	                <article><small>PnL</small><b>--</b>${chartPanel("trading-cost-pnl", "ECharts 持仓 PnL 日期走势")}</article>
	              </div>
	            </div>
	          `,
	          costBoard: `
	            <div class="ai-cost-strip" aria-label="交易成本指标">
	              <span><small>EURUSD 点差</small><b>--</b></span>
	              <span><small>佣金</small><b>--</b></span>
	              <span><small>平均执行</small><b>--</b></span>
	              <span><small>MT5 快捷操作</small><b>接口绑定</b></span>
	            </div>
	            <div class="ai-cost-curve">${chartPanel("trading-cost-pnl", "ECharts 持仓 PnL 日期走势")}</div>
	          `,
          dualChart: `
            <div class="ai-performance-dual-chart">
              <header><strong>${escapeHtml(t(safeProps.titleKey))}</strong><span>Equity / PnL</span></header>
              <section>${chartPanel("account-performance", "ECharts 账号净值走势")}</section>
              <section>${chartPanel("trading-cost-pnl", "ECharts 持仓 PnL 日期走势")}</section>
            </div>
          `,
          metricTrend: `
            <div class="ai-performance-trend-shell">
              <div class="ai-performance-account-metrics">${accountMetrics}</div>
              ${chartPanel("account-performance")}
            </div>
          `,
	          riskPanel: `
	            <div class="ai-performance-risk-panel">
	              <aside><strong>Risk Check</strong><span>保证金 --</span><span>最大回撤 --</span></aside>
	              ${chartPanel("account-performance")}
	            </div>
	          `,
	          positionPanel: `
	            <div class="ai-performance-position-panel">
	              <section><b>持仓接口</b><strong>--</strong><small>返回后展示</small></section>
	              ${chartPanel("trading-cost-pnl", "ECharts 持仓 PnL 日期走势")}
	            </div>
	          `,
          terminalChart: `
            <div class="ai-performance-terminal-chart">
              <header><span>MT5 LIVE2</span><b>ACCOUNT_PERFORMANCE</b></header>
              ${chartPanel("account-performance")}
              <footer>${accountMetrics}</footer>
            </div>
          `,
	          cleanSnapshot: `
	            <div class="ai-performance-clean-snapshot">
	              <div><small>Equity (USD)</small><strong data-performance-equity>--</strong><b data-performance-balance>Balance --</b></div>
	              ${chartPanel("account-performance")}
	              <div class="ai-performance-account-metrics">${accountMetrics}</div>
	            </div>
          `,
        }[morphId] ||
        `
          <div class="ai-performance-summary-chart">
            <div class="ai-performance-summary">${accountMetrics}</div>
            ${chartPanel("account-performance")}
          </div>
        `;
      return feature;
    }

    feature.innerHTML = `
      <div class="ai-performance-head">
        <div>
          <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
        </div>
        <div class="ai-performance-period" data-chart-period-switch aria-label="账号表现周期">
          <button class="active" type="button" data-chart-period="7" aria-pressed="true">7D</button>
          <button type="button" data-chart-period="30" aria-pressed="false">30D</button>
        </div>
      </div>
      <div class="ai-performance-body">
        <div class="ai-performance-summary">
          <div class="ai-performance-switchbar">
            <span class="account-status" data-performance-status>Live</span>
            <label class="ai-performance-select ai-performance-account-select">
              <span class="sr-only">切换交易账号</span>
              <select data-performance-account-select aria-label="切换交易账号">
                ${accountOptions}
              </select>
              <i aria-hidden="true"></i>
            </label>
            <label class="ai-performance-select ai-performance-metric-select">
              <span class="sr-only">选择图表指标</span>
              <select data-performance-metric-select aria-label="选择图表指标">
                <option value="pnl">PnL</option>
                <option value="equity">Equity</option>
              </select>
              <i aria-hidden="true"></i>
            </label>
          </div>
	          <div class="ai-performance-primary">
	            <span>Equity (USD)</span>
	            <strong data-performance-equity>--</strong>
	            <b data-performance-balance>Balance --</b>
	            <small data-performance-account-meta>MT5 · 后台绑定</small>
	          </div>
          <div class="ai-performance-account-metrics" aria-label="账号关键指标">
            ${accountMetrics}
          </div>
	          <p>数据由交易账号接口返回，缺失时保持占位状态。</p>
        </div>
        <div class="ai-performance-chart" aria-label="7日或30日账号净值和PnL折线图">
          <div class="ai-chart-meta">
            <span>Equity / PnL</span>
            <b data-chart-current-period>7D</b>
          </div>
          <div class="ai-chart-stage">
            <div class="ai-echart-panel ai-performance-echart" data-home-echart data-chart-kind="account-performance" data-chart-axis-mode="xy" data-chart-period="7" role="img" aria-label="ECharts 账号净值和盈亏日期走势"></div>
            <svg class="ai-chart-fallback" viewBox="0 0 420 184" role="img" aria-label="账号净值和盈亏走势">
              <path class="ai-performance-grid" d="M32 34H398M32 74H398M32 114H398M32 154H398" />
              <path class="ai-performance-area" d="M34 136 C82 108 104 82 144 94 C184 106 196 132 238 92 C274 58 312 60 344 48 C374 38 390 70 398 96 L398 160 L34 160 Z" />
              <path class="ai-performance-line" d="M34 136 C82 108 104 82 144 94 C184 106 196 132 238 92 C274 58 312 60 344 48 C374 38 390 70 398 96" />
              <circle class="ai-performance-dot muted" cx="34" cy="136" r="4" />
              <circle class="ai-performance-dot high" cx="344" cy="48" r="4" />
              <circle class="ai-performance-dot current" cx="398" cy="96" r="5" />
            </svg>
          </div>
          <div class="ai-chart-axis" data-chart-date-labels aria-hidden="true">
            <span>05/05</span>
            <span>05/08</span>
            <span>05/11</span>
          </div>
	          <div class="ai-chart-insights" aria-label="账号表现摘要">
	            <span><small data-performance-delta-label>7D Equity</small><b data-performance-delta>--</b></span>
	            <span><small>Peak Equity</small><b data-performance-peak>--</b></span>
	            <span><small>Max Drawdown</small><b data-performance-drawdown>--</b></span>
	          </div>
        </div>
      </div>
    `;
    return feature;
  }

  function renderWalletList(doc, config, props = {}) {
    const feature = wrapFeature(doc, "wallet_list", "ai-wallet-list-feature", config);
    const safeProps = sanitizeComponentProps("wallet_list", props, []);
    const rows = walletMetricRows(config.moduleSettings.assets.wallets);
    const morphId = moduleMorphId(config, "WalletList") || "currencyCards";
    const title = escapeHtml(t(safeProps.titleKey));
    const walletCell = (row, index = 0) => `
      <article role="listitem" data-wallet-rank="${index + 1}">
        <span class="ai-wallet-currency">
          <i aria-hidden="true">${escapeHtml(walletCurrencyMark(row.label))}</i>
          <b>${escapeHtml(row.label)}</b>
        </span>
        <strong>${escapeHtml(row.balance)}</strong>
      </article>
    `;
    const walletRows = rows
      .map(
        (row, index) => `
          <div class="ai-wallet-ledger-row" role="row">
            <span role="cell"><i aria-hidden="true">${escapeHtml(walletCurrencyMark(row.label))}</i>${escapeHtml(row.label)}</span>
            <strong role="cell">${escapeHtml(row.balance)}</strong>
            <small role="cell">#${index + 1}</small>
          </div>
        `,
      )
      .join("");
    const primaryWallet = rows[0] || { label: "USD", balance: "--" };
    const secondaryWallets = rows.slice(1);
    const walletMorphMarkup =
      {
        tileBoard: `
          <div class="ai-feature-title"><strong>${title}</strong></div>
          <div class="ai-wallet-tile-board" role="list" aria-label="${title}">${rows.map(walletCell).join("")}</div>
        `,
        compactLedger: `
          <div class="ai-feature-title"><strong>${title}</strong></div>
          <div class="ai-wallet-compact-ledger" role="table" aria-label="${title}">${walletRows}</div>
        `,
        horizontalStrip: `
          <div class="ai-wallet-horizontal-strip" role="list" aria-label="${title}">
            <b>${title}</b>
            ${rows.map(walletCell).join("")}
          </div>
        `,
        currencyTable: `
          <div class="ai-feature-title"><strong>${title}</strong></div>
          <div class="ai-wallet-currency-table" role="table" aria-label="${title}">${walletRows}</div>
        `,
        featuredPrimary: `
          <div class="ai-wallet-featured-primary">
            <article class="is-primary" role="listitem">
              <span class="ai-wallet-currency"><i aria-hidden="true">${escapeHtml(walletCurrencyMark(primaryWallet.label))}</i><b>${escapeHtml(primaryWallet.label)}</b></span>
              <strong>${escapeHtml(primaryWallet.balance)}</strong>
            </article>
            <div role="list" aria-label="${title}">${secondaryWallets.map(walletCell).join("")}</div>
          </div>
        `,
        groupedWallets: `
          <div class="ai-feature-title"><strong>${title}</strong></div>
          <div class="ai-wallet-grouped">
            <section><small>Fiat</small>${rows.filter((row) => row.label !== "USDT").map(walletCell).join("")}</section>
            <section><small>Digital</small>${rows.filter((row) => row.label === "USDT").map(walletCell).join("") || walletCell({ label: "USDT", balance: "--" })}</section>
          </div>
        `,
        balanceRanking: `
          <div class="ai-feature-title"><strong>${title}</strong></div>
          <ol class="ai-wallet-ranking">${rows.map((row, index) => `<li><b>${index + 1}</b>${walletCell(row, index)}</li>`).join("")}</ol>
        `,
        availabilityRows: `
          <div class="ai-feature-title"><strong>${title}</strong></div>
          <div class="ai-wallet-availability">${rows.map((row) => `<span><b>${escapeHtml(row.label)}</b><strong>${escapeHtml(row.balance)}</strong><small>Ready</small></span>`).join("")}</div>
        `,
        mobileCarousel: `
          <div class="ai-wallet-mobile-carousel" role="list" aria-label="${title}">${rows.map(walletCell).join("")}</div>
        `,
      }[morphId] ||
      `
        <div class="ai-feature-title">
          <strong>${title}</strong>
        </div>
        <div class="ai-wallet-card-list" role="list" aria-label="${title}">
          ${rows.map(walletCell).join("")}
        </div>
      `;
    feature.innerHTML = walletMorphMarkup;
    feature.id = "wallets";
    return feature;
  }

  function renderCreateAccountForm(doc, config, props = {}) {
    const feature = wrapFeature(doc, "create_account_form", "ai-create-account-feature", config);
    const safeProps = sanitizeComponentProps("create_account_form", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
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
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <a data-home-action="orders" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.ctaKey))}</a>
    `;
    return feature;
  }

	  function renderRiskDisclosure(doc, config, props = {}) {
	    const feature = wrapFeature(doc, "risk_disclosure", "ai-risk-feature", config);
	    const safeProps = sanitizeComponentProps("risk_disclosure", props, []);
    const morphId = moduleMorphId(config, "RiskDisclosure") || "legalStrip";
    const riskSettings = config.moduleSettings?.riskDisclosure || {};
    const fallbackCopy = Array.isArray(riskSettings.demoCopy) && riskSettings.demoCopy.length ? riskSettings.demoCopy : DEFAULT_MODULE_SETTINGS.riskDisclosure.demoCopy;
	    feature.id = "risk";
    const titleMarkup = featureTitleHtml(safeProps);
    const summaryMarkup = `<p>${escapeHtml(t(safeProps.summaryKey))}</p>`;
    const richTextMarkup = `
      <div class="ai-risk-richtext">
        <p><strong>${riskSettings.demoFallback !== false ? "Demo 参考风险提示：" : "风险披露："}</strong>${escapeHtml(fallbackCopy[0] || "交易产品涉及风险，请以后台合规披露为准。")}</p>
        <p>${escapeHtml(fallbackCopy[1] || "交易前请结合自身财务状况、投资经验和风险承受能力独立判断。")}</p>
        <ul>
          ${fallbackCopy.slice(2, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          <li>平台展示的风险披露、监管声明、条款链接和地区限制应以后台合规配置为准。</li>
          <li>若您不理解相关风险，应先咨询独立专业意见，再决定是否交易。</li>
        </ul>
      </div>
    `;
    const riskCta = `<a data-home-action="risk" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.ctaKey))}</a>`;
	    feature.innerHTML =
      {
        marginGuard: `
          <div class="ai-risk-margin-guard">
            <strong>Margin Guard</strong>
            ${summaryMarkup}
            <div><span>杠杆</span><b>高风险</b><span>强平</span><b>需关注</b></div>
          </div>
          ${riskCta}
        `,
        riskLevelPanel: `
          ${titleMarkup}
          <div class="ai-risk-level-panel"><b>Risk Level</b><strong>High</strong><small>请确认产品规则和保证金要求</small></div>
          ${richTextMarkup}
        `,
        compactNotice: `
          <div class="ai-risk-compact-notice">${titleMarkup}${summaryMarkup}${riskCta}</div>
        `,
        splitDisclosure: `
          <div class="ai-risk-split-disclosure">
            <section>${titleMarkup}${summaryMarkup}${riskCta}</section>
            <section>${richTextMarkup}</section>
          </div>
        `,
        iconWarnings: `
          ${titleMarkup}
          <div class="ai-risk-icon-warnings"><span>杠杆</span><span>滑点</span><span>流动性</span><span>强平</span></div>
          ${richTextMarkup}
        `,
        accordionDisclosure: `
          ${titleMarkup}
          <details class="ai-risk-accordion" open><summary>查看风险披露</summary>${richTextMarkup}</details>
          ${riskCta}
        `,
        tradeRiskSummary: `
          <div class="ai-risk-trade-summary">
            ${titleMarkup}
            <dl><div><dt>本金风险</dt><dd>可能亏损</dd></div><div><dt>杠杆</dt><dd>放大波动</dd></div><div><dt>执行</dt><dd>可能滑点</dd></div></dl>
          </div>
          ${riskCta}
        `,
        complianceBlock: `
          <article class="ai-risk-compliance-block">${titleMarkup}${richTextMarkup}${riskCta}</article>
        `,
        riskFaqCombo: `
          ${titleMarkup}
          <div class="ai-risk-faq-combo">
            ${richTextMarkup}
            <ul><li>是否适合我？取决于风险承受能力。</li><li>数据是否承诺收益？不构成未来收益承诺。</li></ul>
          </div>
          ${riskCta}
        `,
      }[morphId] ||
      `
        ${titleMarkup}
        ${summaryMarkup}
        ${richTextMarkup}
        ${riskCta}
      `;
    return feature;
  }

	  function renderFaqSection(doc, config, props = {}) {
	    const feature = wrapFeature(doc, "faq_section", "ai-faq-feature", config);
	    const safeProps = sanitizeComponentProps("faq_section", props, []);
	    feature.innerHTML = `
	      ${featureTitleHtml(safeProps)}
	      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
	      <div class="ai-faq-list">
	        <details>
	          <summary><span>${escapeHtml(t(safeProps.questionOneKey))}</span><i aria-hidden="true">+</i></summary>
	          <p>${escapeHtml(t(safeProps.answerOneKey))}</p>
	        </details>
	        <details>
	          <summary><span>${escapeHtml(t(safeProps.questionTwoKey))}</span><i aria-hidden="true">+</i></summary>
	          <p>${escapeHtml(t(safeProps.answerTwoKey))}</p>
	        </details>
	      </div>
	    `;
    return feature;
  }

	  function renderSupportContact(doc, config, props = {}) {
	    const feature = wrapFeature(doc, "support_contact", "ai-support-feature", config);
	    const safeProps = sanitizeComponentProps("support_contact", props, []);
	    feature.innerHTML = `
	      ${featureTitleHtml(safeProps)}
	      <div class="ai-support-bar">
	        <span><small>服务时间</small><b>后台配置</b></span>
	        <span><small>${escapeHtml(t(safeProps.secondaryKey))}</small><b>待分配</b></span>
	        <a data-home-action="support" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.primaryKey))}</a>
	      </div>
	    `;
	    return feature;
	  }

	  function renderAppDownload(doc, config, props = {}) {
	    const feature = wrapFeature(doc, "app_download", "ai-app-download-feature", config);
	    const safeProps = sanitizeComponentProps("app_download", props, []);
	    feature.innerHTML = `
	      ${featureTitleHtml(safeProps)}
	      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
	      <div class="ai-download-options">
	        <span><small>${escapeHtml(t(safeProps.primaryKey))}</small><b>QR</b></span>
	        <span><small>iOS / Android</small><b>Store</b></span>
	        <span><small>${escapeHtml(t(safeProps.secondaryKey))}</small><b>MT5</b></span>
	      </div>
	      <a data-home-action="download" href="${escapeHtml(safeProps.href)}">${escapeHtml(t(safeProps.primaryKey))}</a>
    `;
    return feature;
  }

	  function renderAnnouncements(doc, config, props = {}) {
	    const feature = wrapFeature(doc, "announcements", "ai-announcements-feature", config);
	    const safeProps = sanitizeComponentProps("announcements", props, []);
	    const style = moduleStyle(config, "announcements");
	    const notices = [
	      { type: "系统公告", title: "交易服务器维护通知", time: "05/16 02:00", tone: "important" },
	      { type: "活动公告", title: "五月活动规则更新", time: "Latest", tone: "campaign" },
	      { type: "维护通知", title: "出入金通道服务状态更新", time: "Today", tone: "maintenance" },
	    ];

	    if (style === "ticker-strip") {
	      const tickerNotices = notices.concat(notices);
	      feature.innerHTML = `
	        <div class="ai-announcement-ticker" aria-label="${escapeHtml(t(safeProps.titleKey))}">
	          <span>${escapeHtml(t(safeProps.titleKey))}</span>
	          <div class="ai-announcement-track">
	            ${tickerNotices.map((item) => `<b>${escapeHtml(item.type)} · ${escapeHtml(item.title)}</b>`).join('<i aria-hidden="true"></i>')}
	          </div>
	        </div>
	      `;
	      return feature;
	    }

	    const priorityNotice = style === "priority-notice" ? notices[0] : null;
	    const listNotices = priorityNotice ? notices.slice(1) : notices;
	    feature.innerHTML = `
	      ${featureTitleHtml(safeProps)}
	      ${
          priorityNotice
            ? `<article class="ai-announcement-priority">
                <small>${escapeHtml(priorityNotice.type)}</small>
                <strong>${escapeHtml(priorityNotice.title)}</strong>
                <span>${escapeHtml(priorityNotice.time)}</span>
              </article>`
            : ""
        }
	      <div class="ai-announcement-list" role="list">
	        ${listNotices
            .map(
              (item) => `
                <article class="ai-announcement-item" data-announcement-tone="${escapeHtml(item.tone)}" role="listitem">
                  <span>${escapeHtml(item.type)}</span>
                  <strong>${escapeHtml(item.title)}</strong>
                  <small>${escapeHtml(item.time)}</small>
                </article>
              `,
            )
            .join("")}
	      </div>
	    `;
    return feature;
  }

  function renderPammProducts(doc, config, props = {}) {
    const feature = wrapFeature(doc, "pamm_products", "ai-pamm-feature", config);
    const safeProps = sanitizeComponentProps("pamm_products", props, []);
    renderAiRecommendation(feature, safeProps, {
      id: "pamm-products",
      nameLabel: "PAMM 产品名称",
      name: "BlueWave Income PAMM",
      totalReturn: "+46.8%",
      monthReturn: "+7.9%",
      totalProfit: "$86,420",
      drawdown: "6.8%",
      risk: "中低",
      curve: [31, 35, 34, 41, 44, 48, 53],
      chartLabel: "PAMM 7日收益率曲线",
      reason: "AI 识别其 7 日净值斜率稳定，近 30 日回撤低于同收益段均值，适合新用户作为低波动跟随候选。",
      action: "pamm",
    });
    return feature;
  }

  function trendChartPaths(values, width = 320, height = 108) {
    const cleanValues = values.map(Number).filter(Number.isFinite);
    const paddingX = 18;
    const paddingY = 14;
    const floorY = height - paddingY;
    if (!cleanValues.length) {
      return { area: "", line: "", points: [], highIndex: -1, lowIndex: -1 };
    }
    const min = Math.min(...cleanValues);
    const max = Math.max(...cleanValues);
    const range = max - min || 1;
    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;
    const points = cleanValues.map((value, index) => {
      const x = cleanValues.length === 1 ? width / 2 : paddingX + (innerWidth * index) / (cleanValues.length - 1);
      const y = paddingY + innerHeight - ((value - min) / range) * innerHeight;
      return { x, y, value };
    });
    const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    const area = [
      `M ${points[0].x.toFixed(1)} ${floorY.toFixed(1)}`,
      ...points.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
      `L ${points[points.length - 1].x.toFixed(1)} ${floorY.toFixed(1)}`,
      "Z",
    ].join(" ");
    return {
      area,
      line,
      points,
      highIndex: cleanValues.indexOf(max),
      lowIndex: cleanValues.indexOf(min),
    };
  }

  function renderAiRecommendation(feature, safeProps, item) {
    const chart = trendChartPaths(item.curve);
    const currentIndex = chart.points.length - 1;
    const chartMarkers = chart.points
      .map((point, index) => {
        const markerClasses = [];
        if (index === chart.highIndex) markerClasses.push("high");
        if (index === chart.lowIndex) markerClasses.push("low");
        if (index === currentIndex) markerClasses.push("current");
        if (!markerClasses.length) return "";
        return `<circle class="ai-copy-dot ${markerClasses.join(" ")}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${index === currentIndex ? "4.8" : "4"}"></circle>`;
      })
      .join("");
    feature.id = item.id;
    feature.innerHTML = `
      <div class="ai-feature-title">
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-copy-signal-head">
        <div>
          <small>${escapeHtml(item.nameLabel)}</small>
          <b>${escapeHtml(item.name)}</b>
        </div>
        <span>${escapeHtml(item.risk)}</span>
      </div>
      <div class="ai-copy-signal-metrics">
        <span><small>总收益率</small><b>${escapeHtml(item.totalReturn)}</b></span>
        <span><small>近30日收益率</small><b>${escapeHtml(item.monthReturn)}</b></span>
        <span><small>总收益</small><b>${escapeHtml(item.totalProfit)}</b></span>
        <span><small>最大回撤</small><b>${escapeHtml(item.drawdown)}</b></span>
        <span><small>风险等级</small><b>${escapeHtml(item.risk)}</b></span>
      </div>
      <div class="ai-copy-curve" aria-label="${escapeHtml(item.chartLabel)}">
        <div class="ai-chart-stage">
          <div class="ai-echart-panel ai-copy-echart" data-home-echart data-chart-kind="recommendation-curve" data-chart-axis-mode="minimal" data-chart-values="${escapeHtml(JSON.stringify(item.curve || []))}" role="img" aria-label="ECharts ${escapeHtml(item.chartLabel)}"></div>
          <svg class="ai-chart-fallback" viewBox="0 0 320 108" aria-hidden="true" preserveAspectRatio="none">
            <path class="ai-copy-area" d="${chart.area}"></path>
            <path class="ai-copy-line" d="${chart.line}"></path>
            ${chartMarkers}
          </svg>
        </div>
        <div class="ai-copy-chart-labels" data-chart-date-labels aria-hidden="true">
          <span>05/05</span>
          <span>05/08</span>
          <span>05/11</span>
        </div>
      </div>
      <div class="ai-copy-reason">
        <span>AI 推荐理由</span>
        <p>${escapeHtml(item.reason)}</p>
      </div>
      <button class="ai-copy-cta" data-home-action="${escapeHtml(item.action)}" type="button">跟单</button>
    `;
  }

  function renderCopyTradingSummary(doc, config, props = {}) {
    const feature = wrapFeature(doc, "copytrading_signals", "ai-copytrading-feature", config);
    const safeProps = sanitizeComponentProps("copytrading_signals", props, []);
    renderAiRecommendation(feature, safeProps, {
      id: "copytrading",
      nameLabel: "信号源",
      name: "Aurora FX Alpha",
      totalReturn: "+128.4%",
      monthReturn: "+18.6%",
      totalProfit: "$12,430",
      drawdown: "4.2%",
      risk: "稳健型",
      curve: [42, 46, 45, 53, 57, 63, 68],
      chartLabel: "CopyTrading 7日收益率曲线",
      reason: "AI 判断该信号源近 30 日收益稳定，最大回撤低于同类前 25% 均值，并与当前真实账号净值和新手风险偏好匹配。",
      action: "copytrading",
    });
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
    kyc_status_card: renderKycStatusCard,
    announcements: renderAnnouncements,
    market_news: renderMarketInsight,
    risk_disclosure: renderRiskDisclosure,
    faq_section: renderFaqSection,
    support_contact: renderSupportContact,
    app_download: renderAppDownload,
    ad_carousel: renderAdCarousel,
    promo_banner: renderPromotionBanner,
    asset_summary: renderBalanceTotal,
    wallet_balance: renderWalletBalance,
    fund_actions: renderFundActions,
    quick_actions: renderQuickActions,
    open_account_panel: renderOpenAccountActions,
    onboarding_progress: renderOnboardingProgress,
    account_list: renderTradingAccounts,
    referral_link: renderReferralLink,
    user_kyc_rail: renderKycStatusCard,
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
    if (slot === "kyc_status_card") return settings.userKycRail?.enabled;
    if (slot === "announcements") return settings.announcements.enabled;
    if (slot === "market_news") return settings.marketNews.enabled;
    if (slot === "risk_disclosure") return settings.riskDisclosure?.enabled;
    if (slot === "faq_section") return settings.faq?.enabled;
    if (slot === "support_contact") return settings.supportContact?.enabled;
    if (slot === "app_download") return settings.appDownload?.enabled;
    if (slot === "balanceTotal" || slot === "accountBalances") return settings.assets.enabled;
    if (slot === "walletBalance") return settings.wallet.enabled && settings.wallet.placement === "standalone";
    if (slot === "wallet_list") return settings.wallet.enabled;
    if (slot === "fundActions") return fundActionsEnabled(config);
    if (slot === "openAccountActions") return openAccountChoices(config).length > 0 && settings.openAccount.placement === "standalone";
    if (slot === "adCarousel") return settings.adCarousel.enabled;
    if (slot === "promoHighlight") return settings.promoHighlight?.enabled !== false;
    if (slot === "quickActions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (slot === "referralLink") return settings.referral.enabled;
    if (slot === "userKycRail") return settings.userKycRail?.enabled;
    if (slot === "tradingAccounts") return settings.tradingAccounts.enabled;
    if (slot === "walletList") return settings.wallet.enabled;
    if (slot === "createAccountForm") return openAccountChoices(config).length > 0;
    if (slot === "accountPerformance") return settings.tradingAccounts.enabled || settings.assets.enabled;
    if (slot === "riskNotice") return settings.riskDisclosure?.enabled || settings.riskNotice.enabled;
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
    const highScoreReference = renderHighScoreComponentReference(doc, slot, config);
    if (highScoreReference) return highScoreReference;
    if (slot === "welcome_header") return renderWelcomeHeader(doc, config);
    if (slot === "asset_overview") return renderBalanceTotal(doc, config);
    if (slot === "quick_actions") return renderQuickActions(doc, config);
    if (slot === "onboarding_guide") return renderOnboardingProgress(doc, config);
    if (slot === "trading_account_highlight") return renderAccountPerformance(doc, config);
    if (slot === "trading_accounts_list") return renderTradingAccounts(doc, config);
    if (slot === "promo_banner") return renderPromotionBanner(doc, config);
    if (slot === "pamm_products") return renderPammProducts(doc, config);
    if (slot === "copytrading_signals") return renderCopyTradingSummary(doc, config);
    if (slot === "referral_link_card") return renderReferralLinkCard(doc, config);
    if (slot === "kyc_status_card") return renderKycStatusCard(doc, config);
    if (slot === "announcements") return renderAnnouncements(doc, config);
    if (slot === "market_news") return renderMarketInsight(doc, config);
    if (slot === "risk_disclosure") return renderRiskDisclosure(doc, config);
    if (slot === "faq_section") return renderFaqSection(doc, config);
    if (slot === "support_contact") return renderSupportContact(doc, config);
    if (slot === "app_download") return renderAppDownload(doc, config);
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
    if (slot === "userKycRail") return renderKycStatusCard(doc, config);
    if (slot === "accountPerformance") return renderAccountPerformance(doc, config);
    if (slot === "walletList") return renderWalletList(doc, config);
    if (slot === "createAccountForm") return renderCreateAccountForm(doc, config);
    if (slot === "marketInsight") return renderMarketInsight(doc, config);
    if (slot === "riskNotice") return renderRiskDisclosure(doc, config);

	    return wrapFeature(doc, slot, "ai-empty-feature", config);
	  }

  function aiHtmlSourceLabel(scheme) {
    if (!scheme?.enabled) return "";
    if (scheme.mock) return "Mock 预览";
    if (scheme.sourceType === "local-fallback") return "本地规则生成";
    if (scheme.isFallback) return "Fallback 预览";
    return "模型生成";
  }

  function renderAiHtmlScheme(config, target) {
    const shell = target.querySelector("[data-home-shell]");
    const scheme = normalizeAiHtmlScheme(config.htmlScheme, true);
    if (!shell || !scheme.enabled) {
      renderBlueprint(config, target);
      return;
    }

    shell.querySelectorAll(".client-welcome, [data-home-row], [data-home-module], [data-layout-section], [data-home-feature], [data-ai-html-render-host], [data-home-skeleton-render-host]").forEach((node) => node.remove());
    shell.classList.remove("is-blueprint-home");
    shell.classList.remove("is-skeleton-html-home");
    shell.classList.add("is-ai-html-home");
    shell.dataset.aiHtmlScheme = scheme.name;

	    const host = target.createElement("section");
	    host.className = "ai-html-render-host";
	    host.dataset.aiHtmlRenderHost = "";
	    host.dataset.aiHtmlSafety = scheme.safetyStatus || "sanitized";
	    host.dataset.aiHtmlSource = scheme.sourceType || "";
	    host.dataset.aiHtmlSourceLabel = aiHtmlSourceLabel(scheme);
	    host.dataset.aiHtmlFallback = scheme.isFallback ? "true" : "false";
	    host.dataset.aiHtmlMock = scheme.mock ? "true" : "false";
	    host.dataset.aiHtmlGridColumns = String(HOME_GRID_COLUMNS);
	    host.title = [aiHtmlSourceLabel(scheme), scheme.fallbackReason].filter(Boolean).join("：");
	    host.setAttribute("aria-label", scheme.name || "AI HTML 首页预览");

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          min-width: 0;
          color: var(--home-text, #172033);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; }
        a { color: inherit; text-decoration: none; }
        button, a { font: inherit; }
        .ai-html-page { --ai-html-grid-columns: ${HOME_GRID_COLUMNS}; }
        .ai-html-grid-12,
        .ai-html-page [data-ai-html-grid="12"] {
          display: grid;
          grid-template-columns: repeat(${HOME_GRID_COLUMNS}, minmax(0, 1fr));
          gap: var(--home-grid-gap, 14px);
          min-width: 0;
        }
        .ai-html-page [data-ai-html-span="12"] { grid-column: span 12; }
        .ai-html-page [data-ai-html-span="8"] { grid-column: span 8; }
        .ai-html-page [data-ai-html-span="6"] { grid-column: span 6; }
        .ai-html-page [data-ai-html-span="4"] { grid-column: span 4; }
        @media (max-width: 860px) {
          .ai-html-grid-12,
          .ai-html-page [data-ai-html-grid="12"] { grid-template-columns: 1fr; }
          .ai-html-page [data-ai-html-span] { grid-column: 1 / -1; }
        }
        ${scheme.css}
      </style>
      ${scheme.html}
    `;

    shadow.addEventListener("click", (event) => {
      const actionTarget = event.target?.closest?.("[data-home-action]");
      if (!actionTarget) return;
      host.dispatchEvent(
        new CustomEvent("home-ai-html-action", {
          bubbles: true,
          composed: true,
          detail: { action: actionTarget.dataset.homeAction || "" },
        }),
      );
    });

    shell.appendChild(host);
  }

  function skeletonSourceLabel(scheme) {
    if (!scheme?.enabled) return "";
    return scheme.sourceType === "local-fallback" ? "本地骨架回退" : "骨架 HTML 填充";
  }

  function skeletonSlotStatusLabel(status) {
    return {
      "pending-fill": "等待填充",
      generating: "正在生成",
      filled: "已填充",
      locked: "已锁定",
      failed: "生成失败",
      review: "待定稿",
      final: "已定稿",
    }[status] || "等待填充";
  }

  function renderSkeletonSlotTools(doc, slot, label, slotRecord = {}) {
    const tools = doc.createElement("div");
    tools.className = "home-skeleton-slot-tools";
    tools.dataset.homeSkeletonSlotTools = "";
    const locked = Boolean(slotRecord.locked || slotRecord.status === "locked" || slotRecord.status === "final");
    const generating = slotRecord.status === "generating";
    const hasComponent = Boolean(slotRecord.componentId || slotRecord.status === "filled" || locked);
    tools.classList.toggle("is-generating", generating);
    tools.setAttribute("aria-live", "polite");
    if (generating) {
      tools.innerHTML = `
        <span>${escapeHtml(label)}</span>
        <button class="is-loading" type="button" disabled>生成中</button>
      `;
      return tools;
    }
    tools.innerHTML = `
      <span>${escapeHtml(label)}</span>
      ${
        locked
          ? `<button type="button" data-home-skeleton-action="unlock" data-home-skeleton-action-slot="${escapeHtml(slot)}">解锁</button>`
          : `
            <button type="button" data-home-skeleton-action="regenerate" data-home-skeleton-action-slot="${escapeHtml(slot)}">${hasComponent ? "重生成" : "生成"}</button>
            ${hasComponent ? `<button type="button" data-home-skeleton-action="style" data-home-skeleton-action-slot="${escapeHtml(slot)}">换样式</button>` : ""}
            ${hasComponent ? `<button type="button" data-home-skeleton-action="lock" data-home-skeleton-action-slot="${escapeHtml(slot)}">锁定</button>` : ""}
          `
      }
    `;
    return tools;
  }

  function renderSkeletonSlotComponent(doc, slot, component, slotRecord = {}) {
    const wrapper = doc.createElement("div");
    wrapper.className = "home-skeleton-ai-component";
    wrapper.dataset.homeSkeletonSlotComponent = slot;
    wrapper.dataset.homeSkeletonComponentId = component.id || "";
    wrapper.dataset.homeSkeletonComponentFamily = component.family || "";
    wrapper.dataset.homeSkeletonComponentSource = component.sourceType || "";
    wrapper.dataset.homeSkeletonReferenceComponent = component.referenceComponentId || "";
    wrapper.dataset.homeSkeletonSlotChrome = normalizeSkeletonSlotChrome(component.chrome || slotRecord.chrome || "contained");
    wrapper.classList.toggle("is-brick-fallback", component.sourceType === "brick-fallback");
    if (component.fallbackReason) wrapper.title = component.fallbackReason;

    if (component.css) {
      const style = doc.createElement("style");
      style.textContent = component.css;
      wrapper.appendChild(style);
    }

    const body = doc.createElement("div");
    body.className = "home-skeleton-ai-component-body";
    body.innerHTML = component.html || `<article class="home-skeleton-local-component"><strong>${escapeHtml(component.name || featureLabel(slot))}</strong></article>`;
    wrapper.appendChild(body);
    return wrapper;
  }

  function renderSkeletonModuleLoading(doc, label, mode = "loading") {
    const loading = doc.createElement("div");
    loading.className = "home-skeleton-module-loading";
    loading.dataset.homeSkeletonModuleLoading = mode;
    loading.setAttribute("aria-hidden", "true");
    loading.innerHTML = `
      <div class="home-skeleton-module-loading-head">
        <span>${escapeHtml(mode === "refreshing" ? "Regenerating" : "Generating")}</span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <div class="home-skeleton-module-loading-lines">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <div class="home-skeleton-module-loading-grid">
        <b></b>
        <b></b>
        <b></b>
      </div>
    `;
    return loading;
  }

  // 给空的迷你走势图容器兜底一个 sparkline，避免渲染成空灰盒（积木只放了容器、没塞图）。
  // 升级 #5：数据契约图表 —— 容器声明 data-home-chart="line|area|bars" + data-home-chart-values="..."
  // (+可选 data-home-chart-tone="up|down")，渲染器据此确定性出图；无声明时按附近指标符号推断走势。
  // 自包含 SVG，不依赖 CDN ECharts，离线/无头环境也稳定。
  const HOME_CHART_DEFAULT_VALUES = [12, 18, 15, 22, 20, 28, 31];

  function parseHomeChartValues(raw) {
    const list = String(raw || "")
      .split(/[\s,;]+/)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
    return list.length >= 2 ? list.slice(0, 48) : null;
  }

  function inferHomeChartToneFromContext(node) {
    const text = (node.closest("[data-home-skeleton-slot]") || node.parentElement || node).textContent || "";
    if (/-\s*\d|下跌|回撤|亏损|负/.test(text) && !/\+\s*\d/.test(text)) return "down";
    return "up";
  }

  function buildHomeChartSvg(doc, options = {}) {
    const ns = "http://www.w3.org/2000/svg";
    const type = ["line", "area", "bars"].includes(options.type) ? options.type : "area";
    const tone = options.tone === "down" ? "down" : "up";
    let values = Array.isArray(options.values) && options.values.length >= 2 ? options.values.slice(0, 48) : HOME_CHART_DEFAULT_VALUES.slice();
    if (tone === "down") values = values.slice().reverse();
    const W = 120;
    const H = 40;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const stroke = tone === "down" ? "var(--home-danger, #dc2626)" : "var(--home-primary, #2563eb)";
    const fill = tone === "down" ? "rgba(220,38,38,0.10)" : "var(--home-primary-faint, #eff6ff)";
    const svg = doc.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "home-skeleton-fallback-spark");
    svg.setAttribute("aria-hidden", "true");
    const x = (i) => (values.length === 1 ? 0 : (i / (values.length - 1)) * W);
    const y = (v) => H - 4 - ((v - min) / span) * (H - 8);

    if (type === "bars") {
      const bw = Math.max(2, (W / values.length) * 0.6);
      values.forEach((v, i) => {
        const bx = x(i) - bw / 2;
        const by = y(v);
        const rect = doc.createElementNS(ns, "rect");
        rect.setAttribute("x", String(Math.max(0, bx)));
        rect.setAttribute("y", String(by));
        rect.setAttribute("width", String(bw));
        rect.setAttribute("height", String(Math.max(1, H - 2 - by)));
        rect.setAttribute("rx", "1.5");
        rect.setAttribute("fill", stroke);
        svg.appendChild(rect);
      });
      return svg;
    }

    const d = "M " + values.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" L ");
    if (type === "area") {
      const area = doc.createElementNS(ns, "path");
      area.setAttribute("d", `${d} L ${W} ${H} L 0 ${H} Z`);
      area.setAttribute("fill", fill);
      svg.appendChild(area);
    }
    const line = doc.createElementNS(ns, "path");
    line.setAttribute("d", d);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(line);
    return svg;
  }

  // 读取容器上的图表数据契约并渲染；契约缺失时回退到按上下文推断的确定性走势。
  function renderHomeChartContainer(doc, node, seed = 0) {
    const declaredValues = parseHomeChartValues(node.getAttribute && node.getAttribute("data-home-chart-values"));
    const declaredType = node.getAttribute && node.getAttribute("data-home-chart");
    const declaredTone = node.getAttribute && node.getAttribute("data-home-chart-tone");
    const tone = declaredTone === "up" || declaredTone === "down" ? declaredTone : inferHomeChartToneFromContext(node);
    const values = declaredValues || HOME_CHART_DEFAULT_VALUES.map((v, i) => v + ((seed + i) % 3) * 2);
    node.appendChild(buildHomeChartSvg(doc, { type: declaredType || "area", values, tone }));
    node.classList.add("home-skeleton-sparkline-filled");
  }

  // 骨架阶段决定的主操作角色（升级 #2）：按 emphasis 强弱排序，取最强的资金/开户动作为全页唯一主 CTA。
  function skeletonPrimaryActionRole(doc) {
    const ds = (doc.body && doc.body.dataset) || {};
    const ranked = [
      ["deposit", ds.homeEmphasisDeposit],
      ["openAccount", ds.homeEmphasisOpenAccount],
      ["joinCampaign", ds.homeEmphasisPromo],
    ];
    const weight = { high: 3, medium: 2, low: 1 };
    let best = "deposit";
    let bestW = -1;
    ranked.forEach(([role, level]) => {
      const w = weight[String(level || "").toLowerCase()] || 0;
      if (w > bestW) { bestW = w; best = role; }
    });
    return best;
  }

  // 发布态首页一致性收口：1) 空走势图兜底 sparkline；2) 主资金 CTA 去重 —— 优先用积木入库时标注的
  // data-home-action 语义 + 骨架阶段的 emphasis 决定唯一主 CTA，其余资金/开户类大按钮降级为描边；
  // 老数据（未标注 data-home-action）回退到文案+尺寸启发式，保证过渡期也生效。
  function harmonizeSkeletonPublishedHomepage(doc, host) {
    if (!host) return;
    try {
      // 升级 #5：先处理显式声明数据契约的图表容器，再兜底空的图表类容器
      host.querySelectorAll("[data-home-chart]").forEach((node, index) => {
        if (node.querySelector("svg, canvas, img")) return;
        renderHomeChartContainer(doc, node, index);
      });
      host
        .querySelectorAll('.fx-signal-chart-container, [class*="signal-chart"], [class*="sparkline"], [class*="mini-chart"], [class*="trend-chart"]')
        .forEach((node, index) => {
          if (node.children.length || (node.textContent || "").trim() || node.querySelector("svg, canvas, img")) return;
          if ((node.clientHeight || 0) < 8) return;
          renderHomeChartContainer(doc, node, index);
        });

      const inTable = (el) => el.closest("table, thead, tbody, tr, .fx-action-button");
      const primaryRole = skeletonPrimaryActionRole(doc);
      const competingRoles = new Set(["deposit", "openAccount", "withdraw", "joinCampaign"]);
      const semanticCtas = [...host.querySelectorAll("[data-home-action]")].filter(
        (el) => /^(button|a)$/i.test(el.tagName) && !inTable(el) && competingRoles.has(el.dataset.homeAction) && el.offsetWidth >= 140,
      );

      let ctas;
      if (semanticCtas.length) {
        // 契约驱动：主角色优先做主 CTA，其余竞争性资金动作降级
        ctas = semanticCtas;
        const primaryCandidates = ctas.filter((el) => el.dataset.homeAction === primaryRole);
        const pool = primaryCandidates.length ? primaryCandidates : ctas;
        let dominant = pool[0];
        let maxArea = dominant.offsetWidth * dominant.offsetHeight;
        pool.forEach((el) => {
          const area = el.offsetWidth * el.offsetHeight;
          if (area > maxArea) { maxArea = area; dominant = el; }
        });
        ctas.forEach((el) => {
          if (el !== dominant) el.classList.add("home-skeleton-cta-demoted");
        });
      } else {
        // 回退：老数据没有 data-home-action 时，用文案+尺寸启发式
        ctas = [...host.querySelectorAll("button, a")].filter((el) => {
          const text = (el.textContent || "").replace(/\s+/g, "");
          if (!/入金|开户/.test(text) || /出金|转账|历史|记录|查看/.test(text)) return false;
          if (inTable(el)) return false;
          return el.offsetWidth >= 160;
        });
        if (ctas.length > 1) {
          let dominant = ctas[0];
          let maxArea = dominant.offsetWidth * dominant.offsetHeight;
          ctas.forEach((el) => {
            const area = el.offsetWidth * el.offsetHeight;
            if (area > maxArea) { maxArea = area; dominant = el; }
          });
          ctas.forEach((el) => {
            if (el !== dominant) el.classList.add("home-skeleton-cta-demoted");
          });
        }
      }
    } catch (err) {
      /* 收口失败不阻断渲染 */
    }
  }

  function renderSkeletonHtmlScheme(config, target) {
    const shell = target.querySelector("[data-home-shell]");
    const scheme = normalizeSkeletonHtmlScheme(config.skeletonHtmlScheme, true);
    const effectiveScheme = scheme.enabled ? scheme : buildSkeletonHtmlScheme(config);
    if (!shell || !effectiveScheme.enabled) {
      renderBlueprint(config, target);
      return;
    }

    const doc = target;
    shell.querySelectorAll(".client-welcome, [data-home-row], [data-home-module], [data-layout-section], [data-home-feature], [data-ai-html-render-host], [data-home-skeleton-render-host]").forEach((node) => node.remove());
    shell.classList.remove("is-blueprint-home");
    shell.classList.remove("is-ai-html-home");
    shell.classList.add("is-skeleton-html-home");
    shell.dataset.skeletonHtmlScheme = effectiveScheme.name;
    shell.dataset.skeletonHtmlSource = effectiveScheme.sourceType || "";
    shell.dataset.skeletonHtmlContract = effectiveScheme.designContract?.id || "";

    const host = doc.createElement("section");
    host.className = "home-skeleton-render-host";
    host.dataset.homeSkeletonRenderHost = "";
    host.dataset.homeSkeletonSource = effectiveScheme.sourceType || "";
    host.dataset.homeSkeletonSourceLabel = skeletonSourceLabel(effectiveScheme);
    host.dataset.homeSkeletonStatus = effectiveScheme.status || "pending-fill";
    host.dataset.homeSkeletonContract = effectiveScheme.designContract?.id || "";
    host.dataset.homeSkeletonChromeMode = effectiveScheme.designContract?.chromePolicy?.mode || "";
    host.dataset.homeSkeletonComponentBoundary = effectiveScheme.designContract?.chromePolicy?.componentBoundary || "";
    host.dataset.homeSkeletonPersonality = effectiveScheme.designContract?.personality || "";
    host.dataset.homeSkeletonDensity = effectiveScheme.designContract?.density || "";
    applySkeletonContractStyleVars(host, effectiveScheme.designContract);
    host.setAttribute("aria-label", effectiveScheme.name || "骨架 HTML 填充首页预览");
    host.innerHTML = effectiveScheme.skeletonHtml || buildSkeletonHtmlScheme(config).skeletonHtml;

    const isEditableSkeletonPreview = target.body?.dataset?.homePreview === "content-only";
    const isPublishedSkeleton = !isEditableSkeletonPreview || effectiveScheme.status === "final";
    host.classList.toggle("is-published-skeleton", isPublishedSkeleton);
    host.querySelector("[data-home-skeleton-root]")?.classList.toggle("is-published-skeleton-page", isPublishedSkeleton);
    if (isPublishedSkeleton) {
      host.querySelectorAll(".home-skeleton-top, .home-skeleton-section-head").forEach((node) => node.remove());
    }

    const canEditSlots = isEditableSkeletonPreview && effectiveScheme.status !== "final";
    const slotRecords = Object.fromEntries(effectiveScheme.slots.map((slot) => [slot.id, slot]));
    host.querySelectorAll("[data-home-skeleton-slot]").forEach((slotNode) => {
      const slot = skeletonSlotKey(slotNode.dataset.homeSkeletonSlot);
      const slotRecord = slotRecords[slot] || { id: slot, label: featureLabel(slot), status: "pending-fill" };
      const label = slotRecord.label || featureLabel(slot);
      const component = effectiveScheme.slotComponents?.[slot];
      const status = normalizeSkeletonStatus(slotRecord.status, component?.html ? "filled" : "pending-fill");
      const placeholder = slotNode.querySelector("[data-home-skeleton-placeholder]");
      slotNode.dataset.homeSkeletonChrome = normalizeSkeletonSlotChrome(slotRecord.chrome || slotNode.dataset.homeSkeletonChrome || "contained");
      slotNode.dataset.homeSkeletonStatus = status;
      slotNode.setAttribute("aria-busy", status === "generating" ? "true" : "false");
      slotNode.classList.toggle("is-generating", status === "generating");
      slotNode.classList.toggle("is-filled", Boolean(component?.html));
      slotNode.classList.toggle("is-locked", status === "locked" || status === "final");
      slotNode.classList.toggle("is-failed", status === "failed");
      if (isPublishedSkeleton) {
        slotNode.classList.add("home-skeleton-published-slot");
        slotNode.innerHTML = "";
        const content = component?.html ? renderSkeletonSlotComponent(doc, slot, component, slotRecord) : renderSlot(doc, slot, config);
        content.classList.add("home-skeleton-slot-content");
        content.dataset.homeSkeletonPublishedSlot = slot;
        content.dataset.homeSkeletonFillMode = component?.html ? "ai-component" : "config-fallback";
        slotNode.appendChild(content);
        return;
      }
      placeholder?.classList.toggle("is-filled", Boolean(component?.html));
      placeholder?.classList.toggle("is-generating", status === "generating");
      placeholder?.classList.toggle("is-failed", status === "failed");
      if (placeholder) {
        placeholder.dataset.homeSkeletonStatus = status;
        placeholder.setAttribute("aria-live", "polite");
        const title = placeholder.querySelector("strong");
        const statusText = placeholder.querySelector("small");
        const progress = placeholder.querySelector("[data-home-skeleton-progress]");
        if (title) title.textContent = label;
        if (statusText) statusText.textContent = status === "generating" ? `${slot} · ${slotNode.dataset.homeSkeletonChrome} · 正在生成，请稍候...` : `${slot} · ${slotNode.dataset.homeSkeletonChrome} · ${skeletonSlotStatusLabel(slotRecord.status)}`;
        if (status === "generating" && !progress) {
          const progressNode = doc.createElement("div");
          progressNode.className = "home-skeleton-generation-progress";
          progressNode.dataset.homeSkeletonProgress = "";
          progressNode.innerHTML = "<i aria-hidden=\"true\"></i><em>AI 正在生成模块内容</em>";
          placeholder.appendChild(progressNode);
        } else if (status !== "generating") {
          progress?.remove();
        }
      }
      if (component?.html) {
        const content = renderSkeletonSlotComponent(doc, slot, component, slotRecord);
        content.classList.add("home-skeleton-slot-content");
        content.dataset.homeSkeletonFilledSlot = slot;
        content.dataset.homeSkeletonFillMode = "ai-component";
        slotNode.appendChild(content);
      }
      if (status === "generating") {
        slotNode.appendChild(renderSkeletonModuleLoading(doc, label, component?.html ? "refreshing" : "loading"));
      }
      if (canEditSlots) slotNode.appendChild(renderSkeletonSlotTools(doc, slot, label, slotRecord));
    });

    host.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-home-skeleton-action]");
      if (!button) return;
      event.preventDefault();
      const action = ["style", "lock", "unlock"].includes(button.dataset.homeSkeletonAction) ? button.dataset.homeSkeletonAction : "regenerate";
      const slot = button.dataset.homeSkeletonActionSlot || button.closest("[data-home-skeleton-slot]")?.dataset.homeSkeletonSlot || "";
      target.defaultView?.parent?.postMessage?.({ type: "home-skeleton-slot-action", action, slot }, "*");
    });

    shell.appendChild(host);
    if (isPublishedSkeleton) harmonizeSkeletonPublishedHomepage(doc, host);
    // 两阶段交互运行时：slotComponents 片段用声明式 data-action 表达交互，由此可信运行时统一绑定（事件委托，幂等安装）。
    installTwoStageInteractionRuntime(target);
  }

  // 与 server.js 的 TWO_STAGE_INTERACTION_RUNTIME_JS 等价的可信运行时（前端内嵌，避免经 JSON 传 JS）。
  // 仅依赖 data-action 声明式属性 + 事件委托，幂等：同一 document 只安装一次。
  function installTwoStageInteractionRuntime(doc) {
    if (!doc || doc.__twoStageRuntimeInstalled) return;
    doc.__twoStageRuntimeInstalled = true;
    const scopeOf = (el) => el.closest("[data-home-skeleton-slot]") || el.closest("[data-slot-id]") || doc;
    doc.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action]");
      if (!t) return;
      const action = t.getAttribute("data-action");
      if (action === "copy") {
        let text = t.getAttribute("data-copy-text");
        if (!text) {
          const tgt = scopeOf(t).querySelector(t.getAttribute("data-copy-target") || "[data-copy-source]");
          text = tgt ? (tgt.value || tgt.textContent || "").trim() : "";
        }
        if (text && doc.defaultView?.navigator?.clipboard) doc.defaultView.navigator.clipboard.writeText(text);
        const old = t.getAttribute("data-copy-label") || t.textContent;
        t.textContent = "已复制";
        setTimeout(() => { t.textContent = old; }, 1400);
      } else if (action === "collapse") {
        const sel = t.getAttribute("data-collapse-target");
        const box = sel ? scopeOf(t).querySelector(sel) : t.nextElementSibling;
        if (box) { box.hidden = !box.hidden; t.setAttribute("aria-expanded", String(!box.hidden)); }
      } else if (action === "tab" || action === "viewswitch") {
        const group = t.getAttribute("data-tab-group");
        const scope = scopeOf(t);
        scope.querySelectorAll('[data-action="' + action + '"][data-tab-group="' + group + '"]').forEach((b) => b.classList.toggle("is-active", b === t));
        const targetKey = t.getAttribute("data-tab-target");
        scope.querySelectorAll('[data-tab-panel][data-tab-group="' + group + '"]').forEach((p) => { p.hidden = p.getAttribute("data-tab-panel") !== targetKey; });
      } else if (action === "carousel-prev" || action === "carousel-next") {
        const car = t.closest("[data-carousel]");
        if (!car) return;
        const items = car.querySelectorAll("[data-carousel-item]");
        if (!items.length) return;
        let cur = car.__i || 0;
        cur = (cur + (action === "carousel-next" ? 1 : -1) + items.length) % items.length;
        car.__i = cur;
        items.forEach((it, i) => { it.hidden = i !== cur; });
      }
    });
    doc.addEventListener("mouseover", (e) => { const t = e.target.closest('[data-action="tooltip"]'); if (t) t.setAttribute("data-tooltip-open", "1"); });
    doc.addEventListener("mouseout", (e) => { const t = e.target.closest('[data-action="tooltip"]'); if (t) t.removeAttribute("data-tooltip-open"); });
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
    if (component === "risk_disclosure") return settings.riskDisclosure?.enabled;
    if (component === "faq_section") return settings.faq?.enabled;
    if (component === "support_contact") return settings.supportContact?.enabled;
    if (component === "app_download") return settings.appDownload?.enabled;
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
    if (component === "risk_notice") return settings.riskDisclosure?.enabled || settings.riskNotice.enabled;
	    return true;
	  }

	  function hasExecutableStyleContract(config = {}) {
	    return Boolean(config?.styleContract || config?.goldenStyleContract);
	  }

	  function blueprintSectionForBlock(block = {}) {
	    if (block.slot === "hero") return { type: "hero", id: "blueprint-hero" };
	    if (block.slot === "rail") return { type: "rail", id: "blueprint-rail" };
	    if (block.slot === "full") return { type: "full", id: "blueprint-full" };
	    return { type: "split", id: "blueprint-split" };
	  }

	  function blueprintRowComponents(row = {}) {
	    return (Array.isArray(row.items) ? row.items : [])
	      .map((item) => canonicalHomeBlock(item.block?.component) || item.block?.component || "")
	      .filter(Boolean);
	  }

	  function blueprintRowNeedsDistinctCards(row = {}) {
	    const components = blueprintRowComponents(row);
	    if (components.length < 2) return false;
	    const componentSet = new Set(components);
	    return componentSet.has("asset_overview") && componentSet.has("quick_actions");
	  }

	  function shouldRenderBlueprintComposite(row = {}, composite = {}) {
	    if (!composite?.id) return false;
	    if (blueprintRowNeedsDistinctCards(row)) return false;
	    const surface = cleanMetaText(composite.surface, "", 32);
	    // C：除了 shared-workbench，也兑现规划层产出的 connected-panel / light-section 业务组，
	    // 让多行同组模块渲染成一个视觉分区，而不是被拆成互不相关的卡。
	    return ["shared-workbench", "connected-panel", "light-section"].includes(surface);
	  }

	  function blueprintRowChrome(row = {}, config = {}, designContract = null) {
	    const items = Array.isArray(row.items) ? row.items : [];
	    if (designContract) {
	      // —— 原有 golden 契约逻辑，保持不变 ——
	      const policy = designContract.chromePolicy || {};
	      if (blueprintRowNeedsDistinctCards(row)) return "separated";
	      const slotChromes = items.map((item) => skeletonSlotChrome(item.block?.component, config, blueprintSectionForBlock(item.block), designContract));
	      if (slotChromes.includes("featured")) return "band";
	      if (slotChromes.every((chrome) => chrome === "tableSurface")) return "workbench";
	      if (slotChromes.every((chrome) => chrome === "legalStrip" || chrome === "bare" || chrome === "inline")) return "plain";
	      if (items.length > 1 && policy.mode === "flatConnected") return "connected";
	      if (policy.mode === "sectionBand" || policy.mode === "heroProof") return "band";
	      if (policy.mode === "workbench") return "workbench";
	      return normalizeSkeletonSectionChrome(policy.sectionChrome, "group");
	    }
	    // —— B：无 golden 契约的日常生成也按角色派生行外壳，让成对相关模块并成连体组 ——
	    if (items.length < 2) return "";
	    if (blueprintRowNeedsDistinctCards(row)) return "separated";
	    const slotChromes = items.map((item) => skeletonSlotChrome(item.block?.component, config, blueprintSectionForBlock(item.block), {}));
	    if (slotChromes.includes("featured")) return "band";
	    if (slotChromes.every((chrome) => chrome === "tableSurface")) return "workbench";
	    if (slotChromes.every((chrome) => chrome === "legalStrip" || chrome === "bare" || chrome === "inline")) return "plain";
	    return "connected";
	  }

	  function blueprintRowCompositeMeta(row = {}) {
	    const blocks = (Array.isArray(row.items) ? row.items : []).map((item) => item.block || {});
	    const ids = [...new Set(blocks.map((block) => cleanMetaText(block.compositeId, "", 64)).filter(Boolean))];
	    if (ids.length !== 1) return null;
	    const primary = blocks.find((block) => cleanMetaText(block.compositeId, "", 64) === ids[0]) || {};
	    return {
	      id: ids[0],
	      title: cleanMetaText(primary.compositeTitle || primary.sectionTitle, "", 80),
	      surface: cleanMetaText(primary.compositeSurface, "", 32),
	      role: cleanMetaText(primary.compositeRole, "", 24),
	      groupId: cleanMetaText(primary.groupId, "", 48),
	    };
	  }

	  function createBlueprintCompositeNode(doc, composite = {}) {
	    const node = doc.createElement("section");
	    node.className = "ai-home-composite";
	    node.dataset.homeComposite = composite.id || "";
	    node.dataset.homeCompositeSurface = composite.surface || "";
	    node.dataset.homeCompositeRole = composite.role || "";
	    if (composite.groupId) node.dataset.homeCompositeGroup = composite.groupId;
	    if (composite.title) node.setAttribute("aria-label", composite.title);
	    return node;
	  }

	  function renderBlueprint(config, target) {
	    const shell = target.querySelector("[data-home-shell]");
	    if (!shell) return;

	    const doc = target;
	    const designContract = hasExecutableStyleContract(config) ? buildSkeletonDesignContract(config) : null;
	    const renderableBlocks = config.layout.filter((block) => COMPONENT_MAP[block.component] && componentEnabled(block.component, config));
	    const heroBlocks = renderableBlocks.filter((block) => block.slot === "hero" && block.component !== "welcome_header");

    shell.querySelectorAll(".client-welcome, [data-home-composite], [data-home-row], [data-home-module], [data-layout-section], [data-home-feature], [data-ai-html-render-host], [data-home-skeleton-render-host]").forEach((node) => node.remove());
    shell.classList.add("is-blueprint-home");
	    shell.classList.remove("is-ai-html-home");
	    shell.classList.remove("is-skeleton-html-home");
	    shell.toggleAttribute("data-home-blueprint-contract", Boolean(designContract));
	    if (designContract) {
	      shell.dataset.homeBlueprintContract = designContract.id;
	      shell.dataset.homeBlueprintChromeMode = designContract.chromePolicy?.mode || "";
	      shell.dataset.homeBlueprintComponentBoundary = designContract.chromePolicy?.componentBoundary || "";
	      shell.dataset.homeBlueprintPersonality = designContract.personality || "";
	      applySkeletonContractStyleVars(shell, designContract);
	    } else {
	      delete shell.dataset.homeBlueprintContract;
	      delete shell.dataset.homeBlueprintChromeMode;
	      delete shell.dataset.homeBlueprintComponentBoundary;
	      delete shell.dataset.homeBlueprintPersonality;
	    }
	    shell.className = shell.className
      .split(/\s+/)
      .filter((className) => className && !className.startsWith("ai-blueprint-layout-"))
      .concat(`ai-blueprint-layout-${config.layoutPreset}`)
      .join(" ");
    shell.dataset.autoLayout = config.autoLayout?.strategy || "responsive-grid";

    let activeComposite = null;
    let activeCompositeId = "";

    buildHomepageRows(reorderBlocksForWidePairing(renderableBlocks, heroBlocks.length), heroBlocks.length).forEach((row) => {
      const composite = blueprintRowCompositeMeta(row);
      const rowNode = doc.createElement("div");
      rowNode.className = "ai-home-row";
      rowNode.dataset.homeRow = row.id;
      rowNode.dataset.homeGridColumns = String(HOME_GRID_COLUMNS);
      rowNode.dataset.rowItems = String(row.items.length);
      rowNode.dataset.rowKind = row.items.length > 1 ? "paired" : "single";
	      rowNode.dataset.rowCollapse = row.items.length > 1 ? config.autoLayout?.tablet?.rowMode || "stack-paired-rows" : "none";
	      rowNode.dataset.rowEqualHeight = String(config.autoLayout?.desktop?.equalHeight !== false);
	      const rowChrome = blueprintRowChrome(row, config, designContract);
	      if (rowChrome) rowNode.dataset.rowChrome = rowChrome;
	      if (composite?.id) rowNode.dataset.rowComposite = composite.id;
	      rowNode.style.setProperty("--home-row-min-height", `${row.minHeight}px`);

      row.items.forEach((item) => {
        const block = item.block;
        const renderComponent = COMPONENT_MAP[block.component];
        const isWelcomeBlock = block.component === "welcome_header";

        const node = renderHighScoreComponentReference(doc, block.component, config) || renderComponent(doc, config, block.props);
        node.classList.add("ai-home-block", `ai-home-block-${block.slot}`, `ai-component-${block.component}`);
        node.dataset.homeComponent = block.component;
        node.dataset.homeGridColumns = String(HOME_GRID_COLUMNS);
        if (block.brickId) node.dataset.homeBrick = block.brickId;
        if (block.brickName) node.dataset.homeBrickName = block.brickName;
	        if (block.brickReason) node.dataset.homeBrickReason = block.brickReason;
	        node.dataset.homeSlot = block.slot;
	        if (block.sectionId) node.dataset.homeSection = block.sectionId;
	        if (block.sectionType) node.dataset.homeSectionType = block.sectionType;
	        if (block.sectionTransition) node.dataset.homeSectionTransition = block.sectionTransition;
	        if (block.compositeId) {
	          node.dataset.homeCompositeMember = block.compositeId;
	          node.dataset.homeCompositeSurface = block.compositeSurface || "";
	          node.dataset.homeCompositeRole = block.compositeRole || "";
	        }
	        // A：外壳分层不再依赖 golden 契约。skeletonSlotChrome 在无契约时也会回退到默认契约，
	        // 据此给每个 block 落角色化外壳（featured/rail/legalStrip…），避免所有模块都渲染成等权白卡。
	        const slotChrome = skeletonSlotChrome(block.component, config, blueprintSectionForBlock(block), designContract || {});
	        node.dataset.homeSlotChrome = slotChrome;
	        node.classList.add(`ai-home-slot-chrome-${slotChrome}`);
	        node.dataset.homeSpan = String(item.span);
        node.dataset.homeLayoutRecipe = item.span >= 12 ? "12+0" : item.span === 8 ? "8+4" : item.span === 6 ? "6+6" : "4+8";
        const responsiveRule = config.autoLayout?.moduleRules?.[block.component];
        if (responsiveRule) {
          node.dataset.autoLayoutDesktop = responsiveRule.desktop;
          node.dataset.autoLayoutTablet = responsiveRule.tablet;
          node.dataset.autoLayoutMobile = responsiveRule.mobile;
        }
        if (!isWelcomeBlock && row.items.length > 1) {
          node.classList.add("ai-home-block-polished");
        } else {
          node.classList.remove("ai-home-block-polished");
        }
        node.style.setProperty("--home-span", String(item.span || 12));
        node.style.order = String(block.priority);
        rowNode.appendChild(node);
      });

      if (shouldRenderBlueprintComposite(row, composite)) {
        if (!activeComposite || activeCompositeId !== composite.id) {
          activeComposite = createBlueprintCompositeNode(doc, composite);
          activeCompositeId = composite.id;
          shell.appendChild(activeComposite);
        }
        activeComposite.appendChild(rowNode);
      } else {
        activeComposite = null;
        activeCompositeId = "";
        shell.appendChild(rowNode);
      }
    });

  }

	  const CUSTOM_THEME_STYLE_PROPS = [
	    "--tenant-primaryColor",
	    "--tenant-primary-color",
	    "--tenant-accentColor",
	    "--tenant-accent-color",
	    "--tenant-backgroundStyle",
	    "--tenant-background-style",
	    "--tenant-cardStyle",
	    "--tenant-card-style",
	    "--tenant-cardShadow",
	    "--tenant-card-shadow",
	    "--tenant-buttonStyle",
	    "--tenant-button-style",
	    "--home-primary",
	    "--home-primary-strong",
	    "--home-primary-text",
	    "--home-primary-soft",
	    "--home-primary-faint",
    "--home-primary-border",
	    "--home-primary-border-strong",
	    "--home-primary-surface",
	    "--home-accent",
	    "--home-bg",
	    "--home-shell-text",
	    "--home-text-strong",
	    "--home-text",
	    "--home-text-soft",
	    "--home-text-muted",
	    "--home-text-subtle",
	    "--home-surface",
	    "--home-surface-raised",
	    "--home-surface-soft",
	    "--home-surface-muted",
	    "--home-card-bg",
	    "--home-card-border",
	    "--home-card-border-strong",
	    "--home-card-shadow",
	    "--home-border",
	    "--home-border-soft",
	    "--home-border-strong",
	    "--home-divider",
	    "--home-button-border",
	    "--home-button-bg",
	    "--home-button-text",
	    "--home-button-secondary-bg",
	    "--home-button-secondary-text",
	    "--home-button-shadow",
	    "--home-progress-accent",
	    "--home-progress-card-bg",
	    "--home-progress-border",
	    "--home-progress-track",
	    "--home-action-priority-bg",
	    "--home-action-priority-text",
	    "--home-icon-tile-bg",
	    "--home-banner-border",
	    "--home-hero-text",
	    "--home-hero-muted",
	    "--home-muted",
	  ];

  function applyThemeCustomVars(target, custom) {
    const nodes = [target.documentElement, target.body].filter(Boolean);
    nodes.forEach((node) => {
      CUSTOM_THEME_STYLE_PROPS.forEach((prop) => node.style.removeProperty(prop));
    });

	    const normalized = normalizeThemeCustom(custom);
	    const color = normalized?.primaryColor;
	    if (!color) return;

	    const accent = normalized.accentColor || "var(--home-accent)";
	    const surface = normalized.surfaceColor || normalized.cardStyle || "#ffffff";
	    const surfaceSoft = normalized.surfaceSoft || `color-mix(in srgb, ${color} 8%, ${surface})`;
	    const surfaceMuted = normalized.surfaceMuted || `color-mix(in srgb, ${color} 5%, ${surface})`;
	    const textStrong = normalized.textStrong || "#0f172a";
	    const textColor = normalized.textColor || "#172033";
	    const textSoft = normalized.textSoft || "#475569";
	    const textMuted = normalized.textMuted || "#64748b";
	    const borderColor = normalized.borderColor || `color-mix(in srgb, ${color} 32%, #dce6f4)`;
	    const borderSoft = normalized.borderSoft || `color-mix(in srgb, ${color} 18%, #edf2f7)`;
	    const buttonText = normalized.buttonText || "#ffffff";

	    const vars = {
	      "--tenant-primaryColor": color,
	      "--tenant-primary-color": color,
	      "--tenant-accentColor": accent,
	      "--tenant-accent-color": accent,
	      "--tenant-backgroundStyle": normalized.backgroundStyle,
	      "--tenant-background-style": normalized.backgroundStyle,
	      "--tenant-cardStyle": normalized.cardStyle,
	      "--tenant-card-style": normalized.cardStyle,
	      "--tenant-cardShadow": normalized.cardShadow,
	      "--tenant-card-shadow": normalized.cardShadow,
	      "--tenant-buttonStyle": normalized.buttonStyle,
	      "--tenant-button-style": normalized.buttonStyle,
	      "--home-primary": color,
	      "--home-primary-strong": normalized.primaryStrong || color,
	      "--home-primary-text": normalized.primaryText || color,
	      "--home-primary-soft": normalized.primarySoft || `color-mix(in srgb, ${color} 12%, ${surface})`,
	      "--home-primary-faint": normalized.primaryFaint || `color-mix(in srgb, ${color} 8%, ${surface})`,
	      "--home-primary-border": normalized.primaryBorder || borderColor,
	      "--home-primary-border-strong": normalized.primaryBorderStrong || `color-mix(in srgb, ${color} 52%, ${surface})`,
	      "--home-primary-surface": normalized.primarySurface || `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, ${surface}), color-mix(in srgb, ${color} 6%, ${surface}))`,
	      "--home-accent": accent,
	      "--home-bg": normalized.backgroundStyle,
	      "--home-shell-text": textStrong,
	      "--home-text-strong": textStrong,
	      "--home-text": textColor,
	      "--home-text-soft": textSoft,
	      "--home-text-muted": textMuted,
	      "--home-text-subtle": textSoft,
	      "--home-surface": surface,
	      "--home-surface-raised": surface,
	      "--home-surface-soft": surfaceSoft,
	      "--home-surface-muted": surfaceMuted,
	      "--home-card-bg": normalized.cardStyle || surface,
	      "--home-card-border": borderColor,
	      "--home-card-border-strong": normalized.primaryBorderStrong || borderColor,
	      "--home-card-shadow": normalized.cardShadow,
	      "--home-border": borderColor,
	      "--home-border-soft": borderSoft,
	      "--home-border-strong": borderColor,
	      "--home-divider": borderSoft,
	      "--home-button-border": color,
	      "--home-button-bg": normalized.buttonStyle || `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 78%, #111827))`,
	      "--home-button-text": buttonText,
	      "--home-button-secondary-bg": surfaceSoft,
	      "--home-button-secondary-text": color,
	      "--home-button-shadow": normalized.buttonShadow || `0 14px 24px color-mix(in srgb, ${color} 18%, transparent)`,
	      "--home-progress-accent": `linear-gradient(135deg, ${color}, var(--home-accent))`,
	      "--home-progress-card-bg": normalized.primarySurface,
	      "--home-progress-border": normalized.primaryBorder || borderColor,
	      "--home-progress-track": surfaceMuted,
	      "--home-action-priority-bg": `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, ${surface}), color-mix(in srgb, ${accent} 12%, ${surface}))`,
	      "--home-action-priority-text": normalized.primaryText || color,
	      "--home-icon-tile-bg": `color-mix(in srgb, ${color} 10%, ${surface})`,
	      "--home-banner-border": color,
	      "--home-hero-text": textStrong,
	      "--home-hero-muted": textMuted,
	      "--home-muted": textMuted,
	    };

	    nodes.forEach((node) => {
	      Object.entries(vars).forEach(([prop, value]) => {
	        if (value) node.style.setProperty(prop, value);
	      });
	    });
	  }

  function effectiveHomeColorMode(target, colorMode) {
    const normalized = normalizeHomeColorMode(colorMode);
    if (normalized !== "auto") return normalized;

    const view = target.defaultView || window;
    const themeMode =
      view.NXBrokerTheme?.getHomeColorMode?.() ||
      target.body?.dataset?.homeColorMode ||
      target.documentElement?.dataset?.theme ||
      "light";
    return themeMode === "dark" ? "dark" : "light";
  }

  function applyConfig(config, root) {
    const target = root || document;
    const body = target.body || document.body;
    const normalized = normalizeConfig(config);

    if (!body) return normalized;

    body.dataset.homeTheme = normalized.themePreset;
    body.dataset.tenantTheme = normalized.themePreset;
    body.dataset.homeColorMode = effectiveHomeColorMode(target, normalized.colorMode);
    body.dataset.homeDensity = normalized.density;
    body.dataset.homeLayout = normalized.layoutPreset;
	    body.dataset.homeRenderMode = normalized.activeRenderMode || "config";
	    body.dataset.homeHtmlEnabled = normalized.htmlScheme?.enabled ? "true" : "false";
	    body.dataset.homeSkeletonEnabled = normalized.skeletonHtmlScheme?.enabled ? "true" : "false";
	    body.dataset.homeSkeletonContract = normalized.skeletonHtmlScheme?.designContract?.id || "";
	    const homeStyleContractId = normalized.styleContract?.id || normalized.goldenStyleContract?.id || "";
	    if (homeStyleContractId) body.dataset.homeStyleContract = homeStyleContractId;
	    else delete body.dataset.homeStyleContract;
	    body.dataset.homePublished = normalized.publishedAt ? "true" : "false";
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
	    applyThemeCustomVars(target, normalized.themeCustom);
	    if (hasExecutableStyleContract(normalized)) {
	      const designContract = buildSkeletonDesignContract(normalized);
	      applySkeletonContractStyleVars(body, designContract);
	      if (target.documentElement) applySkeletonContractStyleVars(target.documentElement, designContract);
	    }

	    if (body.dataset.layoutPage === "client-home") {
      if (normalized.activeRenderMode === "aiHtml" && normalized.htmlScheme?.enabled) {
        renderAiHtmlScheme(normalized, target);
      } else if (normalized.activeRenderMode === "skeletonHtml" && normalized.skeletonHtmlScheme?.enabled) {
        renderSkeletonHtmlScheme(normalized, target);
      } else {
        renderBlueprint(normalized, target);
      }
    }

    target.querySelectorAll(".is-home-spotlight").forEach((node) => node.classList.remove("is-home-spotlight"));
    target.querySelectorAll(`[data-home-feature="${normalized.heroFocus}"]`).forEach((node) => {
      node.classList.add("is-home-spotlight");
    });

    const title = target.querySelector("[data-home-title]");
    const subtitle = target.querySelector("[data-home-subtitle]");
    const keepDepositWelcomeCopy = pageIntentFromConfig(normalized) === "deposit" && target.querySelector(".ai-welcome-feature[data-welcome-mode=\"deposit\"]");

    if (!keepDepositWelcomeCopy && title) title.textContent = t(normalized.heroTitleKey);
    if (!keepDepositWelcomeCopy && subtitle) subtitle.textContent = t(normalized.heroSubtitleKey);

    if (target.defaultView?.ClientHome?.refresh) {
      target.defaultView.ClientHome.refresh();
    }

    bindHomeChartInteractions(target);
    initializeHomeCharts(target);

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
      comfortable: "舒适",
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
    return Object.keys(PROTOCOL_MODULES).map((moduleId) => {
      const reference = normalized.componentReferences.find((item) => item.module === moduleId);
      return {
        id: moduleId,
        label: PROTOCOL_MODULES[moduleId].label,
        variant: normalized.modules[moduleId].variant,
        variantLabel: moduleVariantLabel(moduleId, normalized.modules[moduleId].variant),
        morph: normalized.componentMorphs?.[moduleId]?.morphId || normalized.componentMorphs?.[moduleId]?.morph || "",
        morphLabel: normalized.componentMorphs?.[moduleId]?.morphLabel || "",
        referenceComponentId: reference?.componentId || normalized.componentMorphs?.[moduleId]?.referenceComponentId || "",
        referenceName: reference?.name || normalized.componentMorphs?.[moduleId]?.referenceComponentName || "",
        referenceReason: reference?.reason || normalized.componentMorphs?.[moduleId]?.referenceReason || "",
      };
    });
  }

  function describeDecision(config, prompt) {
    const normalized = normalizeConfig(config);
    const profile = promptProfile(prompt);
    const activeFamilies = new Set(normalized.brickPlan.map((item) => item.family).filter(Boolean));
    const variants = moduleVariantSummary(normalized)
      .filter((item) => !activeFamilies.size || activeFamilies.has(item.id))
      .map((item) => `${item.label}: ${item.variantLabel}${item.morphLabel ? ` / ${item.morphLabel}` : ""}`)
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
          reason:
          normalized.skeletonHtmlScheme?.enabled && normalized.renderMode === "skeletonHtml"
            ? `当前使用 ${normalized.skeletonHtmlScheme.name}：先以「${normalized.skeletonHtmlScheme.designContract?.label || "整页风格契约"}」锁住视觉语言，再按 slot 填充模块。`
            :
          normalized.htmlScheme?.enabled && normalized.renderMode !== "config"
            ? `当前同时保留组件化配置和 ${normalized.htmlScheme.name}，管理员可切换预览/发布方式。`
            : "组件形态来自白名单形态池，AI 只选择 JSON 配置，不生成页面代码。",
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
		choices.push(
		  normalized.activeRenderMode === "skeletonHtml" && normalized.skeletonHtmlScheme?.enabled
		    ? `骨架填充：${normalized.skeletonHtmlScheme.designContract?.label || "统一契约"} · ${normalized.skeletonHtmlScheme.slots.length} 个 slot`
	        : normalized.htmlScheme?.enabled
	        ? `${aiHtmlSourceLabel(normalized.htmlScheme)}：${normalized.activeRenderMode === "aiHtml" ? "当前预览 HTML 版" : "当前预览组件版"}`
	        : "AI HTML 未启用",
	    );
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
    COMPONENT_MORPH_REGISTRY: clone(COMPONENT_MORPH_REGISTRY),
    COMPONENT_PROPS_SCHEMA: clone(COMPONENT_PROPS_SCHEMA),
    CORE_COMPONENT_MORPH_MODULES: clone(CORE_COMPONENT_MORPH_MODULES),
    DEFAULT_CONFIG: normalizeConfig(DEFAULT_CONFIG),
    DEFAULT_MODULE_SETTINGS: clone(DEFAULT_MODULE_SETTINGS),
    DESIGN_GENOMES: clone(DESIGN_GENOMES),
    FEATURES,
    HOME_GRID_COLUMNS,
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
    buildSkeletonDesignContract,
    buildSkeletonHtmlScheme,
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
    homeGridContractForSize,
    homeGridSpanForSize,
    moduleLabel,
    moduleVariantLabel,
    moduleVariantSummary,
    normalizeConfig,
    normalizeHomepageComponentReferences,
    normalizeSkeletonHtmlScheme,
    optimizeConfig,
    promptToConfig,
    randomConfig,
    resetConfig,
    saveDraft,
    saveConfig,
    skeletonDesignContractPrompt,
    refreshCharts: initializeHomeCharts,
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
      if (params.has("published")) document.body.dataset.homePublished = "true";
      const storedConfig = params.has("preview") ? loadDraft() : loadConfig();
      const config = params.has("published") && !storedConfig.publishedAt ? { ...storedConfig, publishedAt: new Date().toISOString() } : storedConfig;
      applyConfig(tenantTheme ? { ...config, themePreset: normalizeThemeId(tenantTheme), theme: normalizeThemeId(tenantTheme) } : config, document);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootClientHome);
  } else {
    bootClientHome();
  }
})();
