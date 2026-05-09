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
  "ClientHomeAtoms",
];

const COMPONENT_SIZES = ["1x1", "1x2", "2x1", "2x2", "3x1", "3x2"];

const HOMEPAGE_INTENT_PRESETS = {
  standard: {
    label: "标准工作台",
    layoutPreset: "accountOpsConsole",
    themePreset: "default",
    density: "balanced",
    heroFocus: "asset_summary",
    primaryGoal: "保留资产、资金、快捷操作和交易账号的平衡首页。",
    mustHave: ["balanceTotal", "fundActions", "quickActions", "tradingAccounts"],
    avoid: [],
  },
  asset: {
    label: "资产管理",
    layoutPreset: "accountOpsConsole",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "asset_summary",
    primaryGoal: "突出总资产、多币种钱包、资金状态和账号表现。",
    mustHave: ["balanceTotal", "fundActions", "walletList", "accountPerformance", "riskNotice", "tradingAccounts"],
    avoid: ["adCarousel", "promoHighlight", "referralLink", "quickActions", "openAccountActions", "createAccountForm"],
  },
  growth: {
    label: "活动增长",
    layoutPreset: "magazineCampaign",
    themePreset: "darkTech",
    density: "balanced",
    heroFocus: "ad_carousel",
    primaryGoal: "用活动主视觉、快捷参与和转化入口推动报名、入金和交易。",
    mustHave: ["adCarousel", "quickActions", "promoHighlight", "tradingAccounts"],
    avoid: ["walletList", "createAccountForm"],
  },
  trader: {
    label: "专业交易",
    layoutPreset: "tradingCommand",
    themePreset: "default",
    density: "compact",
    heroFocus: "account_list",
    primaryGoal: "让高频交易入口、账号列表、持仓和表现数据成为首要路径。",
    mustHave: ["quickActions", "accountPerformance", "tradingAccounts", "userKycRail"],
    avoid: ["adCarousel", "promoHighlight", "referralLink", "createAccountForm"],
  },
  onboarding: {
    label: "新客开户",
    layoutPreset: "onboardingJourney",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "onboarding_progress",
    primaryGoal: "引导新客完成 KYC、开户、创建账户和首次入金。",
    mustHave: ["onboardingProgress", "openAccountActions", "createAccountForm", "fundActions", "quickActions", "tradingAccounts"],
    avoid: ["referralLink", "adCarousel"],
  },
  deposit: {
    label: "入金转化",
    layoutPreset: "onboardingJourney",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "fund_actions",
    primaryGoal: "把钱包余额、入金路径、优惠提示和开户后下一步放到前面。",
    mustHave: ["fundActions", "walletBalance", "quickActions", "openAccountActions", "promoHighlight", "tradingAccounts"],
    avoid: ["referralLink"],
  },
  partner: {
    label: "IB 代理",
    layoutPreset: "magazineCampaign",
    themePreset: "blueFinance",
    density: "balanced",
    heroFocus: "referral_link",
    primaryGoal: "优先展示开户链接、邀请码、二维码和渠道转化动作。",
    mustHave: ["referralLink", "adCarousel", "quickActions", "openAccountActions", "promoHighlight", "tradingAccounts"],
    avoid: ["walletList", "createAccountForm"],
  },
  vip: {
    label: "VIP 高净值",
    layoutPreset: "privateWealthDesk",
    themePreset: "blackGold",
    density: "spacious",
    heroFocus: "asset_summary",
    primaryGoal: "建立高净值客户的资金信任、尊贵权益和服务触达。",
    mustHave: ["balanceTotal", "fundActions", "adCarousel", "walletBalance", "openAccountActions", "tradingAccounts"],
    avoid: ["createAccountForm"],
  },
  insight: {
    label: "数据洞察",
    layoutPreset: "tradingCommand",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "account_performance",
    primaryGoal: "把账户表现、账户健康、资金流向和风险结论组织成每日检查流。",
    mustHave: ["accountPerformance", "marketInsight", "balanceTotal", "riskNotice", "fundActions", "tradingAccounts"],
    avoid: ["adCarousel", "referralLink", "createAccountForm"],
  },
  risk: {
    label: "风险保护",
    layoutPreset: "tradingCommand",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "risk_notice",
    primaryGoal: "优先呈现保证金、杠杆、权益波动和账号风险排查。",
    mustHave: ["accountPerformance", "riskNotice", "marketInsight", "balanceTotal", "userKycRail", "tradingAccounts"],
    avoid: ["adCarousel", "promoHighlight", "referralLink", "createAccountForm"],
  },
  retention: {
    label: "留存唤醒",
    layoutPreset: "onboardingJourney",
    themePreset: "minimalWhite",
    density: "balanced",
    heroFocus: "quick_actions",
    primaryGoal: "用账户状态、回流任务、轻权益和快捷入金唤醒沉睡客户。",
    mustHave: ["balanceTotal", "fundActions", "quickActions", "promoHighlight", "marketInsight", "tradingAccounts"],
    avoid: ["referralLink", "createAccountForm"],
  },
  mobile: {
    label: "移动优先",
    layoutPreset: "accountOpsConsole",
    themePreset: "blueFinance",
    density: "compact",
    heroFocus: "asset_summary",
    primaryGoal: "压缩首屏高度，让移动端以单列、短入口和紧凑账号卡片完成核心操作。",
    mustHave: ["balanceTotal", "fundActions", "quickActions", "walletBalance", "tradingAccounts"],
    avoid: ["adCarousel", "promoHighlight", "referralLink", "createAccountForm"],
  },
  brand: {
    label: "白标品牌",
    layoutPreset: "magazineCampaign",
    themePreset: "minimalWhite",
    density: "spacious",
    heroFocus: "ad_carousel",
    primaryGoal: "用品牌主视觉、资金可信度、客户经理服务和开户转化建立成熟券商感。",
    mustHave: ["adCarousel", "balanceTotal", "fundActions", "openAccountActions", "promoHighlight", "tradingAccounts"],
    avoid: ["referralLink", "createAccountForm"],
  },
};

