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
  };

  const THEMES = {
    default: "默认蓝白",
    blackGold: "黑金高净值",
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
  };

  const LEGACY_LAYOUT_MAP = {
    classicStack: "standardDashboard",
    conversionStack: "conversionFirst",
    executiveHero: "vipService",
    traderConsole: "tradingPro",
    partnerGrowth: "conversionFirst",
  };

  const COMPONENTS = {
    welcome_header: "欢迎头部",
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
  const MAX_QUICK_ACTIONS = 6;
  const MAX_I18N_KEY_LENGTH = 72;
  const MAX_VALIDATION_ERRORS = 12;

  const LAYOUT_SLOT_SPANS = {
    hero: 12,
    main: 8,
    rail: 4,
    full: 12,
  };

  const FEATURE_COMPONENT_MAP = {
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
  };

  const COMPONENT_STYLE_FEATURE_MAP = {
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
    copytrading_summary: "referralLink",
  };

  const PROTOCOL_MODULES = {
    AssetOverview: {
      label: "资产总览",
      component: "asset_summary",
      feature: "balanceTotal",
      variants: ["standard", "vipHero", "compactTable", "darkTerminal"],
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
      variants: ["gridCards", "actionDock", "priorityButtons", "minimalIcons"],
    },
    PromotionBanner: {
      label: "活动广告",
      component: "promo_banner",
      feature: "promoHighlight",
      variants: ["imageBanner", "gradientHero", "blackGoldVip", "splitVisual"],
    },
    ReferralLink: {
      label: "邀请链接",
      component: "referral_link",
      feature: "referralLink",
      variants: ["console", "linkFirst", "compact"],
    },
    TradingAccounts: {
      label: "交易账号",
      component: "account_list",
      feature: "tradingAccounts",
      variants: ["workbench", "separatedList", "denseCards", "calmTable"],
    },
    OpenAccount: {
      label: "开户入口",
      component: "open_account_panel",
      feature: "openAccountActions",
      variants: ["sidePanel", "inlineActions", "softCard"],
    },
    OnboardingProgress: {
      label: "开户路径",
      component: "onboarding_progress",
      feature: "onboardingProgress",
      variants: ["path", "checklist", "compact"],
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
      variants: ["proChart", "terminalChart", "cleanSnapshot"],
    },
    WalletList: {
      label: "钱包列表",
      component: "wallet_list",
      feature: "walletList",
      variants: ["currencyTable", "compactRows", "actionTable"],
    },
    CreateAccountForm: {
      label: "创建账户表单",
      component: "create_account_form",
      feature: "createAccountForm",
      variants: ["realAccountForm", "compactForm", "guidedForm"],
    },
  };

  const COMPONENT_MODULE_MAP = {
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
    ],
    PromotionBanner: [
      { id: "imageBanner", label: "图片横幅", description: "沉浸式广告曝光，适合活动和品牌位。" },
      { id: "gradientHero", label: "渐变 Hero", description: "高对比活动 Hero，强化转化。" },
      { id: "blackGoldVip", label: "黑金 VIP", description: "会员权益与高净值服务导向。" },
      { id: "splitVisual", label: "图文分栏", description: "信息更克制，适合金融专业感。" },
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
    ],
    OpenAccount: [
      { id: "sidePanel", label: "侧栏开户", description: "开真实、开模拟、绑定账号作为右侧操作面板。" },
      { id: "inlineActions", label: "横向开户", description: "开户动作放进首屏横向路径。" },
      { id: "softCard", label: "柔和开户卡", description: "弱化压迫感，作为辅助转化模块。" },
    ],
    OnboardingProgress: [
      { id: "path", label: "开户路径条", description: "KYC、开真实账号、首次入金串成路径。" },
      { id: "checklist", label: "任务清单", description: "用清单推动新客完成开户和入金。" },
      { id: "compact", label: "紧凑进度", description: "保留状态但降低模块面积。" },
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
    ],
    WalletList: [
      { id: "currencyTable", label: "币种钱包表", description: "多币种余额、可用资金和入金/出金动作。" },
      { id: "compactRows", label: "紧凑钱包行", description: "减少高度，适合下方列表。" },
      { id: "actionTable", label: "资金操作表", description: "钱包行和资金动作组合。" },
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
              showFundActions: { type: "boolean" },
              showAccountBreakdown: { type: "boolean" },
              showWalletBreakdown: { type: "boolean" },
            },
          },
          quickActions: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              count: { type: "number", minimum: 3, maximum: 8 },
              display: { enum: ["iconText", "iconOnly", "hoverText"] },
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
    "home.action.realAccount": "真实账号",
    "home.action.demoAccount": "模拟账号",
    "home.action.bindAccount": "绑定账号",
    "home.quick.eyebrow": "快捷入口",
    "home.quick.title": "交易快捷矩阵",
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
    "home.referral.eyebrow": "Referral",
    "home.referral.title": "邀请增长控制台",
    "home.referral.summary": "注册链接、邀请码和渠道转化数据集中展示。",
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

  const MODULE_STYLE_OPTIONS = {
    balanceTotal: [
      { id: "command", label: "资产驾驶舱", description: "大数字资产、账户和钱包拆分，适合首屏重点。" },
      { id: "metric-strip", label: "指标条", description: "横向指标摘要，适合与广告或快捷入口并排。" },
      { id: "quiet-card", label: "轻量卡片", description: "降低视觉权重，适合放在下方辅助区域。" },
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
    ],
    onboardingProgress: [
      { id: "path", label: "路径条", description: "强调开户步骤和下一步行动。" },
      { id: "checklist", label: "清单式", description: "把 KYC、资料、入金做成任务清单。" },
      { id: "compact", label: "紧凑进度", description: "保留状态，但减少模块面积。" },
    ],
    promoHighlight: [
      { id: "banner", label: "活动横幅", description: "高对比活动曝光，适合营销首页。" },
      { id: "clean", label: "简洁活动", description: "白底活动卡，适合专业风格。" },
      { id: "scoreboard", label: "赛事看板", description: "突出奖池、倒计时和活动状态。" },
    ],
    adCarousel: [
      { id: "immersive", label: "沉浸轮播", description: "大幅广告首屏，视觉冲击更强。" },
      { id: "clean", label: "清爽轮播", description: "更轻的背景和高度，适合工作台。" },
      { id: "compact", label: "短轮播", description: "减少高度，适合放在组合区。" },
    ],
    quickActions: [
      { id: "matrix", label: "快捷矩阵", description: "完整操作入口，适合功能型首页。" },
      { id: "toolbar", label: "工具条", description: "横向入口，减少页面割裂。" },
      { id: "compact-grid", label: "紧凑网格", description: "缩短卡片高度，提升扫描效率。" },
    ],
    referralLink: [
      { id: "console", label: "邀请控制台", description: "数据、邀请码和注册链接完整展示。" },
      { id: "link-first", label: "链接优先", description: "把可复制链接放到最前面。" },
      { id: "compact", label: "紧凑邀请", description: "只保留关键指标和复制入口。" },
    ],
    tradingAccounts: [
      { id: "workbench", label: "账号工作台", description: "保留筛选、开户和视图切换。" },
      { id: "dense-cards", label: "紧凑卡片", description: "降低卡片高度，便于看更多账号。" },
      { id: "calm-table", label: "安静列表", description: "降低卡片装饰，适合后台感首页。" },
    ],
  };

  const MODULE_STYLE_DEFAULTS = Object.keys(MODULE_STYLE_OPTIONS).reduce((defaults, feature) => {
    defaults[feature] = MODULE_STYLE_OPTIONS[feature][0].id;
    return defaults;
  }, {});

  const DEFAULT_MODULE_SETTINGS = {
    adCarousel: { enabled: true },
    quickActions: { enabled: true, count: 7, display: "iconText" },
    wallet: { enabled: true, placement: "standalone", showFundActions: false },
    assets: { enabled: true, showFundActions: true, showAccountBreakdown: true, showWalletBreakdown: true },
    referral: {
      enabled: true,
      showClicks: true,
      showRegistrations: true,
      showTradingAccounts: true,
      showPromoLink: true,
      showInviteCode: true,
      showQrCode: true,
    },
    tradingAccounts: {
      enabled: true,
      realEnabled: true,
      demoEnabled: true,
      grouping: "combined",
      viewMode: "switchable",
    },
    openAccount: {
      enabled: true,
      real: true,
      demo: true,
      bind: true,
      placement: "insideTradingAccounts",
    },
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
      { id: "overview", type: "full", title: "账户总览", slots: ["balanceTotal", "fundActions"] },
      { id: "progress", type: "full", title: "开户路径", slots: ["onboardingProgress"] },
      { id: "promo", type: "full", title: "活动与广告", slots: ["adCarousel", "promoHighlight"] },
      { id: "quick", type: "full", title: "快捷入口", slots: ["quickActions"] },
      { id: "referral", type: "full", title: "邀请", slots: ["referralLink"] },
      { id: "accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
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
        { id: "referral", type: "split", title: "邀请与钱包", slots: ["walletBalance", "referralLink"] },
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
        { id: "trust-path", type: "split", title: "增长与合规路径", slots: ["promoHighlight", "referralLink", "onboardingProgress"] },
        { id: "accounts-lower", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
      ],
      moduleStyles: {
        walletBalance: "wallet-actions",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        promoHighlight: "clean",
        quickActions: "toolbar",
        referralLink: "compact",
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
      themePreset: "darkTech",
      personalizationStrength: "strong",
      density: "balanced",
      heroFocus: "promoHighlight",
      tags: ["活动", "比赛", "大赛", "营销", "增长", "转化", "奖池", "入金", "广告", "banner", "轮播"],
      sections: [
        { id: "campaign-hero", type: "hero", title: "活动转化", variant: "campaign", slots: ["adCarousel", "fundActions", "quickActions"] },
        { id: "capital-strip", type: "split", title: "资金与开户", slots: ["balanceTotal", "openAccountActions"] },
        { id: "account-proof", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
        { id: "supporting", type: "split", title: "辅助转化", slots: ["promoHighlight", "onboardingProgress", "referralLink"] },
      ],
      moduleStyles: {
        balanceTotal: "metric-strip",
        fundActions: "split-buttons",
        openAccountActions: "horizontal",
        onboardingProgress: "checklist",
        promoHighlight: "scoreboard",
        quickActions: "compact-grid",
        referralLink: "link-first",
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
        referral: { showClicks: true, showRegistrations: true, showTradingAccounts: true },
        tradingAccounts: { grouping: "combined", viewMode: "card" },
      },
      summary: "适合活动运营：把广告轮播、入金和快捷操作变成首屏转化带，同时保留账户和开户路径。",
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
        { id: "promo-referral", type: "split", title: "激励与邀请", slots: ["adCarousel", "promoHighlight", "referralLink"] },
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
        referralLink: "link-first",
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
        { id: "referral-bottom", type: "full", title: "邀请", slots: ["referralLink"] },
      ],
      moduleStyles: {
        balanceTotal: "metric-strip",
        fundActions: "compact-row",
        openAccountActions: "soft-card",
        onboardingProgress: "compact",
        promoHighlight: "clean",
        adCarousel: "compact",
        quickActions: "toolbar",
        referralLink: "compact",
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
      heroFocus: "referralLink",
      tags: ["ib", "代理", "邀请", "推荐", "裂变", "渠道", "开户链接"],
      sections: [
        { id: "partner-hero", type: "hero", title: "代理增长", variant: "partner", slots: ["referralLink", "adCarousel", "openAccountActions"] },
        { id: "capital-actions", type: "split", title: "资金与快捷入口", slots: ["balanceTotal", "fundActions"] },
        { id: "partner-path", type: "split", title: "开户进度与工具", slots: ["promoHighlight", "quickActions", "onboardingProgress"] },
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
        referralLink: "link-first",
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
        referral: { showClicks: true, showRegistrations: true, showTradingAccounts: true },
        tradingAccounts: { grouping: "combined", viewMode: "card" },
      },
      summary: "适合 IB 和渠道型券商：注册链接、邀请码和活动放到首屏，用于拉新和转化。",
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
      settings: { tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list" } },
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
      settings: { wallet: { enabled: true, placement: "standalone", showFundActions: true } },
      reason: "资产优先首页需要把多币种钱包作为完整列表展示。",
    },
  ];

  const BRICK_STRATEGIES = {
    standard: {
      label: "标准工作台积木流",
      layoutPreset: "standardDashboard",
      themePreset: "default",
      density: "balanced",
      strength: "medium",
      bricks: ["assetOverview.compactMetrics", "fundActions.priorityDock", "quickActions.actionDock", "adCarousel.heroCampaign", "referralLink.growthConsole", "tradingAccounts.separatedList"],
      summary: "保留完整业务路径，用积木块重排为资产、资金、快捷、邀请、账号的工作台。",
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
      bricks: ["assetOverview.vipHero", "fundActions.priorityDock", "walletBalance.currencyRail", "walletList.currencyTable", "accountPerformance.proChart", "tradingAccounts.separatedList"],
      summary: "资产、钱包和账号表现优先，交易账号和钱包列表作为下方管理区。",
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
      themePreset: "darkTech",
      density: "balanced",
      strength: "strong",
      bricks: ["adCarousel.heroCampaign", "quickActions.priorityMatrix", "promoBanner.scoreboard", "fundActions.priorityDock", "tradingAccounts.cardProof", "referralLink.growthConsole"],
      summary: "活动轮播、快捷矩阵和赛事看板优先，服务营销转化。",
    },
    partner: {
      label: "IB 渠道增长流",
      layoutPreset: "conversionFirst",
      themePreset: "blueFinance",
      density: "balanced",
      strength: "strong",
      bricks: ["referralLink.growthConsole", "adCarousel.heroCampaign", "openAccount.sidePanel", "quickActions.priorityMatrix", "promoBanner.scoreboard", "tradingAccounts.cardProof"],
      summary: "注册链接、邀请码、开户链接和活动曝光组成渠道增长首页。",
    },
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function includesAny(text, words) {
    return words.some((word) => text.includes(word));
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

  function cleanMetaText(value, fallback = "", limit = 180) {
    return String(value || fallback).replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function brickById(id) {
    return HOME_BRICKS.find((brick) => brick.id === id) || null;
  }

  function inferBrickIntent(prompt) {
    const text = positiveIntentText(prompt);

    if (includesAny(text, ["ib", "代理", "渠道", "邀请", "推荐", "裂变", "开户链接"])) return "partner";
    if (includesAny(text, ["新手", "新客", "开户", "注册", "kyc", "首次", "开户表单", "创建账户"])) return "onboarding";
    if (includesAny(text, ["交易工作台", "专业交易", "mt4", "mt5", "持仓", "订单", "账号首屏", "账户首屏", "pnl", "图表", "表现"])) return "trader";
    if (includesAny(text, ["高净值", "vip", "黑金", "尊贵", "机构", "大客户"])) return "vip";
    if (includesAny(text, ["钱包列表", "资产优先", "资产", "钱包", "余额", "资金安全", "资金优先"])) return "asset";
    if (includesAny(text, ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化", "广告", "轮播", "banner"])) return "growth";

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
    const text = positiveIntentText(prompt);
    let next = ids.slice();

    if (includesAny(text, ["广告", "轮播", "banner", "焦点图", "广告图", "广告位"])) {
      next = addBrickId(next, "adCarousel.heroCampaign", "front");
    }

    if (includesAny(text, ["钱包列表", "多币种钱包", "wallet list"])) {
      next = addBrickId(next, "walletList.currencyTable");
      next = addBrickId(next, "walletBalance.currencyRail");
    }

    if (includesAny(text, ["开户表单", "创建账户", "创建真实账户", "create account"])) {
      next = addBrickId(next, "createAccountForm.realAccount", "front");
      next = addBrickId(next, "openAccount.sidePanel", "front");
    }

    if (includesAny(text, ["账号表现", "账户表现", "pnl", "权益曲线", "图表", "交易图表"])) {
      next = addBrickId(next, "accountPerformance.proChart", "front");
    }

    if (includesAny(text, ["kyc", "用户信息", "用户侧栏", "右侧信息", "状态侧栏"])) {
      next = addBrickId(next, "userKycRail.profileWallet");
    }

    if (includesAny(text, ["真实账号", "模拟账号", "live", "demo", "两个列表", "分开", "列表"])) {
      next = removeBrickFamily(next, ["TradingAccounts"]);
      next = addBrickId(next, "tradingAccounts.separatedList");
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

  function uniqueBricksForLayout(ids) {
    const seenComponents = new Set();
    const selected = [];

    ids.forEach((id) => {
      const brick = brickById(id);
      if (!brick || seenComponents.has(brick.component)) return;
      seenComponents.add(brick.component);
      selected.push(brick);
    });

    if (!selected.some((brick) => brick.family === "AssetOverview")) selected.unshift(brickById("assetOverview.compactMetrics"));
    if (!selected.some((brick) => brick.family === "TradingAccounts")) selected.push(brickById("tradingAccounts.separatedList"));
    if (!selected.some((brick) => brick.family === "FundActions")) selected.splice(1, 0, brickById("fundActions.priorityDock"));

    return selected.filter(Boolean).slice(0, 11);
  }

  function brickZoneFor(brick, index, prompt) {
    const text = positiveIntentText(prompt);
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
    const base = zone === "hero" ? 20 : zone === "rail" ? 80 : zone === "full" ? 180 : 100;
    return base + index * 10;
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
    const ids = rotateBrickIds(applyPromptBrickOverrides(strategy.bricks, prompt), variant);
    const bricks = uniqueBricksForLayout(ids);
    const plan = bricks.map((brick, index) => {
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

    return { intent, strategy, bricks, plan };
  }

  function buildBrickDrivenConfig(prompt, variant = 0, sourceConfig = null) {
    const { intent, strategy, bricks, plan } = buildBrickPlan(prompt, variant);
    const profile = promptProfile(prompt);
    let modules = clone(DEFAULT_CONFIG.modules);
    let moduleStyles = syncLegacyModuleStyles(modules);
    let moduleSettings = clone(DEFAULT_MODULE_SETTINGS);
    const layout = [
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
    ].concat(
      plan.map((item, index) => {
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

    bricks.forEach((brick) => {
      if (brick.moduleId && brick.variant && validModuleVariant(brick.moduleId, brick.variant)) {
        modules[brick.moduleId] = { variant: brick.variant };
      }
      if (brick.moduleStyleFeature && brick.moduleStyle) {
        moduleStyles[brick.moduleStyleFeature] = brick.moduleStyle;
      }
      moduleSettings = mergeSettingsObject(moduleSettings, brick.settings);
    });

    const selectedFamilies = new Set(bricks.map((brick) => brick.family));
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

    const themePreset = sourceConfig?.themePreset || sourceConfig?.theme ? normalizeThemeId(sourceConfig.themePreset || sourceConfig.theme) : strategy.themePreset;

    const heroBlock = layout.find((block) => block.slot === "hero" && block.component !== "welcome_header") || layout[0];
    const score = Math.min(98, 72 + plan.length * 2 + (strategy.strength === "strong" ? 8 : 4));

    return normalizeConfig({
      schemaVersion: 4,
      blueprintVersion: 5,
      generationMode: "brick-v2",
      name: `${strategy.label}`.slice(0, 28),
      layoutPreset: strategy.layoutPreset,
      themePreset,
      theme: themePreset,
      personalizationStrength: inferPersonalizationStrength(prompt, { personalizationStrength: strategy.strength }),
      density: strategy.density,
      heroFocus: heroBlock?.component || componentFromFeature(plan[0]?.feature),
      modules,
      moduleStyles,
      moduleSettings,
      sections: sectionsFromBrickPlan(plan, strategy),
      layout,
      brickPlan: plan,
      brickTrace: {
        intent,
        strategy: strategy.label,
        score,
        selectedCount: plan.length,
        source: "local-brick-engine",
      },
      compositionStrategy: strategy.summary,
      emphasis: {
        deposit: plan.some((item) => item.family === "FundActions" || item.feature === "adCarousel") ? "high" : "medium",
        openAccount: plan.some((item) => ["OpenAccount", "OnboardingProgress", "CreateAccountForm"].includes(item.family)) ? "high" : "medium",
        promo: plan.some((item) => ["PromotionBanner", "ReferralLink"].includes(item.family)) ? "high" : "medium",
        accounts: plan.some((item) => ["TradingAccounts", "AccountPerformance"].includes(item.family)) ? "high" : "medium",
      },
      aiSummary: `已识别${profile.audience}，采用${strategy.label}，从积木库选择 ${plan.length} 个积木并自动拼版。`,
    });
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

  function isI18nKey(value) {
    return typeof value === "string" && value.length <= MAX_I18N_KEY_LENGTH && /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/i.test(value);
  }

  function i18nKey(value, fallback) {
    return isI18nKey(value) ? value : fallback;
  }

  function componentFromFeature(id) {
    return COMPONENTS[id] ? id : FEATURE_COMPONENT_MAP[id] || "asset_summary";
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
      if (!action || typeof action !== "object") return;

      const id = String(action.id || "").trim().slice(0, 32);
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
        id,
        href: safeHref(action.href, "#"),
        icon: ["user", "deposit", "withdraw", "transfer", "history", "positions", "trophy", "chart"].includes(action.icon) ? action.icon : "chart",
        labelKey: i18nKey(action.labelKey, fallbackActions[normalized.length]?.labelKey || "home.action.deposit"),
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
      return ["wallet_balance", "fund_actions", "quick_actions", "open_account_panel", "user_kyc_rail", "create_account_form", "market_insight", "risk_notice", "copytrading_summary"].includes(component) ? "rail" : "main";
    }
    if (type === "hero") return "hero";
    if (["account_list", "asset_summary", "wallet_balance", "fund_actions", "quick_actions", "promo_banner", "ad_carousel", "onboarding_progress", "account_performance", "wallet_list"].includes(component)) return "main";
    if (type === "rail") return "rail";
    if (["open_account_panel", "user_kyc_rail", "create_account_form", "market_insight", "risk_notice", "copytrading_summary"].includes(component)) return "rail";
    return "main";
  }

  function defaultHomepageLayout() {
    return [
      { id: "welcome", component: "welcome_header", slot: "hero", priority: 10, props: clone(COMPONENT_PROPS_SCHEMA.welcome_header) },
      { id: "assets", component: "asset_summary", slot: "main", priority: 20, props: clone(COMPONENT_PROPS_SCHEMA.asset_summary) },
      { id: "risk", component: "risk_notice", slot: "rail", priority: 21, props: clone(COMPONENT_PROPS_SCHEMA.risk_notice) },
      { id: "quick", component: "quick_actions", slot: "main", priority: 30, props: clone(COMPONENT_PROPS_SCHEMA.quick_actions) },
      { id: "market", component: "market_insight", slot: "rail", priority: 31, props: clone(COMPONENT_PROPS_SCHEMA.market_insight) },
      { id: "promo", component: "promo_banner", slot: "main", priority: 40, props: clone(COMPONENT_PROPS_SCHEMA.promo_banner) },
      { id: "copytrading", component: "copytrading_summary", slot: "rail", priority: 41, props: clone(COMPONENT_PROPS_SCHEMA.copytrading_summary) },
      { id: "wallet", component: "wallet_balance", slot: "main", priority: 50, props: clone(COMPONENT_PROPS_SCHEMA.wallet_balance) },
      { id: "accounts", component: "account_list", slot: "main", priority: 60, props: clone(COMPONENT_PROPS_SCHEMA.account_list) },
    ];
  }

  function layoutFromSections(sections) {
    const blocks = [{ id: "welcome", component: "welcome_header", slot: "hero", priority: 10, props: clone(COMPONENT_PROPS_SCHEMA.welcome_header) }];
    const seen = new Set(["welcome_header"]);

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

      const component = String(block.component || "");
      if (!COMPONENTS[component]) {
        addValidationError(errors, `非法组件: ${component || `index-${index}`}`);
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
      if (FEATURES[slot] && !next.includes(slot)) next.push(slot);
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
    if (variants.WalletBalance?.variant === "splitCurrency") styles.walletBalance = "wallet-strip";
    if (variants.WalletBalance?.variant === "premiumCard") styles.walletBalance = "wallet-actions";
    if (variants.WalletBalance?.variant === "compact") styles.walletBalance = "wallet-strip";
    if (variants.FundActions?.variant === "dock") styles.fundActions = "dock";
    if (variants.FundActions?.variant === "splitButtons") styles.fundActions = "split-buttons";
    if (variants.FundActions?.variant === "compactRow") styles.fundActions = "compact-row";
    if (variants.QuickActions?.variant === "actionDock") styles.quickActions = "toolbar";
    if (variants.QuickActions?.variant === "priorityButtons") styles.quickActions = "compact-grid";
    if (variants.QuickActions?.variant === "minimalIcons") styles.quickActions = "toolbar";
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
    if (variants.ReferralLink?.variant === "linkFirst") styles.referralLink = "link-first";
    if (variants.ReferralLink?.variant === "compact") styles.referralLink = "compact";
    if (variants.TradingAccounts?.variant === "separatedList" || variants.TradingAccounts?.variant === "calmTable") styles.tradingAccounts = "calm-table";
    if (variants.TradingAccounts?.variant === "denseCards") styles.tradingAccounts = "dense-cards";
    if (variants.OpenAccount?.variant === "sidePanel") styles.openAccountActions = "stacked";
    if (variants.OpenAccount?.variant === "inlineActions") styles.openAccountActions = "horizontal";
    if (variants.OpenAccount?.variant === "softCard") styles.openAccountActions = "soft-card";
    if (variants.OnboardingProgress?.variant === "checklist") styles.onboardingProgress = "checklist";
    if (variants.OnboardingProgress?.variant === "compact") styles.onboardingProgress = "compact";

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
    const tradingAccounts = source.tradingAccounts && typeof source.tradingAccounts === "object" ? source.tradingAccounts : {};
    const openAccount = source.openAccount && typeof source.openAccount === "object" ? source.openAccount : {};
    const wallet = source.wallet && typeof source.wallet === "object" ? source.wallet : {};
    const assets = source.assets && typeof source.assets === "object" ? source.assets : {};
    const adCarousel = source.adCarousel && typeof source.adCarousel === "object" ? source.adCarousel : {};

    const normalized = {
      adCarousel: {
        enabled: boolValue(adCarousel.enabled, defaults.adCarousel.enabled),
      },
      quickActions: {
        enabled: boolValue(quickActions.enabled, defaults.quickActions.enabled),
        count: Math.max(3, Math.min(8, Number(quickActions.count || defaults.quickActions.count))),
        display: oneOf(quickActions.display, ["iconText", "iconOnly", "hoverText"], defaults.quickActions.display),
      },
      wallet: {
        enabled: boolValue(wallet.enabled, defaults.wallet.enabled),
        placement: oneOf(wallet.placement, ["standalone", "mergedWithAssets"], defaults.wallet.placement),
        showFundActions: boolValue(wallet.showFundActions, defaults.wallet.showFundActions),
      },
      assets: {
        enabled: boolValue(assets.enabled, defaults.assets.enabled),
        showFundActions: boolValue(assets.showFundActions, defaults.assets.showFundActions),
        showAccountBreakdown: boolValue(assets.showAccountBreakdown, defaults.assets.showAccountBreakdown),
        showWalletBreakdown: boolValue(assets.showWalletBreakdown, defaults.assets.showWalletBreakdown),
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
      tradingAccounts: {
        enabled: boolValue(tradingAccounts.enabled, defaults.tradingAccounts.enabled),
        realEnabled: boolValue(tradingAccounts.realEnabled, defaults.tradingAccounts.realEnabled),
        demoEnabled: boolValue(tradingAccounts.demoEnabled, defaults.tradingAccounts.demoEnabled),
        grouping: oneOf(tradingAccounts.grouping, ["combined", "separated"], defaults.tradingAccounts.grouping),
        viewMode: oneOf(tradingAccounts.viewMode, ["switchable", "card", "list"], defaults.tradingAccounts.viewMode),
      },
      openAccount: {
        enabled: boolValue(openAccount.enabled, defaults.openAccount.enabled),
        real: boolValue(openAccount.real, defaults.openAccount.real),
        demo: boolValue(openAccount.demo, defaults.openAccount.demo),
        bind: boolValue(openAccount.bind, defaults.openAccount.bind),
        placement: oneOf(openAccount.placement, ["insideTradingAccounts", "standalone"], defaults.openAccount.placement),
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
        const feature = FEATURES[item?.feature] ? item.feature : brick?.feature || "";
        const component = COMPONENTS[item?.component] ? item.component : brick?.component || componentFromFeature(feature);

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
      .filter((item) => item.brickId && item.component)
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

    if (includesAny(text, ["交易", "mt4", "mt5", "持仓", "订单", "专业", "账户列表", "账号列表"])) {
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

  function normalizeConfig(config) {
    const source = config && typeof config === "object" ? config : {};
    const emphasis = source.emphasis && typeof source.emphasis === "object" ? source.emphasis : {};
    const moduleSettings = normalizeModuleSettings(source.moduleSettings);
    const legacySections = !source.sections && source.moduleOrder ? sectionsFromLegacyOrder(source.moduleOrder) : null;
    const sourceBrickPlan = normalizeBrickPlan(source.brickPlan);
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
    const shouldHydrateBricks =
      source.generationMode === "brick-v2" ||
      Number(source.blueprintVersion) >= 5 ||
      sourceBrickPlan.length > 0 ||
      normalizedLayout.layout.some((block) => block.brickId);
    const layout = shouldHydrateBricks
      ? applyBrickMetadataToLayout(normalizedLayout.layout, sourceBrickPlan, modules)
      : normalizedLayout.layout;
    const brickPlan = sourceBrickPlan.length ? sourceBrickPlan : shouldHydrateBricks ? brickPlanFromLayout(layout) : [];

    return {
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
      compositionStrategy: cleanMetaText(source.compositionStrategy, "", 260),
      annotations: Array.isArray(source.annotations) ? source.annotations.slice(0, 24) : [],
      validationErrors: normalizedLayout.validationErrors,
    };
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

    if (includesAny(lower + text, ["邀请首屏", "邀请码突出", "代理优先", "ib优先", "推荐链接放大"])) {
      moveSlot(config, "referralLink", "front");
      config.heroFocus = "referralLink";
    }

    config.layout = layoutFromSections(config.sections);
    return normalizeConfig(config);
  }

  function applySmartIntentToConfig(baseConfig, prompt) {
    const config = normalizeConfig(baseConfig);
    const text = String(prompt || "");
    const signal = text.toLowerCase() + text;
    const positiveSignal = positiveIntentText(text);

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
        referralLink: "compact",
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
        referralLink: "link-first",
        tradingAccounts: "dense-cards",
      });
      mergeModuleSettings(config, {
        adCarousel: { enabled: true },
        quickActions: { enabled: true, count: 8, display: "iconText" },
        referral: { enabled: true, showClicks: true, showRegistrations: true, showTradingAccounts: true, showPromoLink: true },
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
        referralLink: "link-first",
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
        referralLink: "compact",
        tradingAccounts: "workbench",
      });
      mergeModuleSettings(config, {
        quickActions: { enabled: true, count: 6, display: "iconOnly" },
        wallet: { enabled: true, placement: "mergedWithAssets", showFundActions: false },
        tradingAccounts: { grouping: "separated", viewMode: "switchable" },
        openAccount: { placement: "insideTradingAccounts" },
      });
    }

    if (includesAny(positiveSignal, ["ib", "代理", "渠道", "邀请", "推荐", "裂变", "开户链接"])) {
      mergeModuleVariants(config, {
        AssetOverview: "compactTable",
        WalletBalance: "splitCurrency",
        QuickActions: "priorityButtons",
        PromotionBanner: "gradientHero",
      });
      mergeModuleStyles(config, {
        referralLink: "link-first",
        promoHighlight: "scoreboard",
        quickActions: "compact-grid",
        openAccountActions: "horizontal",
        tradingAccounts: "dense-cards",
      });
      mergeModuleSettings(config, {
        referral: {
          enabled: true,
          showClicks: true,
          showRegistrations: true,
          showTradingAccounts: true,
          showPromoLink: true,
          showInviteCode: true,
          showQrCode: true,
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
      mergeModuleSettings(config, { referral: { enabled: false } });
      config.sections.forEach((section) => {
        section.slots = section.slots.filter((slot) => slot !== "referralLink");
      });
    }

    if (includesAny(signal, ["只要真实", "只看真实", "隐藏模拟", "不要模拟", "live only"])) {
      mergeModuleSettings(config, { tradingAccounts: { realEnabled: true, demoEnabled: false } });
    }

    if (includesAny(signal, ["只要模拟", "只看模拟", "demo only", "模拟优先"])) {
      mergeModuleSettings(config, { tradingAccounts: { realEnabled: false, demoEnabled: true } });
    }

    if (
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

    if (includesAny(signal, ["都是列表", "列表形式", "表格形式", "不要卡片", "不是卡片", "非卡片"])) {
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
      config.themePreset = "minimalWhite";
      config.theme = "minimalWhite";
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

  function actionLinks() {
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

  function renderBalanceTotal(doc, config, props = {}) {
    const feature = wrapFeature(doc, "asset_summary", "ai-balance-feature", config);
    const safeProps = sanitizeComponentProps("asset_summary", props, []);
    const assetSettings = config.moduleSettings.assets;
    const walletMerged =
      assetSettings.showWalletBreakdown &&
      config.moduleSettings.wallet.enabled &&
      config.moduleSettings.wallet.placement === "mergedWithAssets";
    const accountMarkup = assetSettings.showAccountBreakdown
      ? `
        <span>
          <small>${escapeHtml(t(safeProps.accountsLabelKey))}</small>
          <b data-summary-accounts>--</b>
        </span>
      `
      : "";
    const walletMarkup = walletMerged
      ? `
        <span>
          <small>${escapeHtml(t(safeProps.walletLabelKey))}</small>
          <b data-summary-wallets>--</b>
        </span>
      `
      : "";
    const hasBreakdown = Boolean(accountMarkup || walletMarkup);
    const noteMarkup = !hasBreakdown
      ? `<p>${escapeHtml(t("home.asset.totalOnly"))}</p>`
      : walletMerged
      ? `<p data-summary-wallet-note>${escapeHtml(t(safeProps.walletNoteKey))}</p>`
      : `<p>${escapeHtml(config.moduleSettings.wallet.enabled ? t("home.asset.walletStandalone") : t("home.asset.accountsOnly"))}</p>`;
    const fundMarkup = assetSettings.showFundActions
      ? `<div class="ai-inline-fund-actions">${actionLinks()}</div>`
      : "";

    feature.innerHTML = `
      <div class="ai-orbit-label">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <b>${escapeHtml(t(safeProps.titleKey))}</b>
      </div>
      <div class="ai-balance-amount">
        <small>${escapeHtml(t(safeProps.totalLabelKey))}</small>
        <strong data-summary-total>--</strong>
      </div>
      ${hasBreakdown ? `<div class="ai-balance-breakdown">${accountMarkup}${walletMarkup}</div>` : ""}
      ${noteMarkup}
      ${fundMarkup}
    `;

    return feature;
  }

  function renderWalletBalance(doc, config, props = {}) {
    const feature = wrapFeature(doc, "wallet_balance", "ai-wallet-feature", config);
    const safeProps = sanitizeComponentProps("wallet_balance", props, []);
    const fundMarkup = config.moduleSettings.wallet.showFundActions
      ? `<div class="ai-inline-fund-actions">${actionLinks()}</div>`
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
        ${actionLinks()}
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
    const feature = wrapFeature(doc, "onboardingProgress", "ai-onboarding-feature", config);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t("home.risk.eyebrow"))}</span>
        <strong>${escapeHtml(t("home.risk.title"))}</strong>
      </div>
      <div class="ai-path-meter"><span></span></div>
      <div class="ai-path-steps">
        <a class="active" data-home-action="openAccount" href="#accounts"><b>01</b><span>${escapeHtml(t("home.action.openAccount"))}</span></a>
        <a data-home-action="kyc" href="#accounts"><b>02</b><span>${escapeHtml(t("home.risk.cta"))}</span></a>
        <a data-home-action="deposit" href="#fund-actions"><b>03</b><span>${escapeHtml(t("home.action.deposit"))}</span></a>
      </div>
    `;
    return feature;
  }

  function renderPromoHighlight(doc, config, props = {}) {
    const feature = wrapFeature(doc, "promo_banner", "ai-promo-feature", config);
    const safeProps = sanitizeComponentProps("promo_banner", props, []);
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
    feature.innerHTML = `
      <div class="ai-ad-carousel" data-ad-carousel>
        <div class="ai-ad-slides">
          <article class="ai-ad-slide active" data-ad-slide>
            <span>Featured</span>
            <strong>Black Gold VIP Trading Month</strong>
            <p>高净值客户专属点差权益、入金礼包和一对一账户服务。</p>
            <a href="#fund-actions" data-home-action="deposit">立即入金</a>
          </article>
          <article class="ai-ad-slide" data-ad-slide>
            <span>Contest</span>
            <strong>5月盈利王挑战赛</strong>
            <p>奖池 $9,600，真实账户与模拟账户均可参与活动曝光。</p>
            <a href="#promo" data-home-action="promo">查看活动</a>
          </article>
          <article class="ai-ad-slide" data-ad-slide>
            <span>New Account</span>
            <strong>开通 MT5 Live 账户</strong>
            <p>开户链接、KYC、首次入金入口集中呈现，减少客户流失。</p>
            <a href="#accounts" data-home-action="openAccount">去开户</a>
          </article>
        </div>
        <div class="ai-ad-controls">
          <button type="button" data-ad-prev aria-label="上一张广告">‹</button>
          <div class="ai-ad-dots" aria-label="广告轮播分页">
            <button class="active" type="button" data-ad-dot="0" aria-label="广告 1"></button>
            <button type="button" data-ad-dot="1" aria-label="广告 2"></button>
            <button type="button" data-ad-dot="2" aria-label="广告 3"></button>
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
    const actions = safeProps.actions.slice(0, Math.min(quickSettings.count, MAX_QUICK_ACTIONS));

    feature.dataset.quickDisplay = variant === "minimalIcons" ? "iconOnly" : quickSettings.display;
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <div class="ai-shortcut-matrix">
        ${actions
          .map(
            (item) => `
              <a data-home-action="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}" aria-label="${escapeHtml(t(item.labelKey))}" data-tooltip="${escapeHtml(t(item.labelKey))}">
                ${item.icon === "user" ? icon("user") : actionIcon(item.icon)}<span>${escapeHtml(t(item.labelKey))}</span>
              </a>
            `,
          )
          .join("")}
      </div>
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
        <span>Referral Console</span>
        <strong>邀请控制台</strong>
      </div>
      ${stats ? `<div class="ai-referral-stats">${stats}</div>` : ""}
      <div class="ai-referral-core">${core}</div>
    `;
    return feature;
  }

  function renderTradingAccounts(doc, config, props = {}) {
    const feature = wrapFeature(doc, "account_list", "ai-accounts-feature", config);
    const safeProps = sanitizeComponentProps("account_list", props, []);
    const accountSettings = config.moduleSettings.tradingAccounts;
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
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <div class="ai-user-card">
        <span class="ai-user-avatar">H</span>
        <div>
          <b>Huang</b>
          <small>${escapeHtml(t(safeProps.summaryKey))}</small>
        </div>
      </div>
      <div class="ai-status-list">
        <span><small>KYC</small><b>Verified</b></span>
        <span><small>Local Time</small><b>13:47</b></span>
        <span><small>Wallet</small><b data-summary-wallets>--</b></span>
      </div>
    `;
    return feature;
  }

  function renderAccountPerformance(doc, config, props = {}) {
    const feature = wrapFeature(doc, "account_performance", "ai-performance-feature", config);
    const safeProps = sanitizeComponentProps("account_performance", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-performance-metrics">
        <span><small>Balance</small><b>$20,000.00</b></span>
        <span><small>Equity</small><b>$20,480.25</b></span>
        <span><small>Credit</small><b>$2,000.00</b></span>
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
    const rows = [
      ["USD", "9,999.99", "8,420.10"],
      ["EUR", "1,200.00", "1,180.00"],
      ["USDT", "3,500.00", "3,500.00"],
    ];
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-wallet-table" role="table" aria-label="${escapeHtml(t(safeProps.titleKey))}">
        <div role="row"><span>Currency</span><span>Balance</span><span>Available</span><span>Action</span></div>
        ${rows
          .map(
            (row) => `
              <div role="row">
                <b>${escapeHtml(row[0])}</b>
                <span>${escapeHtml(row[1])}</span>
                <span>${escapeHtml(row[2])}</span>
                <a href="#fund-actions" data-home-action="deposit">${escapeHtml(t("home.action.deposit"))}</a>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
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
    const feature = wrapFeature(doc, "market_insight", "ai-market-feature", config);
    const safeProps = sanitizeComponentProps("market_insight", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-side-metrics">
        <span><small>${escapeHtml(t(safeProps.metricOneKey))}</small><b>+2.4%</b></span>
        <span><small>${escapeHtml(t(safeProps.metricTwoKey))}</small><b>104.18</b></span>
      </div>
    `;
    return feature;
  }

  function renderRiskNotice(doc, config, props = {}) {
    const feature = wrapFeature(doc, "risk_notice", "ai-risk-feature", config);
    const safeProps = sanitizeComponentProps("risk_notice", props, []);
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

  function renderCopyTradingSummary(doc, config, props = {}) {
    const feature = wrapFeature(doc, "copytrading_summary", "ai-copytrading-feature", config);
    const safeProps = sanitizeComponentProps("copytrading_summary", props, []);
    feature.innerHTML = `
      <div class="ai-feature-title">
        <span>${escapeHtml(t(safeProps.eyebrowKey))}</span>
        <strong>${escapeHtml(t(safeProps.titleKey))}</strong>
      </div>
      <p>${escapeHtml(t(safeProps.summaryKey))}</p>
      <div class="ai-side-metrics">
        <span><small>${escapeHtml(t(safeProps.leaderKey))}</small><b>#80010</b></span>
        <span><small>${escapeHtml(t(safeProps.followersKey))}</small><b>123</b></span>
      </div>
    `;
    return feature;
  }

  const COMPONENT_MAP = {
    welcome_header: renderWelcomeHeader,
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

    if (slot === "balanceTotal" || slot === "accountBalances") return settings.assets.enabled;
    if (slot === "walletBalance") return settings.wallet.enabled && settings.wallet.placement === "standalone";
    if (slot === "fundActions") return fundActionsEnabled(config);
    if (slot === "openAccountActions") return openAccountChoices(config).length > 0 && settings.openAccount.placement === "standalone";
    if (slot === "adCarousel") return settings.adCarousel.enabled;
    if (slot === "quickActions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (slot === "referralLink") return settings.referral.enabled;
    if (slot === "tradingAccounts") return settings.tradingAccounts.enabled;
    if (slot === "walletList") return settings.wallet.enabled;
    if (slot === "createAccountForm") return openAccountChoices(config).length > 0;
    if (slot === "accountPerformance") return settings.tradingAccounts.enabled || settings.assets.enabled;
    return true;
  }

  function expandSlots(slots, config) {
    const expanded = [];

    slots.forEach((slot) => {
      if (slot === "balanceTotal" && config.moduleSettings.wallet.enabled && config.moduleSettings.wallet.placement === "standalone") {
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

    return wrapFeature(doc, slot, "ai-empty-feature", config);
  }

  function componentEnabled(component, config) {
    const settings = config.moduleSettings;
    if (component === "asset_summary") return settings.assets.enabled;
    if (component === "wallet_balance") return settings.wallet.enabled;
    if (component === "fund_actions") return fundActionsEnabled(config);
    if (component === "quick_actions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (component === "open_account_panel") return openAccountChoices(config).length > 0 && settings.openAccount.placement === "standalone";
    if (component === "onboarding_progress") return settings.openAccount.enabled;
    if (component === "ad_carousel") return settings.adCarousel.enabled;
    if (component === "promo_banner") return settings.adCarousel.enabled;
    if (component === "referral_link" || component === "copytrading_summary") return settings.referral.enabled;
    if (component === "account_list") return settings.tradingAccounts.enabled;
    if (component === "wallet_list") return settings.wallet.enabled;
    if (component === "create_account_form") return openAccountChoices(config).length > 0;
    if (component === "account_performance") return settings.tradingAccounts.enabled || settings.assets.enabled;
    return true;
  }

  function renderBlueprint(config, target) {
    const shell = target.querySelector("[data-home-shell]");
    if (!shell) return;

    const doc = target;
    const renderableBlocks = config.layout.filter((block) => COMPONENT_MAP[block.component] && componentEnabled(block.component, config));
    const heroBlocks = renderableBlocks.filter((block) => block.slot === "hero" && block.component !== "welcome_header");

    shell.querySelectorAll(".client-welcome, [data-home-module], [data-layout-section], [data-home-feature]").forEach((node) => node.remove());
    shell.classList.add("is-blueprint-home");
    shell.className = shell.className
      .split(/\s+/)
      .filter((className) => className && !className.startsWith("ai-blueprint-layout-"))
      .concat(`ai-blueprint-layout-${config.layoutPreset}`)
      .join(" ");

    renderableBlocks.forEach((block) => {
      const renderComponent = COMPONENT_MAP[block.component];

      const node = renderComponent(doc, config, block.props);
      node.classList.add("ai-home-block", `ai-home-block-${block.slot}`, `ai-component-${block.component}`);
      node.dataset.homeComponent = block.component;
      if (block.brickId) node.dataset.homeBrick = block.brickId;
      if (block.brickName) node.dataset.homeBrickName = block.brickName;
      if (block.brickReason) node.dataset.homeBrickReason = block.brickReason;
      node.dataset.homeSlot = block.slot;
      if (block.slot === "hero" && heroBlocks.length > 1) {
        node.classList.add("ai-home-block-polished");
        const heroSpan = ["asset_summary", "account_list", "account_performance"].includes(block.component) ? 8 : 4;
        node.style.setProperty("--home-span", String(heroSpan));
      } else {
        node.style.setProperty("--home-span", String(LAYOUT_SLOT_SPANS[block.slot] || 12));
      }
      node.style.order = String(block.priority);
      if (block.brickName || block.brickId) {
        const badge = doc.createElement("div");
        badge.className = "ai-brick-meta";
        badge.innerHTML = `
          <span>${escapeHtml(block.brickSize || block.slot)}</span>
          <strong>${escapeHtml(block.brickName || block.brickId)}</strong>
          ${block.brickReason ? `<small>${escapeHtml(block.brickReason)}</small>` : ""}
        `;
        node.prepend(badge);
      }
      shell.appendChild(node);
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
        reason: `面向 ${profile.audience}，首屏优先承接 ${featureLabel(normalized.heroFocus)}。`,
      },
      {
        label: "视觉强度",
        value: strengthLabel(normalized.personalizationStrength),
        reason: "用于控制方案差异感，避免不同租户只改颜色和文案。",
      },
      {
        label: "组件变体",
        value: variants,
        reason: "每个核心模块使用固定白名单变体渲染，AI 只选择 JSON 配置，不生成页面代码。",
      },
    ].filter(Boolean);
  }

  function describeIntelligence(config, prompt) {
    const normalized = normalizeConfig(config);
    const profile = promptProfile(prompt);
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
      settings.tradingAccounts.grouping === "separated" && settings.tradingAccounts.viewMode === "list"
        ? "真实/模拟账号分成两个列表"
        : settings.tradingAccounts.viewMode === "list"
        ? "交易账号固定列表"
        : settings.tradingAccounts.viewMode === "card"
        ? "交易账号固定卡片"
        : "交易账号可切换视图",
    );

    return [
      { label: "目标判断", value: profile.audience },
      { label: "视觉语气", value: `${profile.tone} · ${THEMES[normalized.theme]} · ${densityLabel(normalized.density)}` },
      { label: "差异强度", value: strengthLabel(normalized.personalizationStrength) },
      { label: "首页重心", value: `${featureLabel(normalized.heroFocus)}优先，首屏组合为 ${firstScreen}` },
      { label: "积木编排", value: brickSummary || "使用默认模块组合" },
      { label: "自动取舍", value: choices.join("；") },
    ];
  }

  window.HomePersonalization = {
    COMPONENTS,
    COMPONENT_MAP,
    COMPONENT_PROPS_SCHEMA: clone(COMPONENT_PROPS_SCHEMA),
    DEFAULT_CONFIG: normalizeConfig(DEFAULT_CONFIG),
    DEFAULT_MODULE_SETTINGS: clone(DEFAULT_MODULE_SETTINGS),
    FEATURES,
    HOME_BRICKS: clone(HOME_BRICKS),
    HOMEPAGE_CONFIG_JSON_SCHEMA: clone(HOMEPAGE_CONFIG_JSON_SCHEMA),
    MODULE_VARIANT_OPTIONS,
    MODULE_STYLE_OPTIONS,
    MODULES,
    PROTOCOL_MODULES: clone(PROTOCOL_MODULES),
    TENANT_THEME_TOKENS: clone(TENANT_THEME_TOKENS),
    THEMES,
    applyConfig,
    clearDraft,
    densityLabel,
    describeDecision,
    describeIntelligence,
    effectiveSections,
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
