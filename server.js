const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = __dirname;

function loadLocalEnvFile(filename) {
  const envPath = path.join(ROOT_DIR, filename);
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key) || process.env[key]) return;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

loadLocalEnvFile(".env");
loadLocalEnvFile(".env.local");

const PORT = Number(process.env.PORT || 5174);
const MAX_BODY_BYTES = 1_200_000;
const COMPONENT_LIBRARY_FILE = path.join(ROOT_DIR, "home-component-library.json");
const COMPOSITION_LIBRARY_FILE = path.join(ROOT_DIR, "home-component-compositions.json");
const CALL_HISTORY_FILE = path.join(ROOT_DIR, "home-ai-call-history.json");
const MAX_CALL_HISTORY = 200;
const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
const MINIMAX_CN_TYPED_ALIAS_BASE_URL = "https://api.minimaxi.cn/v1";
const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io/v1";
const MINIMAX_OFFICIAL_BASE_URLS = [MINIMAX_CN_BASE_URL, MINIMAX_GLOBAL_BASE_URL];
const MINIMAX_MAX_COMPLETION_TOKENS = 2048;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";
const DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
const DEEPSEEK_PRO_TIMEOUT_MS = 75_000;
const DEEPSEEK_FLASH_TIMEOUT_MS = 120_000;

const PROVIDERS = {
  openai: {
    name: "OpenAI",
    apiMode: "responses",
    model: "gpt-5.2",
    baseUrl: "https://api.openai.com/v1",
    endpoint: "/responses",
    keyEnv: ["OPENAI_API_KEY"],
  },
  claude: {
    name: "Claude",
    apiMode: "anthropic-messages",
    model: "claude-sonnet-4-6",
    baseUrl: "https://api.anthropic.com/v1",
    endpoint: "/messages",
    keyEnv: ["ANTHROPIC_API_KEY"],
  },
  minimax: {
    name: "MiniMax",
    apiMode: "openai-chat",
    model: "MiniMax-M2.7",
    baseUrl: MINIMAX_CN_BASE_URL,
    endpoint: "/chat/completions",
    keyEnv: ["MINIMAX_API_KEY"],
    baseUrlEnv: ["MINIMAX_BASE_URL"],
    modelEnv: ["MINIMAX_MODEL"],
  },
  kimi: {
    name: "Kimi",
    apiMode: "openai-chat",
    model: "kimi-k2.5",
    baseUrl: "https://api.moonshot.ai/v1",
    endpoint: "/chat/completions",
    keyEnv: ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
  },
  deepseek: {
    name: "DeepSeek",
    apiMode: "openai-chat",
    model: DEEPSEEK_FLASH_MODEL,
    baseUrl: DEEPSEEK_BASE_URL,
    endpoint: "/chat/completions",
    keyEnv: ["DEEPSEEK_API_KEY"],
    modelEnv: ["DEEPSEEK_MODEL"],
    baseUrlEnv: ["DEEPSEEK_BASE_URL"],
  },
};

function envValue(names = []) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return "";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeProviderBaseUrl(providerId, value) {
  const baseUrl = normalizeBaseUrl(value);
  if (providerId !== "minimax") return baseUrl;

  try {
    const target = new URL(baseUrl);
    if (target.hostname === "api.minimaxi.cn") {
      return MINIMAX_CN_BASE_URL;
    }
  } catch (error) {
    return baseUrl;
  }

  return baseUrl === MINIMAX_CN_TYPED_ALIAS_BASE_URL ? MINIMAX_CN_BASE_URL : baseUrl;
}

function normalizeTemperature(providerId, value) {
  if (!Number.isFinite(value)) return 0.4;
  if (providerId === "minimax") {
    return Math.min(Math.max(value, 0.01), 1);
  }
  return Math.min(Math.max(value, 0), 2);
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
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
  "risk_disclosure",
  "faq_section",
  "support_contact",
  "app_download",
];

const FORBIDDEN_HOME_BLOCKS = [
  "reward_tasks",
  "kyc_risk_notice",
  "ib_dashboard",
  "referralLink",
  "referral_link",
  "userKycRail",
  "user_kyc_rail",
];

const HOME_BLOCK_ALIASES = {
  welcomeHeader: "welcome_header",
  balanceTotal: "asset_overview",
  accountBalances: "asset_overview",
  walletBalance: "asset_overview",
  walletList: "asset_overview",
  fundActions: "asset_overview",
  asset_summary: "asset_overview",
  wallet_balance: "asset_overview",
  wallet_list: "asset_overview",
  fund_actions: "asset_overview",
  quickActions: "quick_actions",
  openAccountActions: "onboarding_guide",
  onboardingProgress: "onboarding_guide",
  createAccountForm: "onboarding_guide",
  open_account_panel: "onboarding_guide",
  onboarding_progress: "onboarding_guide",
  create_account_form: "onboarding_guide",
  promoHighlight: "promo_banner",
  adCarousel: "promo_banner",
  ad_carousel: "promo_banner",
  tradingAccounts: "trading_accounts_list",
  account_list: "trading_accounts_list",
  accountPerformance: "trading_account_highlight",
  account_performance: "trading_account_highlight",
  marketInsight: "market_news",
  market_insight: "market_news",
  copytradingSummary: "copytrading_signals",
  copytrading_summary: "copytrading_signals",
  referralLinkCard: "referral_link_card",
  referral_link_card: "referral_link_card",
  support_help: "support_contact",
  riskNotice: "risk_disclosure",
  risk_notice: "risk_disclosure",
  faq: "faq_section",
  faqSection: "faq_section",
  customerService: "support_contact",
  supportContact: "support_contact",
  customer_service: "support_contact",
  appDownload: "app_download",
  app_download: "app_download",
};

const DISABLED_QUICK_ACTION_IDS = new Set(["contactService", "kyc", "risk", "referral", "inviteFriends", "viewCommission", "downloadMaterial"]);

function canonicalHomeBlock(id) {
  const value = String(id || "").trim();
  if (!value || FORBIDDEN_HOME_BLOCKS.includes(value)) return "";
  if (CANONICAL_HOME_BLOCKS.includes(value)) return value;
  return HOME_BLOCK_ALIASES[value] || "";
}

const COMPONENT_FAMILIES = [
  "WelcomeHeader",
  "AssetOverview",
  "WalletBalance",
  "FundActions",
  "QuickActions",
  "PromotionBanner",
  "ReferralLink",
  "TradingAccounts",
  "OpenAccount",
  "OnboardingProgress",
  "UserKycRail",
  "AccountPerformance",
  "WalletList",
  "CreateAccountForm",
  "RiskDisclosure",
  "FaqSection",
  "SupportContact",
  "AppDownload",
  "ClientHomeAtoms",
];

const COMPONENT_SIZES = ["1x1", "1x2", "2x1", "2x2", "3x1", "3x2"];

const HOMEPAGE_INTENT_PRESETS = {
  standard: {
    label: "标准工作台",
    layoutPreset: "accountOpsConsole",
    themePreset: "default",
    density: "balanced",
    heroFocus: "asset_overview",
    primaryGoal: "保留资产概览、快捷操作和交易账号的平衡首页。",
    mustHave: ["asset_overview", "quick_actions", "trading_account_highlight", "trading_accounts_list"],
    avoid: [],
  },
  asset: {
    label: "资产管理",
    layoutPreset: "accountOpsConsole",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "asset_overview",
    primaryGoal: "突出 Total、钱包余额、交易账号余额和账号表现。",
    mustHave: ["asset_overview", "trading_account_highlight", "trading_accounts_list"],
    avoid: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
  },
  growth: {
    label: "活动增长",
    layoutPreset: "magazineCampaign",
    themePreset: "darkTech",
    density: "balanced",
    heroFocus: "promo_banner",
    primaryGoal: "在租户配置活动时，用活动 Banner、快捷操作和账号列表承接转化。",
    mustHave: ["promo_banner", "quick_actions", "trading_accounts_list"],
    avoid: ["reward_tasks", "ib_dashboard"],
  },
  trader: {
    label: "专业交易",
    layoutPreset: "tradingCommand",
    themePreset: "default",
    density: "compact",
    heroFocus: "trading_accounts_list",
    primaryGoal: "让高频交易入口、账号列表、持仓和表现数据成为首要路径。",
    mustHave: ["quick_actions", "trading_account_highlight", "trading_accounts_list"],
    avoid: ["kyc_risk_notice", "ib_dashboard"],
  },
  onboarding: {
    label: "新客开户",
    layoutPreset: "onboardingJourney",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "onboarding_guide",
    primaryGoal: "引导新客理解下一步操作，如未开户、未入金或未开始交易。",
    mustHave: ["onboarding_guide", "quick_actions", "asset_overview", "trading_accounts_list"],
    avoid: ["kyc_risk_notice", "ib_dashboard"],
  },
  copytrading: {
    label: "跟单推荐",
    layoutPreset: "onboardingJourney",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "copytrading_signals",
    primaryGoal: "把 CopyTrading 信号源推荐作为可解释机会，再用账号和快捷入口承接下一步。",
    mustHave: ["copytrading_signals", "onboarding_guide", "quick_actions", "trading_accounts_list"],
    avoid: ["kyc_risk_notice", "ib_dashboard", "referral_link_card"],
  },
  deposit: {
    label: "入金转化",
    layoutPreset: "onboardingJourney",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "asset_overview",
    primaryGoal: "把资产概览、可选活动 Banner、快捷操作和交易账号放到前面。",
    mustHave: ["asset_overview", "quick_actions", "promo_banner", "trading_accounts_list"],
    avoid: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
  },
  partner: {
    label: "渠道诉求兼容",
    layoutPreset: "accountOpsConsole",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "asset_overview",
    primaryGoal: "代理/渠道诉求不生成完整代理数据区，只展示轻量推广链接卡片、资产、快捷操作和账号列表。",
    mustHave: ["referral_link_card", "asset_overview", "quick_actions", "announcements", "trading_accounts_list"],
    avoid: ["ib_dashboard", "referralLink", "kyc_risk_notice"],
  },
  vip: {
    label: "VIP 高净值",
    layoutPreset: "privateWealthDesk",
    themePreset: "blackGold",
    density: "spacious",
    heroFocus: "asset_overview",
    primaryGoal: "建立高净值客户的资金信任、尊贵权益和服务触达。",
    mustHave: ["asset_overview", "trading_account_highlight", "quick_actions", "announcements", "trading_accounts_list"],
    avoid: ["kyc_risk_notice", "ib_dashboard"],
  },
  insight: {
    label: "数据洞察",
    layoutPreset: "tradingCommand",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "trading_account_highlight",
    primaryGoal: "把账户表现、市场资讯和交易账号组织成每日检查流。",
    mustHave: ["trading_account_highlight", "market_news", "asset_overview", "trading_accounts_list"],
    avoid: ["kyc_risk_notice", "ib_dashboard"],
  },
  risk: {
    label: "风险提示",
    layoutPreset: "tradingCommand",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "risk_disclosure",
    primaryGoal: "用风险提示、账号表现、资产概览和交易账号承接风险与合规诉求。",
    mustHave: ["risk_disclosure", "trading_account_highlight", "asset_overview", "trading_accounts_list"],
    avoid: ["kyc_risk_notice", "userKycRail", "ib_dashboard"],
  },
  retention: {
    label: "留存唤醒",
    layoutPreset: "onboardingJourney",
    themePreset: "minimalWhite",
    density: "balanced",
    heroFocus: "quick_actions",
    primaryGoal: "用资产概览、快捷操作、账号列表和内容资讯唤醒沉睡客户。",
    mustHave: ["asset_overview", "quick_actions", "promo_banner", "market_news", "trading_accounts_list"],
    avoid: ["reward_tasks", "referralLink"],
  },
  mobile: {
    label: "移动优先",
    layoutPreset: "accountOpsConsole",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "asset_overview",
    primaryGoal: "压缩首屏高度，让移动端以单列、短入口和紧凑账号卡片完成核心操作。",
    mustHave: ["asset_overview", "quick_actions", "trading_accounts_list"],
    avoid: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
  },
  brand: {
    label: "白标品牌",
    layoutPreset: "accountOpsConsole",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "asset_overview",
    primaryGoal: "用资产概览、快捷操作、重点账号和账号列表建立成熟券商客户端可信度。",
    mustHave: ["asset_overview", "quick_actions", "trading_account_highlight", "trading_accounts_list"],
    avoid: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
  },
};

const HOMEPAGE_GOVERNANCE_CONTRACTS = {
  standard: {
    label: "标准工作台契约",
    primaryGoal: "保留资产概览、快捷入口和交易账号的平衡工作台。",
    primaryAction: "quick_actions",
    secondaryAction: "trading_accounts_list",
    firstScreenSlots: ["asset_overview", "quick_actions"],
    operationSlots: ["quick_actions"],
    accountSlots: ["trading_account_highlight", "trading_accounts_list"],
    weakSlots: ["promo_banner", "announcements", "market_news"],
    maxPrimaryActionSurfaces: 2,
  },
  asset: {
    label: "资产管理契约",
    primaryGoal: "先让客户看清 Total、钱包余额、交易账号余额和账号表现。",
    primaryAction: "asset_overview",
    secondaryAction: "trading_account_highlight",
    firstScreenSlots: ["asset_overview"],
    operationSlots: ["quick_actions"],
    accountSlots: ["trading_account_highlight", "trading_accounts_list"],
    weakSlots: ["promo_banner", "announcements", "market_news"],
    maxPrimaryActionSurfaces: 2,
  },
  deposit: {
    label: "入金转化契约",
    primaryGoal: "通过资产概览、租户活动和后台配置快捷入口承接入金意图。",
    primaryAction: "asset_overview",
    secondaryAction: "quick_actions",
    firstScreenSlots: ["asset_overview", "promo_banner"],
    operationSlots: ["quick_actions"],
    accountSlots: ["trading_account_highlight", "trading_accounts_list"],
    weakSlots: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
    maxPrimaryActionSurfaces: 1,
    forcedQuickActions: [],
  },
  onboarding: {
    label: "开户激活契约",
    primaryGoal: "引导新用户完成未开户、未入金或未开始交易等下一步。",
    primaryAction: "onboarding_guide",
    secondaryAction: "quick_actions",
    firstScreenSlots: ["onboarding_guide", "asset_overview"],
    operationSlots: ["quick_actions"],
    accountSlots: ["trading_accounts_list"],
    weakSlots: ["kyc_risk_notice", "ib_dashboard"],
    maxPrimaryActionSurfaces: 3,
  },
  copytrading: {
    label: "跟单推荐契约",
    primaryGoal: "首屏展示可解释的 CopyTrading 信号源机会，并用账号与快捷入口承接跟单。",
    primaryAction: "copytrading_signals",
    secondaryAction: "quick_actions",
    firstScreenSlots: ["copytrading_signals", "quick_actions"],
    operationSlots: ["quick_actions", "trading_account_highlight"],
    accountSlots: ["trading_accounts_list"],
    weakSlots: ["referral_link_card", "promo_banner", "ib_dashboard"],
    maxPrimaryActionSurfaces: 2,
  },
  growth: {
    label: "活动增长契约",
    primaryGoal: "仅在租户配置活动时用活动 Banner 和快捷入口承接活动转化。",
    primaryAction: "promo_banner",
    secondaryAction: "quick_actions",
    firstScreenSlots: ["promo_banner"],
    operationSlots: ["quick_actions"],
    accountSlots: ["trading_accounts_list"],
    weakSlots: ["reward_tasks", "ib_dashboard"],
    maxPrimaryActionSurfaces: 2,
  },
  trader: {
    label: "交易效率契约",
    primaryGoal: "让交易员更快处理账号、持仓、订单和资金动作。",
    primaryAction: "trading_accounts_list",
    secondaryAction: "trading_account_highlight",
    firstScreenSlots: ["trading_account_highlight", "quick_actions"],
    operationSlots: ["quick_actions", "market_news"],
    accountSlots: ["trading_accounts_list"],
    weakSlots: ["kyc_risk_notice", "ib_dashboard"],
    maxPrimaryActionSurfaces: 2,
  },
  brand: {
    label: "券商可信契约",
    primaryGoal: "先建立资产可信度，再承接快捷入口、活动、账号管理和内容价值。",
    primaryAction: "asset_overview",
    secondaryAction: "quick_actions",
    firstScreenSlots: ["asset_overview", "quick_actions"],
    operationSlots: ["promo_banner", "announcements", "market_news"],
    accountSlots: ["trading_account_highlight", "trading_accounts_list"],
    weakSlots: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
    maxPrimaryActionSurfaces: 2,
  },
};

const HOMEPAGE_INTENT_SIGNALS = {
  standard: {
    positive: ["标准", "默认", "平衡", "首页", "工作台", "常规"],
    negative: [],
  },
  asset: {
    positive: ["资产管理", "总资产", "多币种", "钱包列表", "资产配置", "可用资金", "保证金占用", "风险等级", "账户资产", "账号资产", "资产优先"],
    negative: [/不要.{0,8}(资产|钱包)/i],
  },
  growth: {
    positive: ["活动", "比赛", "大赛", "奖池", "营销", "增长", "转化", "推广", "广告", "轮播", "banner", "报名"],
    negative: [/不要.{0,8}(广告|活动|轮播|banner)/i],
  },
  trader: {
    positive: ["交易工作台", "专业交易", "高频交易", "mt4", "mt5", "持仓", "订单", "pnl", "交易员", "终端", "交易成本", "执行效率", "点差", "佣金", "eurusd"],
    negative: [/不要.{0,8}(交易工具|持仓|订单)/i],
  },
  onboarding: {
    positive: ["新手", "新客", "新用户", "刚注册", "开户注册", "开户", "注册", "kyc", "首次", "开户表单", "创建账户", "未实名"],
    negative: [/不要.{0,8}(开户|注册|kyc|表单)/i],
  },
  copytrading: {
    positive: ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐", "跟单推荐"],
    negative: [/不要.{0,8}(copytrading|跟单|信号源|推荐交易员)/i],
  },
  deposit: {
    positive: ["入金转化", "入金", "首存", "充值", "首次入金", "完成首次入金", "deposit", "资金动作"],
    negative: [/不要.{0,8}(入金|充值|资金)/i],
  },
  partner: {
    positive: ["ib", "代理", "渠道", "邀请", "裂变", "开户链接", "注册链接", "邀请码", "返佣", "二维码"],
    negative: [/不要.{0,8}(代理|渠道|邀请|返佣)/i],
  },
  vip: {
    positive: ["高净值", "vip", "黑金", "尊贵", "机构", "大客户", "专属", "权益"],
    negative: [/不要.{0,8}(vip|黑金|权益)/i],
  },
  insight: {
    positive: ["数据洞察", "洞察首页", "账户健康", "健康度", "资金流向", "交易习惯", "分析首页", "报表", "收益分析"],
    negative: [/不要.{0,8}(洞察|分析|报表)/i],
  },
  risk: {
    positive: ["风险提醒", "风控", "保证金状态", "持仓提醒", "资金保护", "风险保护", "杠杆", "爆仓", "预警"],
    negative: [/不要.{0,8}(风险|风控|保证金|杠杆|预警)/i],
  },
  retention: {
    positive: ["留存", "召回", "沉睡", "唤醒", "回流", "重新开始交易", "流失"],
    negative: [/不要.{0,8}(召回|唤醒|回流)/i],
  },
  mobile: {
    positive: ["移动端", "手机", "单列", "少滚动", "移动优先", "mobile", "app"],
    negative: [/不要.{0,8}(移动端|手机|单列|app)/i],
  },
  brand: {
    positive: ["白标", "品牌可信", "品牌露出", "成熟券商", "品牌", "客户经理服务", "可信", "官网感"],
    negative: [/不要.{0,8}(品牌|白标|官网感)/i],
  },
};

const HOMEPAGE_INTENT_SECTIONS = {
  standard: [
    { id: "standard-hero", type: "hero", title: "工作台", slots: ["asset_overview", "quick_actions"] },
    { id: "standard-accounts", type: "split", title: "交易账号", slots: ["trading_account_highlight", "trading_accounts_list"] },
  ],
  asset: [
    { id: "asset-overview", type: "hero", title: "资产概览", slots: ["asset_overview"] },
    { id: "asset-performance", type: "split", title: "账户表现", slots: ["trading_account_highlight", "trading_accounts_list"] },
  ],
  growth: [
    { id: "growth-hero", type: "hero", title: "活动 Banner", slots: ["promo_banner"] },
    { id: "growth-actions", type: "split", title: "转化路径", slots: ["quick_actions", "asset_overview"] },
    { id: "growth-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  trader: [
    { id: "trader-tools", type: "hero", title: "交易账号", slots: ["trading_account_highlight", "quick_actions"] },
    { id: "trader-accounts", type: "full", title: "账号列表", slots: ["trading_accounts_list"] },
  ],
  onboarding: [
    { id: "onboarding-hero", type: "hero", title: "新手引导", slots: ["onboarding_guide", "asset_overview"] },
    { id: "onboarding-next", type: "split", title: "下一步", slots: ["quick_actions", "trading_accounts_list"] },
  ],
  copytrading: [
    { id: "copytrading-hero", type: "hero", title: "跟单推荐", slots: ["copytrading_signals", "onboarding_guide"] },
    { id: "copytrading-actions", type: "split", title: "下一步", slots: ["quick_actions", "asset_overview"] },
    { id: "copytrading-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  deposit: [
    { id: "deposit-hero", type: "hero", title: "资产概览", slots: ["asset_overview", "promo_banner"] },
    { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quick_actions"] },
    { id: "deposit-accounts", type: "full", title: "账号与趋势", slots: ["trading_account_highlight", "trading_accounts_list"] },
  ],
  partner: [
    { id: "partner-hero", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] },
    { id: "partner-referral", type: "split", title: "推广链接", slots: ["referral_link_card", "announcements"] },
    { id: "partner-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  vip: [
    { id: "vip-hero", type: "hero", title: "资产概览", slots: ["asset_overview", "trading_account_highlight"] },
    { id: "vip-context", type: "split", title: "公告与资讯", slots: ["announcements", "market_news"] },
    { id: "vip-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  insight: [
    { id: "insight-hero", type: "hero", title: "账户表现", slots: ["trading_account_highlight", "market_news"] },
    { id: "insight-assets", type: "split", title: "资产与账号", slots: ["asset_overview", "trading_accounts_list"] },
  ],
  risk: [
    { id: "risk-hero", type: "hero", title: "风险提示", slots: ["risk_disclosure", "trading_account_highlight"] },
    { id: "risk-context", type: "split", title: "账户上下文", slots: ["asset_overview", "support_contact"] },
    { id: "risk-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  retention: [
    { id: "retention-hero", type: "hero", title: "账户唤醒", slots: ["asset_overview", "quick_actions"] },
    { id: "retention-content", type: "split", title: "内容与活动", slots: ["promo_banner", "market_news"] },
    { id: "retention-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  mobile: [
    { id: "mobile-hero", type: "hero", title: "移动首屏", slots: ["asset_overview", "quick_actions"] },
    { id: "mobile-accounts", type: "full", title: "账号卡片", slots: ["trading_accounts_list"] },
  ],
  brand: [
    { id: "brand-trust-hero", type: "hero", title: "资金安全", slots: ["asset_overview", "quick_actions"] },
    { id: "brand-conversion", type: "split", title: "账号与活动", slots: ["trading_account_highlight", "promo_banner"] },
    { id: "brand-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
};

const HOMEPAGE_FORCE_INTENTS = new Set(["growth", "partner", "deposit", "onboarding", "copytrading", "vip", "insight", "risk", "retention", "mobile", "brand"]);

const GENERATED_COMPONENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: ["name", "family", "size", "html", "css", "description"],
  properties: {
    name: { type: "string" },
    family: { enum: COMPONENT_FAMILIES },
    size: { enum: COMPONENT_SIZES },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    html: { type: "string" },
    css: { type: "string" },
    layoutHints: { type: "array", items: { type: "string" } },
    dataRequirements: { type: "array", items: { type: "string" } },
  },
};

const COMPONENT_COMPOSITION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: ["name", "summary", "layout", "polishInstructions"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    layout: {
      type: "array",
      items: {
        type: "object",
        required: ["componentId", "size", "zone", "reason"],
        properties: {
          componentId: { type: "string" },
          size: { enum: COMPONENT_SIZES },
          zone: { enum: ["hero", "main", "rail", "full"] },
          reason: { type: "string" },
        },
      },
    },
    themeAdvice: { type: "string" },
    polishInstructions: { type: "string" },
  },
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error("Invalid JSON request body"), { statusCode: 400 }));
      }
    });

    req.on("error", reject);
  });
}

function normalizeProviderConfig(modelConfig = {}) {
  const providerId = PROVIDERS[modelConfig.provider] ? modelConfig.provider : "openai";
  const preset = PROVIDERS[providerId];
  const model = String(modelConfig.model || envValue(preset.modelEnv) || preset.model).trim().slice(0, 100);
  const baseUrl = normalizeProviderBaseUrl(providerId, modelConfig.baseUrl || envValue(preset.baseUrlEnv) || preset.baseUrl);
  const endpoint = String(modelConfig.endpoint || envValue(preset.endpointEnv) || preset.endpoint).trim();
  const temperature = Number(modelConfig.temperature);
  const maxOutputTokens = Number(modelConfig.maxOutputTokens);
  const defaultMaxOutputTokens = providerId === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 6000;
  const maxOutputCeiling = providerId === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 12000;
  const minOutputTokens = providerId === "minimax" ? 512 : 6000;

  return {
    provider: providerId,
    name: preset.name,
    apiMode: String(modelConfig.apiMode || preset.apiMode),
    model,
    baseUrl,
    endpoint: /^https?:\/\//i.test(endpoint) ? endpoint : endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
    temperature: normalizeTemperature(providerId, temperature),
    maxOutputTokens: Number.isFinite(maxOutputTokens) ? Math.min(Math.max(Math.round(maxOutputTokens), minOutputTokens), maxOutputCeiling) : defaultMaxOutputTokens,
    apiKey: String(modelConfig.apiKey || "").trim(),
    keyEnv: preset.keyEnv,
  };
}

function resolveApiKey(config) {
  for (const envName of config.keyEnv) {
    if (process.env[envName]) return process.env[envName];
  }
  return config.apiKey;
}

function providerUrl(config) {
  const rawEndpoint = String(config.endpoint || "");
  const endpoint = rawEndpoint.startsWith("/") ? rawEndpoint : `/${rawEndpoint}`;
  const target = /^https?:\/\//i.test(rawEndpoint)
    ? new URL(rawEndpoint)
    : new URL(`${normalizeBaseUrl(config.baseUrl)}${endpoint}`);
  const insecureAllowed = process.env.ALLOW_INSECURE_AI_HTTP === "true";

  if (target.protocol !== "https:" && !(insecureAllowed && target.protocol === "http:")) {
    throw Object.assign(new Error("AI provider URL must use HTTPS"), { statusCode: 400 });
  }

  return target;
}

function providerBaseUrlCandidates(config) {
  const current = normalizeBaseUrl(config.baseUrl);
  if (config.provider !== "minimax" || /^https?:\/\//i.test(config.endpoint || "")) return [current];
  if (!MINIMAX_OFFICIAL_BASE_URLS.includes(current)) return [current];
  return [current, ...MINIMAX_OFFICIAL_BASE_URLS.filter((baseUrl) => baseUrl !== current)];
}

function providerRequestCandidates(config) {
  const candidates = providerBaseUrlCandidates(config).map((baseUrl) => ({ ...config, baseUrl }));
  if (config.provider !== "deepseek" || config.model !== DEEPSEEK_PRO_MODEL || /^https?:\/\//i.test(config.endpoint || "")) {
    return candidates;
  }
  return candidates.flatMap((candidate) => [candidate, { ...candidate, model: DEEPSEEK_FLASH_MODEL, fallbackFromModel: DEEPSEEK_PRO_MODEL }]);
}

function providerRequestTimeoutMs(config) {
  if (config.provider === "minimax") return 90_000;
  if (config.provider === "deepseek" && config.model === DEEPSEEK_PRO_MODEL) return DEEPSEEK_PRO_TIMEOUT_MS;
  if (config.provider === "deepseek") return DEEPSEEK_FLASH_TIMEOUT_MS;
  return 120_000;
}

function providerResponseMessage(data, text, statusCode) {
  return (
    data?.error?.message ||
    data?.error?.detail ||
    data?.base_resp?.status_msg ||
    data?.base_resp?.message ||
    data?.message ||
    text.slice(0, 600) ||
    `HTTP ${statusCode}`
  );
}

function requestJson(target, options) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(options.body || {});
    const client = target.protocol === "http:" ? http : https;
    const timeout = Number.isFinite(Number(options.timeout)) ? Number(options.timeout) : 120_000;
    const request = client.request(
      target,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          ...options.headers,
        },
        timeout,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch (error) {
            data = null;
          }
          const providerCode = Number(data?.base_resp?.status_code);

          if (response.statusCode < 200 || response.statusCode >= 300) {
            const message = providerResponseMessage(data, text, response.statusCode);
            reject(
              Object.assign(new Error(message), {
                statusCode: 502,
                providerStatus: response.statusCode,
                providerBody: data || text.slice(0, 1000),
              }),
            );
            return;
          }

          if (data?.error || (Number.isFinite(providerCode) && providerCode !== 0)) {
            const message = providerResponseMessage(data, text, response.statusCode);
            reject(
              Object.assign(new Error(message), {
                statusCode: 502,
                providerStatus: response.statusCode,
                providerCode: Number.isFinite(providerCode) ? providerCode : null,
                providerBody: data || text.slice(0, 1000),
              }),
            );
            return;
          }

          resolve(data || {});
        });
      },
    );

    request.on("timeout", () => request.destroy(new Error("AI provider request timed out")));
    request.on("error", reject);
    request.end(body);
  });
}

function isTransientProviderError(error) {
  const status = Number(error.providerStatus);
  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  return /timed?\s*out|timeout|socket hang up|ECONNRESET|ETIMEDOUT|EAI_AGAIN|busy|overloaded|unavailable/i.test(String(error.message || error.code || ""));
}

