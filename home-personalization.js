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
    promo_banner: "推广横幅",
    asset_summary: "资产摘要",
    wallet_balance: "钱包余额",
    quick_actions: "快捷操作",
    account_list: "账号列表",
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
  };

  const FEATURE_COMPONENT_MAP = {
    balanceTotal: "asset_summary",
    accountBalances: "asset_summary",
    walletBalance: "wallet_balance",
    fundActions: "asset_summary",
    openAccountActions: "quick_actions",
    onboardingProgress: "risk_notice",
    promoHighlight: "promo_banner",
    adCarousel: "promo_banner",
    quickActions: "quick_actions",
    referralLink: "copytrading_summary",
    tradingAccounts: "account_list",
  };

  const COMPONENT_STYLE_FEATURE_MAP = {
    promo_banner: "promoHighlight",
    asset_summary: "balanceTotal",
    wallet_balance: "walletBalance",
    quick_actions: "quickActions",
    account_list: "tradingAccounts",
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
  };

  const COMPONENT_MODULE_MAP = {
    asset_summary: "AssetOverview",
    balanceTotal: "AssetOverview",
    accountBalances: "AssetOverview",
    fundActions: "AssetOverview",
    wallet_balance: "WalletBalance",
    walletBalance: "WalletBalance",
    quick_actions: "QuickActions",
    quickActions: "QuickActions",
    openAccountActions: "QuickActions",
    promo_banner: "PromotionBanner",
    promoHighlight: "PromotionBanner",
    adCarousel: "PromotionBanner",
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
    required: ["schemaVersion", "layout"],
    additionalProperties: true,
    properties: {
      schemaVersion: { enum: [3, 4] },
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
          },
        },
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "type", "title", "slots"],
          properties: {
            id: { type: "string" },
            type: { enum: ["hero", "split", "full"] },
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
    account_list: {
      eyebrowKey: "home.accounts.eyebrow",
      titleKey: "home.accounts.title",
      fixedViewLabelKey: "home.accounts.fixedView",
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
    "home.promo.badge": "进行中",
    "home.promo.title": "五月盈利王挑战赛",
    "home.promo.meta": "奖池 9,600 美元 / 剩余 28 天 / 共 3 项活动",
    "home.promo.cta": "查看详情",
    "home.accounts.eyebrow": "账号",
    "home.accounts.title": "交易账号工作台",
    "home.accounts.fixedView": "固定视图",
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
      return ["wallet_balance", "quick_actions", "promo_banner", "market_insight", "risk_notice", "copytrading_summary"].includes(component) ? "rail" : "main";
    }
    if (type === "hero") return "hero";
    if (["account_list", "asset_summary", "wallet_balance", "quick_actions", "promo_banner"].includes(component)) return "main";
    if (type === "rail") return "rail";
    if (["market_insight", "risk_notice", "copytrading_summary"].includes(component)) return "rail";
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
    const sections = normalizeSections(source.sections || legacySections || DEFAULT_CONFIG.sections);
    const layoutPreset = normalizeLayoutPreset(source.layoutPreset || (typeof source.layout === "string" ? source.layout : ""));
    const modules = normalizeModuleVariants(source);
    const shouldUseExplicitLayout = Array.isArray(source.layout) && !source.sections && !legacySections;
    const normalizedLayout = normalizeHomepageLayout(shouldUseExplicitLayout ? source.layout : null, sections);
    const moduleStyles = normalizeModuleStyles(source.moduleStyles, modules);
    const themePreset = normalizeThemeId(source.themePreset || source.theme);
    const personalizationStrength = normalizePersonalizationStrength(source.personalizationStrength);

    return {
      schemaVersion: 4,
      blueprintVersion: 4,
      name: String(source.name || DEFAULT_CONFIG.name).slice(0, 28),
      layoutPreset,
      layout: normalizedLayout.layout.map((block) => attachModuleMetadata(block, modules)),
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

    const positiveText = positiveIntentText(text);
    const ranked = BLUEPRINT_PRESETS
      .map((preset, index) => ({ preset, index, score: scorePreset(preset, positiveText) }))
      .sort((a, b) => b.score - a.score || a.index - b.index);

    const matched = ranked.filter((item) => item.score > 0);
    const fallbackIndex = (hashText(text) + Number(variant || 0)) % BLUEPRINT_PRESETS.length;
    const intentPreset = presetByIntent(positiveText);
    const selected =
      Number(variant || 0) === 0 && intentPreset
        ? intentPreset
        : matched.length > 0
        ? matched[Math.abs(Number(variant || 0)) % Math.min(matched.length, 3)].preset
        : BLUEPRINT_PRESETS[fallbackIndex];
    const profile = promptProfile(text);
    const config = applySmartIntentToConfig(applyInstructionToConfig(presetToConfig(selected, text), text), text);

    config.aiSummary = `已识别${profile.audience}，目标是${(profile.goals.length ? profile.goals : ["清晰管理"]).join("、")}；自动生成${THEMES[config.theme]}、${LAYOUTS[config.layoutPreset]}方案，首屏聚焦${featureLabel(config.heroFocus)}。`;
    return normalizeConfig(config);
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
    const positiveText = positiveIntentText(text);
    const ranked = BLUEPRINT_PRESETS
      .map((preset, index) => ({ preset, index, score: scorePreset(preset, positiveText) }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5)
      .map((item) => item.preset);

    const pool = ranked.concat(BLUEPRINT_PRESETS.filter((preset) => !ranked.includes(preset)));
    const selected = [];

    while (selected.length < count && pool.length) {
      const next = pool.shift();
      if (!selected.includes(next)) selected.push(next);
    }

    return selected.map((preset) => applySmartIntentToConfig(applyInstructionToConfig(presetToConfig(preset, text), text), text));
  }

  function randomConfig(prompt) {
    const preset = BLUEPRINT_PRESETS[Math.floor(Math.random() * BLUEPRINT_PRESETS.length)];
    return applySmartIntentToConfig(applyInstructionToConfig(presetToConfig(preset, prompt || ""), prompt || ""), prompt || "");
  }

  function optimizeConfig(config, details) {
    const prompt = details?.prompt || "";
    const annotationText = (details?.annotations || [])
      .map((item, index) => `批注${index + 1}${item.target ? `（${item.target}）` : ""}: ${item.text}`)
      .join("。");
    const optimized = applySmartIntentToConfig(applyInstructionToConfig(config, `${prompt}。${annotationText}`), `${prompt}。${annotationText}`);

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
    promo_banner: renderPromoHighlight,
    asset_summary: renderBalanceTotal,
    wallet_balance: renderWalletBalance,
    quick_actions: renderQuickActions,
    account_list: renderTradingAccounts,
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

    return wrapFeature(doc, slot, "ai-empty-feature", config);
  }

  function componentEnabled(component, config) {
    const settings = config.moduleSettings;
    if (component === "asset_summary") return settings.assets.enabled;
    if (component === "wallet_balance") return settings.wallet.enabled;
    if (component === "quick_actions") return settings.quickActions.enabled && settings.quickActions.count > 0;
    if (component === "promo_banner") return settings.adCarousel.enabled;
    if (component === "copytrading_summary") return settings.referral.enabled;
    if (component === "account_list") return settings.tradingAccounts.enabled;
    return true;
  }

  function renderBlueprint(config, target) {
    const shell = target.querySelector("[data-home-shell]");
    if (!shell) return;

    const doc = target;

    shell.querySelectorAll(".client-welcome, [data-home-module], [data-layout-section], [data-home-feature]").forEach((node) => node.remove());
    shell.classList.add("is-blueprint-home");
    shell.className = shell.className
      .split(/\s+/)
      .filter((className) => className && !className.startsWith("ai-blueprint-layout-"))
      .concat(`ai-blueprint-layout-${config.layoutPreset}`)
      .join(" ");

    config.layout.forEach((block) => {
      const renderComponent = COMPONENT_MAP[block.component];
      if (!renderComponent || !componentEnabled(block.component, config)) return;

      const node = renderComponent(doc, config, block.props);
      node.classList.add("ai-home-block", `ai-home-block-${block.slot}`, `ai-component-${block.component}`);
      node.dataset.homeComponent = block.component;
      node.dataset.homeSlot = block.slot;
      node.style.setProperty("--home-span", String(LAYOUT_SLOT_SPANS[block.slot] || 12));
      node.style.order = String(block.priority);
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
    const variants = moduleVariantSummary(normalized)
      .map((item) => `${item.label}: ${item.variantLabel}`)
      .join("；");

    return [
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
    ];
  }

  function describeIntelligence(config, prompt) {
    const normalized = normalizeConfig(config);
    const profile = promptProfile(prompt);
    const firstSection = effectiveSections(normalized)[0];
    const firstScreen = firstSection?.slots?.map((slot) => featureLabel(slot)).filter(Boolean).join(" / ") || featureLabel(normalized.heroFocus);
    const settings = normalized.moduleSettings;
    const choices = [];

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