const HOMEPAGE_GOVERNANCE_CONTRACTS = {
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
    positive: ["交易工作台", "专业交易", "高频交易", "mt4", "mt5", "持仓", "订单", "pnl", "交易员", "终端"],
    negative: [/不要.{0,8}(交易工具|持仓|订单)/i],
  },
  onboarding: {
    positive: ["新手", "新客", "刚注册", "开户注册", "开户", "注册", "kyc", "首次", "开户表单", "创建账户", "未实名"],
    negative: [/不要.{0,8}(开户|注册|kyc|表单)/i],
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
    { id: "standard-hero", type: "hero", title: "工作台", slots: ["balanceTotal", "fundActions"] },
    { id: "standard-actions", type: "split", title: "常用操作", slots: ["quickActions"] },
    { id: "standard-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  asset: [
    { id: "asset-overview", type: "hero", title: "资产总览", slots: ["balanceTotal", "fundActions"] },
    { id: "asset-wallets", type: "full", title: "多币种钱包", slots: ["walletList"] },
    { id: "asset-performance", type: "split", title: "账户表现", slots: ["accountPerformance", "riskNotice"] },
    { id: "asset-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  growth: [
    { id: "growth-hero", type: "hero", title: "活动首屏", slots: ["adCarousel"] },
    { id: "growth-actions", type: "split", title: "转化路径", slots: ["quickActions", "promoHighlight", "fundActions"] },
    { id: "growth-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  trader: [
    { id: "trader-tools", type: "hero", title: "交易工具", slots: ["quickActions"] },
    { id: "trader-performance", type: "split", title: "表现与状态", slots: ["accountPerformance", "userKycRail", "balanceTotal"] },
    { id: "trader-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  onboarding: [
    { id: "onboarding-hero", type: "hero", title: "开户路径", slots: ["onboardingProgress", "openAccountActions"] },
    { id: "onboarding-next", type: "split", title: "下一步", slots: ["createAccountForm", "fundActions", "quickActions"] },
    { id: "onboarding-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  deposit: [
    { id: "deposit-hero", type: "hero", title: "入金奖励", slots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"] },
    { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quickActions"] },
    { id: "deposit-accounts", type: "full", title: "账号与趋势", slots: ["accountPerformance", "tradingAccounts"] },
  ],
  partner: [
    { id: "partner-hero", type: "hero", title: "代理增长", slots: ["referralLink"] },
    { id: "partner-tools", type: "split", title: "渠道工具", slots: ["adCarousel", "quickActions", "openAccountActions", "promoHighlight"] },
    { id: "partner-accounts", type: "full", title: "转化账号", slots: ["tradingAccounts"] },
  ],
  vip: [
    { id: "vip-hero", type: "hero", title: "VIP 资产", slots: ["balanceTotal", "fundActions"] },
    { id: "vip-service", type: "split", title: "权益与服务", slots: ["adCarousel", "walletBalance", "openAccountActions"] },
    { id: "vip-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  insight: [
    { id: "insight-hero", type: "hero", title: "账户表现", slots: ["accountPerformance", "marketInsight"] },
    { id: "insight-health", type: "split", title: "健康检查", slots: ["balanceTotal", "riskNotice", "fundActions"] },
    { id: "insight-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
  risk: [
    { id: "risk-hero", type: "hero", title: "风险状态", slots: ["accountPerformance", "riskNotice"] },
    { id: "risk-context", type: "split", title: "账户上下文", slots: ["marketInsight", "balanceTotal", "userKycRail"] },
    { id: "risk-accounts", type: "full", title: "账号排查", slots: ["tradingAccounts"] },
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
    { id: "brand-hero", type: "hero", title: "品牌首屏", slots: ["adCarousel"] },
    { id: "brand-trust", type: "split", title: "信任与转化", slots: ["balanceTotal", "fundActions", "openAccountActions", "promoHighlight"] },
    { id: "brand-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
  ],
};

const HOMEPAGE_FORCE_INTENTS = new Set(["growth", "partner", "deposit", "onboarding", "vip", "insight", "risk", "retention", "mobile", "brand"]);

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

function normalizeGeneratedComponent(component, payload = {}) {
  const source = component && typeof component === "object" ? component : {};
  const family = oneOfList(source.family || payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = oneOfList(source.size || payload.size, COMPONENT_SIZES, "2x1");
  const name = cleanText(source.name, `${family} AI 组件`, 48);
  const id = safeId(source.id || `${family}-${name}-${Date.now().toString(36)}`, "component");
  const now = new Date().toISOString();

  return {
    id,
    type: "ai-generated",
    name,
    family,
    size,
    description: cleanText(source.description, "AI 生成的首页积木组件。", 260),
    tags: (Array.isArray(source.tags) ? source.tags : [family, size]).map((tag) => cleanText(tag, "", 28)).filter(Boolean).slice(0, 8),
    html: sanitizeGeneratedHtml(source.html),
    css: sanitizeGeneratedCss(source.css),
    layoutHints: (Array.isArray(source.layoutHints) ? source.layoutHints : []).map((item) => cleanText(item, "", 120)).filter(Boolean).slice(0, 6),
    dataRequirements: (Array.isArray(source.dataRequirements) ? source.dataRequirements : []).map((item) => cleanText(item, "", 120)).filter(Boolean).slice(0, 6),
    sourcePrompt: cleanText(payload.prompt || source.sourcePrompt, "", 500),
    createdAt: source.createdAt || now,
    updatedAt: now,
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
        .map((item) => normalizeGeneratedComponent(item))
        .filter((item) => item.html && item.css && !generatedComponentTooGeneric(item))
    : [];
  return { components };
}

function saveComponent(component) {
  const library = readComponentLibrary();
  const normalized = normalizeGeneratedComponent(component);
  const nextComponents = library.components.filter((item) => item.id !== normalized.id).concat(normalized);
  writeJsonFile(COMPONENT_LIBRARY_FILE, { components: nextComponents });
  return normalized;
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
      requiredUi: ["Balance", "Equity", "Credit", "PnL 曲线或柱状图"],
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
    "需求:",
    prompt || "生成一个适合默认首页的专业金融组件。",
    "",
    "请返回字段: name, family, size, description, tags, html, css, layoutHints, dataRequirements。",
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
    "不要创建不存在的 componentId。",
    "必须保证资产、资金动作、交易账号、开户路径或开户入口至少有一条清晰路径。",
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
      })),
      [],
    ),
    "",
    "请返回字段: name, summary, layout[{componentId,size,zone,reason}], themeAdvice, polishInstructions。",
  ].join("\n");

  return { system, user };
}

function homepageBrickReference() {
  return {
    rules: [
      "先按业务积木选模块，再用 sections/layout/moduleStyles/moduleSettings 组合，不直接生成 HTML/CSS。",
      "输出可以带 generationMode=brick-v2、brickPlan 和 brickTrace，方便前端解释 AI 如何搭积木。",
      "尺寸语义必须稳定：3x1/3x2 表示 12 栅格整行，2x1/2x2 表示 8 栅格主栏，1x1/1x2 表示 4 栅格侧栏；不要发明 8x2、6*2 等新尺寸。",
      "优先使用舒服的行配方：3x 独占整行；2x + 1x 组成 8+4；2x + 2x 组成 6+6；2x2 + 1x2 组成等高 8+4。",
      "禁止不舒服组合：3x2 大模块和任何模块同行；2x2 旁边只配 1x2，不能配 1x1；列表/表格模块不能使用 1x 尺寸；8 个快捷入口不能使用 1x 尺寸。",
      "TradingAccounts 可以拆成真实账号模块和模拟账号模块；用户要求真实账号卡片、模拟账号列表时必须用 separated + realViewMode=card + demoViewMode=list，且不能显示 Live/Demo tab。",
      "用户要求两个列表或真实/模拟都用列表时，使用 separated + viewMode=list + realViewMode=list + demoViewMode=list。",
      "用户要求模拟账号在真实账号上面、Demo 在 Live 上面时，必须设置 tradingAccounts.demoFirst=true，前端会把 Demo 分区排在 Live 分区上方。",
      "活动增长、交易大赛、奖池、广告轮播首屏核心这类需求优先按 growth 处理，不能被钱包/资产词误判为 asset。",
      "用户明确要求广告轮播独占整栏、单独长模块或首屏大横幅时，adCarousel 必须是首个业务 hero/full-width 模块；如果有 welcome_header，则 welcome_header 只作为轻量首行，adCarousel 紧随其后。",
      "用户要求推广模块单独处理时，使用 ReferralLink/referral_link 单独成块，不要并进广告轮播或赛事看板。",
      "用户要求列表形式、不是卡片时，tradingAccounts.viewMode 必须是 list；但如果同时明确要求真实账号卡片，真实账号必须保持 realViewMode=card。",
      "用户要求快捷入口两行一行四个时，quickActions.count 必须是 8。",
      "用户要求欢迎模块、欢迎区或 welcome 时，保留轻量 welcome_header 首行；它不算业务焦点，不能替代广告、资产或账号模块。",
      "用户要求淡金色、浅金色、轻金色、香槟金、金色调或 gold 时，themePreset 必须优先使用 lightGold；只有明确黑金/VIP/高净值时才使用 blackGold。",
      "活动增长首页如果同时要求欢迎模块独占第一栏、广告轮播首屏核心或独占整栏，推荐顺序是 welcome_header 第一整行、adCarousel 第二整行、quickActions 8 个入口、tradingAccounts 真实卡片 + 模拟列表。",
      "用户只要求创建真实交易账号按钮时，不要新增独立 create_account_form 或右侧开户大面板；按钮应放在真实账号卡片分区标题右侧。",
      "用户要求不要绑定账号入口时，openAccount.bind 必须是 false。",
      "用户要求钱包列表时使用 walletList / wallet_list 积木，并优先渲染为小卡片组，不要只用 WalletBalance 伪装。",
      "资产管理、总资产、多币种钱包列表、账户表现图表这类需求优先按 asset 处理，不能因为出现交易账号列表、图表或专业二字误判为 trader。",
      "资产管理首页默认不要塞广告轮播、推广链接、开户清单或第二组快捷矩阵；除非用户明确要求广告、推广或快捷入口，否则只保留总资产、入金出金、多币种钱包、账户表现、风险提示和交易账号列表。",
      "用户要求未完成实名、刚注册、新用户待 KYC、KYC 待完成时，必须设置 userKycRail.kycStatus=pending，并保留 onboardingProgress 或 userKycRail 可见。",
      "用户要求具体快捷入口名称时，必须把入口 id 写入 quickActions.actions；可用 id 包含 openAccount、openReal、deposit、withdraw、transfer、orders、positions、contest、eventSignup、referral、inviteFriends、viewCommission、downloadMaterial、contactService、downloadMt5、risk。",
      "用户要求多币种钱包时必须设置 assets.wallets 并保留 walletList；只有明确要求可用资金、风险等级或保证金占用时才设置 showAvailable/showRiskLevel/showMargin。",
      "正式用户端首页不能露出积木尺寸、名称或选择理由；这些信息只能放在数据结构和调试属性里。",
      "积木编排必须自动填充可用栅格，避免空白 section、空 slots、不可渲染模块和孤立小积木造成的大面积留白。",
      "桌面端一行可以放两个业务积木；同一行的两个积木必须合计 12 栅格并保持等高，不能出现 8 栅格内容旁边空 4 栅格的版面。",
      "不要默认让每个模块都独占一整栏；只有当管理员明确说独占、整栏、长模块、首屏大横幅或该模块本身是 3x 大列表时，才让它单独成行。",
      "先遵守 pageIntent.governance：一个页面只能有一个主目标，一个主操作，一个次操作；相同动作不要因为多个积木都相关而反复放大。",
      "入金转化页必须使用 promoBanner.depositLadder 承接 $500/$2,000/$10,000 三档奖励和最高赠金 $300；首屏组合为 promoHighlight + walletBalance + fundActions + openAccountActions。",
      "入金转化页的出金只能作为弱入口，不要与入金并列反复出现；QuickActions 命名为快捷入口，且必须早于账号区。",
      "入金转化页不要再把资产总览、钱包列表、资金 Dock、快捷入口都重复做成大按钮区域；复杂图表只允许放到账号区做轻量趋势。",
    ],
    layoutGrammar: {
      sizeMap: {
        "3x1": "12 栅格整行，适合欢迎、广告轮播、横向资产指标、长链接控制台。",
        "3x2": "12 栅格整行且高度更高，适合账号列表、钱包列表、大型表格。",
        "2x1": "8 栅格主栏短模块，适合快捷矩阵、活动看板、紧凑资产。",
        "2x2": "8 栅格主栏高模块，适合账号卡片、表现图表、工作台。",
        "1x1": "4 栅格短侧栏，适合资金操作、钱包摘要、状态小卡。",
        "1x2": "4 栅格高侧栏，适合开户面板、KYC 侧栏、创建账户表单。",
      },
      rowPatterns: [
        "3x1 或 3x2 独占一整行。",
        "2x1 + 1x1 组成 8+4 短行。",
        "2x2 + 1x2 组成 8+4 高行。",
        "2x1 + 2x1 允许组成 6+6 双主栏。",
      ],
      moduleSizing: [
        "TradingAccounts: separated、任一列表视图、真实卡片+模拟列表时必须 size=3x2 zone=full。",
        "TradingAccounts: 只有 combined card 且不含模拟列表时才可 size=2x2 zone=main，并且旁边只能配 1x2 侧栏。",
        "QuickActions: count=8 必须 size=2x1 或 3x1；不能放 1x1/1x2。",
        "AdCarousel: 首屏核心或独占整栏时必须 size=3x1 zone=hero/full。",
        "WalletList 和长表格必须 size=3x2 zone=full。",
      ],
      recipes: [
        "活动增长: welcome_header 3x1, adCarousel 3x1, quickActions 2x1 + promo/referral 1x1, tradingAccounts 3x2。",
        "资产工作台: assetSummary 2x2 + fundActions 1x1, walletList 3x2, accountPerformance 2x2 + riskNotice 1x2, tradingAccounts 3x2。",
        "专业交易: tradingAccounts 2x2 + accountPerformance/userKycRail 1x2, quickActions 2x1 + walletBalance 1x1。",
      ],
      forbidden: [
        "不要输出 2x2 + 1x1。",
        "不要输出 3x2 + 任何同行模块。",
        "不要把 account_list、wallet_list、表格类模块放进 1x 尺寸。",
        "不要把 adCarousel 和 tradingAccounts 放在同一行。",
        "不要连续输出 3 个以上 3x 大模块，除非管理员明确要求每个模块独占整栏。",
      ],
    },
    bricks: [
      { id: "assetOverview.assetCommand", mapsTo: "asset_summary/balanceTotal", use: "资产管理首页、总资产、可用资金、保证金和风险等级" },
      { id: "assetOverview.vipHero", mapsTo: "asset_summary/balanceTotal", use: "高净值资产首屏、总资产、资金信任" },
      { id: "assetOverview.compactMetrics", mapsTo: "asset_summary/balanceTotal", use: "紧凑资产指标条、低高度资产信息" },
      { id: "assetOverview.tickerStrip", mapsTo: "asset_summary/balanceTotal", use: "账户运营控制台、横向资产 ticker 指标" },
      { id: "assetOverview.wealthPlate", mapsTo: "asset_summary/balanceTotal", use: "私行服务台、高净值资产桌牌" },
      { id: "assetOverview.riskRadar", mapsTo: "asset_summary/balanceTotal", use: "风险雷达、保证金和账户健康" },
      { id: "fundActions.priorityDock", mapsTo: "fund_actions/fundActions", use: "入金、出金独立操作 Dock" },
      { id: "quickActions.actionDock", mapsTo: "quick_actions/quickActions", use: "专业交易快捷入口" },
      { id: "quickActions.priorityMatrix", mapsTo: "quick_actions/quickActions", use: "8 个快捷入口、两行四个、活动转化矩阵" },
      { id: "quickActions.commandBar", mapsTo: "quick_actions/quickActions", use: "交易指挥中心命令栏、高频操作" },
      { id: "quickActions.taskRail", mapsTo: "quick_actions/quickActions", use: "新客旅程、留存任务、下一步按钮组" },
      { id: "adCarousel.heroCampaign", mapsTo: "ad_carousel/adCarousel", use: "首页广告轮播、活动主视觉" },
      { id: "adCarousel.editorialCover", mapsTo: "ad_carousel/adCarousel", use: "杂志封面型活动首页、专题 Campaign" },
      { id: "promoBanner.scoreboard", mapsTo: "promo_banner/promoHighlight", use: "赛事活动看板、奖池、倒计时、活动 CTA" },
      { id: "promoBanner.depositLadder", mapsTo: "promo_banner/promoHighlight", use: "入金转化页、$500/$2,000/$10,000 三档奖励、最高赠金 $300" },
      { id: "referralLink.growthConsole", mapsTo: "referral_link/referralLink", use: "IB/渠道开户链接、邀请码、转化统计" },
      { id: "onboardingProgress.checklist", mapsTo: "onboarding_progress/onboardingProgress", use: "KYC、开户、首次入金任务" },
      { id: "onboardingProgress.timeline", mapsTo: "onboarding_progress/onboardingProgress", use: "新客旅程时间线、下一步路径" },
      { id: "openAccount.sidePanel", mapsTo: "open_account_panel/openAccountActions", use: "开真实、开模拟、绑定账号右侧面板" },
      { id: "openAccount.conversionPanel", mapsTo: "open_account_panel/openAccountActions", use: "开户转化面板、首存路径" },
      { id: "userKycRail.profileWallet", mapsTo: "user_kyc_rail/userKycRail", use: "用户、KYC、当地时间、钱包摘要" },
      { id: "accountPerformance.proChart", mapsTo: "account_performance/accountPerformance", use: "账号余额、权益、PnL 图表" },
      { id: "accountPerformance.sparklineBoard", mapsTo: "account_performance/accountPerformance", use: "交易指挥中心、多趋势 Sparkline 看板" },
      { id: "tradingAccounts.separatedList", mapsTo: "account_list/tradingAccounts", use: "真实/模拟账号分区列表" },
      { id: "tradingAccounts.cardProof", mapsTo: "account_list/tradingAccounts", use: "紧凑真实账号卡片、活动页账号证明" },
      { id: "walletList.currencyTable", mapsTo: "wallet_list/walletList", use: "多币种钱包表格" },
      { id: "walletList.tiles", mapsTo: "wallet_list/walletList", use: "钱包磁贴组、多币种运营控制台" },
      { id: "createAccountForm.realAccount", mapsTo: "create_account_form/createAccountForm", use: "真实账户创建表单" },
      { id: "riskNotice.marginGuard", mapsTo: "risk_notice/riskNotice", use: "保证金、杠杆、风险等级提示" },
    ],
  };
}

function buildMiniMaxPrompt(payload) {
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const intentProfile = buildHomepageIntentProfile(prompt);
  const system = [
    "你是 ForexCRM 首页蓝图生成器。",
    "只输出一个能被 JSON.parse 解析的紧凑 JSON object。",
    "不要 markdown、不要代码块、不要解释、不要 <think>、不要注释。",
    "输出必须短，禁止返回 layout、props、schema、默认配置、HTML、CSS、JS。",
    "必须返回 generationMode=\"brick-v2\"、blueprintVersion=5、brickPlan 和 brickTrace。",
    "必须使用白名单枚举值；未知需求用最接近的白名单值承接。",
    "首页必须按响应式 auto layout 思路编排：首屏、主内容、侧栏和整行模块要自然填满栅格，移动端能降级单列。",
    "禁止空 section、空 slots、禁用模块占位、孤立小积木独占大行，不能出现东缺一块西缺一块的空白区块。",
    "桌面端允许一行两个积木；同行两个积木必须配满 12 栅格并等高，禁止 8/12 内容右侧留空。",
    "必须遵守 brickReference.layoutGrammar：3x=整行、2x=主栏、1x=侧栏；只能使用 3x 独占、2x+1x、2x+2x 这些稳定组合。",
    "账号、钱包列表、表格、8 个快捷入口、首屏轮播属于高风险模块，必须按 layoutGrammar.moduleSizing 选择 size 和 zone。",
    "如果布局美观度和模块数量冲突，优先保证行配方完整、同高、少空白，再减少辅助模块。",
    "必须先遵守服务端提供的 pageIntent。",
    "pageIntent.primaryIntent 决定首页主目标。",
    "secondaryIntents 只能作为辅助模块，不能抢首屏。",
    "pageIntent.mustHave 必须尽量出现在 sections 或由同类模块承接。",
    "pageIntent.avoid 没有明确需求时不要出现。",
    "pageIntent.governance 是页面生成契约：先判断主目标、主操作、次操作、首屏槽位、弱化模块，再选择积木。",
    "所有页面都必须做 CTA 去重：主操作不要在资产卡、钱包卡、资金 Dock、快捷入口里同时放大；必要时只保留一个主 CTA 和一个轻量快捷入口。",
    "入金转化页必须把 promoBanner.depositLadder、walletBalance、fundActions、openAccountActions 放进首屏；quickActions 必须紧跟首屏并命名为快捷入口；tradingAccounts/accountPerformance 下移承接。",
    "入金转化页必须弱化出金、复杂图表、钱包长列表和资产总览；禁止把入金/出金按钮铺满半屏。",
    "模型返回必须包含 pageIntent；如果 pageIntent 与管理员需求有冲突，仍以服务端识别结果为准。",
    "必须先选择 designGenome 和 pageStory，再选择积木：magazineCampaign=活动专题封面，tradingCommand=交易指挥中心，onboardingJourney=新客旅程，privateWealthDesk=私行服务台，accountOpsConsole=账户运营控制台。",
    "组件形态不能都用普通卡片；必须通过 modules/moduleStyles/componentMorphs 体现至少 3 个不同模块形态。",
    "brickPlan、brickTrace、brickName、brickReason 只供系统调试，不是用户端页面可见内容。",
  ].join("\n");

  const contract = {
    pageIntent: intentProfile,
    brickReference: homepageBrickReference(),
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
      heroFocus: ["asset_summary", "ad_carousel", "promo_banner", "fund_actions", "quick_actions", "open_account_panel", "onboarding_progress", "account_list", "referral_link", "user_kyc_rail", "account_performance", "wallet_list", "create_account_form", "wallet_balance", "risk_notice", "copytrading_summary"],
      sectionType: ["hero", "split", "full", "rail"],
      sectionSlots: [
        "balanceTotal",
        "walletBalance",
        "fundActions",
        "openAccountActions",
        "onboardingProgress",
        "promoHighlight",
        "adCarousel",
        "quickActions",
        "referralLink",
        "tradingAccounts",
        "userKycRail",
        "accountPerformance",
        "walletList",
        "createAccountForm",
        "marketInsight",
        "riskNotice",
      ],
      moduleVariants: {
        AssetOverview: ["standard", "vipHero", "compactTable", "darkTerminal", "tickerStrip", "wealthPlate", "riskRadar"],
        WalletBalance: ["standard", "splitCurrency", "compact", "premiumCard"],
        FundActions: ["dock", "splitButtons", "compactRow"],
        QuickActions: ["gridCards", "actionDock", "priorityButtons", "minimalIcons", "commandBar", "taskRail"],
        PromotionBanner: ["imageBanner", "gradientHero", "blackGoldVip", "splitVisual", "editorialCover", "depositLadder"],
        ReferralLink: ["console", "linkFirst", "compact"],
        TradingAccounts: ["workbench", "separatedList", "denseCards", "calmTable", "accountWall", "opsTable"],
        OpenAccount: ["sidePanel", "inlineActions", "softCard", "conversionPanel"],
        OnboardingProgress: ["path", "checklist", "compact", "journeyTimeline"],
        UserKycRail: ["profileWallet", "kycChecklist", "compactStatus"],
        AccountPerformance: ["proChart", "terminalChart", "cleanSnapshot", "sparklineBoard"],
        WalletList: ["currencyTable", "compactRows", "actionTable", "walletTiles"],
        CreateAccountForm: ["realAccountForm", "compactForm", "guidedForm"],
      },
      moduleStyles: {
        balanceTotal: ["command", "metric-strip", "quiet-card", "ticker-strip", "wealth-plate", "risk-radar"],
        fundActions: ["dock", "split-buttons", "compact-row"],
        openAccountActions: ["stacked", "horizontal", "soft-card", "conversion-panel"],
        onboardingProgress: ["path", "checklist", "compact", "journey-timeline"],
        promoHighlight: ["banner", "clean", "scoreboard", "deposit-ladder"],
        adCarousel: ["immersive", "clean", "compact", "editorial-cover"],
        quickActions: ["matrix", "toolbar", "compact-grid", "command-bar", "task-rail"],
        referralLink: ["console", "link-first", "compact"],
        tradingAccounts: ["workbench", "dense-cards", "calm-table", "account-wall", "ops-table"],
        accountPerformance: ["pro-chart", "terminal-chart", "sparkline-board"],
        walletList: ["currency-table", "wallet-tiles"],
      },
      emphasis: ["low", "medium", "high"],
    },
    rules: [
      "sections 只返回 3 到 5 个，每个为 {id,type,title,slots}，slots 只能使用 sectionSlots。",
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
      "活动增长首页如果同时要求欢迎模块独占第一栏、广告轮播首屏核心或独占整栏，brickPlan 第一业务积木优先使用 adCarousel.editorialCover 且 zone=hero；sections 第一项只放 adCarousel，第二项放 quickActions，账号项放 tradingAccounts；欢迎首行由前端自动补齐。",
      "用户只要求创建真实交易账号按钮时，不要返回 create_account_form/open_account_panel 作为独立模块；创建按钮由真实账号分区承接。",
      "不要绑定账号入口时，moduleSettings.openAccount.bind 必须为 false。",
      "入金/出金出现时，emphasis.deposit 使用 high，且 assets.showFundActions 为 true。",
      "入金转化页必须返回 PromotionBanner.variant=depositLadder、moduleStyles.promoHighlight=deposit-ladder、quickActions.actions=[transfer,orders,positions,contactService]、openAccount.bind=false、openAccount.demo=false；入金和开真实账号已经由首屏资金操作区承接，不要在快捷入口重复。",
      "活动增长页必须让 quickActions.actions 包含 eventSignup；专业交易页必须让 quickActions.actions 包含 switchAccount，并优先承接 orders、positions、downloadMt5。",
      "只有明确出现刚注册、新用户、新客、未完成实名、没有完成实名、KYC 待完成、待 KYC、未实名时，moduleSettings.userKycRail.kycStatus 才能为 pending；仅提到 KYC 状态、KYC 侧栏、认证状态时必须保持 verified。",
      "quickActions.actions 只能使用这些 id：openAccount、openReal、deposit、withdraw、transfer、orders、positions、contest、eventSignup、referral、inviteFriends、viewCommission、downloadMaterial、contactService、downloadMt5、switchAccount、kyc、risk；不要发明 switchAccount 以外的 switch 类 id，也不要返回 kycStatus。",
      "IB/代理/渠道增长首页的 quickActions.actions 必须按提示返回具体入口 id，例如 inviteFriends、eventSignup、viewCommission、downloadMaterial、deposit、openReal、contactService。",
      "多币种钱包需求必须返回 assets.wallets 并把 walletList 放进 sections；风险等级、保证金占用、可用资金只在用户明确要求时开启对应字段。",
      "资产管理首页必须使用 designGenome=accountOpsConsole、layoutPreset=accountOpsConsole、themePreset=blueFinance；sections 推荐为 balanceTotal+fundActions、walletList、accountPerformance+riskNotice、tradingAccounts；没有明确广告/推广/快捷入口时 adCarousel、referral、quickActions 都不要出现。",
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
      heroFocus: "asset_summary",
      brickPlan: [
        { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏承接资产与资金信任。" },
        { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "让入金出金成为独立高频操作。" },
        { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "保留核心账号管理路径。" },
      ],
      brickTrace: { intent: "standard", strategy: "AI 积木编排", score: 86, selectedCount: 3, source: "model" },
      sections: [{ id: "overview", type: "hero", title: "账户总览", slots: ["balanceTotal", "fundActions"] }],
      modules: {
        AssetOverview: { variant: "standard" },
        WalletBalance: { variant: "standard" },
        QuickActions: { variant: "gridCards" },
        PromotionBanner: { variant: "imageBanner" },
      },
      moduleStyles: {
        balanceTotal: "command",
        fundActions: "split-buttons",
        adCarousel: "clean",
        quickActions: "matrix",
        referralLink: "compact",
        tradingAccounts: "workbench",
      },
      moduleSettings: {
        adCarousel: { enabled: true },
        quickActions: { enabled: true, count: 7, display: "iconText", actions: ["openAccount", "deposit", "withdraw", "transfer", "orders", "positions", "contest"] },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: { enabled: true, showFundActions: true, showAvailable: false, showMargin: false, showRiskLevel: false, wallets: [] },
        referral: { enabled: true },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "switchable", realViewMode: "card", demoViewMode: "list", demoFirst: false },
        openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "insideTradingAccounts" },
        userKycRail: { kycStatus: "verified" },
        riskNotice: { enabled: true },
      },
      emphasis: { deposit: "high", openAccount: "medium", promo: "medium", accounts: "medium" },
      aiSummary: "一句话说明方案",
    },
  };

  const user = [
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
    "",
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
  const intentProfile = buildHomepageIntentProfile(prompt);

  const system = [
    "你是 ForexCRM 的首页蓝图生成器。",
    "你的任务是把管理员的中文需求转换成安全的首页配置 JSON。",
    "只能返回一个 JSON object，不要 markdown，不要解释，不要生成 HTML/CSS/JS。",
    "配置必须围绕已有业务积木：资产、钱包、资金 Dock、开户、开户进度、活动广告、快捷入口、邀请链接、交易账号、用户/KYC 侧栏、账号表现图表、钱包列表、创建账户表单。",
    "不要删除核心业务能力；如果隐藏某模块，必须让相关能力被其他模块承接。",
    "开户动作必须保留真实账号、模拟账号、绑定账号三类可配置动作。",
    "入金、出金如果出现，应作为高可见操作。",
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
    "pageIntent.primaryIntent 决定首页主目标。",
    "secondaryIntents 只能作为辅助模块，不能抢首屏。",
    "pageIntent.mustHave 必须尽量出现在 sections 或由同类模块承接。",
    "pageIntent.avoid 没有明确需求时不要出现。",
    "pageIntent.governance 是页面生成契约：先判断主目标、主操作、次操作、首屏槽位、弱化模块，再选择积木。",
    "所有页面都必须做 CTA 去重：主操作不要在资产卡、钱包卡、资金 Dock、快捷入口里同时放大；必要时只保留一个主 CTA 和一个轻量快捷入口。",
    "入金转化页必须把 promoBanner.depositLadder、walletBalance、fundActions、openAccountActions 放进首屏；quickActions 必须紧跟首屏并命名为快捷入口；tradingAccounts/accountPerformance 下移承接。",
    "入金转化页必须弱化出金、复杂图表、钱包长列表和资产总览；禁止把入金/出金按钮铺满半屏。",
    "模型返回必须包含 pageIntent；如果 pageIntent 与管理员需求有冲突，仍以服务端识别结果为准。",
    "必须先选择 designGenome 和 pageStory，再选择积木：magazineCampaign=活动专题封面，tradingCommand=交易指挥中心，onboardingJourney=新客旅程，privateWealthDesk=私行服务台，accountOpsConsole=账户运营控制台。",
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
    "如果管理员给出快捷入口名称，必须返回 moduleSettings.quickActions.actions，使用入口 id 而不是泛化默认入口；可用 id 包含 openAccount、openReal、deposit、withdraw、transfer、orders、positions、contest、eventSignup、referral、inviteFriends、viewCommission、downloadMaterial、contactService、downloadMt5、switchAccount、kyc、risk；不要发明 kycStatus。",
    "如果管理员要求活动增长、交易大赛、奖池，并明确要求广告轮播独占整栏、单独长模块或首屏大横幅，必须把 adCarousel 作为第一个业务 full-width hero 模块；如果有 welcome_header，adCarousel 紧跟在 welcome_header 后面，heroFocus 使用 ad_carousel。",
    "如果管理员要求欢迎模块、欢迎区或 welcome，保留轻量 welcome_header 首行；welcome 只提供用户上下文和个性化入口，不改变业务 heroFocus。",
    "如果管理员要求淡金色、浅金色、轻金色、香槟金、金色调或 gold，themePreset 必须使用 lightGold，并通过 density/moduleStyles 做扁平、轻量、低阴影表达；只有明确黑金/VIP/高净值才使用 blackGold。",
    "如果管理员要求欢迎模块独占第一栏，layout 中必须包含 welcome_header 作为第一个 12 栅格轻量整行；它不能改变 heroFocus，heroFocus 仍应指向广告轮播等业务核心。",
    "如果管理员要求活动增长、交易大赛、奖池，并明确要求广告轮播首屏核心、独占整栏、单独长模块或首屏大横幅，必须把 adCarousel 放在 welcome_header 之后的第一个业务 full-width hero 模块，heroFocus 使用 ad_carousel，不能用欢迎卡、资产卡、快捷入口或开户面板抢首屏。",
    "如果管理员只要求创建真实交易账号按钮，不要返回 create_account_form 或 open_account_panel 独立模块；创建按钮应该由 tradingAccounts 真实账号分区承接。",
    "如果管理员要求推广模块单独处理，必须保留 referralLink/referral_link 独立 section；赛事活动看板 promoHighlight 不能替代推广链接模块。",
    "如果管理员要求钱包列表小卡片，必须使用 walletList/wallet_list，wallet.placement = \"standalone\"。",
    "如果管理员要求多币种钱包，必须设置 moduleSettings.assets.wallets 并把 walletList 放进 sections；只有明确要求风险等级、保证金占用或可用资金时，才开启 showRiskLevel、showMargin、showAvailable。",
    "资产管理、总资产、多币种钱包列表、账户表现图表需求必须按 accountOpsConsole + blueFinance 处理，推荐 sections 为 balanceTotal+fundActions、walletList、accountPerformance+riskNotice、tradingAccounts；没有明确广告/推广/快捷入口时不要返回 adCarousel、referralLink、quickActions。",
    "只有管理员明确描述刚注册、新用户、新客、未实名、没有完成 KYC、待 KYC 时，才设置 moduleSettings.userKycRail.kycStatus = \"pending\"；仅要求 KYC 状态、KYC 侧栏或认证状态时保持 \"verified\"。",
    "如果管理员要求不要绑定账号入口，必须设置 moduleSettings.openAccount.bind = false。",
    "优先使用传入 schema、默认配置、模块变体和模块样式中的白名单值。",
    "返回字段建议包括 schemaVersion、blueprintVersion、generationMode、pageIntent、designGenome、pageStory、name、layoutPreset、themePreset、density、heroFocus、sections、layout、modules、moduleStyles、componentMorphs、moduleSettings、brickPlan、brickTrace、emphasis、aiSummary。",
  ].join("\n");

  const user = [
    `当前时间: ${now}`,
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
    "",
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
      brickReference: homepageBrickReference(),
      bricks: context.bricks,
      features: context.features,
      moduleVariantOptions: context.moduleVariantOptions,
      moduleStyleOptions: context.moduleStyleOptions,
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

  const fallback = !ranked.length || ranked[0].score <= 0;
  const primaryIntent = fallback ? "standard" : ranked[0].intent;
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
    brand: { designGenome: "magazineCampaign", pageStory: "campaignLaunch", layoutPreset: "magazineCampaign" },
    trader: { designGenome: "tradingCommand", pageStory: "tradingEfficiency", layoutPreset: "tradingCommand" },
    insight: { designGenome: "tradingCommand", pageStory: "tradingEfficiency", layoutPreset: "tradingCommand" },
    risk: { designGenome: "tradingCommand", pageStory: "tradingEfficiency", layoutPreset: "tradingCommand" },
    onboarding: { designGenome: "onboardingJourney", pageStory: "accountActivation", layoutPreset: "onboardingJourney" },
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
      { id: "insight-health", type: "split", title: "健康检查", slots: ["balanceTotal", "riskNotice", "fundActions"] },
      { id: "insight-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    deposit: [
      { id: "deposit-hero", type: "hero", title: "入金奖励", slots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"] },
      { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quickActions"] },
      { id: "deposit-accounts", type: "full", title: "账号与趋势", slots: ["accountPerformance", "tradingAccounts"] },
    ],
    risk: [
      { id: "risk-hero", type: "hero", title: "风险状态", slots: ["accountPerformance", "riskNotice"] },
      { id: "risk-context", type: "split", title: "账户上下文", slots: ["marketInsight", "balanceTotal", "userKycRail"] },
      { id: "risk-accounts", type: "full", title: "账号排查", slots: ["tradingAccounts"] },
    ],
    onboarding: [
      { id: "onboarding-hero", type: "hero", title: "开户路径", slots: ["onboardingProgress", "openAccountActions"] },
      { id: "onboarding-next", type: "split", title: "下一步", slots: ["createAccountForm", "fundActions", "quickActions"] },
      { id: "onboarding-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    growth: [
      ...(wantsWelcome ? [{ id: "growth-welcome", type: "hero", title: "欢迎", slots: ["balanceTotal"] }] : []),
      { id: "growth-hero", type: "hero", title: "活动首屏", slots: ["adCarousel"] },
      { id: "growth-actions", type: "split", title: "转化路径", slots: ["quickActions", "promoHighlight", "fundActions"] },
      ...(wantsWalletList ? [{ id: "growth-wallets", type: "full", title: "钱包列表", slots: ["walletList"] }] : []),
      { id: "growth-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts", "referralLink"] },
    ],
    partner: [
      { id: "partner-hero", type: "hero", title: "代理增长", slots: ["referralLink"] },
      { id: "partner-tools", type: "split", title: "渠道工具", slots: ["adCarousel", "quickActions", "openAccountActions", "promoHighlight"] },
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
      { id: "brand-hero", type: "hero", title: "品牌首屏", slots: ["adCarousel"] },
      { id: "brand-trust", type: "split", title: "信任与转化", slots: ["balanceTotal", "fundActions", "openAccountActions", "promoHighlight"] },
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
  const intentProfile = buildHomepageIntentProfile(rawPrompt);
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
  const wantsDemoAccountList = /模拟(?:交易)?账(?:号|户)(?:列表)?|demo\s*(account\s*)?list/i.test(String(payload.prompt || ""));
  const wantsMixedAccountPresentation = wantsRealAccountCards && wantsDemoAccountList;
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
    { brickId: "riskNotice.marginGuard", brickName: "保证金风险提示", family: "RiskNotice", feature: "riskNotice", component: "risk_notice", size: "1x2", zone: "rail", reason: "把保证金、杠杆和风险等级放到侧栏提醒。" },
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
      { brickId: "riskNotice.marginGuard", brickName: "保证金风险提示", family: "RiskNotice", feature: "riskNotice", component: "risk_notice", size: "1x2", zone: "rail", reason: "风险和保证金作为洞察结论。" },
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
      { brickId: "riskNotice.marginGuard", brickName: "保证金风险提示", family: "RiskNotice", feature: "riskNotice", component: "risk_notice", size: "1x2", zone: "rail", reason: "保证金和风险等级需要首屏提醒。" },
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
    growth: [
      { brickId: "adCarousel.editorialCover", brickName: "专题封面轮播", family: "PromotionBanner", feature: "adCarousel", component: "ad_carousel", size: "3x1", zone: "hero", reason: "活动增长首页把交易大赛和奖池作为专题封面。" },
      { brickId: "quickActions.priorityMatrix", brickName: "转化快捷矩阵", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "保留 8 个快捷入口承接参与、入金和账号操作。" },
      { brickId: "promoBanner.scoreboard", brickName: "赛事活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "把奖池、倒计时和活动 CTA 从轮播里拆成独立活动看板。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "活动转化承接入金。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "main", reason: "账号作为活动参与证明。" },
      { brickId: "referralLink.growthConsole", brickName: "邀请增长控制台", family: "ReferralLink", feature: "referralLink", component: "referral_link", size: "3x1", zone: "full", reason: "推广模块单独展示开户链接、邀请码和二维码。" },
    ],
    partner: [
      { brickId: "referralLink.growthConsole", brickName: "邀请增长控制台", family: "ReferralLink", feature: "referralLink", component: "referral_link", size: "3x1", zone: "hero", reason: "IB 首页优先展示注册链接和邀请数据。" },
      { brickId: "adCarousel.editorialCover", brickName: "专题封面轮播", family: "PromotionBanner", feature: "adCarousel", component: "ad_carousel", size: "3x1", zone: "full", reason: "活动作为渠道素材曝光。" },
      { brickId: "openAccount.sidePanel", brickName: "右侧开户操作台", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开户注册动作靠前。" },
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
      { brickId: "adCarousel.editorialCover", brickName: "品牌专题封面", family: "PromotionBanner", feature: "adCarousel", component: "ad_carousel", size: "3x1", zone: "hero", reason: "白标品牌首页先建立可信度。" },
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "full", reason: "资金安全作为品牌背书。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "入金出金保持可达。" },
      { brickId: "openAccount.sidePanel", brickName: "右侧开户操作台", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开户转化靠前但不破坏品牌感。" },
      { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x1", zone: "main", reason: "主推活动作为品牌运营内容。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "2x2", zone: "main", reason: "账号信息作为可信证明。" },
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
    risk: ["AI 风险指挥中心", design.layoutPreset, "blueFinance", "compact", "risk_notice", "风险提醒首页：保证金、权益波动、账户健康和账号列表形成风控视图。"],
    onboarding: ["AI 新客旅程首页", design.layoutPreset, "blueFinance", "compact", "onboarding_progress", "新客开户首页：KYC、开户、首次入金和创建账号路径靠前。"],
    growth: ["AI 活动专题封面", design.layoutPreset, wantsClear ? "blueFinance" : wantsGold ? "lightGold" : "darkTech", "balanced", "ad_carousel", "活动增长首页：广告轮播、快捷矩阵和赛事看板承接转化。"],
    partner: ["AI 渠道专题封面", design.layoutPreset, "blueFinance", "balanced", "referral_link", "IB 代理首页：开户链接、邀请码、二维码和转化数据靠前。"],
    retention: ["AI 留存旅程首页", design.layoutPreset, "minimalWhite", "balanced", "quick_actions", "留存唤醒首页：账户状态、召回任务、快捷入金和温和权益提示。"],
    mobile: ["AI 轻量运营台", design.layoutPreset, "blueFinance", "compact", "asset_summary", "移动优先首页：单列、轻量、短入口和紧凑账号卡片。"],
    brand: ["AI 品牌专题封面", design.layoutPreset, "minimalWhite", "spacious", "ad_carousel", "白标品牌首页：品牌可信、资金安全、活动和开户转化靠前。"],
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
    personalizationStrength: isVip || isGrowth ? "strong" : "medium",
    heroFocus: meta[4],
    brickPlan: plan,
    brickTrace: { intent, strategy: meta[0].replace(/^AI\s*/, ""), score: 90, selectedCount: plan.length, source: "mock" },
    sections: isAsset
      ? [
          { id: "asset-overview", type: "hero", title: "资产总览", slots: ["balanceTotal", "fundActions"] },
          { id: "asset-wallets", type: "full", title: "多币种钱包", slots: ["walletList"] },
          { id: "asset-performance", type: "split", title: "账户表现", slots: ["accountPerformance", "riskNotice"] },
          { id: "asset-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
        ]
      : mockSectionsForIntent(intent, plan, wantsWelcome, wantsWalletList),
    modules: {
      AssetOverview: { variant: isVip ? "wealthPlate" : isTrader ? "darkTerminal" : isAsset ? "tickerStrip" : "standard" },
      WalletBalance: { variant: isVip ? "premiumCard" : "splitCurrency" },
      QuickActions: { variant: intent === "deposit" ? "taskRail" : design.designGenome === "tradingCommand" ? "commandBar" : design.designGenome === "onboardingJourney" ? "taskRail" : isGrowth || intent === "retention" ? "priorityButtons" : "actionDock" },
      PromotionBanner: { variant: intent === "deposit" ? "depositLadder" : design.designGenome === "magazineCampaign" ? "editorialCover" : isVip ? "blackGoldVip" : isGrowth || isPartner ? "gradientHero" : "splitVisual" },
      AccountPerformance: { variant: intent === "deposit" ? "cleanSnapshot" : design.designGenome === "tradingCommand" ? "sparklineBoard" : intent === "insight" ? "cleanSnapshot" : "proChart" },
      WalletList: { variant: design.designGenome === "accountOpsConsole" ? "walletTiles" : "currencyTable" },
      TradingAccounts: { variant: intent === "deposit" ? "accountWall" : design.designGenome === "magazineCampaign" ? "accountWall" : design.designGenome === "tradingCommand" ? "opsTable" : isAsset || isTrader ? "separatedList" : "denseCards" },
      OpenAccount: { variant: intent === "deposit" || design.designGenome === "onboardingJourney" ? "conversionPanel" : "sidePanel" },
      OnboardingProgress: { variant: design.designGenome === "onboardingJourney" ? "journeyTimeline" : "checklist" },
    },
    moduleStyles: {
      balanceTotal: isVip ? "wealth-plate" : design.designGenome === "tradingCommand" ? "ticker-strip" : isAsset ? "ticker-strip" : "command",
      fundActions: "split-buttons",
      openAccountActions: intent === "deposit" || design.designGenome === "onboardingJourney" ? "conversion-panel" : "horizontal",
      onboardingProgress: design.designGenome === "onboardingJourney" ? "journey-timeline" : isGrowth ? "checklist" : "path",
      promoHighlight: intent === "deposit" ? "deposit-ladder" : isGrowth ? "scoreboard" : "clean",
      adCarousel: design.designGenome === "magazineCampaign" ? "editorial-cover" : wantsGold ? "clean" : isVip || isGrowth ? "immersive" : "clean",
      quickActions: intent === "deposit" ? "task-rail" : design.designGenome === "tradingCommand" ? "command-bar" : design.designGenome === "onboardingJourney" ? "task-rail" : isTrader ? "toolbar" : "compact-grid",
      referralLink: isGrowth ? "link-first" : "compact",
      tradingAccounts: intent === "deposit" ? "account-wall" : design.designGenome === "magazineCampaign" ? "account-wall" : design.designGenome === "tradingCommand" || isAsset ? "ops-table" : "dense-cards",
      accountPerformance: design.designGenome === "tradingCommand" ? "sparkline-board" : "pro-chart",
      walletList: design.designGenome === "accountOpsConsole" ? "wallet-tiles" : "currency-table",
    },
    componentMorphs: {
      AssetOverview: { variant: isVip ? "wealthPlate" : isAsset ? "tickerStrip" : isTrader ? "darkTerminal" : "standard" },
      QuickActions: { variant: design.designGenome === "tradingCommand" ? "commandBar" : design.designGenome === "onboardingJourney" ? "taskRail" : "priorityButtons" },
      PromotionBanner: { variant: intent === "deposit" ? "depositLadder" : design.designGenome === "magazineCampaign" ? "editorialCover" : "splitVisual" },
      TradingAccounts: { variant: design.designGenome === "tradingCommand" ? "opsTable" : design.designGenome === "magazineCampaign" ? "accountWall" : "separatedList" },
    },
    moduleSettings: {
      adCarousel: { enabled: ["growth", "partner", "brand", "vip", "deposit", "retention"].includes(intent) },
      quickActions: {
        enabled: !isAsset && intent !== "risk",
        count: intent === "deposit" ? 4 : isTrader || intent === "mobile" ? 6 : 8,
        display: isTrader || intent === "mobile" ? "iconOnly" : "iconText",
        actions: intent === "deposit"
          ? ["transfer", "orders", "positions", "contactService"]
          : isGrowth
          ? ["eventSignup", "deposit", "contest", "contactService"]
          : isTrader
          ? ["switchAccount", "positions", "orders", "downloadMt5", "risk", "deposit"]
          : [],
      },
      wallet: { enabled: intent === "deposit" ? true : !(isGrowth && wantsGold), placement: intent === "deposit" ? "standalone" : isGrowth && !wantsWalletList ? "mergedWithAssets" : "standalone", showFundActions: false },
      assets: { enabled: intent === "deposit" ? false : !(isGrowth && wantsGold), showFundActions: intent === "deposit" ? true : !(isGrowth && wantsGold), showAvailable: isAsset, showMargin: isAsset, showRiskLevel: isAsset, wallets: isAsset ? ["USD", "EUR", "USDT"] : [] },
      referral: { enabled: isPartner, showClicks: true, showRegistrations: true, showTradingAccounts: true, showPromoLink: true, showInviteCode: true, showQrCode: true },
      tradingAccounts: {
        enabled: true,
        realEnabled: true,
        demoEnabled: intent === "deposit" ? false : true,
        grouping: isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList || wantsMixedAccountPresentation ? "separated" : "combined",
        viewMode: intent === "deposit" ? "card" : wantsMixedAccountPresentation ? "card" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList ? "list" : "switchable",
        realViewMode: wantsMixedAccountPresentation ? "card" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList ? "list" : "card",
        demoViewMode: wantsMixedAccountPresentation ? "list" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList ? "list" : "card",
        demoFirst: /模拟账号.*(?:真实账号|live)|demo.*live|demo\s*在\s*live|模拟.*上面/i.test(String(payload.prompt || "")),
      },
      openAccount: { enabled: true, real: true, demo: intent === "deposit" ? false : true, bind: intent === "deposit" ? false : true, placement: isOnboarding || intent === "deposit" || intent === "brand" || isPartner ? "standalone" : "insideTradingAccounts" },
      riskNotice: { enabled: isAsset || intent === "risk" || intent === "insight" },
    },
    emphasis: {
      deposit: intent === "deposit" || isGrowth || isVip || isAsset ? "high" : "medium",
      openAccount: intent === "deposit" || isGrowth ? "high" : "medium",
      promo: intent === "deposit" || isGrowth ? "high" : "low",
      accounts: isTrader || isAsset ? "high" : "medium",
    },
    aiSummary: `已通过 ${providerConfig.name} / ${providerConfig.model} 生成${meta[5]}`,
  };
}

function textHasAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

const HOMEPAGE_SLOT_TO_SETTING = {
  balanceTotal: "assets",
  walletBalance: "wallet",
  fundActions: "assets",
  openAccountActions: "openAccount",
  onboardingProgress: "onboardingProgress",
  promoHighlight: "promoHighlight",
  adCarousel: "adCarousel",
  quickActions: "quickActions",
  referralLink: "referral",
  tradingAccounts: "tradingAccounts",
  userKycRail: "userKycRail",
  accountPerformance: "accountPerformance",
  walletList: "wallet",
  createAccountForm: "createAccountForm",
  marketInsight: "marketInsight",
  riskNotice: "riskNotice",
};

const HOMEPAGE_SLOT_TO_BRICK_FEATURE = {
  balanceTotal: "balanceTotal",
  walletBalance: "walletBalance",
  fundActions: "fundActions",
  openAccountActions: "openAccountActions",
  onboardingProgress: "onboardingProgress",
  promoHighlight: "promoHighlight",
  adCarousel: "adCarousel",
  quickActions: "quickActions",
  referralLink: "referralLink",
  tradingAccounts: "tradingAccounts",
  userKycRail: "userKycRail",
  accountPerformance: "accountPerformance",
  walletList: "walletList",
  createAccountForm: "createAccountForm",
  marketInsight: "marketInsight",
  riskNotice: "riskNotice",
};

const HOMEPAGE_HERO_FOCUS_TO_SLOT = {
  asset_summary: "balanceTotal",
  ad_carousel: "adCarousel",
  promo_banner: "promoHighlight",
  fund_actions: "fundActions",
  quick_actions: "quickActions",
  open_account_panel: "openAccountActions",
  onboarding_progress: "onboardingProgress",
  account_list: "tradingAccounts",
  referral_link: "referralLink",
  user_kyc_rail: "userKycRail",
  account_performance: "accountPerformance",
  wallet_list: "walletList",
  create_account_form: "createAccountForm",
  wallet_balance: "walletBalance",
  risk_notice: "riskNotice",
  copytrading_summary: "marketInsight",
};

function sectionHasSlot(sections, slot) {
  return Array.isArray(sections) && sections.some((section) => Array.isArray(section.slots) && section.slots.includes(slot));
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

  const settings = ensureObject(config.moduleSettings);
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
  const settings = ensureObject(config.moduleSettings);
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
    const settings = ensureObject(config.moduleSettings);
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

function enforceHomepagePromptIntent(payload, config) {
  const prompt = String(payload.prompt || "");
  const text = prompt.toLowerCase() + prompt;
  const intentProfile = buildHomepageIntentProfile(prompt);
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
  next.moduleSettings = ensureObject(next.moduleSettings);
  const settings = next.moduleSettings;
  settings.assets = ensureObject(settings.assets);
  settings.quickActions = ensureObject(settings.quickActions);
  settings.wallet = ensureObject(settings.wallet);
  settings.referral = ensureObject(settings.referral);
  settings.tradingAccounts = ensureObject(settings.tradingAccounts);
  settings.userKycRail = ensureObject(settings.userKycRail);
  settings.riskNotice = ensureObject(settings.riskNotice);
  settings.accountPerformance = ensureObject(settings.accountPerformance);
  settings.marketInsight = ensureObject(settings.marketInsight);
  settings.onboardingProgress = ensureObject(settings.onboardingProgress);
  settings.openAccount = ensureObject(settings.openAccount);
  settings.promoHighlight = ensureObject(settings.promoHighlight);
  settings.createAccountForm = ensureObject(settings.createAccountForm);

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
      { id: "asset-performance", type: "split", title: "账户表现", slots: ["accountPerformance", "riskNotice"] },
      { id: "asset-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ];
    delete next.layout;
    next.brickPlan = [
      { brickId: "assetOverview.tickerStrip", brickName: "资产 Ticker 指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "hero", reason: "首屏用横向指标带呈现总资产、可用资金、保证金和风险等级。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "入金和出金作为资产管理高频动作。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "walletList", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用磁贴组展示，和普通表格明显区分。" },
      { brickId: "accountPerformance.proChart", brickName: "账号表现图表", family: "AccountPerformance", feature: "accountPerformance", component: "account_performance", size: "2x2", zone: "main", reason: "账户表现图表需要主栏宽度承载趋势信息。" },
      { brickId: "riskNotice.marginGuard", brickName: "保证金风险提示", family: "RiskNotice", feature: "riskNotice", component: "risk_notice", size: "1x2", zone: "rail", reason: "把保证金、杠杆和风险等级放到侧栏提醒。" },
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
    settings.riskNotice.enabled = true;
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
    settings.riskNotice.enabled = true;
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

  if (settings.riskNotice.enabled && Array.isArray(next.sections)) {
    const hasRisk = next.sections.some((section) => Array.isArray(section.slots) && section.slots.includes("riskNotice"));
    if (!hasRisk && textHasAny(text, ["风险", "保证金", "杠杆"])) {
      next.sections.push({ id: "risk", type: "split", title: "风险提示", slots: ["riskNotice"] });
    }
  }

  const keepAvoidedSlots = mentionsAd ? ["adCarousel"] : [];
  enforcePageIntentSections(next, intentProfile, keepAvoidedSlots);
  removeAvoidedHomepageModules(next, intentProfile.avoid, keepAvoidedSlots);
  lightRepairHomepageIntent(next, intentProfile, text);

  next.brickTrace = {
    ...ensureObject(next.brickTrace),
    intent,
    pageIntent: intent,
    strategy: `${intentProfile.label}服务端意图纠偏`,
    score: typeof intentProfile.confidence === "number" ? Math.round(intentProfile.confidence * 100) : Math.max(50, intentProfile.score),
    source: "server-intent-profile",
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
	      variant: Number.isFinite(Number(payload.variant)) ? Number(payload.variant) : 0,
	      status: "success",
      mock: Boolean(result.mock),
	      durationMs: Date.now() - startedAt,
	      prompt: safeRecordText(payload.prompt),
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
	        variant: Number.isFinite(Number(payload.variant)) ? Number(payload.variant) : 0,
	        status: "failed",
        durationMs: Date.now() - startedAt,
        prompt: safeRecordText(payload.prompt),
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

  if (req.method === "POST" && requestUrl.pathname === "/api/home-components/save") {
    await handleComponentSave(req, res);
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