function shouldRetryProviderRequest(config, error, attemptNumber, totalAttempts) {
  if (attemptNumber >= totalAttempts) return false;

  if (config.provider === "minimax") {
    const status = Number(error.providerStatus);
    if ([401, 403, 404].includes(status)) return true;
    if (status === 400 && /key|token|model|plan|endpoint|base|region|not found/i.test(error.message || "")) return true;
    return !Number.isFinite(status);
  }

  if (config.provider === "deepseek" && config.model === DEEPSEEK_PRO_MODEL) {
    return isTransientProviderError(error);
  }

  return false;
}

async function requestProviderJson(config, headers, body) {
  const candidates = providerRequestCandidates(config);
  const attempts = [];
  let lastError = null;
  let lastTarget = null;
  let lastConfig = config;

  for (let index = 0; index < candidates.length; index += 1) {
    const attemptConfig = candidates[index];
    const target = providerUrl(attemptConfig);

    try {
      const attemptBody = attemptConfig.model === config.model ? body : { ...body, model: attemptConfig.model };
      const response = await requestJson(target, { headers, body: attemptBody, timeout: providerRequestTimeoutMs(attemptConfig) });
      return { response, config: attemptConfig, target, attempts };
    } catch (error) {
      lastError = error;
      lastTarget = target;
      lastConfig = attemptConfig;
      attempts.push(
        providerErrorDetails(attemptConfig, target, {
          providerStatus: error.providerStatus || null,
          providerCode: error.providerCode || null,
          message: String(error.message || "unknown error").slice(0, 360),
          fallbackFromModel: attemptConfig.fallbackFromModel || null,
        }),
      );

      if (!shouldRetryProviderRequest(attemptConfig, error, index + 1, candidates.length)) break;
    }
  }

  throw enrichProviderError(lastError || new Error("AI provider request failed"), lastConfig, lastTarget, { attempts });
}

function compactJson(value, fallback = {}) {
  try {
    return JSON.stringify(value || fallback, null, 2);
  } catch (error) {
    return JSON.stringify(fallback, null, 2);
  }
}

function readJsonFile(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function readCallHistory() {
  const data = readJsonFile(CALL_HISTORY_FILE, { records: [] });
  return Array.isArray(data.records) ? data.records.slice(0, MAX_CALL_HISTORY) : [];
}

function writeCallHistory(records) {
  const normalized = (Array.isArray(records) ? records : []).slice(0, MAX_CALL_HISTORY);
  writeJsonFile(CALL_HISTORY_FILE, { records: normalized });
  return normalized;
}

function safeRecordText(value, limit = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function homepageRecordSnapshot(config) {
  const source = config && typeof config === "object" ? config : {};
  const brickPlan = Array.isArray(source.brickPlan) ? source.brickPlan : [];
  const sections = Array.isArray(source.sections) ? source.sections : [];
  const trace = source.brickTrace && typeof source.brickTrace === "object" ? source.brickTrace : {};

  return {
    name: safeRecordText(source.name, 80),
    layoutPreset: safeRecordText(source.layoutPreset, 40),
    themePreset: safeRecordText(source.themePreset || source.theme, 40),
    density: safeRecordText(source.density, 24),
    intent: safeRecordText(trace.intent, 40),
    strategy: safeRecordText(trace.strategy || source.compositionStrategy, 120),
    brickIds: brickPlan.map((item) => safeRecordText(item?.brickId || item?.feature, 80)).filter(Boolean).slice(0, 12),
    sections: sections.map((section) => `${safeRecordText(section?.type, 24)}:${Array.isArray(section?.slots) ? section.slots.join("+") : ""}`).slice(0, 12),
  };
}

function callHistoryConfig(payload) {
  try {
    return normalizeProviderConfig(payload?.modelConfig || {});
  } catch (error) {
    return normalizeProviderConfig({});
  }
}

function addCallHistoryRecord(record) {
  const records = readCallHistory();
  const nextRecord = {
    id: `server-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    source: "serverProxy",
    ...record,
  };
  writeCallHistory([nextRecord, ...records]);
  return nextRecord;
}

function safeId(value, prefix = "component") {
  const source = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return source || `${prefix}-${Date.now().toString(36)}`;
}

function oneOfList(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

function sanitizeGeneratedHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .slice(0, 9000);
}

function sanitizeGeneratedCss(value) {
  return String(value || "")
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\(\s*javascript:[^)]+\)/gi, "")
    .slice(0, 12000);
}

function cleanText(value, fallback = "", limit = 220) {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  return text.slice(0, limit);
}

function stripEditorArtifactsFromHtml(value) {
  return String(value || "").replace(/<small\b[^>]*data-ai-edit-note[^>]*>[\s\S]*?<\/small>/gi, "");
}

function stripEditorArtifactsFromCss(value) {
  return String(value || "")
    .replace(/[^{}]*\.ai-edit-note[^{}]*\{[^{}]*\}/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripEditorArtifactsFromText(value) {
  return String(value || "")
    .replace(/\s*已按「[^」]{0,300}」调整。?/g, "")
    .replace(/\s*AI\s*修改[:：][^。.!！?？]{0,300}[。.!！?？]?/gi, "")
    .replace(/\s*已改为带编号、状态和连接线的渐进式开户路径。?/g, "")
    .replace(/\s*标题已更新为[^。.!！?？]{1,120}[。.!！?？]?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeGeneratedComponent(component, payload = {}, options = {}) {
  const source = component && typeof component === "object" ? component : {};
  const family = oneOfList(source.family || payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = oneOfList(source.size || payload.size, COMPONENT_SIZES, "2x1");
  const name = cleanText(source.name, `${family} AI 组件`, 48);
  const id = safeId(source.id || `${family}-${name}-${Date.now().toString(36)}`, "component");
  const now = new Date().toISOString();
  const preserveUpdatedAt = Boolean(options.preserveUpdatedAt);

  return {
    id,
    type: cleanText(source.type, "ai-generated", 32),
    name,
    family,
    size,
    description: cleanText(stripEditorArtifactsFromText(source.description), "AI 生成的首页积木组件。", 260),
    tags: (Array.isArray(source.tags) ? source.tags : [family, size]).map((tag) => cleanText(tag, "", 28)).filter(Boolean).slice(0, 8),
    html: stripEditorArtifactsFromHtml(sanitizeGeneratedHtml(source.html)),
    css: stripEditorArtifactsFromCss(sanitizeGeneratedCss(source.css)),
    layoutHints: (Array.isArray(source.layoutHints) ? source.layoutHints : []).map((item) => cleanText(item, "", 120)).filter(Boolean).slice(0, 6),
    dataRequirements: (Array.isArray(source.dataRequirements) ? source.dataRequirements : []).map((item) => cleanText(item, "", 120)).filter(Boolean).slice(0, 6),
    sourcePrompt: cleanText(payload.prompt || source.sourcePrompt, "", 500),
    createdAt: source.createdAt || now,
    updatedAt: preserveUpdatedAt && source.updatedAt ? source.updatedAt : now,
  };
}

function generatedComponentTooGeneric(component) {
  const source = `${component?.name || ""} ${component?.description || ""} ${component?.html || ""}`;
  if (/Primary Action|AI\s*样式|Lorem ipsum|Sample Component/i.test(source)) return true;
  const businessSignals = [
    "Deposit",
    "Withdraw",
    "Withdrawal",
    "Wallet",
    "KYC",
    "Live Account",
    "Demo Account",
    "Bind Account",
    "Referral",
    "Invitation",
    "Balance",
    "Equity",
    "Credit",
    "Leverage",
    "Trading",
    "Campaign",
    "Featured",
    "交易账号",
    "钱包",
    "入金",
    "出金",
    "开户链接",
    "真实账号",
    "模拟账号",
    "活动",
    "广告",
  ];
  return !businessSignals.some((signal) => source.includes(signal));
}

function readComponentLibrary() {
  const data = readJsonFile(COMPONENT_LIBRARY_FILE, { components: [] });
  const components = Array.isArray(data.components)
    ? data.components
        .map((item) => normalizeGeneratedComponent(item, {}, { preserveUpdatedAt: true }))
        .filter((item) => item.html && item.css && !generatedComponentTooGeneric(item))
    : [];
  return { components };
}

function componentStyleSignals(css) {
  const source = String(css || "");
  const signals = [];
  const add = (condition, label) => {
    if (condition && !signals.includes(label)) signals.push(label);
  };

  add(/display\s*:\s*grid/i.test(source), "grid layout");
  add(/display\s*:\s*flex/i.test(source), "flex alignment");
  add(/grid-template-columns\s*:\s*repeat\(\s*2/i.test(source), "two-column metrics");
  add(/grid-template-columns\s*:\s*repeat\(\s*3/i.test(source), "three-column metrics");
  add(/grid-template-columns\s*:\s*repeat\(\s*[4-6]/i.test(source), "dense action grid");
  add(/border-radius\s*:\s*(?:[0-8](?:\.\d+)?px|0)/i.test(source), "radius <= 8px");
  add(/#eff6ff|#f8fbff|#dbeafe|#bfdbfe|rgba\(37,\s*99,\s*235/i.test(source), "light blue finance");
  add(/#0f172a|#111827|#172033|#020617/i.test(source), "dark finance");
  add(/button|\.primary/i.test(source), "action buttons");
  add(/@media/i.test(source), "responsive rules");

  return signals.slice(0, 8);
}

function summarizeComponentForPrompt(component) {
  return {
    id: component.id,
    name: component.name,
    family: component.family,
    size: component.size,
    description: component.description,
    tags: Array.isArray(component.tags) ? component.tags.slice(0, 6) : [],
    layoutHints: Array.isArray(component.layoutHints) ? component.layoutHints.slice(0, 4) : [],
    dataRequirements: Array.isArray(component.dataRequirements) ? component.dataRequirements.slice(0, 6) : [],
    visibleText: stripHtmlTags(component.html).slice(0, 260),
    styleSignals: componentStyleSignals(component.css),
  };
}

function rankComponentReferences(components, options = {}) {
  const family = cleanText(options.family, "", 60);
  const size = cleanText(options.size, "", 12);
  const prompt = normalizeKeywordText(options.prompt || "");
  const limit = Math.max(1, Math.min(Number(options.limit) || 8, 16));

  return components
    .map((component, index) => {
      const haystack = normalizeKeywordText(
        [
          component.id,
          component.name,
          component.family,
          component.size,
          component.description,
          ...(Array.isArray(component.tags) ? component.tags : []),
          ...(Array.isArray(component.dataRequirements) ? component.dataRequirements : []),
        ].join(" "),
      );
      const promptHits = prompt
        ? prompt
            .split(/\s+|[，,。；;、]/)
            .filter((word) => word.length >= 2 && haystack.includes(word))
            .length
        : 0;

      return {
        component,
        score:
          (family && component.family === family ? 80 : 0) +
          (size && component.size === size ? 22 : 0) +
          promptHits * 8 +
          Math.min(index, 20),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.component)
    .slice(0, limit);
}

function componentLibraryPromptReference(options = {}) {
  const components = readComponentLibrary().components;
  const selected = rankComponentReferences(components, options);

  return {
    referenceMode: "先参考已保存组件库积木的业务字段、尺寸、按钮、标签、卡片密度和视觉层级，再根据本次意图做新组合或新变体。",
    freedomRule: "允许有 AI 灵感，但灵感必须依托现有父模块、真实字段、可用尺寸或组件语言；不能把组件库参考当成新增业务能力授权。",
    availableCount: components.length,
    selectedComponents: selected.map(summarizeComponentForPrompt),
  };
}

function savedCompositionPromptReference(limit = 6) {
  const data = readJsonFile(COMPOSITION_LIBRARY_FILE, { compositions: [] });
  const compositions = Array.isArray(data.compositions) ? data.compositions : [];
  return compositions
    .slice(-Math.max(1, Math.min(Number(limit) || 6, 10)))
    .map((composition) => ({
      id: cleanText(composition.id, "", 80),
      name: cleanText(composition.name, "", 80),
      summary: cleanText(composition.summary, "", 220),
      layout: (Array.isArray(composition.layout) ? composition.layout : []).slice(0, 8).map((item) => ({
        componentId: cleanText(item?.componentId, "", 80),
        size: cleanText(item?.size, "", 12),
        zone: cleanText(item?.zone, "", 20),
        reason: cleanText(item?.reason, "", 160),
      })),
      themeAdvice: cleanText(composition.themeAdvice, "", 180),
      polishInstructions: cleanText(composition.polishInstructions, "", 220),
    }));
}

function saveComponent(component) {
  const library = readComponentLibrary();
  const normalized = normalizeGeneratedComponent(component);
  const nextComponents = library.components.filter((item) => item.id !== normalized.id).concat(normalized);
  writeJsonFile(COMPONENT_LIBRARY_FILE, { components: nextComponents });
  return normalized;
}

function resolveComponentForEdit(payload = {}) {
  const componentId = cleanText(payload.componentId || payload.id, "", 90);
  const library = readComponentLibrary();
  const fromLibrary = library.components.find((component) => component.id === componentId);
  if (fromLibrary) return fromLibrary;

  if (payload.component && typeof payload.component === "object") {
    const fallback = normalizeGeneratedComponent(payload.component);
    if (!componentId || fallback.id === componentId) return fallback;
  }

  throw Object.assign(new Error("Component not found"), { statusCode: 404 });
}

function deleteComponentById(componentId) {
  const id = cleanText(componentId, "", 90);
  if (!id) {
    throw Object.assign(new Error("Missing componentId"), { statusCode: 400 });
  }

  const library = readComponentLibrary();
  const exists = library.components.some((component) => component.id === id);
  if (!exists) {
    throw Object.assign(new Error("Component not found"), { statusCode: 404 });
  }

  writeJsonFile(COMPONENT_LIBRARY_FILE, {
    components: library.components.filter((component) => component.id !== id),
  });

  const compositions = readJsonFile(COMPOSITION_LIBRARY_FILE, { compositions: [] });
  if (Array.isArray(compositions.compositions)) {
    const nextCompositions = compositions.compositions.map((composition) => ({
      ...composition,
      layout: Array.isArray(composition.layout)
        ? composition.layout.filter((item) => item.componentId !== id)
        : composition.layout,
      updatedAt: new Date().toISOString(),
    }));
    writeJsonFile(COMPOSITION_LIBRARY_FILE, { compositions: nextCompositions });
  }

  return { componentId: id, library: readComponentLibrary() };
}

function normalizeComposition(composition, payload = {}) {
  const source = composition && typeof composition === "object" ? composition : {};
  const components = Array.isArray(payload.components) ? payload.components : [];
  const validIds = new Set(components.map((item) => item.id));
  const now = new Date().toISOString();
  const layoutSource = Array.isArray(source.layout) ? source.layout : [];
  const layout = layoutSource
    .map((item) => ({
      componentId: cleanText(item?.componentId, "", 80),
      size: oneOfList(item?.size, COMPONENT_SIZES, "2x1"),
      zone: oneOfList(item?.zone, ["hero", "main", "rail", "full"], "main"),
      reason: cleanText(item?.reason, "用于承接当前首页目标。", 180),
    }))
    .filter((item) => item.componentId && (!validIds.size || validIds.has(item.componentId)))
    .slice(0, 12);

  return {
    id: safeId(source.id || `${source.name || "composition"}-${Date.now().toString(36)}`, "composition"),
    name: cleanText(source.name, "AI 首页积木组合", 56),
    summary: cleanText(source.summary, "AI 根据已保存组件生成的首页组合建议。", 320),
    layout,
    themeAdvice: cleanText(source.themeAdvice, "保持与当前首页蓝白金融风格一致。", 240),
    polishInstructions: cleanText(source.polishInstructions, "调整留白、权重和模块顺序，让首屏重点清晰。", 420),
    sourcePrompt: cleanText(payload.prompt, "", 500),
    createdAt: source.createdAt || now,
    updatedAt: now,
  };
}

function saveComposition(composition) {
  const data = readJsonFile(COMPOSITION_LIBRARY_FILE, { compositions: [] });
  const source = Array.isArray(data.compositions) ? data.compositions : [];
  const next = source.filter((item) => item.id !== composition.id).concat(composition).slice(-20);
  writeJsonFile(COMPOSITION_LIBRARY_FILE, { compositions: next });
  return composition;
}

function componentFamilySpec(family) {
  const specs = {
    AssetOverview: {
      purpose: "展示总资产、钱包余额、交易账号余额、信用和资金动作",
      requiredUi: ["总资产或 Balance 大数字", "Wallet/TA/Credit 指标", "Deposit/Withdraw 按钮"],
      forbidden: ["只显示模块名", "只有一个主按钮"],
    },
    WalletBalance: {
      purpose: "展示钱包总额和多币种余额",
      requiredUi: ["Wallet Balance", "USD/AUD/JPY 至少三种币种", "Deposit/Withdraw 操作"],
      forbidden: ["空白钱包占位", "只有标题和按钮"],
    },
    FundActions: {
      purpose: "资金动作入口",
      requiredUi: ["Deposit", "Withdrawal", "Internal Transfer", "Wallet Flow"],
      forbidden: ["Primary Action"],
    },
    QuickActions: {
      purpose: "用户端常用交易与资金入口",
      requiredUi: ["Deposit", "Withdrawal", "Order", "Positions", "Transfer", "Open Account"],
      forbidden: ["只放一个按钮"],
    },
    PromotionBanner: {
      purpose: "首页活动或广告轮播位",
      requiredUi: ["活动标题", "奖池/剩余时间/权益", "CTA"],
      forbidden: ["纯色空广告块"],
    },
    ReferralLink: {
      purpose: "邀请开户链接、邀请码、二维码和转化数据",
      requiredUi: ["测试开户链接", "邀请码", "Copy 按钮", "点击/开户/交易账号转化指标"],
      forbidden: ["Primary Action", "只显示 ReferralLink 字样"],
    },
    TradingAccounts: {
      purpose: "真实账号和模拟账号管理",
      requiredUi: ["Live/Demo 筛选", "账号号码", "平台/服务器", "余额", "杠杆", "详情或操作"],
      forbidden: ["单个空卡片"],
    },
    OpenAccount: {
      purpose: "开真实账号、开模拟账号、绑定账号入口",
      requiredUi: ["Live Account", "Demo Account", "Bind Account", "KYC 状态"],
      forbidden: ["单一 Primary Action"],
    },
    OnboardingProgress: {
      purpose: "新客 KYC、开户、首次入金路径",
      requiredUi: ["KYC", "Open Account", "First Deposit", "进度状态"],
      forbidden: ["没有步骤"],
    },
    UserKycRail: {
      purpose: "用户身份、KYC、当地时间和钱包摘要",
      requiredUi: ["用户名/头像", "KYC Verified", "Local time", "Wallet Balance"],
      forbidden: ["只显示用户模块名"],
    },
    AccountPerformance: {
      purpose: "账号余额、权益、信用和 PnL 表现",
      requiredUi: ["Balance", "Equity", "Credit", "PnL 折线图或面积折线图"],
      forbidden: ["无数据图形"],
    },
    WalletList: {
      purpose: "多币种钱包列表或卡片组",
      requiredUi: ["USD/AUD/JPY/USDT 钱包", "货币旁边的国家/币种圆形图标", "钱包余额"],
      forbidden: ["Primary Action", "Deposit/Withdraw/Transfer 按钮", "Available/可用余额", "TRC20 链路信息", "只有 WalletList 标题"],
    },
    CreateAccountForm: {
      purpose: "创建交易账号表单",
      requiredUi: ["交易平台", "账号类型", "币种", "杠杆", "创建按钮"],
      forbidden: ["不可识别的空表单"],
    },
    ClientHomeAtoms: {
      purpose: "从 client-home.html 拆出的真实细颗粒组件",
      requiredUi: ["明确业务标签", "至少两个真实字段或动作", "可嵌入首页卡片"],
      forbidden: ["占位按钮"],
    },
  };

  return specs[family] || specs.ClientHomeAtoms;
}

function buildComponentPrompt(payload) {
  const prompt = String(payload.prompt || "").trim();
  const family = oneOfList(payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = oneOfList(payload.size, COMPONENT_SIZES, "2x1");
  const familySpec = componentFamilySpec(family);

  const system = [
    "你是 ForexCRM 首页积木组件设计器。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "组件用于金融/交易 CRM 用户端首页，必须克制、专业、信息清晰。",
    "生成前必须先参考用户消息里的“组件库参考”：理解已保存积木的业务字段、尺寸、按钮、标签、卡片密度和视觉层级，再围绕本次需求发挥。",
    "允许创造新的结构和样式变体，但必须能追溯到现有父模块、真实业务字段、尺寸语言或组件库里的积木表达；不要凭空发明业务能力。",
    "不要逐字复制某个已保存组件，也不要只换标题或颜色；需要在布局、密度、层级或组合方式上形成新的有用变体。",
    "返回 HTML 和 CSS 片段，但不要返回 script、外链、iframe、表单提交逻辑、图片 URL 或不安全属性。",
    "HTML 根元素必须使用 class，并且 CSS 必须只作用于该 class 范围，避免污染其他页面。",
    "圆角控制在 8px 或以下，避免营销式大圆角和装饰性渐变球。",
    "组件必须能作为积木参与首页布局，明确 size、layoutHints 和 dataRequirements。",
    "组件布局必须能自适应容器宽度，避免固定大空白、空占位或依赖不可控高度撑开。",
    "禁止返回通用占位组件；不要使用 Primary Action、AI 样式、Sample、Lorem ipsum 这类无业务含义文案。",
    "按钮、字段和值必须是 ForexCRM 用户端真实业务：入金、出金、真实账号、模拟账号、绑定账号、钱包、KYC、邀请链接、交易账号、余额、权益、信用、杠杆等。",
    "name 必须是面向业务的中文组件名，不要叫 WalletList AI 样式、ReferralLink AI 样式。",
  ].join("\n");

  const user = [
    `目标模块: ${family}`,
    `推荐尺寸: ${size}`,
    "",
    "该模块必须包含的业务结构:",
    compactJson(familySpec),
    "",
    "组件库参考:",
    compactJson(componentLibraryPromptReference({ family, size, prompt, limit: 8 })),
    "",
    "需求:",
    prompt || "生成一个适合默认首页的专业金融组件。",
    "",
    "请返回字段: name, family, size, description, tags, html, css, layoutHints, dataRequirements。",
  ].join("\n");

  return { system, user };
}

function normalizeEditMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: message?.role === "user" ? "user" : "assistant",
      content: cleanText(message?.content, "", 900),
    }))
    .filter((message) => message.content)
    .slice(-10);
}

function buildComponentEditPrompt(payload, component) {
  const instruction = cleanText(payload.instruction || payload.prompt, "优化当前组件。", 900);
  const family = oneOfList(component.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const familySpec = componentFamilySpec(family);
  const rootClass = firstHtmlClass(component.html);
  const currentComponent = {
    id: component.id,
    name: component.name,
    family: component.family,
    size: component.size,
    description: component.description,
    tags: component.tags,
    html: component.html,
    css: component.css,
    layoutHints: component.layoutHints,
    dataRequirements: component.dataRequirements,
  };

  const system = [
    "你是 ForexCRM 首页积木组件编辑器。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "你的任务是对当前组件做局部编辑，并返回完整替换版组件定义。",
    "把 currentComponent 当成唯一基稿，不能从零重新设计，不能替换成无关模块。",
    "可以参考同 family 组件库积木的业务字段、尺寸和视觉语言来优化层级，但最终必须仍是 currentComponent 的局部演进。",
    rootClass ? `HTML 根 class 必须继续使用 ${rootClass}，CSS 也必须继续限定在 .${rootClass} 下。` : "HTML 根元素必须继续使用一个稳定 class，CSS 必须限定在该 class 下。",
    "默认保留当前 family 和 size；只有用户明确要求改变尺寸或归属时才调整。",
    "默认保留当前组件里没有被用户点名修改的字段、按钮、业务信息和视觉层级。",
    "如果用户说“名字/名称/标题改成 X”，必须同时更新 name 和组件里最主要的可见标题为 X。",
    "如果用户说步骤不像渐进式、流程感不够、进度不明显，必须把步骤改成带编号、状态和连接关系的 progress/timeline 结构。",
    "不要把用户指令原文、AI 修改说明、对话说明或 change note 渲染进组件 UI。",
    "不要添加 data-ai-edit-note、ai-edit-note 或类似编辑痕迹。",
    "必须保留真实 ForexCRM 业务字段和动作，禁止生成通用占位组件。",
    "返回 HTML 和 CSS 片段，但不要返回 script、外链、iframe、表单提交逻辑、图片 URL 或不安全属性。",
    "HTML 根元素必须使用 class，并且 CSS 必须只作用于该 class 范围，避免污染其他页面。",
    "圆角控制在 8px 或以下，避免营销式大圆角和装饰性渐变球。",
    "不要使用 Primary Action、AI 样式、Sample、Lorem ipsum 这类无业务含义文案。",
    "请返回字段: name, family, size, description, tags, html, css, layoutHints, dataRequirements, changeSummary。",
  ].join("\n");

  const user = [
    "当前组件:",
    compactJson(currentComponent),
    "",
    "该模块业务约束:",
    compactJson(familySpec),
    "",
    "同类组件库参考:",
    compactJson(componentLibraryPromptReference({ family, size: component.size, prompt: instruction, limit: 6 })),
    "",
    "对话记录:",
    compactJson(normalizeEditMessages(payload.messages), []),
    "",
    "最新修改要求:",
    instruction,
  ].join("\n");

  return { system, user };
}

function buildCompositionPrompt(payload) {
  const components = Array.isArray(payload.components) ? payload.components : [];
  const prompt = String(payload.prompt || "").trim();

  const system = [
    "你是 ForexCRM 首页积木编排师。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "你的任务是从已保存的组件中选择积木，生成首页组合建议，并给出美化布局的指令。",
    "必须参考可用组件的真实内容：包括 visibleText、dataRequirements、layoutHints 和 styleSignals，再发挥组合意图；不能只看组件名字拼接。",
    "不要创建不存在的 componentId。",
    "必须保证 asset_overview、quick_actions、trading_account_highlight、trading_accounts_list 或 onboarding_guide 至少有一条清晰路径。",
    "组合必须按 auto layout 思路填满可用区域，避免孤立小积木单独占整行、空白区块或东缺一块西缺一块的拼版。",
  ].join("\n");

  const user = [
    "首页目标:",
    prompt || "把已保存积木组合成一个平衡、专业、清晰的用户端首页。",
    "",
    "可用组件:",
    compactJson(
      components.map((item) => ({
        id: item.id,
        name: item.name,
        family: item.family,
        size: item.size,
        description: item.description,
        tags: item.tags,
        layoutHints: item.layoutHints,
        dataRequirements: item.dataRequirements,
        visibleText: stripHtmlTags(item.html).slice(0, 260),
        styleSignals: componentStyleSignals(item.css),
      })),
      [],
    ),
    "",
    "请返回字段: name, summary, layout[{componentId,size,zone,reason}], themeAdvice, polishInstructions。",
  ].join("\n");

  return { system, user };
}

function homepageBrickReference() {
  return canonicalHomepageReference();
}

function canonicalHomepageReference() {
  return {
    allowedBlocks: CANONICAL_HOME_BLOCKS,
    disabledByDefault: ["reward_tasks", "kyc_risk_notice", "ib_dashboard"],
    rules: [
      "首页只能由 allowedBlocks 中的内容块自由组合；AI 可以调整顺序、尺寸、样式和组合方式，但不能新增业务模块。",
      "welcome_header 可选，只用于轻量欢迎语、用户名/昵称或一句提示，不承载复杂业务数据，也不占大面积。",
      "asset_overview 可选但优先放在上半部分；只允许展示 total、wallet、tradingAccount 这 1-3 个资产字段，可选入金/出金按钮；不得新增资产字段或编造金额。",
      "quick_actions 的入口内容必须来自后台配置或接口返回；AI 只决定展示数量、布局、样式和占位，不得写死入金、出金、开户等入口一定存在。",
      "onboarding_guide 可选，仅适合未开户、未入金、未开始交易等新用户阶段；已完成主要流程时不展示或弱化。",
      "trading_account_highlight 可选，用于突出一个交易账号，可展示收益率、浮动盈亏和盈亏折线图；所有账号和图表数据必须来自接口。",
      "trading_accounts_list 用于多个交易账号，可按字段数量和账号数量选择表格、列表、卡片、卡片墙或工作台切换视图；不要默认套用同一种白色卡片。",
      "promo_banner 仅在租户配置活动时展示；不得虚构活动、奖励规则或 CTA 权益。",
      "pamm_products 仅在租户开启 PAMM 功能且接口返回产品时展示；不得虚构产品、收益率、回撤、规模、人数、风险或走势图。",
      "copytrading_signals 仅在租户开启 CopyTrading 功能且接口返回信号源时展示；不得虚构信号源、交易员、收益率、跟随人数、风险、胜率或走势图。",
      "连续时间数据必须按趋势表达：近 N 天收益、7/30/90 日收益、净值、PnL、回撤变化或收益率曲线必须使用折线图或面积折线图，不得使用柱状图、胶囊柱或装饰性条形图。",
      "copytrading_signals 的 curveCards 必须把信号源、收益率、总收益、最大回撤、收益折线/面积曲线和 AI 推荐理由按信息层级展示；不能用大面积渐变横幅或厚重 CTA 抢走图表空间。",
      "收益率、总收益、最大回撤、风险等级等指标不必逐项套边框卡片；已有图表或推荐卡承载时，优先使用简洁指标行、分隔线或低干扰内联分组。",
      "每个模块默认只保留一个主标题；模块类型标签只有在能补充语义时才展示，不要形成 eyebrow + title 的重复双标题。",
      "referral_link_card 可选，仅在用户身份为代理、IB、合作伙伴或租户开启推广链接功能时展示；只用于推广链接、邀请码、复制/分享和基础统计，不得扩展成完整代理中心。",
      "referral_link_card 不得展示返佣、团队入金、下级客户列表、层级关系或复杂 IB 数据；推广链接、邀请码和统计必须来自后台配置或接口。",
      "announcements 可选，展示系统公告、活动公告、维护通知、资金通知或平台消息；不能抢资产、交易账户和快捷操作优先级。",
      "market_news 可选，适合下半部分展示市场新闻、平台资讯、新手教程、交易教育或热门文章；不能优先于核心模块。",
      "risk_disclosure 可选，用于后台配置的风险披露、保证金提示和合规说明；必须作为页面底部 legal-strip 长文/富文本区域，不得作为普通侧栏指标卡，不得暗示稳赚或编造监管/风险状态。",
      "faq_section 可选，用于后台配置的开户、入金、下载、交易规则等常见问题；默认使用 accordion 折叠问答，不得编造政策细节。",
      "support_contact 可选，用于后台配置的在线客服、客户经理或服务时间入口；不得编造在线状态或联系方式。",
      "app_download 可选，用于后台配置的 APP、MT5 或移动端下载入口；不得编造下载链接、二维码或商店地址。",
      "reward_tasks、kyc_risk_notice、ib_dashboard 默认禁用；旧的 referralLink、userKycRail 不输出；旧 riskNotice/support_help 兼容映射到 risk_disclosure/support_contact。",
      "PAMM 和 CopyTrading 必须作为 pamm_products、copytrading_signals 两个独立模块处理。",
    ],
    bricks: [
      { id: "welcomeHeader.light", feature: "welcome_header", component: "welcome_header", family: "WelcomeHeader", size: "3x1", zone: "hero" },
      { id: "assetOverview.flexible", feature: "asset_overview", component: "asset_overview", family: "AssetOverview", size: "2x1", zone: "hero" },
      { id: "quickActions.configDriven", feature: "quick_actions", component: "quick_actions", family: "QuickActions", size: "2x1", zone: "main" },
      { id: "onboardingGuide.flexible", feature: "onboarding_guide", component: "onboarding_guide", family: "OnboardingGuide", size: "2x1", zone: "main" },
      { id: "tradingAccount.highlight", feature: "trading_account_highlight", component: "trading_account_highlight", family: "TradingAccountHighlight", size: "2x2", zone: "main" },
      { id: "tradingAccounts.list", feature: "trading_accounts_list", component: "trading_accounts_list", family: "TradingAccountsList", size: "3x2", zone: "full" },
      { id: "promoBanner.configured", feature: "promo_banner", component: "promo_banner", family: "PromotionBanner", size: "3x1", zone: "main" },
      { id: "pammProducts.recommendations", feature: "pamm_products", component: "pamm_products", family: "PammProducts", size: "2x1", zone: "main" },
      { id: "copytradingSignals.recommendations", feature: "copytrading_signals", component: "copytrading_signals", family: "CopytradingSignals", size: "2x1", zone: "main" },
      { id: "copytradingSignals.curveCards", feature: "copytrading_signals", component: "copytrading_signals", family: "CopytradingSignals", size: "2x2", zone: "hero" },
      { id: "referralLinkCard.compact", feature: "referral_link_card", component: "referral_link_card", family: "ReferralLinkCard", size: "1x1", zone: "rail" },
      { id: "announcements.feed", feature: "announcements", component: "announcements", family: "Announcements", size: "2x1", zone: "main" },
      { id: "marketNews.feed", feature: "market_news", component: "market_news", family: "MarketNews", size: "2x1", zone: "full" },
      { id: "riskDisclosure.legalStrip", feature: "risk_disclosure", component: "risk_disclosure", family: "RiskDisclosure", size: "3x1", zone: "full" },
      { id: "faqSection.topQuestions", feature: "faq_section", component: "faq_section", family: "FaqSection", size: "2x1", zone: "main" },
      { id: "supportContact.serviceCard", feature: "support_contact", component: "support_contact", family: "SupportContact", size: "1x1", zone: "rail" },
      { id: "appDownload.qrCard", feature: "app_download", component: "app_download", family: "AppDownload", size: "1x1", zone: "rail" },
    ],
  };
}

function compactGuidedChoice(choice) {
  if (!choice || typeof choice !== "object") return null;
  return {
    id: cleanText(choice.id, "", 48),
    label: cleanText(choice.label, "", 80),
    instruction: cleanText(choice.instruction, "", 240),
    canonicalTargets: Array.isArray(choice.canonicalTargets)
      ? choice.canonicalTargets.filter((item) => CANONICAL_HOME_BLOCKS.includes(item)).slice(0, 8)
      : [],
  };
}

function guidedAiIntakeFromPayload(payload) {
  const source = payload?.context?.guidedIntake || payload?.guidedIntake;
  if (!source || typeof source !== "object") return null;

  const canonical = source.canonical && typeof source.canonical === "object" ? source.canonical : {};
  const canonicalIntent = cleanText(canonical.primaryIntent || source.intent?.canonicalIntent, "", 40);
  const mustHave = Array.isArray(canonical.mustHave)
    ? canonical.mustHave.filter((item) => CANONICAL_HOME_BLOCKS.includes(item)).slice(0, 12)
    : [];

  return {
    source: cleanText(source.source, "guided-builder", 48),
    intent: compactGuidedChoice(source.intent),
    audience: Array.isArray(source.audience) ? source.audience.map(compactGuidedChoice).filter(Boolean).slice(0, 8) : [],
    level: compactGuidedChoice(source.level),
    modules: Array.isArray(source.modules) ? source.modules.map(compactGuidedChoice).filter(Boolean).slice(0, 16) : [],
    theme: compactGuidedChoice(source.theme),
    tone: compactGuidedChoice(source.tone),
    cta: compactGuidedChoice(source.cta),
    canonical: {
      primaryIntent: HOMEPAGE_INTENT_PRESETS[canonicalIntent] ? canonicalIntent : "",
      layoutPreset: cleanText(canonical.layoutPreset, "", 48),
      heroFocus: CANONICAL_HOME_BLOCKS.includes(canonical.heroFocus) ? canonical.heroFocus : "",
      mustHave,
    },
    freedomHint: cleanText(source.freedomHint, "", 300),
    note: cleanText(source.note, "", 360),
  };
}

function mergeUnique(values) {
  return [...new Set((Array.isArray(values) ? values.flat(Infinity) : [values]).filter(Boolean))];
}

function applyGuidedIntentProfile(profile, guidedIntake) {
  const canonicalIntent = guidedIntake?.canonical?.primaryIntent;
  if (!canonicalIntent || !HOMEPAGE_INTENT_PRESETS[canonicalIntent]) return profile;

  const preset = HOMEPAGE_INTENT_PRESETS[canonicalIntent];
  return {
    ...profile,
    primaryIntent: canonicalIntent,
    secondaryIntents: mergeUnique([profile.secondaryIntents || []]).filter((intent) => intent !== canonicalIntent).slice(0, 3),
    confidence: "guided",
    label: preset.label,
    layoutPreset: guidedIntake.canonical.layoutPreset || preset.layoutPreset,
    themePreset: guidedIntake.theme?.id || preset.themePreset,
    density: preset.density,
    heroFocus: guidedIntake.canonical.heroFocus || preset.heroFocus,
    primaryGoal: preset.primaryGoal,
    mustHave: mergeUnique([preset.mustHave || [], guidedIntake.canonical.mustHave || []]).filter((item) => CANONICAL_HOME_BLOCKS.includes(item)),
    avoid: mergeUnique([preset.avoid || []]),
    governance: homepageGovernanceContract(canonicalIntent),
    matchedSignals: mergeUnique(["guided-builder", guidedIntake.intent?.label, profile.matchedSignals || []]).slice(0, 12),
  };
}

function guidedIntakePromptLines(guidedIntake) {
  if (!guidedIntake) return [];
  return [
    "引导式结构化选择:",
    compactJson(guidedIntake),
    "",
    "引导式硬约束:",
    `这是管理员通过引导式表单选择的结构化输入，优先级高于自然语言拼接文案。`,
    `canonical.primaryIntent=${guidedIntake.canonical.primaryIntent || "未指定"}、layoutPreset=${guidedIntake.canonical.layoutPreset || "未指定"}、heroFocus=${guidedIntake.canonical.heroFocus || "未指定"}。`,
    `canonical.mustHave=${guidedIntake.canonical.mustHave.join(",") || "未指定"} 必须可见或由同类首页积木明确承接。`,
    "modules[].canonicalTargets 是每个表单模块映射后的首页积木；客服、FAQ、风险提示、APP 下载如被选择，必须分别用 support_contact、faq_section、risk_disclosure、app_download 可见承接。",
    "如果表单模块和首页白名单冲突，用 canonicalTargets 或最接近的 allowedBlocks 承接；不要输出 kyc_risk_notice、ib_dashboard、旧 userKycRail 等禁用块。",
    "",
  ];
}

function homepageInputMode(payload) {
  const value = cleanText(payload?.inputMode || payload?.context?.inputMode, "", 24);
  if (value === "guided" || payload?.context?.guidedIntake || payload?.guidedIntake) return "guided";
  return "quick";
}

function guidedRecordSnapshot(payload) {
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  if (!guidedIntake) return null;
  return {
    intent: cleanText(guidedIntake.intent?.label || guidedIntake.intent?.id, "", 80),
    canonicalIntent: cleanText(guidedIntake.canonical.primaryIntent, "", 40),
    heroFocus: cleanText(guidedIntake.canonical.heroFocus, "", 40),
    modules: guidedIntake.modules.map((module) => cleanText(module.label || module.id, "", 60)).filter(Boolean).slice(0, 12),
    mustHave: guidedIntake.canonical.mustHave.slice(0, 12),
  };
}

function buildMiniMaxPrompt(payload) {
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const humanUnderstanding = extractHomepageUnderstanding(prompt);
  const system = [
    "你是 ForexCRM 首页蓝图生成器。",
    "只输出一个能被 JSON.parse 解析的紧凑 JSON object。",
    "不要 markdown、不要代码块、不要解释、不要 <think>、不要注释。",
    "输出必须短，禁止返回 layout、props、schema、默认配置、HTML、CSS、JS。",
    "必须返回 generationMode=\"brick-v2\"、blueprintVersion=5、brickPlan 和 brickTrace。",
    "必须使用白名单枚举值；未知需求用最接近的白名单值承接。",
    `当前首页内容块白名单只允许: ${CANONICAL_HOME_BLOCKS.join(", ")}。`,
    "禁止输出 reward_tasks、kyc_risk_notice、ib_dashboard，也不要输出旧模块 referralLink、userKycRail、fundActions、walletList、openAccountActions、createAccountForm；旧 riskNotice/support_help 必须改用 risk_disclosure/support_contact。",
    "快捷操作区 quick_actions 的入口内容由后台配置或接口返回，AI 不得写死具体入口；moduleSettings.quickActions.actions 默认返回空数组，除非上下文提供了后台入口配置。",
    "资产概览 asset_overview 通过 moduleSettings.assets.visibleFields 控制 total、wallet、tradingAccount 中任意 1-3 个字段。",
    "PAMM 和 CopyTrading 必须分别使用 pamm_products 与 copytrading_signals，不能合并成一个投资推荐模块。",
    "连续时间数据必须按趋势表达：近 N 天收益、7/30/90 日收益、净值、PnL、回撤变化或收益率曲线必须使用折线图或面积折线图，不得使用柱状图、胶囊柱或装饰性条形图。",
    "copytrading_signals 的 curveCards 必须把信号源、收益率、总收益、最大回撤、收益折线/面积曲线和 AI 推荐理由按信息层级展示；不能用大面积渐变横幅或厚重 CTA 抢走图表空间。",
    "收益率、总收益、最大回撤、风险等级等指标不要默认逐项套边框卡片；已有图表或推荐卡承载时，用简洁指标行、分隔线或低干扰内联分组。",
    "不要输出无业务增益的英文 eyebrow，例如 AI Copytrading Match；标题能说明模块时直接展示标题。",
    "referral_link_card 只能在代理/IB/合作伙伴用户或租户开启推广链接功能时展示；它只是轻量推广链接卡，不是 ib_dashboard。",
    "referral_link_card 可以展示推广链接、邀请码、复制按钮、分享按钮和基础统计，但不得生成返佣、团队业绩、下级客户或层级关系。",
    "risk_disclosure、faq_section、support_contact、app_download 是正式可见模块；当管理员在引导中选择风险提示、FAQ、在线客服或 APP 下载时必须用这些模块承接。",
    "support_contact 不得编造在线状态或联系方式；app_download 不得编造下载链接或二维码；faq_section 和 risk_disclosure 的内容应来自后台配置或合规接口。",
    "首页必须按响应式 auto layout 思路编排：首屏、主内容、侧栏和整行模块要自然填满栅格，移动端能降级单列。",
    "禁止空 section、空 slots、禁用模块占位、孤立小积木独占大行，不能出现东缺一块西缺一块的空白区块。",
    "桌面端允许一行两个积木；同行两个积木必须配满 12 栅格并等高，禁止 8/12 内容右侧留空。",
    "必须遵守 brickReference.layoutGrammar：3x=整行、2x=主栏、1x=侧栏；只能使用 3x 独占、2x+1x、2x+2x 这些稳定组合。",
    "账号、钱包列表、表格、8 个快捷入口、首屏轮播属于高风险模块，必须按 layoutGrammar.moduleSizing 选择 size 和 zone。",
    "如果布局美观度和模块数量冲突，优先保证行配方完整、同高、少空白，再减少辅助模块。",
    "必须先遵守服务端提供的 pageIntent。",
    "如果请求包含引导式结构化选择 guidedIntake，它是管理员显式选择，优先级高于拼接后的自然语言 prompt。",
    "guidedIntake 中的 canonical.primaryIntent、heroFocus、layoutPreset、mustHave 是硬约束；modules[].canonicalTargets 是可用首页积木承接方式。",
    "pageIntent.primaryIntent 决定首页主目标。",
    "secondaryIntents 只能作为辅助模块，不能抢首屏。",
    "pageIntent.mustHave 必须尽量出现在 sections 或由同类模块承接。",
    "pageIntent.avoid 没有明确需求时不要出现。",
    "pageIntent.governance 是页面生成契约：先判断主目标、主操作、次操作、首屏槽位、弱化模块，再选择积木。",
    "所有页面都必须做 CTA 去重：主操作不要在资产卡、钱包卡、资金 Dock、快捷入口里同时放大；必要时只保留一个主 CTA 和一个轻量快捷入口。",
    "入金转化页只能通过 asset_overview 的可选按钮、promo_banner 的活动 CTA 或后台配置的 quick_actions 承接；不要新增 fundActions、walletBalance、openAccountActions 等旧模块。",
    "入金转化页必须弱化出金、复杂图表和钱包长列表；禁止把入金/出金按钮铺满半屏或写死在快捷入口中。",
    "模型返回必须包含 pageIntent；如果 pageIntent 与管理员需求有冲突，仍以服务端识别结果为准。",
    "必须先选择 designGenome 和 pageStory，再选择积木：magazineCampaign=活动专题封面，tradingCommand=交易指挥中心，onboardingJourney=新客旅程，privateWealthDesk=私行服务台，accountOpsConsole=账户运营控制台。",
    "生成模块表达时必须参考 componentLibraryReference：先吸收已保存积木的字段、尺寸、按钮、标签和卡片密度，再结合 pageIntent 发挥；不要脱离组件库语言空想新模块。",
    "componentLibraryReference 只能作为形态和灵感参考，不能授权新增 allowedBlocks 以外的业务模块，也不能把组件 HTML/CSS 直接塞进首页配置。",
    "组件形态不能都用普通卡片；必须通过 modules/moduleStyles/componentMorphs 体现至少 3 个不同模块形态。",
    "生成前必须在内部完成需求理解：区分硬性要求、设计意图、禁止项；硬性要求优先于风格偏好。",
    "数字要求必须按自然语言真实含义执行：用户说快捷入口放置 5 个、只有 5 个或保留 5 个时，quickActions.count 必须等于 5；只有出现至少/不少于时才允许超过。",
    "用户说真实账号和模拟账号一起、同一列表、统一列表时，tradingAccounts.grouping 必须是 combined；筛选只用胶囊按钮时，不得拆成两个独立账号区块。",
    "用户说不要只换颜色、不沿用上一版、耳目一新时，必须改变 sections 顺序、layoutPreset、moduleStyles 和至少 3 个模块形态。",
    "成熟券商客户端不是营销落地页：首屏要让资金安全、余额、开户或主操作清晰可信，信息密度要克制但不能空。",
    "白标、资金安全、成熟券商、可信首页默认按 brand 资金可信工作台处理，不要按 magazineCampaign 的大广告封面处理，除非管理员明确要求广告轮播首屏。",
    "brickPlan、brickTrace、brickName、brickReason 只供系统调试，不是用户端页面可见内容。",
  ].join("\n");

  const contract = {
    pageIntent: intentProfile,
    humanUnderstanding,
    brickReference: canonicalHomepageReference(),
    componentLibraryReference: componentLibraryPromptReference({ prompt, limit: 12 }),
    savedCompositionReference: savedCompositionPromptReference(6),
    requiredFields: [
      "schemaVersion",
      "blueprintVersion",
      "generationMode",
      "pageIntent",
      "designGenome",
      "pageStory",
      "name",
      "layoutPreset",
      "themePreset",
      "personalizationStrength",
      "density",
      "heroFocus",
      "brickPlan",
      "brickTrace",
      "sections",
      "modules",
      "moduleStyles",
      "componentMorphs",
      "moduleSettings",
      "emphasis",
      "aiSummary",
    ],
    enums: {
      layoutPreset: ["standardDashboard", "conversionFirst", "assetFirst", "tradingPro", "vipService", "magazineCampaign", "tradingCommand", "onboardingJourney", "privateWealthDesk", "accountOpsConsole"],
      themePreset: ["default", "blackGold", "lightGold", "blueFinance", "darkTech", "minimalWhite"],
      personalizationStrength: ["subtle", "medium", "strong"],
      density: ["compact", "balanced", "spacious"],
      heroFocus: CANONICAL_HOME_BLOCKS,
      sectionType: ["hero", "split", "full", "rail"],
      sectionSlots: CANONICAL_HOME_BLOCKS,
      moduleVariants: {
        WelcomeHeader: ["minimal", "personal", "brandLine"],
        AssetOverview: ["standard", "compactMetrics", "tickerStrip", "splitCard", "quietCard"],
        QuickActions: ["gridCards", "actionDock", "minimalIcons", "commandBar", "compactMenu"],
        OnboardingGuide: ["path", "checklist", "compact", "guideCards"],
        TradingAccountHighlight: ["proChart", "cleanSnapshot", "sparklineBoard", "splitPerformance"],
        TradingAccountsList: ["workbench", "denseCards", "calmTable", "horizontalCards", "compactList"],
        PromotionBanner: ["imageBanner", "splitVisual", "editorialCover", "compactStrip"],
        PammProducts: ["cards", "ranking", "horizontalCards", "yieldChartCards"],
        CopytradingSignals: ["signalCards", "ranking", "horizontalCards", "curveCards"],
        ReferralLinkCard: ["compactCard", "linkFirst", "statsCard"],
        Announcements: ["list", "priorityNotice", "compactFeed"],
        MarketNews: ["feed", "articleCards", "educationList"],
        RiskDisclosure: ["compactNotice", "marginGuard", "legalStrip"],
        FaqSection: ["accordion", "twoColumn", "compactList"],
        SupportContact: ["serviceCard", "managerCard", "compactBar"],
        AppDownload: ["qrCard", "storeButtons", "compactBanner"],
      },
      moduleStyles: {
        welcome_header: ["minimal", "personal", "brand-line"],
        asset_overview: ["command", "metric-strip", "quiet-card", "ticker-strip", "split-card"],
        quick_actions: ["matrix", "toolbar", "compact-grid", "command-bar", "compact-menu"],
        onboarding_guide: ["path", "checklist", "compact", "guide-cards"],
        trading_account_highlight: ["pro-chart", "clean-snapshot", "sparkline-board", "split-performance"],
        trading_accounts_list: ["workbench", "dense-cards", "calm-table", "horizontal-cards", "compact-list"],
        promo_banner: ["banner", "clean", "editorial-cover", "compact-strip"],
        pamm_products: ["cards", "ranking", "horizontal-cards", "yield-chart-cards"],
        copytrading_signals: ["signal-cards", "ranking", "horizontal-cards", "curve-cards"],
        referral_link_card: ["compact-card", "link-first", "stats-card"],
        announcements: ["list", "priority-notice", "compact-feed"],
        market_news: ["feed", "article-cards", "education-list"],
        risk_disclosure: ["compact-notice", "margin-guard", "legal-strip"],
        faq_section: ["accordion", "two-column", "compact-list"],
        support_contact: ["service-card", "manager-card", "compact-bar"],
        app_download: ["qr-card", "store-buttons", "compact-banner"],
      },
      emphasis: ["low", "medium", "high"],
    },
    rules: [
      "sections 只返回 3 到 5 个，每个为 {id,type,title,slots}，slots 只能使用 sectionSlots。",
      "sections.slots 和 brickPlan.feature/component 必须使用 allowedBlocks 的 snake_case 模块 ID，不要使用 balanceTotal、fundActions、walletList、referralLink、riskNotice 等旧槽位。",
      "quick_actions.actions 必须为空数组，除非请求上下文明确提供后台已配置入口；AI 不得根据经验补 deposit、withdraw、openAccount、support 等入口。",
      "moduleSettings.assets.visibleFields 必须是 total、wallet、tradingAccount 中的 1 到 3 个。",
      "referral_link_card 只有代理/IB/合作伙伴或推广链接功能开启时才能出现；普通客户首页不得出现。",
      "referral_link_card 可只展示推广链接和邀请码，也可展示打开数、注册数、开户数、注册转化率、开户转化率；不得展示返佣、团队层级或完整代理业绩。",
      "不要主动生成奖励任务、KYC 风控提醒或完整代理数据模块；客服、FAQ、风险提示、APP 下载必须使用 support_contact、faq_section、risk_disclosure、app_download。",
      "brickPlan 返回 4 到 8 个，字段为 {brickId,brickName,family,feature,component,size,zone,reason}，brickId 必须来自 brickReference.bricks。",
      "不要返回 layout；前端会根据 brickPlan 和 sections 自动映射到积木布局。",
      "按 auto layout 组织 sections：hero/main/rail/full 要能被 12 栅格紧凑填充，小积木必须和相关业务积木成组出现。",
      "一行两个积木时优先使用 8+4 或 6+6，同行高度必须一致；如果没有合适搭档，模块必须自动占满整行。",
      "不要把所有模块默认做成独占整栏；没有明确独占/整栏/长模块/首屏大横幅要求时，允许 AI 把两个相关模块组成一栏来优化首屏节奏。",
      "size 必须遵守布局语法：3x1/3x2 只能独占整行；2x1/2x2 是主栏；1x1/1x2 是侧栏；不要返回 8x2、6*2 或其他非白名单尺寸。",
      "禁止 2x2+1x1、3x2+任意模块、表格/list 用 1x、8 个快捷入口用 1x、广告轮播和账号列表同行。",
      "优先选择稳定行配方：2x1+1x1、2x2+1x2、2x1+2x1、3x 独占。",
      "禁止返回空 section、空 slots、不可渲染 slot 或明显会留下大面积空白的单模块区域。",
      "交易账号如需真实卡片、模拟列表，moduleSettings.tradingAccounts.grouping 必须为 separated，viewMode 为 card，realViewMode 为 card，demoViewMode 为 list，且不要出现账号 tab 切换。",
      "如果管理员要求 Demo 在 Live 上面、模拟账号在真实账号上面，moduleSettings.tradingAccounts.demoFirst 必须为 true。",
      "真实卡片+模拟列表、真实/模拟分区、任一账号列表视图时，TradingAccounts 的 brickPlan size 必须是 3x2 且 zone=full。",
      "只有纯账号卡片证明且不含模拟列表时，TradingAccounts 才允许 size=2x2 zone=main，且旁边必须配 1x2 侧栏。",
      "交易账号如需真实/模拟都用列表，moduleSettings.tradingAccounts.grouping 必须为 separated 且 viewMode/realViewMode/demoViewMode 均为 list。",
      "列表需求优先使用 tradingAccounts.viewMode=list；但如果管理员明确要求真实账号卡片，不能把真实账号渲染成列表。",
      "quickActions.count=8 时，QuickActions 必须使用 size=2x1 或 3x1，不得使用 1x1/1x2。",
      "用户要求欢迎模块、欢迎区或 welcome 时，保留轻量 welcome_header 首行；welcome 只是入口和上下文，不应替代业务 heroFocus。",
      "用户要求淡金色、浅金色、轻金色、香槟金、金色调或 gold 时，themePreset 必须使用 lightGold，并用扁平、轻量、低阴影样式表达；只有明确黑金/VIP/高净值才使用 blackGold。",
      "活动 Banner 只能使用 promo_banner；只有租户配置活动时才展示，不能用 adCarousel 或 reward_tasks 旧模块表达活动。",
      "用户只要求创建真实交易账号按钮时，不要返回 create_account_form/open_account_panel 作为独立模块；可由 onboarding_guide 或 trading_accounts_list 中的后台配置入口承接。",
      "不要绑定账号入口时，moduleSettings.openAccount.bind 必须为 false。",
      "入金/出金按钮只允许作为 asset_overview 的可选操作或后台配置的 quick_actions 入口出现；不要为了入金转化新增固定资金操作模块。",
      "入金转化或活动增长页也必须保持 quickActions.actions=[]，除非请求上下文给出后台已配置入口；AI 只设置 quick_actions 的 count、display、size、zone 和样式。",
      "不要根据 KYC 关键词生成 kyc_risk_notice 或 userKycRail；风控/风险提示用 risk_disclosure，客服用 support_contact，FAQ 用 faq_section，APP 下载用 app_download。",
      "quick_actions 不得写死 openAccount、openReal、deposit、withdraw、transfer、orders、positions、eventSignup、referral、contactService、kyc、risk 等入口；这些只能由后台配置或接口返回。",
      "IB/代理/渠道增长相关诉求不得生成 ib_dashboard；如需展示推广链接，只能使用 referral_link_card。",
      "多币种或钱包诉求默认由 asset_overview 的 visibleFields 承接；不得把 walletList/wallet_balance 作为新首页独立模块输出。",
      "资产管理首页必须使用 asset_overview、trading_account_highlight、trading_accounts_list 和可选 quick_actions/risk_disclosure 组合；不要输出旧 riskNotice、fundActions、walletList 或 referralLink。",
      "白标资金可信首页必须使用 designGenome=accountOpsConsole、layoutPreset=accountOpsConsole、themePreset=blueFinance、heroFocus=asset_overview；sections 推荐为 asset_overview+quick_actions、trading_account_highlight+trading_accounts_list，可按租户能力追加 promo_banner、announcements、market_news、risk_disclosure、support_contact、faq_section、app_download。",
      `必须按 pageIntent.primaryIntent=${intentProfile.primaryIntent} 生成首屏；pageIntent.mustHave 至少出现为可见模块或明确承接路径；pageIntent.avoid 中的模块不得出现在 sections、brickPlan 或启用的 moduleSettings 中。`,
      `secondaryIntents=${intentProfile.secondaryIntents.join(",") || "无"} 只能做辅助，不允许改变 layoutPreset=${intentProfile.layoutPreset}、heroFocus=${intentProfile.heroFocus} 或首屏主模块。`,
      "aiSummary 不超过 80 个中文字符。",
    ],
    outputShape: {
      schemaVersion: 4,
      blueprintVersion: 5,
      generationMode: "brick-v2",
      pageIntent: intentProfile,
      designGenome: "accountOpsConsole",
      pageStory: "opsClarity",
      name: "不超过28字",
      layoutPreset: "accountOpsConsole",
      themePreset: "default",
      personalizationStrength: "medium",
      density: "balanced",
      heroFocus: "asset_overview",
      brickPlan: [
        { brickId: "assetOverview.flexible", brickName: "资产概览区", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "hero", reason: "上半部分快速了解 Total、钱包或交易账号余额。" },
        { brickId: "quickActions.configDriven", brickName: "快捷操作区", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "2x1", zone: "main", reason: "入口由后台配置，AI 只控制展示方式。" },
        { brickId: "tradingAccounts.list", brickName: "交易账户列表区", family: "TradingAccountsList", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "展示多个交易账号简要信息。" },
      ],
      brickTrace: { intent: "standard", strategy: "AI 积木编排", score: 86, selectedCount: 3, source: "model" },
      sections: [{ id: "overview", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] }],
      modules: {
        AssetOverview: { variant: "standard" },
        QuickActions: { variant: "gridCards" },
        PromotionBanner: { variant: "imageBanner" },
        ReferralLinkCard: { variant: "compactCard" },
        RiskDisclosure: { variant: "compactNotice" },
        FaqSection: { variant: "accordion" },
        SupportContact: { variant: "serviceCard" },
        AppDownload: { variant: "qrCard" },
      },
      moduleStyles: {
        asset_overview: "command",
        quick_actions: "matrix",
        promo_banner: "clean",
        trading_account_highlight: "sparkline-board",
        trading_accounts_list: "workbench",
        referral_link_card: "compact-card",
        risk_disclosure: "compact-notice",
        faq_section: "accordion",
        support_contact: "service-card",
        app_download: "qr-card",
      },
      moduleSettings: {
        adCarousel: { enabled: false },
        quickActions: { enabled: true, count: 4, display: "iconText", actions: [] },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: { enabled: true, visibleFields: ["total", "wallet", "tradingAccount"], showFundActions: false, showAvailable: false, showMargin: false, showRiskLevel: false, wallets: [] },
        referral: { enabled: false },
        referralLinkCard: { enabled: false, showPromoLink: true, showInviteCode: true, showShare: false, showStats: false },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "switchable", realViewMode: "card", demoViewMode: "list", demoFirst: false },
        openAccount: { enabled: false, real: true, demo: true, bind: false, placement: "insideTradingAccounts" },
        userKycRail: { kycStatus: "verified" },
        riskNotice: { enabled: false },
        riskDisclosure: { enabled: false },
        faq: { enabled: false },
        supportContact: { enabled: false },
        appDownload: { enabled: false },
        pamm: { enabled: false },
        copytrading: { enabled: false },
        announcements: { enabled: false },
        marketNews: { enabled: false },
      },
      emphasis: { deposit: "high", openAccount: "medium", promo: "medium", accounts: "medium" },
      aiSummary: "一句话说明方案",
    },
  };

  const user = [
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
    "",
    ...guidedIntakePromptLines(guidedIntake),
    "服务端意图识别 pageIntent:",
    compactJson(intentProfile),
    "",
    "强制规则:",
    `优先遵守 pageIntent.primaryIntent=${intentProfile.primaryIntent}。`,
    `secondaryIntents=${intentProfile.secondaryIntents.join(",") || "无"} 只能做辅助，不允许抢首屏或改变 heroFocus=${intentProfile.heroFocus}。`,
    `mustHave=${intentProfile.mustHave.join(",")} 必须可见或被明确业务路径承接；avoid=${intentProfile.avoid.join(",") || "无"} 禁止出现在启用模块、sections 或 brickPlan。`,
    "",
    "管理员需求:",
    prompt || "生成一个适合默认客户的平衡首页。",
    "",
    "输出契约:",
    compactJson(contract),
    "",
    "现在只返回最终 JSON object。",
  ].join("\n");

  return { system, user };
}

function buildPrompt(payload, config = {}) {
  if (config.provider === "minimax" || config.apiMode === "openai-chat") return buildMiniMaxPrompt(payload);

  const context = payload.context || {};
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const now = new Date().toISOString();
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);

  const system = [
    "你是 ForexCRM 的首页蓝图生成器。",
    "你的任务是把管理员的中文需求转换成安全的首页配置 JSON。",
    "只能返回一个 JSON object，不要 markdown，不要解释，不要生成 HTML/CSS/JS。",
    `配置只能围绕这些首页内容块: ${CANONICAL_HOME_BLOCKS.join(", ")}。`,
    "不要输出奖励/任务区、KYC 风控提醒区或完整代理数据区；客服、FAQ、风险提示、APP 下载要用 support_contact、faq_section、risk_disclosure、app_download，旧 riskNotice/support_help 仅作兼容输入。",
    "快捷操作区 quick_actions 只负责占位、渲染和适配后台返回入口；不要写死具体快捷功能，也不要假设入金、出金、开户一定存在。",
    "资产概览区 asset_overview 可展示 total、wallet、tradingAccount 中任意 1-3 个字段，可选展示入金/出金按钮，但不得新增资产字段或编造资金数据。",
    "PAMM 产品推荐区 pamm_products 与 CopyTrading 信号源推荐区 copytrading_signals 必须独立处理，且只在租户开启对应能力时展示。",
    "连续时间数据必须按趋势表达：近 N 天收益、7/30/90 日收益、净值、PnL、回撤变化或收益率曲线必须使用折线图或面积折线图，不得使用柱状图、胶囊柱或装饰性条形图。",
    "copytrading_signals 的 curve-cards 必须把信号源、收益率、总收益、最大回撤、收益折线/面积曲线和 AI 推荐理由按信息层级展示；不能用大面积渐变横幅或厚重 CTA 抢走图表空间。",
    "收益率、总收益、最大回撤、风险等级等指标不要默认逐项套边框卡片；已有图表或推荐卡承载时，用简洁指标行、分隔线或低干扰内联分组。",
    "不要输出无业务增益的英文 eyebrow，例如 AI Copytrading Match；标题能说明模块时直接展示标题。",
    "推广链接卡片 referral_link_card 仅代理、IB、合作伙伴或租户开启推广链接功能时展示；它只展示推广链接、邀请码、复制/分享和基础统计，不得变成完整代理中心。",
    "risk_disclosure、faq_section、support_contact、app_download 是正式可见模块；当管理员在引导中选择风险提示、FAQ、在线客服或 APP 下载时必须用这些模块承接。",
    "support_contact 不得编造在线状态或联系方式；app_download 不得编造下载链接或二维码；faq_section 和 risk_disclosure 的内容应来自后台配置或合规接口。",
    "必须参考首页积木编排规则，把需求映射到 brickPlan、sections、layout、moduleStyles 和 moduleSettings。",
    "必须返回 generationMode=\"brick-v2\"、blueprintVersion=5、brickPlan 和 brickTrace。",
    "首页布局必须自适应 auto layout：桌面按 12 栅格紧凑填充，移动端降级单列；不要依赖空白占位、固定大高度或孤立小模块撑出空区块。",
    "桌面端允许一行两个积木，推荐 8+4 或 6+6；同一行的两个积木必须等高，不能留下 8/12 内容旁边空 4/12 的区域。",
    "不要默认让所有模块独占一栏；除非管理员明确要求独占、整栏、长模块、首屏大横幅，或模块本身是大型列表/表格，否则应允许两个相关模块组成一栏。",
    "必须遵守首页布局语法：3x1/3x2 是 12 栅格整行，2x1/2x2 是 8 栅格主栏，1x1/1x2 是 4 栅格侧栏；不要发明 8x2、6*2 等非白名单尺寸。",
    "只使用稳定行配方：3x 独占整行、2x1+1x1、2x2+1x2、2x1+2x1；禁止 2x2+1x1、3x2+任何同行模块。",
    "列表/表格/钱包列表/账号双列表不能使用 1x；8 个快捷入口不能使用 1x；广告轮播和交易账号列表不能同行。",
    "如果布局美观度和模块数量冲突，优先保证同一行完整、等高、少空白，再减少辅助模块。",
    "必须先遵守服务端提供的 pageIntent。",
    "如果请求包含引导式结构化选择 guidedIntake，它是管理员显式选择，优先级高于拼接后的自然语言 prompt。",
    "guidedIntake 中的 canonical.primaryIntent、heroFocus、layoutPreset、mustHave 是硬约束；modules[].canonicalTargets 是可用首页积木承接方式。",
    "pageIntent.primaryIntent 决定首页主目标。",
    "secondaryIntents 只能作为辅助模块，不能抢首屏。",
    "pageIntent.mustHave 必须尽量出现在 sections 或由同类模块承接。",
    "pageIntent.avoid 没有明确需求时不要出现。",
    "pageIntent.governance 是页面生成契约：先判断主目标、主操作、次操作、首屏槽位、弱化模块，再选择积木。",
    "所有页面都必须做 CTA 去重：主操作不要在资产卡、钱包卡、资金 Dock、快捷入口里同时放大；必要时只保留一个主 CTA 和一个轻量快捷入口。",
    "入金转化页只能通过 asset_overview 的可选按钮、promo_banner 的活动 CTA 或后台配置的 quick_actions 承接；不要新增 walletBalance、fundActions、openAccountActions 等旧模块。",
    "入金转化页必须弱化出金、复杂图表和钱包长列表；禁止把入金/出金按钮铺满半屏或写死在快捷入口中。",
    "模型返回必须包含 pageIntent；如果 pageIntent 与管理员需求有冲突，仍以服务端识别结果为准。",
    "必须先选择 designGenome 和 pageStory，再选择积木：magazineCampaign=活动专题封面，tradingCommand=交易指挥中心，onboardingJourney=新客旅程，privateWealthDesk=私行服务台，accountOpsConsole=账户运营控制台。",
    "生成模块表达时必须参考已保存组件库积木：先吸收其字段、尺寸、按钮、标签、卡片密度和视觉层级，再结合管理员意图做新组合或新变体。",
    "组件库只是形态和灵感参考，不能授权新增首页白名单以外的业务模块，也不能把组件 HTML/CSS 直接作为首页输出。",
    "组件形态不能都用普通卡片；必须通过 modules/moduleStyles/componentMorphs 体现至少 3 个不同模块形态。",
    "sections、layout 和 brickPlan 只能包含可渲染且启用的业务模块；禁止空 section、空 slots、东缺一块西缺一块的断裂拼版。",
    "brickPlan、brickTrace、brickName、brickReason 只用于系统调试和数据属性，不能作为用户端可见 UI 文案。",
    "如果管理员要求真实账号用卡片、模拟账号用列表，必须设置 moduleSettings.tradingAccounts.grouping = \"separated\"、viewMode = \"card\"、realViewMode = \"card\"、demoViewMode = \"list\"，前端会渲染成两个独立账号模块且不显示 tab。",
    "真实账号卡片+模拟账号列表、真实/模拟分区、任一账号列表视图时，TradingAccounts 的 brickPlan size 必须是 3x2 且 zone=full；只有纯 combined card 账号证明才允许 size=2x2 zone=main。",
    "如果管理员要求交易账号分成两个列表、真实和模拟都列表、Live/Demo 都列表，必须设置 moduleSettings.tradingAccounts.grouping = \"separated\" 且 viewMode/realViewMode/demoViewMode 都为 \"list\"。",
    "如果管理员要求模拟账号列表在真实账号列表上面，必须在 aiSummary 或 layout reason 中保留 Demo 在上、Live 在下的排序意图，前端会按该顺序渲染。",
    "如果管理员要求 Demo 在 Live 上面、模拟账号在真实账号上面，必须设置 moduleSettings.tradingAccounts.demoFirst = true。",
    "如果管理员要求列表形式、建议用列表、真实账号列表、模拟账号列表、不是卡片，必须返回交易账号列表主视图；但管理员明确要求真实账号卡片时，以真实账号卡片优先。",
    "如果管理员要求 8 个快捷入口或两行四个，quickActions.count 必须是 8，QuickActions 的 brickPlan size 必须是 2x1 或 3x1，不能使用 1x。",
    "如果管理员给出快捷入口名称，也不要把名称写死进 moduleSettings.quickActions.actions；只设置 quick_actions 的展示数量、样式和占位，入口内容由后台配置或接口返回。",
    "如果管理员要求活动增长、交易大赛、奖池，并明确说明租户已配置活动，必须使用 promo_banner 作为活动模块；如果有 welcome_header，promo_banner 可紧跟在 welcome_header 后面。",
    "如果管理员要求欢迎模块、欢迎区或 welcome，保留轻量 welcome_header 首行；welcome 只提供用户上下文和个性化入口，不改变业务 heroFocus。",
    "如果管理员要求淡金色、浅金色、轻金色、香槟金、金色调或 gold，themePreset 必须使用 lightGold，并通过 density/moduleStyles 做扁平、轻量、低阴影表达；只有明确黑金/VIP/高净值才使用 blackGold。",
    "如果管理员要求欢迎模块独占第一栏，layout 中必须包含 welcome_header 作为第一个 12 栅格轻量整行；它不能改变 heroFocus，heroFocus 仍应指向广告轮播等业务核心。",
    "如果管理员要求活动增长、交易大赛、奖池，并明确要求活动首屏、独占整栏、单独长模块或首屏大横幅，必须把 promo_banner 放在 welcome_header 之后的第一个业务 full-width hero 模块，heroFocus 使用 promo_banner。",
    "如果管理员只要求创建真实交易账号按钮，不要返回 create_account_form 或 open_account_panel 独立模块；可由 onboarding_guide 或 trading_accounts_list 中的后台入口承接。",
    "推广链接、开户链接、邀请码可以在代理/IB/合作伙伴场景用 referral_link_card 轻量展示；代理返佣、团队业绩和 KYC 风控提醒默认禁用，不要输出 referralLink/referral_link、ib_dashboard、userKycRail 或旧 riskNotice/support_help。",
    "如果管理员要求钱包列表小卡片，仍应由 asset_overview 承接为钱包余额字段或卡片样式，不要输出 walletList/wallet_list 独立模块。",
    "如果管理员要求多币种钱包，只允许在 asset_overview 中展示 wallet 字段或后台返回的钱包摘要；不要新增风险等级、保证金占用、可用资金等未允许资产字段。",
    "资产管理、总资产、钱包余额、账户表现图表需求必须按 accountOpsConsole + blueFinance 处理，推荐 sections 为 asset_overview+quick_actions、trading_account_highlight、trading_accounts_list；没有明确活动/资讯能力时不要返回 promo_banner、announcements、market_news。",
    "KYC 状态、KYC 侧栏或认证状态不属于当前首页内容块；默认不要输出相关 moduleSettings 或模块。",
    "如果管理员要求不要绑定账号入口，必须设置 moduleSettings.openAccount.bind = false。",
    "优先使用传入 schema、默认配置、模块变体和模块样式中的白名单值。",
    "返回字段建议包括 schemaVersion、blueprintVersion、generationMode、pageIntent、designGenome、pageStory、name、layoutPreset、themePreset、density、heroFocus、sections、layout、modules、moduleStyles、componentMorphs、moduleSettings、brickPlan、brickTrace、emphasis、aiSummary。",
    "sections.slots、layout.component、brickPlan.feature 和 brickPlan.component 应优先使用 snake_case 首页内容块 ID。",
  ].join("\n");

  const user = [
    `当前时间: ${now}`,
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
    "",
    ...guidedIntakePromptLines(guidedIntake),
    "服务端意图识别 pageIntent:",
    compactJson(intentProfile),
    "",
    "强制规则:",
    `优先遵守 pageIntent.primaryIntent=${intentProfile.primaryIntent}。`,
    `secondaryIntents=${intentProfile.secondaryIntents.join(",") || "无"} 只能作为辅助，不允许抢首屏或改变 heroFocus=${intentProfile.heroFocus}。`,
    `mustHave=${intentProfile.mustHave.join(",")} 必须可见或被明确业务路径承接；avoid=${intentProfile.avoid.join(",") || "无"} 禁止出现在启用模块、sections 或 brickPlan。`,
    "",
    "管理员需求:",
    prompt || "生成一个适合默认客户的平衡首页。",
    "",
    "默认首页配置:",
    compactJson(context.defaultConfig),
    "",
    "JSON Schema:",
    compactJson(context.schema),
    "",
    "可用功能和标签:",
    compactJson({
      brickReference: canonicalHomepageReference(),
      bricks: context.bricks,
      features: context.features,
      moduleVariantOptions: context.moduleVariantOptions,
      moduleStyleOptions: context.moduleStyleOptions,
      componentLibraryReference: componentLibraryPromptReference({ prompt, limit: 12 }),
      savedCompositionReference: savedCompositionPromptReference(6),
    }),
    "",
    "当前草稿配置:",
    compactJson(context.currentConfig),
    "",
    "请只返回首页配置 JSON。",
  ].join("\n");

  return { system, user };
}

function buildOpenAiResponsesBody(config, promptParts, schema, schemaName = "ai_output") {
  const body = {
    model: config.model,
    instructions: promptParts.system,
    input: promptParts.user,
    temperature: config.temperature,
    max_output_tokens: config.maxOutputTokens,
  };

  if (schema && typeof schema === "object") {
    const name = String(schemaName || "ai_output")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || "ai_output";
    body.text = {
      format: {
        type: "json_schema",
        name,
        schema,
        strict: false,
      },
    };
  }

  return body;
}

function buildAnthropicBody(config, promptParts) {
  return {
    model: config.model,
    max_tokens: config.maxOutputTokens,
    temperature: config.temperature,
    system: promptParts.system,
    messages: [{ role: "user", content: promptParts.user }],
  };
}

function buildOpenAiChatBody(config, promptParts) {
  const body = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxOutputTokens,
    messages: [
      { role: "system", content: promptParts.system },
      { role: "user", content: promptParts.user },
    ],
  };

  if (config.provider === "minimax") {
    delete body.max_tokens;
    body.max_completion_tokens = Math.min(config.maxOutputTokens, MINIMAX_MAX_COMPLETION_TOKENS);
    body.reasoning_split = true;
  } else if (config.provider === "deepseek") {
    body.thinking = { type: "disabled" };
    if (config.responseFormat !== "text") {
      body.response_format = { type: "json_object" };
    }
  } else if (config.responseFormat !== "text") {
    body.response_format = { type: "json_object" };
  }

  return body;
}

function buildProviderRequest(config, apiKey, promptParts, schema, schemaName) {
  const headers = { authorization: `Bearer ${apiKey}` };
  let body;

  if (config.apiMode === "responses") {
    body = buildOpenAiResponsesBody(config, promptParts, schema, schemaName);
  } else if (config.apiMode === "anthropic-messages") {
    body = buildAnthropicBody(config, promptParts);
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    delete headers.authorization;
  } else {
    body = buildOpenAiChatBody(config, promptParts);
  }

  return { headers, body };
}

function responseContentText(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => (typeof item === "string" ? item : item?.text || item?.content || ""))
    .filter(Boolean)
    .join("\n");
}

function extractTextFromAiResponse(data, apiMode) {
  if (!data || typeof data !== "object") return "";
  if (typeof data.output_text === "string") return data.output_text;

  if (apiMode === "anthropic-messages" && Array.isArray(data.content)) {
    return data.content
      .map((item) => responseContentText(item.text || item.content || item))
      .filter(Boolean)
      .join("\n");
  }

  if (Array.isArray(data.choices)) {
    return data.choices
      .map((choice) => responseContentText(choice.message?.content) || responseContentText(choice.text))
      .filter(Boolean)
      .join("\n");
  }

  if (Array.isArray(data.output)) {
    return data.output
      .flatMap((item) => item.content || [])
      .map((content) => content.text || content.output_text || "")
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractProviderFinishReason(data) {
  if (!data || typeof data !== "object") return "";
  if (Array.isArray(data.choices)) {
    return data.choices.map((choice) => choice.finish_reason || choice.finishReason || "").filter(Boolean).join(", ");
  }
  if (typeof data.stop_reason === "string") return data.stop_reason;
  if (Array.isArray(data.output)) {
    return data.output.map((item) => item.status || item.finish_reason || "").filter(Boolean).join(", ");
  }
  return "";
}

function stripReasoningText(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

function extractJsonObject(text) {
  const source = stripReasoningText(text);
  const candidates = [];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  candidates.push(source);

  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(source.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (error) {
      // Try the next candidate.
    }
  }

  throw Object.assign(new Error("AI response did not contain a valid JSON object"), { statusCode: 502 });
}

function providerErrorDetails(config, target, extra = {}) {
  return {
    provider: config.provider,
    providerName: config.name,
    model: config.model,
    apiMode: config.apiMode,
    baseUrl: config.baseUrl,
    endpoint: config.endpoint,
    url: target ? `${target.origin}${target.pathname}` : "",
    ...extra,
  };
}

function enrichProviderError(error, config, target, extra = {}) {
  const providerStatus = error.providerStatus ? ` HTTP ${error.providerStatus}` : "";
  const message = `${config.name} 调用失败${providerStatus}：${error.message || "unknown error"}`;
  const enriched = Object.assign(new Error(message), error, {
    message,
    statusCode: error.statusCode || 502,
    details: providerErrorDetails(config, target, {
      providerStatus: error.providerStatus || null,
      providerCode: error.providerCode || null,
      ...extra,
    }),
  });
  return enriched;
}

function dominantPromptText(prompt) {
  const source = String(prompt || "").trim();
  const matches = [...source.matchAll(/(?:生成方向|独立生成目标|当前目标|目标场景|首页目标|管理员需求)\s*[:：]\s*([^。；;\n]+)/g)];
  if (matches.length) return matches[matches.length - 1][1];
  return source;
}

function normalizeKeywordText(text) {
  return String(text || "").toLowerCase();
}

function promptSignalLabel(signal) {
  if (signal instanceof RegExp) return signal.source;
  return String(signal || "");
}

function promptSignalWeight(signal) {
  if (signal instanceof RegExp) return 14;
  const value = String(signal || "");
  return Math.max(2, Math.min(12, value.length));
}

function promptSignalMatches(text, signal) {
  if (signal instanceof RegExp) {
    signal.lastIndex = 0;
    return signal.test(text);
  }
  const needle = String(signal || "").toLowerCase();
  return Boolean(needle && text.includes(needle));
}

function scorePromptIntent(text, positive = [], negative = []) {
  const matchedSignals = [];
  let score = 0;

  positive.forEach((signal) => {
    if (!promptSignalMatches(text, signal)) return;
    matchedSignals.push(promptSignalLabel(signal));
    score += promptSignalWeight(signal);
  });

  negative.forEach((signal) => {
    if (promptSignalMatches(text, signal)) score -= promptSignalWeight(signal);
  });

  return {
    score: Math.max(0, score),
    matchedSignals: [...new Set(matchedSignals)].slice(0, 12),
  };
}

function homepageGovernanceContract(intent) {
  return HOMEPAGE_GOVERNANCE_CONTRACTS[intent] || HOMEPAGE_GOVERNANCE_CONTRACTS.standard;
}

function buildHomepageIntentProfile(prompt) {
  const source = dominantPromptText(prompt);
  const text = normalizeKeywordText(source);
  const ranked = Object.keys(HOMEPAGE_INTENT_PRESETS)
    .map((intent) => {
      const signals = HOMEPAGE_INTENT_SIGNALS[intent] || {};
      return {
        intent,
        ...scorePromptIntent(text, signals.positive, signals.negative),
      };
    })
    .sort((a, b) => b.score - a.score);

  const humanUnderstanding = extractHomepageUnderstanding(source);
  const fallback = !ranked.length || ranked[0].score <= 0;
  let primaryIntent = fallback ? "standard" : ranked[0].intent;
  if (humanUnderstanding.wantsTradingCostWorkbench) {
    primaryIntent = "trader";
  }
  if (
    humanUnderstanding.wantsMatureBrokerTrust &&
    primaryIntent !== "deposit" &&
    !textHasAny(text, ["新手", "新客", "刚注册", "未完成实名", "未实名", "kyc"])
  ) {
    primaryIntent = "brand";
  }
  const topScore = fallback ? 0 : ranked[0].score;
  const secondaryIntents = ranked
    .filter((item) => item.intent !== primaryIntent && item.score > 0)
    .slice(0, 3)
    .map((item) => item.intent);
  const preset = HOMEPAGE_INTENT_PRESETS[primaryIntent] || HOMEPAGE_INTENT_PRESETS.standard;
  const confidence = fallback ? "fallback" : Math.max(0.45, Math.min(0.96, Number((0.52 + Number(topScore || 0) / 80).toFixed(2))));

  return {
    primaryIntent,
    secondaryIntents,
    confidence,
    score: topScore,
    label: preset.label,
    layoutPreset: preset.layoutPreset,
    themePreset: preset.themePreset,
    density: preset.density,
    heroFocus: preset.heroFocus,
    primaryGoal: preset.primaryGoal,
    mustHave: [...new Set(preset.mustHave || [])],
    avoid: [...new Set(preset.avoid || [])],
    governance: homepageGovernanceContract(primaryIntent),
    matchedSignals: fallback ? [] : ranked[0].matchedSignals,
  };
}

function homepageIntentFromPrompt(prompt) {
  return buildHomepageIntentProfile(prompt).primaryIntent;
}

function homepageDesignForIntent(intent) {
  return {
    growth: { designGenome: "magazineCampaign", pageStory: "campaignLaunch", layoutPreset: "magazineCampaign" },
    partner: { designGenome: "magazineCampaign", pageStory: "campaignLaunch", layoutPreset: "magazineCampaign" },
    brand: { designGenome: "accountOpsConsole", pageStory: "opsClarity", layoutPreset: "accountOpsConsole" },
    trader: { designGenome: "tradingCommand", pageStory: "tradingEfficiency", layoutPreset: "tradingCommand" },
    insight: { designGenome: "tradingCommand", pageStory: "tradingEfficiency", layoutPreset: "tradingCommand" },
    risk: { designGenome: "tradingCommand", pageStory: "tradingEfficiency", layoutPreset: "tradingCommand" },
    onboarding: { designGenome: "onboardingJourney", pageStory: "accountActivation", layoutPreset: "onboardingJourney" },
    copytrading: { designGenome: "onboardingJourney", pageStory: "accountActivation", layoutPreset: "onboardingJourney" },
    deposit: { designGenome: "depositLadder", pageStory: "depositConversion", layoutPreset: "conversionFirst" },
    retention: { designGenome: "onboardingJourney", pageStory: "accountActivation", layoutPreset: "onboardingJourney" },
    vip: { designGenome: "privateWealthDesk", pageStory: "wealthService", layoutPreset: "privateWealthDesk" },
    asset: { designGenome: "accountOpsConsole", pageStory: "opsClarity", layoutPreset: "accountOpsConsole" },
    mobile: { designGenome: "accountOpsConsole", pageStory: "opsClarity", layoutPreset: "accountOpsConsole" },
    standard: { designGenome: "accountOpsConsole", pageStory: "opsClarity", layoutPreset: "accountOpsConsole" },
  }[intent] || { designGenome: "accountOpsConsole", pageStory: "opsClarity", layoutPreset: "accountOpsConsole" };
}

function mockSectionsForIntent(intent, plan, wantsWelcome = false, wantsWalletList = false) {
  const slots = new Set(plan.map((item) => item.feature).filter(Boolean));
  const has = (feature) => slots.has(feature);

  const sectionMap = {
    vip: [
      { id: "vip-hero", type: "hero", title: "VIP 资产", slots: ["balanceTotal", "fundActions"] },
      { id: "vip-service", type: "split", title: "权益与服务", slots: ["adCarousel", "walletBalance", "openAccountActions"] },
      { id: "vip-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    trader: [
      { id: "trader-tools", type: "hero", title: "交易工具", slots: ["quickActions"] },
      { id: "trader-performance", type: "split", title: "表现与状态", slots: ["accountPerformance", "userKycRail", "balanceTotal"] },
      { id: "trader-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    insight: [
      { id: "insight-hero", type: "hero", title: "账户表现", slots: ["accountPerformance", "marketInsight"] },
      { id: "insight-health", type: "split", title: "健康检查", slots: ["balanceTotal", "risk_disclosure", "fundActions"] },
      { id: "insight-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    deposit: [
      { id: "deposit-hero", type: "hero", title: "入金奖励", slots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"] },
      { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quickActions"] },
      { id: "deposit-accounts", type: "full", title: "账号与趋势", slots: ["accountPerformance", "tradingAccounts"] },
    ],
    risk: [
      { id: "risk-hero", type: "hero", title: "风险状态", slots: ["accountPerformance", "risk_disclosure"] },
      { id: "risk-context", type: "split", title: "账户上下文", slots: ["marketInsight", "balanceTotal", "userKycRail"] },
      { id: "risk-accounts", type: "full", title: "账号排查", slots: ["tradingAccounts"] },
    ],
    onboarding: [
      { id: "onboarding-hero", type: "hero", title: "开户路径", slots: ["onboardingProgress", "openAccountActions"] },
      { id: "onboarding-next", type: "split", title: "下一步", slots: ["createAccountForm", "fundActions", "quickActions"] },
      { id: "onboarding-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    copytrading: [
      { id: "copytrading-hero", type: "hero", title: "跟单推荐", slots: ["copytrading_signals", "onboardingProgress"] },
      { id: "copytrading-actions", type: "split", title: "下一步", slots: ["quickActions", "balanceTotal"] },
      { id: "copytrading-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    growth: [
      ...(wantsWelcome ? [{ id: "growth-welcome", type: "hero", title: "欢迎", slots: ["balanceTotal"] }] : []),
      { id: "growth-hero", type: "hero", title: "活动首屏", slots: ["adCarousel"] },
      { id: "growth-actions", type: "split", title: "转化路径", slots: ["quickActions", "promoHighlight", "fundActions"] },
      ...(wantsWalletList ? [{ id: "growth-wallets", type: "full", title: "钱包列表", slots: ["walletList"] }] : []),
      { id: "growth-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    partner: [
      { id: "partner-referral", type: "rail", title: "推广链接", slots: ["referral_link_card"] },
      { id: "partner-tools", type: "split", title: "渠道工具", slots: ["quickActions", "promoHighlight"] },
      { id: "partner-accounts", type: "full", title: "转化账号", slots: ["tradingAccounts"] },
    ],
    retention: [
      { id: "retention-hero", type: "hero", title: "账户唤醒", slots: ["balanceTotal", "fundActions"] },
      { id: "retention-tasks", type: "split", title: "回流任务", slots: ["quickActions", "promoHighlight", "marketInsight"] },
      { id: "retention-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    mobile: [
      { id: "mobile-hero", type: "hero", title: "移动首屏", slots: ["balanceTotal", "fundActions"] },
      { id: "mobile-actions", type: "full", title: "快捷操作", slots: ["quickActions", "walletBalance"] },
      { id: "mobile-accounts", type: "full", title: "账号卡片", slots: ["tradingAccounts"] },
    ],
    brand: [
      { id: "brand-trust-hero", type: "hero", title: "资金安全", slots: ["balanceTotal", "openAccountActions"] },
      { id: "brand-wallets", type: "full", title: "钱包列表", slots: ["walletList"] },
      { id: "brand-conversion", type: "split", title: "快捷入口与活动", slots: ["quickActions", "promoHighlight"] },
      { id: "brand-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    standard: [
      { id: "standard-hero", type: "hero", title: "工作台", slots: ["balanceTotal", "fundActions"] },
      { id: "standard-actions", type: "split", title: "常用操作", slots: ["quickActions"] },
      { id: "standard-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
  };

  return (sectionMap[intent] || sectionMap.standard)
    .map((section) => ({
      ...section,
      slots: section.slots.filter(has),
    }))
    .filter((section) => section.slots.length);
}

function mockHomepageConfig(payload, providerConfig) {
  const rawPrompt = String(payload.prompt || "");
  const text = rawPrompt.toLowerCase() + rawPrompt;
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(rawPrompt), guidedIntake);
  const intent = intentProfile.primaryIntent;
  const isVip = intent === "vip";
  const isGrowth = intent === "growth";
  const isAsset = intent === "asset";
  const isTrader = intent === "trader";
  const isPartner = intent === "partner";
  const isOnboarding = intent === "onboarding";
  const wantsClear = /轻快|清晰|清爽|明亮|浅色|轻量/.test(text);
  const wantsGold = /淡金|浅金|轻金|香槟金|金色|金色调|gold/.test(text);
  const wantsWalletList = /钱包列表|多币种钱包/.test(text);
  const wantsSeparatedAccounts = /真实账号|模拟账号|两个列表|分开|live|demo/.test(text);
  const wantsAccountList = /交易账号列表|交易账户列表|账号列表|账户列表|account list/.test(text);
  const wantsWelcome = /欢迎|welcome/.test(text);
  const wantsRealAccountCards = /真实(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片|卡片[\s\S]{0,32}真实(?:交易)?账(?:号|户)/.test(String(payload.prompt || ""));
  const wantsDemoAccountCards = /模拟(?:交易)?账(?:号|户)[\s\S]{0,32}卡片|卡片[\s\S]{0,32}模拟(?:交易)?账(?:号|户)|demo[\s\S]{0,32}card/i.test(String(payload.prompt || ""));
  const wantsDemoAccountList = /模拟(?:交易)?账(?:号|户)[\s\S]{0,32}列表|demo\s*(account\s*)?list/i.test(String(payload.prompt || ""));
  const wantsMixedAccountPresentation = wantsRealAccountCards && wantsDemoAccountList && !wantsDemoAccountCards;
  const design = homepageDesignForIntent(intent);
	  const brickPlans = {
    vip: [
      { brickId: "assetOverview.wealthPlate", brickName: "私行资产服务牌", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "2x2", zone: "hero", reason: "高净值首页先建立资金实力和私行服务感。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "资金动作作为 VIP 服务入口。" },
      { brickId: "adCarousel.heroCampaign", brickName: "首屏广告轮播", family: "PromotionBanner", feature: "adCarousel", component: "ad_carousel", size: "3x1", zone: "full", reason: "权益和活动作为高净值服务内容。" },
      { brickId: "walletBalance.currencyRail", brickName: "钱包币种侧栏", family: "WalletBalance", feature: "walletBalance", component: "wallet_balance", size: "1x1", zone: "rail", reason: "多币种钱包作为资产侧栏。" },
      { brickId: "openAccount.sidePanel", brickName: "右侧开户操作台", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "VIP 客户开户动作保持可达。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号资产完整下置。" },
    ],
	    asset: [
    { brickId: "assetOverview.tickerStrip", brickName: "资产 Ticker 指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏用横向指标带呈现总资产、可用资金、保证金和风险等级。" },
    { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "入金和出金作为资产管理高频动作。" },
    { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用磁贴组展示，和普通表格明显区分。" },
    { brickId: "accountPerformance.proChart", brickName: "账号表现图表", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "main", reason: "账户表现图表需要主栏宽度承载趋势信息。" },
    { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "1x2", zone: "rail", reason: "把保证金、杠杆和风险提示放到侧栏提醒。" },
    { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "交易账号列表作为下方管理区完整承接。" },
    ],
    trader: [
      { brickId: "quickActions.commandBar", brickName: "交易命令栏", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "3x1", zone: "hero", reason: "专业交易首页先给订单、持仓和 MT5 高频入口。" },
      { brickId: "accountPerformance.sparklineBoard", brickName: "Sparkline 指挥看板", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "main", reason: "权益和 PnL 曲线作为交易判断依据。" },
      { brickId: "userKycRail.profileWallet", brickName: "用户/KYC 钱包侧栏", family: "UserKycRail", feature: "userKycRail", component: "user_kyc_rail", size: "1x2", zone: "rail", reason: "右侧保留状态和钱包摘要。" },
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "full", reason: "资产指标压缩成横条，避免抢交易账号区域。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号列表完整展示。" },
    ],
    insight: [
      { brickId: "accountPerformance.sparklineBoard", brickName: "Sparkline 指挥看板", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "hero", reason: "数据洞察首页先看账户表现和 PnL。" },
      { brickId: "marketInsight.healthPanel", brickName: "账户健康洞察", family: "MarketInsight", feature: "marketInsight", component: "market_insight", size: "1x2", zone: "rail", reason: "右侧放账户健康、资金流和市场状态。" },
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "full", reason: "总资产作为辅助指标条。" },
      { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "1x2", zone: "rail", reason: "风险和保证金作为洞察结论。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "下一步建议可直接入金或出金。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号列表承接分析下钻。" },
    ],
    deposit: [
      { brickId: "promoBanner.depositLadder", brickName: "入金奖励阶梯", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x2", zone: "hero", reason: "首屏左侧突出 $500/$2,000/$10,000 三档奖励和最高赠金 $300。" },
      { brickId: "walletBalance.currencyRail", brickName: "钱包币种侧栏", family: "WalletBalance", feature: "walletBalance", component: "wallet_balance", size: "1x1", zone: "rail", reason: "右侧给出钱包余额，解释当前入金上下文。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "主入金动作只在首屏操作区放大一次。" },
      { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开真实账号作为入金前置动作，而不是散落在页面各处。" },
      { brickId: "quickActions.taskRail", brickName: "快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口紧跟首屏，承接转账、订单、持仓和客服，不重复主入金按钮。" },
      { brickId: "accountPerformance.proChart", brickName: "账号轻趋势", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "main", reason: "账号区保留轻量趋势，复杂图表下移并降噪。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "full", reason: "账号信息作为整栏证明区承接，不抢首屏入金主线。" },
    ],
    risk: [
      { brickId: "accountPerformance.sparklineBoard", brickName: "Sparkline 指挥看板", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "hero", reason: "风险首页先展示权益和 PnL 波动。" },
      { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "1x2", zone: "rail", reason: "保证金和风险提示需要首屏提醒。" },
      { brickId: "marketInsight.healthPanel", brickName: "账户健康洞察", family: "MarketInsight", feature: "marketInsight", component: "market_insight", size: "1x2", zone: "rail", reason: "补充市场和账户健康指标。" },
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "full", reason: "资产指标保留但降权。" },
      { brickId: "userKycRail.profileWallet", brickName: "用户/KYC 钱包侧栏", family: "UserKycRail", feature: "userKycRail", component: "user_kyc_rail", size: "1x2", zone: "rail", reason: "客户状态用于客服跟进。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "风险排查需要账号列表。" },
    ],
    onboarding: [
      { brickId: "onboardingProgress.timeline", brickName: "新客旅程时间线", family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_progress", size: "2x1", zone: "hero", reason: "新客首页先告诉客户下一步。" },
      { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "真实、模拟和绑定账号集中处理。" },
      { brickId: "createAccountForm.realAccount", brickName: "真实账户创建表单", family: "CreateAccountForm", feature: "createAccountForm", component: "create_account_form", size: "1x2", zone: "rail", reason: "直接创建真实账号。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "main", reason: "首次入金动作靠前。" },
      { brickId: "quickActions.taskRail", brickName: "下一步任务按钮组", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "高频动作转成下一步任务。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号列表放下方承接开户结果。" },
    ],
    copytrading: [
      { brickId: "copytradingSignals.curveCards", brickName: "AI 跟单信号源推荐", family: "CopytradingSignals", feature: "copytrading_signals", component: "copytrading_signals", size: "2x2", zone: "hero", reason: "跟单推荐进入首屏，必须展示信号源、收益率、总收益和曲线。" },
      { brickId: "onboardingProgress.timeline", brickName: "新客旅程时间线", family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_progress", size: "2x1", zone: "main", reason: "新用户仍需要看到开户进度和下一步。" },
      { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "高频入口以任务按钮组承接，不留空占位。" },
      { brickId: "assetOverview.compactMetrics", brickName: "轻量资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "main", reason: "资产降级为辅助指标，不抢跟单推荐。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实与模拟账号卡片", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号都用卡片，分区展示形成明显区分。" },
    ],
    growth: [
      { brickId: "adCarousel.editorialCover", brickName: "专题封面轮播", family: "PromotionBanner", feature: "adCarousel", component: "ad_carousel", size: "3x1", zone: "hero", reason: "活动增长首页把交易大赛和奖池作为专题封面。" },
      { brickId: "quickActions.priorityMatrix", brickName: "转化快捷矩阵", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "保留 8 个快捷入口承接参与、入金和账号操作。" },
      { brickId: "promoBanner.scoreboard", brickName: "赛事活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "把奖池、倒计时和活动 CTA 从轮播里拆成独立活动看板。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "活动转化承接入金。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "main", reason: "账号作为活动参与证明。" },
    ],
    partner: [
      { brickId: "referralLinkCard.compact", brickName: "推广链接卡片", family: "ReferralLinkCard", feature: "referral_link_card", component: "referral_link_card", size: "1x1", zone: "rail", reason: "IB 首页仅轻量展示推广链接、邀请码和可选基础统计。" },
      { brickId: "quickActions.priorityMatrix", brickName: "转化快捷矩阵", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "渠道经理高频操作集中。" },
      { brickId: "promoBanner.scoreboard", brickName: "赛事活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "渠道活动数据独立看板。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "main", reason: "账号转化简洁展示。" },
    ],
    retention: [
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "留存首页先唤起账户状态。" },
      { brickId: "quickActions.taskRail", brickName: "下一步任务按钮组", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "重新开始交易任务靠前。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "快捷入金降低回流门槛。" },
      { brickId: "promoBanner.scoreboard", brickName: "温和召回看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "权益提醒温和承接。" },
      { brickId: "marketInsight.healthPanel", brickName: "账户健康洞察", family: "MarketInsight", feature: "marketInsight", component: "market_insight", size: "1x2", zone: "rail", reason: "告诉客户账户状态和下一步。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "main", reason: "账号信息压缩展示。" },
    ],
    mobile: [
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "移动端首屏先用低高度资产条。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "入金出金按钮靠前。" },
      { brickId: "quickActions.actionDock", brickName: "交易操作 Dock", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "3x1", zone: "full", reason: "移动端使用短工具条。" },
      { brickId: "walletBalance.currencyRail", brickName: "钱包币种侧栏", family: "WalletBalance", feature: "walletBalance", component: "wallet_balance", size: "1x1", zone: "rail", reason: "钱包摘要轻量展示。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "main", reason: "账号列表压缩为卡片。" },
    ],
    brand: [
      { brickId: "assetOverview.tickerStrip", brickName: "资金安全指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏先呈现总余额、可用资金、保证金和风险等级。" },
      { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开户作为主转化，但不做营销页式大横幅。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用卡片列表展示，形成资金余额主体。" },
      { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口严格按需求数量呈现，作为轻量工具区。" },
      { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "主推活动降为业务推动卡，不抢资金安全首屏。" },
      { brickId: "tradingAccounts.separatedList", brickName: "合并账号工作台", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实和模拟账号在同一列表，用胶囊筛选区分。" },
    ],
  };

  const plan = brickPlans[intent] || [
    { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "标准工作台保留资产摘要。" },
    { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "资金操作始终可达。" },
    { brickId: "quickActions.actionDock", brickName: "交易操作 Dock", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "3x1", zone: "main", reason: "常用操作集中呈现。" },
    { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号列表完整承接。" },
  ];
  const meta = {
    asset: ["AI 资产运营控制台", design.layoutPreset, "blueFinance", "balanced", "asset_summary", "资产管理首页：总资产、多币种钱包、表现图表和账号列表完整铺满。"],
    trader: ["AI 交易指挥中心", design.layoutPreset, "darkTech", "compact", "account_list", "专业交易首页：交易工具、账号表现和双列表优先。"],
    insight: ["AI 数据指挥中心", design.layoutPreset, "blueFinance", "compact", "account_performance", "数据洞察首页：账户表现、PnL、资金流和风险提示形成每日检查流。"],
    deposit: ["AI 入金奖励阶梯首页", design.layoutPreset, "blueFinance", "balanced", "promo_banner", "入金转化首页：奖励阶梯、钱包余额、唯一主入金入口和开真实账号靠前。"],
    risk: ["AI 风险指挥中心", design.layoutPreset, "blueFinance", "compact", "risk_disclosure", "风险提醒首页：保证金、权益波动、账户健康和账号列表形成风控视图。"],
    onboarding: ["AI 新客旅程首页", design.layoutPreset, "blueFinance", "compact", "onboarding_progress", "新客开户首页：KYC、开户、首次入金和创建账号路径靠前。"],
    copytrading: ["AI 跟单推荐驾驶舱", design.layoutPreset, "blueFinance", "balanced", "copytrading_signals", "跟单推荐首页：信号源、收益率、总收益和收益曲线进入首屏。"],
    growth: ["AI 活动专题封面", design.layoutPreset, wantsClear ? "blueFinance" : wantsGold ? "lightGold" : "darkTech", "balanced", "ad_carousel", "活动增长首页：广告轮播、快捷矩阵和赛事看板承接转化。"],
    partner: ["AI 代理推广链接首页", design.layoutPreset, "blueFinance", "balanced", "referral_link_card", "IB 代理首页：轻量推广链接、邀请码、基础统计和交易账号组合。"],
    retention: ["AI 留存旅程首页", design.layoutPreset, "minimalWhite", "balanced", "quick_actions", "留存唤醒首页：账户状态、召回任务、快捷入金和温和权益提示。"],
    mobile: ["AI 轻量运营台", design.layoutPreset, "blueFinance", "compact", "asset_summary", "移动优先首页：单列、轻量、短入口和紧凑账号卡片。"],
    brand: ["AI 白标资金可信首页", design.layoutPreset, "blueFinance", "balanced", "asset_summary", "白标资金可信首页：资金安全、余额、钱包、主推活动、开户转化和账号工作台靠前。"],
    vip: ["AI 私行服务台", design.layoutPreset, "blackGold", "spacious", "asset_summary", "高净值首页：资产 Hero、资金 Dock 和权益曝光形成服务感。"],
    standard: ["AI 账户运营台", design.layoutPreset, "default", "balanced", "asset_summary", "平衡工作台：首页业务路径完整但不过度偏向单一场景。"],
  }[intent] || ["AI 账户运营台", "accountOpsConsole", "default", "balanced", "asset_summary", "平衡工作台：首页业务路径完整但不过度偏向单一场景。"];

  return {
    schemaVersion: 4,
    blueprintVersion: 5,
    generationMode: "brick-v2",
    pageIntent: intentProfile,
    designGenome: design.designGenome,
    pageStory: design.pageStory,
    name: meta[0],
    layoutPreset: meta[1],
    themePreset: wantsGold && !["growth", "vip"].includes(intent) ? "lightGold" : meta[2],
    density: meta[3],
    personalizationStrength: isVip || isGrowth || intent === "brand" || intent === "copytrading" ? "strong" : "medium",
    heroFocus: meta[4],
    brickPlan: plan,
    brickTrace: { intent, strategy: meta[0].replace(/^AI\s*/, ""), score: 90, selectedCount: plan.length, source: "mock" },
    sections: isAsset
      ? [
          { id: "asset-overview", type: "hero", title: "资产总览", slots: ["balanceTotal", "fundActions"] },
          { id: "asset-wallets", type: "full", title: "多币种钱包", slots: ["walletList"] },
          { id: "asset-performance", type: "split", title: "账户表现", slots: ["accountPerformance", "risk_disclosure"] },
          { id: "asset-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
        ]
      : mockSectionsForIntent(intent, plan, wantsWelcome, wantsWalletList),
    modules: {
      AssetOverview: { variant: isVip ? "wealthPlate" : isTrader ? "darkTerminal" : isAsset || intent === "brand" ? "tickerStrip" : "standard" },
      WalletBalance: { variant: isVip ? "premiumCard" : "splitCurrency" },
      QuickActions: { variant: intent === "deposit" || intent === "brand" ? "taskRail" : design.designGenome === "tradingCommand" ? "commandBar" : design.designGenome === "onboardingJourney" ? "taskRail" : isGrowth || intent === "retention" ? "priorityButtons" : "actionDock" },
      PromotionBanner: { variant: intent === "deposit" ? "depositLadder" : design.designGenome === "magazineCampaign" ? "editorialCover" : isVip ? "blackGoldVip" : isGrowth || isPartner ? "gradientHero" : "splitVisual" },
      AccountPerformance: { variant: intent === "deposit" ? "cleanSnapshot" : design.designGenome === "tradingCommand" ? "sparklineBoard" : intent === "insight" ? "cleanSnapshot" : "proChart" },
      WalletList: { variant: design.designGenome === "accountOpsConsole" ? "walletTiles" : "currencyTable" },
      TradingAccounts: { variant: intent === "deposit" ? "accountWall" : design.designGenome === "magazineCampaign" ? "accountWall" : design.designGenome === "tradingCommand" || intent === "brand" ? "opsTable" : isAsset || isTrader ? "separatedList" : "denseCards" },
      OpenAccount: { variant: intent === "deposit" || intent === "brand" || design.designGenome === "onboardingJourney" ? "conversionPanel" : "sidePanel" },
      OnboardingProgress: { variant: design.designGenome === "onboardingJourney" ? "journeyTimeline" : "checklist" },
      CopytradingSignals: { variant: "curveCards" },
      ReferralLinkCard: { variant: intent === "partner" ? "compactCard" : "compactCard" },
    },
    moduleStyles: {
      balanceTotal: isVip ? "wealth-plate" : design.designGenome === "tradingCommand" ? "ticker-strip" : isAsset || intent === "brand" ? "ticker-strip" : "command",
      fundActions: "split-buttons",
      openAccountActions: intent === "deposit" || intent === "brand" || design.designGenome === "onboardingJourney" ? "conversion-panel" : "horizontal",
      onboardingProgress: design.designGenome === "onboardingJourney" ? "journey-timeline" : isGrowth ? "checklist" : "path",
      promoHighlight: intent === "deposit" ? "deposit-ladder" : isGrowth ? "scoreboard" : "clean",
      adCarousel: design.designGenome === "magazineCampaign" ? "editorial-cover" : wantsGold ? "clean" : isVip || isGrowth ? "immersive" : "clean",
      quickActions: intent === "deposit" || intent === "brand" ? "task-rail" : design.designGenome === "tradingCommand" ? "command-bar" : design.designGenome === "onboardingJourney" ? "task-rail" : isTrader ? "toolbar" : "compact-grid",
      referral_link_card: intent === "partner" ? "compact-card" : "compact-card",
      copytrading_signals: "curve-cards",
      tradingAccounts: intent === "deposit" ? "account-wall" : design.designGenome === "magazineCampaign" ? "account-wall" : design.designGenome === "tradingCommand" || isAsset || intent === "brand" ? "ops-table" : "dense-cards",
      accountPerformance: design.designGenome === "tradingCommand" ? "sparkline-board" : "pro-chart",
      walletList: design.designGenome === "accountOpsConsole" ? "wallet-tiles" : "currency-table",
    },
    componentMorphs: {
      AssetOverview: { variant: isVip ? "wealthPlate" : isAsset || intent === "brand" ? "tickerStrip" : isTrader ? "darkTerminal" : "standard" },
      QuickActions: { variant: design.designGenome === "tradingCommand" ? "commandBar" : design.designGenome === "onboardingJourney" || intent === "brand" ? "taskRail" : "priorityButtons" },
      PromotionBanner: { variant: intent === "deposit" ? "depositLadder" : design.designGenome === "magazineCampaign" ? "editorialCover" : "splitVisual" },
      TradingAccounts: { variant: design.designGenome === "tradingCommand" || intent === "brand" ? "opsTable" : design.designGenome === "magazineCampaign" ? "accountWall" : "separatedList" },
    },
    moduleSettings: {
      adCarousel: { enabled: ["growth", "partner", "vip", "deposit", "retention"].includes(intent) },
      quickActions: {
        enabled: !isAsset && intent !== "risk",
        count: intent === "deposit" ? 4 : intent === "brand" ? 5 : isTrader || intent === "mobile" ? 6 : 8,
        display: isTrader || intent === "mobile" ? "iconOnly" : "iconText",
        actions: intent === "deposit"
          ? ["transfer", "orders", "positions", "contactService"]
          : intent === "brand"
          ? ["openReal", "deposit", "transfer", "orders", "contactService"]
          : isGrowth
          ? ["eventSignup", "deposit", "contest", "contactService"]
          : isTrader
          ? ["switchAccount", "positions", "orders", "downloadMt5", "risk", "deposit"]
          : [],
      },
      wallet: { enabled: intent === "deposit" ? true : !(isGrowth && wantsGold), placement: intent === "deposit" ? "standalone" : isGrowth && !wantsWalletList ? "mergedWithAssets" : "standalone", showFundActions: false },
      assets: { enabled: intent === "deposit" ? false : !(isGrowth && wantsGold), showFundActions: intent === "deposit" ? true : !(isGrowth && wantsGold) && intent !== "brand", showAvailable: isAsset || intent === "brand", showMargin: isAsset || intent === "brand", showRiskLevel: isAsset || intent === "brand", wallets: isAsset || intent === "brand" ? ["USD", "EUR", "USDT"] : [] },
      referral: { enabled: false, showClicks: false, showRegistrations: false, showTradingAccounts: false, showPromoLink: false, showInviteCode: false, showQrCode: false },
      referralLinkCard: {
        enabled: isPartner,
        showPromoLink: true,
        showInviteCode: true,
        showShare: false,
        showStats: /打开数|注册数|开户数|注册转化率|开户转化率|转化率|推广效果|基础统计|统计数据/.test(text),
        showOpens: true,
        showRegistrations: true,
        showAccounts: true,
        showRegistrationRate: true,
        showAccountRate: true,
      },
      pamm: { enabled: false },
      copytrading: { enabled: intent === "copytrading" },
      tradingAccounts: {
        enabled: true,
        realEnabled: true,
        demoEnabled: intent === "deposit" ? false : true,
        grouping: intent === "brand" ? "combined" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList || wantsMixedAccountPresentation ? "separated" : "combined",
        viewMode: intent === "brand" ? "list" : intent === "deposit" || wantsRealAccountCards || wantsDemoAccountCards || wantsMixedAccountPresentation ? "card" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList ? "list" : "switchable",
        realViewMode: intent === "brand" ? "list" : wantsRealAccountCards || wantsMixedAccountPresentation ? "card" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList ? "list" : "card",
        demoViewMode: intent === "brand" ? "list" : wantsDemoAccountCards ? "card" : wantsMixedAccountPresentation ? "list" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList ? "list" : "card",
        demoFirst: /模拟账号.*(?:真实账号|live)|demo.*live|demo\s*在\s*live|模拟.*上面/i.test(String(payload.prompt || "")),
      },
      openAccount: { enabled: true, real: true, demo: intent === "deposit" ? false : true, bind: intent === "deposit" || intent === "brand" ? false : true, placement: isOnboarding || intent === "deposit" || intent === "brand" || isPartner ? "standalone" : "insideTradingAccounts" },
      riskNotice: { enabled: false },
      riskDisclosure: { enabled: isAsset || intent === "risk" || intent === "insight" },
    },
    emphasis: {
      deposit: intent === "deposit" || isGrowth || isVip || isAsset ? "high" : "medium",
      openAccount: intent === "deposit" || isGrowth || intent === "brand" ? "high" : "medium",
      promo: intent === "deposit" || isGrowth || intent === "brand" ? "high" : "low",
      accounts: isTrader || isAsset ? "high" : "medium",
    },
    aiSummary: `已通过 ${providerConfig.name} / ${providerConfig.model} 生成${meta[5]}`,
  };
}

function textHasAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function hashServerText(value) {
  return String(value || "")
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const HOMEPAGE_MODULE_SETTING_DEFAULTS = {
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
    showClicks: false,
    showRegistrations: false,
    showTradingAccounts: false,
    showPromoLink: false,
    showInviteCode: false,
    showQrCode: false,
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
  riskDisclosure: { enabled: false },
  faq: { enabled: false },
  supportContact: { enabled: false },
  appDownload: { enabled: false },
  accountPerformance: {},
  marketInsight: {},
  onboardingProgress: {},
  createAccountForm: {},
};

function ensureHomepageModuleSettings(settings) {
  const next = ensureObject(settings);
  Object.keys(HOMEPAGE_MODULE_SETTING_DEFAULTS).forEach((group) => {
    next[group] = {
      ...clonePlain(HOMEPAGE_MODULE_SETTING_DEFAULTS[group]),
      ...ensureObject(next[group]),
    };
  });
  return next;
}

function numberFromHomepagePromptToken(value) {
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

function extractNearbyHomepageCount(source, keywordPattern, unitPattern, min = 1, max = 12) {
  const text = String(source || "");
  const pattern = new RegExp(`${keywordPattern}[\\s\\S]{0,40}?([3-9三四五六七八九])\\s*${unitPattern}`, "i");
  const match = text.match(pattern);
  if (!match) return null;
  const count = numberFromHomepagePromptToken(match[1]);
  return Number.isFinite(count) ? Math.max(min, Math.min(max, count)) : null;
}

function wantsTradingCostWorkbenchPrompt(prompt) {
  const source = dominantPromptText(prompt);
  const text = `${String(source || "").toLowerCase()} ${String(source || "")}`;
  const hasCostSignal = textHasAny(text, ["交易成本", "执行效率", "点差", "佣金", "eurusd", "spread", "commission"]);
  const hasTraderSignal = textHasAny(text, ["专业交易", "交易工作台", "mt5", "持仓", "pnl", "保证金占用"]);
  return hasCostSignal && hasTraderSignal;
}

function wantsServerTradingAccountCards(prompt) {
  const source = String(prompt || "");
  return /真实(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片|模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片|交易账(?:号|户)[\s\S]{0,24}卡片|card/i.test(source);
}

function wantsServerTradingAccountList(prompt) {
  const source = String(prompt || "");
  return /交易账(?:号|户)[\s\S]{0,24}(?:列表|表格)|账(?:号|户)[\s\S]{0,12}(?:列表|表格)|列表形式|表格形式|不是卡片|非卡片|live\s*(account\s*)?list|demo\s*(account\s*)?list/i.test(source);
}

function wantsServerTradingAccountVariety(prompt) {
  const source = String(prompt || "");
  return /交易账(?:号|户)[\s\S]{0,40}(?:灵活|变化|智能|多版式|多种样式|不固定|不要总是卡片)|(?:卡片|card)[\s\S]{0,16}(?:列表|表格|list|table)|(?:列表|表格|list|table)[\s\S]{0,16}(?:卡片|card)/i.test(source);
}

function applyServerTradingAccountPresentationVariety(config, prompt) {
  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  if (!settings.tradingAccounts?.enabled) return;

  const wantsVariety = wantsServerTradingAccountVariety(prompt);
  if (!wantsVariety && extractHomepageUnderstanding(prompt).wantsTradingCostWorkbench) return;
  if (!wantsVariety && settings.tradingAccounts.grouping === "separated" && settings.tradingAccounts.viewMode === "list") return;
  if (wantsServerTradingAccountCards(prompt) && !wantsVariety) return;

  if (wantsServerTradingAccountList(prompt) && !wantsVariety) {
    settings.tradingAccounts = {
      ...settings.tradingAccounts,
      enabled: true,
      realEnabled: true,
      demoEnabled: true,
      grouping: "separated",
      viewMode: "list",
      realViewMode: "list",
      demoViewMode: "list",
    };
    config.modules = { ...ensureObject(config.modules), TradingAccounts: { variant: "separatedList" } };
    config.moduleStyles = { ...ensureObject(config.moduleStyles), tradingAccounts: "calm-table" };
    config.moduleSettings = settings;
    return;
  }

  const options = [
    ["opsTable", "ops-table", { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
    ["separatedList", "calm-table", { grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
    ["workbench", "workbench", { grouping: "combined", viewMode: "switchable", realViewMode: "card", demoViewMode: "list" }],
    ["accountWall", "account-wall", { grouping: "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" }],
  ];
  const [variant, style, accountSettings] = options[hashServerText(`${prompt}:${config.designGenome}:${config.pageStory}:${config.layoutPreset}`) % options.length];
  settings.tradingAccounts = { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true, ...accountSettings };
  config.modules = { ...ensureObject(config.modules), TradingAccounts: { variant } };
  config.moduleStyles = { ...ensureObject(config.moduleStyles), tradingAccounts: style };
  config.moduleSettings = settings;
}

function extractHomepageUnderstanding(prompt) {
  const source = String(prompt || "");
  const text = source.toLowerCase() + source;
  const quickActionCount = extractNearbyHomepageCount(source, "快捷(?:入口|操作|矩阵)", "个", 3, 8);
  const quickContextMatch = source.match(/快捷(?:入口|操作|矩阵)[\s\S]{0,48}?(?:[3-8三四五六七八]\s*个)/i);
  const quickContext = quickContextMatch?.[0] || "";
  const quickActionExact =
    quickActionCount !== null &&
    !/(至少|不少于|不低于|最少|起步|以上|超过|大于)/.test(quickContext);
  const visibleMetricCount = extractNearbyHomepageCount(source, "可见(?:数值|数字|指标)|(?:保留|展示|至少)", "(?:个)?\\s*可见(?:数值|数字|指标)", 1, 9);
  const wantsCombinedAccountFilter =
    (/(?:真实(?:交易)?账(?:号|户)[、,，\/和与\s]+模拟(?:交易)?账(?:号|户)[\s\S]{0,24}(?:一起|同一|统一|一个|合并))/.test(source) ||
      /(真实|live)[\s\S]{0,16}(模拟|demo)[\s\S]{0,24}(一起|同一|统一|一个|合并)/i.test(source)) &&
    textHasAny(text, ["胶囊", "筛选", "快速筛选", "按钮"]);
  const wantsMatureBrokerTrust = textHasAny(text, ["成熟券商", "资金安全", "品牌可信", "白标", "可信", "信任"]);
  const wantsLightBlue = textHasAny(text, ["淡蓝", "浅蓝", "蓝色金融", "light blue"]);
  const wantsFreshLayout = textHasAny(text, ["不沿用上一版", "不要沿用上一版", "布局骨架", "耳目一新", "不要只换颜色", "不能只是换颜色"]);
  const wantsCopyTrading = textHasAny(text, ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐"]);
  const wantsPamm = textHasAny(text, ["pamm", "资管产品", "pamm产品", "资金管理产品"]);
  const wantsNewUserJourney = textHasAny(text, ["新手", "新客", "新用户", "刚注册", "开户", "开户注册", "注册", "首次"]);
  const wantsDemoAccountCard = /模拟(?:交易)?账(?:号|户)[\s\S]{0,16}卡片|demo[\s\S]{0,16}card/i.test(source);
  const wantsDemoAccountList = /模拟(?:交易)?账(?:号|户)[\s\S]{0,16}列表|demo[\s\S]{0,16}list/i.test(source);
  const recommendationMatch = source.match(/推荐编号\s*([a-z0-9_-]+)/i);
  const wantsTradingCostWorkbench = wantsTradingCostWorkbenchPrompt(source);

  return {
    quickActionCount,
    quickActionExact,
    visibleMetricCount,
    wantsCombinedAccountFilter,
    wantsMatureBrokerTrust,
    wantsLightBlue,
    wantsFreshLayout,
    wantsCopyTrading,
    wantsPamm,
    wantsNewUserJourney,
    wantsDemoAccountCard,
    wantsDemoAccountList,
    wantsTradingCostWorkbench,
    recommendationId: recommendationMatch?.[1] || "",
  };
}

function completeHomepageQuickActions(actions, count, preferred = []) {
  const defaults = ["openReal", "deposit", "transfer", "orders", "contactService", "positions", "risk", "downloadMt5"];
  const seen = new Set();
  return preferred
    .concat(Array.isArray(actions) ? actions.map(homepageQuickActionId).filter(Boolean) : [], defaults)
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, Math.max(3, Math.min(8, Number(count) || 8)));
}

function ensureHomepageSectionContains(config, sectionSeed, slot) {
  if (!slot) return;
  config.sections = Array.isArray(config.sections) ? config.sections : [];
  if (config.sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot))) return;
  const existing = config.sections.find((section) => section.id === sectionSeed.id);
  if (existing) {
    existing.slots = [...new Set([...(Array.isArray(existing.slots) ? existing.slots : []), slot])];
    return;
  }
  config.sections.push({
    id: sectionSeed.id,
    type: sectionSeed.type || "split",
    title: sectionSeed.title || slot,
    slots: [slot],
  });
}

function sanitizeHomepageAllowedBlocks(config, prompt = "") {
  const next = ensureObject(config);
  const settings = ensureHomepageModuleSettings(next.moduleSettings);
  const text = `${String(prompt || "").toLowerCase()} ${String(prompt || "")}`;
  const wantsPamm = /pamm/i.test(text);
  const wantsCopyTrading = /copy\s*trading|copytrading|跟单|信号源/i.test(text);
  const wantsReferralCard = /代理用户|代理首页|\bib\b|合作伙伴|partner|affiliate|推广链接|推广功能|推广开户链接|邀请链接|邀请码|开户链接|注册链接|referral/i.test(text);
  const wantsReferralStats = /打开数|注册数|开户数|注册转化率|开户转化率|转化率|推广效果|基础统计|统计数据/.test(text);
  const wantsReferralCoreOnly = /(只|仅|只展示|仅展示).{0,16}(推广链接|邀请链接).{0,16}(邀请码)|不展示.{0,8}(统计|打开数|注册数|开户数|转化率)/.test(text);
  const wantsAnnouncements = /公告|通知|维护|平台消息/.test(text);
  const wantsMarketNews = /市场资讯|市场新闻|平台资讯|新手教程|交易教育|热门文章/.test(text);
  const rejectsRiskDisclosure = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:风险提示|风险披露|合规|保证金|杠杆|预警)/i.test(text);
  const rejectsFaq = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:faq|常见问题|问题解答|帮助中心)/i.test(text);
  const rejectsSupportContact = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:在线客服|客服|客户经理|咨询|服务入口)/i.test(text);
  const rejectsAppDownload = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:app|下载|移动端|手机端|mt5)/i.test(text);
  const wantsRiskDisclosure = !rejectsRiskDisclosure && /风险提示|风险披露|合规声明|合规说明|保证金|杠杆|爆仓|预警/.test(text);
  const wantsFaq = !rejectsFaq && /faq|常见问题|问题解答|帮助中心/.test(text);
  const wantsSupportContact = !rejectsSupportContact && /在线客服|联系客服|客服|客户经理|一对一协助|咨询入口|服务入口/.test(text);
  const wantsAppDownload = !rejectsAppDownload && /app下载|app 下载|下载 app|下载APP|移动端|手机端|mt5 下载|下载 mt5|download app/i.test(text);
  const requestedAssetFields = [];
  if (/total|总余额|总资产|总览/.test(text)) requestedAssetFields.push("total");
  if (/钱包/.test(text)) requestedAssetFields.push("wallet");
  if (/交易账(?:号|户).{0,8}余额|交易账号|交易账户/.test(text)) requestedAssetFields.push("tradingAccount");
  const exactAssetFields = /(只|仅|只展示|仅展示|只保留|不要展示|不展示)/.test(text) && requestedAssetFields.length;

  const normalizeSlots = (slots) => {
    const seen = new Set();
    return (Array.isArray(slots) ? slots : [])
      .map((slot) => canonicalHomeBlock(slot))
      .filter((slot) => slot !== "referral_link_card" || wantsReferralCard)
      .filter((slot) => slot && !seen.has(slot) && (seen.add(slot), true));
  };

  next.sections = (Array.isArray(next.sections) ? next.sections : [])
    .map((section, index) => ({
      ...ensureObject(section),
      id: cleanText(section?.id, `section-${index + 1}`, 32),
      type: ["hero", "split", "full", "rail"].includes(section?.type) ? section.type : "full",
      title: cleanText(section?.title, "", 28),
      slots: normalizeSlots(section?.slots),
    }))
    .filter((section) => section.slots.length);

  if (!next.sections.length) {
    next.sections = [
      { id: "overview", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] },
      { id: "accounts", type: "full", title: "交易账户", slots: ["trading_account_highlight", "trading_accounts_list"] },
    ];
  }

  [
    wantsPamm && ["pamm", "split", "PAMM", "pamm_products"],
    wantsCopyTrading && ["copytrading", "split", "CopyTrading", "copytrading_signals"],
    wantsReferralCard && ["referral-link", "rail", "推广链接", "referral_link_card"],
    wantsAnnouncements && ["announcements", "full", "公告通知", "announcements"],
    wantsMarketNews && ["market-news", "full", "市场资讯", "market_news"],
    wantsRiskDisclosure && ["risk-disclosure", "rail", "风险提示", "risk_disclosure"],
    wantsFaq && ["faq", "split", "FAQ", "faq_section"],
    wantsSupportContact && ["support-contact", "rail", "在线客服", "support_contact"],
    wantsAppDownload && ["app-download", "rail", "APP 下载", "app_download"],
  ]
    .filter(Boolean)
    .forEach(([id, type, title, slot]) => ensureHomepageSectionContains(next, { id, type, title }, slot));

  next.layout = (Array.isArray(next.layout) ? next.layout : [])
    .map((block, index) => {
      const component = canonicalHomeBlock(block?.component);
      if (!component) return null;
      if (component === "referral_link_card" && !wantsReferralCard) return null;
      return {
        ...block,
        id: cleanText(block?.id, `${component}-${index + 1}`, 32),
        component,
        slot: ["hero", "main", "rail", "full"].includes(block?.slot) ? block.slot : "main",
      };
    })
    .filter(Boolean)
    .filter((block, index, list) => list.findIndex((item) => item.component === block.component) === index);
  if (!next.layout.length) delete next.layout;

  next.brickPlan = (Array.isArray(next.brickPlan) ? next.brickPlan : [])
    .map((brick) => {
      const feature = canonicalHomeBlock(brick?.feature || brick?.component);
      const component = canonicalHomeBlock(brick?.component || feature);
      if (!feature || !component) return null;
      if (component === "referral_link_card" && !wantsReferralCard) return null;
      return {
        ...brick,
        feature,
        component,
        brickId: cleanText(brick?.brickId || `${component}.generated`, `${component}.generated`, 90),
        brickName: cleanText(brick?.brickName || brick?.name || component, component, 80),
        family: cleanText(brick?.family || brick?.brickFamily || component, component, 48),
        size: cleanText(brick?.size || brick?.brickSize || (component === "trading_accounts_list" ? "3x2" : "2x1"), "", 12),
        zone: ["hero", "main", "rail", "full"].includes(brick?.zone || brick?.brickZone) ? brick.zone || brick.brickZone : "main",
      };
    })
    .filter(Boolean)
    .filter((brick, index, list) => list.findIndex((item) => item.component === brick.component) === index)
    .slice(0, CANONICAL_HOME_BLOCKS.length);
  const plannedComponents = new Set(next.brickPlan.map((brick) => brick.component));
  canonicalHomepageReference().bricks.forEach((brick) => {
    const visible = next.sections.some((section) => section.slots.includes(brick.component));
    if (visible && !plannedComponents.has(brick.component)) {
      next.brickPlan.push({
        brickId: brick.id,
        brickName: brick.family,
        family: brick.family,
        feature: brick.feature,
        component: brick.component,
        size: brick.size,
        zone: brick.zone,
        reason: "由首页内容块白名单补齐。",
      });
      plannedComponents.add(brick.component);
    }
  });

  next.heroFocus = canonicalHomeBlock(next.heroFocus) || next.sections[0]?.slots?.[0] || "asset_overview";

  settings.referral = { ...ensureObject(settings.referral), enabled: false };
  settings.userKycRail = { ...ensureObject(settings.userKycRail), kycStatus: "verified" };
  settings.riskNotice = { ...ensureObject(settings.riskNotice), enabled: false };
  settings.openAccount = { ...ensureObject(settings.openAccount), bind: false };
  settings.assets = {
    ...ensureObject(settings.assets),
    visibleFields: exactAssetFields
      ? [...new Set(requestedAssetFields)].slice(0, 3)
      : Array.isArray(settings.assets?.visibleFields)
      ? settings.assets.visibleFields.filter((field) => ["total", "wallet", "tradingAccount"].includes(field)).slice(0, 3)
      : ["total", "wallet", "tradingAccount"],
  };
  if (!settings.assets.visibleFields.length) settings.assets.visibleFields = ["total"];
  settings.quickActions = {
    ...ensureObject(settings.quickActions),
    actions: [],
  };
  settings.pamm = { ...ensureObject(settings.pamm), enabled: Boolean(settings.pamm?.enabled || wantsPamm) };
  settings.copytrading = { ...ensureObject(settings.copytrading), enabled: Boolean(settings.copytrading?.enabled || wantsCopyTrading) };
  settings.referralLinkCard = {
    ...ensureObject(settings.referralLinkCard),
    enabled: Boolean(wantsReferralCard),
    showPromoLink: true,
    showInviteCode: true,
    showShare: Boolean(settings.referralLinkCard?.showShare),
    showStats: wantsReferralCoreOnly ? false : Boolean(settings.referralLinkCard?.showStats || wantsReferralStats),
    showOpens: settings.referralLinkCard?.showOpens !== false,
    showRegistrations: settings.referralLinkCard?.showRegistrations !== false,
    showAccounts: settings.referralLinkCard?.showAccounts !== false,
    showRegistrationRate: settings.referralLinkCard?.showRegistrationRate !== false,
    showAccountRate: settings.referralLinkCard?.showAccountRate !== false,
  };
  settings.announcements = { ...ensureObject(settings.announcements), enabled: Boolean(settings.announcements?.enabled || wantsAnnouncements) };
  settings.marketNews = { ...ensureObject(settings.marketNews), enabled: Boolean(settings.marketNews?.enabled || wantsMarketNews) };
  settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: Boolean(settings.riskDisclosure?.enabled || wantsRiskDisclosure || sectionHasSlot(next.sections, "risk_disclosure")) };
  settings.faq = { ...ensureObject(settings.faq), enabled: Boolean(settings.faq?.enabled || wantsFaq || sectionHasSlot(next.sections, "faq_section")) };
  settings.supportContact = { ...ensureObject(settings.supportContact), enabled: Boolean(settings.supportContact?.enabled || wantsSupportContact || sectionHasSlot(next.sections, "support_contact")) };
  settings.appDownload = { ...ensureObject(settings.appDownload), enabled: Boolean(settings.appDownload?.enabled || wantsAppDownload || sectionHasSlot(next.sections, "app_download")) };

  next.moduleSettings = settings;
  enforceServerRiskDisclosureFooter(next);
  return next;
}

const HOMEPAGE_SLOT_TO_SETTING = {
  welcome_header: "welcomeHeader",
  asset_overview: "assets",
  quick_actions: "quickActions",
  onboarding_guide: "onboardingProgress",
  trading_account_highlight: "accountPerformance",
  trading_accounts_list: "tradingAccounts",
  promo_banner: "promoHighlight",
  pamm_products: "pamm",
  copytrading_signals: "copytrading",
  referral_link_card: "referralLinkCard",
  announcements: "announcements",
  market_news: "marketNews",
  risk_disclosure: "riskDisclosure",
  faq_section: "faq",
  support_contact: "supportContact",
  app_download: "appDownload",
  balanceTotal: "assets",
  walletBalance: "wallet",
  fundActions: "assets",
  openAccountActions: "openAccount",
  onboardingProgress: "onboardingProgress",
  promoHighlight: "promoHighlight",
  adCarousel: "adCarousel",
  quickActions: "quickActions",
  referralLink: "referral",
  referral_link_card: "referralLinkCard",
  tradingAccounts: "tradingAccounts",
  userKycRail: "userKycRail",
  accountPerformance: "accountPerformance",
  walletList: "wallet",
  createAccountForm: "createAccountForm",
  marketInsight: "marketInsight",
  riskNotice: "riskDisclosure",
};

const HOMEPAGE_SLOT_TO_BRICK_FEATURE = {
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
  risk_disclosure: "risk_disclosure",
  faq_section: "faq_section",
  support_contact: "support_contact",
  app_download: "app_download",
  balanceTotal: "balanceTotal",
  walletBalance: "walletBalance",
  fundActions: "fundActions",
  openAccountActions: "openAccountActions",
  onboardingProgress: "onboardingProgress",
  promoHighlight: "promoHighlight",
  adCarousel: "adCarousel",
  quickActions: "quickActions",
  referralLink: "referralLink",
  referral_link_card: "referral_link_card",
  tradingAccounts: "tradingAccounts",
  userKycRail: "userKycRail",
  accountPerformance: "accountPerformance",
  walletList: "walletList",
  createAccountForm: "createAccountForm",
  marketInsight: "marketInsight",
  riskNotice: "risk_disclosure",
};

const HOMEPAGE_HERO_FOCUS_TO_SLOT = {
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
  risk_disclosure: "risk_disclosure",
  faq_section: "faq_section",
  support_contact: "support_contact",
  app_download: "app_download",
  asset_summary: "balanceTotal",
  ad_carousel: "adCarousel",
  fund_actions: "fundActions",
  quick_actions: "quickActions",
  open_account_panel: "openAccountActions",
  onboarding_progress: "onboardingProgress",
  account_list: "tradingAccounts",
  referral_link: "referralLink",
  referral_link_card: "referral_link_card",
  user_kyc_rail: "userKycRail",
  account_performance: "accountPerformance",
  wallet_list: "walletList",
  create_account_form: "createAccountForm",
  wallet_balance: "walletBalance",
  risk_notice: "risk_disclosure",
  copytrading_summary: "marketInsight",
};

function sectionHasSlot(sections, slot) {
  return Array.isArray(sections) && sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot));
}

function configHasHomepageSlot(config, slot) {
  return (
    sectionHasSlot(config.sections, slot) ||
    (Array.isArray(config.layout) && config.layout.some((block) => block?.component === slot)) ||
    (Array.isArray(config.brickPlan) && config.brickPlan.some((brick) => brick?.component === slot || brick?.feature === slot))
  );
}

function enforceServerRiskDisclosureFooter(config) {
  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  const riskEnabled = Boolean(settings.riskDisclosure?.enabled || configHasHomepageSlot(config, "risk_disclosure"));
  if (!riskEnabled) return;

  settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: true };
  config.moduleSettings = settings;
  config.modules = { ...ensureObject(config.modules), RiskDisclosure: { variant: "legalStrip" } };
  config.moduleStyles = { ...ensureObject(config.moduleStyles), risk_disclosure: "legal-strip" };

  config.sections = (Array.isArray(config.sections) ? config.sections : [])
    .map((section) => ({ ...section, slots: Array.isArray(section.slots) ? section.slots.filter((slot) => slot !== "risk_disclosure") : [] }))
    .filter((section) => section.slots.length);
  config.sections.push({ id: "risk-disclosure-footer", type: "full", title: "风险提示", variant: "legal-strip", slots: ["risk_disclosure"] });

  if (Array.isArray(config.layout)) {
    const maxPriority = config.layout.length ? Math.max(...config.layout.map((block) => Number(block?.priority) || 0)) : 100;
    config.layout = config.layout.filter((block) => block?.component !== "risk_disclosure");
    config.layout.push({
      id: "risk-disclosure-footer",
      component: "risk_disclosure",
      slot: "full",
      priority: maxPriority + 100,
      props: {},
      brickId: "riskDisclosure.legalStrip",
      brickName: "底部合规风险披露",
      brickFamily: "RiskDisclosure",
      brickSize: "3x1",
      brickZone: "full",
      brickReason: "风险披露固定在页面底部，承载后台富文本合规文案。",
    });
  }

  config.brickPlan = (Array.isArray(config.brickPlan) ? config.brickPlan : [])
    .filter((brick) => brick?.component !== "risk_disclosure" && brick?.feature !== "risk_disclosure")
    .concat([
      {
        brickId: "riskDisclosure.legalStrip",
        brickName: "底部合规风险披露",
        family: "RiskDisclosure",
        feature: "risk_disclosure",
        component: "risk_disclosure",
        size: "3x1",
        zone: "full",
        reason: "外汇平台风险披露按合规惯例固定在页面底部。",
      },
    ]);
}

function removeAvoidedHomepageModules(config, avoid = [], keepSlots = []) {
  if (!avoid.length) return;
  const keepSet = new Set(keepSlots);
  const avoidSet = new Set(avoid.filter((slot) => !keepSet.has(slot)));
  if (!avoidSet.size) return;
  if (Array.isArray(config.sections)) {
    config.sections = config.sections
      .map((section) => ({
        ...section,
        slots: Array.isArray(section.slots) ? section.slots.filter((slot) => !avoidSet.has(slot)) : [],
      }))
      .filter((section) => section.slots.length);
  }
  if (Array.isArray(config.brickPlan)) {
    config.brickPlan = config.brickPlan.filter((brick) => !avoidSet.has(brick?.feature));
  }

  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  avoidSet.forEach((slot) => {
    const key = HOMEPAGE_SLOT_TO_SETTING[slot];
    if (!key) return;
    settings[key] = { ...ensureObject(settings[key]), enabled: false };
  });
  config.moduleSettings = settings;
}

function enforcePageIntentSections(config, profile, keepSlots = []) {
  const allowedMustHave = new Set(profile.mustHave || []);
  const currentSections = Array.isArray(config.sections) ? config.sections : [];
  const heroSlot = HOMEPAGE_HERO_FOCUS_TO_SLOT[profile.heroFocus] || "balanceTotal";
  const hasPrimaryHero = currentSections[0]?.type === "hero" && currentSections[0]?.slots?.includes(heroSlot);
  const missingMustHave = [...allowedMustHave].filter((slot) => !sectionHasSlot(currentSections, slot));

  if (!currentSections.length || missingMustHave.length > Math.max(1, allowedMustHave.size / 2) || !hasPrimaryHero) {
    config.sections = clonePlain(HOMEPAGE_INTENT_SECTIONS[profile.primaryIntent] || HOMEPAGE_INTENT_SECTIONS.standard);
    delete config.layout;
  }

  removeAvoidedHomepageModules(config, profile.avoid, keepSlots);
}

function cleanupHomepageSections(config) {
  if (!Array.isArray(config.sections)) {
    config.sections = [];
    return;
  }
  config.sections = config.sections
    .map((section) => ({
      ...ensureObject(section),
      slots: [...new Set(Array.isArray(section?.slots) ? section.slots.filter((slot) => typeof slot === "string" && slot.trim()) : [])],
    }))
    .filter((section) => section.slots.length);
}

function homepagePromptRequestsAd(text) {
  const source = String(text || "").toLowerCase();
  const hasAdSignal = textHasAny(source, ["广告", "轮播", "banner", "焦点图", "广告图", "广告位", "主视觉"]);
  const rejectsAd = /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放|不要出现).{0,12}(?:广告|轮播|banner|焦点图|广告图|广告位|主视觉)/i.test(source);
  return hasAdSignal && !rejectsAd;
}

function enableSettingForHomepageSlot(settings, slot) {
  const key = HOMEPAGE_SLOT_TO_SETTING[slot];
  if (!key) return;
  settings[key] = { ...ensureObject(settings[key]), enabled: true };
  if (slot === "fundActions") settings.assets = { ...ensureObject(settings.assets), enabled: true, showFundActions: true };
  if (slot === "walletList") settings.wallet = { ...ensureObject(settings.wallet), enabled: true, placement: "standalone" };
}

function enableHomepageSettingsForSections(config) {
  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  (config.sections || []).forEach((section) => {
    (section.slots || []).forEach((slot) => enableSettingForHomepageSlot(settings, slot));
  });
  config.moduleSettings = settings;
}

function ensureIntentCoreSection(config, profile) {
  const missingSlots = (profile.mustHave || []).filter((slot) => !sectionHasSlot(config.sections, slot));
  if (!missingSlots.length) return;
  const existing = (config.sections || []).find((section) => section.id === "intent-core");
  if (existing) {
    existing.slots = [...new Set([...(Array.isArray(existing.slots) ? existing.slots : []), ...missingSlots])];
    return;
  }
  config.sections.push({
    id: "intent-core",
    type: "split",
    title: `${profile.label || "意图"}核心模块`,
    slots: missingSlots,
  });
}

function lightRepairHomepageIntent(config, profile, text) {
  cleanupHomepageSections(config);
  ensureIntentCoreSection(config, profile);
  cleanupHomepageSections(config);
  if ((profile.avoid || []).includes("adCarousel") && !homepagePromptRequestsAd(text)) {
    removeAvoidedHomepageModules(config, ["adCarousel"]);
    const settings = ensureHomepageModuleSettings(config.moduleSettings);
    settings.adCarousel = { ...ensureObject(settings.adCarousel), enabled: false };
    config.moduleSettings = settings;
  }
  cleanupHomepageSections(config);
  enableHomepageSettingsForSections(config);
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function homepageQuickActionId(action) {
  return typeof action === "string" ? action : action?.id;
}

function prioritizeHomepageQuickActions(settings, priorityIds, options = {}) {
  const quickActions = ensureObject(settings.quickActions);
  const currentIds = Array.isArray(quickActions.actions) ? quickActions.actions.map(homepageQuickActionId).filter(Boolean) : [];
  const actions = [...new Set(priorityIds.concat(currentIds))].slice(0, 8);

  settings.quickActions = {
    ...quickActions,
    enabled: true,
    count: Math.max(Number(quickActions.count || 0), options.count || actions.length),
    display: options.display || quickActions.display || "iconText",
    actions,
  };
}

function applyTradingCostWorkbenchServerConfig(next, settings, understanding = {}) {
  next.name = understanding.recommendationId ? `AI ${understanding.recommendationId}`.slice(0, 28) : "AI 交易成本工作台";
  next.layoutPreset = "tradingCommand";
  next.designGenome = "tradingCommand";
  next.pageStory = "tradingEfficiency";
  next.themePreset = "darkTech";
  next.theme = "darkTech";
  next.density = "compact";
  next.personalizationStrength = "strong";
  next.heroFocus = "trading_account_highlight";
  next.pageIntent = { ...ensureObject(next.pageIntent), primaryIntent: "trader" };
  next.sections = [
    { id: "cost-execution-hero", type: "hero", title: "交易成本与执行", slots: ["trading_account_highlight", "quick_actions"] },
    { id: "cost-margin-strip", type: "full", title: "持仓与保证金", slots: ["asset_overview"] },
    { id: "cost-account-ledger", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
  ];
  delete next.layout;
  next.brickPlan = [
    { brickId: "accountPerformance.costBoard", brickName: "交易成本与执行看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "2x2", zone: "hero", reason: "首屏直接保留 EURUSD 点差 0.2 起、佣金 $7/手、持仓 PnL、保证金占用和执行效率。" },
    { brickId: "quickActions.mt5CommandBar", brickName: "MT5 快捷命令栏", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x2", zone: "rail", reason: "MT5、持仓、订单和切换账号作为专业交易高频操作。" },
    { brickId: "assetOverview.marginTicker", brickName: "保证金与资产 Ticker", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "3x1", zone: "full", reason: "把保证金占用和可用资金压缩为行情式横向指标，不复用新手路径。" },
    { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号分区列表展示，适合专业交易排查与切换。" },
  ];
  next.modules = {
    ...ensureObject(next.modules),
    AccountPerformance: { variant: "sparklineBoard" },
    QuickActions: { variant: "commandBar" },
    AssetOverview: { variant: "darkTerminal" },
    TradingAccounts: { variant: "opsTable" },
  };
  next.moduleStyles = {
    ...ensureObject(next.moduleStyles),
    accountPerformance: "cost-board",
    quickActions: "command-bar",
    balanceTotal: "ticker-strip",
    tradingAccounts: "ops-table",
    adCarousel: "clean",
  };
  settings.adCarousel = { ...ensureObject(settings.adCarousel), enabled: false };
  settings.promoHighlight = { ...ensureObject(settings.promoHighlight), enabled: false };
  settings.quickActions = {
    ...ensureObject(settings.quickActions),
    enabled: true,
    count: 6,
    display: "iconText",
    actions: ["switchAccount", "positions", "orders", "downloadMt5", "deposit", "openDemo"],
  };
  settings.assets = {
    ...ensureObject(settings.assets),
    enabled: true,
    visibleFields: ["tradingAccount", "wallet"],
    showFundActions: false,
    showAccountBreakdown: true,
    showWalletBreakdown: false,
    showAvailable: true,
    showMargin: true,
    showRiskLevel: false,
    wallets: [],
  };
  settings.wallet = { ...ensureObject(settings.wallet), enabled: false, placement: "mergedWithAssets", showFundActions: false };
  settings.openAccount = { ...ensureObject(settings.openAccount), enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" };
  settings.tradingAccounts = {
    ...ensureObject(settings.tradingAccounts),
    enabled: true,
    realEnabled: true,
    demoEnabled: true,
    grouping: "separated",
    viewMode: "list",
    realViewMode: "list",
    demoViewMode: "list",
    demoFirst: false,
  };
  settings.pamm = { ...ensureObject(settings.pamm), enabled: false };
  settings.copytrading = { ...ensureObject(settings.copytrading), enabled: false };
  settings.announcements = { ...ensureObject(settings.announcements), enabled: false };
  settings.marketNews = { ...ensureObject(settings.marketNews), enabled: false };
  settings.riskNotice = { ...ensureObject(settings.riskNotice), enabled: false };
  next.brickTrace = {
    ...ensureObject(next.brickTrace),
    intent: "trader",
    pageIntent: "trader",
    strategy: "专业交易成本工作台契约",
    score: 98,
    selectedCount: next.brickPlan.length,
    source: "server-cost-guard",
  };
  next.emphasis = { ...ensureObject(next.emphasis), deposit: "medium", openAccount: "low", promo: "low", accounts: "high" };
  next.aiSummary = "已按专业交易成本工作台重排：首屏保留 EURUSD 点差 0.2 起、佣金 $7/手、持仓 PnL、保证金占用和 MT5 快捷操作，真实/模拟账号分开。";
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

function applyHomepageUnderstandingToServerConfig(config, prompt) {
  const understanding = extractHomepageUnderstanding(prompt);
  const next = ensureObject(config);
  const settings = ensureHomepageModuleSettings(next.moduleSettings);

  const needsTrustLayout =
    understanding.wantsMatureBrokerTrust ||
    understanding.wantsCombinedAccountFilter;

  if (understanding.wantsLightBlue) {
    next.themePreset = "blueFinance";
    next.theme = "blueFinance";
  }

  if (understanding.wantsFreshLayout) {
    next.personalizationStrength = "strong";
  }

  if (understanding.wantsTradingCostWorkbench) {
    applyTradingCostWorkbenchServerConfig(next, settings, understanding);
  }

  if (needsTrustLayout) {
    next.name = understanding.recommendationId ? `AI ${understanding.recommendationId}`.slice(0, 28) : "AI 白标信任首页";
    if (understanding.wantsMatureBrokerTrust || understanding.wantsCombinedAccountFilter) {
      next.pageIntent = { ...ensureObject(next.pageIntent), primaryIntent: "brand" };
    }
    next.layoutPreset = "accountOpsConsole";
    next.designGenome = "accountOpsConsole";
    next.pageStory = "opsClarity";
    next.themePreset = understanding.wantsLightBlue ? "blueFinance" : next.themePreset || "blueFinance";
    next.theme = next.themePreset;
    next.density = next.density === "spacious" ? "balanced" : next.density || "balanced";
    next.personalizationStrength = understanding.wantsFreshLayout ? "strong" : next.personalizationStrength || "strong";
    next.heroFocus = "asset_summary";
    next.sections = [
      { id: "trust-hero", type: "hero", title: "资金安全", slots: ["balanceTotal", "openAccountActions"] },
      { id: "wallet-cards", type: "full", title: "钱包列表", slots: ["walletList"] },
      { id: "conversion-tools", type: "split", title: "快捷入口与活动", slots: ["quickActions", "promoHighlight"] },
      { id: "combined-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ];
    delete next.layout;
    next.modules = {
      ...ensureObject(next.modules),
      AssetOverview: { variant: "tickerStrip" },
      WalletList: { variant: "walletTiles" },
      QuickActions: { variant: "taskRail" },
      PromotionBanner: { variant: "splitVisual" },
      OpenAccount: { variant: "conversionPanel" },
      TradingAccounts: { variant: "opsTable" },
    };
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      balanceTotal: "ticker-strip",
      fundActions: "split-buttons",
      adCarousel: "clean",
      walletList: "wallet-tiles",
      quickActions: "task-rail",
      promoHighlight: "scoreboard",
      openAccountActions: "conversion-panel",
      tradingAccounts: "ops-table",
    };
    settings.adCarousel.enabled = false;
    settings.wallet = { ...settings.wallet, enabled: true, placement: "standalone", showFundActions: false };
    settings.assets = {
      ...settings.assets,
      enabled: true,
      showFundActions: false,
      showAccountBreakdown: true,
      showWalletBreakdown: false,
      showAvailable: true,
      showMargin: true,
      showRiskLevel: true,
      wallets: ["USD", "EUR", "USDT"],
    };
    settings.openAccount = { ...settings.openAccount, enabled: true, real: true, demo: true, bind: false, placement: "standalone" };
    settings.promoHighlight.enabled = true;
    settings.tradingAccounts = { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true };
    next.brickPlan = [
      { brickId: "assetOverview.tickerStrip", brickName: "资金安全指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏先呈现总余额、可用资金、保证金和风险等级。" },
      { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开户作为主转化，但不做营销页式大横幅。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用卡片列表展示，形成资金余额主体。" },
      { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口作为工具条，不再复用上一版大网格。" },
      { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "主推活动和开户转化放在同一业务层。" },
      { brickId: "tradingAccounts.separatedList", brickName: "合并账号工作台", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实和模拟账号在同一列表，用胶囊筛选区分。" },
    ];
  }

  if (understanding.wantsCopyTrading) {
    next.modules = {
      ...ensureObject(next.modules),
      CopytradingSignals: { variant: "curveCards" },
    };
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      copytrading_signals: "curve-cards",
    };
    settings.copytrading = { ...ensureObject(settings.copytrading), enabled: true };
    ensureHomepageSectionContains(next, { id: "copytrading", type: "split", title: "CopyTrading 推荐" }, "copytrading_signals");

    if (understanding.wantsNewUserJourney) {
      next.name = "AI 新客跟单驾驶舱";
      next.layoutPreset = "onboardingJourney";
      next.designGenome = "onboardingJourney";
      next.pageStory = "accountActivation";
      next.themePreset = "blueFinance";
      next.theme = "blueFinance";
      next.density = next.density === "spacious" ? "balanced" : next.density || "balanced";
      next.personalizationStrength = "strong";
      next.heroFocus = "copytrading_signals";
      next.pageIntent = { ...ensureObject(next.pageIntent), primaryIntent: "copytrading" };
      next.sections = [
        { id: "activation-hero", type: "split", title: "新客启动", slots: ["copytrading_signals", "onboarding_guide"] },
        { id: "activation-actions", type: "split", title: "下一步操作", slots: understanding.wantsPamm ? ["pamm_products", "quick_actions"] : ["quick_actions", "asset_overview"] },
        ...(understanding.wantsPamm ? [{ id: "activation-assets", type: "split", title: "账户资产", slots: ["asset_overview"] }] : []),
        { id: "activation-accounts", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
      ];
      delete next.layout;
      next.modules = {
        ...ensureObject(next.modules),
        CopytradingSignals: { variant: "curveCards" },
        OnboardingProgress: { variant: "journeyTimeline" },
        QuickActions: { variant: "taskRail" },
        TradingAccounts: { variant: "separatedList" },
        PammProducts: { variant: "yieldChartCards" },
        AssetOverview: { variant: "compactTable" },
      };
      next.moduleStyles = {
        ...ensureObject(next.moduleStyles),
        copytrading_signals: "curve-cards",
        onboardingProgress: "journey-timeline",
        quickActions: "task-rail",
        tradingAccounts: "dense-cards",
        pamm_products: "yield-chart-cards",
        balanceTotal: "metric-strip",
      };
      settings.quickActions = {
        ...settings.quickActions,
        enabled: true,
        count: understanding.quickActionCount || 5,
        display: "iconText",
      };
      settings.pamm = { ...ensureObject(settings.pamm), enabled: Boolean(understanding.wantsPamm) };
      settings.assets = {
        ...settings.assets,
        enabled: true,
        showFundActions: false,
        showAccountBreakdown: true,
        showWalletBreakdown: true,
      };
      settings.wallet = { ...settings.wallet, enabled: false, placement: "mergedWithAssets", showFundActions: false };
      settings.openAccount = { ...settings.openAccount, enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" };
      settings.tradingAccounts = {
        ...settings.tradingAccounts,
        enabled: true,
        realEnabled: true,
        demoEnabled: true,
        grouping: "separated",
        viewMode: "card",
        realViewMode: "card",
        demoViewMode: understanding.wantsDemoAccountList && !understanding.wantsDemoAccountCard ? "list" : "card",
      };
      settings.promoHighlight.enabled = false;
      next.brickPlan = [
        { brickId: "copytradingSignals.curveCards", brickName: "AI 跟单信号源推荐", family: "CopytradingSignals", feature: "copytrading_signals", component: "copytrading_signals", size: "2x2", zone: "hero", reason: "CopyTrading 进入首屏，展示信号源、收益率、总收益和曲线。" },
        { brickId: "onboardingProgress.timeline", brickName: "新客旅程时间线", family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_progress", size: "2x1", zone: "main", reason: "新用户仍需要看到开户进度和下一步。" },
        ...(understanding.wantsPamm
          ? [{ brickId: "pammProducts.recommendations", brickName: "AI PAMM 产品推荐", family: "PammProducts", feature: "pamm_products", component: "pamm_products", size: "2x1", zone: "main", reason: "PAMM 作为独立 AI 推荐模块，不与 CopyTrading 合并。" }]
          : []),
        { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "入口作为下一步任务组，避免空白快捷框。" },
        { brickId: "assetOverview.compactMetrics", brickName: "轻量资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "main", reason: "资产降级为辅助指标，不抢新客引导和跟单推荐。" },
        { brickId: "tradingAccounts.separatedList", brickName: "真实与模拟账号卡片", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号都用卡片，分区展示形成明显区分。" },
      ];
      next.brickTrace = { ...ensureObject(next.brickTrace), intent: "copytrading", pageIntent: "copytrading", strategy: "新客跟单驾驶舱契约", score: 97, selectedCount: next.brickPlan.length };
      next.aiSummary = "已按新客跟单驾驶舱重排：首屏跟单曲线推荐 + 开户旅程，资产降级。";
    }
  }

  if (understanding.visibleMetricCount >= 3) {
    settings.wallet = { ...settings.wallet, enabled: true, placement: "standalone" };
    settings.assets = {
      ...settings.assets,
      enabled: true,
      showAvailable: true,
      showMargin: true,
      showRiskLevel: true,
      wallets: ["USD", "EUR", "USDT"],
    };
    if (!needsTrustLayout) {
      settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: true };
      ensureHomepageSectionContains(next, { id: "metrics-proof", type: "split", title: "资金指标" }, "risk_disclosure");
    }
  }

  if (understanding.quickActionCount) {
    const preferred = understanding.wantsMatureBrokerTrust
      ? ["openReal", "deposit", "transfer", "orders", "contactService"]
      : [];
    settings.quickActions = {
      ...settings.quickActions,
      enabled: true,
      count: understanding.quickActionExact
        ? understanding.quickActionCount
        : Math.max(Number(settings.quickActions.count || 0), understanding.quickActionCount),
      display: "iconText",
      actions: completeHomepageQuickActions(settings.quickActions.actions, understanding.quickActionCount, preferred),
    };
    ensureHomepageSectionContains(next, { id: "conversion-tools", type: "split", title: "快捷入口与开户" }, "quickActions");
  }

  if (understanding.wantsCombinedAccountFilter) {
    next.modules = { ...ensureObject(next.modules), TradingAccounts: { variant: "opsTable" } };
    next.moduleStyles = { ...ensureObject(next.moduleStyles), tradingAccounts: "ops-table" };
    settings.tradingAccounts = {
      ...settings.tradingAccounts,
      enabled: true,
      realEnabled: true,
      demoEnabled: true,
      grouping: "combined",
      viewMode: "list",
      realViewMode: "list",
      demoViewMode: "list",
      demoFirst: false,
    };
    ensureHomepageSectionContains(next, { id: "combined-accounts", type: "full", title: "交易账号" }, "tradingAccounts");
  }

  if (understanding.recommendationId) {
    next.compositionStrategy = `${next.compositionStrategy || ""} 推荐编号 ${understanding.recommendationId} 已进入硬约束自检。`.trim();
  }

  next.moduleSettings = settings;
  return next;
}

function enforceHomepagePromptIntent(payload, config) {
  const prompt = String(payload.prompt || "");
  const text = prompt.toLowerCase() + prompt;
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const intent = intentProfile.primaryIntent;
  const intentPreset = HOMEPAGE_INTENT_PRESETS[intent] || HOMEPAGE_INTENT_PRESETS.standard;
  const design = homepageDesignForIntent(intent);
  const next = ensureObject(config);
  const existingPageIntent = ensureObject(next.pageIntent);
  next.pageIntent = {
    ...intentProfile,
    ...existingPageIntent,
    primaryIntent: intentProfile.primaryIntent,
    secondaryIntents: intentProfile.secondaryIntents,
    confidence: intentProfile.confidence,
    score: intentProfile.score,
    mustHave: intentProfile.mustHave,
    avoid: intentProfile.avoid,
    matchedSignals: intentProfile.matchedSignals,
  };
  if (!next.layoutPreset) next.layoutPreset = intentPreset.layoutPreset;
  if (!next.themePreset) next.themePreset = intentPreset.themePreset;
  if (!next.density) next.density = intentPreset.density;
  if (!next.heroFocus) next.heroFocus = intentPreset.heroFocus;
  if (!next.theme) next.theme = next.themePreset;
  if (!next.designGenome) next.designGenome = design.designGenome;
  if (!next.pageStory) next.pageStory = design.pageStory;
  if (HOMEPAGE_FORCE_INTENTS.has(intent) && intentProfile.confidence !== "fallback") {
    next.layoutPreset = intentPreset.layoutPreset;
    next.themePreset = intentPreset.themePreset;
    next.theme = intentPreset.themePreset;
    next.density = intentPreset.density;
    next.heroFocus = intentPreset.heroFocus;
    next.designGenome = design.designGenome;
    next.pageStory = design.pageStory;
  }
  next.moduleSettings = ensureHomepageModuleSettings(next.moduleSettings);
  const settings = next.moduleSettings;

  intentProfile.mustHave.forEach((slot) => {
    const key = HOMEPAGE_SLOT_TO_SETTING[slot];
    if (!key) return;
    settings[key] = { ...ensureObject(settings[key]), enabled: true };
  });

  const wantsAssetManagement = intent === "asset";
  const mentionsAd = homepagePromptRequestsAd(text);
  const mentionsQuick = textHasAny(text, ["快捷入口", "快捷矩阵", "快捷操作", "quick actions", "quickactions"]);
  const mentionsReferral = textHasAny(text, ["推广", "邀请", "开户链接", "注册链接", "邀请码", "referral", "ib", "代理", "渠道"]);

  if (wantsAssetManagement) {
    next.name = "AI 资产管理首页";
    next.layoutPreset = "accountOpsConsole";
    next.designGenome = "accountOpsConsole";
    next.pageStory = "opsClarity";
    next.themePreset = "blueFinance";
    next.theme = "blueFinance";
    next.density = "balanced";
    next.heroFocus = "asset_summary";
    next.sections = [
      { id: "asset-overview", type: "hero", title: "资产总览", slots: ["balanceTotal", "fundActions"] },
      { id: "asset-wallets", type: "full", title: "多币种钱包", slots: ["walletList"] },
      { id: "asset-performance", type: "split", title: "账户表现", slots: ["accountPerformance", "risk_disclosure"] },
      { id: "asset-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ];
    delete next.layout;
    next.brickPlan = [
      { brickId: "assetOverview.tickerStrip", brickName: "资产 Ticker 指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏用横向指标带呈现总资产、可用资金、保证金和风险等级。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "入金和出金作为资产管理高频动作。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用磁贴组展示，和普通表格明显区分。" },
      { brickId: "accountPerformance.proChart", brickName: "账号表现图表", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "main", reason: "账户表现图表需要主栏宽度承载趋势信息。" },
      { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "1x2", zone: "rail", reason: "把保证金、杠杆和风险提示放到侧栏提醒。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "交易账号列表作为下方管理区完整承接。" },
    ];
    next.brickTrace = { intent: "asset", strategy: "资产管理纵向流", score: 92, selectedCount: next.brickPlan.length, source: "server-intent-guard" };
    next.modules = ensureObject(next.modules);
    next.modules.AssetOverview = { variant: "tickerStrip" };
    next.modules.FundActions = { variant: "splitButtons" };
    next.modules.WalletList = { variant: "walletTiles" };
    next.modules.AccountPerformance = { variant: "proChart" };
    next.modules.TradingAccounts = { variant: "opsTable" };
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      balanceTotal: "ticker-strip",
      fundActions: "split-buttons",
      adCarousel: "clean",
      quickActions: "matrix",
      walletList: "wallet-tiles",
      tradingAccounts: "ops-table",
    };
    settings.adCarousel.enabled = mentionsAd;
    settings.quickActions.enabled = mentionsQuick;
    settings.referral = { ...ensureObject(settings.referral), enabled: mentionsReferral };
    settings.wallet.enabled = true;
    settings.wallet.placement = "standalone";
    settings.wallet.showFundActions = false;
    settings.assets.enabled = true;
    settings.assets.showFundActions = true;
    settings.assets.showAccountBreakdown = true;
    settings.assets.showWalletBreakdown = false;
    settings.assets.showAvailable = true;
    settings.assets.showMargin = true;
    settings.assets.showRiskLevel = true;
    settings.assets.wallets = ["USD", "EUR", "USDT"];
    settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: true };
    settings.tradingAccounts.enabled = true;
    settings.tradingAccounts.realEnabled = true;
    settings.tradingAccounts.demoEnabled = true;
    settings.tradingAccounts.grouping = "separated";
    settings.tradingAccounts.viewMode = "list";
    settings.tradingAccounts.realViewMode = "list";
    settings.tradingAccounts.demoViewMode = "list";
  }

  if (intent === "deposit") {
    next.name = "AI 入金奖励阶梯首页";
    next.layoutPreset = "conversionFirst";
    next.designGenome = "depositLadder";
    next.pageStory = "depositConversion";
    next.themePreset = "blueFinance";
    next.theme = "blueFinance";
    next.density = "balanced";
    next.heroFocus = "promo_banner";
    next.sections = [
      { id: "deposit-hero", type: "hero", title: "入金奖励", slots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"] },
      { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quickActions"] },
      { id: "deposit-accounts", type: "full", title: "账号与趋势", slots: ["accountPerformance", "tradingAccounts"] },
    ];
    delete next.layout;
    next.brickPlan = depositGovernedBrickPlan();
    next.brickTrace = { intent: "deposit", strategy: "入金转化契约纠偏", score: 94, selectedCount: next.brickPlan.length, source: "server-page-governance" };
    next.modules = ensureObject(next.modules);
    next.modules.PromotionBanner = { variant: "depositLadder" };
    next.modules.WalletBalance = { variant: "splitCurrency" };
    next.modules.FundActions = { variant: "splitButtons" };
    next.modules.OpenAccount = { variant: "conversionPanel" };
    next.modules.QuickActions = { variant: "taskRail" };
    next.modules.AccountPerformance = { variant: "cleanSnapshot" };
    next.modules.TradingAccounts = { variant: "accountWall" };
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      promoHighlight: "deposit-ladder",
      walletBalance: "wallet-strip",
      fundActions: "split-buttons",
      openAccountActions: "conversion-panel",
      quickActions: "task-rail",
      accountPerformance: "pro-chart",
      tradingAccounts: "account-wall",
    };
    settings.adCarousel.enabled = true;
    settings.quickActions = { ...ensureObject(settings.quickActions), enabled: true, count: 4, display: "iconText", actions: ["transfer", "orders", "positions", "contactService"] };
    settings.wallet = { ...ensureObject(settings.wallet), enabled: true, placement: "standalone", showFundActions: false };
    settings.assets = { ...ensureObject(settings.assets), enabled: false, showFundActions: true, showAccountBreakdown: false, showWalletBreakdown: false, showAvailable: false, showMargin: false, showRiskLevel: false, wallets: [] };
    settings.referral = { ...ensureObject(settings.referral), enabled: false };
    settings.openAccount = { ...ensureObject(settings.openAccount), enabled: true, real: true, demo: false, bind: false, placement: "standalone" };
    settings.tradingAccounts = { ...ensureObject(settings.tradingAccounts), enabled: true, realEnabled: true, demoEnabled: false, grouping: "combined", viewMode: "card", realViewMode: "card", demoViewMode: "list", demoFirst: false };
    settings.riskNotice = { ...ensureObject(settings.riskNotice), enabled: false };
    next.emphasis = { ...ensureObject(next.emphasis), deposit: "high", openAccount: "high", promo: "high", accounts: "medium" };
    next.aiSummary = "已按入金转化契约重排：首屏奖励阶梯、钱包余额、唯一主入金入口和开真实账号。";
  }

  if (intent === "growth") {
    prioritizeHomepageQuickActions(settings, ["eventSignup", "deposit", "contest", "contactService"], { count: 4, display: "iconText" });
  }

  if (intent === "trader") {
    prioritizeHomepageQuickActions(settings, ["switchAccount", "positions", "orders", "downloadMt5", "risk", "deposit"], { count: 6, display: "iconOnly" });
  }

  const wantsPendingKyc = textHasAny(text, ["刚注册", "新用户", "新客", "未完成实名", "没有完成实名", "还没有完成实名", "待完成", "待 kyc", "kyc 待", "kyc未", "未实名"]);
  const mentionsKycOnly = textHasAny(text, ["kyc 状态", "kyc状态", "安全状态", "认证状态", "kyc"]) && !wantsPendingKyc;
  if (wantsPendingKyc) settings.userKycRail.kycStatus = "pending";
  if (mentionsKycOnly && settings.userKycRail.kycStatus === "pending") settings.userKycRail.kycStatus = "verified";

  const wantsDemoFirst = /模拟账号[\s\S]{0,24}(?:真实账号|live)[\s\S]{0,24}(?:上面|前面|之前)|demo[\s\S]{0,24}live[\s\S]{0,24}(?:上面|前面|之前)|demo\s*在\s*live\s*上/i.test(prompt);
  if (wantsDemoFirst) settings.tradingAccounts.demoFirst = true;

  const wantsRealCardsDemoList = /真实(?:交易)?账(?:号|户)[\s\S]{0,24}卡片|卡片[\s\S]{0,24}真实(?:交易)?账(?:号|户)/.test(prompt);
  const wantsAccountList =
    /交易账号.{0,12}(?:建议)?用列表|账号.{0,8}列表|列表形式|不是卡片|真实账号列表|模拟账号列表|live.{0,8}list|demo.{0,8}list/i.test(prompt);
	  if (wantsRealCardsDemoList) {
	    settings.tradingAccounts.grouping = "separated";
	    settings.tradingAccounts.viewMode = "card";
	    settings.tradingAccounts.realViewMode = "card";
	    settings.tradingAccounts.demoViewMode = "list";
	  } else if (wantsAccountList) {
	    settings.tradingAccounts.grouping = "separated";
	    settings.tradingAccounts.viewMode = "list";
	    settings.tradingAccounts.realViewMode = "list";
	    settings.tradingAccounts.demoViewMode = "list";
	  }
	  applyServerTradingAccountPresentationVariety(next, prompt);

	  if (textHasAny(text, ["多币种", "usd", "eur", "usdt", "黄金", "xau", "风险等级", "保证金占用", "可用资金", "资产配置"])) {
    settings.assets.showAvailable = true;
    settings.assets.showMargin = true;
    settings.assets.showRiskLevel = true;
    const wallets = [];
    if (textHasAny(text, ["usd", "美元"])) wallets.push("USD");
    if (textHasAny(text, ["eur", "欧元"])) wallets.push("EUR");
    if (textHasAny(text, ["usdt"])) wallets.push("USDT");
    if (textHasAny(text, ["黄金", "xau"])) wallets.push("XAU");
    settings.assets.wallets = wallets.length ? wallets : ["USD", "EUR", "USDT"];
    settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: true };
  }

  const requestedActions = [];
  [
    ["开户链接", "openAccount"],
    ["邀请好友", "inviteFriends"],
    ["活动报名", "eventSignup"],
    ["报名入口", "eventSignup"],
    ["报名", "eventSignup"],
    ["查看返佣", "viewCommission"],
    ["返佣", "viewCommission"],
    ["下载素材", "downloadMaterial"],
    ["入金", "deposit"],
    ["开真实账号", "openReal"],
    ["开真实账户", "openReal"],
    ["联系客服", "contactService"],
    ["切换交易账号", "switchAccount"],
    ["切换账号", "switchAccount"],
    ["kyc", "kyc"],
    ["下载 mt5", "downloadMt5"],
    ["mt5", "downloadMt5"],
    ["订单", "orders"],
    ["持仓", "positions"],
    ["风险", "risk"],
  ].forEach(([keyword, actionId]) => {
    if (text.includes(keyword) && !requestedActions.includes(actionId)) requestedActions.push(actionId);
  });
  if (requestedActions.length) {
    const current = Array.isArray(settings.quickActions.actions) ? settings.quickActions.actions.filter((item) => typeof item === "string") : [];
    settings.quickActions.actions = [...new Set(requestedActions.concat(current))].slice(0, 8);
    settings.quickActions.count = Math.max(Number(settings.quickActions.count || 0), Math.min(8, settings.quickActions.actions.length));
  }

  if (settings.riskDisclosure?.enabled && Array.isArray(next.sections)) {
    const hasRisk = next.sections.some((section) => Array.isArray(section.slots) && section.slots.includes("risk_disclosure"));
    if (!hasRisk && textHasAny(text, ["风险", "保证金", "杠杆"])) {
      next.sections.push({ id: "risk", type: "split", title: "风险提示", slots: ["risk_disclosure"] });
    }
  }

  const keepAvoidedSlots = mentionsAd ? ["adCarousel"] : [];
  enforcePageIntentSections(next, intentProfile, keepAvoidedSlots);
  removeAvoidedHomepageModules(next, intentProfile.avoid, keepAvoidedSlots);
  applyHomepageUnderstandingToServerConfig(next, prompt);
  lightRepairHomepageIntent(next, intentProfile, text);
  sanitizeHomepageAllowedBlocks(next, prompt);

  const isCostWorkbench = extractHomepageUnderstanding(prompt).wantsTradingCostWorkbench;
  next.brickTrace = {
    ...ensureObject(next.brickTrace),
    intent,
    pageIntent: intent,
    strategy: isCostWorkbench ? "专业交易成本工作台契约" : `${intentProfile.label}服务端意图纠偏`,
    score: isCostWorkbench ? 98 : typeof intentProfile.confidence === "number" ? Math.round(intentProfile.confidence * 100) : Math.max(50, intentProfile.score),
    source: isCostWorkbench ? "server-cost-guard" : "server-intent-profile",
  };

  return next;
}

function mockGeneratedComponent(payload, providerConfig) {
  const family = oneOfList(payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = oneOfList(payload.size, COMPONENT_SIZES, "2x1");
  const root = safeId(`${family}-${Date.now().toString(36)}`, "ai-brick");
  const prompt = cleanText(payload.prompt, componentFamilySpec(family).purpose, 160);
  const baseCss = `
    .${root}{min-height:${size.endsWith("2") ? "220px" : "168px"};display:grid;gap:14px;padding:18px;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#172033;font-family:Inter,system-ui,sans-serif}
    .${root} *{box-sizing:border-box}
    .${root} span,.${root} small{color:#64748b;font-size:12px;font-weight:850}
    .${root} strong{color:#111827;font-weight:950;letter-spacing:0}
    .${root} button,.${root} a{min-height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;border:1px solid #dbe3ef;border-radius:8px;background:#f8fbff;color:#172033;font-size:12px;font-weight:900;text-decoration:none}
    .${root} .primary{border-color:#2563eb;background:#2563eb;color:#fff}
  `;
  const templates = {
    AssetOverview: {
      name: "资产总览操作台",
      description: "展示总资产、钱包、交易账号余额和资金动作的首页资产积木。",
      html: `<section class="${root}"><div class="head"><span>Total Assets</span><strong>152,306.00 USD</strong></div><div class="metrics"><b>Wallet 52,306.00</b><b>TA Balance 100,000.00</b><b>Credit 8,918.00</b></div><div class="actions"><button class="primary" type="button">Deposit</button><button type="button">Withdraw</button></div></section>`,
      css: `${baseCss}.${root} .head{display:grid;gap:6px}.${root} .head strong{font-size:32px}.${root} .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} b{padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} .actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:620px){.${root} .metrics{grid-template-columns:1fr}}`,
      dataRequirements: ["totalAssets", "walletBalance", "accountBalance", "credit", "fundingActions"],
    },
    WalletBalance: {
      name: "钱包余额分栏",
      description: "展示钱包总额、多币种余额和资金操作的钱包积木。",
      html: `<section class="${root}"><header><span>Wallet Balance</span><strong>52,306.00 USD</strong></header><div class="currencies"><p><b>USD</b><span>7,621.04</span></p><p><b>AUD</b><span>10.48</span></p><p><b>JPY</b><span>0.00</span></p></div><div class="actions"><button class="primary" type="button">Deposit</button><button type="button">Withdraw</button></div></section>`,
      css: `${baseCss}.${root} header{display:grid;gap:6px}.${root} header strong{font-size:28px}.${root} .currencies{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} p{display:grid;gap:4px;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} b{font-size:13px}.${root} .actions{display:flex;gap:8px}@media(max-width:620px){.${root} .currencies{grid-template-columns:1fr}}`,
      dataRequirements: ["walletBalance", "currencyBalances", "fundingActions"],
    },
    FundActions: {
      name: "资金动作工具条",
      description: "把入金、出金、内部转账和钱包流水集中成高频操作入口。",
      html: `<section class="${root}"><span>Funding Actions</span><div><button class="primary" type="button">Deposit</button><button type="button">Withdrawal</button><button type="button">Internal Transfer</button><button type="button">Wallet Flow</button></div></section>`,
      css: `${baseCss}.${root}{align-content:center}.${root} div{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}@media(max-width:720px){.${root} div{grid-template-columns:repeat(2,minmax(0,1fr))}}`,
      dataRequirements: ["depositUrl", "withdrawUrl", "transferUrl", "walletFlowUrl"],
    },
    QuickActions: {
      name: "交易快捷入口矩阵",
      description: "面向交易用户的订单、持仓、资金和开户快捷入口。",
      html: `<section class="${root}"><span>Quick Actions</span><div><a class="primary">Deposit</a><a>Withdrawal</a><a>Order History</a><a>Positions</a><a>Transfer</a><a>Open Account</a></div></section>`,
      css: `${baseCss}.${root} div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} a{min-height:46px}@media(max-width:620px){.${root} div{grid-template-columns:repeat(2,minmax(0,1fr))}}`,
      dataRequirements: ["quickActionList"],
    },
    PromotionBanner: {
      name: "活动增长横幅",
      description: "承接交易比赛、奖池权益和入金转化的首页活动积木。",
      html: `<section class="${root}"><span>Trading Contest</span><strong>五月盈利王挑战赛</strong><p>${prompt}</p><div><b>奖池 $9,600</b><b>剩余 28 天</b><button class="primary" type="button">查看详情</button></div></section>`,
      css: `${baseCss}.${root}{align-content:center;background:#0f172a;color:#fff;border-color:#1d4ed8}.${root} strong{color:#fff;font-size:26px}.${root} p{margin:0;color:#cbd5e1}.${root} div{display:flex;gap:8px;flex-wrap:wrap}.${root} b{padding:8px 10px;border:1px solid rgba(147,197,253,.3);border-radius:8px;color:#dbeafe}`,
      dataRequirements: ["campaignTitle", "reward", "remainingDays", "ctaUrl"],
    },
    ReferralLink: {
      name: "开户链接增长面板",
      description: "展示测试开户链接、邀请码、复制动作和渠道转化数据的邀请积木。",
      html: `<section class="${root}"><header><span>Referral Link</span><strong>开户链接增长面板</strong></header><div class="link"><small>Test registration link</small><p>https://user.hcs555.com/regist-real?invite=123456</p><button class="primary" type="button">Copy</button></div><div class="stats"><b>271 Clicks</b><b>62 Accounts</b><b>18 Trading A/C</b></div></section>`,
      css: `${baseCss}.${root} header{display:grid;gap:4px}.${root} header strong{font-size:22px}.${root} .link{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} .link small{grid-column:1/-1}.${root} p{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.${root} .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} b{padding:9px;border-radius:8px;background:#eff6ff;color:#1d4ed8;font-size:12px}@media(max-width:620px){.${root} .link,.${root} .stats{grid-template-columns:1fr}}`,
      dataRequirements: ["inviteUrl", "inviteCode", "clicks", "registeredAccounts", "tradingAccounts"],
    },
    TradingAccounts: {
      name: "真实模拟账号列表",
      description: "用列表方式展示 Live/Demo 账号、服务器、余额、杠杆和详情操作。",
      html: `<section class="${root}"><header><span>Trading Accounts</span><div><button class="primary" type="button">All</button><button type="button">Live</button><button type="button">Demo</button></div></header><div class="rows"><p><b>Live 2000281</b><span>MT5 HCHoldingsGroup</span><strong>99,999.99</strong><a>Details</a></p><p><b>Demo 1000008</b><span>MT5 Demo</span><strong>50,000.00</strong><a>Details</a></p></div></section>`,
      css: `${baseCss}.${root} header{display:flex;justify-content:space-between;gap:10px;align-items:center}.${root} header div{display:flex;gap:6px}.${root} .rows{display:grid;gap:8px}.${root} p{display:grid;grid-template-columns:1.1fr 1.2fr .8fr auto;gap:8px;align-items:center;margin:0;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} strong{text-align:right}@media(max-width:720px){.${root} header,.${root} p{grid-template-columns:1fr;display:grid}.${root} strong{text-align:left}}`,
      dataRequirements: ["liveAccounts", "demoAccounts", "server", "balance", "leverage"],
    },
    OpenAccount: {
      name: "开户动作面板",
      description: "聚合开真实账号、开模拟账号、绑定账号和 KYC 状态的转化积木。",
      html: `<section class="${root}"><span>Open Account</span><strong>KYC Verified · 可立即开户</strong><div><button class="primary" type="button">Live Account</button><button type="button">Demo Account</button><button type="button">Bind Account</button></div><small>MT5 ECN / Standard / 1:100-1:500</small></section>`,
      css: `${baseCss}.${root}{align-content:center}.${root} strong{font-size:20px}.${root} div{display:grid;gap:8px}.${root} button{justify-content:flex-start;min-height:42px}`,
      dataRequirements: ["kycStatus", "openAccountActions", "accountTypes"],
    },
    OnboardingProgress: {
      name: "开户进度清单",
      description: "展示 KYC、开真实账号和首次入金三个关键步骤。",
      html: `<section class="${root}"><span>Next Steps</span><strong>完成开户路径</strong><ol><li><b>01</b><span>KYC completed</span></li><li><b>02</b><span>Open Live Account</span></li><li><b>03</b><span>First Deposit</span></li></ol></section>`,
      css: `${baseCss}.${root} ol{display:grid;gap:8px;margin:0;padding:0;list-style:none}.${root} li{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} b{color:#2563eb}`,
      dataRequirements: ["kycStatus", "accountStatus", "depositStatus"],
    },
    UserKycRail: {
      name: "用户 KYC 钱包侧栏",
      description: "展示用户身份、KYC 状态、当地时间和钱包摘要的侧栏积木。",
      html: `<section class="${root}"><div class="profile"><b>JC</b><strong>Jay Chew</strong><span>Singapore · 15:20</span></div><div class="status"><span>KYC Verified</span><strong>52,306.00 USD</strong><small>Wallet Balance</small></div></section>`,
      css: `${baseCss}.${root}{align-content:start}.${root} .profile,.${root} .status{display:grid;gap:6px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} .profile b{width:38px;height:38px;display:grid;place-items:center;border-radius:8px;background:#2563eb;color:#fff}.${root} strong{font-size:20px}`,
      dataRequirements: ["userProfile", "kycStatus", "localTime", "walletBalance"],
    },
    AccountPerformance: {
      name: "账号表现图表",
      description: "展示余额、权益、信用和 PnL 走势的交易账号表现积木。",
      html: `<section class="${root}"><header><span>Account Performance</span><strong>Equity +2.4%</strong></header><div class="metrics"><b>Balance 152,306</b><b>Equity 378,283</b><b>Credit 8,918</b></div><div class="bars"><i></i><i></i><i></i><i></i><i></i></div></section>`,
      css: `${baseCss}.${root} header{display:flex;justify-content:space-between;gap:10px}.${root} .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} b{padding:9px;border-radius:8px;background:#f8fbff;color:#334155;font-size:12px}.${root} .bars{height:92px;display:flex;align-items:end;gap:8px;padding:10px;border-radius:8px;background:#f8fbff}.${root} i{flex:1;border-radius:5px 5px 0 0;background:#2563eb}.${root} i:nth-child(1){height:36%}.${root} i:nth-child(2){height:58%}.${root} i:nth-child(3){height:46%}.${root} i:nth-child(4){height:78%}.${root} i:nth-child(5){height:68%}@media(max-width:620px){.${root} .metrics{grid-template-columns:1fr}}`,
      dataRequirements: ["balance", "equity", "credit", "pnlCurve"],
    },
    WalletList: {
      name: "多币种钱包卡片组",
      description: "以多币种卡片展示钱包货币和钱包余额，不展示可用余额、链路或资金动作。",
      html: `<section class="${root}"><header><span>Wallet List</span><strong>多币种钱包</strong></header><div class="wallets"><article><span><i>🇺🇸</i><b>USD</b></span><strong>99,999.99</strong></article><article><span><i>🇦🇺</i><b>AUD</b></span><strong>10.48</strong></article><article><span><i>₮</i><b>USDT</b></span><strong>6,280.00</strong></article></div></section>`,
      css: `${baseCss}.${root} header{display:flex;align-items:center;justify-content:space-between;gap:10px}.${root} .wallets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.${root} article{display:grid;gap:12px;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} article span{display:flex;align-items:center;gap:9px}.${root} article i{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #dbe3ef;border-radius:999px;background:#fff;font-style:normal;font-weight:950}.${root} article b{font-size:15px;color:#172033}.${root} article strong{font-size:24px}@media(max-width:720px){.${root} .wallets{grid-template-columns:1fr}}`,
      dataRequirements: ["walletRows", "currency", "balance", "currencyIcon"],
    },
    CreateAccountForm: {
      name: "真实账号创建表单",
      description: "展示平台、账号类型、币种、杠杆和创建动作的开户表单积木。",
      html: `<section class="${root}"><strong>创建真实账号</strong><label><span>交易平台</span><b>MT5</b></label><label><span>账户类型</span><b>ECN</b></label><label><span>币种 / 杠杆</span><b>USD · 1:300</b></label><button class="primary" type="button">Create Live Account</button></section>`,
      css: `${baseCss}.${root} strong{font-size:20px}.${root} label{display:flex;justify-content:space-between;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} b{font-size:13px}`,
      dataRequirements: ["platform", "accountType", "currency", "leverage"],
    },
    ClientHomeAtoms: {
      name: "首页业务小组件",
      description: "可嵌入首页卡片的细颗粒业务组件。",
      html: `<section class="${root}"><span>Client Home Atom</span><strong>${prompt}</strong><div><b>KYC Verified</b><b>Wallet 52,306.00</b></div><button class="primary" type="button">Open Account</button></section>`,
      css: `${baseCss}.${root} strong{font-size:20px}.${root} div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.${root} b{padding:9px;border-radius:8px;background:#f8fbff;color:#334155;font-size:12px}`,
      dataRequirements: ["title", "status", "action"],
    },
  };
  const template = templates[family] || templates.ClientHomeAtoms;

  return normalizeGeneratedComponent(
    {
      name: template.name,
      family,
      size,
      description: `${template.description} 通过 ${providerConfig.name} / ${providerConfig.model} 生成。`,
      tags: [family, size, "AI", "business"],
      html: template.html,
      css: template.css,
      layoutHints: [size, "可直接参与首页 hero/main/rail/full 编排", componentFamilySpec(family).purpose],
      dataRequirements: template.dataRequirements,
    },
    payload,
  );
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstHtmlClass(value) {
  const match = String(value || "").match(/\bclass=(["'])(.*?)\1/i);
  const first = (match?.[2] || "").split(/\s+/).find(Boolean) || "";
  return /^[A-Za-z_][\w-]*$/.test(first) ? first : "";
}

function stripHtmlTags(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeStepLabel(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(\d{1,2}\s+)+/, "")
    .replace(/\s+(已完成|当前步骤|待完成|完成|进行中|待处理|Verified|Current|Pending)(\s+\1)*$/i, "")
    .trim();
}

function requestedComponentName(instruction) {
  const text = String(instruction || "");
  const patterns = [
    /(?:名字|名称|标题)\s*(?:改成|改为|换成|设为|叫|变成)\s*[「“"']?([^。.!！?？\n，,、」”"']{1,80})/i,
    /(?:rename|title|name)\s*(?:to|as|=|:)\s*[「“"']?([^。.!！?？\n，,、」”"']{1,80})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const name = cleanText(match?.[1], "", 80).replace(/[」”"']+$/g, "").trim();
    if (name) return name;
  }

  return "";
}

function replacePrimaryTitle(html, title) {
  const safeTitle = escapeHtmlText(title);
  const source = stripEditorArtifactsFromHtml(html);
  if (!safeTitle) return source;
  if (/<strong\b[^>]*>[\s\S]*?<\/strong>/i.test(source)) {
    return source.replace(/<strong\b([^>]*)>[\s\S]*?<\/strong>/i, `<strong$1>${safeTitle}</strong>`);
  }
  if (/<h[1-4]\b[^>]*>[\s\S]*?<\/h[1-4]>/i.test(source)) {
    return source.replace(/<h([1-4])\b([^>]*)>[\s\S]*?<\/h[1-4]>/i, `<h$1$2>${safeTitle}</h$1>`);
  }
  return source.replace(/(<(?:section|article|div)\b[^>]*>)/i, `$1<strong>${safeTitle}</strong>`);
}

function extractStepLabels(html) {
  const labels = [...String(html || "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => {
      const spanMatch = match[1].match(/<span\b[^>]*>([\s\S]*?)<\/span>/i);
      return normalizeStepLabel(stripHtmlTags(spanMatch?.[1] || match[1]));
    })
    .filter(Boolean)
    .slice(0, 5);
  return labels.length ? labels : ["KYC", "Live Account", "First Deposit"];
}

function wantsProgressiveSteps(instruction, component) {
  return (
    component.family === "OnboardingProgress" &&
    /渐进|递进|流程|进度|路径|步骤|progress|timeline|step/i.test(String(instruction || ""))
  );
}

function progressiveOnboardingComponent(payload, component, title, instruction) {
  const rootClass = firstHtmlClass(component.html) || safeId(`${component.family}-${component.id}`, "onboarding");
  const labels = extractStepLabels(component.html).slice(0, 3);
  const statusLabels = ["已完成", "当前步骤", "待完成"];
  const states = ["done", "active", "pending"];
  const safeTitle = escapeHtmlText(title || component.name || "Become A Master");
  const stepMarkup = labels
    .map(
      (label, index) => `
        <li class="${states[index] || "pending"}">
          <b>${String(index + 1).padStart(2, "0")}</b>
          <span>${escapeHtmlText(label)}</span>
          <small>${statusLabels[index] || "待完成"}</small>
        </li>
      `,
    )
    .join("");

  const html = `
    <section class="${rootClass}">
      <span>Next Step</span>
      <strong>${safeTitle}</strong>
      <ol class="onboarding-progress-steps">${stepMarkup}</ol>
    </section>
  `;
  const css = `
    .${rootClass}{display:grid;gap:14px;padding:18px;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#172033}
    .${rootClass} *{box-sizing:border-box}
    .${rootClass}>span{color:#2563eb;font-size:12px;font-weight:900}
    .${rootClass}>strong{font-size:22px;letter-spacing:0}
    .${rootClass} .onboarding-progress-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0;padding:0;list-style:none}
    .${rootClass} .onboarding-progress-steps li{position:relative;display:grid;grid-template-columns:auto 1fr;gap:6px 9px;align-items:center;min-height:78px;padding:12px;border:1px solid #dbe3ef;border-radius:8px;background:#f8fbff}
    .${rootClass} .onboarding-progress-steps li::after{content:"";position:absolute;top:24px;right:-13px;width:13px;height:2px;background:#bfdbfe}
    .${rootClass} .onboarding-progress-steps li:last-child::after{display:none}
    .${rootClass} .onboarding-progress-steps b{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:#dbeafe;color:#1d4ed8;font-size:12px}
    .${rootClass} .onboarding-progress-steps span{color:#172033;font-size:13px;font-weight:900}
    .${rootClass} .onboarding-progress-steps small{grid-column:2;color:#64748b;font-size:11px;font-weight:800}
    .${rootClass} .onboarding-progress-steps .done{border-color:#bbf7d0;background:#f0fdf4}
    .${rootClass} .onboarding-progress-steps .done b{background:#16a34a;color:#fff}
    .${rootClass} .onboarding-progress-steps .active{border-color:#93c5fd;background:#eff6ff;box-shadow:0 0 0 2px rgba(37,99,235,.08)}
    .${rootClass} .onboarding-progress-steps .active b{background:#2563eb;color:#fff}
    @media(max-width:720px){.${rootClass} .onboarding-progress-steps{grid-template-columns:1fr}.${rootClass} .onboarding-progress-steps li::after{left:25px;right:auto;top:auto;bottom:-13px;width:2px;height:13px}}
  `;

  return normalizeGeneratedComponent(
    {
      ...component,
      id: component.id,
      name: title || component.name,
      description: cleanText(`${stripEditorArtifactsFromText(component.description) || "新客路径组件"} 已改为带编号、状态和连接线的渐进式开户路径。`, "", 260),
      tags: [...new Set([...(Array.isArray(component.tags) ? component.tags : []), "progressive"])],
      html,
      css,
      layoutHints: [...new Set([...(Array.isArray(component.layoutHints) ? component.layoutHints : []), "progressive steps"])],
      sourcePrompt: "",
      createdAt: component.createdAt,
    },
    {
      ...payload,
      family: component.family,
      size: component.size,
      prompt: "",
    },
  );
}

function mockEditedComponent(payload, component, providerConfig) {
  const instruction = cleanText(payload.instruction || payload.prompt, "优化组件层级", 180);
  const nextName = requestedComponentName(instruction);

  if (wantsProgressiveSteps(instruction, component)) {
    return progressiveOnboardingComponent(payload, component, nextName || component.name, instruction);
  }

  const html = replacePrimaryTitle(component.html, nextName);
  const css = stripEditorArtifactsFromCss(component.css || "");

  return normalizeGeneratedComponent(
    {
      ...component,
      id: component.id,
      name: nextName || component.name,
      description: cleanText(
        nextName ? `${stripEditorArtifactsFromText(component.description) || "AI 生成的首页积木组件。"} 标题已更新为 ${nextName}。` : stripEditorArtifactsFromText(component.description),
        "AI 生成的首页积木组件。",
        260,
      ),
      tags: [...new Set([...(Array.isArray(component.tags) ? component.tags : []), "edited"])],
      html,
      css,
      sourcePrompt: "",
      createdAt: component.createdAt,
    },
    {
      ...payload,
      family: component.family,
      size: component.size,
      prompt: "",
    },
  );
}

function mockComposition(payload, providerConfig) {
  const components = Array.isArray(payload.components) ? payload.components : [];
  return normalizeComposition(
    {
      name: "AI 首页积木组合",
      summary: `已用 ${providerConfig.name} / ${providerConfig.model} 组合 ${components.length} 个保存组件。`,
      layout: components.slice(0, 6).map((component, index) => ({
        componentId: component.id,
        size: component.size,
        zone: index === 0 ? "hero" : component.size.startsWith("1x") ? "rail" : "main",
        reason: `${component.name} 用于承接 ${component.family} 业务路径。`,
      })),
      themeAdvice: "保持蓝白金融底色，重要按钮使用主蓝色，表格和表单降低装饰感。",
      polishInstructions: "首屏优先放资产、快捷入口或开户动作；右侧承载用户状态和表单；下方放交易账号和钱包长列表。",
    },
    payload,
  );
}

async function callProviderWithPrompt(payload, promptParts, schema, schemaName = "ai_output") {
  const config = normalizeProviderConfig(payload.modelConfig);

  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    const expected = config.keyEnv.join(" or ");
    throw Object.assign(new Error(`Missing API key. Set ${expected} or enter a temporary key in the UI.`), { statusCode: 400 });
  }

  return requestAndParseProviderJson(config, apiKey, promptParts, schema || payload.context?.schema, schemaName);
}

async function requestAndParseProviderJson(config, apiKey, promptParts, schema, schemaName = "ai_output", previousError = null) {
  const { headers, body } = buildProviderRequest(config, apiKey, promptParts, schema, schemaName);

  let providerResult;
  try {
    providerResult = await requestProviderJson(config, headers, body);
  } catch (error) {
    throw error.details ? error : enrichProviderError(error, config, null);
  }
  const usedConfig = providerResult.config;
  const rawText = extractTextFromAiResponse(providerResult.response, usedConfig.apiMode);
  const finishReason = extractProviderFinishReason(providerResult.response);
  let json;
  try {
    json = extractJsonObject(rawText);
  } catch (error) {
    const stripped = stripReasoningText(rawText);
    const looksTruncated = stripped.trim().startsWith("{") && stripped.lastIndexOf("}") <= stripped.indexOf("{");
    const enriched = enrichProviderError(error, usedConfig, providerResult.target, {
      rawTextSnippet: stripReasoningText(rawText).slice(0, 500),
      finishReason: finishReason || null,
      likelyTruncated: looksTruncated || /length|max_tokens|content_filter/i.test(finishReason || ""),
      attempts: providerResult.attempts,
      previousAttempt: previousError?.details || null,
    });
    if (usedConfig.provider === "deepseek" && usedConfig.model === DEEPSEEK_PRO_MODEL) {
      const retryConfig = { ...usedConfig, model: DEEPSEEK_FLASH_MODEL, fallbackFromModel: DEEPSEEK_PRO_MODEL };
      return requestAndParseProviderJson(retryConfig, apiKey, promptParts, schema, schemaName, enriched);
    }
    throw enriched;
  }

  return {
    json,
    provider: usedConfig.provider,
    model: usedConfig.model,
    rawText,
    usage: providerResult.response.usage || null,
  };
}

async function testProviderConnection(payload) {
  const config = normalizeProviderConfig(payload.modelConfig);
  const apiKey = resolveApiKey(config);

  if (!apiKey) {
    const expected = config.keyEnv.join(" or ");
    throw Object.assign(new Error(`Missing API key. Set ${expected} or enter a temporary key in the UI.`), { statusCode: 400 });
  }

  const startedAt = Date.now();
  const promptParts = {
    system: "You are a provider connectivity test. Reply with only OK.",
    user: "Reply with only OK. This request only checks whether the configured model endpoint is reachable.",
  };
  const testConfig = { ...config, maxOutputTokens: Math.min(config.maxOutputTokens, 512), responseFormat: "text" };
  const { headers, body } = buildProviderRequest(testConfig, apiKey, promptParts, null, "connectivity_test");

  let providerResult;
  try {
    providerResult = await requestProviderJson(testConfig, headers, body);
  } catch (error) {
    throw error.details ? error : enrichProviderError(error, testConfig, null);
  }

  const usedConfig = providerResult.config;
  const rawText = extractTextFromAiResponse(providerResult.response, usedConfig.apiMode);
  return {
    provider: usedConfig.provider,
    providerName: usedConfig.name,
    model: usedConfig.model,
    apiMode: usedConfig.apiMode,
    baseUrl: usedConfig.baseUrl,
    endpoint: usedConfig.endpoint,
    url: `${providerResult.target.origin}${providerResult.target.pathname}`,
    durationMs: Date.now() - startedAt,
    message: stripReasoningText(rawText).slice(0, 220) || "Provider returned an empty but successful response.",
    attempts: providerResult.attempts,
    usage: providerResult.response.usage || null,
  };
}

async function callProvider(payload) {
  const config = normalizeProviderConfig(payload.modelConfig);

  if (process.env.HOME_AI_MOCK === "true") {
    return {
      config: enforceHomepagePromptIntent(payload, mockHomepageConfig(payload, config)),
      provider: config.provider,
      model: config.model,
      rawText: "",
      mock: true,
    };
  }

  const result = await callProviderWithPrompt(payload, buildPrompt(payload, config), payload.context?.schema, "homepage_config");
  return {
    config: enforceHomepagePromptIntent(payload, result.json),
    provider: result.provider,
    model: result.model,
    rawText: result.rawText,
    usage: result.usage,
  };
}

async function callComponentProvider(payload) {
  const config = normalizeProviderConfig(payload.modelConfig);

  if (process.env.HOME_AI_MOCK === "true") {
    const component = mockGeneratedComponent(payload, config);
    return {
      component: saveComponent(component),
      provider: config.provider,
      model: config.model,
      rawText: "",
      mock: true,
    };
  }

  const result = await callProviderWithPrompt(payload, buildComponentPrompt(payload), GENERATED_COMPONENT_JSON_SCHEMA, "homepage_component");
  const normalized = normalizeGeneratedComponent(result.json, payload);
  const component = saveComponent(generatedComponentTooGeneric(normalized) ? mockGeneratedComponent(payload, config) : normalized);
  return {
    component,
    provider: result.provider,
    model: result.model,
    rawText: result.rawText,
    usage: result.usage,
  };
}

async function callComponentEditProvider(payload) {
  const config = normalizeProviderConfig(payload.modelConfig);
  const currentComponent = resolveComponentForEdit(payload);

  if (process.env.HOME_AI_MOCK === "true") {
    const component = saveComponent(mockEditedComponent(payload, currentComponent, config));
    return {
      component,
      provider: config.provider,
      model: config.model,
      rawText: "",
      mock: true,
    };
  }

  const result = await callProviderWithPrompt(payload, buildComponentEditPrompt(payload, currentComponent), GENERATED_COMPONENT_JSON_SCHEMA, "homepage_component_edit");
  const sourcePrompt = cleanText(currentComponent.sourcePrompt, "", 500);
  const normalized = normalizeGeneratedComponent(
    {
      ...currentComponent,
      ...result.json,
      id: currentComponent.id,
      createdAt: currentComponent.createdAt,
    },
    {
      ...payload,
      family: result.json.family || currentComponent.family,
      size: result.json.size || currentComponent.size,
      prompt: sourcePrompt,
    },
  );
  const component = saveComponent(generatedComponentTooGeneric(normalized) ? mockEditedComponent(payload, currentComponent, config) : normalized);
  return {
    component,
    provider: result.provider,
    model: result.model,
    rawText: result.rawText,
    usage: result.usage,
  };
}

async function callCompositionProvider(payload) {
  const config = normalizeProviderConfig(payload.modelConfig);

  if (process.env.HOME_AI_MOCK === "true") {
    const composition = saveComposition(mockComposition(payload, config));
    return {
      composition,
      provider: config.provider,
      model: config.model,
      rawText: "",
      mock: true,
    };
  }

  const result = await callProviderWithPrompt(payload, buildCompositionPrompt(payload), COMPONENT_COMPOSITION_JSON_SCHEMA, "homepage_component_composition");
  const composition = saveComposition(normalizeComposition(result.json, payload));
  return {
    composition,
    provider: result.provider,
    model: result.model,
    rawText: result.rawText,
    usage: result.usage,
  };
}

async function handleAiComplete(req, res) {
  const startedAt = Date.now();
  let payload = null;
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    payload = await readJsonBody(req);
    historyConfig = callHistoryConfig(payload);
    const result = await callProvider(payload);
    const callRecord = addCallHistoryRecord({
      action: "homepage-generate",
      providerId: result.provider || historyConfig.provider,
      provider: historyConfig.name,
      model: result.model || historyConfig.model,
      apiMode: historyConfig.apiMode,
      callMode: "serverProxy",
      baseUrl: historyConfig.baseUrl,
      endpoint: historyConfig.endpoint,
	      temperature: historyConfig.temperature,
	      maxOutputTokens: historyConfig.maxOutputTokens,
	      inputMode: homepageInputMode(payload),
	      variant: Number.isFinite(Number(payload.variant)) ? Number(payload.variant) : 0,
	      status: "success",
      mock: Boolean(result.mock),
	      durationMs: Date.now() - startedAt,
	      prompt: safeRecordText(payload.prompt),
	      guidedSnapshot: guidedRecordSnapshot(payload),
	      message: result.config?.name || "首页生成成功",
	      configSnapshot: homepageRecordSnapshot(result.config),
	      usage: result.usage || null,
	    });
    sendJson(res, 200, { ok: true, ...result, callRecord });
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addCallHistoryRecord({
        action: "homepage-generate",
        providerId: config.provider,
        provider: config.name,
        model: config.model,
        apiMode: config.apiMode,
        callMode: "serverProxy",
        baseUrl: config.baseUrl,
	        endpoint: config.endpoint,
	        temperature: config.temperature,
	        maxOutputTokens: config.maxOutputTokens,
	        inputMode: homepageInputMode(payload),
	        variant: Number.isFinite(Number(payload.variant)) ? Number(payload.variant) : 0,
	        status: "failed",
        durationMs: Date.now() - startedAt,
        prompt: safeRecordText(payload.prompt),
        guidedSnapshot: guidedRecordSnapshot(payload),
        message: safeRecordText(error.message || "AI generation failed", 900),
      });
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "AI generation failed",
      details: error.details || null,
      callRecord: failedCallRecord,
    });
  }
}

async function handleAiTest(req, res) {
  const startedAt = Date.now();
  let payload = null;
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    payload = await readJsonBody(req);
    historyConfig = callHistoryConfig(payload);
    const result = await testProviderConnection(payload);
    const callRecord = addCallHistoryRecord({
      action: "connectivity-test",
      providerId: result.provider || historyConfig.provider,
      provider: result.providerName || historyConfig.name,
      model: result.model || historyConfig.model,
      apiMode: result.apiMode || historyConfig.apiMode,
      callMode: "serverProxy",
      baseUrl: result.baseUrl || historyConfig.baseUrl,
      endpoint: result.endpoint || historyConfig.endpoint,
      temperature: historyConfig.temperature,
      maxOutputTokens: historyConfig.maxOutputTokens,
      status: "success",
      durationMs: result.durationMs || Date.now() - startedAt,
      prompt: "连通性测试",
      message: result.message || result.url || "连通成功",
      usage: result.usage || null,
    });
    sendJson(res, 200, { ok: true, ...result, callRecord });
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addCallHistoryRecord({
        action: "connectivity-test",
        providerId: config.provider,
        provider: config.name,
        model: config.model,
        apiMode: config.apiMode,
        callMode: "serverProxy",
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        status: "failed",
        durationMs: Date.now() - startedAt,
        prompt: "连通性测试",
        message: safeRecordText(error.message || "AI provider test failed", 900),
      });
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "AI provider test failed",
      details: error.details || null,
      callRecord: failedCallRecord,
    });
  }
}

async function handleComponentGenerate(req, res) {
  const startedAt = Date.now();
  let payload = null;
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    payload = await readJsonBody(req);
    historyConfig = callHistoryConfig(payload);
    const result = await callComponentProvider(payload);
    const callRecord = addCallHistoryRecord({
      action: "component-generate",
      providerId: result.provider || historyConfig.provider,
      provider: historyConfig.name,
      model: result.model || historyConfig.model,
      apiMode: historyConfig.apiMode,
      callMode: "serverProxy",
      baseUrl: historyConfig.baseUrl,
      endpoint: historyConfig.endpoint,
      temperature: historyConfig.temperature,
      maxOutputTokens: historyConfig.maxOutputTokens,
      status: "success",
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.prompt),
      message: result.component?.name || "组件生成成功",
      usage: result.usage || null,
    });
    sendJson(res, 200, { ok: true, ...result, library: readComponentLibrary(), callRecord });
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addCallHistoryRecord({
        action: "component-generate",
        providerId: config.provider,
        provider: config.name,
        model: config.model,
        apiMode: config.apiMode,
        callMode: "serverProxy",
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        status: "failed",
        durationMs: Date.now() - startedAt,
        prompt: safeRecordText(payload.prompt),
        message: safeRecordText(error.message || "Component generation failed", 900),
      });
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component generation failed",
      details: error.details || null,
      callRecord: failedCallRecord,
    });
  }
}

async function handleComponentEdit(req, res) {
  const startedAt = Date.now();
  let payload = null;
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    payload = await readJsonBody(req);
    historyConfig = callHistoryConfig(payload);
    const result = await callComponentEditProvider(payload);
    const callRecord = addCallHistoryRecord({
      action: "component-edit",
      providerId: result.provider || historyConfig.provider,
      provider: historyConfig.name,
      model: result.model || historyConfig.model,
      apiMode: historyConfig.apiMode,
      callMode: "serverProxy",
      baseUrl: historyConfig.baseUrl,
      endpoint: historyConfig.endpoint,
      temperature: historyConfig.temperature,
      maxOutputTokens: historyConfig.maxOutputTokens,
      status: "success",
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.instruction || payload.prompt),
      message: result.component?.name || "组件编辑成功",
      usage: result.usage || null,
    });
    sendJson(res, 200, { ok: true, ...result, library: readComponentLibrary(), callRecord });
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addCallHistoryRecord({
        action: "component-edit",
        providerId: config.provider,
        provider: config.name,
        model: config.model,
        apiMode: config.apiMode,
        callMode: "serverProxy",
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        status: "failed",
        durationMs: Date.now() - startedAt,
        prompt: safeRecordText(payload.instruction || payload.prompt),
        message: safeRecordText(error.message || "Component edit failed", 900),
      });
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component edit failed",
      details: error.details || null,
      callRecord: failedCallRecord,
    });
  }
}

async function handleComponentSave(req, res) {
  try {
    const payload = await readJsonBody(req);
    const component = saveComponent(normalizeGeneratedComponent(payload.component || payload, payload));
    sendJson(res, 200, { ok: true, component, library: readComponentLibrary() });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component save failed",
    });
  }
}

async function handleComponentDelete(req, res) {
  try {
    const payload = await readJsonBody(req);
    const result = deleteComponentById(payload.componentId || payload.id);
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component delete failed",
    });
  }
}

async function handleComponentCompose(req, res) {
  const startedAt = Date.now();
  let payload = null;
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    payload = await readJsonBody(req);
    historyConfig = callHistoryConfig(payload);
    const library = readComponentLibrary();
    const requestedIds = new Set(Array.isArray(payload.componentIds) ? payload.componentIds : []);
    const components = requestedIds.size ? library.components.filter((component) => requestedIds.has(component.id)) : library.components;
    const result = await callCompositionProvider({ ...payload, components });
    const callRecord = addCallHistoryRecord({
      action: "component-compose",
      providerId: result.provider || historyConfig.provider,
      provider: historyConfig.name,
      model: result.model || historyConfig.model,
      apiMode: historyConfig.apiMode,
      callMode: "serverProxy",
      baseUrl: historyConfig.baseUrl,
      endpoint: historyConfig.endpoint,
      temperature: historyConfig.temperature,
      maxOutputTokens: historyConfig.maxOutputTokens,
      status: "success",
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.prompt),
      message: result.composition?.name || "组件编排成功",
      usage: result.usage || null,
    });
    sendJson(res, 200, { ok: true, ...result, callRecord });
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addCallHistoryRecord({
        action: "component-compose",
        providerId: config.provider,
        provider: config.name,
        model: config.model,
        apiMode: config.apiMode,
        callMode: "serverProxy",
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        status: "failed",
        durationMs: Date.now() - startedAt,
        prompt: safeRecordText(payload.prompt),
        message: safeRecordText(error.message || "Component composition failed", 900),
      });
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component composition failed",
      details: error.details || null,
      callRecord: failedCallRecord,
    });
  }
}

function handleStatic(req, res, pathname) {
  const safePath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const pathSegments = safePath.split("/").filter(Boolean);
  if (pathSegments.some((segment) => segment.startsWith("."))) {
    sendText(res, 404, "Not found");
    return;
  }

  const filePath = path.normalize(path.join(ROOT_DIR, safePath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[ext] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${PORT}`}`);

  if (req.method === "GET" && requestUrl.pathname === "/api/home-ai/providers") {
    sendJson(res, 200, {
      ok: true,
      providers: Object.fromEntries(
        Object.entries(PROVIDERS).map(([id, provider]) => {
          const config = normalizeProviderConfig({ provider: id });
          return [
            id,
            {
              name: provider.name,
              apiMode: config.apiMode,
              model: config.model,
              baseUrl: config.baseUrl,
              endpoint: config.endpoint,
              keyEnv: provider.keyEnv,
            },
          ];
        }),
      ),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/home-ai/calls") {
    sendJson(res, 200, {
      ok: true,
      records: readCallHistory(),
    });
    return;
  }

  if (req.method === "DELETE" && requestUrl.pathname === "/api/home-ai/calls") {
    writeCallHistory([]);
    sendJson(res, 200, {
      ok: true,
      records: [],
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/complete") {
    await handleAiComplete(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/test") {
    await handleAiTest(req, res);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/home-components/library") {
    sendJson(res, 200, { ok: true, ...readComponentLibrary() });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-components/generate") {
    await handleComponentGenerate(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-components/edit") {
    await handleComponentEdit(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-components/save") {
    await handleComponentSave(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-components/delete") {
    await handleComponentDelete(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-components/compose") {
    await handleComponentCompose(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  handleStatic(req, res, requestUrl.pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  const mockText = process.env.HOME_AI_MOCK === "true" ? " with HOME_AI_MOCK=true" : "";
  console.log(`ForexCRM home AI server running at http://127.0.0.1:${PORT}/${mockText}`);
});
