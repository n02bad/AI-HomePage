const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
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
const MAX_BODY_BYTES = 8_000_000;
const COMPONENT_LIBRARY_FILE = path.join(ROOT_DIR, "home-component-library.json");
const COMPOSITION_LIBRARY_FILE = path.join(ROOT_DIR, "home-component-compositions.json");
const CALL_HISTORY_FILE = path.join(ROOT_DIR, "home-ai-call-history.json");
const AUTH_CALL_HISTORY_FILE = path.join(ROOT_DIR, "auth-ai-call-history.json");
const DESIGN_RULES_FILE = path.join(ROOT_DIR, "design.md");
const UI_GENERATION_PROTOCOL_FILE = path.join(ROOT_DIR, "AI_UI_GENERATION_PROTOCOL.md");
const HOME_MODULE_BRICKS_FILE = path.join(ROOT_DIR, "home-module-bricks.md");
const DESIGN_SAMPLE_FILE = path.join(ROOT_DIR, "home-design-samples.json");
const AESTHETIC_SCORE_FILE = path.join(ROOT_DIR, "home-ai-score-records.json");
const FEEDBACK_MEMORY_FILE = path.join(ROOT_DIR, "home-ai-feedback-memory.json");
const REFERENCE_ASSET_FILE = path.join(ROOT_DIR, "home-ai-reference-assets.json");
const REFERENCE_ASSET_DIR = path.join(ROOT_DIR, "artifacts", "home-ai-reference-assets");
const MAX_CALL_HISTORY = 200;
const MAX_AUTH_CALL_HISTORY = 160;
const MAX_AESTHETIC_SCORE_RECORDS = 300;
const MAX_FEEDBACK_MEMORY_RECORDS = 300;
const MAX_REFERENCE_ASSETS = 120;
const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
const MINIMAX_CN_TYPED_ALIAS_BASE_URL = "https://api.minimaxi.cn/v1";
const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io/v1";
const MINIMAX_OFFICIAL_BASE_URLS = [MINIMAX_CN_BASE_URL];
const MINIMAX_MAX_COMPLETION_TOKENS = 2048;
const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1";
const KIMI_GLOBAL_BASE_URL = "https://api.moonshot.ai/v1";

function getLanUrls(port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${port}/`);
}
const KIMI_DEFAULT_MODEL = "kimi-k2.6";
const KIMI_LEGACY_MODELS = new Set(["kimi-k2.5"]);
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_PRO_MODEL = "deepseek-v4-pro";
const DEEPSEEK_FLASH_MODEL = "deepseek-v4-flash";
const DEEPSEEK_PRO_TIMEOUT_MS = 75_000;
const DEEPSEEK_FLASH_TIMEOUT_MS = 120_000;
const KIMI_TIMEOUT_MS = 120_000;

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
    model: KIMI_DEFAULT_MODEL,
    baseUrl: KIMI_CN_BASE_URL,
    endpoint: "/chat/completions",
    keyEnv: ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
    baseUrlEnv: ["KIMI_BASE_URL", "MOONSHOT_BASE_URL"],
    modelEnv: ["KIMI_MODEL", "MOONSHOT_MODEL"],
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

const BACKGROUND_JOBS = new Map();
const MAX_BACKGROUND_JOBS = 80;
const BACKGROUND_JOB_TTL_MS = 45 * 60 * 1000;

function backgroundJobId(type) {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function pruneBackgroundJobs() {
  const now = Date.now();
  const jobs = [...BACKGROUND_JOBS.values()].sort((a, b) => a.createdAtMs - b.createdAtMs);
  jobs.forEach((job) => {
    if (job.status !== "running" && now - job.updatedAtMs > BACKGROUND_JOB_TTL_MS) {
      BACKGROUND_JOBS.delete(job.id);
    }
  });

  const remaining = [...BACKGROUND_JOBS.values()].sort((a, b) => a.createdAtMs - b.createdAtMs);
  while (remaining.length > MAX_BACKGROUND_JOBS) {
    const job = remaining.shift();
    if (job?.status !== "running") BACKGROUND_JOBS.delete(job.id);
    else remaining.push(job);
    if (remaining.every((item) => item.status === "running")) break;
  }
}

function publicBackgroundJob(job, includeResult = true) {
  if (!job) return null;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt || null,
    statusPath: job.statusPath,
    result: includeResult && job.status === "success" ? job.result : null,
    error: includeResult && job.status === "failed" ? job.error : null,
  };
}

function createBackgroundJob(type, payload, runner, statusPathForId) {
  pruneBackgroundJobs();
  const id = backgroundJobId(type);
  const now = Date.now();
  const job = {
    id,
    type,
    status: "running",
    createdAtMs: now,
    updatedAtMs: now,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    completedAt: "",
    statusPath: statusPathForId(id),
    result: null,
    error: null,
  };
  BACKGROUND_JOBS.set(id, job);

  Promise.resolve()
    .then(() => runner(payload))
    .then((result) => {
      const completedAt = Date.now();
      job.status = "success";
      job.result = result;
      job.updatedAtMs = completedAt;
      job.updatedAt = new Date(completedAt).toISOString();
      job.completedAt = job.updatedAt;
    })
    .catch((error) => {
      const completedAt = Date.now();
      job.status = "failed";
      job.error = {
        message: error?.message || "Background job failed",
        details: error?.details || null,
        callRecord: error?.callRecord || null,
        statusCode: error?.statusCode || 500,
      };
      job.updatedAtMs = completedAt;
      job.updatedAt = new Date(completedAt).toISOString();
      job.completedAt = job.updatedAt;
    });

  return job;
}

async function handleBackgroundJobStart(req, res, type, runner, statusPathForId) {
  try {
    const payload = await readJsonBody(req);
    const job = createBackgroundJob(type, payload, runner, statusPathForId);
    sendJson(res, 202, {
      ok: true,
      jobId: job.id,
      status: job.status,
      job: publicBackgroundJob(job, false),
    });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Background job start failed",
      details: error.details || null,
    });
  }
}

function handleBackgroundJobStatus(res, jobId) {
  pruneBackgroundJobs();
  const job = BACKGROUND_JOBS.get(jobId);
  if (!job) {
    sendJson(res, 404, {
      ok: false,
      error: "Background job not found",
    });
    return;
  }
  sendJson(res, 200, {
    ok: true,
    jobId: job.id,
    status: job.status,
    job: publicBackgroundJob(job, true),
  });
}

function envValue(names = []) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return "";
}

function providerKeyStatus(provider) {
  const keyEnv = Array.isArray(provider.keyEnv) ? provider.keyEnv : [];
  const serverKeyEnv = keyEnv.find((name) => Boolean(process.env[name])) || "";
  return {
    hasServerKey: Boolean(serverKeyEnv),
    serverKeyEnv,
    keyEnv,
  };
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeProviderBaseUrl(providerId, value) {
  const baseUrl = normalizeBaseUrl(value);
  if (!["minimax", "kimi"].includes(providerId)) return baseUrl;

  try {
    const target = new URL(baseUrl);
    if (providerId === "minimax" && ["api.minimaxi.cn", "api.minimax.io"].includes(target.hostname)) {
      return MINIMAX_CN_BASE_URL;
    }
    if (providerId === "kimi" && target.hostname === "api.moonshot.ai") {
      return KIMI_CN_BASE_URL;
    }
  } catch (error) {
    return baseUrl;
  }

  if (providerId === "minimax") {
    return baseUrl === MINIMAX_CN_TYPED_ALIAS_BASE_URL || baseUrl === MINIMAX_GLOBAL_BASE_URL ? MINIMAX_CN_BASE_URL : baseUrl;
  }

  return baseUrl === KIMI_GLOBAL_BASE_URL ? KIMI_CN_BASE_URL : baseUrl;
}

function isKimiFixedTemperatureModel(model) {
  return /^kimi-k2\.(?:6|5)\b/i.test(String(model || ""));
}

function kimiTemperatureForModel(model) {
  return isKimiFixedTemperatureModel(model) ? 0.6 : 1;
}

function normalizeTemperature(providerId, value, model = "") {
  if (providerId === "kimi") return kimiTemperatureForModel(model);
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
  "wallet_list",
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

const CORE_COMPONENT_MORPH_POOL = {
  AssetOverview: ["summaryHero", "metricTriplet", "wealthPlate", "riskRadar", "waterfall", "splitLedger", "compactTable", "terminalStrip", "trustProof", "actionFusion"],
  WalletList: ["currencyCards", "tileBoard", "compactLedger", "horizontalStrip", "currencyTable", "featuredPrimary", "groupedWallets", "balanceRanking", "availabilityRows", "mobileCarousel"],
  QuickActions: ["gridCards", "actionDock", "priorityPanel", "iconBelt", "commandBar", "taskRail", "tileBoard", "accentCards", "compactMenu", "segmentedPanel"],
  TradingAccounts: ["accountWall", "opsTable", "liveDemoSplit", "liveCardsDemoList", "compactRows", "statusBoard", "groupPanels", "platformGroups", "heroAccountList", "mobileStack"],
  OnboardingProgress: ["pathSteps", "checklist", "missionBoard", "nextStepHero", "journeyTimeline", "ribbonRail", "guideCards", "wizardFlow", "kycActionPanel", "progressGauge"],
  AccountPerformance: ["proChart", "sparklineBoard", "costBoard", "dualChart", "summaryChart", "metricTrend", "riskPanel", "positionPanel", "terminalChart", "cleanSnapshot"],
  PromotionBanner: ["campaignHero", "scoreboard", "depositLadder", "editorialCover", "splitVisual", "countdownCard", "benefitList", "noticeBanner", "imageHero", "ctaPanel"],
  ReferralLinkCard: ["copyCard", "inviteCodeCard", "linkFirstPanel", "qrPanel", "statsCard", "shareToolbar", "stepCards", "compactStrip", "conversionSummary", "mainReferralCard"],
  RiskDisclosure: ["legalStrip", "marginGuard", "riskLevelPanel", "compactNotice", "splitDisclosure", "iconWarnings", "accordionDisclosure", "tradeRiskSummary", "complianceBlock", "riskFaqCombo"],
};

const HOME_BLOCK_MORPH_MODULE_MAP = {
  asset_overview: "AssetOverview",
  asset_summary: "AssetOverview",
  balanceTotal: "AssetOverview",
  wallet_list: "WalletList",
  walletList: "WalletList",
  quick_actions: "QuickActions",
  quickActions: "QuickActions",
  trading_accounts_list: "TradingAccounts",
  account_list: "TradingAccounts",
  tradingAccounts: "TradingAccounts",
  onboarding_guide: "OnboardingProgress",
  onboarding_progress: "OnboardingProgress",
  onboardingProgress: "OnboardingProgress",
  trading_account_highlight: "AccountPerformance",
  account_performance: "AccountPerformance",
  accountPerformance: "AccountPerformance",
  promo_banner: "PromotionBanner",
  ad_carousel: "PromotionBanner",
  promoHighlight: "PromotionBanner",
  adCarousel: "PromotionBanner",
  referral_link_card: "ReferralLinkCard",
  referralLinkCard: "ReferralLinkCard",
  risk_disclosure: "RiskDisclosure",
  riskNotice: "RiskDisclosure",
};

const COMPONENT_MORPH_VARIANT_ALIASES = {
  AssetOverview: {
    standard: "summaryHero",
    vipHero: "summaryHero",
    compactMetrics: "metricTriplet",
    compactTable: "compactTable",
    darkTerminal: "terminalStrip",
    tickerStrip: "metricTriplet",
    splitCard: "splitLedger",
    quietCard: "trustProof",
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
    splitPerformance: "summaryChart",
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
    compactStrip: "noticeBanner",
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

const GUIDED_EXPLICIT_ONLY_BLOCKS = new Set([
  "wallet_list",
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
]);

const HOMEPAGE_THEME_PRESETS = [
  "default",
  "blackGold",
  "lightGold",
  "blueFinance",
  "darkTech",
  "minimalWhite",
  "emeraldTrust",
  "cobaltTeal",
  "crimsonPromo",
  "graphiteSilver",
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
  walletList: "wallet_list",
  fundActions: "asset_overview",
  asset_summary: "asset_overview",
  wallet_balance: "asset_overview",
  wallet_list: "wallet_list",
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

const LARGE_FULL_ROW_HOME_BLOCKS = new Set(["trading_account_highlight", "trading_accounts_list", "wallet_list"]);

function homepageSectionTitleForSlot(slot, fallback = "") {
  if (slot === "trading_account_highlight") return "账号表现";
  if (slot === "trading_accounts_list") return "交易账号";
  if (slot === "wallet_list") return "钱包列表";
  return fallback || slot;
}

function splitLargeHomepageSections(sections = []) {
  return (Array.isArray(sections) ? sections : []).flatMap((section, sectionIndex) => {
    const slots = (Array.isArray(section?.slots) ? section.slots : [])
      .map((slot) => canonicalHomeBlock(slot) || slot)
      .filter(Boolean);
    const largeSlots = slots.filter((slot) => LARGE_FULL_ROW_HOME_BLOCKS.has(slot));
    if (!largeSlots.length) return [{ ...section, slots }];
    if (slots.length === 1) {
      return [
        {
          ...section,
          type: "full",
          title: homepageSectionTitleForSlot(largeSlots[0], section.title),
          slots,
        },
      ];
    }

    const compactSlots = slots.filter((slot) => !LARGE_FULL_ROW_HOME_BLOCKS.has(slot));
    const splitSections = compactSlots.length
      ? [
          {
            ...section,
            type: section.type === "full" ? "split" : section.type,
            slots: compactSlots,
          },
        ]
      : [];

    largeSlots.forEach((slot, index) => {
      splitSections.push({
        ...section,
        id: cleanText(`${section.id || `section-${sectionIndex + 1}`}-${slot}`, `full-row-${sectionIndex + 1}-${index + 1}`, 32),
        type: "full",
        title: homepageSectionTitleForSlot(slot, section.title),
        slots: [slot],
      });
    });

    return splitSections;
  });
}

const HOMEPAGE_BLOCK_REPAIR_META = {
  welcome_header: { brickId: "system.welcomeHeader", brickName: "欢迎头部", family: "WelcomeHeader", size: "3x1", zone: "hero", title: "欢迎" },
  asset_overview: { brickId: "assetOverview.flexible", brickName: "账户概览", family: "AssetOverview", size: "2x1", zone: "hero", title: "资产概览" },
  wallet_list: { brickId: "walletList.tiles", brickName: "钱包列表", family: "WalletList", size: "3x2", zone: "full", title: "钱包列表" },
  quick_actions: { brickId: "quickActions.configDriven", brickName: "快捷操作", family: "QuickActions", size: "2x1", zone: "main", title: "快捷操作" },
  onboarding_guide: { brickId: "onboardingProgress.missionBoard", brickName: "开户进度", family: "OnboardingProgress", size: "2x1", zone: "main", title: "开户进度" },
  trading_account_highlight: { brickId: "accountPerformance.proChart", brickName: "账户表现", family: "AccountPerformance", size: "3x2", zone: "full", title: "账户表现" },
  trading_accounts_list: { brickId: "tradingAccounts.list", brickName: "交易账号列表", family: "TradingAccounts", size: "3x2", zone: "full", title: "交易账号" },
  promo_banner: { brickId: "promoBanner.imageHero", brickName: "活动 Banner", family: "PromotionBanner", size: "3x1", zone: "full", title: "活动权益" },
  pamm_products: { brickId: "pammProducts.recommendations", brickName: "PAMM 产品推荐", family: "PammProducts", size: "2x1", zone: "main", title: "PAMM 产品" },
  copytrading_signals: { brickId: "copytradingSignals.curveCards", brickName: "CopyTrading 信号源", family: "CopytradingSignals", size: "3x1", zone: "full", title: "CopyTrading" },
  referral_link_card: { brickId: "referralLinkCard.compact", brickName: "推广链接", family: "ReferralLinkCard", size: "1x1", zone: "rail", title: "推广链接" },
  announcements: { brickId: "announcements.list", brickName: "公告通知", family: "Announcements", size: "2x1", zone: "main", title: "公告通知" },
  market_news: { brickId: "marketNews.feed", brickName: "市场资讯", family: "MarketNews", size: "2x1", zone: "main", title: "市场资讯" },
  risk_disclosure: { brickId: "riskDisclosure.legalStrip", brickName: "风险提示", family: "RiskDisclosure", size: "3x1", zone: "full", title: "风险提示" },
  faq_section: { brickId: "faqSection.accordion", brickName: "FAQ", family: "FaqSection", size: "2x1", zone: "main", title: "FAQ" },
  support_contact: { brickId: "supportContact.serviceCard", brickName: "在线客服", family: "SupportContact", size: "1x1", zone: "rail", title: "在线客服" },
  app_download: { brickId: "appDownload.qrCard", brickName: "APP 下载", family: "AppDownload", size: "1x1", zone: "rail", title: "APP 下载" },
};

const HOMEPAGE_RECOMMENDED_SECTION_ORDERS = {
  basic: [
    "hero:welcome_header+asset_overview",
    "split:quick_actions+onboarding_guide",
    "full:trading_accounts_list",
    "full:faq_section",
    "full:risk_disclosure",
  ],
  growth: [
    "hero:welcome_header+asset_overview",
    "split:quick_actions+onboarding_guide",
    "full:promo_banner",
    "split:referral_link_card+faq_section",
    "full:trading_accounts_list",
    "full:risk_disclosure",
  ],
  pro: [
    "hero:welcome_header+asset_overview",
    "split:quick_actions+trading_account_highlight",
    "full:trading_accounts_list",
    "split:referral_link_card+faq_section",
    "full:risk_disclosure",
  ],
};

function normalizeHomepageSectionType(type, slotCount = 0) {
  const value = cleanText(type, "", 16).toLowerCase();
  if (value === "hero") return "hero";
  if (value === "split") return "split";
  if (value === "full") return "full";
  if (value === "rail") return slotCount > 1 ? "split" : "full";
  if (slotCount > 1) return "split";
  return "full";
}

function parseHomepageSectionInput(section, index = 0) {
  if (typeof section === "string") {
    const match = section.match(/^([a-z_ -]+)\s*:\s*(.+)$/i);
    const rawType = match ? match[1] : "";
    const rawSlots = (match ? match[2] : section).split("+");
    const slots = rawSlots.map((slot) => canonicalHomeBlock(slot)).filter(Boolean);
    return {
      id: `section-${index + 1}`,
      type: normalizeHomepageSectionType(rawType, slots.length),
      title: "",
      slots,
    };
  }

  const value = ensureObject(section);
  const slots = (Array.isArray(value.slots) ? value.slots : [])
    .map((slot) => canonicalHomeBlock(slot))
    .filter(Boolean);
  return {
    ...value,
    id: cleanText(value.id, `section-${index + 1}`, 48),
    type: normalizeHomepageSectionType(value.type, slots.length),
    title: cleanText(value.title, "", 40),
    slots,
  };
}

function homepageSectionSignature(section) {
  return `${section?.type || ""}:${(Array.isArray(section?.slots) ? section.slots : []).join("+")}`;
}

function homepageBlockMeta(slot) {
  const canonical = canonicalHomeBlock(slot);
  return canonical ? HOMEPAGE_BLOCK_REPAIR_META[canonical] || {} : {};
}

function repairedHomepageSectionFromString(value, index = 0) {
  return parseHomepageSectionInput(value, index);
}

function homepageSectionForSingleSlot(slot, index = 0, type = "full") {
  const canonical = canonicalHomeBlock(slot);
  const meta = homepageBlockMeta(canonical);
  return {
    id: `${canonical.replace(/_/g, "-")}-${index + 1}`,
    type,
    title: meta.title || canonical,
    slots: [canonical],
  };
}

function normalizeHomepageGuidedSnapshot(guidedSnapshot = {}) {
  const source = guidedSnapshot && typeof guidedSnapshot === "object" ? guidedSnapshot : {};
  const explicitBlocks = new Set();
  const addBlock = (value) => {
    const block = canonicalHomeBlock(value);
    if (block) explicitBlocks.add(block);
  };

  (Array.isArray(source.explicitBlocks) ? source.explicitBlocks : []).forEach(addBlock);
  (Array.isArray(source.selectedOptionalModules) ? source.selectedOptionalModules : []).forEach(addBlock);
  (Array.isArray(source.modules) ? source.modules : []).forEach((module) => {
    if (typeof module === "string") {
      addBlock(module);
      return;
    }
    (Array.isArray(module?.canonicalTargets) ? module.canonicalTargets : []).forEach(addBlock);
    addBlock(module?.canonicalTarget);
    addBlock(module?.block);
    addBlock(module?.id);
  });

  const mustHave = mergeUnique([
    Array.isArray(source.mustHave) ? source.mustHave.map(canonicalHomeBlock).filter(Boolean) : [],
    Array.isArray(source.requiredModules) ? source.requiredModules.map(canonicalHomeBlock).filter(Boolean) : [],
  ]).filter((slot) => CANONICAL_HOME_BLOCKS.includes(slot));
  const heroFocus = canonicalHomeBlock(source.heroFocus) || "";
  const level = cleanText(source.level?.id || source.level || source.version || "", "", 24);
  const styleText = [
    source.styleText,
    source.style,
    source.designStyle,
    source.designStyle?.id,
    source.designStyle?.label,
    source.designStyle?.instruction,
    source.theme,
    source.theme?.id,
    source.theme?.label,
    source.themePreset,
  ]
    .map((item) => (typeof item === "string" ? item : ""))
    .join(" ");

  return {
    ...source,
    heroFocus,
    mustHave,
    level: ["basic", "growth", "pro"].includes(level) ? level : "",
    explicitBlocks: [...explicitBlocks],
    styleText,
    hasExplicitModuleSelection: Boolean(
      (Array.isArray(source.modules) && source.modules.length) ||
        (Array.isArray(source.selectedOptionalModules) && source.selectedOptionalModules.length) ||
        (Array.isArray(source.explicitBlocks) && source.explicitBlocks.length),
    ),
  };
}

function homepageGuidedSnapshotFromPayload(payload = {}, config = {}) {
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  if (!guidedIntake) {
    return {
      heroFocus: canonicalHomeBlock(config.heroFocus || config.pageIntent?.heroFocus) || "",
      mustHave: Array.isArray(config.pageIntent?.mustHave) ? config.pageIntent.mustHave.map(canonicalHomeBlock).filter(Boolean) : [],
      level: "",
      explicitBlocks: [],
      styleText: [payload.prompt, config.themePreset, config.theme, config.density].filter(Boolean).join(" "),
      hasExplicitModuleSelection: false,
    };
  }

  return {
    intent: guidedIntake.intent,
    canonicalIntent: guidedIntake.canonical.primaryIntent,
    heroFocus: guidedIntake.canonical.heroFocus,
    level: guidedIntake.level?.id || "",
    designStyle: guidedIntake.designStyle,
    theme: guidedIntake.theme,
    modules: guidedIntake.modules,
    mustHave: guidedRequiredHomepageSlots(guidedIntake),
    explicitBlocks: [...guidedExplicitBlockSet(guidedIntake)],
    selectedOptionalModules: [...guidedExplicitBlockSet(guidedIntake)].filter((slot) => GUIDED_EXPLICIT_ONLY_BLOCKS.has(slot)),
    hasExplicitModuleSelection: Boolean(guidedIntake.modules.length),
  };
}

function homepageBlocksFromSections(sections = []) {
  return [
    ...new Set(
      (Array.isArray(sections) ? sections : [])
        .flatMap((section) => (Array.isArray(section?.slots) ? section.slots : []))
        .map((slot) => canonicalHomeBlock(slot))
        .filter(Boolean),
    ),
  ];
}

function homepageBlocksFromBrickPlan(brickPlan = []) {
  return [
    ...new Set(
      (Array.isArray(brickPlan) ? brickPlan : [])
        .flatMap((brick) => [brick?.component, brick?.feature, brick?.brickId])
        .map((value) => canonicalHomeBlock(value))
        .filter(Boolean),
    ),
  ];
}

function homepageSectionsContainSlot(sections, slot) {
  const canonical = canonicalHomeBlock(slot);
  return Boolean(canonical && (Array.isArray(sections) ? sections : []).some((section) => (section.slots || []).includes(canonical)));
}

function homepageConfigHasMinimalistStyle(config = {}, guidedSnapshot = {}) {
  const source = [
    guidedSnapshot.styleText,
    guidedSnapshot.designStyle,
    guidedSnapshot.designStyle?.id,
    guidedSnapshot.designStyle?.label,
    guidedSnapshot.designStyle?.instruction,
    guidedSnapshot.theme,
    guidedSnapshot.theme?.id,
    guidedSnapshot.theme?.label,
    config.themePreset,
    config.theme,
    config.style,
    config.visualStyle,
  ]
    .map((item) => (typeof item === "string" ? item : ""))
    .join(" ")
    .toLowerCase();
  return /minimal|minimalist|whitespace|white\s*space|留白|简约留白|极简|极简白|minimalwhite/.test(source);
}

function validateHomepageConfig(configSnapshot, guidedSnapshot = {}) {
  const config = configSnapshot && typeof configSnapshot === "object" ? configSnapshot : {};
  const guided = normalizeHomepageGuidedSnapshot(guidedSnapshot);
  const sections = (Array.isArray(config.sections) ? config.sections : [])
    .map(parseHomepageSectionInput)
    .filter((section) => section.slots.length);
  const brickPlan = Array.isArray(config.brickPlan) ? config.brickPlan : [];
  const sectionBlocks = homepageBlocksFromSections(sections);
  const brickBlocks = homepageBlocksFromBrickPlan(brickPlan);
  const allBlocks = new Set([...sectionBlocks, ...brickBlocks]);
  const invalidSections = [];
  const warnings = [];

  sections.forEach((section, index) => {
    const slots = Array.isArray(section.slots) ? section.slots : [];
    if (!["hero", "split", "full"].includes(section.type)) {
      invalidSections.push({ index, reason: `invalid type ${section.type || "empty"}`, section: homepageSectionSignature(section) });
    }
    if (section.type === "split" && slots.length !== 2) {
      invalidSections.push({ index, reason: "split must contain exactly two modules", section: homepageSectionSignature(section) });
    }
    if (section.type === "full" && slots.length !== 1) {
      invalidSections.push({ index, reason: "full must contain exactly one module", section: homepageSectionSignature(section) });
    }
    if (section.type === "hero" && (slots.length < 1 || slots.length > 2)) {
      invalidSections.push({ index, reason: "hero must contain one or two modules", section: homepageSectionSignature(section) });
    }
    slots.forEach((slot) => {
      if (!CANONICAL_HOME_BLOCKS.includes(slot)) {
        invalidSections.push({ index, reason: `unknown module ${slot}`, section: homepageSectionSignature(section) });
      }
    });
  });

  const duplicateHeroSections = sections
    .map((section, index) => ({ section, index }))
    .filter((item) => item.section.type === "hero")
    .slice(1)
    .map((item) => ({ index: item.index, section: homepageSectionSignature(item.section) }));

  const missingRequiredModules = guided.mustHave.filter((slot) => !allBlocks.has(slot));
  const heroFocus = guided.heroFocus || canonicalHomeBlock(config.heroFocus);
  const firstTwoBlocks = new Set(homepageBlocksFromSections(sections.slice(0, 2)));
  const heroFocusMismatch = Boolean(heroFocus && !firstTwoBlocks.has(heroFocus));
  const unmappedBrickIds = brickPlan
    .filter((brick) => {
      const component = canonicalHomeBlock(brick?.component || brick?.feature);
      return !component || (sectionBlocks.length && !sectionBlocks.includes(component));
    })
    .map((brick) => cleanText(brick?.brickId || brick?.component || brick?.feature, "", 80))
    .filter(Boolean);
  const densityStyleConflict = Boolean(homepageConfigHasMinimalistStyle(config, guided) && config.density === "compact");
  const explicitBlocks = new Set(guided.explicitBlocks || []);
  const optionalModuleMismatch = guided.hasExplicitModuleSelection
    ? [...allBlocks].filter((slot) => GUIDED_EXPLICIT_ONLY_BLOCKS.has(slot) && !explicitBlocks.has(slot) && !guided.mustHave.includes(slot))
    : [];

  if (!sections.length) warnings.push("sections is empty; repair will use a version default layout.");
  if (heroFocusMismatch) warnings.push(`heroFocus ${heroFocus} is not in the first two core sections.`);
  if (densityStyleConflict) warnings.push("minimalist/whitespace style conflicts with compact density.");

  return {
    missingRequiredModules,
    invalidSections,
    duplicateHeroSections,
    heroFocusMismatch,
    unmappedBrickIds: [...new Set(unmappedBrickIds)],
    densityStyleConflict,
    optionalModuleMismatch,
    warnings: [...new Set(warnings)].slice(0, 12),
  };
}

function homepageRecommendedSectionsForSnapshot(guidedSnapshot = {}, config = {}) {
  const guided = normalizeHomepageGuidedSnapshot(guidedSnapshot);
  const level = guided.level || (config.pageIntent?.primaryIntent === "growth" ? "growth" : config.pageIntent?.primaryIntent === "trader" ? "pro" : "basic");
  const defaults = HOMEPAGE_RECOMMENDED_SECTION_ORDERS[level] || HOMEPAGE_RECOMMENDED_SECTION_ORDERS.basic;
  const sections = defaults.map(repairedHomepageSectionFromString).filter((section) => section.slots.length);
  const wantsCopytrading =
    Boolean(config.moduleSettings?.copytrading?.enabled) ||
    guided.mustHave.includes("copytrading_signals") ||
    (guided.explicitBlocks || []).includes("copytrading_signals");
  if (wantsCopytrading && !sections.some((section) => section.slots.includes("copytrading_signals"))) {
    sections.splice(Math.min(3, sections.length), 0, { id: "copytrading-signals", type: "full", title: "CopyTrading", slots: ["copytrading_signals"] });
  }
  return sections;
}

function repairHomepageSectionLegality(section, index = 0) {
  const base = parseHomepageSectionInput(section, index);
  const slots = [...new Set(base.slots)].filter(Boolean);
  if (!slots.length) return [];

  if (base.type === "hero") {
    const heroSlots = slots.slice(0, 2);
    const extraSlots = slots.slice(2);
    return [
      { ...base, type: "hero", slots: heroSlots },
      ...extraSlots.map((slot, extraIndex) => homepageSectionForSingleSlot(slot, index + extraIndex + 1)),
    ];
  }

  if (base.type === "split") {
    if (slots.length === 1) return [{ ...base, type: "full", slots }];
    const pairs = [];
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 2) {
      const pair = slots.slice(slotIndex, slotIndex + 2);
      pairs.push({
        ...base,
        id: slotIndex ? `${base.id}-${slotIndex / 2 + 1}` : base.id,
        type: pair.length === 2 ? "split" : "full",
        slots: pair,
      });
    }
    return pairs;
  }

  return slots.map((slot, slotIndex) => ({
    ...base,
    id: slots.length > 1 ? `${base.id}-${slotIndex + 1}` : base.id,
    type: "full",
    title: homepageSectionTitleForSlot(slot, base.title),
    slots: [slot],
  }));
}

function insertHomepageSlotNearTop(sections, slot, preferredType = "full") {
  const canonical = canonicalHomeBlock(slot);
  if (!canonical || homepageSectionsContainSlot(sections, canonical)) return sections;
  const insertIndex = sections[0]?.type === "hero" ? 1 : 0;
  const next = sections.slice();
  next.splice(insertIndex, 0, homepageSectionForSingleSlot(canonical, insertIndex, preferredType));
  return next;
}

function removeHomepageSlotFromSections(sections, slot) {
  const canonical = canonicalHomeBlock(slot);
  if (!canonical) return sections;
  return (Array.isArray(sections) ? sections : [])
    .map((section) => ({ ...section, slots: (section.slots || []).filter((item) => item !== canonical) }))
    .filter((section) => section.slots.length)
    .flatMap(repairHomepageSectionLegality);
}

function moveHomepageHeroFocusIntoCore(sections, heroFocus) {
  const focus = canonicalHomeBlock(heroFocus);
  if (!focus) return sections;
  const firstTwo = new Set(homepageBlocksFromSections(sections.slice(0, 2)));
  if (firstTwo.has(focus)) return sections;

  let next = removeHomepageSlotFromSections(sections, focus);
  const heroIndex = next.findIndex((section) => section.type === "hero");
  if (heroIndex >= 0 && next[heroIndex].slots.length < 2) {
    next[heroIndex] = { ...next[heroIndex], slots: [...next[heroIndex].slots, focus] };
    return next;
  }
  return insertHomepageSlotNearTop(next, focus, "full");
}

function moveRiskDisclosureToFooter(sections) {
  const hadRisk = homepageSectionsContainSlot(sections, "risk_disclosure");
  const withoutRisk = removeHomepageSlotFromSections(sections, "risk_disclosure");
  return hadRisk
    ? withoutRisk.concat([{ id: "risk-disclosure-footer", type: "full", title: "风险提示", variant: "legal-strip", slots: ["risk_disclosure"] }])
    : withoutRisk;
}

function normalizeHomepageBrickForSlot(slot, existing = {}) {
  const canonical = canonicalHomeBlock(slot);
  const meta = homepageBlockMeta(canonical);
  return {
    ...ensureObject(existing),
    brickId: meta.brickId || existing.brickId || canonical,
    brickName: meta.brickName || existing.brickName || canonical,
    family: meta.family || existing.family || "",
    feature: canonical,
    component: canonical,
    size: meta.size || existing.size || "2x1",
    zone: meta.zone || existing.zone || "main",
    reason: cleanText(existing.reason, `${meta.brickName || canonical} 由服务端修复映射到稳定首页模块。`, 120),
  };
}

function repairHomepageBrickPlan(config, sections) {
  const existing = new Map();
  (Array.isArray(config.brickPlan) ? config.brickPlan : []).forEach((brick) => {
    const component = canonicalHomeBlock(brick?.component || brick?.feature || brick?.brickId);
    if (component && !existing.has(component)) existing.set(component, brick);
  });
  return homepageBlocksFromSections(sections).map((slot) => normalizeHomepageBrickForSlot(slot, existing.get(slot)));
}

function removeHomepageOptionalModules(config, guidedSnapshot, actions) {
  const guided = normalizeHomepageGuidedSnapshot(guidedSnapshot);
  if (!guided.hasExplicitModuleSelection) return config;
  const explicit = new Set(guided.explicitBlocks || []);
  const keep = new Set(guided.mustHave || []);
  const removeSet = new Set(
    collectHomepageBlocks(config).filter((slot) => GUIDED_EXPLICIT_ONLY_BLOCKS.has(slot) && !explicit.has(slot) && !keep.has(slot)),
  );
  if (!removeSet.size) return config;

  config.sections = (Array.isArray(config.sections) ? config.sections : [])
    .map((section) => ({ ...section, slots: (section.slots || []).filter((slot) => !removeSet.has(slot)) }))
    .filter((section) => section.slots.length)
    .flatMap(repairHomepageSectionLegality);
  config.layout = Array.isArray(config.layout) ? config.layout.filter((block) => !removeSet.has(canonicalHomeBlock(block?.component || block?.feature))) : config.layout;
  config.brickPlan = Array.isArray(config.brickPlan) ? config.brickPlan.filter((brick) => !removeSet.has(canonicalHomeBlock(brick?.component || brick?.feature))) : config.brickPlan;

  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  removeSet.forEach((slot) => {
    const settingKey = HOMEPAGE_SLOT_TO_SETTING[slot];
    if (settingKey) settings[settingKey] = { ...ensureObject(settings[settingKey]), enabled: false };
  });
  config.moduleSettings = settings;
  actions.push(`移除未在引导表单选择的可选模块：${[...removeSet].join(", ")}`);
  return config;
}

function repairHomepageConfig(configSnapshot, guidedSnapshot = {}) {
  const actions = [];
  const source = clonePlain(ensureObject(configSnapshot));
  const guided = normalizeHomepageGuidedSnapshot(guidedSnapshot);
  let next = source;
  const initialValidation = validateHomepageConfig(next, guided);

  let sections = (Array.isArray(next.sections) ? next.sections : [])
    .map(parseHomepageSectionInput)
    .filter((section) => section.slots.length);
  if (!sections.length) {
    sections = homepageRecommendedSectionsForSnapshot(guided, next);
    actions.push("sections 为空或不可用，已使用首页版本默认顺序补齐。");
  }

  const seenSlots = new Set();
  sections = sections
    .map((section) => ({
      ...section,
      slots: section.slots.filter((slot) => {
        if (seenSlots.has(slot)) return false;
        seenSlots.add(slot);
        return true;
      }),
    }))
    .filter((section) => section.slots.length);

  const heroSections = sections.filter((section) => section.type === "hero");
  if (heroSections.length > 1) {
    let firstHeroSeen = false;
    sections = sections.flatMap((section, index) => {
      if (section.type !== "hero") return [section];
      if (!firstHeroSeen) {
        firstHeroSeen = true;
        return [section];
      }
      return repairHomepageSectionLegality({ ...section, type: section.slots.length === 2 ? "split" : "full" }, index);
    });
    actions.push("检测到多个 hero section，已仅保留首个 hero，其余改为合法业务 section。");
  }

  const beforeLegal = sections.map(homepageSectionSignature).join("|");
  sections = sections.flatMap(repairHomepageSectionLegality);
  if (sections.map(homepageSectionSignature).join("|") !== beforeLegal || initialValidation.invalidSections.length) {
    actions.push("已修复 split/full/hero 的 slots 数量，保证 sections 不出现非法结构。");
  }

  const requiredSlots = mergeUnique([guided.hasExplicitModuleSelection ? guided.mustHave || [] : mergeUnique([guided.mustHave || [], next.pageIntent?.mustHave || []])])
    .map(canonicalHomeBlock)
    .filter((slot) => slot && CANONICAL_HOME_BLOCKS.includes(slot));
  requiredSlots.forEach((slot) => {
    if (!homepageSectionsContainSlot(sections, slot)) {
      sections = insertHomepageSlotNearTop(sections, slot, LARGE_FULL_ROW_HOME_BLOCKS.has(slot) ? "full" : "full");
      actions.push(`补齐必选模块 ${slot} 到 sections。`);
    }
  });

  const heroFocus = guided.heroFocus || canonicalHomeBlock(next.heroFocus || next.pageIntent?.heroFocus);
  if (heroFocus) {
    const beforeHeroFocus = sections.map(homepageSectionSignature).join("|");
    sections = moveHomepageHeroFocusIntoCore(sections, heroFocus);
    next.heroFocus = heroFocus;
    if (sections.map(homepageSectionSignature).join("|") !== beforeHeroFocus) {
      actions.push(`已将 heroFocus=${heroFocus} 移入前两个核心 section。`);
    }
  }

  if (homepageSectionsContainSlot(sections, "risk_disclosure")) {
    const wasBottom = sections.at(-1)?.slots?.includes("risk_disclosure");
    sections = moveRiskDisclosureToFooter(sections);
    if (!wasBottom) actions.push("已将 risk_disclosure 移动到底部 full section。");
  }

  next.sections = sections.flatMap(repairHomepageSectionLegality);
  next = removeHomepageOptionalModules(next, guided, actions);

  if (homepageConfigHasMinimalistStyle(next, guided) && next.density === "compact") {
    next.density = "comfortable";
    actions.push("简约留白/minimalist 风格不使用 compact，density 已改为 comfortable。");
  }

  next.brickPlan = repairHomepageBrickPlan(next, next.sections);
  actions.push("已按 canonical module 标准化 brickIds、feature 和 component 映射。");
  next.layout = Array.isArray(next.layout)
    ? next.layout
        .map((block, index) => {
          const component = canonicalHomeBlock(block?.component || block?.feature);
          if (!component || !homepageSectionsContainSlot(next.sections, component)) return null;
          return {
            ...block,
            id: cleanText(block?.id, `${component}-${index + 1}`, 48),
            component,
            slot: LARGE_FULL_ROW_HOME_BLOCKS.has(component) ? "full" : ["hero", "main", "rail", "full"].includes(block?.slot) ? block.slot : "main",
          };
        })
        .filter(Boolean)
    : next.layout;
  if (Array.isArray(next.layout) && !next.layout.length) delete next.layout;

  enableHomepageSettingsForSections(next);
  if (homepageSectionsContainSlot(next.sections, "risk_disclosure")) {
    const settings = ensureHomepageModuleSettings(next.moduleSettings);
    settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: true };
    next.moduleSettings = settings;
    next.modules = { ...ensureObject(next.modules), RiskDisclosure: { variant: "legalStrip" } };
    next.moduleStyles = { ...ensureObject(next.moduleStyles), risk_disclosure: "legal-strip" };
  }
  next.autoLayout = normalizeServerAutoLayout(next.autoLayout, next.sections, next.layout);
  enforceServerComponentMorphs(next);

  const validation = validateHomepageConfig(next, guided);
  next.validation = validation;
  next.repairActions = [...new Set(actions)].slice(0, 16);

  return {
    config: next,
    validation,
    repairActions: next.repairActions,
    initialValidation,
  };
}

function morphModuleForHomeBlock(value) {
  const raw = String(value || "").trim();
  const canonical = canonicalHomeBlock(raw) || raw;
  return HOME_BLOCK_MORPH_MODULE_MAP[canonical] || HOME_BLOCK_MORPH_MODULE_MAP[raw] || "";
}

function moduleVariantFromConfig(config, moduleId) {
  const modules = config && typeof config.modules === "object" ? config.modules : {};
  const value = modules[moduleId] && typeof modules[moduleId] === "object" ? modules[moduleId].variant : "";
  return typeof value === "string" ? value : "";
}

function normalizeServerMorphId(moduleId, source, variant) {
  const pool = CORE_COMPONENT_MORPH_POOL[moduleId] || [];
  if (!pool.length) return "";
  const raw =
    typeof source === "string"
      ? source
      : source?.morph || source?.morphId || source?.id || source?.structureId || source?.domMorph || source?.variant;
  const alias = COMPONENT_MORPH_VARIANT_ALIASES[moduleId]?.[raw] || raw;
  if (pool.includes(alias)) return alias;
  const byVariant = COMPONENT_MORPH_VARIANT_ALIASES[moduleId]?.[variant];
  return pool.includes(byVariant) ? byVariant : pool[0];
}

function visibleMorphModules(config) {
  const modules = new Set();
  (Array.isArray(config?.sections) ? config.sections : []).forEach((section) => {
    (Array.isArray(section?.slots) ? section.slots : []).forEach((slot) => {
      const moduleId = morphModuleForHomeBlock(slot);
      if (moduleId) modules.add(moduleId);
    });
  });
  (Array.isArray(config?.layout) ? config.layout : []).forEach((block) => {
    const moduleId = morphModuleForHomeBlock(block?.component || block?.feature);
    if (moduleId) modules.add(moduleId);
  });
  (Array.isArray(config?.brickPlan) ? config.brickPlan : []).forEach((brick) => {
    const moduleId = CORE_COMPONENT_MORPH_POOL[brick?.family] ? brick.family : morphModuleForHomeBlock(brick?.component || brick?.feature);
    if (moduleId) modules.add(moduleId);
  });
  return modules;
}

function enforceServerComponentMorphs(config) {
  if (!config || typeof config !== "object") return config;
  const visible = visibleMorphModules(config);
  const source = config.componentMorphs && typeof config.componentMorphs === "object" && !Array.isArray(config.componentMorphs) ? config.componentMorphs : {};
  const next = { ...source };
  const usedVisibleMorphs = new Set();

  Object.keys(CORE_COMPONENT_MORPH_POOL).forEach((moduleId) => {
    const variant = moduleVariantFromConfig(config, moduleId);
    const explicit = source[moduleId];
    let morphId = normalizeServerMorphId(moduleId, explicit, variant);
    if (visible.has(moduleId) && usedVisibleMorphs.has(morphId)) {
      const alternate = CORE_COMPONENT_MORPH_POOL[moduleId].find((item) => !usedVisibleMorphs.has(item));
      if (alternate) morphId = alternate;
    }
    if (visible.has(moduleId)) usedVisibleMorphs.add(morphId);
    next[moduleId] = {
      ...(explicit && typeof explicit === "object" ? explicit : {}),
      variant: variant || (explicit && typeof explicit === "object" ? explicit.variant : "") || "",
      morph: morphId,
      morphId,
    };
  });

  config.componentMorphs = next;
  return config;
}

const COMPONENT_FAMILIES = [
  "WelcomeHeader",
  "AssetOverview",
  "WalletBalance",
  "FundActions",
  "QuickActions",
  "PromotionBanner",
  "ReferralLink",
  "ReferralLinkCard",
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

const COMPONENT_SIZES = ["1x1", "1x2", "2x1", "2x2", "3x1", "3x2", "4x1", "4x2", "4x3", "5x1", "5x2", "5x3"];
const COMPONENT_SIZE_PATTERN = /^([1-9]\d?)x([1-9]\d?)$/i;
const COMPONENT_SIZE_SCHEMA = {
  type: "string",
  pattern: "^[1-9]\\d?x[1-9]\\d?$",
};
const COMPONENT_SIZE_GUIDE = [
  "常用尺寸: 1x1, 1x2, 2x1, 2x2, 3x1, 3x2, 4x1, 4x2, 4x3, 5x1, 5x2, 5x3。",
  "也允许 AI 按 NxM 自行提出其他尺寸；N/M 必须是数字并用 x 连接，例如 6x2 或 8x3，同时在 reason/layoutHints 中说明适用场景、响应式降级和回退尺寸。",
  "布局映射约定: 1x 是侧栏/小卡，2x 是主栏，3x 及以上是整行或宽屏工作台；移动端统一降级为单列。",
].join(" ");

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
    mustHave: ["asset_overview", "quick_actions", "wallet_list", "trading_account_highlight", "trading_accounts_list"],
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
    primaryGoal: "代理/渠道诉求不生成完整代理数据区，只展示轻量推广链接、资产、快捷操作和账号列表。",
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
    positive: ["新手", "新客", "新用户", "刚注册", "开户注册", "开户引导", "开户路径", "开户流程", "开户", "账户开通", "开通进度", "注册", "kyc", "三步旅程", "三步", "开户表单", "创建真实账户", "创建账户", "未实名", "未完成实名", "onboarding"],
    negative: [/不要.{0,8}(开户|注册|kyc|表单)/i],
  },
  copytrading: {
    positive: ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐", "跟单推荐"],
    negative: [/不要.{0,8}(copytrading|跟单|信号源|推荐交易员)/i],
  },
  deposit: {
    positive: ["入金转化", "入金奖励", "入金奖励阶梯", "入金阶梯", "首存", "首存奖励", "充值", "首充", "首充奖励", "赠金", "赠金梯度", "存款奖励", "deposit bonus", "deposit ladder", "deposit conversion"],
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

const STRONG_ONBOARDING_INTENT_SIGNALS = [
  "新手",
  "新客",
  "新用户",
  "刚注册",
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
const REFERRAL_LINK_INTENT_SIGNALS = ["推广链接", "邀请链接", "开户链接", "注册链接", "邀请码", "代理", "渠道", "ib", "referral", "partner", "affiliate"];
const EXPLICIT_DEPOSIT_INTENT_SIGNALS = [
  "入金转化",
  "入金奖励",
  "入金奖励阶梯",
  "入金阶梯",
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

function hasStrongOnboardingIntentSignal(text) {
  const source = String(text || "");
  if (!textHasAny(source, STRONG_ONBOARDING_INTENT_SIGNALS)) return false;
  const referralOnly =
    textHasAny(source, REFERRAL_LINK_INTENT_SIGNALS) &&
    !textHasAny(source, STRONG_ONBOARDING_INTENT_SIGNALS.filter((signal) => signal !== "开户链接"));
  return !referralOnly;
}

function hasExplicitDepositIntentSignal(text) {
  return textHasAny(String(text || ""), EXPLICIT_DEPOSIT_INTENT_SIGNALS);
}

const HOMEPAGE_INTENT_SECTIONS = {
  standard: [
    { id: "standard-hero", type: "hero", title: "工作台", slots: ["asset_overview", "quick_actions"] },
    { id: "standard-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
    { id: "standard-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  asset: [
    { id: "asset-overview", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
    { id: "asset-wallets", type: "full", title: "钱包列表", slots: ["wallet_list"] },
    { id: "asset-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
    { id: "asset-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  growth: [
    { id: "growth-hero", type: "hero", title: "活动 Banner", slots: ["promo_banner"] },
    { id: "growth-actions", type: "split", title: "转化路径", slots: ["quick_actions", "asset_overview"] },
    { id: "growth-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  trader: [
    { id: "trader-tools", type: "hero", title: "交易操作", slots: ["quick_actions"] },
    { id: "trader-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
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
    { id: "deposit-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
    { id: "deposit-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  partner: [
    { id: "partner-hero", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] },
    { id: "partner-referral", type: "split", title: "推广链接", slots: ["referral_link_card", "announcements"] },
    { id: "partner-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  vip: [
    { id: "vip-hero", type: "hero", title: "资产概览", slots: ["asset_overview"] },
    { id: "vip-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
    { id: "vip-context", type: "split", title: "公告与资讯", slots: ["announcements", "market_news"] },
    { id: "vip-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  insight: [
    { id: "insight-performance", type: "full", title: "账户表现", slots: ["trading_account_highlight"] },
    { id: "insight-assets", type: "split", title: "资产与资讯", slots: ["asset_overview", "market_news"] },
    { id: "insight-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
  ],
  risk: [
    { id: "risk-hero", type: "hero", title: "风险提示", slots: ["risk_disclosure"] },
    { id: "risk-performance", type: "full", title: "账户表现", slots: ["trading_account_highlight"] },
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
    { id: "brand-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
    { id: "brand-campaign", type: "split", title: "品牌活动", slots: ["promo_banner"] },
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
    size: COMPONENT_SIZE_SCHEMA,
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    html: { type: "string" },
    css: { type: "string" },
    layoutHints: { type: "array", items: { type: "string" } },
    dataRequirements: { type: "array", items: { type: "string" } },
  },
};

const AI_HTML_SCHEME_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: ["html", "css"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    visualBrief: { type: "string" },
    moduleUnderstanding: { type: "object" },
    requiredModules: { type: "array", items: { type: "string" } },
    moduleMapping: { type: "object" },
    implementationContract: { type: "array", items: { type: "object" } },
    componentReferences: { type: "array", items: { type: "object" } },
    designNotes: { type: "array", items: { type: "string" } },
    html: { type: "string" },
    css: { type: "string" },
    dataBindings: { type: "array", items: { type: "string" } },
    qualityScore: { type: "number" },
    qualityStatus: { type: "string" },
	    qualityIssues: { type: "array", items: { type: "string" } },
	    aestheticChecks: { type: "array", items: { type: "string" } },
	    safetyNotes: { type: "array", items: { type: "string" } },
	    correctionNotes: { type: "array", items: { type: "string" } },
	    generationPipeline: { type: "string" },
	    correctionStatus: { type: "string" },
	    sourceType: { type: "string" },
	    isFallback: { type: "boolean" },
	    fallbackReason: { type: "string" },
	    modelAttempted: { type: "boolean" },
	    mock: { type: "boolean" },
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
          size: COMPONENT_SIZE_SCHEMA,
          zone: { enum: ["hero", "main", "rail", "full"] },
          reason: { type: "string" },
        },
      },
    },
    themeAdvice: { type: "string" },
    polishInstructions: { type: "string" },
  },
};

const AUTH_UI_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: ["name", "summary", "stylePreset", "screens"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    stylePreset: { enum: ["blueSplit", "clientOnboarding", "securityReset", "softPlatform", "photoDark"] },
    defaultScreen: { enum: ["login", "register", "forgot"] },
    language: { type: "string" },
    brand: {
      type: "object",
      additionalProperties: true,
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        serviceLine: { type: "string" },
      },
    },
    visual: {
      type: "object",
      additionalProperties: true,
      properties: {
        accent: { type: "string" },
        accent2: { type: "string" },
        panelTone: { type: "string" },
        radius: { type: "string" },
        density: { enum: ["compact", "comfortable", "spacious"] },
      },
    },
    experience: {
      type: "object",
      additionalProperties: true,
      properties: {
        audience: { type: "string" },
        intent: { type: "string" },
        registerDepth: { type: "string" },
        designStyle: { type: "string" },
        theme: { type: "string" },
        features: { type: "array", items: { type: "string" } },
      },
    },
    hero: {
      type: "object",
      additionalProperties: true,
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        bullets: { type: "array", items: { type: "string" } },
      },
    },
    screens: {
      type: "object",
      additionalProperties: true,
      properties: {
        login: { type: "object", additionalProperties: true },
        register: { type: "object", additionalProperties: true },
        forgot: { type: "object", additionalProperties: true },
      },
    },
    securityNotes: { type: "array", items: { type: "string" } },
    designNotes: { type: "array", items: { type: "string" } },
  },
};

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, accept",
  };
}

function sendOptions(res) {
  res.writeHead(204, {
    ...corsHeaders(),
    "access-control-max-age": "600",
  });
  res.end();
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...corsHeaders(),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendText(res, status, text) {
  res.writeHead(status, { ...corsHeaders(), "content-type": "text/plain; charset=utf-8" });
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
    temperature: normalizeTemperature(providerId, temperature, model),
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
  if (/^https?:\/\//i.test(config.endpoint || "")) return [current];

  if (config.provider === "minimax") {
    if (!MINIMAX_OFFICIAL_BASE_URLS.includes(current)) return [current];
    return [current, ...MINIMAX_OFFICIAL_BASE_URLS.filter((baseUrl) => baseUrl !== current)];
  }

  return [current];
}

function providerModelCandidates(config) {
  if (config.provider !== "kimi") return [config];
  if (!KIMI_LEGACY_MODELS.has(config.model) || /^https?:\/\//i.test(config.endpoint || "")) return [config];
  return [config, { ...config, model: KIMI_DEFAULT_MODEL, fallbackFromModel: config.model }];
}

function providerRequestCandidates(config) {
  const candidates = providerBaseUrlCandidates(config)
    .map((baseUrl) => ({ ...config, baseUrl }))
    .flatMap((candidate) => providerModelCandidates(candidate));
  if (config.provider !== "deepseek" || config.model !== DEEPSEEK_PRO_MODEL || /^https?:\/\//i.test(config.endpoint || "")) {
    return candidates;
  }
  return candidates.flatMap((candidate) => [candidate, { ...candidate, model: DEEPSEEK_FLASH_MODEL, fallbackFromModel: DEEPSEEK_PRO_MODEL }]);
}

function providerRequestTimeoutMs(config) {
  if (config.provider === "minimax") return 120_000;
  if (config.provider === "kimi") return KIMI_TIMEOUT_MS;
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

  if (config.provider === "kimi") {
    const status = Number(error.providerStatus);
    if ([401, 403, 404].includes(status)) return true;
    if (status === 400 && /key|token|model|endpoint|base|region|not found|invalid/i.test(error.message || "")) return true;
    return isTransientProviderError(error);
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
    colorMode: safeRecordText(source.colorMode || source.themeMode || source.appearanceMode || source.homeColorMode, 16),
    density: safeRecordText(source.density, 24),
    intent: safeRecordText(trace.intent, 40),
	    strategy: safeRecordText(trace.strategy || source.compositionStrategy, 120),
	    renderMode: safeRecordText(source.activeRenderMode || source.renderMode, 24),
	    htmlScheme: source.htmlScheme?.enabled ? safeRecordText(source.htmlScheme.name || "AI HTML", 80) : "",
	    htmlSourceType: source.htmlScheme?.enabled ? safeRecordText(source.htmlScheme.sourceType, 48) : "",
	    htmlPipeline: source.htmlScheme?.enabled ? safeRecordText(source.htmlScheme.generationPipeline, 48) : "",
	    htmlIsFallback: Boolean(source.htmlScheme?.enabled && source.htmlScheme.isFallback),
	    htmlMock: Boolean(source.htmlScheme?.enabled && source.htmlScheme.mock),
	    htmlQualityStatus: safeRecordText(source.htmlQualityStatus || source.quality?.status || (source.htmlScheme?.enabled ? source.htmlScheme.qualityStatus : ""), 40),
	    qualityScore: Number.isFinite(Number(source.qualityScore || source.quality?.score || source.htmlScheme?.qualityScore)) ? Math.round(Number(source.qualityScore || source.quality?.score || source.htmlScheme?.qualityScore)) : null,
	    htmlFallbackReason: source.htmlScheme?.enabled ? safeRecordText(source.htmlScheme.fallbackReason, 180) : "",
	    validationWarnings: source.validation?.warnings?.length || 0,
	    repairActions: Array.isArray(source.repairActions) ? source.repairActions.slice(0, 6) : [],
	    skeletonScheme: source.skeletonHtmlScheme?.enabled ? safeRecordText(source.skeletonHtmlScheme.name || "骨架 HTML 填充", 80) : "",
	    skeletonSlots: source.skeletonHtmlScheme?.enabled && Array.isArray(source.skeletonHtmlScheme.slots) ? source.skeletonHtmlScheme.slots.length : 0,
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

function readAuthCallHistory() {
  const data = readJsonFile(AUTH_CALL_HISTORY_FILE, { records: [] });
  return Array.isArray(data.records) ? data.records.slice(0, MAX_AUTH_CALL_HISTORY) : [];
}

function writeAuthCallHistory(records) {
  const normalized = (Array.isArray(records) ? records : []).slice(0, MAX_AUTH_CALL_HISTORY);
  writeJsonFile(AUTH_CALL_HISTORY_FILE, { records: normalized });
  return normalized;
}

function addAuthCallHistoryRecord(record) {
  const records = readAuthCallHistory();
  const nextRecord = {
    id: `auth-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    source: "authServerProxy",
    ...record,
  };
  writeAuthCallHistory([nextRecord, ...records]);
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

function normalizeComponentSize(value, fallback = "2x1") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[×*]/g, "x");
  if (COMPONENT_SIZE_PATTERN.test(normalized)) return normalized;
  return fallback;
}

function normalizeComponentScore(value, fallback = 5) {
  const score = Number(value);
  if (!Number.isFinite(score)) return fallback;
  return Math.min(10, Math.max(1, Math.round(score)));
}

function autoComponentSizeForFamily(family) {
  if (["PromotionBanner", "AssetOverview", "QuickActions"].includes(family)) return "4x1";
  if (["TradingAccounts", "AccountPerformance", "WalletList"].includes(family)) return "4x2";
  if (["CreateAccountForm", "OnboardingProgress"].includes(family)) return "4x3";
  return "2x1";
}

function componentSizeRows(size) {
  const match = normalizeComponentSize(size, "2x1").match(/x([1-9]\d?)$/);
  return match ? Number(match[1]) || 1 : 1;
}

function componentSizePromptLabel(value, fallback = "2x1") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["auto", "ai", "free"].includes(normalized)) return "AI 自行选择尺寸";
  return normalizeComponentSize(value, fallback);
}

function homepageRenderMode(payload) {
  const value = cleanText(payload?.renderMode || payload?.generationRenderMode || payload?.context?.renderMode, "config", 24);
  return ["config", "aiHtml", "skeletonHtml", "compare"].includes(value) ? value : "config";
}

function normalizeServerHomeColorMode(value, fallback = "auto") {
  const source = cleanText(value, fallback, 24).toLowerCase();
  if (["dark", "night", "night-mode", "暗夜", "夜间", "黑夜"].includes(source)) return "dark";
  if (["light", "day", "day-mode", "白天", "日间", "亮色"].includes(source)) return "light";
  return "auto";
}

function homeColorModeFromPrompt(prompt, fallback = "auto") {
  const source = String(prompt || "");
  const text = `${source.toLowerCase()} ${source}`;
  const wantsDark = textHasAny(text, ["暗夜", "夜间", "黑夜", "夜色", "dark mode", "night mode", "暗色模式"]);
  const wantsLight = textHasAny(text, ["白天", "日间", "亮色", "浅色模式", "light mode", "day mode"]);
  if (wantsDark && !wantsLight) return "dark";
  if (wantsLight && !wantsDark) return "light";
  if (wantsDark && wantsLight) return "auto";
  return normalizeServerHomeColorMode(fallback);
}

function renderModeWantsAiHtml(mode) {
  return mode === "aiHtml" || mode === "compare";
}

function activeRenderModeForRequest(renderMode, htmlScheme = null) {
  if (renderMode === "aiHtml" && htmlScheme?.enabled) return "aiHtml";
  if (renderMode === "skeletonHtml") return "skeletonHtml";
  return "config";
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

function sanitizeAiHtmlMarkup(value) {
  return sanitizeGeneratedHtml(value)
    .replace(/<(?:iframe|object|embed|link|meta|base|form|input|textarea|select)\b[\s\S]*?<\/(?:iframe|object|embed|link|meta|base|form|input|textarea|select)>/gi, "")
    .replace(/<(?:iframe|object|embed|link|meta|base|form|input|textarea|select)\b[^>]*\/?>/gi, "")
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, "")
    .replace(/\sstyle\s*=\s*'[^']*'/gi, "")
    .replace(/\shref\s*=\s*"(?!#|\/|\.\/|\.\.\/)[^"]*"/gi, ' href="#"')
    .replace(/\shref\s*=\s*'(?!#|\/|\.\/|\.\.\/)[^']*'/gi, " href='#'")
    .slice(0, 18000);
}

function sanitizeAiHtmlCss(value) {
  return sanitizeGeneratedCss(value)
    .replace(/position\s*:\s*fixed\s*;?/gi, "")
    .replace(/(?:^|})\s*(?:html|body)\s*\{/gi, " .ai-html-page{")
    .slice(0, 18000);
}

function shouldRemoveComponentEyebrow(label, primaryTitle) {
  const labelText = stripHtmlTags(label);
  const titleText = stripHtmlTags(primaryTitle);
  if (!labelText || !titleText) return false;
  if (labelText.length > 80 || titleText.length > 120) return false;
  if (!/[A-Za-z\u4e00-\u9fff]/.test(titleText)) return false;
  if (/^\d+\s*\/\s*\d+$/i.test(titleText)) return false;
  if (/^[\d\s.,:+/%$€¥￥-]+$/i.test(titleText)) return false;
  return true;
}

function collapseDuplicateComponentTitles(value) {
  const titlePattern = "((?:<strong\\b[^>]*>|<h[1-4]\\b[^>]*>)[^<]{1,180}<\\/(?:strong|h[1-4])>)";
  const patterns = [
    new RegExp(`(<(?:section|article|div)\\b[^>]*>\\s*)<(span|small|label)\\b[^>]*>([^<]{1,100})<\\/\\2>\\s*${titlePattern}`, "gi"),
    new RegExp(`(<header\\b[^>]*>\\s*)<(span|small|label)\\b[^>]*>([^<]{1,100})<\\/\\2>\\s*${titlePattern}`, "gi"),
  ];

  return patterns.reduce(
    (html, pattern) =>
      html.replace(pattern, (match, prefix, tag, label, primaryTitle) =>
        shouldRemoveComponentEyebrow(label, primaryTitle) ? `${prefix}${primaryTitle}` : match,
      ),
    String(value || ""),
  );
}

function cleanText(value, fallback = "", limit = 220) {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  return text.slice(0, limit);
}

function readDesignRulesText() {
  try {
    if (!fs.existsSync(DESIGN_RULES_FILE)) return "";
    return fs.readFileSync(DESIGN_RULES_FILE, "utf8").slice(0, 80_000);
  } catch (error) {
    return "";
  }
}

function readGovernanceReferenceText(filePath, limit = 40_000) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8").slice(0, limit);
  } catch (error) {
    return "";
  }
}

function summarizeGovernanceReference(raw, options = {}) {
  const source = cleanText(options.source, "governance", 80);
  const keywords = Array.isArray(options.keywords) ? options.keywords : [];
  const maxRules = Math.max(1, Math.min(Number(options.maxRules) || 8, 14));
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .filter((line) => line && !line.startsWith("|") && !line.startsWith("```") && !/^#{1,6}\s*$/.test(line));
  const matched = lines.filter((line) => keywords.some((keyword) => line.toLowerCase().includes(String(keyword).toLowerCase()) || line.includes(String(keyword))));
  return {
    source,
    status: raw.trim() ? "loaded" : "missing",
    rules: (matched.length ? matched : lines)
      .map((line) => cleanText(line.replace(/^#{1,6}\s+/, ""), "", 180))
      .filter(Boolean)
      .slice(0, maxRules),
  };
}

function designRulesPromptReference() {
  const raw = readDesignRulesText();
  const protocolReference = summarizeGovernanceReference(readGovernanceReferenceText(UI_GENERATION_PROTOCOL_FILE), {
    source: "AI_UI_GENERATION_PROTOCOL.md",
    keywords: ["Component-library", "Quality Gate", "AI HTML", "allowed", "component", "implementation", "ECharts", "responsive", "CopyTrading"],
    maxRules: 10,
  });
  const bricksReference = summarizeGovernanceReference(readGovernanceReferenceText(HOME_MODULE_BRICKS_FILE), {
    source: "home-module-bricks.md",
    keywords: ["AI 组件生成链路", "组件库", "尺寸", "responsive", "canonical", "禁止项", "积木"],
    maxRules: 8,
  });
  const fallbackRules = [
    "美观必须来自信息层级、间距、状态、表格/列表扫描效率、空状态和交互细节，而不是营销式 hero、随机渐变、厚重阴影或卡片堆叠。",
    "AI 必须先判断页面意图、所属端、页面类型和需要承接的模块，再组合已有组件/积木，不直接自由写完整 HTML。",
    "AI HTML 只能在设计 token 和组件库语义内自由发挥；颜色、圆角、阴影、响应式和暗色模式必须符合 ForexCRM / Nxbroker 金融 CRM 气质。",
    "公共骨架、主题切换、导航、顶部栏、tab、数据绑定、系统动作和组件库能力必须由系统承接，不允许模型重新发明。",
  ];
  if (!raw.trim()) {
    return {
      source: "design.md",
      status: "missing",
      rules: fallbackRules,
      protocolReference,
      bricksReference,
    };
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headings = [];
  const rules = [];
  const forbidden = [];
  const generationFlow = [];

  lines.forEach((line) => {
    if (/^#{1,3}\s+/.test(line)) {
      headings.push(cleanText(line.replace(/^#{1,3}\s+/, ""), "", 80));
      return;
    }

    const normalized = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
    if (!normalized || normalized.startsWith("|") || normalized.startsWith("```")) return;
    if (/(禁止|不要|不得|避免)/.test(normalized)) {
      forbidden.push(cleanText(normalized, "", 180));
      return;
    }
    if (/(必须|优先|应该|统一|只能|先判断|生成前|生成后|自检|流程)/.test(normalized)) {
      if (/(流程|生成前|生成后|自检|判断|输出前)/.test(normalized)) generationFlow.push(cleanText(normalized, "", 180));
      else rules.push(cleanText(normalized, "", 180));
    }
  });

  return {
    source: "design.md",
    status: "loaded",
    headings: headings.slice(0, 12),
    rules: (rules.length ? rules : fallbackRules).slice(0, 18),
    forbidden: forbidden.slice(0, 14),
    generationFlow: generationFlow.slice(0, 10),
    protocolReference,
    bricksReference,
    usePolicy: "先用 design.md 锁住产品骨架、组件语义、token、暗色/移动端和禁用项，再允许 AI 在信息层级、模块比例、状态细节和响应式上做美化。",
  };
}

function normalizeServerHexColor(value) {
  const match = String(value || "").match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (!match) return "";
  const raw = match[0].toLowerCase();
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
}

function compactServerThemeObject(source) {
  return Object.fromEntries(Object.entries(source || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function serverThemePaletteForText(input, explicitPrimaryColor = "") {
  const source = String(input || "");
  const text = `${source.toLowerCase()} ${source}`;
  const hasAny = (words) => words.some((word) => text.includes(String(word).toLowerCase()) || text.includes(String(word)));
  const palette = hasAny(["莫兰迪", "morandi"])
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
    : hasAny(["黑金", "高净值", "vip", "尊贵", "机构", "大客户"])
    ? {
        primaryColor: "#b7791f",
        accentColor: "#f5c451",
        backgroundStyle: hasAny(["不要太暗", "不太暗", "清爽", "浅", "明亮"])
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
    : hasAny(["暗色科技", "科技黑", "终端", "赛博", "cyber", "dark tech", "terminal"])
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
    : hasAny(["清爽", "科技", "高级", "国际", "金融", "蓝", "fresh", "clean", "global"])
    ? {
        primaryColor: "#0ea5e9",
        accentColor: "#14b8a6",
        backgroundStyle: "radial-gradient(circle at 78% 8%, rgba(14, 165, 233, 0.12), transparent 30%), linear-gradient(180deg, #ffffff 0%, #eef8fb 100%)",
        cardStyle: "rgba(255, 255, 255, 0.98)",
        surfaceColor: "#ffffff",
        surfaceSoft: "#f0f9ff",
        surfaceMuted: "#eaf7f6",
        textStrong: "#0f172a",
        textColor: "#172033",
        textSoft: "#475569",
        textMuted: "#64748b",
        borderColor: "#bde7f6",
        borderSoft: "#d9f0f7",
        buttonStyle: "linear-gradient(135deg, #0ea5e9, #14b8a6)",
        buttonText: "#ffffff",
        cardShadow: "0 16px 34px rgba(14, 165, 233, 0.1)",
      }
    : hasAny(["极简", "minimal", "白", "留白", "克制"])
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
        accentColor: `color-mix(in srgb, ${explicitPrimaryColor} 68%, #14b8a6)`,
        backgroundStyle: `linear-gradient(180deg, color-mix(in srgb, ${explicitPrimaryColor} 7%, #ffffff), #ffffff)`,
        cardStyle: "rgba(255, 255, 255, 0.98)",
        surfaceColor: "#ffffff",
        surfaceSoft: `color-mix(in srgb, ${explicitPrimaryColor} 8%, #ffffff)`,
        surfaceMuted: `color-mix(in srgb, ${explicitPrimaryColor} 5%, #ffffff)`,
        textStrong: "#0f172a",
        textColor: "#172033",
        textSoft: "#475569",
        textMuted: "#64748b",
        borderColor: `color-mix(in srgb, ${explicitPrimaryColor} 32%, #dce6f4)`,
        borderSoft: `color-mix(in srgb, ${explicitPrimaryColor} 18%, #edf2f7)`,
        buttonStyle: `linear-gradient(135deg, ${explicitPrimaryColor}, color-mix(in srgb, ${explicitPrimaryColor} 78%, #111827))`,
        buttonText: "#ffffff",
        cardShadow: `0 16px 34px color-mix(in srgb, ${explicitPrimaryColor} 13%, transparent)`,
      }
    : null;

  if (!palette) return null;
  const primaryColor = explicitPrimaryColor || palette.primaryColor;
  return compactServerThemeObject({
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

function normalizeServerThemeCustom(value) {
  const source = typeof value === "string" ? { input: value } : value && typeof value === "object" ? value : null;
  const input = cleanText(source?.input || source?.value || "", "", 96);
  const primaryColor = normalizeServerHexColor(source?.primaryColor || input);
  const palette = serverThemePaletteForText(input, primaryColor);
  return input ? compactServerThemeObject({ input, ...palette, primaryColor: primaryColor || palette?.primaryColor || "" }) : null;
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
  const size = normalizeComponentSize(source.size || payload.size, "2x1");
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
    score: normalizeComponentScore(source.score ?? payload.componentScore, 5),
    description: cleanText(stripEditorArtifactsFromText(source.description), "AI 生成的首页积木组件。", 260),
    tags: (Array.isArray(source.tags) ? source.tags : [family, size]).map((tag) => cleanText(tag, "", 28)).filter(Boolean).slice(0, 8),
    html: collapseDuplicateComponentTitles(stripEditorArtifactsFromHtml(sanitizeGeneratedHtml(source.html))),
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
    "风险",
    "风险披露",
    "合规",
    "保证金",
    "杠杆",
    "在线客服",
    "联系客服",
    "客服",
    "客户经理",
    "服务时间",
    "帮助中心",
    "工单",
    "实时对话",
    "Support",
    "Contact",
    "Ticket",
    "Live Chat",
  ];
  return !businessSignals.some((signal) => source.includes(signal));
}

function generatedComponentViolatesFamily(component, payload = {}) {
  const family = oneOfList(component?.family || payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const source = `${component?.name || ""} ${component?.description || ""} ${component?.html || ""}`;
  if (family === "RiskDisclosure") {
    const hasRiskSemantics = /风险|风险披露|合规|免责声明|保证金|杠杆|强平|亏损|Risk|Disclosure|Margin|Leverage|Loss/i.test(source);
    const looksLikeAccountOverview = /Account Overview|Wallet Balance|Trading Balance|Total Assets|Deposit|Open Account|账户概览|资产概览|钱包余额|交易余额/i.test(source);
    return !hasRiskSemantics || looksLikeAccountOverview;
  }
  if (family === "SupportContact") {
    const hasSupportSemantics = /在线客服|联系客服|客服|客户经理|服务时间|帮助中心|工单|实时对话|Support|Contact|Ticket|Live Chat|Manager|Service Hours/i.test(source);
    const leaksPrompt = /首页目标|当前步骤|slot：|模块名称：|Client Home Atom/i.test(source);
    const looksLikeAccountOverview = /Account Overview|Wallet Balance|Trading Balance|Total Assets|KYC Verified|Open Account|账户概览|资产概览|钱包余额|交易余额|开真实账户/i.test(source);
    return !hasSupportSemantics || leaksPrompt || looksLikeAccountOverview;
  }
  return false;
}

function readComponentLibrary() {
  const data = readJsonFile(COMPONENT_LIBRARY_FILE, { components: [] });
  const components = Array.isArray(data.components)
    ? data.components
        .map((item) => normalizeGeneratedComponent(item, {}, { preserveUpdatedAt: true }))
        .filter((item) => item.html && item.css && !generatedComponentTooGeneric(item) && !generatedComponentViolatesFamily(item, { family: item.family }))
    : [];
  return { components };
}

function readRawComponentLibrary() {
  const data = readJsonFile(COMPONENT_LIBRARY_FILE, { components: [] });
  return {
    components: Array.isArray(data.components) ? data.components.filter((component) => component && typeof component === "object") : [],
  };
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
    score: normalizeComponentScore(component.score, 5),
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
      const userScore = normalizeComponentScore(component.score, 5);
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
          userScore * 18 +
          (family && component.family === family ? 80 : 0) +
          (size && component.size === size ? 22 : 0) +
          promptHits * 8 +
          Math.max(0, 20 - Math.min(index, 20)) * 0.2,
      };
    })
    .sort((a, b) => b.score - a.score || normalizeComponentScore(b.component.score, 5) - normalizeComponentScore(a.component.score, 5))
    .map((item) => item.component)
    .slice(0, limit);
}

function componentLibraryPromptReference(options = {}) {
  const components = readComponentLibrary().components;
  const selected = rankComponentReferences(components, options);

  return {
    referenceMode: "先参考已保存组件库积木的业务字段、尺寸、按钮、标签、卡片密度和视觉层级，再根据本次意图做新组合或新变体。",
    scoringRule: "score 为用户 1-10 分评分；同等相关性下优先参考高分组件。",
    freedomRule: "允许有 AI 灵感，但灵感必须依托现有父模块、真实字段、可用尺寸或组件语言；不能把组件库参考当成新增业务能力授权。",
    availableCount: components.length,
    selectedComponents: selected.map(summarizeComponentForPrompt),
  };
}

function scoreContextPromptReference(value) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => ({
      type: cleanText(item?.type, "", 32),
      family: cleanText(item?.family, "", 80),
      name: cleanText(item?.name, "", 80),
      size: normalizeComponentSize(item?.size, "2x1"),
      score: normalizeComponentScore(item?.score, 5),
      visibleText: cleanText(item?.visibleText, "", 260),
      description: cleanText(item?.description, "", 180),
    }))
    .filter((item) => item.name && item.family)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
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

function normalizeDesignFunction(item = {}) {
  return {
    name: cleanText(item.name || item.label, "首页功能", 60),
    objective: cleanText(item.objective || item.goal || item.description, "", 180),
    modules: (Array.isArray(item.modules) ? item.modules : []).map((module) => cleanText(module, "", 80)).filter(Boolean).slice(0, 10),
    data: (Array.isArray(item.data) ? item.data : []).map((field) => cleanText(field, "", 80)).filter(Boolean).slice(0, 10),
    actions: (Array.isArray(item.actions) ? item.actions : []).map((action) => cleanText(action, "", 80)).filter(Boolean).slice(0, 8),
    states: (Array.isArray(item.states) ? item.states : []).map((state) => cleanText(state, "", 80)).filter(Boolean).slice(0, 8),
  };
}

function normalizeSampleBlock(item = {}) {
  return {
    id: safeId(item.id || item.name || item.label, "sample-block"),
    name: cleanText(item.name || item.label, "样本块", 60),
    page: cleanText(item.page || item.pageRole || item.area, "", 80),
    function: cleanText(item.function || item.functionName || item.objective, "", 160),
    componentRefs: (Array.isArray(item.componentRefs) ? item.componentRefs : []).map((id) => cleanText(id, "", 80)).filter(Boolean).slice(0, 8),
    visualNotes: (Array.isArray(item.visualNotes) ? item.visualNotes : []).map((note) => cleanText(note, "", 120)).filter(Boolean).slice(0, 6),
    dataFields: (Array.isArray(item.dataFields) ? item.dataFields : []).map((field) => cleanText(field, "", 80)).filter(Boolean).slice(0, 8),
  };
}

function normalizeDesignSample(sample = {}) {
  const page = sample.page && typeof sample.page === "object" ? sample.page : {};
  return {
    id: safeId(sample.id || sample.name, "design-sample"),
    name: cleanText(sample.name, "首页审美样本", 80),
    scenario: cleanText(sample.scenario || sample.intent || sample.pageIntent, "", 120),
    pageIntent: cleanText(sample.pageIntent || sample.intent, "", 60),
    visualStyle: cleanText(sample.visualStyle || sample.style, "", 80),
    aestheticScore: Number.isFinite(Number(sample.aestheticScore)) ? Math.max(0, Math.min(100, Math.round(Number(sample.aestheticScore)))) : 88,
    tags: (Array.isArray(sample.tags) ? sample.tags : []).map((tag) => cleanText(tag, "", 36)).filter(Boolean).slice(0, 12),
    page: {
      name: cleanText(page.name || sample.name, "首页页面", 80),
      layout: cleanText(page.layout, "", 180),
      hero: cleanText(page.hero, "", 180),
      navigation: cleanText(page.navigation, "", 140),
      mobile: cleanText(page.mobile, "", 160),
    },
    functions: (Array.isArray(sample.functions) ? sample.functions : []).map(normalizeDesignFunction).slice(0, 10),
    sampleBlocks: (Array.isArray(sample.sampleBlocks) ? sample.sampleBlocks : []).map(normalizeSampleBlock).slice(0, 12),
    componentRefs: (Array.isArray(sample.componentRefs) ? sample.componentRefs : []).map((id) => cleanText(id, "", 80)).filter(Boolean).slice(0, 12),
    goodPatterns: (Array.isArray(sample.goodPatterns) ? sample.goodPatterns : []).map((item) => cleanText(item, "", 140)).filter(Boolean).slice(0, 10),
    avoidPatterns: (Array.isArray(sample.avoidPatterns) ? sample.avoidPatterns : []).map((item) => cleanText(item, "", 140)).filter(Boolean).slice(0, 10),
    promptSeeds: (Array.isArray(sample.promptSeeds) ? sample.promptSeeds : []).map((item) => cleanText(item, "", 260)).filter(Boolean).slice(0, 8),
    createdAt: sample.createdAt || new Date().toISOString(),
    updatedAt: sample.updatedAt || sample.createdAt || new Date().toISOString(),
  };
}

function readDesignSamples() {
  const data = readJsonFile(DESIGN_SAMPLE_FILE, { samples: [] });
  return {
    version: Number.isFinite(Number(data.version)) ? Number(data.version) : 1,
    updatedAt: cleanText(data.updatedAt, "", 40) || new Date().toISOString(),
    samples: (Array.isArray(data.samples) ? data.samples : []).map(normalizeDesignSample),
  };
}

function writeDesignSamples(samples) {
  const normalized = (Array.isArray(samples) ? samples : []).map(normalizeDesignSample);
  const payload = { version: 1, updatedAt: new Date().toISOString(), samples: normalized };
  writeJsonFile(DESIGN_SAMPLE_FILE, payload);
  return payload;
}

function saveDesignSample(sample) {
  const library = readDesignSamples();
  const normalized = normalizeDesignSample(sample);
  return {
    sample: normalized,
    library: writeDesignSamples(library.samples.filter((item) => item.id !== normalized.id).concat(normalized)),
  };
}

function designSampleSearchText(sample) {
  return normalizeKeywordText(
    [
      sample.id,
      sample.name,
      sample.scenario,
      sample.pageIntent,
      sample.visualStyle,
      ...(Array.isArray(sample.tags) ? sample.tags : []),
      sample.page?.layout,
      sample.page?.hero,
      ...(Array.isArray(sample.functions) ? sample.functions.flatMap((item) => [item.name, item.objective, ...(item.modules || []), ...(item.actions || [])]) : []),
      ...(Array.isArray(sample.sampleBlocks) ? sample.sampleBlocks.flatMap((item) => [item.name, item.page, item.function, ...(item.visualNotes || [])]) : []),
      ...(Array.isArray(sample.goodPatterns) ? sample.goodPatterns : []),
    ].join(" "),
  );
}

function rankDesignSamplesForPrompt(prompt, limit = 4) {
  const text = normalizeKeywordText(prompt);
  const words = text.split(/\s+|[，,。；;、]/).filter((word) => word.length >= 2);
  return readDesignSamples().samples
    .map((sample, index) => {
      const haystack = designSampleSearchText(sample);
      const promptHits = words.filter((word) => haystack.includes(word)).length;
      const tagHits = (sample.tags || []).filter((tag) => text.includes(String(tag).toLowerCase()) || text.includes(String(tag))).length;
      return {
        sample,
        score: promptHits * 8 + tagHits * 14 + Math.round((sample.aestheticScore || 0) / 10) - index * 0.01,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.sample)
    .slice(0, Math.max(1, Math.min(Number(limit) || 4, 8)));
}

function summarizeDesignSampleForPrompt(sample) {
  return {
    id: sample.id,
    name: sample.name,
    scenario: sample.scenario,
    pageIntent: sample.pageIntent,
    visualStyle: sample.visualStyle,
    aestheticScore: sample.aestheticScore,
    page: sample.page,
    functions: sample.functions.slice(0, 5),
    sampleBlocks: sample.sampleBlocks.slice(0, 6),
    componentRefs: sample.componentRefs.slice(0, 8),
    goodPatterns: sample.goodPatterns.slice(0, 8),
    avoidPatterns: sample.avoidPatterns.slice(0, 6),
  };
}

function componentAestheticWeight(component = {}) {
  const source = normalizeKeywordText([
    component.id,
    component.name,
    component.family,
    component.description,
    component.html,
    component.css,
    ...(Array.isArray(component.tags) ? component.tags : []),
  ].join(" "));
  let score = 0;
  [
    "vip",
    "hero",
    "blackgold",
    "chart",
    "dock",
    "console",
    "journey",
    "campaign",
    "carousel",
    "premium",
    "专业",
    "黑金",
    "高净值",
    "图表",
    "轮播",
    "开户",
  ].forEach((signal) => {
    if (source.includes(signal)) score += 8;
  });
  if (/display\s*:\s*grid/i.test(component.css || "")) score += 6;
  if (/linear-gradient|radial-gradient/i.test(component.css || "")) score += 4;
  if (/svg|path|chart|curve|progress|step|timeline/i.test(`${component.html || ""} ${component.css || ""}`)) score += 6;
  return score;
}

function beautifulComponentReferences(options = {}) {
  const prompt = cleanText(options.prompt, "", 1200);
  const limit = Math.max(1, Math.min(Number(options.limit) || 8, 16));
  const ranked = rankComponentReferences(readComponentLibrary().components, { ...options, limit: 16 })
    .map((component, index) => ({ component, score: componentAestheticWeight(component) - index }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.component)
    .slice(0, limit);

  return ranked.map((component) => ({
    ...summarizeComponentForPrompt(component),
    aestheticValue: componentAestheticWeight(component),
    reuseAdvice: "参考它的字段密度、按钮层级、卡片比例和状态表达，但不要逐字复制 HTML/CSS。",
    matchedPrompt: Boolean(prompt && designSampleSearchText({ ...normalizeDesignSample({ name: component.name, tags: component.tags || [], functions: [] }) }).includes(normalizeKeywordText(prompt).slice(0, 16))),
  }));
}

function readAestheticScoreRecords() {
  const data = readJsonFile(AESTHETIC_SCORE_FILE, { records: [] });
  return Array.isArray(data.records) ? data.records.slice(0, MAX_AESTHETIC_SCORE_RECORDS) : [];
}

function writeAestheticScoreRecords(records) {
  const normalized = (Array.isArray(records) ? records : []).slice(0, MAX_AESTHETIC_SCORE_RECORDS);
  writeJsonFile(AESTHETIC_SCORE_FILE, { records: normalized });
  return normalized;
}

function addAestheticScoreRecord(record) {
  const records = readAestheticScoreRecords();
  const nextRecord = {
    id: `score-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    ...record,
  };
  writeAestheticScoreRecords([nextRecord, ...records]);
  return nextRecord;
}

function readFeedbackMemoryRecords() {
  const data = readJsonFile(FEEDBACK_MEMORY_FILE, { records: [] });
  return Array.isArray(data.records) ? data.records.slice(0, MAX_FEEDBACK_MEMORY_RECORDS) : [];
}

function writeFeedbackMemoryRecords(records) {
  const normalized = (Array.isArray(records) ? records : []).slice(0, MAX_FEEDBACK_MEMORY_RECORDS);
  writeJsonFile(FEEDBACK_MEMORY_FILE, { records: normalized });
  return normalized;
}

function addFeedbackMemoryRecord(record) {
  const records = readFeedbackMemoryRecords();
  const nextRecord = {
    id: `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    ...record,
  };
  writeFeedbackMemoryRecords([nextRecord, ...records]);
  return nextRecord;
}

function ensureReferenceAssetDir() {
  fs.mkdirSync(REFERENCE_ASSET_DIR, { recursive: true });
}

function referenceAssetType(mime = "", filename = "") {
  const source = `${mime} ${filename}`.toLowerCase();
  if (/image\/|\.png|\.jpe?g|\.webp|\.gif$/.test(source)) return "image";
  if (/html|\.html?$/.test(source)) return "html";
  if (/pdf|\.pdf$/.test(source)) return "pdf";
  return "file";
}

function referenceAssetExtension(mime = "", filename = "") {
  const ext = path.extname(filename || "").replace(".", "").toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "html", "htm", "pdf", "txt"].includes(ext)) {
    return ext === "htm" ? "html" : ext;
  }
  if (/png/i.test(mime)) return "png";
  if (/jpe?g/i.test(mime)) return "jpg";
  if (/webp/i.test(mime)) return "webp";
  if (/gif/i.test(mime)) return "gif";
  if (/html/i.test(mime)) return "html";
  if (/pdf/i.test(mime)) return "pdf";
  if (/text/i.test(mime)) return "txt";
  return "txt";
}

function normalizeReferenceAsset(record = {}) {
  const name = cleanText(record.name, "参考稿", 120);
  const mime = cleanText(record.mime, "", 80);
  const url = cleanText(record.url, "", 220);
  return {
    id: safeId(record.id || name, "reference"),
    at: record.at || record.createdAt || new Date().toISOString(),
    name,
    type: cleanText(record.type || referenceAssetType(mime, name), "file", 24),
    mime,
    size: Number.isFinite(Number(record.size)) ? Math.max(0, Number(record.size)) : 0,
    fileName: cleanText(record.fileName, "", 180),
    storagePath: cleanText(record.storagePath, "", 260),
    url,
    note: cleanText(record.note, "", 700),
    tags: (Array.isArray(record.tags) ? record.tags : []).map((tag) => cleanText(tag, "", 36)).filter(Boolean).slice(0, 12),
    textExcerpt: cleanText(record.textExcerpt, "", 900),
    createdAt: record.createdAt || record.at || new Date().toISOString(),
  };
}

function readReferenceAssets() {
  const data = readJsonFile(REFERENCE_ASSET_FILE, { records: [] });
  return (Array.isArray(data.records) ? data.records : []).map(normalizeReferenceAsset).slice(0, MAX_REFERENCE_ASSETS);
}

function writeReferenceAssets(records) {
  const normalized = (Array.isArray(records) ? records : []).map(normalizeReferenceAsset).slice(0, MAX_REFERENCE_ASSETS);
  writeJsonFile(REFERENCE_ASSET_FILE, { version: 1, updatedAt: new Date().toISOString(), records: normalized });
  return normalized;
}

function decodeReferenceDataUrl(dataUrl = "") {
  const match = String(dataUrl || "").match(/^data:([^;,]+)?;base64,(.+)$/i);
  if (!match) return null;
  return {
    mime: cleanText(match[1], "application/octet-stream", 80),
    buffer: Buffer.from(match[2], "base64"),
  };
}

function saveReferenceAsset(asset = {}) {
  ensureReferenceAssetDir();
  const now = new Date().toISOString();
  const name = cleanText(asset.name, "参考稿", 120);
  const inputMime = cleanText(asset.mime, "", 80);
  const type = referenceAssetType(inputMime, name);
  const ext = referenceAssetExtension(inputMime, name);
  const id = `reference-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const baseName = safeId(path.basename(name, path.extname(name)), "asset");
  const fileName = `${id}-${baseName}.${ext}`;
  const filePath = path.join(REFERENCE_ASSET_DIR, fileName);
  let mime = inputMime;
  let buffer = null;
  let textExcerpt = "";

  if (asset.textContent || type === "html") {
    const rawText = String(asset.textContent || "");
    const text = ext === "html" ? sanitizeGeneratedHtml(rawText) : rawText.slice(0, 200_000);
    buffer = Buffer.from(text, "utf8");
    mime = ext === "html" ? "text/html" : "text/plain";
    textExcerpt = cleanText(text.replace(/<[^>]+>/g, " "), "", 900);
  } else {
    const decoded = decodeReferenceDataUrl(asset.dataUrl);
    if (!decoded) {
      throw Object.assign(new Error("参考稿文件内容缺失或格式不支持"), { statusCode: 400 });
    }
    mime = inputMime || decoded.mime;
    buffer = decoded.buffer;
  }

  if (!buffer || buffer.length <= 0) {
    throw Object.assign(new Error("参考稿文件为空"), { statusCode: 400 });
  }
  if (buffer.length > 6_000_000) {
    throw Object.assign(new Error("单个参考稿不能超过 6MB"), { statusCode: 413 });
  }

  fs.writeFileSync(filePath, buffer);
  const record = normalizeReferenceAsset({
    id,
    at: now,
    createdAt: now,
    name,
    type,
    mime,
    size: Number(asset.size) || buffer.length,
    fileName,
    storagePath: path.relative(ROOT_DIR, filePath),
    url: `/artifacts/home-ai-reference-assets/${fileName}`,
    note: asset.note,
    tags: asset.tags,
    textExcerpt,
  });
  const records = readReferenceAssets();
  return writeReferenceAssets([record, ...records]);
}

function referenceAssetsForPrompt(prompt = "", options = {}) {
  const selectedIds = new Set(Array.isArray(options.referenceAssetIds) ? options.referenceAssetIds.map((id) => cleanText(id, "", 90)) : []);
  const text = normalizeKeywordText(prompt);
  const words = text.split(/\s+|[，,。；;、]/).filter((word) => word.length >= 2);
  return readReferenceAssets()
    .map((asset, index) => {
      const haystack = normalizeKeywordText([asset.name, asset.note, asset.textExcerpt, ...(asset.tags || [])].join(" "));
      const hits = words.filter((word) => haystack.includes(word)).length;
      const selected = selectedIds.has(asset.id) ? 100 : 0;
      return { asset, score: selected + hits * 12 - index * 0.01 };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ asset }) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      mime: asset.mime,
      url: asset.url,
      note: asset.note,
      tags: asset.tags,
      textExcerpt: asset.textExcerpt,
      guidance: "这是用户上传的审美参考稿。优先学习它的页面气质、层级、视觉焦点和信息密度，不要直接复制受保护内容。",
    }))
    .slice(0, Math.max(1, Math.min(Number(options.limit) || 4, 8)));
}

function feedbackRecordSearchText(record) {
  return normalizeKeywordText([
    record.prompt,
    record.note,
    record.decision,
    record.rating,
    record.pageIntent,
    record.visualStyle,
    record.manualScore,
    record.machineScore,
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...(Array.isArray(record.preferenceSignals) ? record.preferenceSignals : []),
    ...(Array.isArray(record.referenceAssets) ? record.referenceAssets.flatMap((item) => [item.name, ...(Array.isArray(item.tags) ? item.tags : [])]) : []),
  ].join(" "));
}

function feedbackMemoryPromptReference(prompt, limit = 5) {
  const text = normalizeKeywordText(prompt);
  const words = text.split(/\s+|[，,。；;、]/).filter((word) => word.length >= 2);
  return readFeedbackMemoryRecords()
    .map((record, index) => {
      const haystack = feedbackRecordSearchText(record);
      const hits = words.filter((word) => haystack.includes(word)).length;
      const positive = ["approve", "like", "selected", "good"].includes(record.decision) || Number(record.rating) >= 4 ? 16 : 0;
      const negative = ["reject", "dislike", "bad"].includes(record.decision) || Number(record.rating) <= 2 ? 8 : 0;
      return { record, score: hits * 10 + positive + negative - index * 0.01 };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ record }) => ({
      id: record.id,
      decision: record.decision,
      rating: record.rating,
      pageIntent: record.pageIntent,
      visualStyle: record.visualStyle,
      note: cleanText(record.note, "", 220),
      manualScore: Number.isFinite(Number(record.manualScore)) ? Number(record.manualScore) : null,
      machineScore: Number.isFinite(Number(record.machineScore)) ? Number(record.machineScore) : null,
      preferenceSignals: Array.isArray(record.preferenceSignals) ? record.preferenceSignals.slice(0, 6) : [],
      tags: Array.isArray(record.tags) ? record.tags.slice(0, 8) : [],
      referenceAssets: Array.isArray(record.referenceAssets) ? record.referenceAssets.slice(0, 4) : [],
    }))
    .slice(0, Math.max(1, Math.min(Number(limit) || 5, 10)));
}

function aestheticTrainingContext(payloadOrPrompt = {}, options = {}) {
  const prompt = typeof payloadOrPrompt === "string" ? payloadOrPrompt : cleanText(payloadOrPrompt.prompt, "", 1200);
  const referenceAssetIds = typeof payloadOrPrompt === "object" && Array.isArray(payloadOrPrompt.referenceAssetIds) ? payloadOrPrompt.referenceAssetIds : [];
  const samples = rankDesignSamplesForPrompt(prompt, options.sampleLimit || 4).map(summarizeDesignSampleForPrompt);
  return {
    purpose: "用于提升首页美感的训练上下文：用户上传参考稿决定审美方向，样本页面告诉模型怎么组织页面和功能，组件库积木告诉模型可借鉴的视觉细节，反馈记忆告诉模型用户偏好。",
    referenceAssets: referenceAssetsForPrompt(prompt, { limit: options.referenceLimit || 4, referenceAssetIds }),
    samplePages: samples,
    beautifulComponents: beautifulComponentReferences({ prompt, limit: options.componentLimit || 8 }),
    feedbackMemory: feedbackMemoryPromptReference(prompt, options.feedbackLimit || 5),
    scoringRubric: {
      visualFocus: "首屏必须有明确视觉焦点、主标题、主操作和品牌氛围。",
      hierarchy: "模块要有大小、密度和层级差异，不能全部是同一种白卡。",
      componentCraft: "优先参考漂亮积木块的字段密度、状态标签、按钮层级、图表/步骤表达。",
      businessFunction: "每个样本块都必须绑定页面位置、功能目标、数据字段和系统动作。",
      responsive: "桌面 12 栅格有节奏，移动端自然单列，不靠空白撑高级感。",
    },
  };
}

function componentAestheticPromptReference(options = {}) {
  const prompt = cleanText(options.prompt, "", 1200);
  const family = cleanText(options.family, "", 60);
  const size = cleanText(options.size, "", 12);
  return {
    purpose: "用于让单个积木组件参考已保存漂亮积木后再生成：先吸收字段密度、按钮层级、状态标签、卡片比例、图表/步骤表达，再根据本次 slot 和尺寸做新的组件形态。",
    referenceRule: "漂亮积木是审美和结构参考，不是复制源；必须改变布局、密度、层级或组合方式，不能只换色、换标题或照搬 HTML/CSS。",
    selectedBeautifulBricks: beautifulComponentReferences({ family, size, prompt, limit: options.limit || 6 }),
    samplePages: rankDesignSamplesForPrompt(prompt, options.sampleLimit || 2).map(summarizeDesignSampleForPrompt),
    feedbackMemory: feedbackMemoryPromptReference(prompt, options.feedbackLimit || 3),
    polishRubric: {
      visualFocus: "组件内部必须有一个清晰主焦点：主数值、主状态、主步骤、主图表或主动作只能选一个最突出。",
      hierarchy: "信息用主/次/辅助三级表达，避免所有字段等权小卡片。",
      craft: "至少体现一种真实结构差异，如指标带、状态条、时间线、操作坞、表格/列表、趋势图容器或步骤连接。",
      density: "金融客户端要克制紧凑，减少空白占位、厚重阴影、装饰性渐变和无意义 eyebrow。",
      responsive: "在 1x、2x、3x 尺寸下都能自适应，不依赖固定大高度或不可控内容撑开。",
    },
  };
}

function aiHtmlDataBindingsFromConfig(config) {
  const sections = Array.isArray(config?.sections) ? config.sections : [];
  const blocks = new Set(
    sections
      .flatMap((section) => (Array.isArray(section?.slots) ? section.slots : []))
      .concat((Array.isArray(config?.brickPlan) ? config.brickPlan : []).flatMap((brick) => [brick?.component, brick?.feature]))
      .filter(Boolean)
      .map((item) => canonicalHomeBlock(item) || item),
  );
  const bindings = ["totalAssets", "walletBalance", "tradingAccountBalance", "quickActionList"];
  if (blocks.has("onboarding_guide")) bindings.push("kycStatus", "accountOpeningSteps");
  if (blocks.has("trading_account_highlight")) bindings.push("equityCurve", "pnlTrend", "marginState");
  if (blocks.has("trading_accounts_list")) bindings.push("tradingAccounts");
  if (blocks.has("promo_banner")) bindings.push("campaignConfig");
  if (blocks.has("wallet_list")) bindings.push("currencyWallets");
  if (blocks.has("referral_link_card")) bindings.push("promoLink", "inviteCode");
  if (blocks.has("risk_disclosure")) bindings.push("riskDisclosureText");
  return [...new Set(bindings)].slice(0, 12);
}

const AI_HTML_MODULE_CONTRACTS = {
  welcome_header: {
    label: "首屏欢迎",
    family: "WelcomeHeader",
    signals: ["首屏", "欢迎", "开户", "client home", "hero"],
    expectation: "用明确的标题、副标题和一个主视觉焦点承接页面叙事，不要只放普通标题。",
  },
  asset_overview: {
    label: "资产概览",
    family: "AssetOverview",
    signals: ["资产概览", "余额合计", "总资产", "wallet", "交易账号余额", "total assets", "balance"],
    expectation: "必须有主金额或指标行，展示余额合计、钱包余额或交易账号余额的层级。",
  },
  wallet_list: {
    label: "多币种钱包",
    family: "WalletList",
    signals: ["多币种", "钱包", "USD", "USDT", "AUD", "currency", "wallet"],
    expectation: "以币种卡片、横向条或轻表格展示币种和余额，避免附加无关操作。",
  },
  quick_actions: {
    label: "快捷入口",
    family: "QuickActions",
    signals: ["快捷入口", "入金", "出金", "订单", "持仓", "open account", "deposit", "positions"],
    expectation: "每个动作有独立容器和 data-home-action，不能只是文字链接堆叠。",
  },
  onboarding_guide: {
    label: "新手引导",
    family: "OnboardingProgress",
    signals: ["KYC", "开户", "创建真实账户", "首次入金", "新手", "三步", "onboarding"],
    expectation: "要表现为任务流、时间线、步骤卡或下一步面板，不能退化成普通列表。",
  },
  trading_account_highlight: {
    label: "账户表现",
    family: "AccountPerformance",
    signals: ["账户表现", "账号表现", "Equity", "PnL", "净值", "曲线", "drawdown", "performance"],
    expectation: "要有趋势图、指标行或表现摘要，不能只显示静态标题。",
  },
  trading_accounts_list: {
    label: "交易账号",
    family: "TradingAccounts",
    signals: ["交易账号", "真实账号", "模拟账号", "Live", "Demo", "MT5", "HCHoldings", "leverage"],
    expectation: "真实/模拟账号必须有账号号、环境值、余额或净值等字段，展示形态只能是一种主视图。",
  },
  promo_banner: {
    label: "活动/广告",
    family: "PromotionBanner",
    signals: ["活动", "广告", "Banner", "奖池", "奖励", "campaign", "bonus"],
    expectation: "用专题封面、活动看板或权益条承接，不要只放纯色横幅。",
  },
  pamm_products: {
    label: "PAMM 产品",
    family: "PammProducts",
    signals: ["PAMM", "产品", "策略", "manager", "investment"],
    expectation: "PAMM 必须独立展示产品名、收益或风险字段，不得和 CopyTrading 混成一个模块。",
  },
  copytrading_signals: {
    label: "CopyTrading 信号源",
    family: "CopytradingSignals",
    signals: ["CopyTrading", "跟单", "信号源", "收益率", "总收益", "回撤", "curve"],
    expectation: "信号源、收益率、总收益、最大回撤和收益曲线需要有可见层级。",
  },
  referral_link_card: {
    label: "推广链接",
    family: "ReferralLinkCard",
    signals: ["推广链接", "邀请码", "注册链接", "referral", "invite", "copy"],
    expectation: "展示推广链接、邀请码和复制动作，不能扩展成完整代理中心。",
  },
  announcements: {
    label: "公告通知",
    family: "Announcements",
    signals: ["公告", "通知", "维护", "announcement", "ticker"],
    expectation: "用列表、跑马灯或重点公告结构承接后台配置内容。",
  },
  market_news: {
    label: "市场资讯",
    family: "MarketNews",
    signals: ["市场", "资讯", "行情", "news", "market"],
    expectation: "以紧凑资讯流或洞察卡展示，不要占据首屏主路径。",
  },
  risk_disclosure: {
    label: "风险提示",
    family: "RiskDisclosure",
    signals: ["风险", "保证金", "披露", "risk", "margin", "disclosure"],
    expectation: "轻量合规提示、风险条或折叠说明即可，不得编造承诺。",
  },
  faq_section: {
    label: "常见问题",
    family: "FaqSection",
    signals: ["FAQ", "常见问题", "如何开户", "question"],
    expectation: "用简洁折叠问答或紧凑列表承接。",
  },
  support_contact: {
    label: "在线客服",
    family: "SupportContact",
    signals: ["客服", "客户经理", "联系", "support", "service"],
    expectation: "只展示轻量服务时间、状态和联系动作，不得编造联系方式。",
  },
  app_download: {
    label: "APP 下载",
    family: "AppDownload",
    signals: ["APP", "下载", "移动端", "app download"],
    expectation: "只做下载入口占位，不得编造二维码或下载链接。",
  },
};

const AI_HTML_REFERENCE_FAMILY_ALIASES = {
  PammProducts: ["PammProducts", "ClientHomeAtoms"],
  CopytradingSignals: ["CopytradingSignals", "ClientHomeAtoms"],
  Announcements: ["Announcements", "ClientHomeAtoms"],
  MarketNews: ["MarketNews", "ClientHomeAtoms"],
  AppDownload: ["AppDownload", "ClientHomeAtoms"],
};

const AI_HTML_MODULE_CAPABILITIES = {
  welcome_header: {
    dataFields: ["userName", "primaryGoal", "nextBestAction"],
    states: ["returning", "newUser"],
    actions: ["openAccount", "deposit"],
    evidenceSignals: ["欢迎", "立即开户", "下一步"],
  },
  asset_overview: {
    dataFields: ["totalAssets", "walletBalance", "tradingAccountBalance"],
    states: ["normal", "hiddenBalance", "loading"],
    actions: ["deposit", "withdraw"],
    evidenceSignals: ["余额合计", "钱包余额", "交易账号余额"],
  },
  wallet_list: {
    dataFields: ["currency", "balance"],
    states: ["available", "empty"],
    actions: ["wallet"],
    evidenceSignals: ["USD", "USDT", "余额"],
  },
  quick_actions: {
    dataFields: ["quickActionList", "actionId"],
    states: ["enabled", "disabled"],
    actions: ["deposit", "openAccount", "withdraw", "accounts"],
    evidenceSignals: ["data-home-action", "入金", "开户"],
  },
  onboarding_guide: {
    dataFields: ["kycStatus", "accountOpeningSteps", "reviewEta"],
    states: ["notSubmitted", "reviewing", "approved", "rejected"],
    actions: ["submitKyc", "openAccount", "deposit"],
    evidenceSignals: ["KYC", "创建真实账户", "首次入金"],
  },
  trading_account_highlight: {
    dataFields: ["equityCurve", "pnlTrend", "marginState"],
    states: ["profitable", "drawdown", "marginWarning"],
    actions: ["positions", "orders"],
    evidenceSignals: ["Equity", "PnL", "净值", "曲线"],
  },
  trading_accounts_list: {
    dataFields: ["accountNumber", "accountKind", "accountType", "equity", "server"],
    states: ["Live", "Demo", "active", "disabled"],
    actions: ["accounts", "openAccount"],
    evidenceSignals: ["Live", "Demo", "MT5", "HCHoldings"],
  },
  promo_banner: {
    dataFields: ["campaignTitle", "bonusRule", "deadline"],
    states: ["active", "expired"],
    actions: ["deposit", "eventSignup"],
    evidenceSignals: ["活动", "奖励", "倒计时"],
  },
  pamm_products: {
    dataFields: ["productName", "yield", "riskLevel"],
    states: ["open", "closed"],
    actions: ["invest"],
    evidenceSignals: ["PAMM", "策略", "风险"],
  },
  copytrading_signals: {
    dataFields: ["signalName", "returnRate", "maxDrawdown", "equityCurve"],
    states: ["following", "available"],
    actions: ["follow"],
    evidenceSignals: ["信号源", "收益率", "回撤"],
  },
  referral_link_card: {
    dataFields: ["promoLink", "inviteCode"],
    states: ["copied", "ready"],
    actions: ["copyLink", "copyCode"],
    evidenceSignals: ["推广链接", "邀请码", "复制"],
  },
  announcements: {
    dataFields: ["title", "category", "publishedAt"],
    states: ["urgent", "normal"],
    actions: ["viewAnnouncement"],
    evidenceSignals: ["公告", "维护", "通知"],
  },
  market_news: {
    dataFields: ["symbol", "headline", "impact"],
    states: ["bullish", "bearish", "neutral"],
    actions: ["viewNews"],
    evidenceSignals: ["市场", "资讯", "行情"],
  },
  risk_disclosure: {
    dataFields: ["riskLevel", "marginRatio", "disclosureText"],
    states: ["normal", "warning", "critical"],
    actions: ["viewRisk"],
    evidenceSignals: ["风险", "保证金", "披露"],
  },
  faq_section: {
    dataFields: ["question", "answer"],
    states: ["expanded", "collapsed"],
    actions: ["openFaq"],
    evidenceSignals: ["常见问题", "如何开户"],
  },
  support_contact: {
    dataFields: ["serviceStatus", "serviceHours"],
    states: ["online", "offline"],
    actions: ["contactSupport"],
    evidenceSignals: ["客服", "在线", "服务时间"],
  },
  app_download: {
    dataFields: ["platform", "downloadStatus"],
    states: ["available", "unavailable"],
    actions: ["downloadApp"],
    evidenceSignals: ["APP", "下载", "移动端"],
  },
};

function aiHtmlModuleCapability(block) {
  const source = AI_HTML_MODULE_CAPABILITIES[block] || {};
  return {
    dataFields: normalizeAiHtmlTextList(source.dataFields, 10, 48),
    states: normalizeAiHtmlTextList(source.states, 8, 48),
    actions: normalizeAiHtmlTextList(source.actions, 8, 48),
    evidenceSignals: normalizeAiHtmlTextList(source.evidenceSignals, 8, 60),
  };
}

const AI_HTML_REQUIRED_FALLBACK_BLOCKS = ["asset_overview", "quick_actions", "trading_account_highlight", "trading_accounts_list"];

const AI_HTML_PROMPT_MODULE_PATTERNS = [
  ["welcome_header", /welcome_header|欢迎区|首页欢迎|首屏欢迎|开户\s*banner|开户banner|首屏开户|banner/i],
  ["asset_overview", /asset_overview|资产概览|账户摘要|账户总览|余额合计|总资产|账户资产/i],
  ["wallet_list", /wallet_list|钱包列表|多币种钱包|币种钱包|wallet list/i],
  ["quick_actions", /quick_actions|快捷入口|快捷操作|操作入口|快捷按钮/i],
  ["onboarding_guide", /onboarding_guide|开户引导|开户流程|开户路径|账户开通|开真实账户|创建真实账户|kyc|首次入金|已注册未开户|新访客|新客|新用户|onboarding/i],
  ["trading_account_highlight", /trading_account_highlight|账户表现|账号表现|表现图表|净值曲线|equity|pnl|保证金/i],
  ["trading_accounts_list", /trading_accounts_list|交易账号列表|交易账户列表|交易账号|交易账户|真实账号|真实账户|模拟账号|模拟账户|live\s*account|demo\s*account|mt5/i],
  ["promo_banner", /promo_banner|活动权益|活动区|活动\s*banner|入金奖励|权益区|bonus|campaign/i],
  ["pamm_products", /pamm_products|pamm|PAMM|pamm\s*条件|PAMM\s*条件|资管产品|资金管理产品/i],
  ["copytrading_signals", /copytrading_signals|copy\s*trading|copytrading|跟单|信号源/i],
  ["referral_link_card", /referral_link_card|推广链接|邀请链接|开户链接|注册链接|邀请码|referral/i],
  ["announcements", /announcements|公告|通知|维护/i],
  ["market_news", /market_news|市场资讯|市场新闻|行情资讯|交易教育/i],
  ["risk_disclosure", /risk_disclosure|风险提示|风险披露|风险声明|合规声明|合规说明|杠杆风险/i],
  ["faq_section", /faq_section|faq|FAQ|常见问题|问题解答|帮助中心/i],
  ["support_contact", /support_contact|在线客服|客服|客户经理|联系支持|联系客服|服务入口/i],
  ["app_download", /app_download|app下载|app\s*下载|下载\s*app|APP\s*下载|下载入口|移动端下载|手机端|mt5\s*下载|下载\s*mt5|download app/i],
];

function aiHtmlExplicitRequiredBlocksFromPrompt(prompt) {
  const source = String(prompt || "");
  const rejects = {
    promo_banner: /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:活动|广告|banner|权益)/i,
    pamm_products: /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:pamm|PAMM|资管产品)/i,
    copytrading_signals: /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:copytrading|跟单|信号源)/i,
    referral_link_card: /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:推广|邀请|开户链接|注册链接|邀请码|referral|代理)/i,
    announcements: /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:公告|通知|维护)/i,
    market_news: /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:市场资讯|市场新闻|行情资讯|交易教育)/i,
    risk_disclosure: /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:风险提示|风险披露|合规|杠杆风险)/i,
    faq_section: /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:faq|FAQ|常见问题|问题解答|帮助中心)/i,
    support_contact: /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:在线客服|客服|客户经理|咨询|服务入口|客服帮助)/i,
    app_download: /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:app|下载|移动端|手机端|mt5)/i,
  };
  const blocks = new Set();
  AI_HTML_PROMPT_MODULE_PATTERNS.forEach(([block, pattern]) => {
    pattern.lastIndex = 0;
    if (rejects[block]?.test(source)) return;
    if (pattern.test(source) && AI_HTML_MODULE_CONTRACTS[block]) blocks.add(block);
  });
  return blocks;
}

function normalizeAiHtmlTextList(value, limit = 8, itemLimit = 140) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanText(item, "", itemLimit))
    .filter(Boolean)
    .slice(0, limit);
}

function cleanAiHtmlTextMap(value, entryLimit = 12, valueLimit = 180) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [cleanText(key, "", 64), cleanText(typeof item === "string" ? item : compactJson(item), "", valueLimit)])
      .filter(([key, item]) => key && item)
      .slice(0, entryLimit),
  );
}

function normalizeAiHtmlModuleUnderstanding(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return {
    pageIntent: cleanText(value.pageIntent || value.intent || value.primaryIntent, "", 80),
    visualGoal: cleanText(value.visualGoal || value.visualTone || value.designGoal, "", 160),
    layoutDirection: cleanText(value.layoutDirection || value.layoutIdea || value.composition, "", 200),
    moduleStrategy: cleanText(value.moduleStrategy || value.strategy, "", 220),
  };
}

function normalizeAiHtmlComponentReferences(value, fallback = []) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return source
    .map((item) => {
      if (typeof item === "string") {
        return { componentId: cleanText(item, "", 80), family: "", module: "", reason: "" };
      }
      if (!item || typeof item !== "object") return null;
      return {
        componentId: cleanText(item.componentId || item.id || item.name, "", 80),
        name: cleanText(item.name || item.label, "", 80),
        family: cleanText(item.family, "", 60),
        requiredFamily: cleanText(item.requiredFamily || item.targetFamily, "", 60),
        module: cleanText(item.module || item.block || item.component, "", 60),
        reason: cleanText(item.reason || item.usedFor || item.inspiration, "", 180),
        visibleText: cleanText(item.visibleText, "", 220),
        styleSignals: normalizeAiHtmlTextList(item.styleSignals || item.hints, 6, 60),
      };
    })
    .filter((item) => item && (item.componentId || item.family || item.module || item.reason))
    .slice(0, 16);
}

function normalizeAiHtmlImplementationContract(value, requiredModules = []) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([module, contract]) => ({
          ...(contract && typeof contract === "object" ? contract : { note: contract }),
          module,
        }))
      : [];
  const expected = Array.isArray(requiredModules) ? requiredModules : [];

  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const module = cleanText(item.module || item.component || item.block || item.id, "", 80);
      const label = cleanText(item.label || item.name || item.title, "", 80);
      const family = cleanText(item.family || item.componentFamily, "", 80);
      const match = expected.find((required) => {
        const values = [module, label, family].map((entry) => String(entry || "").toLowerCase());
        return values.includes(String(required.component || "").toLowerCase()) ||
          values.includes(String(required.label || "").toLowerCase()) ||
          values.includes(String(required.family || "").toLowerCase());
      });

      return {
        module: module || match?.component || "",
        label: label || match?.label || "",
        family: family || match?.family || "",
        dataFields: normalizeAiHtmlTextList(item.dataFields || item.fields || item.dataBindings, 10, 72),
        states: normalizeAiHtmlTextList(item.states || item.stateCoverage || item.requiredStates, 8, 72),
        actions: normalizeAiHtmlTextList(item.actions || item.actionCoverage || item.requiredActions, 8, 72),
        interactions: normalizeAiHtmlTextList(item.interactions || item.behaviors || item.userFlows, 8, 100),
        renderEvidence: normalizeAiHtmlTextList(item.renderEvidence || item.evidence || item.htmlEvidence, 8, 120),
        emptyShellRisk: Boolean(item.emptyShellRisk || item.fakeComponentRisk || item.staticShellRisk),
        note: cleanText(item.note || item.implementationNote || item.rationale, "", 160),
      };
    })
    .filter((item) => item && (item.module || item.label || item.family))
    .slice(0, 12);
}

function aiHtmlImplementationContractMatches(contract, required) {
  const values = [contract.module, contract.label, contract.family].map((item) => String(item || "").toLowerCase());
  return values.includes(String(required.component || "").toLowerCase()) ||
    values.includes(String(required.label || "").toLowerCase()) ||
    values.includes(String(required.family || "").toLowerCase());
}

function homepageBlockSetFromConfig(config = {}) {
  const blocks = new Set();
  (Array.isArray(config.sections) ? config.sections : []).forEach((section) => {
    (Array.isArray(section?.slots) ? section.slots : []).forEach((slot) => {
      const block = canonicalHomeBlock(slot) || slot;
      if (block) blocks.add(block);
    });
  });
  (Array.isArray(config.layout) ? config.layout : []).forEach((item) => {
    const block = canonicalHomeBlock(item?.component || item?.feature) || item?.component || item?.feature;
    if (block) blocks.add(block);
  });
  (Array.isArray(config.brickPlan) ? config.brickPlan : []).forEach((item) => {
    [item?.component, item?.feature].forEach((value) => {
      const block = canonicalHomeBlock(value) || value;
      if (block) blocks.add(block);
    });
  });
  return blocks;
}

function aiHtmlRequiredModuleContracts(payload = {}, config = {}) {
  const prompt = String(payload.prompt || "");
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const blocks = new Set();
  const configSectionBlocks = (Array.isArray(config?.sections) ? config.sections : [])
    .flatMap((section) => (Array.isArray(section?.slots) ? section.slots : []))
    .map((slot) => canonicalHomeBlock(slot))
    .filter((block) => block && AI_HTML_MODULE_CONTRACTS[block]);

  if (configSectionBlocks.length) {
    configSectionBlocks.forEach((block) => blocks.add(block));
  } else {
    aiHtmlExplicitRequiredBlocksFromPrompt(prompt).forEach((block) => blocks.add(block));
    (Array.isArray(intentProfile.mustHave) ? intentProfile.mustHave : []).forEach((item) => {
      const block = canonicalHomeBlock(item) || item;
      if (block && AI_HTML_MODULE_CONTRACTS[block]) blocks.add(block);
    });
    if (Array.isArray(config?.pageIntent?.mustHave)) {
      config.pageIntent.mustHave.forEach((item) => {
        const block = canonicalHomeBlock(item) || item;
        if (block && AI_HTML_MODULE_CONTRACTS[block]) blocks.add(block);
      });
    }
    if (guidedIntake?.canonical?.mustHave) {
      guidedIntake.canonical.mustHave.forEach((item) => {
        const block = canonicalHomeBlock(item) || item;
        if (block && AI_HTML_MODULE_CONTRACTS[block]) blocks.add(block);
      });
    }
  }

  if (blocks.size < 2) {
    homepageBlockSetFromConfig(config).forEach((block) => {
      if (AI_HTML_MODULE_CONTRACTS[block] && blocks.size < 6) blocks.add(block);
    });
  }
  if (!blocks.size) AI_HTML_REQUIRED_FALLBACK_BLOCKS.forEach((block) => blocks.add(block));

  return [...blocks]
    .filter((block) => AI_HTML_MODULE_CONTRACTS[block])
    .slice(0, 16)
    .map((block) => ({
      component: block,
      label: AI_HTML_MODULE_CONTRACTS[block].label,
      family: AI_HTML_MODULE_CONTRACTS[block].family,
      expectation: AI_HTML_MODULE_CONTRACTS[block].expectation,
      signals: AI_HTML_MODULE_CONTRACTS[block].signals.slice(0, 8),
      capability: aiHtmlModuleCapability(block),
	    }));
	}
	
function aiHtmlReferenceFamilies(family) {
  const canonical = cleanText(family, "", 60);
  return [canonical, ...(AI_HTML_REFERENCE_FAMILY_ALIASES[canonical] || [])].filter(Boolean).filter((item, index, list) => list.indexOf(item) === index);
}

function aiHtmlReferenceCoversFamily(reference = {}, family = "") {
  const expected = aiHtmlReferenceFamilies(family).map((item) => item.toLowerCase());
  const actual = [reference.family, reference.requiredFamily, reference.targetFamily].map((item) => String(item || "").toLowerCase()).filter(Boolean);
  return actual.some((item) => expected.includes(item));
}

function aiHtmlComponentReferenceHints(requiredModules, prompt) {
  const families = new Set(requiredModules.map((item) => item.family).filter(Boolean));
  const selected = [];
  families.forEach((family) => {
    const reference = aiHtmlReferenceFamilies(family)
      .flatMap((referenceFamily) => componentLibraryPromptReference({ prompt, family: referenceFamily, limit: 4 }).selectedComponents)
      .filter((component, index, list) => component?.id && list.findIndex((item) => item.id === component.id) === index);
    const exactMatches = reference.filter((component) => component.family === family);
    (exactMatches.length ? exactMatches : reference.slice(0, 1)).slice(0, 2).forEach((component) => {
      if (!selected.some((item) => item.componentId === component.id)) {
        selected.push({
          componentId: component.id,
          name: component.name,
          family: component.family,
          requiredFamily: family,
          module: requiredModules.find((item) => item.family === family)?.component || "",
          reason: `${component.name} 可参考 ${component.styleSignals?.slice(0, 3).join("、") || "业务字段和布局密度"}`,
          visibleText: component.visibleText,
          styleSignals: component.styleSignals,
        });
      }
    });
  });
  return selected.slice(0, 10);
}

function textContainsAnySignal(text, signals) {
  const lower = String(text || "").toLowerCase();
  return signals.some((signal) => {
    const raw = String(signal || "");
    return raw && (lower.includes(raw.toLowerCase()) || String(text || "").includes(raw));
  });
}

function countAiHtmlMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function compactAiText(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, "").trim().toLowerCase();
}

function aiHtmlLeaksPrompt(visibleText, prompt) {
  const page = compactAiText(visibleText);
  const source = compactAiText(prompt);
  if (source.length < 48 || !page) return false;
  if (page.includes(source.slice(0, Math.min(100, source.length)))) return true;
  for (let index = 0; index + 72 <= source.length; index += 36) {
    if (page.includes(source.slice(index, index + 72))) return true;
  }
  return false;
}

function expectedPrimaryCtaForPrompt(prompt, config = {}) {
  const source = String(prompt || "");
  const text = `${source.toLowerCase()} ${source}`;
  if (/主\s*cta|主按钮|主行动|primary\s*cta/i.test(source)) {
    if (/立即开户|开(?:真实)?账户|open\s*account/i.test(source)) return { label: "立即开户", action: "openAccount", pattern: /立即开户|开真实账户|开户|open\s*account/i };
    if (/立即入金|首次入金|入金|deposit/i.test(source)) return { label: "立即入金", action: "deposit", pattern: /立即入金|首次入金|入金|deposit/i };
  }
  const intent = config?.pageIntent?.primaryIntent || homepageIntentFromPrompt(prompt);
  if (intent === "onboarding" || hasStrongOnboardingIntentSignal(text)) {
    return { label: "立即开户", action: "openAccount", pattern: /立即开户|开真实账户|创建真实账户|开户|open\s*account/i };
  }
  if (intent === "deposit" || hasExplicitDepositIntentSignal(text)) {
    return { label: "立即入金", action: "deposit", pattern: /立即入金|首次入金|入金|deposit/i };
  }
  if (intent === "trader") {
    return { label: "持仓/MT5", action: "", pattern: /持仓|订单|MT5|mt5|positions|orders/i };
  }
  return null;
}

function evaluateAiHtmlQuality(scheme, payload = {}, config = {}) {
  const source = scheme && typeof scheme === "object" ? scheme : {};
  const html = String(source.html || "");
  const css = String(source.css || "");
  const visibleText = stripHtmlTags(html);
  const combinedText = `${visibleText}\n${html}`;
  const requiredModules = aiHtmlRequiredModuleContracts(payload, config);
  const implementationContract = normalizeAiHtmlImplementationContract(
    source.implementationContract || source.moduleImplementation || source.capabilityContract,
    requiredModules,
  );
  const componentReferenceHints = aiHtmlComponentReferenceHints(requiredModules, payload.prompt || "");
  const componentReferences = normalizeAiHtmlComponentReferences(source.componentReferences, []);
  const issues = [];
  const checks = [];
  const strengths = [];
  let score = 100;

  const miss = (points, issue) => {
    score -= points;
    issues.push(issue);
  };
  const pass = (check) => {
    checks.push(check);
    strengths.push(check);
  };

  if (!html.trim() || !css.trim()) {
    miss(45, "HTML 或 CSS 为空，无法作为可预览视觉方案。");
  }
  if (!/\bai-html-/i.test(`${html} ${css}`)) miss(10, "类名没有稳定使用 ai-html- 前缀，隔离性不足。");
  if (!/var\(--home-/i.test(css)) miss(12, "CSS 没有充分使用首页主题 token，容易和组件库视觉脱节。");
  else pass("使用首页主题 token 承接品牌视觉。");
  const hardcodedColors = [...new Set(css.match(/#[0-9a-f]{3,8}\b/gi) || [])].filter((color) => !["#fff", "#ffffff", "#000", "#000000"].includes(color.toLowerCase()));
  if (hardcodedColors.length > 10) miss(8, "硬编码颜色过多，未充分遵守 design.md 的 token 化视觉约束。");
  else pass("硬编码颜色受控，主要依赖主题 token。");
  const gradientCount = countAiHtmlMatches(css, /\b(?:linear|radial)-gradient\s*\(/gi);
  if (gradientCount > 4) miss(8, "装饰性渐变过多，容易偏向营销页而不是金融 CRM 工作台。");
  const largeRadiusValues = (css.match(/border-radius\s*:\s*([0-9.]+)px/gi) || [])
    .map((item) => Number((item.match(/([0-9.]+)px/i) || [])[1]))
    .filter((value) => Number.isFinite(value) && value > 18);
  if (largeRadiusValues.length) miss(6, "圆角过大，容易脱离 CRM 组件规范。");
  const oversizedTypeValues = (css.match(/font-size\s*:\s*([0-9.]+)px/gi) || [])
    .map((item) => Number((item.match(/([0-9.]+)px/i) || [])[1]))
    .filter((value) => Number.isFinite(value) && value > 48);
  if (oversizedTypeValues.length) miss(6, "标题字号过大，页面可能偏营销 hero 而非工作台界面。");
  if (!/(display\s*:\s*grid|display\s*:\s*flex|grid-template-columns)/i.test(css)) miss(12, "布局缺少 grid/flex/栅格表达，容易退化成基础上下堆叠。");
  else pass("具备 grid/flex 布局结构。");
  if (!/@media/i.test(css)) miss(8, "缺少响应式规则，大屏/移动端美观性不可控。");
  else pass("包含响应式规则。");
	  if (!/data-home-action=/i.test(html)) miss(8, "缺少 data-home-action，关键按钮无法接入系统动作。");
	  else pass("关键动作带 data-home-action。");
	  const controlCount = countAiHtmlMatches(html, /<(?:a|button)\b/gi);
	  const controlCssEvidence = /\.ai-html-[^{]*(?:button|btn|cta|action)[^{]*\{|\.ai-html-page\s+(?:a|button)|a\[data-home-action\]|button\[data-home-action\]/i.test(css);
	  if (controlCount && !controlCssEvidence) {
	    miss(10, "按钮仍像原生控件，缺少 AI HTML 范围内的按钮/链接样式。");
	  } else if (controlCount) {
	    pass("按钮和链接有 AI HTML 范围内的视觉样式。");
	  }
	  if (aiHtmlLeaksPrompt(visibleText, payload.prompt)) {
	    miss(28, "客户页面疑似渲染了管理员提示词原文，必须改写为面向客户的首页文案。");
	  }

	  const sectionCount = countAiHtmlMatches(html, /<(section|article|header|nav|main)\b/gi);
	  if (sectionCount < 5 && implementationContract.length < 4) miss(10, "页面结构层级太少，像普通 HTML 草稿而不是完整客户端首页。");
	  else pass("页面包含多个业务结构层级。");

  const visualSignals = /(svg|path|table|thead|tbody|ai-html-(?:chart|curve|bars|metric|kpi|trend|timeline|step|rail|console|account|wallet)|Equity|PnL|净值|曲线|收益率)/i;
  if (!visualSignals.test(`${html} ${css}`)) miss(12, "缺少图表、趋势、指标或状态结构，交易平台质感不足。");
  else pass("有指标、趋势或状态视觉结构。");

  const placeholderCount = countAiHtmlMatches(visibleText, /--/g);
  if (placeholderCount > 5) miss(8, "占位符过多，预览会显得空和基础。");

	  const missingModules = requiredModules.filter((item) => !textContainsAnySignal(combinedText, item.signals));
	  const thinVisibleModules = requiredModules.filter((item) => {
	    if (missingModules.includes(item)) return false;
	    const contract = implementationContract.find((entry) => aiHtmlImplementationContractMatches(entry, item));
	    const evidenceSignals = item.capability?.evidenceSignals || [];
	    const signalHits = item.signals.filter((signal) => textContainsAnySignal(combinedText, [signal])).length;
	    const evidenceHits = evidenceSignals.filter((signal) => textContainsAnySignal(combinedText, [signal])).length;
	    const renderEvidence = Array.isArray(contract?.renderEvidence) ? contract.renderEvidence.filter(Boolean).length : 0;
	    const hasAction =
	      Array.isArray(contract?.actions) && contract.actions.some((action) => {
	        const actionText = String(action || "").toLowerCase();
	        return actionText && html.toLowerCase().includes(`data-home-action="${actionText}"`);
	      });
	    return signalHits + evidenceHits < 2 && renderEvidence < 1 && !hasAction;
	  });
	  if (missingModules.length) {
	    miss(Math.min(34, missingModules.length * 7), `未明显承接要求模块：${missingModules.map((item) => item.label).join("、")}。`);
	  } else {
	    pass("要求模块都能在 HTML 中找到业务表达。");
	  }
	  if (thinVisibleModules.length) {
	    miss(Math.min(24, thinVisibleModules.length * 6), `要求模块只有标题或弱露出，缺少可见字段/状态/动作：${thinVisibleModules.map((item) => item.label).slice(0, 4).join("、")}。`);
	  }
		  if (requiredModules.length >= 3) {
		    const requiredFamilies = [...new Set(requiredModules.map((item) => item.family).filter(Boolean))];
		    const coveredFamilies = requiredFamilies.filter((family) => componentReferences.some((reference) => aiHtmlReferenceCoversFamily(reference, family)));
		    if (!componentReferences.length) {
		      miss(10, "缺少 componentReferences，无法证明 AI HTML 参考了组件库。");
		    } else if (coveredFamilies.length < Math.min(3, requiredFamilies.length)) {
	      miss(6, `componentReferences 覆盖组件家族不足：${coveredFamilies.length}/${requiredFamilies.length}。`);
	    } else {
	      pass("componentReferences 覆盖多个组件库家族。");
	    }
	  }

  if (!implementationContract.length) {
    miss(18, "缺少 implementationContract，无法证明 AI HTML 不是静态外观空壳。");
  } else {
    const missingImplementation = [];
    const thinImplementation = [];
    const missingActionCoverage = [];
    const htmlActionText = html.toLowerCase();

    requiredModules.forEach((required) => {
      const contract = implementationContract.find((item) => aiHtmlImplementationContractMatches(item, required));
      const capability = required.capability || {};
      if (!contract) {
        missingImplementation.push(required.label);
        return;
      }

      const detailCount =
        contract.dataFields.length +
        contract.states.length +
        contract.actions.length +
        contract.interactions.length +
        contract.renderEvidence.length;
      if (detailCount < 3 || !contract.dataFields.length) thinImplementation.push(required.label);
      if (contract.emptyShellRisk) thinImplementation.push(`${required.label}(标记为空壳风险)`);

      const expectedActions = Array.isArray(capability.actions) ? capability.actions : [];
      const actionCovered = expectedActions.some((action) => {
        const actionText = String(action || "").toLowerCase();
        return contract.actions.some((item) => String(item || "").toLowerCase().includes(actionText)) ||
          htmlActionText.includes(`data-home-action="${actionText}"`) ||
          htmlActionText.includes(`data-home-action='${actionText}'`);
      });
      if (expectedActions.length && !actionCovered) missingActionCoverage.push(required.label);
    });

    if (missingImplementation.length) {
      miss(Math.min(28, missingImplementation.length * 7), `缺少模块实现协议：${missingImplementation.slice(0, 4).join("、")}。`);
    }
    if (thinImplementation.length) {
      miss(Math.min(22, thinImplementation.length * 5), `模块实现协议太薄，仍像画样子：${[...new Set(thinImplementation)].slice(0, 4).join("、")}。`);
    }
    if (missingActionCoverage.length) {
      miss(Math.min(18, missingActionCoverage.length * 4), `关键动作没有在 implementationContract 或 data-home-action 中闭环：${missingActionCoverage.slice(0, 4).join("、")}。`);
    }
    if (!missingImplementation.length && !thinImplementation.length) pass("implementationContract 覆盖模块字段、状态、动作和渲染证据。");
  }

	  const articleCount = countAiHtmlMatches(html, /<article\b/gi);
	  const distinctClassCount = new Set((html.match(/class=(["'])(.*?)\1/gi) || []).map((item) => item.replace(/^class=(["'])|["']$/g, ""))).size;
	  if (articleCount >= 5 && distinctClassCount < 6) miss(8, "模块可能共用同一种卡片壳，视觉变化不足。");
	  const genericSkeleton =
	    /\bai-html-hero\b/i.test(html) &&
	    /\bai-html-(?:command|actions)\b/i.test(html) &&
	    /\bai-html-grid\b/i.test(html) &&
	    /\bai-html-table\b/i.test(html);
	  if (genericSkeleton && requiredModules.length >= 5) {
	    miss(16, "命中固定 hero + 四按钮 + 双卡 + 账号表骨架，未按提示词重组信息架构。");
	  }
	  const expectedCta = expectedPrimaryCtaForPrompt(payload.prompt, config);
	  if (expectedCta) {
	    const actionMatched = expectedCta.action ? new RegExp(`data-home-action=["']${expectedCta.action}["']`, "i").test(html) : true;
	    if (!expectedCta.pattern.test(combinedText) || !actionMatched) {
	      miss(16, `主 CTA 未承接提示词，应突出「${expectedCta.label}」。`);
	    } else {
	      pass(`主 CTA 承接「${expectedCta.label}」。`);
	    }
	  }

	  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const qualityStatus = issues.length
    ? normalizedScore >= 68
      ? "needs-polish"
      : "needs-repair"
    : normalizedScore >= 82
      ? "passed"
      : normalizedScore >= 68
        ? "needs-polish"
        : "needs-repair";
  return {
    score: normalizedScore,
    status: qualityStatus,
    issues: issues.slice(0, 8),
    checks: checks.slice(0, 10),
    strengths: strengths.slice(0, 8),
    requiredModules,
    implementationContract,
    componentReferenceHints,
  };
}

function normalizeAiHtmlScheme(scheme, payload = {}, config = {}, providerConfig = {}) {
  const source = scheme && typeof scheme === "object" ? scheme.htmlScheme || scheme : {};
  const fallbackName = cleanText(config.name, "AI HTML 首页方案", 48);
  const html = sanitizeAiHtmlMarkup(source.html);
  const css = sanitizeAiHtmlCss(source.css);
  const generatedAt = source.generatedAt || new Date().toISOString();
  const dataBindings = Array.isArray(source.dataBindings)
    ? source.dataBindings.map((item) => cleanText(item, "", 80)).filter(Boolean)
    : aiHtmlDataBindingsFromConfig(config);
  const safetyNotes = Array.isArray(source.safetyNotes)
    ? source.safetyNotes.map((item) => cleanText(item, "", 120)).filter(Boolean).slice(0, 8)
    : [];
  const correctionNotes = Array.isArray(source.correctionNotes)
    ? source.correctionNotes.map((item) => cleanText(item, "", 140)).filter(Boolean).slice(0, 8)
    : [];
  const requiredModules = normalizeAiHtmlTextList(
    source.requiredModules,
    16,
    80,
  );
  const expectedImplementationModules = aiHtmlRequiredModuleContracts(payload, config);
  const implementationContract = normalizeAiHtmlImplementationContract(
    source.implementationContract || source.moduleImplementation || source.capabilityContract,
    expectedImplementationModules,
  );
  const fallbackReferences = source.componentReferenceHints || [];
  const componentReferences = normalizeAiHtmlComponentReferences(source.componentReferences, fallbackReferences);
	  const designNotes = normalizeAiHtmlTextList(source.designNotes, 8, 180);
	  const qualityIssues = normalizeAiHtmlTextList(source.qualityIssues, 8, 180);
	  const aestheticChecks = normalizeAiHtmlTextList(source.aestheticChecks, 10, 160);
	  const qualityScore = Number.isFinite(Number(source.qualityScore)) ? Math.max(0, Math.min(100, Math.round(Number(source.qualityScore)))) : null;
	  const sourceType = cleanText(source.sourceType, "", 48);
	  const mock = Boolean(source.mock || sourceType === "mock" || sourceType.startsWith("fallback/mock"));
	  const isFallback = Boolean(source.isFallback || mock || /fallback/i.test(sourceType) || /fallback/i.test(source.generationPipeline || ""));
	  const fallbackReason = cleanText(source.fallbackReason || source.reason || "", "", 220);
	  const modelAttempted = typeof source.modelAttempted === "boolean"
	    ? source.modelAttempted
	    : /^model/.test(sourceType) || sourceType.startsWith("fallback/");
	  const rawQualityStatus = cleanText(source.qualityStatus, qualityScore === null ? "" : qualityScore >= 82 ? "passed" : "needs-polish", 40);
	  const qualityStatus = isFallback ? (mock ? "mock-preview" : "fallback-preview") : rawQualityStatus;

	  return {
    enabled: Boolean(html && css),
    name: cleanText(source.name, `${fallbackName} HTML 版`, 56),
    summary: cleanText(source.summary, "AI 直接生成 HTML/CSS 草稿，已做脚本和外链清洗。", 220),
    visualBrief: cleanText(source.visualBrief, "以更强视觉层级、卡片比例和留白节奏提升首页美感。", 260),
    moduleUnderstanding: normalizeAiHtmlModuleUnderstanding(source.moduleUnderstanding),
    requiredModules,
    moduleMapping: cleanAiHtmlTextMap(source.moduleMapping),
    implementationContract,
    componentReferences,
    designNotes,
    html,
	    css,
	    dataBindings: dataBindings.length ? dataBindings.slice(0, 12) : aiHtmlDataBindingsFromConfig(config),
	    qualityScore,
	    qualityStatus,
    qualityIssues,
    aestheticChecks,
    safetyStatus: html && css ? "sanitized" : "empty",
    safetyNotes: [
      "已移除 script、内联事件、外链脚本入口和危险 URL。",
      "CSS 将在独立预览容器内渲染，不污染正式组件样式。",
      ...safetyNotes,
    ].slice(0, 8),
    provider: providerConfig.name || providerConfig.provider || "",
    model: providerConfig.model || "",
	    generatedAt,
	    generationPipeline: cleanText(source.generationPipeline, "", 48),
	    correctionStatus: cleanText(source.correctionStatus, html && css ? "sanitized" : "empty", 48),
	    sourceType,
	    isFallback,
	    fallbackReason,
	    modelAttempted,
	    mock,
	    correctionNotes,
	  };
	}

function aiHtmlCorrectionActions(config = {}) {
  const settings = config.moduleSettings || {};
  const actionSeeds = [
    { action: "deposit", label: "入金", enabled: settings.fundActions?.enabled !== false },
    { action: "openAccount", label: "开真实账户", enabled: settings.openAccount?.enabled !== false },
    { action: "wallet", label: "钱包", enabled: settings.walletList?.enabled !== false },
    { action: "accounts", label: "交易账号", enabled: settings.tradingAccounts?.enabled !== false },
  ].filter((item) => item.enabled);

  const actions = actionSeeds.length ? actionSeeds : [{ action: "deposit", label: "入金", enabled: true }];
  return `
    <nav class="ai-html-correction-actions" aria-label="系统关键动作">
      ${actions
        .slice(0, 4)
        .map((item) => `<a data-home-action="${escapeHtmlText(item.action)}" href="#${escapeHtmlText(item.action)}">${escapeHtmlText(item.label)}</a>`)
        .join("")}
    </nav>
  `;
}

function aiHtmlCorrectionCss() {
  return `
    .ai-html-correction-actions{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
    .ai-html-correction-actions a{min-height:44px;display:inline-grid;place-items:center;padding:0 16px;border:1px solid var(--home-button-border,var(--home-primary,#2563eb));border-radius:var(--home-radius-sm,8px);background:var(--home-button-bg,var(--home-primary,#2563eb));color:var(--home-button-text,#fff);font-weight:900;text-decoration:none}
    @media(max-width:760px){.ai-html-correction-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.ai-html-correction-actions a{width:100%}}
  `;
}

function aiHtmlResponsiveFallbackCss() {
  return `
    @media(max-width:860px){.ai-html-page{display:grid!important;grid-template-columns:1fr!important;gap:12px!important}.ai-html-page [class*="ai-html-grid"],.ai-html-page [class*="ai-html-row"],.ai-html-page [class*="ai-html-columns"],.ai-html-page [class*="ai-html-layout"]{display:grid!important;grid-template-columns:1fr!important}.ai-html-page table{display:block;max-width:100%;overflow-x:auto}.ai-html-page a,.ai-html-page button{min-height:44px}}
  `;
}

function aiHtmlControlFallbackCss() {
  return `
    .ai-html-control-fallback{display:contents}
    .ai-html-page a[data-home-action],.ai-html-page button{appearance:none;min-height:40px;display:inline-grid;place-items:center;width:max-content;max-width:100%;padding:0 14px;border:1px solid var(--home-button-border,var(--home-primary,#2563eb));border-radius:var(--home-radius-sm,8px);background:var(--home-button-bg,var(--home-primary,#2563eb));color:var(--home-button-text,#fff);font:inherit;font-weight:900;line-height:1.2;text-decoration:none;cursor:pointer}
    .ai-html-page button:not([data-home-action]),.ai-html-page a[data-home-action]:not(.ai-html-primary-cta):not([class*="primary"]){background:var(--home-surface-soft,#f8fbff);color:var(--home-text,#172033);border-color:var(--home-border,#dbe4ef)}
  `;
}

function aiHtmlNeedsControlFallback(html, css) {
  const hasControls = /<(?:a|button)\b/i.test(String(html || ""));
  if (!hasControls) return false;
  return !/\.ai-html-[^{]*(?:button|btn|cta|action)[^{]*\{|\.ai-html-page\s+(?:a|button)|a\[data-home-action\]|button\[data-home-action\]|ai-html-control-fallback/i.test(String(css || ""));
}

function synthesizeAiHtmlImplementationContract(requiredModules = [], html = "") {
  const htmlText = String(html || "");
  return (Array.isArray(requiredModules) ? requiredModules : [])
    .map((item) => {
      const moduleId = cleanText(item?.component, "", 80);
      const label = cleanText(item?.label, moduleId, 80);
      const capability = item?.capability || {};
      const hasModuleRegion = moduleId ? new RegExp(`data-ai-html-module=["']${moduleId}["']`, "i").test(htmlText) : false;
      const visibleSignals = (Array.isArray(item?.signals) ? item.signals : []).filter((signal) => textContainsAnySignal(htmlText, [signal])).slice(0, 3);
      const dataFields = normalizeAiHtmlTextList(capability.dataFields, 10, 72);
      const states = normalizeAiHtmlTextList(capability.states, 8, 72);
      const actions = normalizeAiHtmlTextList(capability.actions, 8, 72);
      const renderEvidence = [
        hasModuleRegion ? `data-ai-html-module="${moduleId}" 区域可见` : "",
        ...visibleSignals.map((signal) => `HTML 可见信号：${signal}`),
        item?.expectation ? cleanText(item.expectation, "", 120) : "",
      ].filter(Boolean);

      return {
        module: moduleId,
        label,
        family: cleanText(item?.family, "", 80),
        dataFields,
        states,
        actions,
        interactions: actions.length ? actions.map((action) => `通过 data-home-action 或模块 CTA 承接 ${action}`).slice(0, 4) : [],
        renderEvidence: renderEvidence.length ? renderEvidence : [`${label} 按模块契约补齐渲染证据`],
        emptyShellRisk: !hasModuleRegion && !visibleSignals.length,
        note: "服务端根据 requiredModules、HTML 区域和组件库契约自动补齐，避免短输出模型被迫返回冗长说明。",
      };
    })
    .filter((item) => item.module);
}

function injectAiHtmlAfterRoot(html, fragment) {
  const source = String(html || "");
  const match = source.match(/<section\b[^>]*class=(["'])[^"']*\bai-html-page\b[^"']*\1[^>]*>/i);
  if (!match) return `${fragment}\n${source}`;
  return source.replace(match[0], `${match[0]}\n${fragment}`);
}

function aiHtmlThemeFromPrompt(prompt, config = {}) {
  const source = String(prompt || "").toLowerCase();
  const raw = String(prompt || "");
  if (source.includes("blackgold") || raw.includes("黑金") || raw.includes("高净值") || raw.includes("私行") || raw.includes("VIP")) return "blackGold";
  if (source.includes("darktech") || raw.includes("暗色科技") || raw.includes("科技黑") || raw.includes("终端")) return "darkTech";
  if (source.includes("minimal") || raw.includes("极简") || raw.includes("留白") || raw.includes("白色")) return "minimalWhite";
  if (source.includes("emerald") || raw.includes("翡翠") || raw.includes("信任绿") || raw.includes("资金安全绿")) return "emeraldTrust";
  if (source.includes("cobalt") || source.includes("teal") || raw.includes("钴蓝") || raw.includes("青绿") || raw.includes("青蓝科技")) return "cobaltTeal";
  if (source.includes("crimson") || raw.includes("赤红") || raw.includes("红色活动") || raw.includes("红橙")) return "crimsonPromo";
  if (source.includes("graphite") || source.includes("silver") || raw.includes("石墨") || raw.includes("银色") || raw.includes("机构灰")) return "graphiteSilver";
  if (raw.includes("蓝") || raw.includes("金融蓝") || source.includes("blue")) return "blueFinance";
  return cleanText(config.themePreset || config.theme, "default", 40);
}

function repairAiHtmlScheme(scheme, payload = {}, config = {}, providerConfig = {}, options = {}) {
  const normalized = normalizeAiHtmlScheme(
	    {
	      ...(scheme || {}),
	      sourceType: options.sourceType || scheme?.sourceType || "model/free-html",
	      generationPipeline: options.generationPipeline || scheme?.generationPipeline || "free-html-first",
	      isFallback: Boolean(options.isFallback || scheme?.isFallback),
	      fallbackReason: options.fallbackReason || scheme?.fallbackReason || "",
	      modelAttempted: typeof options.modelAttempted === "boolean" ? options.modelAttempted : scheme?.modelAttempted,
	      mock: Boolean(options.mock || scheme?.mock),
	    },
    payload,
    config,
    providerConfig,
  );

  if (!normalized.enabled) return normalized;

	  let html = normalized.html.trim();
	  let css = normalized.css.trim();
	  const notes = [...normalized.correctionNotes];
	  const theme = escapeHtmlText(aiHtmlThemeFromPrompt(payload.prompt, config));
	  const pipeline = escapeHtmlText(options.generationPipeline || normalized.generationPipeline || "free-html-first");

	  if (!/\bai-html-page\b/i.test(html)) {
	    html = `<section class="ai-html-page ai-html-freeform-page" data-ai-html-theme="${theme}" data-ai-html-pipeline="${pipeline}">\n${html}\n</section>`;
	    notes.push("已补齐 AI HTML 根容器、主题标记和预览隔离边界。");
	  } else if (!/data-ai-html-pipeline=/i.test(html)) {
	    html = html.replace(/<section\b/i, `<section data-ai-html-pipeline="${pipeline}"`);
	    notes.push("已补齐自由 HTML 生成管线标记。");
	  }

  if (!/data-home-action=/i.test(html)) {
    html = injectAiHtmlAfterRoot(html, aiHtmlCorrectionActions(config));
    css = `${css}\n${aiHtmlCorrectionCss()}`;
    notes.push("已补齐关键按钮的 data-home-action，保证发布后能接入系统动作。");
  }
  if (!/@media/i.test(css)) {
    css = `${css}\n${aiHtmlResponsiveFallbackCss()}`;
    notes.push("已补齐基础响应式降级规则。");
  }
	  if (aiHtmlNeedsControlFallback(html, css)) {
	    html = injectAiHtmlAfterRoot(html, '<span class="ai-html-control-fallback" aria-hidden="true"></span>');
	    css = `${css}\n${aiHtmlControlFallbackCss()}`;
	    notes.push("已补齐 AI HTML 按钮/链接兜底样式，避免浏览器原生控件外观。");
	  }

  const expectedModules = aiHtmlRequiredModuleContracts(payload, config);
  const synthesizedImplementationContract = synthesizeAiHtmlImplementationContract(expectedModules, html);
  const implementationContract = normalized.implementationContract.length ? normalized.implementationContract : synthesizedImplementationContract;
  const componentReferenceHints = aiHtmlComponentReferenceHints(expectedModules, payload.prompt || "");
  const componentReferences = normalized.componentReferences.length
    ? normalized.componentReferences
    : normalizeAiHtmlComponentReferences(componentReferenceHints);
  if (!normalized.implementationContract.length && synthesizedImplementationContract.length) {
    notes.push("已根据模块契约自动补齐 implementationContract，适配 Kimi/DeepSeek/MiniMax 短输出。");
  }
  if (!normalized.componentReferences.length && componentReferences.length) {
    notes.push("已根据组件库命中结果补齐 componentReferences，确保 AI HTML 可追溯到积木库。");
  }

  const dataBindings = [
    ...new Set([...(Array.isArray(normalized.dataBindings) ? normalized.dataBindings : []), ...aiHtmlDataBindingsFromConfig(config)]),
  ].slice(0, 12);
  const quality = evaluateAiHtmlQuality(
    {
      ...normalized,
      html,
      css,
      implementationContract,
      componentReferences,
    },
    payload,
    config,
  );
  if (quality.issues.length) {
    notes.push(`质量门禁 ${quality.score}/100：${quality.issues[0]}`);
  } else {
    notes.push(`质量门禁 ${quality.score}/100：已通过模块、美观和安全基础检查。`);
  }

  return normalizeAiHtmlScheme(
    {
      ...normalized,
      html,
      css,
	      dataBindings,
	      requiredModules: quality.requiredModules.map((item) => item.label),
	      implementationContract: quality.implementationContract.length ? quality.implementationContract : implementationContract,
	      componentReferences: normalizeAiHtmlComponentReferences(componentReferences, quality.componentReferenceHints),
      qualityScore: quality.score,
      qualityStatus: quality.status,
      qualityIssues: quality.issues,
      aestheticChecks: quality.checks,
	      correctionStatus: "sanitized-and-corrected",
	      generationPipeline: options.generationPipeline || normalized.generationPipeline || "free-html-first",
	      sourceType: options.sourceType || normalized.sourceType || "model/free-html",
	      isFallback: Boolean(options.isFallback || normalized.isFallback),
	      fallbackReason: options.fallbackReason || normalized.fallbackReason || "",
	      modelAttempted: typeof options.modelAttempted === "boolean" ? options.modelAttempted : normalized.modelAttempted,
	      mock: Boolean(options.mock || normalized.mock),
	      correctionNotes: notes.length ? notes : ["已完成安全清洗、主题变量校验和系统动作校正。"],
	    },
    payload,
    config,
    providerConfig,
  );
}

function collectHomepageBlocks(config = {}) {
  const blocks = new Set();
  (Array.isArray(config.sections) ? config.sections : []).forEach((section) => {
    (Array.isArray(section?.slots) ? section.slots : []).forEach((slot) => {
      const block = canonicalHomeBlock(slot) || cleanText(slot, "", 80);
      if (block) blocks.add(block);
    });
  });
  (Array.isArray(config.layout) ? config.layout : []).forEach((item) => {
    const block = canonicalHomeBlock(item?.component || item?.feature) || cleanText(item?.component || item?.feature, "", 80);
    if (block) blocks.add(block);
  });
  (Array.isArray(config.brickPlan) ? config.brickPlan : []).forEach((item) => {
    [item?.component, item?.feature].forEach((value) => {
      const block = canonicalHomeBlock(value) || cleanText(value, "", 80);
      if (block) blocks.add(block);
    });
  });
  return [...blocks].filter(Boolean);
}

function collectHomepageFamilies(config = {}) {
  return [
    ...new Set(
      (Array.isArray(config.brickPlan) ? config.brickPlan : [])
        .map((item) => cleanText(item?.family, "", 80))
        .filter(Boolean),
    ),
  ];
}

function htmlClassVariety(html = "") {
  return new Set((String(html || "").match(/class=(["'])(.*?)\1/gi) || []).map((item) => item.replace(/^class=(["'])|["']$/g, ""))).size;
}

function scoreBand(score) {
  if (score >= 86) return "passed";
  if (score >= 72) return "needs-polish";
  return "needs-repair";
}

function categoryScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evaluateHomepageAesthetic(payload = {}, config = {}) {
  const sourceConfig = config && typeof config === "object" ? config : {};
  const prompt = cleanText(payload.prompt || sourceConfig.prompt || "", "", 1200);
  const htmlScheme = payload.htmlScheme || sourceConfig.htmlScheme || null;
  const html = String(htmlScheme?.html || "");
  const css = String(htmlScheme?.css || "");
  const blocks = collectHomepageBlocks(sourceConfig);
  const families = collectHomepageFamilies(sourceConfig);
  const sections = Array.isArray(sourceConfig.sections) ? sourceConfig.sections : [];
  const brickPlan = Array.isArray(sourceConfig.brickPlan) ? sourceConfig.brickPlan : [];
  const componentMorphs = sourceConfig.componentMorphs && typeof sourceConfig.componentMorphs === "object" ? sourceConfig.componentMorphs : {};
  const moduleStyles = sourceConfig.moduleStyles && typeof sourceConfig.moduleStyles === "object" ? sourceConfig.moduleStyles : {};
  const htmlQuality = htmlScheme?.enabled || html || css ? evaluateAiHtmlQuality({ ...htmlScheme, html, css }, payload, sourceConfig) : null;
  const componentRefs = beautifulComponentReferences({ prompt, limit: 8 });
  const sampleRefs = rankDesignSamplesForPrompt(prompt, 4).map(summarizeDesignSampleForPrompt);
  const feedbackRefs = feedbackMemoryPromptReference(prompt, 5);
  const strengths = [];
  const issues = [];
  const suggestions = [];

  const addStrength = (condition, text) => {
    if (condition) strengths.push(text);
  };
  const addIssue = (condition, text, suggestion) => {
    if (!condition) {
      issues.push(text);
      if (suggestion) suggestions.push(suggestion);
    }
  };

  const hasHero = sections.some((section) => section?.type === "hero") || /hero|首屏|h1|ai-html-(?:hero|cover|console|desk)/i.test(`${html} ${css}`);
  const hasPrimaryAction = /data-home-action=["'](?:deposit|openAccount|accounts|copyLink|downloadApp|positions|orders)/i.test(html) ||
    ["deposit", "openAccount", "accounts", "promo_banner", "onboarding_guide"].some((block) => blocks.includes(block));
  const hasVisualSignal = /svg|path|chart|curve|trend|timeline|step|rail|console|dock|carousel|scoreboard|图表|曲线|步骤|轮播/i.test(`${html} ${css} ${brickPlan.map((item) => `${item.brickId} ${item.brickName} ${item.reason}`).join(" ")}`);
  const uniqueSectionSlots = new Set(sections.flatMap((section) => (Array.isArray(section?.slots) ? section.slots : []))).size;
  const uniqueZones = new Set(brickPlan.map((item) => item.zone).filter(Boolean)).size;
  const wideBlocks = brickPlan.filter((item) => /^([3-5])x/.test(cleanText(item.size, "", 8)) || item.zone === "full").length;
  const morphCount = Object.keys(componentMorphs).length;
  const styleCount = Object.keys(moduleStyles).filter((key) => moduleStyles[key]).length;
  const classVariety = htmlClassVariety(html);
  const tokenUse = /var\(--home-/i.test(css);
  const responsive = /@media/i.test(css) || sourceConfig.autoLayout;
  const sampleAlignment = sampleRefs.length ? 72 + Math.min(20, sampleRefs[0].aestheticScore / 5) : 64;
  const feedbackBoost = feedbackRefs.some((item) => ["approve", "like", "selected", "good"].includes(item.decision)) ? 8 : 0;
  const htmlQualityScore = htmlQuality ? htmlQuality.score : null;

  const categories = [
    {
      key: "visualFocus",
      label: "首屏视觉焦点",
      weight: 22,
      score: categoryScore((hasHero ? 42 : 12) + (hasPrimaryAction ? 32 : 8) + (hasVisualSignal ? 26 : 10)),
      notes: [
        hasHero ? "有首屏/封面/工作台焦点" : "缺少明确首屏焦点",
        hasPrimaryAction ? "主行动可被识别" : "主 CTA 不够明确",
        hasVisualSignal ? "有图表、步骤、轮播或工作台结构" : "缺少可感知的视觉结构",
      ],
    },
    {
      key: "layoutHierarchy",
      label: "布局层级",
      weight: 20,
      score: categoryScore(Math.min(38, sections.length * 9) + Math.min(26, uniqueSectionSlots * 4) + Math.min(20, uniqueZones * 7) + Math.min(16, wideBlocks * 8)),
      notes: [
        `${sections.length} 个 sections`,
        `${uniqueSectionSlots} 个可见槽位`,
        `${uniqueZones} 类积木区域`,
        `${wideBlocks} 个宽幅/整行模块`,
      ],
    },
    {
      key: "componentCraft",
      label: "积木审美复用",
      weight: 22,
      score: categoryScore(Math.min(30, families.length * 6) + Math.min(28, morphCount * 5) + Math.min(18, styleCount * 4) + Math.min(14, classVariety * 2) + (htmlQualityScore ? Math.round(htmlQualityScore * 0.1) : 6)),
      notes: [
        `${families.length} 个组件家族`,
        `${morphCount} 个核心 morph`,
        `${styleCount} 个模块样式`,
        htmlQualityScore ? `AI HTML 质量 ${htmlQualityScore}/100` : "组件化方案评分",
      ],
    },
    {
      key: "brandHarmony",
      label: "品牌色彩与质感",
      weight: 14,
      score: categoryScore(
        (sourceConfig.themePreset || sourceConfig.theme ? 28 : 12) +
          (tokenUse ? 28 : htmlScheme?.enabled ? 8 : 20) +
          (sourceConfig.colorMode === "auto" || !sourceConfig.colorMode ? 18 : 14) +
          (["blackGold", "lightGold", "darkTech", "minimalWhite", "emeraldTrust", "cobaltTeal", "crimsonPromo", "graphiteSilver", "blueFinance"].includes(sourceConfig.themePreset || sourceConfig.theme) ? 26 : 16),
      ),
      notes: [
        `主题 ${sourceConfig.themePreset || sourceConfig.theme || "未标记"}`,
        tokenUse ? "CSS 使用首页 token" : "CSS token 使用不足",
        `色彩模式 ${sourceConfig.colorMode || "auto"}`,
      ],
    },
    {
      key: "businessFunction",
      label: "页面功能完整度",
      weight: 14,
      score: categoryScore(Math.min(42, blocks.length * 5) + (hasPrimaryAction ? 24 : 8) + Math.min(22, brickPlan.length * 4) + (sourceConfig.dataContract ? 12 : 4)),
      notes: [
        `${blocks.length} 个业务块`,
        `${brickPlan.length} 个积木计划`,
        sourceConfig.dataContract ? "有数据契约" : "数据契约较弱",
      ],
    },
    {
      key: "responsiveSafety",
      label: "响应式与可发布安全",
      weight: 8,
      score: categoryScore((responsive ? 46 : 18) + (htmlScheme?.safetyStatus === "sanitized" || !htmlScheme?.enabled ? 30 : 12) + (htmlScheme?.isFallback ? 8 : 24)),
      notes: [
        responsive ? "有响应式/autoLayout" : "响应式证据不足",
        htmlScheme?.enabled ? `HTML 安全状态 ${htmlScheme.safetyStatus || "unknown"}` : "组件化安全路径",
      ],
    },
  ];

  const totalWeight = categories.reduce((sum, item) => sum + item.weight, 0);
  const score = categoryScore(categories.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight + feedbackBoost);

  categories.forEach((category) => {
    addIssue(category.score >= 70, `${category.label}偏弱：${category.notes.join("；")}`, `${category.label}需要补充可执行设计约束。`);
  });
  addIssue(!(htmlScheme?.enabled && htmlScheme.isFallback), "当前 AI HTML 是 fallback/mock，不能代表真实模型审美能力。", "先关闭 HOME_AI_MOCK 或确认真实模型调用成功，再沉淀为正向样本。");
  addIssue(uniqueSectionSlots >= 4 || Boolean(htmlScheme?.enabled), "页面模块数量或形态太少，容易像单页表单。", "至少让首屏、主功能、辅助信息和合规/客服形成不同视觉层级。");
  addIssue(morphCount >= Math.min(5, Math.max(3, families.length)) || Boolean(htmlScheme?.enabled), "核心模块 morph 覆盖不足，模块可能只是在换颜色。", "为资产、快捷入口、账号、开户、图表等核心模块选择不同 DOM morph。");

  addStrength(hasHero, "首屏具备可识别焦点。");
  addStrength(hasVisualSignal, "存在图表、步骤、轮播或工作台式视觉结构。");
  addStrength(componentRefs.length > 0, "已拉取漂亮积木块作为审美参考。");
  addStrength(sampleRefs.length > 0, "已命中样本库页面和功能参考。");
  addStrength(feedbackRefs.length > 0, "已读取历史反馈偏好。");

  if (htmlQuality?.issues?.length) {
    htmlQuality.issues.slice(0, 3).forEach((issue) => issues.push(`AI HTML 质量门禁：${issue}`));
  }

  return {
    label: "首页审美评分",
    score,
    status: scoreBand(score),
    categories,
    strengths: strengths.slice(0, 10),
    issues: [...new Set(issues)].slice(0, 10),
    suggestions: [...new Set(suggestions)].slice(0, 10),
    sampleReferences: sampleRefs,
    componentReferences: componentRefs,
    feedbackReferences: feedbackRefs,
    htmlQuality: htmlQuality
      ? {
          score: htmlQuality.score,
          status: htmlQuality.status,
          issues: htmlQuality.issues,
          checks: htmlQuality.checks,
        }
      : null,
    configSnapshot: homepageRecordSnapshot(sourceConfig),
  };
}

function homepageQualityStatusFromScore(score) {
  const value = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Math.round(Number(score)))) : 0;
  if (value >= 90) return "publishable";
  if (value >= 75) return "needs-polish";
  if (value >= 60) return "needs-repair";
  return "fallback";
}

function homepageValidationHasBlockingErrors(validation = {}) {
  return Boolean(
    (Array.isArray(validation.missingRequiredModules) && validation.missingRequiredModules.length) ||
      (Array.isArray(validation.invalidSections) && validation.invalidSections.length),
  );
}

function finalizeHomepageQuality(payload = {}, config = {}, htmlScheme = null) {
  const validation = config.validation || validateHomepageConfig(config, homepageGuidedSnapshotFromPayload(payload, config));
  const aesthetic = evaluateHomepageAesthetic(payload, { ...config, ...(htmlScheme ? { htmlScheme } : {}) });
  const htmlScore = Number(htmlScheme?.qualityScore);
  const score = Number.isFinite(htmlScore) ? Math.max(0, Math.min(100, Math.round(htmlScore))) : aesthetic.score;
  const blockingStructure = homepageValidationHasBlockingErrors(validation);
  const status = blockingStructure ? "needs-repair" : homepageQualityStatusFromScore(score);
  const structuralIssues = [
    ...(validation.missingRequiredModules || []).map((slot) => `缺少必选模块 ${slot}`),
    ...(validation.invalidSections || []).map((item) => `非法 section: ${item.section || item.reason}`),
  ];

  return {
    score,
    status,
    htmlQualityStatus: status,
    quality: {
      status,
      score,
      structuralStatus: blockingStructure ? "needs-repair" : "passed",
      visualStatus: homepageQualityStatusFromScore(score),
      issues: [...new Set([...structuralIssues, ...(aesthetic.issues || [])])].slice(0, 10),
      checks: htmlScheme?.aestheticChecks || aesthetic.strengths || [],
    },
    aesthetic,
  };
}

function mockAiHtmlScheme(payload = {}, config = {}, providerConfig = {}) {
  const theme = escapeHtmlText(cleanText(config.themePreset || config.theme, "default", 40));
  const title = escapeHtmlText(cleanText(config.name, "AI 视觉首页", 42));
  const intent = config?.pageIntent?.primaryIntent || homepageIntentFromPrompt(payload.prompt);
  const bindings = aiHtmlDataBindingsFromConfig(config);
  const requiredModules = aiHtmlRequiredModuleContracts(payload, config);
  const sectionBlocks = homepageBlocksFromSections(config.sections);
  const orderedBlocks = (sectionBlocks.length ? sectionBlocks : requiredModules.map((item) => item.component)).filter(Boolean);
  const sourceClass = intent === "trader" ? "ai-html-trader" : intent === "growth" || intent === "deposit" ? "ai-html-growth" : intent === "onboarding" ? "ai-html-onboarding" : "ai-html-standard";
  const openingHero = `
    <header class="ai-html-opening-hero">
      <div class="ai-html-primary-copy">
        <small>开户引导</small>
        <h1>完成真实账户开户准备</h1>
        <p>KYC、开真实账户和首次入金按步骤推进，页面主行动聚焦立即开户。</p>
        <a class="ai-html-primary-cta" data-home-action="openAccount" href="#open-account">立即开户</a>
      </div>
      <div class="ai-html-path" aria-label="开户流程">
        <article><b>01</b><strong>KYC 认证</strong><span>Sample: 待提交</span></article>
        <article><b>02</b><strong>开真实账户</strong><span>选择 MT5 / 账户类型</span></article>
        <article><b>03</b><strong>首次入金准备</strong><span>确认钱包与风险提示</span></article>
      </div>
    </header>
  `;
  const traderHero = `
    <header class="ai-html-trader-hero">
      <div>
        <small>交易工作台</small>
        <h1>${title}</h1>
        <p>首屏先处理账号状态、账户表现、持仓入口和 MT5 操作。</p>
      </div>
      <nav class="ai-html-command-strip" aria-label="交易操作">
        <a data-home-action="positions" href="#positions">持仓</a>
        <a data-home-action="orders" href="#orders">订单</a>
        <a data-home-action="accounts" href="#accounts">切换账号</a>
        <a data-home-action="downloadMt5" href="#download">MT5</a>
      </nav>
    </header>
  `;
  const growthHero = `
    <header class="ai-html-growth-hero">
      <div>
        <small>活动权益</small>
        <h1>${title}</h1>
        <p>活动、权益梯度和入金路径优先，账号信息作为参与准备承接。</p>
      </div>
      <a class="ai-html-primary-cta" data-home-action="deposit" href="#deposit">查看活动并入金</a>
    </header>
  `;
  const standardHero = `
    <header class="ai-html-standard-hero">
      <div>
        <small>模型预览</small>
        <h1>${title}</h1>
        <p>资产摘要、关键动作和交易账号以清晰的信息架构组织。</p>
      </div>
      <a class="ai-html-primary-cta" data-home-action="deposit" href="#deposit">入金</a>
    </header>
  `;
  const hero = intent === "trader" ? traderHero : intent === "growth" || intent === "deposit" ? growthHero : intent === "onboarding" ? openingHero : standardHero;
  const moduleMarkupByBlock = {
    welcome_header: `<section class="ai-html-welcome" data-ai-html-module="welcome_header"><header><span>welcome_header</span><strong>欢迎回来</strong></header><p>客户姓名、账户状态和问候语来自 CRM 账户上下文。</p></section>`,
    asset_overview: `<section class="ai-html-metrics" data-ai-html-module="asset_overview"><header><span>asset_overview</span><strong>账户摘要</strong></header><div><article><small>余额合计</small><b>Sample 125,430.80 USD</b></article><article><small>钱包余额</small><b>Sample 18,920.00</b></article><article><small>交易账号余额</small><b>Sample 106,510.80</b></article></div></section>`,
    onboarding_guide: `<section class="ai-html-onboarding-rail" data-ai-html-module="onboarding_guide"><header><span>onboarding_guide</span><strong>KYC / 真实账户 / 首次入金</strong></header><ol><li><b>KYC</b><span>状态来自 CRM</span></li><li><b>开真实账户</b><span>下一步主任务</span></li><li><b>首次入金</b><span>准备钱包与风险确认</span></li></ol><a data-home-action="openAccount" href="#open-account">立即开户</a></section>`,
    quick_actions: `<section class="ai-html-task-actions" data-ai-html-module="quick_actions"><header><span>quick_actions</span><strong>下一步操作</strong></header><nav><a data-home-action="openAccount" href="#open-account">立即开户</a><a data-home-action="deposit" href="#deposit">首次入金</a><a data-home-action="accounts" href="#accounts">交易账号</a><a data-home-action="contactSupport" href="#support">联系客服</a></nav></section>`,
    promo_banner: `<section class="ai-html-benefits" data-ai-html-module="promo_banner"><header><span>promo_banner</span><strong>活动权益</strong></header><div><b>新客入金准备礼</b><p>Sample 活动权益，正式内容来自后台活动配置。</p><a data-home-action="deposit" href="#deposit">查看权益</a></div></section>`,
    pamm_products: `<section class="ai-html-pamm" data-ai-html-module="pamm_products"><header><span>pamm_products</span><strong>PAMM 条件展示</strong></header><div><article><b>稳健策略 A</b><span>Sample 风险：中低</span><small>起投与周期来自后台配置</small></article><article><b>平衡策略 B</b><span>Sample 风险：中</span><small>收益字段仅作 demo</small></article></div></section>`,
    copytrading_signals: `<section class="ai-html-copytrading" data-ai-html-module="copytrading_signals"><header><span>copytrading_signals</span><strong>CopyTrading 信号源</strong></header><div class="ai-html-curve"><i></i><i></i><i></i><i></i><i></i></div><p>信号源收益率、总收益、最大回撤和曲线来自接口，缺失显示占位。</p></section>`,
    trading_account_highlight: `<section class="ai-html-performance" data-ai-html-module="trading_account_highlight"><header><span>trading_account_highlight</span><strong>账户表现图表</strong></header><div class="ai-html-curve"><i></i><i></i><i></i><i></i><i></i></div><p>Equity、PnL、保证金等真实数据来自接口，缺失显示占位。</p></section>`,
    trading_accounts_list: `<section class="ai-html-accounts-list" data-ai-html-module="trading_accounts_list"><header><span>trading_accounts_list</span><strong>交易账号列表</strong></header><div><article><b>Live</b><strong>80010</strong><span>MT5 · HCHoldings-Live2 · Equity Sample 12,726.40</span></article><article><b>Demo</b><strong>90021</strong><span>MT5 · HCHoldings-Demo · Equity Sample 51,280.60</span></article></div><a data-home-action="accounts" href="#accounts">查看账号</a></section>`,
    referral_link_card: `<section class="ai-html-referral" data-ai-html-module="referral_link_card"><header><span>referral_link_card</span><strong>推广链接</strong></header><p>https://example.com/register?code=SAMPLE</p><div><b>邀请码 SAMPLE88</b><a data-home-action="copyLink" href="#copy">复制</a></div></section>`,
    app_download: `<section class="ai-html-download" data-ai-html-module="app_download"><header><span>app_download</span><strong>下载入口</strong></header><div><b>Client Portal APP</b><b>MT5 下载</b></div><a data-home-action="downloadApp" href="#download">打开下载</a></section>`,
    support_contact: `<section class="ai-html-support" data-ai-html-module="support_contact"><header><span>support_contact</span><strong>在线客服</strong></header><p>服务时间、在线状态和客户经理入口来自后台。</p><a data-home-action="contactSupport" href="#support">联系客服</a></section>`,
    faq_section: `<section class="ai-html-faq" data-ai-html-module="faq_section"><header><span>faq_section</span><strong>FAQ 常见问题</strong></header><details open><summary>如何完成开户？</summary><p>先完成 KYC，再创建真实账户并准备首次入金。</p></details><details><summary>Demo 数据是否会发布？</summary><p>预览可用 Sample 数据，正式环境绑定后台数据。</p></details></section>`,
    risk_disclosure: `<section class="ai-html-risk-strip" data-ai-html-module="risk_disclosure"><strong>风险提示</strong><p>外汇和差价合约交易涉及高风险，杠杆可能放大亏损，请确认自身风险承受能力。</p></section>`,
  };
  const moduleMarkup = orderedBlocks.map((block) => moduleMarkupByBlock[block]).filter(Boolean).join("\n");
  const html = `
    <section class="ai-html-page ${sourceClass}" data-ai-html-theme="${theme}" data-ai-html-source="mock">
      ${hero}
      <main class="ai-html-module-flow">
        ${moduleMarkup}
      </main>
    </section>
  `;
  const css = `
    :host{display:block;color:var(--home-text,#172033);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
    .ai-html-page{display:grid;gap:14px;padding:16px;background:var(--home-bg,#f6f8fb)}
    .ai-html-page *{box-sizing:border-box}
    .ai-html-opening-hero,.ai-html-trader-hero,.ai-html-growth-hero,.ai-html-standard-hero{display:grid;gap:18px;padding:24px;border:1px solid var(--home-banner-border,#c7d2fe);border-radius:var(--home-radius-sm,8px);background:var(--home-banner-bg,#fff);color:var(--home-banner-text,var(--home-text,#172033))}
    .ai-html-opening-hero{grid-template-columns:minmax(0,.95fr) minmax(300px,1.05fr);background:var(--home-card-bg,#fff);color:var(--home-text,#172033)}
    .ai-html-trader-hero{grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);background:var(--home-surface-soft,#eef6ff)}
    .ai-html-growth-hero{grid-template-columns:minmax(0,1fr) auto;align-items:end;background:var(--home-banner-bg,#10213f);color:var(--home-banner-text,#fff)}
    .ai-html-standard-hero{grid-template-columns:minmax(0,1fr) auto;align-items:end}
    .ai-html-page h1{margin:0;font-size:34px;line-height:1.08;letter-spacing:0}.ai-html-page p{margin:0;color:var(--home-text-muted,#64748b);line-height:1.65}.ai-html-growth-hero p{color:var(--home-banner-muted,#dbeafe)}
    .ai-html-page small,.ai-html-page span{color:var(--home-primary,#2563eb);font-size:12px;font-weight:950;letter-spacing:0}.ai-html-primary-copy{display:grid;gap:12px;align-content:center}.ai-html-primary-cta,.ai-html-page a{min-height:42px;display:inline-grid;place-items:center;width:max-content;padding:0 16px;border:1px solid var(--home-button-border,#1d4ed8);border-radius:var(--home-radius-sm,8px);background:var(--home-button-bg,#2563eb);color:var(--home-button-text,#fff);font-weight:950;text-decoration:none}
    .ai-html-path{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ai-html-path article{display:grid;gap:8px;min-height:132px;padding:14px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}.ai-html-path b{color:var(--home-primary,#2563eb);font-size:24px}.ai-html-path strong{font-size:16px}
    .ai-html-command-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ai-html-command-strip a{width:auto;background:var(--home-card-bg,#fff);color:var(--home-primary,#2563eb)}
    .ai-html-module-flow{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}.ai-html-module-flow>section{grid-column:span 6;display:grid;gap:12px;padding:18px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg,#fff);box-shadow:0 14px 34px rgba(15,23,42,.06)}.ai-html-module-flow>section.ai-html-accounts-list,.ai-html-module-flow>section.ai-html-risk-strip{grid-column:1/-1}.ai-html-module-flow header{display:flex;justify-content:space-between;gap:12px;align-items:start}.ai-html-module-flow strong{font-size:20px}.ai-html-metrics div,.ai-html-pamm div,.ai-html-accounts-list div{display:grid;gap:10px}.ai-html-metrics div{grid-template-columns:repeat(3,minmax(0,1fr))}.ai-html-metrics article,.ai-html-pamm article,.ai-html-accounts-list article{display:grid;gap:6px;padding:12px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}.ai-html-metrics b,.ai-html-accounts-list b{color:var(--home-primary,#2563eb)}
    .ai-html-onboarding-rail ol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none}.ai-html-onboarding-rail li{display:grid;gap:5px;padding:12px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}
    .ai-html-curve{height:108px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;align-items:end}.ai-html-curve i{display:block;border-radius:999px 999px 4px 4px;background:linear-gradient(180deg,var(--home-primary,#2563eb),color-mix(in srgb,var(--home-primary,#2563eb) 16%,transparent))}.ai-html-curve i:nth-child(1){height:44%}.ai-html-curve i:nth-child(2){height:62%}.ai-html-curve i:nth-child(3){height:52%}.ai-html-curve i:nth-child(4){height:78%}.ai-html-curve i:nth-child(5){height:92%}
    .ai-html-task-actions nav,.ai-html-benefits div,.ai-html-referral div,.ai-html-download div{display:grid;gap:8px}.ai-html-task-actions nav{grid-template-columns:repeat(4,minmax(0,1fr))}.ai-html-task-actions a{width:auto}.ai-html-referral p{padding:10px;border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff);overflow-wrap:anywhere}.ai-html-risk-strip{border-style:dashed}.ai-html-risk-strip p{max-width:920px}.ai-html-faq details{padding:10px;border:1px solid var(--home-border,#dbe4ef);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft,#f8fbff)}
    @media(max-width:860px){.ai-html-opening-hero,.ai-html-trader-hero,.ai-html-growth-hero,.ai-html-standard-hero,.ai-html-path,.ai-html-metrics div,.ai-html-onboarding-rail ol,.ai-html-task-actions nav{grid-template-columns:1fr}.ai-html-module-flow{grid-template-columns:1fr}.ai-html-module-flow>section{grid-column:1/-1}.ai-html-page h1{font-size:28px}.ai-html-page a{width:100%}}
  `;

  return repairAiHtmlScheme(
    {
      name: `${title} HTML 版`,
      summary: "HOME_AI_MOCK 或本地预览生成的 mock AI HTML，不代表模型真实生成结果。",
      visualBrief: "按页面意图选择 mock 骨架：开户引导、交易工作台或活动增长使用不同信息架构。",
      html,
      css,
      dataBindings: bindings,
      requiredModules: requiredModules.map((item) => item.label),
      implementationContract: requiredModules.map((item) => ({
        module: item.component,
        label: item.label,
        family: item.family,
        dataFields: item.capability.dataFields,
        states: item.capability.states,
        actions: item.capability.actions,
        interactions: [`${item.label} 在 mock HTML 中有独立区域、状态或动作承接。`],
        renderEvidence: [`data-ai-html-module="${item.component}" 区域可见。`],
      })),
      safetyNotes: ["本地 mock 方案未调用模型，适合验证渲染链路。"],
      correctionNotes: ["当前为 mock HTML，用于验证自由 HTML 渲染和修正链路；发布前应明确提示管理员。"],
      generationPipeline: "mock-free-html",
      correctionStatus: "mock-sanitized",
      sourceType: "mock",
      isFallback: true,
      fallbackReason: "HOME_AI_MOCK=true 或本地 mock 预览，未调用真实模型。",
      modelAttempted: false,
      mock: true,
    },
    payload,
    config,
    providerConfig,
    { sourceType: "mock", generationPipeline: "mock-free-html", isFallback: true, fallbackReason: "HOME_AI_MOCK=true 或本地 mock 预览，未调用真实模型。", modelAttempted: false, mock: true },
  );
}

function configBackedAiHtmlScheme(payload = {}, config = {}, providerConfig = {}, options = {}) {
  const localScheme = mockAiHtmlScheme(payload, config, providerConfig);
  const providerName = cleanText(options.providerName || providerConfig.name || providerConfig.provider || "模型", "模型", 40);
  const providerId = cleanText(providerConfig.provider || options.providerId || "provider", "provider", 32).toLowerCase();
  const title = cleanText(config.name, `${providerName} 首页预览`, 48);
  const sourceType = cleanText(options.sourceType, `model/${providerId}-config-html`, 48);
  const pipeline = cleanText(options.generationPipeline, `${providerId}-config-backed-html`, 48);
  const failureSummary = cleanText(options.failureSummary, "", 180);
  const html = String(localScheme.html || "")
    .replace(/data-ai-html-source=(["'])[^"']*\1/i, `data-ai-html-source="${escapeHtmlText(sourceType)}"`)
    .replace(/data-ai-html-pipeline=(["'])[^"']*\1/i, `data-ai-html-pipeline="${escapeHtmlText(pipeline)}"`);
  const summary =
    options.summary ||
    `${providerName} 已生成首页配置蓝图；HTML 预览由服务端按该蓝图装配，避免 HTML 长 JSON 超时或截断。`;
  const visualBrief =
    options.visualBrief ||
    "保留模型选择的页面意图、模块顺序和主题，使用安全的本地 HTML/CSS 预览壳呈现。";
  const notes = Array.isArray(options.correctionNotes) ? options.correctionNotes : [];
  return normalizeAiHtmlScheme(
    {
      ...localScheme,
      name: `${title} HTML 预览`,
      summary,
      visualBrief,
      html,
      safetyNotes: [
        `HTML/CSS 由服务端从 ${providerName} 配置蓝图装配，没有执行脚本或远程资源。`,
        `${providerName} 的模型配置结果仍保留在组件化首页中，可切回组件预览或继续生成自由 HTML。`,
      ],
      correctionNotes: [
        failureSummary
          ? `AI HTML 长输出未采用，已保留模型首页配置并装配安全预览：${failureSummary}`
          : `${providerName} 使用配置蓝图驱动的安全 HTML 预览，避免长 JSON 截断。`,
        ...notes,
        ...(Array.isArray(localScheme.correctionNotes) ? localScheme.correctionNotes.filter((note) => !/mock|HOME_AI_MOCK/i.test(note)) : []),
      ].slice(0, 8),
      generationPipeline: pipeline,
      correctionStatus: "config-backed",
      sourceType,
      isFallback: false,
      fallbackReason: "",
      modelAttempted: true,
      mock: false,
      qualityScore: Number.isFinite(Number(localScheme.qualityScore)) ? localScheme.qualityScore : 72,
      qualityStatus: localScheme.qualityStatus && !["fallback-preview", "mock-preview"].includes(localScheme.qualityStatus) ? localScheme.qualityStatus : "needs-polish",
    },
    payload,
    config,
    providerConfig,
  );
}

function minimaxConfigBackedAiHtmlScheme(payload = {}, config = {}, providerConfig = {}) {
  return configBackedAiHtmlScheme(payload, config, providerConfig, {
    providerName: "MiniMax",
    sourceType: "model/minimax-config-html",
    generationPipeline: "minimax-config-backed-html",
    summary: "MiniMax 已生成首页配置蓝图；HTML 预览由服务端按该蓝图装配，避免 2048 输出上限截断。",
    visualBrief: "保留 MiniMax 选择的页面意图、模块顺序和主题，使用安全的本地 HTML/CSS 预览壳呈现。",
    correctionNotes: ["MiniMax OpenAI 兼容接口输出上限较小，AI HTML 长 JSON 容易被截断；已改为配置蓝图驱动的安全预览。"],
  });
}

function homepageRepairedConfigPromptContract(config = {}) {
  const sections = (Array.isArray(config.sections) ? config.sections : [])
    .map(parseHomepageSectionInput)
    .filter((section) => section.slots.length)
    .map((section, index) => ({
      index,
      id: cleanText(section.id, `section-${index + 1}`, 48),
      type: section.type,
      slots: section.slots,
      signature: homepageSectionSignature(section),
    }));
  return {
    name: config.name,
    themePreset: config.themePreset || config.theme,
    density: config.density,
    heroFocus: config.heroFocus,
    sections,
    brickPlan: (Array.isArray(config.brickPlan) ? config.brickPlan : []).map((item) => ({
      brickId: item.brickId,
      component: item.component || item.feature,
      size: item.size,
      zone: item.zone,
    })),
    validation: config.validation || null,
    repairActions: Array.isArray(config.repairActions) ? config.repairActions.slice(0, 8) : [],
  };
}

function buildFreeAiHtmlPrompt(payload) {
  const prompt = cleanText(payload.prompt, "生成一个成熟券商用户端首页", 1200);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const requiredModules = aiHtmlRequiredModuleContracts(payload, {
    sections: (Array.isArray(intentProfile.mustHave) ? intentProfile.mustHave : []).map((slot, index) => ({
      id: `intent-${index + 1}`,
      type: index === 0 ? "hero" : "main",
      slots: [slot],
    })),
  });
  const componentReference = componentLibraryPromptReference({ prompt, limit: 12 });
  const referenceHints = aiHtmlComponentReferenceHints(requiredModules, prompt);
  const trainingContext = aestheticTrainingContext({ prompt }, { sampleLimit: 4, componentLimit: 10, feedbackLimit: 6 });
  const designGovernance = designRulesPromptReference();
  const system = [
    "你是 ForexCRM 的 AI HTML 页面设计师。",
    "你的第一任务是先自由生成一版可预览的 HTML/CSS 首页视觉方案，而不是先生成组件配置或复用固定模板；但这个自由必须建立在模块理解、组件库参考和设计 token 之上。",
    "必须遵守 design.md 设计治理：先锁住金融 CRM 骨架、组件语义、token、暗色/移动端和禁用项，再在信息层级、模块比例、状态细节和响应式上做美化。",
    "只输出一个能被 JSON.parse 解析的紧凑 JSON object，不要 markdown、代码块或解释。",
    "必须返回字段 name、summary、visualBrief、moduleUnderstanding、requiredModules、moduleMapping、implementationContract、componentReferences、designNotes、html、css、dataBindings、safetyNotes、correctionNotes。",
    "允许自由决定首屏骨架、栅格比例、模块排列、视觉层级和信息密度；可以使用 editorial cover、trading console、wealth desk、onboarding journey、campaign poster、ops workspace 等完全不同结构。",
    "禁止每次都使用同一套 hero + 四按钮 + 两张卡片 + 账号表的骨架；本次方案必须根据管理员需求重建页面形态。",
    "必须先理解 requiredModules，每个要求模块都要在 HTML 中有可见表达；不能把 KYC、交易账号、账户表现、推广链接等业务要求简化成普通标题或空白卡片。",
    "必须参考 componentLibraryReference 和 componentReferenceHints 的业务字段、按钮密度、卡片比例、状态标签、图表/列表表达；允许变形和重组，但要在 componentReferences 写明参考了哪些积木以及如何自由发挥。",
    "组件库参考是硬约束：componentReferences 至少覆盖 3 个 requiredModules 或组件家族；HTML 必须把参考转成具体结构差异，例如指标带、任务时间线、账号列表、趋势图、操作 Dock、FAQ 折叠或风险提示条。",
    "必须参考 designTrainingContext：样本页面用于判断整体页面骨架和功能流，beautifulComponents 用于吸收漂亮积木块的视觉细节，feedbackMemory 用于避开用户否定过的审美方向。",
    "moduleMapping 必须说明每个 requiredModules 如何映射到 HTML 中的区域、参考的组件家族，以及自由变形点。",
    "implementationContract 必须是数组，每个 requiredModules 至少一项，字段包括 module、label、family、dataFields、states、actions、interactions、renderEvidence；它用来证明该模块不是静态外观空壳。",
    "如果某模块只有标题、普通卡片或没有数据字段/状态/动作，请在 emptyShellRisk 标记 true；服务端会因此返修。",
    "设计美感硬约束：首屏必须有主视觉焦点；页面不能全是同一种白卡片；至少包含三类不同结构，如指标带、步骤时间线、账号列表/表格、活动条、客服卡、FAQ 折叠、风险提示条；桌面端要有明确的分栏或栅格节奏；移动端要能单列降级。",
    "HTML 只能使用 section/header/main/div/article/nav/a/button/span/small/strong/b/em/p/ul/ol/li/table/thead/tbody/tr/th/td/svg/path 等静态标签。",
    "禁止生成 JS、script、iframe、form、input、onclick/onload 等事件属性、外链脚本、外链字体、远程图片、javascript: URL。",
    "CSS 只能写当前 HTML 草稿需要的类，类名统一用 ai-html- 前缀；不要写 body/html 全局样式，不要 position:fixed。",
    "必须使用 CSS 变量承接主题，例如 var(--home-bg)、var(--home-card-bg)、var(--home-primary)、var(--home-text)、var(--home-border)、var(--home-radius-sm)。",
    "所有 a/button 必须在 CSS 中被 ai-html- 类、.ai-html-page button 或 a[data-home-action] 显式样式化，不能保留浏览器默认按钮。",
    "客户侧字段要 value-first：交易账号卡片里不要露出“平台/服务器”这类后台字段名，平台和服务器合并直接显示为 MT5 · HCHoldings-Live2；表格需要列名时用“交易环境”。",
    "关键系统动作通过 data-home-action 标记，例如 deposit、openAccount、withdraw、wallet、accounts、copyLink；不要编造系统不存在的动作。",
    "真实数据缺失时用 -- 或预览样例，不能编造监管承诺、稳赚收益或不可兑现的账户状态。",
    "服务端会在你输出后做安全清洗、动作补齐和数据绑定修正；你现在只负责先给出更自由、更像真实设计初稿的 HTML/CSS。",
  ].join("\n");
  const user = [
    "管理员需求:",
    prompt,
    "",
    "识别到的页面意图，仅用于帮助你选择不同页面形态，不是固定模板:",
    compactJson({
      primaryIntent: intentProfile.primaryIntent,
      secondaryIntents: intentProfile.secondaryIntents,
      mustHave: intentProfile.mustHave,
      avoid: intentProfile.avoid,
      layoutPreset: intentProfile.layoutPreset,
      heroFocus: intentProfile.heroFocus,
    }),
    "",
    "必须承接的模块契约:",
    compactJson(requiredModules),
    "",
    "组件库视觉参考摘要:",
    compactJson(componentReference),
    "",
    "建议优先参考的积木:",
    compactJson(referenceHints),
    "",
    "审美训练上下文:",
    compactJson(trainingContext),
    "",
    "design.md 设计治理摘要:",
    compactJson(designGovernance),
    "",
    "已保存组合参考:",
    compactJson(savedCompositionPromptReference(4)),
    "",
    "可用业务数据绑定参考:",
    compactJson([
      "totalAssets",
      "walletBalance",
      "tradingAccountBalance",
      "quickActionList",
      "tradingAccounts",
      "currencyWallets",
      "equityCurve",
      "pnlTrend",
      "kycStatus",
      "accountOpeningSteps",
      "campaignConfig",
      "riskDisclosureText",
    ]),
    "",
    "请先自由生成 AI HTML 视觉草稿 JSON。输出中的 html/css 可以自由，但 moduleUnderstanding、moduleMapping、implementationContract、componentReferences 必须解释你的自由发挥如何继承组件库审美和业务实现能力。",
  ].join("\n");

  return { system, user };
}

function buildAiHtmlPrompt(payload, configScheme = {}, options = {}) {
  const prompt = cleanText(payload.prompt, "生成一个成熟券商用户端首页", 1200);
  const requiredModules = aiHtmlRequiredModuleContracts(payload, configScheme);
  const qualityReport = options.qualityReport || null;
  const previousScheme = options.previousScheme || null;
  const trainingContext = aestheticTrainingContext({ prompt }, { sampleLimit: 4, componentLimit: 10, feedbackLimit: 6 });
  const designGovernance = designRulesPromptReference();
  const system = [
    "你是 ForexCRM 首页视觉设计修正器。",
    "只输出一个能被 JSON.parse 解析的紧凑 JSON object，不要 markdown、代码块或解释。",
    "这条通道用于在自由 HTML 生成失败或质量门禁不通过时，基于组件化配置、组件库参考和上一版问题生成一版更美观的 HTML/CSS 修正版。",
    "必须遵守 design.md 设计治理：漂亮不是自由堆装饰，而是让信息层级、间距、状态、图表/列表、空状态和响应式更成熟，同时保持金融 CRM 的克制气质。",
    "必须返回字段 name、summary、visualBrief、moduleUnderstanding、requiredModules、moduleMapping、implementationContract、componentReferences、designNotes、html、css、dataBindings、safetyNotes、correctionNotes。",
    "HTML 只能使用 section/header/main/div/article/nav/a/button/span/small/strong/b/em/p/ul/ol/li/table/thead/tbody/tr/th/td/svg/path 等静态标签。",
    "禁止生成 JS、script、iframe、form、input、onclick/onload 等事件属性、外链脚本、外链字体、远程图片、javascript: URL。",
    "CSS 只能写当前 HTML 草稿需要的类，类名统一用 ai-html- 前缀；不要写 body/html 全局样式，不要 position:fixed。",
    "必须使用 CSS 变量承接主题，例如 var(--home-bg)、var(--home-card-bg)、var(--home-primary)、var(--home-text)、var(--home-border)、var(--home-radius-sm)。",
    "视觉目标：成熟券商客户端、信息层级清楚、留白克制、模块不像普通卡片堆叠；主金额、主操作、趋势图和账号状态要有明确层次。",
    "必须严格按照 repairedConfig.sections 渲染，不允许新增、删除、重排模块；只允许优化视觉样式、文案、卡片层次、图标感、留白和响应式表现。",
    "每个 repairedConfig.sections[].slots 都必须按原顺序生成 data-ai-html-module 可见区域，section 顺序也必须和 repairedConfig.sections 完全一致。",
    "组件库参考是硬约束：componentReferences 至少覆盖 3 个 requiredModules 或组件家族，并把参考转成结构差异，不要只写普通白卡片。",
    "必须同时参考 designTrainingContext：样本页面决定页面级构图和功能流，beautifulComponents 决定积木级细节，feedbackMemory 决定用户长期偏好。",
    "如果上一版问题指出模块缺失、token 不足、结构太平或占位符太多，这一版必须通过不同布局和更具体业务表达修复。",
    "implementationContract 必须逐模块写明 dataFields、states、actions、interactions、renderEvidence；修正版必须补齐上一版缺失的模块实现协议。",
    "客户侧字段要 value-first：交易账号卡片里不要露出“平台/服务器”这类后台字段名，平台和服务器合并直接显示为 MT5 · HCHoldings-Live2；表格需要列名时用“交易环境”。",
    "即使参考组件化配置，也不要照抄固定骨架；可以改变模块比例、分组方式和首屏叙事。",
    "所有 a/button 必须在 CSS 中被 ai-html- 类、.ai-html-page button 或 a[data-home-action] 显式样式化，不能保留浏览器默认按钮。",
    "按钮只能通过 data-home-action 表达系统动作，不要编造不存在的功能；真实数据缺失时用 -- 或预览样例。",
  ].join("\n");
  const user = [
    "管理员需求:",
    prompt,
    "",
    "已生成的组件化首页配置，可作为业务和数据契约参考:",
    compactJson({
      ...homepageRepairedConfigPromptContract(configScheme),
      moduleSettings: configScheme.moduleSettings,
      pageIntent: configScheme.pageIntent,
    }),
    "",
    "必须承接的模块契约:",
    compactJson(requiredModules),
    "",
    "组件库视觉参考摘要:",
    compactJson(componentLibraryPromptReference({ prompt, limit: 10 })),
    "",
    "审美训练上下文:",
    compactJson(trainingContext),
    "",
    "design.md 设计治理摘要:",
    compactJson(designGovernance),
    "",
    "已保存组合参考:",
    compactJson(savedCompositionPromptReference(4)),
    "",
    qualityReport
      ? [
          "上一版质量门禁问题:",
          compactJson({
            score: qualityReport.score,
            status: qualityReport.status,
            issues: qualityReport.issues,
            checks: qualityReport.checks,
          }),
          "",
        ].join("\n")
      : "",
    previousScheme
      ? [
          "上一版自由 HTML 摘要，仅用于避免重复低质量骨架:",
          compactJson({
            name: previousScheme.name,
            summary: previousScheme.summary,
            visualBrief: previousScheme.visualBrief,
            moduleMapping: previousScheme.moduleMapping,
            componentReferences: previousScheme.componentReferences,
          }),
          "",
        ].join("\n")
      : "",
    "请返回 AI HTML 视觉草稿 JSON。重点修复模块承接、美观层级和组件库参考，而不是只改颜色。",
  ].join("\n");

  return { system, user };
}

function buildMiniMaxAiHtmlPrompt(payload, configScheme = {}, options = {}) {
  const prompt = cleanText(payload.prompt, "生成一个成熟券商用户端首页", 560);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const seedConfig =
    configScheme && Object.keys(configScheme).length
      ? configScheme
      : {
          sections: (Array.isArray(intentProfile.mustHave) ? intentProfile.mustHave : []).map((slot, index) => ({
            id: `minimax-intent-${index + 1}`,
            type: index === 0 ? "hero" : "main",
            slots: [slot],
          })),
        };
	  const requiredModules = aiHtmlRequiredModuleContracts(payload, seedConfig).slice(0, 5);
  const referenceHints = aiHtmlComponentReferenceHints(requiredModules, prompt).slice(0, 5);
	  const qualityReport = options.qualityReport || null;
	  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 的 MiniMax 紧凑 AI HTML 设计师。",
    "只输出一个能被 JSON.parse 解析的 JSON object；第一个字符是 {，最后一个字符是 }。",
    "不要 markdown、代码块、解释、注释或 <think>。",
	    "MiniMax 输出上限很小：必须返回 html、css、qualityScore、qualityStatus、correctionNotes；可选返回短 componentReferences 和 implementationContract，服务端会补齐冗长字段。",
	    "html <= 900 字符，css <= 760 字符，整个 JSON <= 1800 中文字符。",
	    "HTML 只能用静态 section/header/main/div/article/nav/a/span/small/strong/b/p/ol/li；CSS 类名用 ai-html- 前缀，使用 var(--home-bg)、var(--home-card-bg)、var(--home-primary)、var(--home-text)、var(--home-border)、var(--home-radius-sm)。",
	    "遵守 design.md 设计治理：金融 CRM、克制专业、信息层级清楚；不要营销式大 hero、随机渐变、厚重阴影或卡片套卡片。",
	    "所有 a/button 必须显式样式化，不能保留浏览器默认按钮；至少让模块出现两种不同结构，不能全是同一种白卡片。",
	    "必须严格按照 repairedConfig.sections 渲染，不允许新增、删除、重排模块；每个 slot 都要按顺序生成 data-ai-html-module 可见区域。",
	    "每个 requiredModules 至少在 html 中有 data-ai-html-module 可见区域；模块内容必须短，可用 Sample 或 --。",
	    "必须参考 referenceHints 的 componentId、name、visibleText 和 styleSignals；即使不返回完整 componentReferences，HTML 也要体现对应积木的字段密度、状态标签和布局语言。",
	    "禁止 JS、script、iframe、form、input、事件属性、远程图片、真实下载链接或稳赚/监管承诺。",
	  ].join("\n");

  const user = [
    "管理员需求:",
    prompt,
    "",
    "页面意图:",
    compactJson({
      primaryIntent: intentProfile.primaryIntent,
      mustHave: intentProfile.mustHave,
      avoid: intentProfile.avoid,
      heroFocus: intentProfile.heroFocus,
    }),
    "",
    "repairedConfig 严格渲染契约:",
    compactJson(homepageRepairedConfigPromptContract(seedConfig)),
    "",
	    "requiredModules:",
	    compactJson(requiredModules.map((item) => ({
	      module: item.component,
	      label: item.label,
      fields: item.capability?.dataFields?.slice(0, 3) || [],
      actions: item.capability?.actions?.slice(0, 2) || [],
	    }))),
	    "",
	    "referenceHints:",
	    compactJson(referenceHints.map((item) => ({
	      componentId: item.componentId,
	      name: item.name,
	      family: item.family,
	      requiredFamily: item.requiredFamily,
	      module: item.module,
	      reason: item.reason,
	      visibleText: item.visibleText,
	      styleSignals: item.styleSignals,
	    }))),
	    "",
	    "design.md 摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 4) || [],
      forbidden: designGovernance.forbidden?.slice(0, 4) || [],
    }),
    "",
    qualityReport
      ? [
          "质量问题，需用更清晰层级修复:",
          compactJson({ score: qualityReport.score, issues: qualityReport.issues?.slice(0, 3) || [] }),
          "",
        ].join("\n")
      : "",
    "返回示例形状:{\"html\":\"<section class=\\\"ai-html-page\\\"><header><strong>标题</strong></header><main><article data-ai-html-module=\\\"asset_overview\\\"><b>Sample</b></article></main></section>\",\"css\":\".ai-html-page{display:grid;gap:12px;background:var(--home-bg);color:var(--home-text)}@media(max-width:860px){.ai-html-page{grid-template-columns:1fr}}\",\"qualityScore\":74,\"qualityStatus\":\"needs-polish\",\"correctionNotes\":[\"MiniMax compact\"]}",
    "现在只返回最终短 JSON。html 用一个 ai-html-page 根 section，并严格按 repairedConfig.sections 输出模块；css 必须包含 @media(max-width:860px)。",
  ].join("\n");

  return { system, user, promptMode: "minimax-ai-html-compact" };
}

function buildCompactAiHtmlPrompt(payload, configScheme = {}, options = {}) {
  const prompt = cleanText(payload.prompt, "生成一个成熟券商用户端首页", 560);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const seedConfig =
    configScheme && Object.keys(configScheme).length
      ? configScheme
      : {
          sections: (Array.isArray(intentProfile.mustHave) ? intentProfile.mustHave : []).map((slot, index) => ({
            id: `compact-intent-${index + 1}`,
            type: index === 0 ? "hero" : "main",
            slots: [slot],
          })),
	        };
  const requiredModules = aiHtmlRequiredModuleContracts(payload, seedConfig).slice(0, 6);
  const referenceHints = aiHtmlComponentReferenceHints(requiredModules, prompt).slice(0, 5);
  const qualityReport = options.qualityReport || null;
  const previousScheme = options.previousScheme || null;
  const designGovernance = designRulesPromptReference();
	  const system = [
	    "你是 ForexCRM 的 AI HTML 页面设计师。",
	    "只输出一个能被 JSON.parse 解析的 JSON object，不要 markdown、代码块、解释或 <think>。",
	    "这是 Kimi/DeepSeek 短输出通道：必须返回 html、css、qualityScore、qualityStatus、correctionNotes，可选 name、summary、componentReferences、implementationContract；服务端会补齐冗长字段。",
	    "html <= 1800 字符，css <= 1500 字符，整个 JSON <= 3800 中文字符；宁可少写，也不要截断。",
	    "必须遵守 design.md 设计治理：把漂亮控制在金融 CRM 规范内，先保证骨架、token、组件语义、暗色/移动端，再做细节美化。",
	    "html/css 要短而完整：桌面端有清晰首屏和模块层级，移动端能单列降级；不要生成 JS、script、iframe、form、input、onclick/onload、远程图片或 javascript: URL。",
	    "HTML 只能用静态 section/header/main/div/article/nav/a/button/span/small/strong/b/em/p/ul/ol/li/svg/path。",
	    "CSS 类名统一用 ai-html- 前缀，并使用 var(--home-bg)、var(--home-card-bg)、var(--home-primary)、var(--home-text)、var(--home-border)、var(--home-radius-sm) 等主题变量。",
	    "必须严格按照 repairedConfig.sections 渲染，不允许新增、删除、重排模块；只允许优化视觉样式、文案、卡片层次、图标感、留白和响应式表现。",
	    "每个 repairedConfig.sections[].slots 都必须按原顺序生成 data-ai-html-module 可见区域；服务端会根据配置补齐 implementationContract。",
	    "组件库参考是硬约束：必须参考 referenceHints 的 componentId、name、visibleText 和 styleSignals，把积木字段密度、状态标签、按钮层级和图表/列表表达转成 HTML 结构。",
	    "至少包含三种结构：首屏/指标/步骤或列表/风险提示中的三类；所有 a/button 必须显式样式化，不能保留浏览器默认按钮。",
	    "真实数据缺失时用 Sample、-- 或后台绑定说明，不得编造稳赚收益、监管承诺、真实下载链接或后台未提供的数据。",
	  ].join("\n");
  const user = [
    "管理员需求:",
    prompt,
    "",
    "页面意图:",
    compactJson({
      primaryIntent: intentProfile.primaryIntent,
      mustHave: intentProfile.mustHave,
      avoid: intentProfile.avoid,
      layoutPreset: intentProfile.layoutPreset,
      heroFocus: intentProfile.heroFocus,
    }),
    "",
    "repairedConfig 严格渲染契约:",
    compactJson(homepageRepairedConfigPromptContract(seedConfig)),
    "",
    "必须承接的模块契约:",
    compactJson(requiredModules.map((item) => ({
      module: item.component,
      label: item.label,
      fields: item.capability?.dataFields?.slice(0, 3) || [],
      actions: item.capability?.actions?.slice(0, 2) || [],
    }))),
    "",
	    "优先参考的积木提示:",
	    compactJson(referenceHints.map((item) => ({
	      componentId: item.componentId,
	      name: item.name,
	      family: item.family,
	      requiredFamily: item.requiredFamily,
	      module: item.module,
	      reason: item.reason,
	      visibleText: item.visibleText,
	      styleSignals: item.styleSignals,
	    }))),
    "",
    "design.md 设计治理摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 4) || [],
      forbidden: designGovernance.forbidden?.slice(0, 4) || [],
      usePolicy: designGovernance.usePolicy,
    }),
    "",
    qualityReport
      ? [
          "上一版质量门禁问题:",
          compactJson({
            score: qualityReport.score,
            status: qualityReport.status,
            issues: qualityReport.issues,
          }),
          "",
	        ].join("\n")
	      : "",
    previousScheme
      ? [
          "上一版摘要，避免重复:",
          compactJson({
            name: previousScheme.name,
            summary: previousScheme.summary,
            qualityIssues: previousScheme.qualityIssues,
          }),
          "",
        ].join("\n")
      : "",
    "返回示例形状:{\"html\":\"<section class=\\\"ai-html-page\\\"><header><strong>新客开户</strong><a data-home-action=\\\"openAccount\\\" href=\\\"#open\\\">立即开户</a></header><main><article data-ai-html-module=\\\"onboarding_guide\\\"><b>KYC</b><span>Sample</span></article></main></section>\",\"css\":\".ai-html-page{display:grid;gap:14px;background:var(--home-bg);color:var(--home-text)}.ai-html-page a{display:inline-grid;place-items:center;padding:0 14px;border:1px solid var(--home-primary);border-radius:var(--home-radius-sm);background:var(--home-primary);color:#fff}@media(max-width:860px){.ai-html-page{grid-template-columns:1fr}}\",\"qualityScore\":78,\"qualityStatus\":\"needs-polish\",\"correctionNotes\":[\"compact html\"]}",
    "现在只返回最终短 JSON object。",
  ].join("\n");

  return { system, user };
}

function providerUsesCompactAiHtml(config = {}) {
  return ["minimax", "deepseek", "kimi"].includes(config.provider);
}

function aiHtmlPromptForProvider(config, payload, configScheme = {}, options = {}) {
  if (config.provider === "minimax") return buildMiniMaxAiHtmlPrompt(payload, configScheme, options);
  if (providerUsesCompactAiHtml(config)) {
    return buildCompactAiHtmlPrompt(payload, configScheme, options);
  }
  return options.free ? buildFreeAiHtmlPrompt(payload) : buildAiHtmlPrompt(payload, configScheme, options);
}

function providerFailureSummary(error, fallback = "AI HTML 模型调用失败") {
  const message = cleanText(error?.message, fallback, 220);
  const finish = cleanText(error?.details?.finishReason, "", 80);
  const snippet = cleanText(error?.details?.rawTextSnippet, "", 180);
  return [message, finish ? `finish: ${finish}` : "", snippet ? `模型返回片段：${snippet}` : ""].filter(Boolean).join("；");
}

function saveComponent(component) {
  const library = readRawComponentLibrary();
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

  const library = readRawComponentLibrary();
  const exists = library.components.some((component) => component.id === id);
  if (!exists) {
    return { componentId: id, deleted: false, library: readComponentLibrary() };
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

  return { componentId: id, deleted: true, library: readComponentLibrary() };
}

function payloadComponentScore(component, payload = {}) {
  const scores = payload.componentScores && typeof payload.componentScores === "object" ? payload.componentScores : {};
  return normalizeComponentScore(scores[component.id] ?? component.score, 5);
}

function sortComponentsForAiUse(components, payload = {}) {
  const requestedOrder = new Map((Array.isArray(payload.componentIds) ? payload.componentIds : []).map((id, index) => [id, index]));
  return [...components]
    .map((component) => ({
      ...component,
      score: payloadComponentScore(component, payload),
    }))
    .sort((a, b) => {
      const scoreDelta = normalizeComponentScore(b.score, 5) - normalizeComponentScore(a.score, 5);
      if (scoreDelta) return scoreDelta;
      return (requestedOrder.get(a.id) ?? 9999) - (requestedOrder.get(b.id) ?? 9999);
    });
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
      size: normalizeComponentSize(item?.size, "2x1"),
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
      requiredUi: ["账号类型 Live/Demo", "账号号码", "交易环境值（如 MT5 · HCHoldings-Live2）", "余额", "净值", "信用金", "账户类型", "杠杆", "保证金比例"],
      forbidden: ["单个空卡片", "摘要卡片和完整表格上下重复", "账号类型与账户类型混用", "客户侧卡片露出“平台/服务器”字段名", "同一模块同时使用合并交易环境和拆分平台/服务器"],
    },
    OpenAccount: {
      purpose: "开真实账号、开模拟账号、绑定账号入口",
      requiredUi: ["开真实账户", "开模拟账户", "绑定账号", "KYC 状态"],
      forbidden: ["单一 Primary Action"],
    },
    OnboardingProgress: {
      purpose: "新客 KYC、开户、首次入金路径",
      requiredUi: ["KYC", "开真实账户", "首次入金", "进度状态", "业务语义图标", "下一步 CTA"],
      forbidden: ["没有步骤", "所有场景都固定使用同一种方格", "大面积无内容留白", "只换颜色不换结构"],
    },
    UserKycRail: {
      purpose: "用户身份、KYC、当地时间和钱包摘要",
      requiredUi: ["用户名/头像", "KYC 状态", "Local time", "Wallet Balance"],
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
    RiskDisclosure: {
      purpose: "风险披露、保证金和杠杆风险提示",
      requiredUi: ["风险提示标题", "杠杆/保证金/亏损风险", "合规披露文案", "后台合规配置占位"],
      forbidden: ["资产概览", "账户余额", "Deposit/Open Account 主操作", "收益承诺", "营销活动卡片"],
    },
    SupportContact: {
      purpose: "在线客服、客户经理、服务时间和帮助入口",
      requiredUi: ["在线客服标题", "服务时间或后台配置状态", "客户经理/工单/帮助中心其中至少两项", "联系客服主按钮", "帮助中心或提交工单次按钮"],
      forbidden: ["只显示模块名", "把管理员 prompt 原文显示给客户", "账户余额/钱包/KYC/Open Account 主操作", "编造真实联系方式或外部下载链接"],
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
  const size = componentSizePromptLabel(payload.size, "2x1");
  const referenceSize = normalizeComponentSize(payload.size, "");
  const familySpec = componentFamilySpec(family);
  const componentReference = componentLibraryPromptReference({ family, size: referenceSize, prompt, limit: 8 });
  const scoreReference = scoreContextPromptReference(payload.scoreContext);
  const aestheticReference = componentAestheticPromptReference({ family, size: referenceSize, prompt, limit: 6, sampleLimit: 2, feedbackLimit: 3 });
  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 首页积木组件设计器。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "组件用于金融/交易 CRM 用户端首页，必须克制、专业、信息清晰。",
    "必须遵守 design.md 设计治理：组件漂亮来自主焦点、字段层级、状态细节、按钮主次和响应式稳定，不来自大圆角、厚阴影、随机渐变或营销装饰。",
    "生成前必须先参考用户消息里的“组件库参考”“用户评分优先参考”和“漂亮积木审美参考”：理解已保存积木的业务字段、尺寸、按钮、标签、卡片密度、视觉层级和漂亮组件的结构手法，再围绕本次需求发挥。",
    "用户评分为 1-10 分；同类或同尺寸组件中优先参考高分积木，但不要逐字复制。",
    "漂亮不是装饰更多，而是主次更清楚、比例更成熟、字段更贴近业务、动作更有层级；不要用大面积空白、厚重阴影、营销渐变或英文装饰标签假装高级。",
    "允许创造新的结构和样式变体，但必须能追溯到现有父模块、真实业务字段、尺寸语言或组件库里的积木表达；不要凭空发明业务能力。",
    "不要逐字复制某个已保存组件，也不要只换标题或颜色；需要在布局、密度、层级或组合方式上形成新的有用变体。",
    "组件必须至少体现一种明确的组件工艺：指标带、状态条、步骤连接、趋势图容器、操作坞、表格/列表、左右分栏或紧凑信息流；不要只返回普通标题加几张白卡。",
    "返回 HTML 和 CSS 片段，但不要返回 script、外链、iframe、表单提交逻辑、图片 URL 或不安全属性。",
    "HTML 根元素必须使用 class，并且 CSS 必须只作用于该 class 范围，避免污染其他页面。",
    "圆角控制在 8px 或以下，避免营销式大圆角和装饰性渐变球。",
    "组件必须能作为积木参与首页布局，明确 size、layoutHints 和 dataRequirements。",
    `尺寸规则: ${COMPONENT_SIZE_GUIDE}`,
    "组件布局必须能自适应容器宽度，避免固定大空白、空占位或依赖不可控高度撑开。",
    "组件内部只保留一个可见主标题：如果使用 strong/h1-h4 做主标题，就不要再放 span/small/label 作为上方 eyebrow、分类名或第二标题；span/small 只用于数据行字段标签。",
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
    compactJson(componentReference),
    "",
    "用户评分优先参考:",
    compactJson(scoreReference),
    "",
    "漂亮积木审美参考:",
    compactJson(aestheticReference),
    "",
    "design.md 设计治理摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 6) || [],
      forbidden: designGovernance.forbidden?.slice(0, 6) || [],
      usePolicy: designGovernance.usePolicy,
    }),
    "",
    "需求:",
    prompt || "生成一个适合默认首页的专业金融组件。",
    "",
    "请返回字段: name, family, size, description, tags, html, css, layoutHints, dataRequirements。",
  ].join("\n");

  return { system, user };
}

function compactMiniMaxComponentReference(item = {}) {
  return {
    name: cleanText(item.name, "", 40),
    family: cleanText(item.family, "", 40),
    size: cleanText(item.size, "", 12),
    score: normalizeComponentScore(item.score, 5),
    description: cleanText(item.description, "", 90),
    visibleText: cleanText(item.visibleText, "", 120),
    styleSignals: Array.isArray(item.styleSignals) ? item.styleSignals.slice(0, 5) : [],
    layoutHints: Array.isArray(item.layoutHints) ? item.layoutHints.slice(0, 2) : [],
    dataRequirements: Array.isArray(item.dataRequirements) ? item.dataRequirements.slice(0, 4) : [],
  };
}

function compactMiniMaxComponentContext(payload, family, size, prompt) {
  const referenceSize = normalizeComponentSize(size, "");
  const componentReference = componentLibraryPromptReference({ family, size: referenceSize, prompt, limit: 3 });
  const scoreReference = scoreContextPromptReference(payload.scoreContext).slice(0, 3);
  const aestheticReference = componentAestheticPromptReference({ family, size: referenceSize, prompt, limit: 3, sampleLimit: 1, feedbackLimit: 2 });
  const designGovernance = designRulesPromptReference();

  return {
    componentLibrary: (componentReference.selectedComponents || []).slice(0, 3).map(compactMiniMaxComponentReference),
    scoreReference: scoreReference.map(compactMiniMaxComponentReference),
    beautifulBricks: (aestheticReference.selectedBeautifulBricks || []).slice(0, 3).map(compactMiniMaxComponentReference),
    designRules: (designGovernance.rules || []).slice(0, 3),
    forbidden: (designGovernance.forbidden || []).slice(0, 3),
  };
}

function buildMiniMaxComponentPrompt(payload, config = {}) {
  const prompt = cleanText(payload.prompt, "生成一个适合 ForexCRM 首页的专业金融组件。", 1100);
  const family = oneOfList(payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = componentSizePromptLabel(payload.size, "2x1");
  const familySpec = componentFamilySpec(family);
  const providerName = config.name || "MiniMax";

  const system = [
    "你是 ForexCRM 首页积木组件设计器。",
    "只输出一个严格 JSON object；第一个字符必须是 {，最后一个字符必须是 }。",
    "不要 markdown、代码块、解释、注释、<think> 或多余文本。",
    "这是 MiniMax 2048 completion token 短输出模式：必须输出短 JSON，避免截断。",
    "必须返回字段: name, family, size, description, tags, html, css, layoutHints, dataRequirements。",
    "html 和 css 必须是 JSON 字符串；请压缩为单行并正确转义双引号，禁止字符串内裸换行。",
    "html <= 1800 字符，css <= 2400 字符，description <= 80 字符，layoutHints/dataRequirements 各最多 4 项。",
    "HTML 根元素必须有稳定 class；CSS 只能写根 class 作用域；禁止 script、外链、iframe、图片 URL、表单提交和不安全属性。",
    "组件必须体现一种真实工艺：指标带、状态条、步骤连接、趋势图容器、操作坞、表格/列表、左右分栏或紧凑信息流。",
    "金融客户端要克制专业，圆角 8px 或以下，不要厚重阴影、随机渐变、通用占位或只换颜色。",
    `${providerName} 如果不确定，宁可少写字段内容，也必须保证 JSON.parse 可解析。`,
  ].join("\n");

  const user = [
    "目标:",
    compactJson({ family, size, familySpec }),
    "",
    "需求 brief:",
    prompt,
    "",
    "紧凑参考:",
    compactJson(compactMiniMaxComponentContext(payload, family, size, prompt)),
    "",
    "输出示例形状，不要照抄:",
    compactJson({
      name: "推广链接卡片",
      family,
      size: normalizeComponentSize(size, "2x1"),
      description: "展示推广链接、邀请码和复制动作的轻量组件。",
      tags: [family, normalizeComponentSize(size, "2x1")],
      html: '<section class="fx-referral-card"><strong>推广链接</strong><p>开户链接来自后台配置</p><button type="button">复制链接</button></section>',
      css: ".fx-referral-card{display:grid;gap:12px;padding:16px;border:1px solid var(--home-border);border-radius:8px;background:var(--home-card-bg);color:var(--home-text)}.fx-referral-card button{min-height:36px;border-radius:8px}",
      layoutHints: ["桌面紧凑填充", "移动端单列"],
      dataRequirements: ["inviteUrl", "inviteCode"],
    }),
    "",
    "现在只返回最终 JSON object。",
  ].join("\n");

  return { system, user, promptMode: "minimax-component-compact" };
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
  const componentReference = componentLibraryPromptReference({ family, size: component.size, prompt: instruction, limit: 6 });
  const aestheticReference = componentAestheticPromptReference({ family, size: component.size, prompt: instruction, limit: 5, sampleLimit: 2, feedbackLimit: 3 });
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
  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 首页积木组件编辑器。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "你的任务是对当前组件做局部编辑，并返回完整替换版组件定义。",
    "把 currentComponent 当成唯一基稿，不能从零重新设计，不能替换成无关模块。",
    "必须遵守 design.md 设计治理：编辑时优先提升信息层级、状态表达、间距和响应式，不用装饰堆叠掩盖结构问题。",
    "必须参考同 family 组件库积木和漂亮积木审美参考来优化层级，但最终必须仍是 currentComponent 的局部演进。",
    "优化重点是让组件更像成熟金融客户端：主焦点更明确、字段层级更顺、按钮权重更克制、形态不再是普通白卡堆叠。",
    rootClass ? `HTML 根 class 必须继续使用 ${rootClass}，CSS 也必须继续限定在 .${rootClass} 下。` : "HTML 根元素必须继续使用一个稳定 class，CSS 必须限定在该 class 下。",
    "默认保留当前 family 和 size；只有用户明确要求改变尺寸或归属时才调整。",
    `如需调整尺寸，遵守尺寸规则: ${COMPONENT_SIZE_GUIDE}`,
    "默认保留当前组件里没有被用户点名修改的字段、按钮、业务信息和视觉层级。",
    "如果用户说“名字/名称/标题改成 X”，必须同时更新 name 和组件里最主要的可见标题为 X。",
    "组件内部只保留一个可见主标题；如果已有 strong/h1-h4 标题，移除上方 span/small/label 类 eyebrow 或分类小标题，数据行字段标签除外。",
    "如果用户说步骤不像渐进式、流程感不够、进度不明显，必须把步骤改成带编号、状态和连接关系的 progress/timeline 结构。",
    "如果用户说更美观、更大气、更精致或重做样式，必须至少改变一种真实结构：指标带、状态条、步骤连接、趋势图容器、操作坞、表格/列表、左右分栏或紧凑信息流；不能只换颜色、阴影或圆角。",
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
    compactJson(componentReference),
    "",
    "漂亮积木审美参考:",
    compactJson(aestheticReference),
    "",
    "design.md 设计治理摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 5) || [],
      forbidden: designGovernance.forbidden?.slice(0, 5) || [],
    }),
    "",
    "对话记录:",
    compactJson(normalizeEditMessages(payload.messages), []),
    "",
    "最新修改要求:",
    instruction,
  ].join("\n");

  return { system, user };
}

function buildMiniMaxComponentEditPrompt(payload, component, config = {}) {
  const instruction = cleanText(payload.instruction || payload.prompt, "优化当前组件。", 900);
  const family = oneOfList(component.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = normalizeComponentSize(component.size || payload.size, "2x1");
  const familySpec = componentFamilySpec(family);
  const rootClass = firstHtmlClass(component.html);
  const providerName = config.name || "MiniMax";
  const currentComponent = {
    id: component.id,
    name: cleanText(component.name, "", 48),
    family,
    size,
    description: cleanText(component.description, "", 120),
    rootClass,
    visibleText: cleanText(stripHtmlTags(component.html), "", 220),
    html: sanitizeGeneratedHtml(component.html).slice(0, 1800),
    css: sanitizeGeneratedCss(component.css).slice(0, 2200),
    layoutHints: Array.isArray(component.layoutHints) ? component.layoutHints.slice(0, 4) : [],
    dataRequirements: Array.isArray(component.dataRequirements) ? component.dataRequirements.slice(0, 4) : [],
  };

  const system = [
    "你是 ForexCRM 首页积木组件编辑器。",
    "只输出一个严格 JSON object；第一个字符必须是 {，最后一个字符必须是 }。",
    "不要 markdown、代码块、解释、注释、<think> 或多余文本。",
    "这是 MiniMax 2048 completion token 短输出模式：返回完整替换版组件，但 html/css 要短。",
    "必须返回字段: name, family, size, description, tags, html, css, layoutHints, dataRequirements, changeSummary。",
    "html 和 css 必须是 JSON 字符串；请压缩为单行并正确转义双引号，禁止字符串内裸换行。",
    rootClass ? `HTML 根 class 必须继续使用 ${rootClass}，CSS 也必须限定在 .${rootClass} 下。` : "HTML 根元素必须使用一个稳定 class，CSS 必须限定在该 class 下。",
    "保留当前业务能力，只调整用户点名的视觉层级、排版、密度或结构。",
    "禁止 script、外链、iframe、图片 URL、表单提交和不安全属性。",
    `${providerName} 如果不确定，宁可少写视觉细节，也必须保证 JSON.parse 可解析。`,
  ].join("\n");

  const user = [
    "当前组件:",
    compactJson(currentComponent),
    "",
    "业务约束:",
    compactJson({ familySpec }),
    "",
    "紧凑参考:",
    compactJson(compactMiniMaxComponentContext(payload, family, size, instruction)),
    "",
    "最新修改要求:",
    instruction,
    "",
    "现在只返回最终 JSON object。",
  ].join("\n");

  return { system, user, promptMode: "minimax-component-edit-compact" };
}

function buildCompositionPrompt(payload) {
  const components = Array.isArray(payload.components) ? payload.components : [];
  const prompt = String(payload.prompt || "").trim();
  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 首页积木编排师。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "你的任务是从已保存的组件中选择积木，生成首页组合建议，并给出美化布局的指令。",
    "必须参考可用组件的真实内容：包括 visibleText、dataRequirements、layoutHints 和 styleSignals，再发挥组合意图；不能只看组件名字拼接。",
    "可用组件里的 score 是用户 1-10 分评分；高分组件要优先进入首屏或作为同类组件的主要参考。",
    "不要创建不存在的 componentId。",
    "必须保证 asset_overview、quick_actions、trading_account_highlight、trading_accounts_list 或 onboarding_guide 至少有一条清晰路径。",
    "必须遵守 design.md 设计治理：组合美化只能通过骨架、比例、密度、状态和模块顺序完成，不靠随机装饰。",
    "组合必须按 auto layout 思路填满可用区域，避免孤立小积木单独占整行、空白区块或东缺一块西缺一块的拼版。",
    `组合尺寸规则: ${COMPONENT_SIZE_GUIDE}`,
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
        score: normalizeComponentScore(item.score, 5),
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
    "design.md 设计治理摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 6) || [],
      forbidden: designGovernance.forbidden?.slice(0, 6) || [],
      usePolicy: designGovernance.usePolicy,
    }),
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
      "welcome_header 可选，只用于轻量欢迎语、用户名/昵称或一句提示；如果出现，必须是页面最顶部的轻量整行，不能放在页面下方，也不展示重复的个性化入口。",
      "asset_overview 可选但优先放在上半部分，标题文案统一使用“资产概览”；只允许展示 total、wallet、tradingAccount 这 1-3 个资产字段；total=wallet+tradingAccount，如果同时展示 total 和 tradingAccount，必须补齐 wallet；wallet 是多币种折算后的总钱包余额，不得在资产概览里展开单个钱包、icon 钱包卡、可用资金、保证金、风险等级或资金构成条。",
      "wallet_list 仅在明确需要多币种钱包、钱包列表或钱包卡片时展示；它负责 USD/EUR/USDT 等币种明细卡片，不能把这些卡片塞回 asset_overview。",
      "quick_actions 的入口内容必须来自后台配置或接口返回；AI 只决定展示数量、布局、样式和占位，不得写死入金、出金、开户等入口一定存在。",
      "quick_actions 中每一个入口都必须是独立按钮、卡片、磁贴或有背景色的模块；禁止只裸排图标和文字。可按意图选择 matrix、tile-board、accent-cards、toolbar、command-bar、compact-menu、segmented-panel 或 task-rail。",
      "onboarding_guide 可选，仅适合未开户、未入金、未开始交易等新用户阶段；它承接 KYC 状态、创建真实账户和首次入金这三步，KYC 状态只允许未提交/待审/通过/拒绝；AI 可以大胆把标题和样式包装成“账户开通进度”“3步成为交易大师”等新客转化旅程，不要固定写成“新手引导路径”；可按意图选择 mission-board、next-step-hero、ribbon-rail、guide-cards、journey-timeline、checklist 或 compact，图标必须贴合身份认证、开账户、入金业务，已完成主要流程时不展示或弱化。",
      "trading_account_highlight 可选，用于突出一个交易账号，可展示收益率、浮动盈亏和盈亏折线图；账号信息必须扁平分组，不要小卡片套小卡片；右侧图表区域下半部分要用日期轴、关键指标或走势摘要自然填满，不能出现大面积空白；所有账号和图表数据必须来自接口。",
      "trading_accounts_list 用于多个交易账号，可按字段数量和账号数量选择表格、列表、卡片、卡片墙或工作台切换视图；不要默认套用同一种白色卡片，也不要给标题工具栏额外加蓝色背景条块。",
      "promo_banner 代表首页 Banner / 广告轮播；当管理员选择首屏 Banner 或首页 Banner 时，按可多张轮播图处理，必须具备分页/下一张/自动切换的交互契约，正式内容来自后台活动或广告配置。",
      "pamm_products 仅在租户开启 PAMM 功能且接口返回产品时展示；不得虚构产品、收益率、回撤、规模、人数、风险或走势图。",
      "copytrading_signals 仅在租户开启 CopyTrading 功能且接口返回信号源时展示；不得虚构信号源、交易员、收益率、跟随人数、风险、胜率或走势图。",
      "连续时间数据必须按趋势表达：近 N 天收益、7/30/90 日收益、净值、PnL、回撤变化或收益率曲线必须使用折线图或面积折线图，不得使用柱状图、胶囊柱或装饰性条形图。",
      "copytrading_signals 的 curveCards 必须把信号源、收益率、总收益、最大回撤、收益折线/面积曲线和 AI 推荐理由按信息层级展示；不能用大面积渐变横幅或厚重 CTA 抢走图表空间。",
      "收益率、总收益、最大回撤、风险等级等指标不必逐项套边框卡片；已有图表或推荐卡承载时，优先使用简洁指标行、分隔线或低干扰内联分组。",
      "每个模块默认只保留一个主标题；模块类型标签只有在能补充语义时才展示，不要形成 eyebrow + title 的重复双标题。",
      "referral_link_card 可选，仅在用户身份为代理、IB、合作伙伴或租户开启推广链接功能时展示；用户端标题使用“推广链接”，只用于推广链接、邀请码、复制/分享和基础统计，样式必须参考 ReferralLinkCard 积木字段再做链接优先、邀请码优先或统计辅助的引申，不得扩展成完整代理中心。",
      "referral_link_card 不得展示返佣、团队入金、下级客户列表、层级关系或复杂 IB 数据；推广链接、邀请码和统计必须来自后台配置或接口。",
      "announcements 可选，展示系统公告、活动公告、维护通知、资金通知或平台消息；可按意图选择列表、重点公告、紧凑信息流或首页第一栏跑马灯，但不能抢资产、交易账户和快捷操作优先级。",
      "market_news 可选，适合下半部分展示市场新闻、平台资讯、新手教程、交易教育或热门文章；不能优先于核心模块。",
      "risk_disclosure 可选，用于后台配置的风险披露、保证金提示和合规说明；必须作为页面底部 legal-strip 长文/富文本区域，不得作为普通侧栏指标卡，不得暗示稳赚或编造监管/风险状态；Demo 预览缺少后台数据时，可以生成参考风险提示文案占位。",
      "faq_section 可选，用于后台配置的开户、入金、下载、交易规则等常见问题；默认使用 accordion 折叠问答，不得编造政策细节。",
      "support_contact 可选，用于后台配置的在线客服、客户经理或服务时间入口；默认是轻量 1x1/compactBar 模块，只保留服务时间、客户经理/状态和联系按钮，不得占据大篇幅，不得编造在线状态或联系方式。",
      "app_download 可选，用于后台配置的 APP、MT5 或移动端下载入口；不得编造下载链接、二维码或商店地址。",
      "reward_tasks、kyc_risk_notice、ib_dashboard 默认禁用；旧的 referralLink、userKycRail 不输出；旧 riskNotice/support_help 兼容映射到 risk_disclosure/support_contact。",
      "PAMM 和 CopyTrading 必须作为 pamm_products、copytrading_signals 两个独立模块处理。",
    ],
    bricks: [
      { id: "welcomeHeader.light", feature: "welcome_header", component: "welcome_header", family: "WelcomeHeader", size: "3x1", zone: "hero" },
      { id: "assetOverview.flexible", feature: "asset_overview", component: "asset_overview", family: "AssetOverview", size: "2x1", zone: "hero" },
      { id: "walletList.tiles", feature: "wallet_list", component: "wallet_list", family: "WalletList", size: "3x2", zone: "full" },
      { id: "quickActions.configDriven", feature: "quick_actions", component: "quick_actions", family: "QuickActions", size: "2x1", zone: "main" },
      { id: "quickActions.tileBoard", feature: "quick_actions", component: "quick_actions", family: "QuickActions", size: "2x1", zone: "main" },
      { id: "quickActions.accentCards", feature: "quick_actions", component: "quick_actions", family: "QuickActions", size: "2x1", zone: "main" },
      { id: "quickActions.compactMenu", feature: "quick_actions", component: "quick_actions", family: "QuickActions", size: "2x1", zone: "main" },
      { id: "quickActions.segmentedPanel", feature: "quick_actions", component: "quick_actions", family: "QuickActions", size: "2x1", zone: "main" },
      { id: "onboardingGuide.flexible", feature: "onboarding_guide", component: "onboarding_guide", family: "OnboardingGuide", size: "2x1", zone: "main" },
      { id: "tradingAccount.highlight", feature: "trading_account_highlight", component: "trading_account_highlight", family: "TradingAccountHighlight", size: "3x2", zone: "full" },
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

function guidedAssetVisibleFields(source) {
  const assets = source?.moduleSettings?.assets && typeof source.moduleSettings.assets === "object" ? source.moduleSettings.assets : {};
  const fields = Array.isArray(assets.visibleFields) ? assets.visibleFields : Array.isArray(source?.assetFields) ? source.assetFields : [];
  return normalizeAssetVisibleFields(fields);
}

function normalizeAssetVisibleFields(fields, fallback = []) {
  const source = Array.isArray(fields) ? fields : fallback;
  const requested = source
    .map((field) => cleanText(field, "", 32))
    .filter((field, index, list) => ["total", "wallet", "tradingAccount"].includes(field) && list.indexOf(field) === index)
    .slice(0, 3);
  if (requested.includes("total") && requested.includes("tradingAccount") && !requested.includes("wallet")) {
    requested.push("wallet");
  }
  return ["total", "wallet", "tradingAccount"].filter((field) => requested.includes(field));
}

function guidedAiIntakeFromPayload(payload) {
  const source = payload?.context?.guidedIntake || payload?.guidedIntake;
  if (!source || typeof source !== "object") return null;

  const canonical = source.canonical && typeof source.canonical === "object" ? source.canonical : {};
  const canonicalIntent = cleanText(canonical.primaryIntent || source.intent?.canonicalIntent, "", 40);
  const sourceAssets = source.moduleSettings?.assets && typeof source.moduleSettings.assets === "object" ? source.moduleSettings.assets : {};
  const themeChoice = compactGuidedChoice(source.theme) || null;
  const themeCustomInput = cleanText(source.theme?.customInput || source.themeCustom || "", "", 120);
  const visibleFields = guidedAssetVisibleFields(source);
  const mustHave = Array.isArray(canonical.mustHave)
    ? canonical.mustHave.filter((item) => CANONICAL_HOME_BLOCKS.includes(item)).slice(0, 12)
    : [];

  return {
    source: cleanText(source.source, "guided-builder", 48),
    intent: compactGuidedChoice(source.intent),
    audience: Array.isArray(source.audience) ? source.audience.map(compactGuidedChoice).filter(Boolean).slice(0, 8) : [],
    level: compactGuidedChoice(source.level),
    designStyle: compactGuidedChoice(source.designStyle),
    modules: Array.isArray(source.modules) ? source.modules.map(compactGuidedChoice).filter(Boolean).slice(0, 16) : [],
    theme: themeChoice ? { ...themeChoice, customInput: themeCustomInput } : null,
    tone: compactGuidedChoice(source.tone),
    cta: compactGuidedChoice(source.cta),
    moduleSettings: {
      assets: {
        enabled: Boolean(sourceAssets.enabled),
        visibleFields,
      },
    },
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

function guidedExplicitBlockSet(guidedIntake) {
  const blocks = new Set();
  if (!guidedIntake) return blocks;

  (Array.isArray(guidedIntake.modules) ? guidedIntake.modules : []).forEach((module) => {
    (Array.isArray(module?.canonicalTargets) ? module.canonicalTargets : []).forEach((target) => {
      const block = canonicalHomeBlock(target);
      if (block) blocks.add(block);
    });
  });

  (Array.isArray(guidedIntake.canonical?.mustHave) ? guidedIntake.canonical.mustHave : []).forEach((target) => {
    const block = canonicalHomeBlock(target);
    if (block && !GUIDED_EXPLICIT_ONLY_BLOCKS.has(block)) blocks.add(block);
  });

  return blocks;
}

function guidedPromptExplicitlyRequestsBlock(block, text) {
  const source = String(text || "");
  if (block === "promo_banner" && /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:banner|活动|奖励|赠金|权益|倒计时|promo)/i.test(source)) return false;
  if (block === "pamm_products" && /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:pamm|资管产品|资金管理产品)/i.test(source)) return false;
  if (block === "copytrading_signals" && /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:copy\s*trading|copytrading|跟单|信号源|交易员推荐)/i.test(source)) return false;
  if (block === "referral_link_card" && /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:推广链接|邀请链接|开户链接|注册链接|邀请码|代理|ib|partner|affiliate)/i.test(source)) return false;
  if (block === "announcements" && /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:公告|通知|维护|平台消息)/.test(source)) return false;
  if (block === "market_news" && /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:市场资讯|市场新闻|平台资讯|新手教程|交易教育|热门文章)/.test(source)) return false;
  if (block === "risk_disclosure" && /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:风险提示|风险披露|合规|保证金|杠杆|预警)/i.test(source)) return false;
  if (block === "faq_section" && /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:faq|常见问题|问题解答|帮助中心)/i.test(source)) return false;
  if (block === "support_contact" && /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:在线客服|客服|客户经理|咨询|服务入口|在线状态)/i.test(source)) return false;
  if (block === "app_download" && /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:app|下载|移动端|手机端|mt5)/i.test(source)) return false;
  if (block === "promo_banner") return /首屏\s*banner|banner|活动|奖励|入金奖励|赠金|权益|倒计时|promo/i.test(source);
  if (block === "pamm_products") return /pamm|资管产品|资金管理产品/i.test(source);
  if (block === "copytrading_signals") return /copy\s*trading|copytrading|跟单|信号源|交易员推荐/i.test(source);
  if (block === "referral_link_card") return /推广链接|邀请链接|开户链接|注册链接|邀请码|代理|ib|partner|affiliate/i.test(source);
  if (block === "announcements") return /公告|通知|维护|平台消息/.test(source);
  if (block === "market_news") return /市场资讯|市场新闻|平台资讯|新手教程|交易教育|热门文章/.test(source);
  if (block === "risk_disclosure") return /风险提示|风险披露|合规声明|合规说明|保证金|杠杆|爆仓|预警/.test(source);
  if (block === "faq_section") return /faq|常见问题|问题解答|帮助中心/i.test(source);
  if (block === "support_contact") return /在线客服|联系客服|客服|客户经理|一对一协助|咨询入口|服务入口/.test(source);
  if (block === "app_download") return /app下载|app 下载|下载 app|下载APP|移动端|手机端|mt5 下载|下载 mt5|download app/i.test(source);
  return false;
}

function guidedAllowsHomepageBlock(block, guidedIntake, text) {
  const canonical = canonicalHomeBlock(block);
  if (!canonical) return false;
  if (!guidedIntake || !GUIDED_EXPLICIT_ONLY_BLOCKS.has(canonical)) return true;
  const explicitBlocks = guidedExplicitBlockSet(guidedIntake);
  return explicitBlocks.has(canonical);
}

function guidedIntakePromptLines(guidedIntake) {
  if (!guidedIntake) return [];
  const assetFields = guidedIntake.moduleSettings?.assets?.visibleFields || [];
  const selectedModuleIds = new Set((Array.isArray(guidedIntake.modules) ? guidedIntake.modules : []).map((module) => module?.id).filter(Boolean));
  const themePreset = oneOfList(guidedIntake.theme?.themePreset || guidedIntake.theme?.id, HOMEPAGE_THEME_PRESETS, "");
  const assetLine = assetFields.length
    ? `账户概览字段硬约束: asset_overview 必须可见，标题用“资产概览”，moduleSettings.assets.visibleFields=${assetFields.join(",")}，只允许 total、wallet、tradingAccount 中的 1-3 项；如包含 total 和 tradingAccount，必须同时包含 wallet。`
    : "";
  const themeLine = [
    themePreset ? `主题硬约束: themePreset=${themePreset}，优先级高于自然语言中的“简约、留白、克制、浅色”等风格词。` : "",
    guidedIntake.theme?.customInput
      ? `自定义视觉输入: ${guidedIntake.theme.customInput}；如果包含色值，把它作为主题主色参考，否则作为品牌风格文案参考。`
      : "",
  ].filter(Boolean).join(" ");
  const designLine = guidedIntake.designStyle?.instruction
    ? `设计风格硬约束: ${guidedIntake.designStyle.label || guidedIntake.designStyle.id}；${guidedIntake.designStyle.instruction}`
    : "";
  const bannerLine = selectedModuleIds.has("heroBanner")
    ? "首页 Banner 硬约束: 该选项按广告轮播图理解，使用 promo_banner 承接，生成多张 slide 的信息结构，并明确具备自动切换、分页和下一张交互；不要返回旧 adCarousel 模块 ID。"
    : "";
  const riskLine = selectedModuleIds.has("riskDisclosure")
    ? "风险提示硬约束: risk_disclosure 正式内容来自合规后台；如果当前无数据，Demo 预览必须生成参考风险提示文案用于界面展示，并标注为参考，不得暗示稳赚。"
    : "";
  return [
    "引导式结构化选择:",
    compactJson(guidedIntake),
    "",
    "引导式硬约束:",
    `这是管理员通过引导式表单选择的结构化输入，优先级高于自然语言拼接文案。`,
    `canonical.primaryIntent=${guidedIntake.canonical.primaryIntent || "未指定"}、layoutPreset=${guidedIntake.canonical.layoutPreset || "未指定"}、heroFocus=${guidedIntake.canonical.heroFocus || "未指定"}。`,
    `canonical.mustHave=${guidedIntake.canonical.mustHave.join(",") || "未指定"} 必须可见或由同类首页积木明确承接。`,
    assetLine,
    designLine,
    themeLine,
    bannerLine,
    riskLine,
    "modules[].canonicalTargets 是每个表单模块映射后的首页积木；客服、FAQ、风险提示、APP 下载如被选择，必须分别用 support_contact、faq_section、risk_disclosure、app_download 可见承接。",
    "modules[].canonicalTargets 没有选择的可选模块不得为了补齐常见页面而自行出现，尤其是 support_contact、faq_section、app_download 和 risk_disclosure。",
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
    level: cleanText(guidedIntake.level?.id || guidedIntake.level?.label, "", 40),
    modules: guidedIntake.modules.map((module) => cleanText(module.label || module.id, "", 60)).filter(Boolean).slice(0, 12),
    mustHave: guidedIntake.canonical.mustHave.slice(0, 12),
    explicitBlocks: [...guidedExplicitBlockSet(guidedIntake)].slice(0, 12),
  };
}

function buildMiniMaxPrompt(payload) {
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const humanUnderstanding = extractHomepageUnderstanding(prompt);
  const designGovernance = designRulesPromptReference();
  const system = [
    "你是 ForexCRM 首页蓝图生成器。",
    "只输出一个能被 JSON.parse 解析的紧凑 JSON object。",
    "不要 markdown、不要代码块、不要解释、不要 <think>、不要注释。",
    "输出必须短，禁止返回 layout、props、schema、默认配置、HTML、CSS、JS。",
    "必须返回 generationMode=\"brick-v2\"、blueprintVersion=5、brickPlan 和 brickTrace。",
    "必须遵守 design.md 设计治理：漂亮必须落在金融 CRM 规范内，用信息层级、模块比例、状态和响应式提升，不用营销式大 hero 或装饰堆叠。",
    "必须使用白名单枚举值；未知需求用最接近的白名单值承接。",
    `当前首页内容块白名单只允许: ${CANONICAL_HOME_BLOCKS.join(", ")}。`,
    "禁止输出 reward_tasks、kyc_risk_notice、ib_dashboard，也不要输出旧模块 referralLink、userKycRail、fundActions、walletList、openAccountActions、createAccountForm；旧 riskNotice/support_help 必须改用 risk_disclosure/support_contact。",
    "快捷操作区 quick_actions 的入口内容由后台配置或接口返回，AI 不得写死具体入口；moduleSettings.quickActions.actions 默认返回空数组，除非上下文提供了后台入口配置。",
    "quick_actions 的每个入口都必须有独立视觉容器，例如卡片、边框按钮、磁贴或背景色模块；不要输出裸排图标+文字。根据意图选风格：交易工作台用 command-bar/segmented-panel，活动增长用 accent-cards/tile-board，新客旅程用 task-rail/accent-cards，资产/品牌用 tile-board/segmented-panel，移动端用 compact-menu。",
    "onboarding_guide / OnboardingProgress 不要只复用同一种三格时间线；新客旅程优先从 mission-board、next-step-hero、ribbon-rail、guide-cards、journey-timeline、checklist、compact 中按提示选择，且图标要分别对应身份认证、开真实账户、首次入金。",
    "资产概览 asset_overview 标题统一用“资产概览”，只做汇总，通过 moduleSettings.assets.visibleFields 控制 total、wallet、tradingAccount 中任意 1-3 个字段；total=wallet+tradingAccount，如果出现 total+tradingAccount 必须同时出现 wallet；钱包字段必须是多币种折算后的总钱包余额。",
    "各币种钱包卡片只能由 wallet_list 展示，asset_overview 不得展开 USD/EUR/USDT 等单个钱包、icon 钱包卡、可用资金、保证金或风险等级。",
    "PAMM 和 CopyTrading 必须分别使用 pamm_products 与 copytrading_signals，不能合并成一个投资推荐模块。",
    "连续时间数据必须按趋势表达：近 N 天收益、7/30/90 日收益、净值、PnL、回撤变化或收益率曲线必须使用折线图或面积折线图，不得使用柱状图、胶囊柱或装饰性条形图。",
    "视觉模式必须返回 colorMode=\"auto\"，除非管理员只要求白天或只要求暗夜；minimalWhite、blueFinance、lightGold 的白天模式不得使用大面积黑色/终端色块，暗色只在 darkTech 或 colorMode=dark 时出现。",
	    "数据策略必须分层：预览可用 sample data 填充效果，但交易成本、PnL、保证金、图表等真实数据必须在 dataContract 中标记 previewSample=true、dataBindingRequired=true、fallback=\"--\" 或 placeholder，正式运行来自后台或接口。",
	    "不要把“交易成本/PnL/保证金/图表数据必须来自接口”理解成交易成本看板；只有管理员明确说首屏突出交易成本、成本效率、点差佣金看板或成本工作台时，才使用成本看板。",
	    "专业交易客户首页的首屏优先级是交易账号状态 > 账户表现图表 > 持仓入口 > MT5 操作入口；真实账号和模拟账号在一起且要求卡片时，必须使用 combined card 账号区展示 Live / Demo。",
	    "交易账号内部数据契约固定为 9 项：账号类型(Demo/Live)、platform、server、账号、余额、净值、信用金、账户类型、杠杆、保证金比例；客户侧展示时 platform+server 合并为交易环境值，优先直接显示 MT5 · HCHoldings-Live2，卡片里不要露出“平台/服务器”字段名；不得自行补充 PnL、用途、持仓、保证金占用、风险状态或操作按钮作为账号字段。",
	    "交易账号模块必须先确定一种主展示形态：card、list 或 table 三选一；同一组账号数据不得在同一个模块里同时渲染上方摘要卡/摘要行和下方列表/表格。switchable 只允许作为交互状态，默认也只能显示一个视图。",
	    "交易账号字段命名必须区分账号类型(accountKind=Live/Demo)和账户类型(accountType=ECN Standard/Demo ECN)；platform/server 可作为接口字段拆分，但展示层优先合并为一个交易环境值，表格列名用“交易环境”。",
	    "copytrading_signals 的 curveCards 必须把信号源、收益率、总收益、最大回撤、收益折线/面积曲线和 AI 推荐理由按信息层级展示；不能用大面积渐变横幅或厚重 CTA 抢走图表空间。",
    "收益率、总收益、最大回撤、风险等级等指标不要默认逐项套边框卡片；已有图表或推荐卡承载时，用简洁指标行、分隔线或低干扰内联分组。",
    "不要输出无业务增益的英文 eyebrow，例如 AI Copytrading Match；标题能说明模块时直接展示标题。",
    "referral_link_card 只能在代理/IB/合作伙伴用户或租户开启推广链接功能时展示；用户端标题写“推广链接”，它只是轻量推广链接模块，不是 ib_dashboard。",
    "referral_link_card 可以展示推广链接、邀请码、复制按钮、分享按钮和基础统计；样式应参考 ReferralLinkCard 积木字段、按钮和密度后再引申，不得生成返佣、团队业绩、下级客户或层级关系。",
    "announcements 可以是栏目列表、重点公告、紧凑信息流，也可以在管理员明确要求跑马灯/滚动公告/首页第一栏时使用 ticker-strip；公告标题、时间、内容均来自接口或后台配置。",
    "risk_disclosure、faq_section、support_contact、app_download 是正式可见模块；当管理员在引导中选择风险提示、FAQ、在线客服或 APP 下载时必须用这些模块承接。",
    "support_contact 必须轻量化，不得占据大篇幅；只展示服务时间、客户经理/状态和一个联系按钮，不得编造在线状态或联系方式；app_download 不得编造下载链接或二维码；faq_section 内容应来自后台配置；risk_disclosure 正式内容应来自合规接口，Demo 缺数据时可生成清晰标注的参考风险提示文案。",
    "首页必须按响应式 auto layout 思路编排：首屏、主内容、侧栏和整行模块要自然填满栅格，移动端能降级单列。",
    "必须返回 autoLayout：说明 desktop/tablet/mobile 三档行策略、折叠断点、同行等高和模块内部自适应；它是生成契约，不是给客户看的配置。",
    "autoLayout.tablet.collapseAt 默认 1040，mobile.collapseAt 默认 720；内容区低于 tablet 断点时，两栏模块自动变一栏一个模块。",
    "autoLayout.moduleRules 必须覆盖 promo_banner、onboarding_guide、quick_actions、trading_account_highlight：入金阶梯可从左右布局改上下布局，三步引导可横排改竖排，快捷入口可 4/3 列改 2/1 列，账号表现图表桌面占整横栏并在手机上下堆叠。",
    "禁止空 section、空 slots、禁用模块占位、孤立小积木独占大行，不能出现东缺一块西缺一块的空白区块。",
    "空间利用是硬约束：状态、步骤、快捷入口等轻量模块必须压缩高度并把信息靠近图标/编号，禁止内容贴底、编号漂浮或用无内容卡片制造高级感。",
    "桌面端允许一行两个积木；同行两个积木必须配满 12 栅格并等高，禁止 8/12 内容右侧留空。",
    `必须遵守尺寸语法：${COMPONENT_SIZE_GUIDE} 稳定组合优先使用 3x/4x/5x 及以上独占、2x+1x、2x+2x。`,
    "交易账号列表、账号表现图表、钱包列表属于大模块，必须单独一个 full section/整横栏；不要把 trading_accounts_list 和 trading_account_highlight 放在同一个 section 或同一行左右分栏。",
    "账号、钱包列表、表格、8 个快捷入口、首屏轮播属于高风险模块，必须按 layoutGrammar.moduleSizing 选择 size 和 zone。",
    "如果布局美观度和模块数量冲突，优先保证行配方完整、同高、少空白，再减少辅助模块。",
    "必须先遵守服务端提供的 pageIntent。",
    "如果请求包含引导式结构化选择 guidedIntake，它是管理员显式选择，优先级高于拼接后的自然语言 prompt。",
    "guidedIntake 中的 canonical.primaryIntent、heroFocus、layoutPreset、mustHave 是硬约束；modules[].canonicalTargets 是可用首页积木承接方式。",
    "引导式生成时，modules[].canonicalTargets 未选择的可选模块不得出现；不要自动补客服、FAQ、APP 下载、风险提示、公告、资讯、PAMM、CopyTrading 或推广链接。",
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
    "生成页面审美时必须参考 aestheticTraining：samplePages 决定页面级构图和功能流，beautifulComponents 决定漂亮积木块细节，feedbackMemory 决定用户长期偏好；不要输出平均白卡表单页。",
    "componentLibraryReference 只能作为形态和灵感参考，不能授权新增 allowedBlocks 以外的业务模块，也不能把组件 HTML/CSS 直接塞进首页配置。",
    "组件形态不能都用普通卡片；componentMorphs 是渲染契约，不是展示说明。",
    "核心可见模块必须选择 componentMorphs：AssetOverview、WalletList、QuickActions、TradingAccounts、OnboardingProgress、AccountPerformance、PromotionBanner、ReferralLinkCard、RiskDisclosure 只要出现在 sections/brickPlan/layout 中，就必须从 componentMorphPool 对应 10 种 DOM morph 池里选择 morph/morphId。",
    "同一屏里的核心可见模块要尽量选择不同 morph，不得只换标题、颜色、顺序、moduleStyles 或 variant；morph 必须意味着真实 DOM 骨架差异，例如表格型、横向状态条、指标三联、左右分栏、时间线、操作坞、紧凑列表、终端面板、卡片墙、风险/信任证明结构。",
    "当管理员提到个性化、意图、更多方案、样式风格时，personalizationStrength 必须为 strong，并让 pageIntent 同时影响 layoutPreset、sections 顺序、QuickActions 风格和核心可见模块 morph，不要只换颜色。",
    "生成前必须在内部完成需求理解：区分硬性要求、设计意图、禁止项；硬性要求优先于风格偏好。",
    "数字要求必须按自然语言真实含义执行：用户说快捷入口放置 5 个、只有 5 个或保留 5 个时，quickActions.count 必须等于 5；只有出现至少/不少于时才允许超过。",
    "用户说真实账号和模拟账号一起、同一列表、统一列表时，tradingAccounts.grouping 必须是 combined；筛选只用胶囊按钮时，不得拆成两个独立账号区块。",
    "用户说不要只换颜色、不沿用上一版、耳目一新时，必须改变 sections 顺序、layoutPreset、moduleStyles，并让所有核心可见模块重新选择 DOM morph。",
    "成熟券商客户端不是营销落地页：首屏要让资金安全、余额、开户或主操作清晰可信，信息密度要克制但不能空。",
    "白标、资金安全、成熟券商、可信首页默认按 brand 资金可信工作台处理，不要按 magazineCampaign 的大广告封面处理，除非管理员明确要求广告轮播首屏。",
    "brickPlan、brickTrace、brickName、brickReason 只供系统调试，不是用户端页面可见内容。",
  ].join("\n");

  const contract = {
    pageIntent: intentProfile,
    humanUnderstanding,
    brickReference: canonicalHomepageReference(),
    componentMorphPool: CORE_COMPONENT_MORPH_POOL,
    componentLibraryReference: componentLibraryPromptReference({ prompt, limit: 12 }),
    aestheticTraining: aestheticTrainingContext({ prompt }, { sampleLimit: 4, componentLimit: 10, feedbackLimit: 6 }),
    savedCompositionReference: savedCompositionPromptReference(6),
    designGovernance,
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
      "colorMode",
      "personalizationStrength",
      "density",
      "heroFocus",
      "brickPlan",
      "brickTrace",
      "sections",
      "autoLayout",
      "modules",
      "moduleStyles",
      "componentMorphs",
      "moduleSettings",
      "dataContract",
      "emphasis",
      "aiSummary",
    ],
    enums: {
      layoutPreset: ["standardDashboard", "conversionFirst", "assetFirst", "tradingPro", "vipService", "magazineCampaign", "tradingCommand", "onboardingJourney", "privateWealthDesk", "accountOpsConsole"],
      themePreset: ["default", "blackGold", "lightGold", "blueFinance", "darkTech", "minimalWhite", "emeraldTrust", "cobaltTeal", "crimsonPromo", "graphiteSilver"],
      colorMode: ["auto", "light", "dark"],
      personalizationStrength: ["subtle", "medium", "strong"],
      density: ["compact", "comfortable", "balanced", "spacious"],
      heroFocus: CANONICAL_HOME_BLOCKS,
      sectionType: ["hero", "split", "full", "rail"],
      sectionSlots: CANONICAL_HOME_BLOCKS,
      moduleVariants: {
        WelcomeHeader: ["minimal", "personal", "brandLine"],
        AssetOverview: ["standard", "compactMetrics", "tickerStrip", "splitCard", "quietCard"],
        QuickActions: ["gridCards", "actionDock", "minimalIcons", "commandBar", "compactMenu", "taskRail", "priorityButtons", "tileCards", "accentCards", "segmentedMenu"],
        OnboardingGuide: ["path", "checklist", "compact", "guideCards", "journeyTimeline", "missionBoard", "ribbonRail", "nextStepHero"],
        OnboardingProgress: ["path", "checklist", "compact", "guideCards", "journeyTimeline", "missionBoard", "ribbonRail", "nextStepHero"],
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
        quick_actions: ["matrix", "toolbar", "compact-grid", "command-bar", "compact-menu", "task-rail", "tile-board", "accent-cards", "segmented-panel"],
        onboarding_guide: ["path", "checklist", "compact", "guide-cards", "journey-timeline", "mission-board", "ribbon-rail", "next-step-hero"],
        trading_account_highlight: ["pro-chart", "clean-snapshot", "sparkline-board", "split-performance"],
        trading_accounts_list: ["workbench", "dense-cards", "calm-table", "horizontal-cards", "compact-list"],
        promo_banner: ["banner", "clean", "editorial-cover", "compact-strip"],
        pamm_products: ["cards", "ranking", "horizontal-cards", "yield-chart-cards"],
        copytrading_signals: ["signal-cards", "ranking", "horizontal-cards", "curve-cards"],
        referral_link_card: ["compact-card", "link-first", "stats-card"],
        announcements: ["list", "priority-notice", "compact-feed", "ticker-strip"],
        market_news: ["feed", "article-cards", "education-list"],
        risk_disclosure: ["compact-notice", "margin-guard", "legal-strip"],
        faq_section: ["accordion", "two-column", "compact-list"],
        support_contact: ["service-card", "manager-card", "compact-bar"],
        app_download: ["qr-card", "store-buttons", "compact-banner"],
      },
      componentMorphs: CORE_COMPONENT_MORPH_POOL,
      emphasis: ["low", "medium", "high"],
    },
    rules: [
      "sections 只返回 3 到 5 个，每个为 {id,type,title,slots}，slots 只能使用 sectionSlots。",
      "sections.slots 和 brickPlan.feature/component 必须使用 allowedBlocks 的 snake_case 模块 ID，不要使用 balanceTotal、fundActions、walletList、referralLink、riskNotice 等旧槽位。",
      "quick_actions.actions 必须为空数组，除非请求上下文明确提供后台已配置入口；AI 不得根据经验补 deposit、withdraw、openAccount、support 等入口。",
      "moduleSettings.assets.visibleFields 必须是 total、wallet、tradingAccount 中的 1 到 3 个；当包含 total 和 tradingAccount 时必须同时包含 wallet。",
      "referral_link_card 只有代理/IB/合作伙伴或推广链接功能开启时才能出现；普通客户首页不得出现。",
      "referral_link_card 可只展示推广链接和邀请码，也可展示打开数、注册数、开户数、注册转化率、开户转化率；这些数据必须来自接口或后台配置，不得展示返佣、团队层级或完整代理业绩。",
      "不要主动生成奖励任务、KYC 风控提醒或完整代理数据模块；客服、FAQ、风险提示、APP 下载必须使用 support_contact、faq_section、risk_disclosure、app_download。",
      "brickPlan 返回 4 到 8 个，字段为 {brickId,brickName,family,feature,component,size,zone,reason}，brickId 必须来自 brickReference.bricks。",
      "不要返回 layout；前端会根据 brickPlan 和 sections 自动映射到积木布局。",
      "按 auto layout 组织 sections：hero/main/rail/full 要能被 12 栅格紧凑填充，小积木必须和相关业务积木成组出现。",
      "交易账号列表 trading_accounts_list、账号表现图表 trading_account_highlight、钱包列表 wallet_list 是大模块，必须各自单独一个 full section / 3x 整横栏；不要把交易账号列表和账号表现放在同一个 section、同一行或左右分栏里。",
      "一行两个积木时优先使用 8+4 或 6+6，同行高度必须一致；如果没有合适搭档，模块必须自动占满整行。",
      "必须返回 autoLayout={strategy,desktop,tablet,mobile,moduleRules,notes}；desktop.equalHeight=true，tablet.rowMode=stack-paired-rows，mobile.moduleFlow=stack-module-internals。",
      "autoLayout.moduleRules 至少包含 promo_banner、onboarding_guide、quick_actions、trading_account_highlight 的 desktop/tablet/mobile 适配说明。",
      "当模块内容在半宽列中会拥挤时，AI 必须在 autoLayout 中允许该模块内部先换行、缩成两列或变成纵向列表，而不是固定横向三等分。",
      "不要把所有模块默认做成独占整栏；没有明确独占/整栏/长模块/首屏大横幅要求时，允许 AI 把两个轻量相关模块组成一栏来优化首屏节奏，但不得包含交易账号列表、账号表现图表或钱包列表。",
      "空间利用是硬约束：如果管理员提到空白、少留白、空间利用或压缩高度，density 必须是 compact 或 balanced，不得使用 spacious；onboarding_guide 优先使用 compact/checklist/ribbon-rail 或紧凑 guide-cards。",
      `size 必须遵守布局语法：${COMPONENT_SIZE_GUIDE}`,
      "禁止 2x2+1x1、3x2+任意模块、表格/list 用 1x、8 个快捷入口用 1x、广告轮播和账号列表同行。",
      "优先选择稳定行配方：2x1+1x1、2x2+1x2、2x1+2x1、3x/4x/5x 及以上宽幅积木独占整行。",
      "禁止返回空 section、空 slots、不可渲染 slot 或明显会留下大面积空白的单模块区域。",
      "交易账号如需真实卡片、模拟列表，moduleSettings.tradingAccounts.grouping 必须为 separated，viewMode 为 card，realViewMode 为 card，demoViewMode 为 list，且不要出现账号 tab 切换。",
      "如果管理员要求 Demo 在 Live 上面、模拟账号在真实账号上面，moduleSettings.tradingAccounts.demoFirst 必须为 true。",
      "真实卡片+模拟列表、真实/模拟分区、任一账号列表视图时，TradingAccounts 的 brickPlan size 必须是 3x2 或更大宽幅尺寸且 zone=full。",
      "AccountPerformance/trading_account_highlight 的 brickPlan size 必须是 3x2 或更大宽幅尺寸且 zone=full；图表模块用整横栏换取更好的账号上下文、趋势图和指标带展示体验。",
      "只有纯账号卡片证明且不含模拟列表时，TradingAccounts 才允许 size=2x2 zone=main，且旁边必须配 1x2 侧栏。",
      "交易账号如需真实/模拟都用列表，moduleSettings.tradingAccounts.grouping 必须为 separated 且 viewMode/realViewMode/demoViewMode 均为 list。",
      "交易账号模块标题区使用干净工具栏，不要额外蓝色背景条块；真实/模拟账号分区时，列表标题右侧不展示账号数量徽标；真实和模拟分区都要保留同级创建账号按钮，按钮文案统一为“创建账号”。",
      "模拟账号练习卡必须作为可优化的体验模块处理：表达模拟金、平台、练习目标和开始练习/重置模拟金等动作，避免只堆账号编号、余额和普通入金按钮。",
      "trading_account_highlight 的左侧账号栏目必须是单层账号上下文 + 主金额 + 安静指标行；右侧图表必须让下半部分有日期轴、趋势摘要或关键指标补足视觉重心，不能上半图表、下半空白。",
      "当管理员要求简洁、扁平、降噪、指标排版优化、不要模块套模块时，trading_account_highlight 必须是单层账号上下文 + ECharts 趋势 + 一条安静指标带，禁止把 Balance/Equity/Floating PnL 做成多个等权小卡片。",
	      "交易账号卡片/列表只能展示账号类型、交易环境值、账号、余额、净值、信用金、账户类型、杠杆、保证金比例这 9 项信息；交易环境由 platform+server 合并直接显示，卡片不要露出“平台/服务器”字段名；不得为了丰富画面补 PnL、用途、持仓、保证金占用、风险状态或操作按钮。",
	      "交易账号主视图必须单一：card、list 或 table 三选一，不得把摘要卡片/摘要行和完整表格在同一模块内上下叠加；需要切换视图时，默认只显示当前视图，另一个视图必须隐藏。",
	      "当管理员批评交易账号卡片排版、小卡片模块太多、内容重复或卡片里又套表格时，优先把交易账号改成列表/表格，并减少重复容器和模块形态，只保留上述交易账号字段。",
      "列表需求优先使用 tradingAccounts.viewMode=list；但如果管理员明确要求真实账号卡片，不能把真实账号渲染成列表。",
      "quickActions.count=8 时，QuickActions 必须使用 size=2x1 或 3x1，不得使用 1x1/1x2。",
      "用户要求欢迎模块、欢迎区或 welcome 时，保留轻量 welcome_header 首行；welcome 只是入口和上下文，不应替代业务 heroFocus。",
      "用户要求淡金色、浅金色、轻金色、香槟金、金色调或 gold 时，themePreset 必须使用 lightGold，并用扁平、轻量、低阴影样式表达；只有明确黑金/VIP/高净值才使用 blackGold。",
      "用户要求翡翠、信任绿或资金安全绿时使用 emeraldTrust；要求钴蓝、青绿或青蓝科技时使用 cobaltTeal；要求赤红、红色活动或红橙时使用 crimsonPromo；要求石墨、银色或机构灰时使用 graphiteSilver。",
      "活动 Banner / 首页 Banner 只能使用 promo_banner 作为 canonical 模块；表现上可以是多张广告轮播图，必须有下一张和自动切换契约；不要返回旧 adCarousel 或 reward_tasks 模块。",
      "用户只要求创建真实交易账号按钮时，不要返回 create_account_form/open_account_panel 作为独立模块；可由 onboarding_guide 或 trading_accounts_list 中的后台配置入口承接。",
      "不要绑定账号入口时，moduleSettings.openAccount.bind 必须为 false。",
      "入金/出金按钮只允许作为 asset_overview 的可选操作或后台配置的 quick_actions 入口出现；不要为了入金转化新增固定资金操作模块。",
      "入金转化或活动增长页也必须保持 quickActions.actions=[]，除非请求上下文给出后台已配置入口；AI 只设置 quick_actions 的 count、display、size、zone 和样式。",
      "不要根据 KYC 关键词生成 kyc_risk_notice 或 userKycRail 可见侧栏；KYC 状态只能作为 onboarding_guide 的 KYC 步骤或 moduleSettings.userKycRail.kycStatus 表达，状态为 pending=未提交、reviewing=待审、verified=通过、rejected=拒绝；风控/风险提示用 risk_disclosure，客服用 support_contact，FAQ 用 faq_section，APP 下载用 app_download。",
      "quick_actions 不得写死 openAccount、openReal、deposit、withdraw、transfer、orders、positions、eventSignup、referral、contactService、kyc、risk 等入口；这些只能由后台配置或接口返回。",
      "IB/代理/渠道增长相关诉求不得生成 ib_dashboard；如需展示推广链接，只能使用 referral_link_card。",
      "多币种钱包或钱包列表诉求必须拆成两层：asset_overview 只展示 wallet 汇总值，wallet_list 才展示 USD/EUR/USDT 等币种卡片。",
      "资产管理首页必须使用 asset_overview、trading_account_highlight、trading_accounts_list 和可选 quick_actions/wallet_list/risk_disclosure 组合；不要输出旧 riskNotice、fundActions、walletList 或 referralLink。",
      "白标资金可信首页必须使用 designGenome=accountOpsConsole、layoutPreset=accountOpsConsole、themePreset=blueFinance、heroFocus=asset_overview；sections 推荐为 asset_overview+quick_actions、trading_account_highlight 单独整横栏、trading_accounts_list 单独整横栏，可按租户能力追加 promo_banner、announcements、market_news、risk_disclosure、support_contact、faq_section、app_download。",
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
      autoLayout: {
        strategy: "responsive-grid",
        desktop: { columns: 12, collapseAt: 1040, rowMode: "fill-paired-rows", moduleFlow: "3x, 2x+1x, 2x+2x", equalHeight: true },
        tablet: { columns: 1, collapseAt: 1040, rowMode: "stack-paired-rows", moduleFlow: "one-module-per-row", equalHeight: false },
        mobile: { columns: 1, collapseAt: 720, rowMode: "single-column", moduleFlow: "stack-module-internals", equalHeight: false },
        moduleRules: {
          promo_banner: { desktop: "split-copy-tiers", tablet: "stack-copy-tiers", mobile: "single-column-tiers" },
          onboarding_guide: { desktop: "three-step-row", tablet: "vertical-journey", mobile: "checklist" },
          quick_actions: { desktop: "auto-grid", tablet: "two-column-grid", mobile: "one-or-two-column-grid" },
          trading_account_highlight: { desktop: "full-row-chart", tablet: "stack-chart-after-summary", mobile: "single-column-chart" },
        },
        notes: ["内容区低于 1040px 时，成对模块自动改为一栏一个模块。"],
      },
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
      componentMorphs: {
        AssetOverview: { variant: "standard", morph: "summaryHero", morphId: "summaryHero" },
        QuickActions: { variant: "gridCards", morph: "gridCards", morphId: "gridCards" },
        TradingAccounts: { variant: "workbench", morph: "statusBoard", morphId: "statusBoard" },
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
	      dataContract: {
	        mode: "api-bound-preview",
	        previewSample: true,
	        dataBindingRequired: true,
	        fallback: "placeholder",
	        fields: {
	          tradingAccounts: {
	            previewSample: true,
	            dataBindingRequired: true,
	            binding: "api.trading.accounts",
	            fallback: "--",
	            allowedFields: ["accountKind", "platform", "server", "account", "balance", "equity", "credit", "accountType", "leverage", "marginRatio"],
	            forbiddenFields: ["pnl", "usage", "positions", "marginUsed", "riskStatus", "actions"]
	          },
	          tradingCost: { previewSample: true, dataBindingRequired: true, binding: "api.trading.costs", fallback: "--" },
          pnl: { previewSample: true, dataBindingRequired: true, binding: "api.trading.pnl", fallback: "--" },
          margin: { previewSample: true, dataBindingRequired: true, binding: "api.trading.margin", fallback: "--" },
          charts: { previewSample: true, dataBindingRequired: true, binding: "api.trading.performanceSeries", fallback: "--" },
        },
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

function compactComponentLibraryPromptReference(options = {}) {
  const components = readComponentLibrary().components;
  return rankComponentReferences(components, { ...options, limit: Math.min(Number(options.limit) || 4, 4) }).map((component) => ({
    id: cleanText(component.id, "", 60),
    name: cleanText(component.name, "", 40),
    family: cleanText(component.family, "", 40),
    size: cleanText(component.size, "", 12),
    description: cleanText(component.description, "", 90),
    tags: Array.isArray(component.tags) ? component.tags.slice(0, 4) : [],
    visibleText: cleanText(stripHtmlTags(component.html), "", 140),
    styleSignals: componentStyleSignals(component.css).slice(0, 5),
  }));
}

function compactCurrentConfigReference(config = {}) {
  const source = config && typeof config === "object" ? config : {};
  return {
    name: cleanText(source.name, "", 40),
    layoutPreset: cleanText(source.layoutPreset || source.layout, "", 40),
    themePreset: cleanText(source.themePreset || source.theme, "", 40),
    colorMode: normalizeServerHomeColorMode(source.colorMode || source.themeMode || source.appearanceMode || source.homeColorMode),
    density: cleanText(source.density, "", 20),
    heroFocus: cleanText(source.heroFocus, "", 40),
    sections: (Array.isArray(source.sections) ? source.sections : []).slice(0, 4).map((section) => ({
      type: cleanText(section?.type, "", 20),
      slots: (Array.isArray(section?.slots) ? section.slots : []).slice(0, 4),
    })),
  };
}

function compactHomepageIntentProfile(profile = {}) {
  return {
    primaryIntent: profile.primaryIntent,
    secondaryIntents: Array.isArray(profile.secondaryIntents) ? profile.secondaryIntents : [],
    confidence: profile.confidence,
    label: profile.label,
    layoutPreset: profile.layoutPreset,
    themePreset: profile.themePreset,
    density: profile.density,
    heroFocus: profile.heroFocus,
    primaryGoal: profile.primaryGoal,
    mustHave: Array.isArray(profile.mustHave) ? profile.mustHave : [],
    avoid: Array.isArray(profile.avoid) ? profile.avoid : [],
    matchedSignals: Array.isArray(profile.matchedSignals) ? profile.matchedSignals.slice(0, 8) : [],
  };
}

function compactHomepageContract(intentProfile, prompt) {
  const compactIntent = compactHomepageIntentProfile(intentProfile);
  return {
    allowedBlocks: CANONICAL_HOME_BLOCKS,
    forbiddenBlocks: ["reward_tasks", "kyc_risk_notice", "ib_dashboard", "referralLink", "userKycRail", "riskNotice", "support_help"],
    layoutPreset: ["standardDashboard", "conversionFirst", "assetFirst", "tradingPro", "vipService", "magazineCampaign", "tradingCommand", "onboardingJourney", "privateWealthDesk", "accountOpsConsole"],
    themePreset: ["default", "blackGold", "lightGold", "blueFinance", "darkTech", "minimalWhite", "emeraldTrust", "cobaltTeal", "crimsonPromo", "graphiteSilver"],
    density: ["compact", "comfortable", "balanced", "spacious"],
    sectionType: ["hero", "split", "full", "rail"],
    brickSize: COMPONENT_SIZES,
    brickZone: ["hero", "main", "rail", "full"],
    blockFamily: {
      welcome_header: "WelcomeHeader",
      asset_overview: "AssetOverview",
      wallet_list: "WalletList",
      quick_actions: "QuickActions",
      onboarding_guide: "OnboardingProgress",
      trading_account_highlight: "AccountPerformance",
      trading_accounts_list: "TradingAccounts",
      promo_banner: "PromotionBanner",
      pamm_products: "PammProducts",
      copytrading_signals: "CopytradingSignals",
      referral_link_card: "ReferralLinkCard",
      announcements: "Announcements",
      market_news: "MarketNews",
      risk_disclosure: "RiskDisclosure",
      faq_section: "FaqSection",
      support_contact: "SupportContact",
      app_download: "AppDownload",
    },
    moduleStyles: {
      asset_overview: ["command", "metric-strip", "quiet-card", "ticker-strip", "split-card"],
      quick_actions: ["matrix", "toolbar", "compact-grid", "command-bar", "compact-menu", "task-rail", "tile-board", "accent-cards", "segmented-panel"],
      onboarding_guide: ["path", "checklist", "compact", "guide-cards", "journey-timeline", "mission-board", "ribbon-rail", "next-step-hero"],
      trading_account_highlight: ["pro-chart", "clean-snapshot", "sparkline-board", "split-performance"],
      trading_accounts_list: ["workbench", "dense-cards", "calm-table", "horizontal-cards", "compact-list"],
      promo_banner: ["banner", "clean", "editorial-cover", "compact-strip"],
      pamm_products: ["cards", "ranking", "horizontal-cards", "yield-chart-cards"],
      copytrading_signals: ["signal-cards", "ranking", "horizontal-cards", "curve-cards"],
      announcements: ["list", "priority-notice", "compact-feed", "ticker-strip"],
      risk_disclosure: ["compact-notice", "margin-guard", "legal-strip"],
    },
    outputFields: [
      "schemaVersion",
      "blueprintVersion",
      "generationMode",
      "pageIntent",
      "designGenome",
      "pageStory",
      "name",
      "layoutPreset",
      "themePreset",
      "colorMode",
      "personalizationStrength",
      "density",
      "heroFocus",
      "sections",
      "brickPlan",
      "modules",
      "moduleStyles",
      "moduleSettings",
      "dataContract",
      "emphasis",
      "aiSummary",
    ],
    intentMustHave: compactIntent.mustHave,
    intentAvoid: compactIntent.avoid,
    componentReferences: compactComponentLibraryPromptReference({ prompt, limit: 4 }),
    aestheticSamples: rankDesignSamplesForPrompt(prompt, 3).map((sample) => ({
      id: sample.id,
      name: sample.name,
      pageIntent: sample.pageIntent,
      visualStyle: sample.visualStyle,
      page: sample.page,
      functions: sample.functions.slice(0, 3),
      goodPatterns: sample.goodPatterns.slice(0, 4),
    })),
    beautifulComponents: beautifulComponentReferences({ prompt, limit: 4 }).map((component) => ({
      id: component.id,
      name: component.name,
      family: component.family,
      size: component.size,
      styleSignals: component.styleSignals,
      reuseAdvice: component.reuseAdvice,
    })),
    feedbackMemory: feedbackMemoryPromptReference(prompt, 3),
  };
}

function buildLowLatencyHomepagePrompt(payload, config = {}) {
  const context = payload.context || {};
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const compactIntent = compactHomepageIntentProfile(intentProfile);
  const design = homepageDesignForIntent(intentProfile.primaryIntent);
  const providerName = config.name || PROVIDERS[config.provider]?.name || "AI";
  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 首页蓝图生成器。",
    "只输出一个能被 JSON.parse 解析的紧凑 JSON object，不要 markdown、解释、注释、HTML、CSS、JS 或 <think>。",
    "输出必须短：sections 3-4 个，brickPlan 4-6 个，reason 不超过 28 个中文字符，aiSummary 不超过 60 个中文字符。",
    "必须遵守 design.md 设计治理：金融 CRM 美观来自结构、密度、状态、数据扫描和响应式，不来自随意装饰、营销式大封面或卡片堆叠。",
    "必须返回 generationMode=\"brick-v2\"、blueprintVersion=5，并只使用 allowedBlocks 里的 snake_case 内容块。",
    "禁止旧模块和禁用模块：balanceTotal、fundActions、walletList、referralLink、userKycRail、riskNotice、support_help、reward_tasks、kyc_risk_notice、ib_dashboard。",
    "quick_actions.actions 必须返回 []；入口内容来自后台配置或接口，AI 只决定数量、布局和样式。",
    "asset_overview 只做 total、wallet、tradingAccount 汇总；多币种明细只能用 wallet_list。",
    "首页 Banner / 活动 Banner 使用 promo_banner；被选择时按多张广告轮播图处理，具备分页、下一张和自动切换契约，不返回旧 adCarousel。",
    "PAMM 和 CopyTrading 必须分别用 pamm_products 与 copytrading_signals，不能合并。",
    "连续收益、净值、PnL、回撤等趋势数据必须表达为折线或面积折线，真实数据在 dataContract 标记接口绑定和 fallback。",
    "紧凑输出契约会包含 aestheticSamples、beautifulComponents 和 feedbackMemory；必须用它们决定页面级构图、漂亮积木块细节和用户偏好，不能只输出平均白卡布局。",
    "视觉模式必须返回 colorMode=\"auto\"，除非管理员只要求白天或只要求暗夜；minimalWhite、blueFinance、lightGold 的白天模式不得使用大面积黑色/终端色块，暗色只在 darkTech 或 colorMode=dark 时出现。",
    `空间利用是硬约束：桌面 12 栅格紧凑填充，${COMPONENT_SIZE_GUIDE} 优先宽幅积木独占、2x+1x、2x+2x；移动端自然单列。`,
    `${providerName} 请求会走短上下文模式；不要复述规则，只返回最终 JSON。`,
  ].join("\n");

  const user = [
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
    "",
    ...guidedIntakePromptLines(guidedIntake),
    "管理员需求:",
    prompt || "生成一个适合默认客户的平衡首页。",
    "",
    "服务端意图与设计默认值:",
    compactJson({ pageIntent: compactIntent, design }),
    "",
    "当前草稿摘要:",
    compactJson(compactCurrentConfigReference(context.currentConfig)),
    "",
    "紧凑输出契约:",
    compactJson(compactHomepageContract(intentProfile, prompt)),
    "",
    "design.md 设计治理摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 6) || [],
      forbidden: designGovernance.forbidden?.slice(0, 6) || [],
      usePolicy: designGovernance.usePolicy,
    }),
    "",
    "返回 JSON 示例结构只需同等字段，不要照抄内容:",
    compactJson({
      schemaVersion: 4,
      blueprintVersion: 5,
      generationMode: "brick-v2",
      pageIntent: compactIntent,
      designGenome: design.designGenome,
      pageStory: design.pageStory,
      name: "AI 首页方案",
      layoutPreset: design.layoutPreset,
      themePreset: compactIntent.themePreset,
      colorMode: homeColorModeFromPrompt(prompt),
      personalizationStrength: "strong",
      density: compactIntent.density,
      heroFocus: compactIntent.heroFocus,
      sections: [{ id: "hero", type: "hero", title: "首屏", slots: [compactIntent.heroFocus, "quick_actions"].filter((slot, index, arr) => slot && arr.indexOf(slot) === index) }],
      brickPlan: [{ brickId: "assetOverview.flexible", brickName: "资产概览区", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "hero", reason: "承接首屏资金状态。" }],
      modules: { AssetOverview: { variant: "standard" }, QuickActions: { variant: "gridCards" } },
      moduleStyles: { asset_overview: "command", quick_actions: "matrix" },
      moduleSettings: { quickActions: { enabled: true, count: 4, display: "iconText", actions: [] }, assets: { enabled: true, visibleFields: ["total", "wallet", "tradingAccount"] } },
      dataContract: { mode: "api-bound-preview", previewSample: true, dataBindingRequired: true, fallback: "--" },
      emphasis: { deposit: "medium", openAccount: "medium", promo: "low", accounts: "medium" },
      aiSummary: "一句话说明方案。",
    }),
    "",
    "现在只返回最终 JSON object。",
  ].join("\n");

  return { system, user, promptMode: "low-latency-homepage" };
}

function buildMiniMaxHomepagePatchPrompt(payload, config = {}) {
  const prompt = cleanText(payload.prompt, "生成一个适合默认客户的平衡首页。", 720);
  const variant = Number(payload.variant || 0);
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const compactIntent = compactHomepageIntentProfile(intentProfile);
  const design = homepageDesignForIntent(intentProfile.primaryIntent);
  const providerName = config.name || "MiniMax";
  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 首页蓝图 patch 生成器。",
    "只输出一个 JSON object；第一个字符必须是 {，最后一个字符必须是 }。",
    "不要 markdown、代码块、解释、注释、HTML、CSS、JS 或 <think>。",
    "这是 MiniMax 2048 completion token 短输出模式：返回 patch，不返回完整默认配置；服务端会补齐 schema、默认 moduleSettings、dataContract、autoLayout 和安全纠偏。",
    "输出控制在 1200 个中文字符内；sections 最多 4 个，brickPlan 最多 6 个；brickPlan 只写 component、size、zone，省略 reason、brickName、family。",
    "必须返回 schemaVersion=4、blueprintVersion=5、generationMode=\"brick-v2\"、name、layoutPreset、themePreset、colorMode、density、heroFocus、sections、brickPlan、modules、moduleStyles、moduleSettings、aiSummary。",
    "所有 sections[].slots 和 brickPlan[].component 只能使用 allowedBlocks；quickActions.actions 必须是空数组。",
    "遵守 design.md 设计治理：只做金融 CRM 工作台式美化，不做营销式大 hero、卡片套卡片或随机渐变。",
    `${providerName} 如果不确定字段，宁可少写，不能写白名单外模块或让 JSON 截断。`,
  ].join("\n");

  const user = [
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
    "",
    ...guidedIntakePromptLines(guidedIntake),
    "管理员需求:",
    prompt,
    "",
    "页面意图和默认设计:",
    compactJson({ pageIntent: compactIntent, design }),
    "",
    "allowedBlocks:",
    compactJson(CANONICAL_HOME_BLOCKS),
    "",
    "可用 layout/theme/density:",
    compactJson({
      layoutPreset: ["standardDashboard", "conversionFirst", "assetFirst", "tradingPro", "vipService", "magazineCampaign", "tradingCommand", "onboardingJourney", "privateWealthDesk", "accountOpsConsole"],
      themePreset: ["default", "blackGold", "lightGold", "blueFinance", "darkTech", "minimalWhite", "emeraldTrust", "cobaltTeal", "crimsonPromo", "graphiteSilver"],
      density: ["compact", "comfortable", "balanced", "spacious"],
      sizes: ["1x1", "2x1", "2x2", "3x1", "3x2", "4x1"],
      zones: ["hero", "main", "rail", "full"],
    }),
    "",
    "design.md 摘要:",
    compactJson({
      rules: designGovernance.rules?.slice(0, 4) || [],
      forbidden: designGovernance.forbidden?.slice(0, 4) || [],
    }),
    "",
    "输出示例形状，不要照抄:",
    "{\"schemaVersion\":4,\"blueprintVersion\":5,\"generationMode\":\"brick-v2\",\"name\":\"AI 首页方案\",\"layoutPreset\":\"accountOpsConsole\",\"themePreset\":\"blueFinance\",\"colorMode\":\"auto\",\"density\":\"balanced\",\"heroFocus\":\"asset_overview\",\"sections\":[{\"id\":\"hero\",\"type\":\"hero\",\"slots\":[\"asset_overview\",\"quick_actions\"]}],\"brickPlan\":[{\"component\":\"asset_overview\",\"size\":\"2x1\",\"zone\":\"hero\"}],\"modules\":{\"AssetOverview\":{\"variant\":\"tickerStrip\"}},\"moduleStyles\":{\"asset_overview\":\"ticker-strip\"},\"moduleSettings\":{\"quickActions\":{\"enabled\":true,\"count\":4,\"display\":\"iconText\",\"actions\":[]}},\"aiSummary\":\"一句话说明方案\"}",
    "",
    "现在只返回最终 JSON object。",
  ].join("\n");

  return { system, user, promptMode: "minimax-homepage-patch" };
}

function buildPrompt(payload, config = {}) {
  if (config.provider === "minimax") return buildMiniMaxHomepagePatchPrompt(payload, config);
  if (config.provider === "kimi") return buildLowLatencyHomepagePrompt(payload, config);
  if (config.apiMode === "openai-chat") return buildMiniMaxPrompt(payload);

  const context = payload.context || {};
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const now = new Date().toISOString();
  const guidedIntake = guidedAiIntakeFromPayload(payload);
  const intentProfile = applyGuidedIntentProfile(buildHomepageIntentProfile(prompt), guidedIntake);
  const designGovernance = designRulesPromptReference();

  const system = [
    "你是 ForexCRM 的首页蓝图生成器。",
    "你的任务是把管理员的中文需求转换成安全的首页配置 JSON。",
    "只能返回一个 JSON object，不要 markdown，不要解释，不要生成 HTML/CSS/JS。",
    "必须遵守 design.md 设计治理：先用规范锁住页面骨架、组件语义、视觉 token、暗色/移动端和禁用项，再允许 AI 在结构、层级和模块细节上做漂亮变化。",
    `配置只能围绕这些首页内容块: ${CANONICAL_HOME_BLOCKS.join(", ")}。`,
    "不要输出奖励/任务区、KYC 风控提醒区或完整代理数据区；客服、FAQ、风险提示、APP 下载要用 support_contact、faq_section、risk_disclosure、app_download，旧 riskNotice/support_help 仅作兼容输入。",
    "快捷操作区 quick_actions 只负责占位、渲染和适配后台返回入口；不要写死具体快捷功能，也不要假设入金、出金、开户一定存在。",
    "quick_actions 的每个入口都必须有独立视觉容器，例如卡片、边框按钮、磁贴或背景色模块；不要输出裸排图标+文字。根据意图选风格：交易工作台用 command-bar/segmented-panel，活动增长用 accent-cards/tile-board，新客旅程用 task-rail/accent-cards，资产/品牌用 tile-board/segmented-panel，移动端用 compact-menu。",
    "资产概览区 asset_overview 标题统一用“资产概览”，可展示 total、wallet、tradingAccount 中任意 1-3 个字段；total=wallet+tradingAccount，如果出现 total+tradingAccount 必须同时出现 wallet；可选展示入金/出金按钮，但不得新增资产字段或编造资金数据。",
    "PAMM 产品推荐区 pamm_products 与 CopyTrading 信号源推荐区 copytrading_signals 必须独立处理，且只在租户开启对应能力时展示。",
    "首页 Banner / 活动 Banner 只能使用 promo_banner 作为 canonical 模块；当管理员选择 Banner 时按多张广告轮播图处理，需要有分页、下一张和自动切换契约，不要返回旧 adCarousel 模块。",
    "连续时间数据必须按趋势表达：近 N 天收益、7/30/90 日收益、净值、PnL、回撤变化或收益率曲线必须使用折线图或面积折线图，不得使用柱状图、胶囊柱或装饰性条形图。",
    "数据策略必须分层：预览可用 sample data 填充页面效果，但交易成本、PnL、保证金、图表等真实数据必须在 dataContract 中标记 previewSample=true、dataBindingRequired=true、fallback=\"--\" 或 placeholder，正式运行来自后台或接口。",
    "不要把“交易成本/PnL/保证金/图表数据必须来自接口”理解成交易成本看板；只有管理员明确说首屏突出交易成本、成本效率、点差佣金看板或成本工作台时，才使用成本看板。",
    "专业交易客户首页的首屏优先级是交易账号状态 > 账户表现图表 > 持仓入口 > MT5 操作入口；真实账号和模拟账号在一起且要求卡片时，必须使用 combined card 账号区展示 Live / Demo。",
    "交易账号内部数据契约固定为 9 项：账号类型(Demo/Live)、platform、server、账号、余额、净值、信用金、账户类型、杠杆、保证金比例；客户侧展示时 platform+server 合并为交易环境值，优先直接显示 MT5 · HCHoldings-Live2，卡片里不要露出“平台/服务器”字段名；不得自行补充 PnL、用途、持仓、保证金占用、风险状态或操作按钮作为账号字段。",
    "交易账号模块必须先确定一种主展示形态：card、list 或 table 三选一；同一组账号数据不得在同一个模块里同时渲染上方摘要卡/摘要行和下方列表/表格。switchable 只允许作为交互状态，默认也只能显示一个视图。",
    "交易账号字段命名必须区分账号类型(accountKind=Live/Demo)和账户类型(accountType=ECN Standard/Demo ECN)；platform/server 可作为接口字段拆分，但展示层优先合并为一个交易环境值，表格列名用“交易环境”。",
    "copytrading_signals 的 curve-cards 必须把信号源、收益率、总收益、最大回撤、收益折线/面积曲线和 AI 推荐理由按信息层级展示；不能用大面积渐变横幅或厚重 CTA 抢走图表空间。",
    "收益率、总收益、最大回撤、风险等级等指标不要默认逐项套边框卡片；已有图表或推荐卡承载时，用简洁指标行、分隔线或低干扰内联分组。",
    "trading_account_highlight 的左侧账号栏目必须扁平分组，右侧图表下半部分要有日期轴、走势摘要或关键指标补足视觉重心，不能出现大面积空白。",
    "交易账号模块标题区使用干净工具栏，不要额外蓝色背景条块。",
    "不要输出无业务增益的英文 eyebrow，例如 AI Copytrading Match；标题能说明模块时直接展示标题。",
    "推广链接 referral_link_card 仅代理、IB、合作伙伴或租户开启推广链接功能时展示；它只展示推广链接、邀请码、复制/分享和基础统计，样式需要参考 ReferralLinkCard 积木内容后引申，不得变成完整代理中心。",
    "risk_disclosure、faq_section、support_contact、app_download 是正式可见模块；当管理员在引导中选择风险提示、FAQ、在线客服或 APP 下载时必须用这些模块承接。",
    "support_contact 必须轻量化，不得占据大篇幅；只展示服务时间、客户经理/状态和一个联系按钮，不得编造在线状态或联系方式；app_download 不得编造下载链接或二维码；faq_section 内容应来自后台配置；risk_disclosure 正式内容应来自合规接口，Demo 缺数据时可生成清晰标注的参考风险提示文案。",
    "必须参考首页积木编排规则，把需求映射到 brickPlan、sections、layout、moduleStyles 和 moduleSettings。",
    "必须返回 generationMode=\"brick-v2\"、blueprintVersion=5、brickPlan 和 brickTrace。",
    "首页布局必须自适应 auto layout：桌面按 12 栅格紧凑填充，移动端降级单列；不要依赖空白占位、固定大高度或孤立小模块撑出空区块。",
    "必须返回 autoLayout 字段：desktop/tablet/mobile 三档策略、折叠断点、同行等高和模块内部自适应；它只给系统执行，不会暴露为客户配置。",
    "autoLayout.tablet.collapseAt 默认 1040，mobile.collapseAt 默认 720；内容区低于 tablet 断点时，两栏模块自动变一栏一个模块。",
    "autoLayout.moduleRules 必须覆盖 promo_banner、onboarding_guide、quick_actions、trading_account_highlight：入金阶梯可上下堆叠，三步引导可从横排变竖排，快捷入口可自动 4/3/2/1 列，账号表现图表桌面占整横栏并在手机端上下堆叠。",
    "桌面端允许一行两个积木，推荐 8+4 或 6+6；同一行的两个积木必须等高，不能留下 8/12 内容旁边空 4/12 的区域。",
    "空间利用是硬约束：状态、步骤、快捷入口等轻量模块必须压缩高度并把信息靠近图标/编号，禁止内容贴底、编号漂浮或用无内容卡片制造高级感。",
    "不要默认让所有模块独占一栏；除非管理员明确要求独占、整栏、长模块、首屏大横幅，或模块本身是大型列表/表格/趋势图，否则应允许两个轻量相关模块组成一栏。",
    `必须遵守首页布局语法：${COMPONENT_SIZE_GUIDE}`,
    "优先使用稳定行配方：3x/4x/5x 及以上独占整行、2x1+1x1、2x2+1x2、2x1+2x1；禁止 2x2+1x1、3x2+任何同行模块。",
    "交易账号列表、账号表现图表、钱包列表必须各自单独一个 full section / 3x 整横栏；不要把 trading_accounts_list 与 trading_account_highlight 放进同一个 section 或同一行左右分栏。",
    "列表/表格/钱包列表/账号表现图表/账号双列表不能使用 1x；8 个快捷入口不能使用 1x；广告轮播和交易账号列表不能同行。",
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
    "组件形态不能都用普通卡片；componentMorphs 是渲染契约，不是展示说明。",
    "核心可见模块必须选择 componentMorphs：AssetOverview、WalletList、QuickActions、TradingAccounts、OnboardingProgress、AccountPerformance、PromotionBanner、ReferralLinkCard、RiskDisclosure 只要出现在 sections/brickPlan/layout 中，就必须从 componentMorphPool 对应 10 种 DOM morph 池里选择 morph/morphId。",
    "同一屏里的核心可见模块要尽量选择不同 morph，不得只换标题、颜色、顺序、moduleStyles 或 variant；morph 必须意味着真实 DOM 骨架差异，例如表格型、横向状态条、指标三联、左右分栏、时间线、操作坞、紧凑列表、终端面板、卡片墙、风险/信任证明结构。",
    "当管理员提到个性化、意图、更多方案、样式风格时，personalizationStrength 必须为 strong，并让 pageIntent 同时影响 layoutPreset、sections 顺序、QuickActions 风格和核心可见模块 morph，不要只换颜色。",
    "如果管理员要求简洁、扁平、降噪、数据指标排版优化、不要模块内套模块，账号表现必须采用单层结构：选中账号上下文、一个主数值、ECharts 7D/30D 折线图和一条轻量指标带；不要再生成卡片里面套小卡片。",
    "交易账号卡片/列表只能展示账号类型、交易环境值、账号、余额、净值、信用金、账户类型、杠杆、保证金比例这 9 项信息；交易环境由 platform+server 合并直接显示，卡片不要露出“平台/服务器”字段名；不得为了丰富画面补 PnL、用途、持仓、保证金占用、风险状态或操作按钮。",
    "交易账号主视图必须单一：card、list 或 table 三选一，不得把摘要卡片/摘要行和完整表格在同一模块内上下叠加；需要切换视图时，默认只显示当前视图，另一个视图必须隐藏。",
    "如果账号字段密度较高、账号多或管理员说重点太多、内容重复、卡片里又套表格，优先选择列表/表格，而不是把多种账号形态堆在同一个模块里。",
    "sections、layout 和 brickPlan 只能包含可渲染且启用的业务模块；禁止空 section、空 slots、东缺一块西缺一块的断裂拼版。",
    "brickPlan、brickTrace、brickName、brickReason 只用于系统调试和数据属性，不能作为用户端可见 UI 文案。",
    "如果管理员要求真实账号用卡片、模拟账号用列表，必须设置 moduleSettings.tradingAccounts.grouping = \"separated\"、viewMode = \"card\"、realViewMode = \"card\"、demoViewMode = \"list\"，前端会渲染成两个独立账号模块且不显示 tab。",
    "真实账号卡片+模拟账号列表、真实/模拟分区、任一账号列表视图时，TradingAccounts 的 brickPlan size 必须是 3x2 或更大宽幅尺寸且 zone=full；只有纯 combined card 账号证明才允许 size=2x2 zone=main。",
    "AccountPerformance/trading_account_highlight 的 brickPlan size 必须是 3x2 或更大宽幅尺寸且 zone=full；账号表现图表用整横栏展示账号上下文、主数值、ECharts 趋势和指标带，优先保证美观度和空间使用。",
    "如果管理员要求交易账号分成两个列表、真实和模拟都列表、Live/Demo 都列表，必须设置 moduleSettings.tradingAccounts.grouping = \"separated\" 且 viewMode/realViewMode/demoViewMode 都为 \"list\"。",
    "如果管理员要求模拟账号列表在真实账号列表上面，必须在 aiSummary 或 layout reason 中保留 Demo 在上、Live 在下的排序意图，前端会按该顺序渲染。",
    "如果管理员要求 Demo 在 Live 上面、模拟账号在真实账号上面，必须设置 moduleSettings.tradingAccounts.demoFirst = true。",
    "如果管理员要求列表形式、建议用列表、真实账号列表、模拟账号列表、不是卡片，必须返回交易账号列表主视图；但管理员明确要求真实账号卡片时，以真实账号卡片优先。",
    "如果管理员要求 8 个快捷入口或两行四个，quickActions.count 必须是 8，QuickActions 的 brickPlan size 必须是 2x1 或 3x1，不能使用 1x。",
    "如果管理员给出快捷入口名称，也不要把名称写死进 moduleSettings.quickActions.actions；只设置 quick_actions 的展示数量、样式和占位，入口内容由后台配置或接口返回。",
    "如果管理员提到空白、少留白、空间利用或压缩高度，density 必须是 compact 或 balanced，不得使用 spacious；onboarding_guide 优先使用 compact/checklist/ribbon-rail 或紧凑 guide-cards。",
    "如果管理员提到小屏幕、手机端、移动端或适配，autoLayout.strategy 必须保持 responsive-grid 或 mobile-first-stack，并优先让 paired rows collapse 为单列。",
    "如果管理员要求活动增长、交易大赛、奖池，并明确说明租户已配置活动，必须使用 promo_banner 作为活动模块；如果有 welcome_header，promo_banner 可紧跟在 welcome_header 后面。",
    "如果管理员要求欢迎模块、欢迎区或 welcome，保留轻量 welcome_header 首行；welcome 必须固定在页面最顶部，只提供用户上下文，不展示重复的个性化入口，也不改变业务 heroFocus。",
    "如果管理员要求淡金色、浅金色、轻金色、香槟金、金色调或 gold，themePreset 必须使用 lightGold，并通过 density/moduleStyles 做扁平、轻量、低阴影表达；只有明确黑金/VIP/高净值才使用 blackGold。",
    "如果管理员要求翡翠、信任绿或资金安全绿，themePreset 必须使用 emeraldTrust；要求钴蓝、青绿或青蓝科技时使用 cobaltTeal；要求赤红、红色活动或红橙时使用 crimsonPromo；要求石墨、银色或机构灰时使用 graphiteSilver。",
    "如果管理员要求极简、极简白、淡色、浅色、白色、留白或 minimal，themePreset 必须使用 minimalWhite；白天模式不得出现大面积黑色、终端黑、黑色欢迎条或黑色图表容器。",
    "所有生成首页必须考虑白天模式和暗夜模式：默认返回 colorMode=\"auto\"，只在管理员明确只要暗夜时返回 dark、明确只要白天时返回 light；暗色大面板只能在 darkTech 或 colorMode=dark 下使用。",
    "如果管理员要求欢迎模块独占第一栏，layout 中必须包含 welcome_header 作为第一个 12 栅格轻量整行；它不能改变 heroFocus，heroFocus 仍应指向广告轮播等业务核心。",
    "如果页面是新手开户、开户注册、开户路径、KYC 路径或 onboarding journey，AI 可以把 onboarding_guide 做成账户开通进度面板 mission-board、下一步主面板 next-step-hero、里程碑票据 ribbon-rail、精美 guide-cards、整横栏 journey-timeline 或清单；按意图选择形态，不要固定塞进侧栏小卡片，也不要固定成三等分方格；标题不要固定写成“新手引导路径”。",
    "如果管理员要求活动增长、交易大赛、奖池，并明确要求活动首屏、独占整栏、单独长模块或首屏大横幅，必须把 promo_banner 放在 welcome_header 之后的第一个业务 full-width hero 模块，heroFocus 使用 promo_banner。",
    "如果管理员只要求创建真实交易账号按钮，不要返回 create_account_form 或 open_account_panel 独立模块；可由 onboarding_guide 或 trading_accounts_list 中的后台入口承接。",
    "推广链接、开户链接、邀请码可以在代理/IB/合作伙伴场景用 referral_link_card 轻量展示；代理返佣、团队业绩和 KYC 风控提醒默认禁用，不要输出 referralLink/referral_link、ib_dashboard、userKycRail 或旧 riskNotice/support_help。",
    "如果管理员要求钱包列表小卡片，asset_overview 只能承接为钱包余额汇总字段，wallet_list 才输出多币种钱包卡片；不要输出旧 walletList 槽位。",
    "如果管理员要求多币种钱包，asset_overview 只展示 wallet 汇总值，wallet_list 展示币种明细；不要新增风险等级、保证金占用、可用资金等未允许资产字段。",
    "资产管理、总资产、钱包余额、账户表现图表需求必须按 accountOpsConsole + blueFinance 处理，推荐 sections 为 asset_overview+quick_actions、trading_account_highlight、trading_accounts_list；没有明确活动/资讯能力时不要返回 promo_banner、announcements、market_news。",
    "KYC 状态不是 KYC 说明页；如管理员选择 KYC 状态，只能在 onboarding_guide 的 KYC 步骤或 moduleSettings.userKycRail.kycStatus 中表达，状态枚举为 pending=未提交、reviewing=待审、verified=通过、rejected=拒绝；不要输出 userKycRail 可见侧栏或 kyc_risk_notice。",
    "如果管理员要求不要绑定账号入口，必须设置 moduleSettings.openAccount.bind = false。",
    "优先使用传入 schema、默认配置、模块变体和模块样式中的白名单值。",
    "返回字段建议包括 schemaVersion、blueprintVersion、generationMode、pageIntent、designGenome、pageStory、name、layoutPreset、themePreset、colorMode、density、heroFocus、sections、autoLayout、layout、modules、moduleStyles、componentMorphs、moduleSettings、dataContract、brickPlan、brickTrace、emphasis、aiSummary。",
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
      componentMorphPool: CORE_COMPONENT_MORPH_POOL,
      componentLibraryReference: componentLibraryPromptReference({ prompt, limit: 12 }),
      savedCompositionReference: savedCompositionPromptReference(6),
      aestheticTraining: aestheticTrainingContext({ prompt }, { sampleLimit: 4, componentLimit: 10, feedbackLimit: 6 }),
      designGovernance,
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
  const structuredJsonRequest = config.responseFormat !== "text";
  const kimiFixedTemperatureRequest = config.provider === "kimi" && isKimiFixedTemperatureModel(config.model);
  const body = {
    model: config.model,
    temperature: kimiFixedTemperatureRequest
      ? kimiTemperatureForModel(config.model)
      : structuredJsonRequest && config.provider === "minimax"
        ? Math.min(config.temperature, 0.6)
        : config.temperature,
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
    if (structuredJsonRequest) {
      body.response_format = { type: "json_object" };
    }
  } else if (config.provider === "kimi") {
    delete body.max_tokens;
    body.max_completion_tokens = config.maxOutputTokens;
    if (kimiFixedTemperatureRequest) {
      body.thinking = { type: "disabled" };
    }
    if (structuredJsonRequest) {
      body.response_format = { type: "json_object" };
    }
  } else if (config.provider === "deepseek") {
    body.thinking = { type: "disabled" };
    if (structuredJsonRequest) {
      body.response_format = { type: "json_object" };
    }
  } else if (structuredJsonRequest) {
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
  let source = String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "");
  const danglingThink = source.search(/<think>/i);
  if (danglingThink >= 0) {
    const afterThink = source.slice(danglingThink).replace(/^<think>/i, "");
    const jsonStart = afterThink.indexOf("{");
    source = jsonStart >= 0 ? `${source.slice(0, danglingThink)}${afterThink.slice(jsonStart)}` : source.slice(0, danglingThink);
  }
  return source.trim();
}

function addJsonCandidate(candidates, candidate) {
  const normalized = String(candidate || "").trim().replace(/^\uFEFF/, "");
  if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
}

function balancedJsonObjectCandidates(source) {
  const text = String(source || "");
  const candidates = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (start < 0) {
      if (char === "{") {
        start = index;
        depth = 1;
        inString = false;
        escaped = false;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        addJsonCandidate(candidates, text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return candidates;
}

function extractJsonObject(text) {
  const source = stripReasoningText(text);
  const candidates = [];
  const fencedBlocks = source.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const fenced of fencedBlocks) {
    if (fenced?.[1]) addJsonCandidate(candidates, fenced[1]);
  }
  addJsonCandidate(candidates, source);
  balancedJsonObjectCandidates(source).forEach((candidate) => addJsonCandidate(candidates, candidate));

  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  if (first >= 0 && last > first) addJsonCandidate(candidates, source.slice(first, last + 1));

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
	  const strongOnboardingIntent = hasStrongOnboardingIntentSignal(text);
	  if (humanUnderstanding.wantsTradingCostWorkbench) {
	    primaryIntent = "trader";
	  } else if (strongOnboardingIntent && primaryIntent !== "copytrading") {
	    primaryIntent = "onboarding";
	  } else if (!strongOnboardingIntent && hasExplicitDepositIntentSignal(text) && ranked.some((item) => item.intent === "deposit" && item.score > 0)) {
	    primaryIntent = "deposit";
	  }
	  if (
	    humanUnderstanding.wantsMatureBrokerTrust &&
	    primaryIntent !== "deposit" &&
	    !textHasAny(text, ["新手", "新客", "刚注册", "未完成实名", "未实名", "kyc", "账户开通", "开通进度"])
	  ) {
	    primaryIntent = "brand";
	  }
	  const selectedRank = ranked.find((item) => item.intent === primaryIntent) || ranked[0] || { score: 0, matchedSignals: [] };
	  const topScore = fallback ? 0 : selectedRank.score;
  const secondaryIntents = ranked
    .filter((item) => item.intent !== primaryIntent && item.score > 0)
    .slice(0, 3)
    .map((item) => item.intent);
  const preset = HOMEPAGE_INTENT_PRESETS[primaryIntent] || HOMEPAGE_INTENT_PRESETS.standard;
  const confidence = fallback ? "fallback" : Math.max(0.45, Math.min(0.96, Number((0.52 + Number(topScore || 0) / 80).toFixed(2))));
  let label = preset.label;
  let layoutPreset = preset.layoutPreset;
  let themePreset = preset.themePreset;
  let density = preset.density;
	  let heroFocus = preset.heroFocus;
	  let primaryGoal = preset.primaryGoal;
	  const explicitRequiredBlocks = [...aiHtmlExplicitRequiredBlocksFromPrompt(source)];
	  let mustHave = [...new Set((preset.mustHave || []).concat(explicitRequiredBlocks))];

  if (humanUnderstanding.wantsProfessionalTraderWorkbench) {
    label = "专业交易客户首页";
    layoutPreset = "tradingCommand";
    themePreset = humanUnderstanding.wantsLightBlue ? "blueFinance" : "blueFinance";
    density = "balanced";
    heroFocus = "trading_accounts_list";
    primaryGoal = "首屏先呈现交易账号状态、账户表现图表、持仓入口和 MT5 操作入口，而不是成本看板。";
    mustHave = [...new Set(["trading_accounts_list", "trading_account_highlight", "quick_actions"].concat(mustHave))];
  }

  if (humanUnderstanding.wantsFaqSection) {
    mustHave = [...new Set(mustHave.concat("faq_section"))];
  }

  return {
    primaryIntent,
    secondaryIntents,
    confidence,
    score: topScore,
    label,
    layoutPreset,
    themePreset,
    density,
    heroFocus,
    primaryGoal,
    mustHave,
    avoid: [...new Set(preset.avoid || [])],
    governance: homepageGovernanceContract(primaryIntent),
	    matchedSignals: fallback ? [] : selectedRank.matchedSignals,
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
	      { id: "trader-performance", type: "full", title: "账号表现", slots: ["accountPerformance"] },
	      { id: "trader-context", type: "split", title: "账户上下文", slots: ["userKycRail", "balanceTotal"] },
	      { id: "trader-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
	    ],
	    insight: [
	      { id: "insight-performance", type: "full", title: "账户表现", slots: ["accountPerformance"] },
	      { id: "insight-hero", type: "split", title: "市场洞察", slots: ["marketInsight"] },
	      { id: "insight-health", type: "split", title: "健康检查", slots: ["balanceTotal", "risk_disclosure", "fundActions"] },
	      { id: "insight-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
	    ],
	    deposit: [
	      { id: "deposit-hero", type: "hero", title: "入金奖励", slots: ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"] },
	      { id: "deposit-actions", type: "split", title: "快捷入口", slots: ["quickActions"] },
	      { id: "deposit-performance", type: "full", title: "账号表现", slots: ["accountPerformance"] },
	      { id: "deposit-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
	    ],
	    risk: [
	      { id: "risk-performance", type: "full", title: "账号表现", slots: ["accountPerformance"] },
	      { id: "risk-hero", type: "split", title: "风险状态", slots: ["risk_disclosure"] },
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
      ...(wantsWalletList ? [{ id: "growth-wallets", type: "full", title: "钱包列表", slots: ["wallet_list"] }] : []),
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
      { id: "brand-trust-hero", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
      { id: "brand-wallets", type: "full", title: "钱包列表", slots: ["wallet_list"] },
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
  const wantsFlatAccountOptimization =
    /简洁|扁平|平铺|降噪|少重点|主次|视觉优化|排版不行|指标(?:排版|布局)|模块内[\s\S]{0,12}模块|不要[\s\S]{0,12}嵌套|小卡片[\s\S]{0,18}(?:模块太多|重点太多|信息太多)|卡片[\s\S]{0,18}(?:模块太多|重点太多|信息太多)/.test(rawPrompt);
  const wantsAccountCardRefinement = /交易账(?:号|户)[\s\S]{0,36}卡片|账号卡片|账户卡片|小卡片|卡片[\s\S]{0,18}(?:排版|视觉|优化|模块太多|重点太多|信息太多)/.test(rawPrompt);
  const wantsGold = /淡金|浅金|轻金|香槟金|金色|金色调|gold/.test(text);
  const wantsWalletList = /钱包列表|多币种钱包/.test(text);
  const wantsSeparatedAccounts = /真实账号|模拟账号|两个列表|分开|live|demo/.test(text);
  const rejectsAccountCards = /卡片[\s\S]{0,8}(?:不要|不能|不应|别|禁止)|(?:不要|不能|不应|别|禁止)[\s\S]{0,16}卡片/.test(rawPrompt);
  const wantsAccountPerformanceLine =
    /账号表现|账户表现|账号净值|账户净值|净值曲线|权益曲线|账号盈亏|账户盈亏|交易图表/.test(text) ||
    (/(7日|7 日|30日|30 日|7d|30d)/i.test(text) && /账号|账户/.test(text) && /净值|权益|pnl|盈亏|走势|曲线/i.test(text));
  const wantsAccountSingleViewCorrection =
    /交易账(?:号|户)[\s\S]{0,48}(?:重复|叠加|两套|同时|混在一起|上方[\s\S]{0,16}下方|卡片[\s\S]{0,16}表格|摘要[\s\S]{0,16}表格)|账号卡片[\s\S]{0,28}(?:重复|叠加|表格|模块太多|重点太多|信息太多)|小卡片[\s\S]{0,28}(?:模块太多|重点太多|信息太多)|卡片(?:的)?问题|内容重复|模块套模块/.test(rawPrompt);
  const wantsAccountList =
    /交易账号列表|交易账户列表|账号列表|账户列表|账(?:号|户)[\s\S]{0,16}用列表|account list/.test(text) ||
    wantsAccountSingleViewCorrection ||
    (wantsFlatAccountOptimization && !wantsAccountCardRefinement);
  const wantsWelcome = /欢迎|welcome/.test(text);
  const wantsRealAccountCards = !rejectsAccountCards && /真实(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片|卡片[\s\S]{0,32}真实(?:交易)?账(?:号|户)/.test(String(payload.prompt || ""));
  const wantsDemoAccountCards = !rejectsAccountCards && /模拟(?:交易)?账(?:号|户)[\s\S]{0,32}卡片|卡片[\s\S]{0,32}模拟(?:交易)?账(?:号|户)|demo[\s\S]{0,32}card/i.test(String(payload.prompt || ""));
  const wantsDemoAccountList = /模拟(?:交易)?账(?:号|户)[\s\S]{0,32}列表|demo\s*(account\s*)?list/i.test(String(payload.prompt || ""));
  const wantsMixedAccountPresentation = wantsRealAccountCards && wantsDemoAccountList && !wantsDemoAccountCards;
  const wantsAccountCardMode = wantsAccountCardRefinement && !wantsAccountList;
  const design = homepageDesignForIntent(intent);
  const onboardingPresentation = onboardingPresentationFromText(text, design.designGenome, Number(payload.variant || 0));
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
    { brickId: "assetOverview.tickerStrip", brickName: "三项资产汇总", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "main", reason: "资产概览只展示余额合计、交易账号余额和钱包余额汇总。" },
    { brickId: "quickActions.taskRail", brickName: "快捷入口侧栏", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "快捷入口与资产概览同行，减少右侧空白。" },
    { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "wallet_list", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包卡片只在钱包列表模块展示。" },
    { brickId: "accountPerformance.proChart", brickName: "账号表现图表", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账户表现图表独占整横栏承载账号上下文、趋势和指标。" },
    { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "1x2", zone: "rail", reason: "把保证金、杠杆和风险提示放到侧栏提醒。" },
    { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "交易账号列表作为下方管理区完整承接。" },
    ],
    trader: [
      { brickId: "quickActions.commandBar", brickName: "交易命令栏", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "3x1", zone: "hero", reason: "专业交易首页先给订单、持仓和 MT5 高频入口。" },
      { brickId: "accountPerformance.sparklineBoard", brickName: "Sparkline 指挥看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "权益和 PnL 曲线作为交易判断依据，需要整横栏展示。" },
      { brickId: "userKycRail.profileWallet", brickName: "用户/KYC 钱包侧栏", family: "UserKycRail", feature: "userKycRail", component: "user_kyc_rail", size: "1x2", zone: "rail", reason: "右侧保留状态和钱包摘要。" },
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "full", reason: "资产指标压缩成横条，避免抢交易账号区域。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号列表完整展示。" },
    ],
    insight: [
      { brickId: "accountPerformance.sparklineBoard", brickName: "Sparkline 指挥看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "数据洞察首页先看账户表现和 PnL，图表独占整横栏。" },
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
      { brickId: "accountPerformance.proChart", brickName: "账号轻趋势", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账号区保留轻量趋势，独占整横栏并降噪。" },
      { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "账号信息作为整栏证明区承接，不抢首屏入金主线。" },
    ],
    risk: [
      { brickId: "accountPerformance.sparklineBoard", brickName: "Sparkline 指挥看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "风险首页先展示权益和 PnL 波动，图表独占整横栏。" },
      { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "1x2", zone: "rail", reason: "保证金和风险提示需要首屏提醒。" },
      { brickId: "marketInsight.healthPanel", brickName: "账户健康洞察", family: "MarketInsight", feature: "marketInsight", component: "market_insight", size: "1x2", zone: "rail", reason: "补充市场和账户健康指标。" },
      { brickId: "assetOverview.compactMetrics", brickName: "紧凑资产指标条", family: "AssetOverview", feature: "balanceTotal", component: "asset_summary", size: "3x1", zone: "full", reason: "资产指标保留但降权。" },
      { brickId: "userKycRail.profileWallet", brickName: "用户/KYC 钱包侧栏", family: "UserKycRail", feature: "userKycRail", component: "user_kyc_rail", size: "1x2", zone: "rail", reason: "客户状态用于客服跟进。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "风险排查需要账号列表。" },
    ],
    onboarding: [
      { brickId: onboardingPresentation.brickId, brickName: onboardingPresentation.brickName, family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_progress", size: "2x1", zone: "hero", reason: onboardingPresentation.reason },
      { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "真实、模拟和绑定账号集中处理。" },
      { brickId: "createAccountForm.realAccount", brickName: "真实账户创建表单", family: "CreateAccountForm", feature: "createAccountForm", component: "create_account_form", size: "1x2", zone: "rail", reason: "直接创建真实账号。" },
      { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "main", reason: "首次入金动作靠前。" },
      { brickId: "quickActions.taskRail", brickName: "下一步任务按钮组", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "高频动作转成下一步任务。" },
      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "tradingAccounts", component: "account_list", size: "3x2", zone: "full", reason: "账号列表放下方承接开户结果。" },
    ],
    copytrading: [
      { brickId: "copytradingSignals.curveCards", brickName: "AI 跟单信号源推荐", family: "CopytradingSignals", feature: "copytrading_signals", component: "copytrading_signals", size: "2x2", zone: "hero", reason: "跟单推荐进入首屏，必须展示信号源、收益率、总收益和曲线。" },
      { brickId: onboardingPresentation.brickId, brickName: onboardingPresentation.brickName, family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_progress", size: "2x1", zone: "main", reason: onboardingPresentation.reason },
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
      { brickId: "referralLinkCard.compact", brickName: "推广链接", family: "ReferralLinkCard", feature: "referral_link_card", component: "referral_link_card", size: "1x1", zone: "rail", reason: "IB 首页仅轻量展示推广链接、邀请码和可选基础统计。" },
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
      { brickId: "assetOverview.tickerStrip", brickName: "三项资产汇总", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "main", reason: "首屏先呈现余额合计、交易账号余额和钱包余额汇总。" },
      { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "快捷入口与资产概览同行，避免侧栏空白。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "wallet_list", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包用卡片列表展示，且不进入资产概览。" },
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
    asset: ["AI 资产运营控制台", design.layoutPreset, "blueFinance", "balanced", "asset_overview", "资产管理首页：资产概览只做三项汇总，多币种钱包放入钱包列表。"],
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
  const quickPresentation = quickActionPresentationForServerIntent(intent, design.designGenome, rawPrompt, Number(payload.variant || 0));
  const personalizedPlan = plan.map((item) => {
    if (item.component !== "quick_actions" && item.family !== "QuickActions") return item;
    return {
      ...item,
      brickId: quickPresentation.brickId || item.brickId,
      brickName: quickPresentation.brickName || item.brickName,
      reason: quickPresentation.reason || item.reason,
    };
  });

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
    colorMode: homeColorModeFromPrompt(rawPrompt),
    density: meta[3],
    personalizationStrength: isVip || isGrowth || intent === "brand" || intent === "copytrading" || textHasAny(text, ["个性化", "意图", "风格", "分格", "更多方案", "多方案", "样式更多"]) ? "strong" : "medium",
    heroFocus: meta[4],
    brickPlan: personalizedPlan,
    brickTrace: { intent, strategy: meta[0].replace(/^AI\s*/, ""), score: 90, selectedCount: personalizedPlan.length, source: "mock" },
	    sections: isAsset
	      ? [
	          { id: "asset-overview", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
	          { id: "asset-wallets", type: "full", title: "多币种钱包", slots: ["wallet_list"] },
	          { id: "asset-performance", type: "full", title: "账户表现", slots: ["accountPerformance"] },
	          { id: "asset-risk", type: "full", title: "风险提示", slots: ["risk_disclosure"] },
	          { id: "asset-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
	        ]
      : mockSectionsForIntent(intent, personalizedPlan, wantsWelcome, wantsWalletList),
    modules: {
      AssetOverview: { variant: isVip ? "wealthPlate" : isTrader ? "darkTerminal" : isAsset || intent === "brand" ? "tickerStrip" : "standard" },
      WalletBalance: { variant: isVip ? "premiumCard" : "splitCurrency" },
      QuickActions: { variant: quickPresentation.variant },
      PromotionBanner: { variant: intent === "deposit" ? "depositLadder" : design.designGenome === "magazineCampaign" ? "editorialCover" : isVip ? "blackGoldVip" : isGrowth || isPartner ? "gradientHero" : "splitVisual" },
      AccountPerformance: { variant: wantsFlatAccountOptimization ? "cleanSnapshot" : wantsAccountPerformanceLine ? "proChart" : intent === "deposit" ? "cleanSnapshot" : design.designGenome === "tradingCommand" ? "sparklineBoard" : intent === "insight" ? "cleanSnapshot" : "proChart" },
      WalletList: { variant: design.designGenome === "accountOpsConsole" ? "walletTiles" : "currencyTable" },
      TradingAccounts: {
        variant: wantsFlatAccountOptimization && wantsAccountList
          ? "separatedList"
          : intent === "deposit"
          ? "accountWall"
          : design.designGenome === "magazineCampaign"
          ? "accountWall"
          : wantsAccountCardMode
          ? "denseCards"
          : design.designGenome === "tradingCommand" || intent === "brand"
          ? "opsTable"
          : isAsset || isTrader
          ? "separatedList"
          : "denseCards",
      },
      OpenAccount: { variant: intent === "deposit" || intent === "brand" || design.designGenome === "onboardingJourney" ? "conversionPanel" : "sidePanel" },
      OnboardingProgress: { variant: isOnboarding || intent === "copytrading" || intent === "retention" ? onboardingPresentation.variant : "checklist" },
      CopytradingSignals: { variant: "curveCards" },
      ReferralLinkCard: { variant: intent === "partner" ? "compactCard" : "compactCard" },
    },
    moduleStyles: {
      balanceTotal: isVip ? "wealth-plate" : design.designGenome === "tradingCommand" ? "ticker-strip" : isAsset || intent === "brand" ? "ticker-strip" : "command",
      fundActions: "split-buttons",
      openAccountActions: intent === "deposit" || intent === "brand" || design.designGenome === "onboardingJourney" ? "conversion-panel" : "horizontal",
      onboardingProgress: isOnboarding || intent === "copytrading" || intent === "retention" ? onboardingPresentation.style : isGrowth ? "checklist" : "path",
      promoHighlight: intent === "deposit" ? "deposit-ladder" : isGrowth ? "scoreboard" : "clean",
      adCarousel: design.designGenome === "magazineCampaign" ? "editorial-cover" : wantsGold ? "clean" : isVip || isGrowth ? "immersive" : "clean",
      quickActions: quickPresentation.style,
      quick_actions: quickPresentation.style,
      referral_link_card: intent === "partner" ? "compact-card" : "compact-card",
      copytrading_signals: "curve-cards",
      tradingAccounts: wantsFlatAccountOptimization && wantsAccountList ? "calm-table" : wantsAccountCardMode ? "dense-cards" : intent === "deposit" ? "account-wall" : design.designGenome === "magazineCampaign" ? "account-wall" : design.designGenome === "tradingCommand" || isAsset || intent === "brand" ? "ops-table" : "dense-cards",
      accountPerformance: wantsFlatAccountOptimization ? "pro-chart" : wantsAccountPerformanceLine ? "pro-chart" : design.designGenome === "tradingCommand" ? "sparkline-board" : "pro-chart",
      walletList: design.designGenome === "accountOpsConsole" ? "wallet-tiles" : "currency-table",
    },
    componentMorphs: {
      AssetOverview: { variant: isVip ? "wealthPlate" : isAsset || intent === "brand" ? "tickerStrip" : isTrader ? "darkTerminal" : "standard" },
      QuickActions: { variant: quickPresentation.variant },
      PromotionBanner: { variant: intent === "deposit" ? "depositLadder" : design.designGenome === "magazineCampaign" ? "editorialCover" : "splitVisual" },
      TradingAccounts: {
        variant: wantsFlatAccountOptimization && wantsAccountList
          ? "separatedList"
          : wantsAccountCardMode
          ? "denseCards"
          : design.designGenome === "tradingCommand" || intent === "brand"
          ? "opsTable"
          : design.designGenome === "magazineCampaign"
          ? "accountWall"
          : "separatedList",
      },
    },
    moduleSettings: {
      adCarousel: { enabled: ["growth", "partner", "vip", "deposit", "retention"].includes(intent) },
      quickActions: {
        enabled: intent !== "risk",
        count: intent === "deposit" ? Math.max(4, quickPresentation.count) : intent === "brand" ? 5 : isTrader || intent === "mobile" ? 6 : quickPresentation.count,
        display: quickPresentation.display,
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
      wallet: { enabled: intent === "deposit" ? true : !(isGrowth && wantsGold), placement: "standalone", showFundActions: false },
      assets: {
        enabled: intent === "deposit" ? false : !(isGrowth && wantsGold),
        visibleFields: ["total", "tradingAccount", "wallet"],
        showFundActions: intent === "deposit" ? true : false,
        showAccountBreakdown: true,
        showWalletBreakdown: true,
        showAvailable: false,
        showMargin: false,
        showRiskLevel: false,
        wallets: isAsset || intent === "brand" ? ["USD", "EUR", "USDT"] : [],
      },
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
        demoEnabled: true,
        grouping: wantsAccountCardMode ? (wantsRealAccountCards || wantsDemoAccountCards ? "separated" : "combined") : intent === "brand" ? "combined" : isAsset || isTrader || wantsSeparatedAccounts || wantsAccountList || wantsMixedAccountPresentation ? "separated" : "combined",
        viewMode: wantsAccountCardMode ? "card" : intent === "brand" || wantsAccountList ? "list" : intent === "deposit" || wantsRealAccountCards || wantsDemoAccountCards || wantsMixedAccountPresentation ? "card" : isAsset || isTrader || wantsSeparatedAccounts ? "list" : "switchable",
        realViewMode: wantsAccountCardMode ? "card" : intent === "brand" || wantsAccountList ? "list" : wantsRealAccountCards || wantsMixedAccountPresentation ? "card" : isAsset || isTrader || wantsSeparatedAccounts ? "list" : "card",
        demoViewMode: wantsAccountCardMode ? "card" : intent === "brand" || wantsAccountList ? "list" : wantsDemoAccountCards ? "card" : wantsMixedAccountPresentation ? "list" : isAsset || isTrader || wantsSeparatedAccounts ? "list" : "card",
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
    aiSummary: `Mock 预览：当前服务启用了 HOME_AI_MOCK，未调用 ${providerConfig.name} / ${providerConfig.model} 真实模型；本地生成${meta[5]}`,
  };
}

function textHasAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function onboardingPresentationFromText(text, designGenome = "", variant = 0) {
  const source = normalizeKeywordText(text);
  const wantsSpaceEfficiency = textHasAny(source, ["大面积空白", "空白区域", "大空白", "少留白", "减少留白", "不要留白", "压缩留白", "空间利用", "利用空间", "空间利用率", "省空间", "压缩高度"]);
  const wantsCards = textHasAny(source, ["卡片", "路径卡", "任务卡", "图标", "icon", "美观", "精美", "欲望", "多种形式", "不一定", "方格"]);
  const wantsTimeline = textHasAny(source, ["旅程", "时间线", "横向", "交易大师", "journey", "timeline"]);
  const wantsChecklist = textHasAny(source, ["清单", "checklist", "列表"]);
  const wantsCompact = textHasAny(source, ["紧凑", "compact", "小卡", "侧栏"]);
  const wantsMissionBoard = textHasAny(source, ["开通进度", "账户开通", "进度面板", "0/3", "1/3", "完成以下", "任务面板", "progress board"]);
  const wantsRibbon = textHasAny(source, ["票据", "里程碑", "ribbon", "低高度路径", "横条路径"]);
  const wantsNextStepHero = textHasAny(source, ["下一步主", "主按钮", "主行动", "强引导", "cta", "直接推动"]);
  const wantsCreative = textHasAny(source, ["创意", "更好的方案", "样式很多", "很多选", "多种样式", "样式更多", "icon不好看", "图标不好看", "高级", "精致", "不要模板"]);
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
    const seed = hashServerText(`${source}:${designGenome}:${variant}:onboarding-presentation`);
    return presentationMap[keys[Math.abs(seed) % keys.length]];
  };

  if (wantsSpaceEfficiency) return presentationMap.compact;
  if (wantsMissionBoard) return presentationMap.missionBoard;
  if (wantsNextStepHero) return presentationMap.nextStepHero;
  if (wantsRibbon) return presentationMap.ribbonRail;
  if (wantsCreative) return pick(["missionBoard", "nextStepHero", "guideCards", "ribbonRail"]);
  if (wantsCards) return pick(["guideCards", "missionBoard", "nextStepHero"]);
  if (wantsTimeline) return pick(["missionBoard", "ribbonRail", "journeyTimeline"]);
  if (designGenome === "onboardingJourney") return pick(["missionBoard", "nextStepHero", "ribbonRail", "guideCards"]);

  if (wantsCompact) return { ...presentationMap.compact, reason: "保留进度但压缩模块面积。" };
  if (wantsChecklist) return presentationMap.checklist;
  return presentationMap.checklist;
}

function inferKycStatusFromText(text, fallback = "verified") {
  const source = String(text || "").toLowerCase();
  if (!source) return fallback;
  if (/拒绝|驳回|未通过|rejected|declined/i.test(source)) return "rejected";
  if (/待审|待审核|审核中|reviewing|under review/i.test(source)) return "reviewing";
  if (/未提交|未实名|未认证|未完成实名|kyc\s*未|待\s*kyc|pending/i.test(source)) return "pending";
  if (/通过|已通过|已认证|verified|approved/i.test(source)) return "verified";
  if (textHasAny(source, ["新手", "新客", "新用户", "刚注册", "开户注册", "账户开通", "开通进度"])) return "pending";
  return fallback;
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
  next.tradingAccounts = {
    ...ensureObject(next.tradingAccounts),
    enabled: true,
    realEnabled: true,
    demoEnabled: true,
  };
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
  const explicitCostBoard =
    /(?:首屏|首页|第一屏|核心|重点|突出|主打|围绕|优先)[\s\S]{0,24}(?:交易成本|成本效率|执行效率|点差佣金|点差|佣金|cost)/i.test(source) ||
    /(?:交易成本|成本效率|执行效率|点差佣金|点差|佣金|cost)[\s\S]{0,24}(?:看板|工作台|首屏|核心|重点|突出|主打|优先|board|workbench)/i.test(source) ||
    /cost[\s_-]*(?:board|workbench)|spread[\s\S]{0,16}commission|点差[\s\S]{0,16}佣金[\s\S]{0,16}看板/i.test(source);
  const hasCostSignal = explicitCostBoard && textHasAny(text, ["交易成本", "成本效率", "执行效率", "点差", "佣金", "eurusd", "spread", "commission", "cost"]);
  const hasTraderSignal = textHasAny(text, ["专业交易", "交易工作台", "mt5", "持仓", "pnl", "保证金占用"]);
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
  const text = `${source.toLowerCase()} ${source}`;
  if (hasStrongOnboardingIntentSignal(source)) return false;
  const explicitWorkbench = textHasAny(text, ["专业交易客户首页", "专业交易客户", "交易客户首页", "交易工作台", "专业交易首页"]);
  const accountStatusSignal = textHasAny(text, ["交易账号状态", "账号状态", "交易账户状态", "交易账号"]);
  const performanceSignal = textHasAny(text, ["账户表现图表", "账户表现", "账号表现", "净值曲线", "权益曲线", "pnl"]);
  const operationSignal = textHasAny(text, ["持仓入口", "持仓", "mt5 操作入口", "mt5操作入口", "mt5"]);
  const comboCount = [accountStatusSignal, performanceSignal, operationSignal].filter(Boolean).length;
  const traderGoal = explicitWorkbench && comboCount >= 2;
  const firstScreenStack =
    /首屏[\s\S]{0,90}(交易账(?:号|户)状态|账(?:号|户)状态)[\s\S]{0,90}(账(?:号|户)表现|表现图表)[\s\S]{0,90}(持仓|mt5)/i.test(source) ||
    textHasAny(text, ["交易账号状态", "账户表现图表", "持仓入口", "mt5 操作入口", "mt5操作入口"]);
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

function wantsServerTradingAccountCards(prompt) {
  const source = String(prompt || "");
  if (/卡片[\s\S]{0,8}(?:不要|不能|不应|别|禁止)|(?:不要|不能|不应|别|禁止)[\s\S]{0,16}卡片/.test(source)) return false;
  return /真实(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片|模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片|交易账(?:号|户)[\s\S]{0,24}卡片|card/i.test(source);
}

function wantsServerTradingAccountList(prompt) {
  const source = String(prompt || "");
  return (
    wantsServerTradingAccountSingleViewCorrection(source) ||
    /交易账(?:号|户)[\s\S]{0,24}(?:列表|表格|用列表)|账(?:号|户)[\s\S]{0,16}(?:列表|表格|用列表)|列表形式|表格形式|不是卡片|非卡片|live\s*(account\s*)?list|demo\s*(account\s*)?list/i.test(source)
  );
}

function wantsServerTradingAccountSingleViewCorrection(prompt) {
  const source = String(prompt || "");
  return /交易账(?:号|户)[\s\S]{0,48}(?:重复|叠加|两套|同时|混在一起|上方[\s\S]{0,16}下方|卡片[\s\S]{0,16}表格|摘要[\s\S]{0,16}表格)|账号卡片[\s\S]{0,28}(?:重复|叠加|表格|模块太多|重点太多|信息太多)|小卡片[\s\S]{0,28}(?:模块太多|重点太多|信息太多)|卡片(?:的)?问题|内容重复|模块套模块/.test(source);
}

function wantsServerTradingAccountVariety(prompt) {
  const source = String(prompt || "");
  return /交易账(?:号|户)[\s\S]{0,40}(?:灵活|变化|智能|多版式|多种样式|不固定|不要总是卡片)|(?:卡片|card)[\s\S]{0,16}(?:列表|表格|list|table)|(?:列表|表格|list|table)[\s\S]{0,16}(?:卡片|card)|耳目一新|明显区别|明显差异|不沿用上一版|不要沿用上一版|不要只换颜色|不能只是换颜色|布局骨架|重排模块|重排\s*sections/i.test(source);
}

function wantsServerFlatAccountOptimization(prompt) {
  const source = String(prompt || "");
  return /简洁|扁平|平铺|降噪|少重点|主次|视觉优化|排版不行|指标(?:排版|布局)|模块内[\s\S]{0,12}模块|不要[\s\S]{0,12}嵌套|小卡片[\s\S]{0,18}(?:模块太多|重点太多|信息太多)|卡片[\s\S]{0,18}(?:模块太多|重点太多|信息太多)/.test(source);
}

function wantsServerAccountCardRefinement(prompt) {
  const source = String(prompt || "");
  return /交易账(?:号|户)[\s\S]{0,36}卡片|账号卡片|账户卡片|小卡片|卡片[\s\S]{0,18}(?:排版|视觉|优化|模块太多|重点太多|信息太多)/.test(source);
}

function applyServerTradingAccountPresentationVariety(config, prompt, options = {}) {
  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  if (!settings.tradingAccounts?.enabled) return;

  const wantsFlatOptimization = wantsServerFlatAccountOptimization(prompt);
  const forceList = wantsServerTradingAccountSingleViewCorrection(prompt);
  const refineCards = wantsServerAccountCardRefinement(prompt) && !wantsServerTradingAccountList(prompt) && !forceList;
  const keepSeparatedCards = wantsServerTradingAccountCards(prompt) || /模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(String(prompt || ""));
  if (wantsFlatOptimization || forceList) {
    settings.tradingAccounts = refineCards
      ? { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true, grouping: keepSeparatedCards ? "separated" : "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" }
      : { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" };
    config.modules = {
      ...ensureObject(config.modules),
      AccountPerformance: { variant: "cleanSnapshot" },
      TradingAccounts: { variant: refineCards ? "denseCards" : "separatedList" },
    };
    config.moduleStyles = { ...ensureObject(config.moduleStyles), accountPerformance: "pro-chart", tradingAccounts: refineCards ? "dense-cards" : "calm-table" };
    config.moduleSettings = settings;
    if (!refineCards) return;
  }

  const wantsVariety = Boolean(options.forceVariety) || wantsServerTradingAccountVariety(prompt) || extractHomepageUnderstanding(prompt).wantsFreshLayout;
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

  const candidates = options.preferNonCard
    ? [
        ["opsTable", "ops-table", { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
        ["separatedList", "calm-table", { grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
        ["workbench", "workbench", { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
      ]
    : [
    ["opsTable", "ops-table", { grouping: "combined", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
    ["separatedList", "calm-table", { grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" }],
    ["workbench", "workbench", { grouping: "combined", viewMode: "switchable", realViewMode: "card", demoViewMode: "list" }],
    ["accountWall", "account-wall", { grouping: "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" }],
  ];
  const [variant, style, accountSettings] = candidates[hashServerText(`${prompt}:${config.designGenome}:${config.pageStory}:${config.layoutPreset}`) % candidates.length];
  settings.tradingAccounts = { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true, ...accountSettings };
  config.modules = { ...ensureObject(config.modules), TradingAccounts: { variant } };
  config.moduleStyles = { ...ensureObject(config.moduleStyles), tradingAccounts: style };
  config.moduleSettings = settings;
}

function quickActionPresentationForServerIntent(intent, designGenome, prompt = "", variant = 0) {
  const source = dominantPromptText(prompt);
  const text = `${String(source || "").toLowerCase()} ${String(source || "")}`;
  const wantsModuleFeeling = textHasAny(text, ["每一个", "每个", "加框", "框", "背景色", "卡片", "模块", "磁贴", "按钮"]);
  const wantsStyleVariety = textHasAny(text, ["个性化", "意图", "风格", "分格", "更多方案", "多方案", "多种样式", "样式更多"]);
  const pools = {
    trader: [
      { variant: "commandBar", style: "command-bar", count: 6, display: "iconText", brickId: "quickActions.commandBar", brickName: "交易命令栏" },
      { variant: "segmentedMenu", style: "segmented-panel", count: 6, display: "iconText", brickId: "quickActions.segmentedPanel", brickName: "快捷入口分段面板" },
      { variant: "compactMenu", style: "compact-menu", count: 6, display: "iconText", brickId: "quickActions.compactMenu", brickName: "紧凑快捷菜单" },
    ],
    insight: [
      { variant: "segmentedMenu", style: "segmented-panel", count: 6, display: "iconText", brickId: "quickActions.segmentedPanel", brickName: "快捷入口分段面板" },
      { variant: "compactMenu", style: "compact-menu", count: 6, display: "iconText", brickId: "quickActions.compactMenu", brickName: "紧凑快捷菜单" },
    ],
    onboarding: [
      { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", brickName: "下一步任务按钮组" },
      { variant: "accentCards", style: "accent-cards", count: 5, display: "iconText", brickId: "quickActions.accentCards", brickName: "强调快捷入口卡" },
    ],
    copytrading: [
      { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", brickName: "五项快捷入口" },
      { variant: "tileCards", style: "tile-board", count: 5, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
    ],
    growth: [
      { variant: "accentCards", style: "accent-cards", count: 8, display: "iconText", brickId: "quickActions.accentCards", brickName: "强调快捷入口卡" },
      { variant: "priorityButtons", style: "compact-grid", count: 8, display: "iconText", brickId: "quickActions.priorityMatrix", brickName: "转化快捷矩阵" },
      { variant: "tileCards", style: "tile-board", count: 8, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
    ],
    partner: [
      { variant: "accentCards", style: "accent-cards", count: 8, display: "iconText", brickId: "quickActions.accentCards", brickName: "强调快捷入口卡" },
      { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
    ],
    deposit: [
      { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", brickName: "快捷入口" },
      { variant: "accentCards", style: "accent-cards", count: 5, display: "iconText", brickId: "quickActions.accentCards", brickName: "强调快捷入口卡" },
    ],
    retention: [
      { variant: "segmentedMenu", style: "segmented-panel", count: 5, display: "iconText", brickId: "quickActions.segmentedPanel", brickName: "快捷入口分段面板" },
      { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", brickName: "下一步任务按钮组" },
    ],
    mobile: [
      { variant: "compactMenu", style: "compact-menu", count: 5, display: "iconText", brickId: "quickActions.compactMenu", brickName: "紧凑快捷菜单" },
      { variant: "actionDock", style: "toolbar", count: 5, display: "iconText", brickId: "quickActions.actionDock", brickName: "交易操作 Dock" },
    ],
    vip: [
      { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
      { variant: "actionDock", style: "toolbar", count: 6, display: "iconText", brickId: "quickActions.actionDock", brickName: "交易操作 Dock" },
    ],
    asset: [
      { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
      { variant: "segmentedMenu", style: "segmented-panel", count: 5, display: "iconText", brickId: "quickActions.segmentedPanel", brickName: "快捷入口分段面板" },
    ],
    brand: [
      { variant: "tileCards", style: "tile-board", count: 5, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
      { variant: "taskRail", style: "task-rail", count: 5, display: "iconText", brickId: "quickActions.taskRail", brickName: "五项快捷入口" },
    ],
    standard: [
      { variant: "gridCards", style: "matrix", count: 6, display: "iconText", brickId: "quickActions.configDriven", brickName: "快捷入口卡片矩阵" },
      { variant: "tileCards", style: "tile-board", count: 6, display: "iconText", brickId: "quickActions.tileBoard", brickName: "快捷入口磁贴板" },
    ],
  };
  const key = pools[intent] ? intent : designGenome === "tradingCommand" ? "trader" : designGenome === "onboardingJourney" ? "onboarding" : "standard";
  const options = pools[key];
  let picked = options[hashServerText(`${source}:${intent}:${designGenome}:${variant}:${wantsStyleVariety ? "variety" : "stable"}`) % options.length];
  if (wantsModuleFeeling && ["toolbar", "matrix"].includes(picked.style)) {
    picked = options.find((item) => ["tile-board", "accent-cards", "segmented-panel", "task-rail"].includes(item.style)) || picked;
  }
  if (textHasAny(text, ["命令栏", "交易终端", "mt5", "专业交易"])) picked = pools.trader[0];
  if (textHasAny(text, ["紧凑", "移动端", "手机", "短入口"])) picked = pools.mobile[0];
  return {
    ...picked,
    reason: wantsStyleVariety
      ? "根据页面意图选择更个性化的快捷入口形态，并保证每个入口都有独立视觉模块。"
      : "按当前首页意图选择快捷入口形态，并保持每个入口有独立边界。",
  };
}

function applyServerQuickActionPresentation(config, settings, prompt, understanding = {}, options = {}) {
  const nextSettings = settings || ensureHomepageModuleSettings(config.moduleSettings);
  if (!nextSettings.quickActions?.enabled) return;
  const pageIntent = ensureObject(config.pageIntent);
  const intent = options.intent || pageIntent.primaryIntent || pageIntent.intent || ensureObject(config.brickTrace).intent || buildHomepageIntentProfile(prompt).primaryIntent || "standard";
  const presentation = quickActionPresentationForServerIntent(intent, config.designGenome || config.layoutPreset, prompt, options.variant || 0);
  config.modules = {
    ...ensureObject(config.modules),
    QuickActions: { variant: presentation.variant },
  };
  config.moduleStyles = {
    ...ensureObject(config.moduleStyles),
    quickActions: presentation.style,
    quick_actions: presentation.style,
  };
  nextSettings.quickActions = {
    ...ensureObject(nextSettings.quickActions),
    enabled: true,
    count: understanding.quickActionExact
      ? understanding.quickActionCount
      : Math.max(Number(nextSettings.quickActions?.count || 0), presentation.count),
    display: presentation.display,
  };
  if (Array.isArray(config.brickPlan)) {
    config.brickPlan = config.brickPlan.map((item) => {
      if (item?.component !== "quick_actions" && item?.family !== "QuickActions") return item;
      return {
        ...item,
        brickId: presentation.brickId || item.brickId,
        brickName: presentation.brickName || item.brickName,
        reason: presentation.reason || item.reason,
      };
    });
  }
  if (understanding.wantsStyleVariety || understanding.wantsQuickActionBoxes) {
    config.personalizationStrength = "strong";
  }
  config.moduleSettings = nextSettings;
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
  const wantsMinimalLight = textHasAny(text, ["极简", "极简白", "淡色", "浅色", "简洁白", "minimal", "white", "留白", "克制"]);
  const wantsFreshLayout = textHasAny(text, ["不沿用上一版", "不要沿用上一版", "布局骨架", "耳目一新", "不要只换颜色", "不能只是换颜色"]);
  const wantsStyleVariety = textHasAny(text, ["个性化", "意图", "风格", "分格", "更多方案", "多方案", "多种样式", "样式更多"]);
  const wantsQuickActionBoxes = textHasAny(text, ["快捷入口", "快捷操作"]) && textHasAny(text, ["每一个", "每个", "加框", "框", "背景色", "卡片", "模块", "磁贴", "按钮"]);
  const wantsSpaceEfficiency = textHasAny(text, ["大面积空白", "空白区域", "大空白", "少留白", "减少留白", "不要留白", "压缩留白", "空间利用", "利用空间", "空间利用率", "省空间", "压缩高度"]);
  const wantsCopyTrading = textHasAny(text, ["copytrading", "copy trading", "跟单", "信号源", "推荐交易员", "交易员推荐"]);
  const wantsPamm = textHasAny(text, ["pamm", "资管产品", "pamm产品", "资金管理产品"]);
  const wantsNewUserJourney = textHasAny(text, ["新手", "新客", "新用户", "刚注册", "开户", "开户注册", "账户开通", "开通进度", "注册", "首次"]);
  const wantsDemoAccountCard = /模拟(?:交易)?账(?:号|户)[\s\S]{0,16}卡片|demo[\s\S]{0,16}card/i.test(source);
  const wantsDemoAccountList = /模拟(?:交易)?账(?:号|户)[\s\S]{0,16}列表|demo[\s\S]{0,16}list/i.test(source);
  const recommendationMatch = source.match(/推荐编号\s*([a-z0-9_-]+)/i);
  const wantsTradingCostWorkbench = wantsTradingCostWorkbenchPrompt(source);
  const wantsProfessionalTraderWorkbench = wantsProfessionalTraderWorkbenchPrompt(source);
  const wantsTradingDataContract = wantsTradingDataContractPrompt(source);
  const wantsCombinedAccountCards = wantsCombinedTradingAccountCardsPrompt(source);
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
    wantsStyleVariety,
    wantsQuickActionBoxes,
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
    wantsFaqSection,
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
  slot = canonicalHomeBlock(slot) || slot;
  if (!slot || !CANONICAL_HOME_BLOCKS.includes(slot)) return;
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

function sanitizeHomepageAllowedBlocks(config, prompt = "", guidedIntake = null) {
  const next = ensureObject(config);
  const settings = ensureHomepageModuleSettings(next.moduleSettings);
  const text = `${String(prompt || "").toLowerCase()} ${String(prompt || "")}`;
  const wantsPamm = /pamm/i.test(text);
  const wantsCopyTrading = /copy\s*trading|copytrading|跟单|信号源/i.test(text);
  const wantsReferralCard = /代理用户|代理首页|\bib\b|合作伙伴|partner|affiliate|推广链接|推广功能|推广开户链接|邀请链接|邀请码|开户链接|注册链接|referral/i.test(text);
  const wantsReferralStats = /打开数|注册数|开户数|注册转化率|开户转化率|转化率|推广效果|基础统计|统计数据/.test(text);
  const wantsReferralCoreOnly = /(只|仅|只展示|仅展示).{0,16}(推广链接|邀请链接).{0,16}(邀请码)|不展示.{0,8}(统计|打开数|注册数|开户数|转化率)/.test(text);
  const rejectsAnnouncements = /(?:不要|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:公告|通知|维护|平台消息)/.test(text);
  const wantsAnnouncements = !rejectsAnnouncements && /公告|通知|维护|平台消息/.test(text);
  const wantsAnnouncementTicker = wantsAnnouncements && /跑马灯|滚动公告|公告滚动|首页第一栏|首栏公告|顶部公告/.test(text);
  const wantsMarketNews = /市场资讯|市场新闻|平台资讯|新手教程|交易教育|热门文章/.test(text);
  const rejectsRiskDisclosure = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:风险提示|风险披露|合规|保证金|杠杆|预警)/i.test(text);
  const rejectsFaq = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:faq|常见问题|问题解答|帮助中心)/i.test(text);
  const rejectsSupportContact = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:在线客服|客服|客户经理|咨询|服务入口)/i.test(text);
  const rejectsAppDownload = /(?:不要(?!编造)|不需要|去掉|移除|关闭|禁用|隐藏|别放).{0,24}(?:app|下载|移动端|手机端|mt5)/i.test(text);
  const wantsRiskDisclosure = !rejectsRiskDisclosure && /风险提示|风险披露|合规声明|合规说明|保证金|杠杆|爆仓|预警/.test(text);
  const wantsFaq = !rejectsFaq && /faq|常见问题|问题解答|帮助中心/.test(text);
  const wantsSupportContact = !rejectsSupportContact && /在线客服|联系客服|客服|客户经理|一对一协助|咨询入口|服务入口/.test(text);
  const wantsAppDownload = !rejectsAppDownload && /app下载|app 下载|下载 app|下载APP|移动端|手机端|mt5 下载|下载 mt5|download app/i.test(text);
  const wantsWalletList = /钱包列表|多币种钱包|钱包卡片|各钱包|wallet list/i.test(text);
  const requestedAssetFields = [];
  if (/total|总余额|余额总额|余额合计|总资产|总览/.test(text)) requestedAssetFields.push("total");
  if (/钱包/.test(text)) requestedAssetFields.push("wallet");
  if (/交易账(?:号|户).{0,8}余额|交易账号|交易账户/.test(text)) requestedAssetFields.push("tradingAccount");
  const exactAssetFields = /(只|仅|只展示|仅展示|只保留|不要展示|不展示)/.test(text) && requestedAssetFields.length;
  const allowsBlock = (slot) => guidedAllowsHomepageBlock(slot, guidedIntake, text);

  const normalizeSlots = (slots) => {
    const seen = new Set();
    return (Array.isArray(slots) ? slots : [])
      .map((slot) => canonicalHomeBlock(slot))
      .filter((slot) => slot !== "referral_link_card" || wantsReferralCard)
      .filter((slot) => allowsBlock(slot))
      .filter((slot) => slot && !seen.has(slot) && (seen.add(slot), true));
  };

  next.sections = splitLargeHomepageSections((Array.isArray(next.sections) ? next.sections : [])
    .map((section, index) => ({
      ...ensureObject(section),
      id: cleanText(section?.id, `section-${index + 1}`, 32),
      type: ["hero", "split", "full", "rail"].includes(section?.type) ? section.type : "full",
      title: cleanText(section?.title, "", 28),
      slots: normalizeSlots(section?.slots),
    }))
    .filter((section) => section.slots.length));

  if (!next.sections.length) {
    next.sections = [
      { id: "overview", type: "hero", title: "资产概览", slots: ["asset_overview", "quick_actions"] },
      { id: "account-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
      { id: "accounts", type: "full", title: "交易账户", slots: ["trading_accounts_list"] },
    ];
  }
  if (wantsWalletList && allowsBlock("wallet_list")) {
    ensureHomepageSectionContains(next, { id: "wallet-list", type: "full", title: "钱包列表" }, "wallet_list");
  }

  [
    wantsPamm && ["pamm", "split", "PAMM", "pamm_products"],
    wantsCopyTrading && ["copytrading", "split", "CopyTrading", "copytrading_signals"],
    wantsReferralCard && ["referral-link", "rail", "推广链接", "referral_link_card"],
    wantsAnnouncements && ["announcements", wantsAnnouncementTicker ? "full" : "split", "公告通知", "announcements"],
    wantsMarketNews && ["market-news", "full", "市场资讯", "market_news"],
    wantsRiskDisclosure && ["risk-disclosure", "rail", "风险提示", "risk_disclosure"],
    wantsFaq && ["faq", "split", "FAQ", "faq_section"],
    wantsSupportContact && ["support-contact", "rail", "在线客服", "support_contact"],
    wantsAppDownload && ["app-download", "rail", "APP 下载", "app_download"],
  ]
	    .filter(Boolean)
	    .filter(([, , , slot]) => allowsBlock(slot))
	    .forEach(([id, type, title, slot]) => ensureHomepageSectionContains(next, { id, type, title }, slot));
	  ensureHomepageSectionContains(next, { id: "trading-accounts", type: "full", title: "交易账号" }, "trading_accounts_list");
	  next.sections = splitLargeHomepageSections(next.sections);

	  next.layout = (Array.isArray(next.layout) ? next.layout : [])
    .map((block, index) => {
      const component = canonicalHomeBlock(block?.component);
      if (!component) return null;
      if (component === "referral_link_card" && !wantsReferralCard) return null;
      if (!allowsBlock(component)) return null;
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
      if (!allowsBlock(component) || !allowsBlock(feature)) return null;
      return {
        ...brick,
        feature,
        component,
        brickId: cleanText(brick?.brickId || `${component}.generated`, `${component}.generated`, 90),
        brickName: cleanText(brick?.brickName || brick?.name || component, component, 80),
        family: cleanText(brick?.family || brick?.brickFamily || component, component, 48),
        size: normalizeComponentSize(brick?.size || brick?.brickSize, component === "trading_accounts_list" ? "3x2" : "2x1"),
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
  settings.userKycRail = {
    ...ensureObject(settings.userKycRail),
    kycStatus: inferKycStatusFromText(text, settings.userKycRail?.kycStatus || "verified"),
  };
  settings.riskNotice = { ...ensureObject(settings.riskNotice), enabled: false };
  settings.openAccount = { ...ensureObject(settings.openAccount), bind: false };
	  settings.assets = {
	    ...ensureObject(settings.assets),
	    visibleFields: exactAssetFields
	      ? normalizeAssetVisibleFields(requestedAssetFields, ["total", "wallet", "tradingAccount"])
	      : normalizeAssetVisibleFields(settings.assets?.visibleFields, ["total", "wallet", "tradingAccount"]),
	  };
  if (!settings.assets.visibleFields.length) settings.assets.visibleFields = ["total"];
  settings.assets.showAccountBreakdown = settings.assets.visibleFields.includes("tradingAccount");
  settings.assets.showWalletBreakdown = settings.assets.visibleFields.includes("wallet");
  settings.assets.showAvailable = false;
  settings.assets.showMargin = false;
  settings.assets.showRiskLevel = false;
  settings.assets.showFundActions = false;
  if (sectionHasSlot(next.sections, "wallet_list") && !(Array.isArray(settings.assets.wallets) && settings.assets.wallets.length)) {
    settings.assets.wallets = ["USD", "EUR", "USDT"];
  }
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
  if (wantsAnnouncementTicker) {
    next.moduleStyles = { ...ensureObject(next.moduleStyles), announcements: "ticker-strip" };
    next.sections = next.sections
      .map((section) => ({ ...section, slots: (Array.isArray(section.slots) ? section.slots : []).filter((slot) => slot !== "announcements") }))
      .filter((section) => section.slots.length);
    next.sections.unshift({ id: "announcement-ticker", type: "full", title: "公告通知", slots: ["announcements"] });
  } else if (wantsAnnouncements) {
    next.moduleStyles = { ...ensureObject(next.moduleStyles), announcements: next.moduleStyles?.announcements || "list" };
  }
  settings.marketNews = { ...ensureObject(settings.marketNews), enabled: Boolean(settings.marketNews?.enabled || wantsMarketNews) };
  settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: Boolean(settings.riskDisclosure?.enabled || wantsRiskDisclosure || sectionHasSlot(next.sections, "risk_disclosure")) };
  settings.faq = { ...ensureObject(settings.faq), enabled: Boolean(settings.faq?.enabled || wantsFaq || sectionHasSlot(next.sections, "faq_section")) };
  settings.supportContact = { ...ensureObject(settings.supportContact), enabled: Boolean(settings.supportContact?.enabled || wantsSupportContact || sectionHasSlot(next.sections, "support_contact")) };
  settings.appDownload = { ...ensureObject(settings.appDownload), enabled: Boolean(settings.appDownload?.enabled || wantsAppDownload || sectionHasSlot(next.sections, "app_download")) };

  [
    ["pamm_products", "pamm"],
    ["copytrading_signals", "copytrading"],
    ["announcements", "announcements"],
    ["market_news", "marketNews"],
    ["risk_disclosure", "riskDisclosure"],
    ["faq_section", "faq"],
    ["support_contact", "supportContact"],
    ["app_download", "appDownload"],
  ].forEach(([slot, key]) => {
    if (!allowsBlock(slot)) settings[key] = { ...ensureObject(settings[key]), enabled: false };
  });
  if (!allowsBlock("referral_link_card")) {
    settings.referralLinkCard = { ...ensureObject(settings.referralLinkCard), enabled: false };
  }

  next.moduleSettings = settings;
  enforceServerWelcomeHeaderTop(next);
  enforceServerJourneyTimelineFullRow(next);
  enforceServerRiskDisclosureFooter(next);
  return next;
}

const HOMEPAGE_SLOT_TO_SETTING = {
  welcome_header: "welcomeHeader",
  asset_overview: "assets",
  wallet_list: "wallet",
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
  wallet_list: "wallet_list",
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
  wallet_list: "wallet_list",
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

function enforceServerWelcomeHeaderTop(config) {
  if (!configHasHomepageSlot(config, "welcome_header")) return;
  const existingBlock = (Array.isArray(config.layout) ? config.layout : []).find((block) => block?.component === "welcome_header");
  const welcomeBlock = {
    ...ensureObject(existingBlock),
    id: "welcome-header",
    component: "welcome_header",
    slot: "hero",
    priority: 0,
    props: {},
    brickId: existingBlock?.brickId || "system.welcomeHeader",
    brickName: existingBlock?.brickName || "欢迎头部",
    brickFamily: existingBlock?.brickFamily || "WelcomeHeader",
    brickSize: "3x1",
    brickZone: "hero",
    brickReason: "欢迎栏如果出现，固定作为页面顶部轻量横栏。",
  };

  config.sections = (Array.isArray(config.sections) ? config.sections : [])
    .map((section) => ({ ...section, slots: Array.isArray(section.slots) ? section.slots.filter((slot) => slot !== "welcome_header") : [] }))
    .filter((section) => section.slots.length);
  config.sections.unshift({ id: "welcome-header", type: "hero", title: "欢迎", slots: ["welcome_header"] });
  config.layout = [welcomeBlock].concat((Array.isArray(config.layout) ? config.layout : []).filter((block) => block?.component !== "welcome_header"));
  config.brickPlan = (Array.isArray(config.brickPlan) ? config.brickPlan : []).filter((brick) => brick?.component !== "welcome_header" && brick?.feature !== "welcome_header");
}

function enforceServerJourneyTimelineFullRow(config) {
  const needsFullRowJourney =
    config?.moduleStyles?.onboardingProgress === "journey-timeline" ||
    config?.moduleStyles?.onboardingProgress === "guide-cards" ||
    config?.moduleStyles?.onboardingProgress === "mission-board" ||
    config?.moduleStyles?.onboardingProgress === "next-step-hero" ||
    config?.modules?.OnboardingProgress?.variant === "journeyTimeline" ||
    config?.modules?.OnboardingProgress?.variant === "guideCards" ||
    config?.modules?.OnboardingProgress?.variant === "missionBoard" ||
    config?.modules?.OnboardingProgress?.variant === "nextStepHero";
  if (!needsFullRowJourney || !configHasHomepageSlot(config, "onboarding_guide")) return;

  config.sections = (Array.isArray(config.sections) ? config.sections : [])
    .map((section) => ({ ...section, slots: Array.isArray(section.slots) ? section.slots.filter((slot) => slot !== "onboarding_guide") : [] }))
    .filter((section) => section.slots.length);
  const insertIndex = config.sections[0]?.slots?.includes("welcome_header") ? 1 : 0;
  config.sections.splice(insertIndex, 0, { id: "onboarding-journey", type: "full", title: "开户进度", slots: ["onboarding_guide"] });
  config.layout = (Array.isArray(config.layout) ? config.layout : []).map((block) =>
    block?.component === "onboarding_guide"
      ? { ...block, slot: "full", priority: Math.min(Number(block.priority) || 20, 8), brickSize: "3x1", brickZone: "full" }
      : block,
  );
  config.layout.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));
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
  if (slot === "walletList" || slot === "wallet_list") settings.wallet = { ...ensureObject(settings.wallet), enabled: true, placement: "standalone" };
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

function mergeHomepageModelPatch(base, patch) {
  const target = clonePlain(ensureObject(base));
  const source = ensureObject(patch);
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      target[key] = mergeHomepageModelPatch(target[key], value);
      return;
    }
    target[key] = value;
  });
  return target;
}

function prepareProviderHomepageConfig(payload, modelConfig, providerConfig = {}) {
  const source = ensureObject(modelConfig);
  const providerId = providerConfig.provider || "";
  let next = source;

  if (providerId === "minimax") {
    next = mergeHomepageModelPatch(mockHomepageConfig(payload, providerConfig), source);
    const patchSummary = cleanText(source.aiSummary, "", 120);
    next.aiSummary = patchSummary || "MiniMax 短蓝图生成：已按首页意图返回紧凑 patch，服务端补齐完整配置。";
    next.brickTrace = {
      ...ensureObject(next.brickTrace),
      source: "model/minimax-patch",
      strategy: cleanText(next.brickTrace?.strategy, "MiniMax 短蓝图 patch", 80),
    };
  }

  next.schemaVersion = Number.isFinite(Number(next.schemaVersion)) ? Number(next.schemaVersion) : 4;
  next.blueprintVersion = Number.isFinite(Number(next.blueprintVersion)) ? Number(next.blueprintVersion) : 5;
  next.generationMode = cleanText(next.generationMode, "brick-v2", 40);
  return next;
}

function normalizeServerAutoLayoutBreakpoint(source, fallback) {
  const value = ensureObject(source);
  return {
    columns: Number.isFinite(Number(value.columns)) ? Math.max(1, Math.min(12, Number(value.columns))) : fallback.columns,
    collapseAt: Number.isFinite(Number(value.collapseAt)) ? Math.max(320, Math.min(1440, Number(value.collapseAt))) : fallback.collapseAt,
    rowMode: cleanText(value.rowMode, fallback.rowMode, 32),
    moduleFlow: cleanText(value.moduleFlow, fallback.moduleFlow, 40),
    equalHeight: typeof value.equalHeight === "boolean" ? value.equalHeight : fallback.equalHeight,
  };
}

function normalizeServerAutoLayoutModuleRules(source) {
  const rules = ensureObject(source);
  const moduleIds = ["promo_banner", "onboarding_guide", "quick_actions", "trading_account_highlight", "trading_accounts_list", "wallet_list"];
	  return moduleIds.reduce((next, moduleId) => {
	    const rule = ensureObject(rules[moduleId]);
	    const defaultDesktop = LARGE_FULL_ROW_HOME_BLOCKS.has(moduleId)
	      ? moduleId === "trading_account_highlight"
	        ? "full-row-chart"
	        : "full-row-module"
	      : "natural-grid";
	    next[moduleId] = {
	      desktop: cleanText(rule.desktop, defaultDesktop, 48),
	      tablet: cleanText(rule.tablet, "stack-or-two-column", 48),
	      mobile: cleanText(rule.mobile, "single-column", 48),
	    };
    return next;
  }, {});
}

function normalizeServerAutoLayout(source, sections = [], layout = []) {
  const value = ensureObject(source);
  const safeSections = Array.isArray(sections) ? sections : [];
  const safeLayout = Array.isArray(layout) ? layout : [];
  const hasPairedSections = safeSections.some((section) => ["hero", "split", "rail"].includes(section?.type) && Array.isArray(section.slots) && section.slots.length > 1);
  const hasPairedLayout = safeLayout.some((block) => ["main", "rail"].includes(block?.slot));
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
    strategy: oneOfList(value.strategy, ["responsive-grid", "mobile-first-stack"], "responsive-grid"),
    desktop: normalizeServerAutoLayoutBreakpoint(value.desktop, defaults.desktop),
    tablet: normalizeServerAutoLayoutBreakpoint(value.tablet, defaults.tablet),
    mobile: normalizeServerAutoLayoutBreakpoint(value.mobile, defaults.mobile),
    moduleRules: normalizeServerAutoLayoutModuleRules(value.moduleRules),
    notes: (Array.isArray(value.notes) ? value.notes : [])
      .map((note) => cleanText(note, "", 120))
      .filter(Boolean)
      .slice(0, 6),
  };
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

function guidedIntakeHasModule(guidedIntake, moduleId) {
  return (Array.isArray(guidedIntake?.modules) ? guidedIntake.modules : []).some((module) => module?.id === moduleId);
}

const GUIDED_SLOT_ORDER = [
  "welcome_header",
  "promo_banner",
  "copytrading_signals",
  "onboarding_guide",
  "asset_overview",
  "quick_actions",
  "pamm_products",
  "referral_link_card",
  "announcements",
  "market_news",
  "faq_section",
  "support_contact",
  "app_download",
  "trading_account_highlight",
  "trading_accounts_list",
  "risk_disclosure",
];

const GUIDED_SLOT_SECTIONS = {
  welcome_header: { id: "guided-welcome", type: "hero", title: "欢迎" },
  promo_banner: { id: "guided-hero", type: "split", title: "首屏重点" },
  copytrading_signals: { id: "guided-hero", type: "split", title: "首屏重点" },
  onboarding_guide: { id: "guided-hero", type: "split", title: "首屏重点" },
  asset_overview: { id: "guided-overview", type: "split", title: "账户概览" },
  wallet_list: { id: "guided-wallets", type: "full", title: "钱包列表" },
  quick_actions: { id: "guided-actions", type: "split", title: "快捷操作" },
  pamm_products: { id: "guided-products", type: "split", title: "产品推荐" },
  referral_link_card: { id: "guided-growth", type: "split", title: "增长工具" },
  announcements: { id: "guided-content", type: "split", title: "公告资讯" },
  market_news: { id: "guided-content", type: "split", title: "公告资讯" },
  faq_section: { id: "guided-help", type: "split", title: "帮助与下载" },
  support_contact: { id: "guided-help", type: "split", title: "帮助与下载" },
  app_download: { id: "guided-help", type: "split", title: "帮助与下载" },
  trading_account_highlight: { id: "guided-account-performance", type: "full", title: "账户表现" },
  trading_accounts_list: { id: "guided-trading-accounts", type: "full", title: "交易账号" },
  risk_disclosure: { id: "guided-risk-disclosure", type: "full", title: "风险提示" },
};

function guidedRequiredHomepageSlots(guidedIntake) {
  const slots = [];
  const explicitBlocks = guidedExplicitBlockSet(guidedIntake);
  const addSlot = (value) => {
    const slot = canonicalHomeBlock(value);
    if (slot && CANONICAL_HOME_BLOCKS.includes(slot) && !slots.includes(slot)) slots.push(slot);
  };

  (Array.isArray(guidedIntake?.modules) ? guidedIntake.modules : []).forEach((module) => {
    (Array.isArray(module?.canonicalTargets) ? module.canonicalTargets : []).forEach(addSlot);
  });
  (Array.isArray(guidedIntake?.canonical?.mustHave) ? guidedIntake.canonical.mustHave : []).forEach((value) => {
    const slot = canonicalHomeBlock(value);
    if (!slot) return;
    if (GUIDED_EXPLICIT_ONLY_BLOCKS.has(slot) && !explicitBlocks.has(slot)) return;
    addSlot(slot);
  });
  if (guidedIntake?.moduleSettings?.assets?.enabled) addSlot("asset_overview");

  return slots.sort((a, b) => {
    const indexA = GUIDED_SLOT_ORDER.includes(a) ? GUIDED_SLOT_ORDER.indexOf(a) : GUIDED_SLOT_ORDER.length;
    const indexB = GUIDED_SLOT_ORDER.includes(b) ? GUIDED_SLOT_ORDER.indexOf(b) : GUIDED_SLOT_ORDER.length;
    return indexA - indexB;
  });
}

function mergeGuidedHomepageSetting(settings, group, updates) {
  settings[group] = {
    ...ensureObject(settings[group]),
    ...updates,
  };
}

function enableGuidedHomepageSlot(config, settings, slot, fields) {
  config.modules = ensureObject(config.modules);
  config.moduleStyles = ensureObject(config.moduleStyles);

  if (slot === "asset_overview") {
    const visibleFields = fields.length ? fields : ["total", "wallet", "tradingAccount"];
    mergeGuidedHomepageSetting(settings, "assets", {
      enabled: true,
      visibleFields,
      showAccountBreakdown: visibleFields.includes("tradingAccount"),
      showWalletBreakdown: visibleFields.includes("wallet"),
    });
    mergeGuidedHomepageSetting(settings, "wallet", {
      enabled: visibleFields.includes("wallet"),
      placement: visibleFields.includes("wallet") ? "mergedWithAssets" : settings.wallet?.placement || "mergedWithAssets",
      showFundActions: false,
    });
    config.modules.AssetOverview = config.modules.AssetOverview || { variant: "standard" };
    config.moduleStyles.balanceTotal = config.moduleStyles.balanceTotal || "command";
  }

  if (slot === "quick_actions") {
    mergeGuidedHomepageSetting(settings, "quickActions", {
      enabled: true,
      count: Math.max(Number(settings.quickActions?.count) || 0, 4),
      display: settings.quickActions?.display || "iconText",
      actions: Array.isArray(settings.quickActions?.actions) ? settings.quickActions.actions : [],
    });
    config.modules.QuickActions = config.modules.QuickActions || { variant: "gridCards" };
    config.moduleStyles.quickActions = config.moduleStyles.quickActions || "matrix";
  }

  if (slot === "wallet_list") {
    mergeGuidedHomepageSetting(settings, "wallet", {
      enabled: true,
      placement: "standalone",
      showFundActions: false,
    });
    mergeGuidedHomepageSetting(settings, "assets", {
      enabled: true,
      wallets: Array.isArray(settings.assets?.wallets) && settings.assets.wallets.length ? settings.assets.wallets : ["USD", "EUR", "USDT"],
    });
    config.modules.WalletList = config.modules.WalletList || { variant: "walletTiles" };
    config.moduleStyles.walletList = config.moduleStyles.walletList || "wallet-tiles";
  }

  if (slot === "onboarding_guide") {
    mergeGuidedHomepageSetting(settings, "openAccount", { enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" });
    config.modules.OnboardingProgress = config.modules.OnboardingProgress || { variant: "missionBoard" };
    config.moduleStyles.onboardingProgress = config.moduleStyles.onboardingProgress || "mission-board";
  }

  if (slot === "trading_account_highlight") {
    mergeGuidedHomepageSetting(settings, "tradingAccounts", { enabled: true, realEnabled: true, demoEnabled: true });
    config.modules.AccountPerformance = config.modules.AccountPerformance || { variant: "proChart" };
    config.moduleStyles.accountPerformance = config.moduleStyles.accountPerformance || "pro-chart";
  }

  if (slot === "trading_accounts_list") {
    mergeGuidedHomepageSetting(settings, "tradingAccounts", { enabled: true, realEnabled: true, demoEnabled: true });
    config.modules.TradingAccounts = config.modules.TradingAccounts || { variant: "separatedList" };
    config.moduleStyles.tradingAccounts = config.moduleStyles.tradingAccounts || "dense-cards";
  }

  if (slot === "promo_banner") {
    mergeGuidedHomepageSetting(settings, "promoHighlight", { enabled: true });
    mergeGuidedHomepageSetting(settings, "adCarousel", { enabled: true, autoRotate: true, slideCount: 3 });
    config.modules.PromotionBanner = config.modules.PromotionBanner || { variant: "imageBanner" };
    config.moduleStyles.promoHighlight = config.moduleStyles.promoHighlight || "clean";
    config.moduleStyles.adCarousel = config.moduleStyles.adCarousel || "clean";
    config.moduleStyles.promo_banner = config.moduleStyles.promo_banner || "clean";
  }

  if (slot === "pamm_products") {
    mergeGuidedHomepageSetting(settings, "pamm", { enabled: true });
    config.modules.PammProducts = config.modules.PammProducts || { variant: "yieldChartCards" };
    config.moduleStyles.pamm_products = config.moduleStyles.pamm_products || "yield-chart-cards";
  }

  if (slot === "copytrading_signals") {
    mergeGuidedHomepageSetting(settings, "copytrading", { enabled: true });
    config.modules.CopytradingSignals = config.modules.CopytradingSignals || { variant: "curveCards" };
    config.moduleStyles.copytrading_signals = config.moduleStyles.copytrading_signals || "curve-cards";
  }

  if (slot === "referral_link_card") {
    mergeGuidedHomepageSetting(settings, "referralLinkCard", { enabled: true, showPromoLink: true, showInviteCode: true });
    config.modules.ReferralLinkCard = config.modules.ReferralLinkCard || { variant: "compactCard" };
    config.moduleStyles.referral_link_card = config.moduleStyles.referral_link_card || "compact-card";
  }

  if (slot === "announcements") {
    mergeGuidedHomepageSetting(settings, "announcements", { enabled: true });
    config.modules.Announcements = config.modules.Announcements || { variant: "list" };
    config.moduleStyles.announcements = config.moduleStyles.announcements || "list";
  }

  if (slot === "market_news") {
    mergeGuidedHomepageSetting(settings, "marketNews", { enabled: true });
    config.modules.MarketNews = config.modules.MarketNews || { variant: "feed" };
    config.moduleStyles.market_news = config.moduleStyles.market_news || "feed";
  }

  if (slot === "risk_disclosure") {
    mergeGuidedHomepageSetting(settings, "riskDisclosure", { enabled: true, demoFallback: true });
    config.modules.RiskDisclosure = config.modules.RiskDisclosure || { variant: "legalStrip" };
    config.moduleStyles.risk_disclosure = "legal-strip";
  }

  if (slot === "faq_section") {
    mergeGuidedHomepageSetting(settings, "faq", { enabled: true });
    config.modules.FaqSection = config.modules.FaqSection || { variant: "accordion" };
    config.moduleStyles.faq_section = config.moduleStyles.faq_section || "accordion";
  }

  if (slot === "support_contact") {
    mergeGuidedHomepageSetting(settings, "supportContact", { enabled: true });
    config.modules.SupportContact = config.modules.SupportContact || { variant: "serviceCard" };
    config.moduleStyles.support_contact = config.moduleStyles.support_contact || "service-card";
  }

  if (slot === "app_download") {
    mergeGuidedHomepageSetting(settings, "appDownload", { enabled: true });
    config.modules.AppDownload = config.modules.AppDownload || { variant: "qrCard" };
    config.moduleStyles.app_download = config.moduleStyles.app_download || "qr-card";
  }
}

function applyGuidedIntakeOverrides(config, guidedIntake) {
  if (!guidedIntake) return;

  const settings = ensureHomepageModuleSettings(config.moduleSettings);
  const fields = normalizeAssetVisibleFields(guidedIntake.moduleSettings?.assets?.visibleFields || []);
  const wantsAccountOverview = Boolean(guidedIntake.moduleSettings?.assets?.enabled || guidedIntakeHasModule(guidedIntake, "accountOverview"));
  const themePreset = oneOfList(guidedIntake.theme?.themePreset || guidedIntake.theme?.id, HOMEPAGE_THEME_PRESETS, "");

  if (themePreset) {
    config.themePreset = themePreset;
    config.theme = themePreset;
  }
  if (guidedIntake.theme?.customInput) {
    config.themeCustom = { input: guidedIntake.theme.customInput };
  }

  const requiredSlots = guidedRequiredHomepageSlots(guidedIntake);
  requiredSlots.forEach((slot) => {
    enableGuidedHomepageSlot(config, settings, slot, fields);
    ensureHomepageSectionContains(config, GUIDED_SLOT_SECTIONS[slot] || { id: `guided-${slot.replace(/_/g, "-")}`, type: "split", title: slot }, slot);
  });

  if (wantsAccountOverview && fields.length) {
    settings.assets = {
      ...ensureObject(settings.assets),
      enabled: true,
      visibleFields: fields,
      showAccountBreakdown: fields.includes("tradingAccount"),
      showWalletBreakdown: fields.includes("wallet"),
    };
    settings.wallet = {
      ...ensureObject(settings.wallet),
      enabled: fields.includes("wallet"),
      placement: fields.includes("wallet") ? "mergedWithAssets" : settings.wallet?.placement || "mergedWithAssets",
      showFundActions: false,
    };

    config.modules = { ...ensureObject(config.modules), AssetOverview: ensureObject(config.modules?.AssetOverview) };
    config.moduleStyles = { ...ensureObject(config.moduleStyles), balanceTotal: config.moduleStyles?.balanceTotal || "command" };
    config.brickPlan = Array.isArray(config.brickPlan) ? config.brickPlan : [];
    if (!config.brickPlan.some((brick) => brick?.component === "asset_overview")) {
      config.brickPlan.unshift({
        brickId: "assetOverview.flexible",
        brickName: "账户概览",
        family: "AssetOverview",
        feature: "asset_overview",
        component: "asset_overview",
        size: "2x1",
        zone: "hero",
        reason: "引导式字段要求展示余额总额、钱包余额或交易账号余额。",
      });
    }
    ensureHomepageSectionContains(config, { id: "guided-account-overview", type: "hero", title: "账户概览" }, "asset_overview");
  }

  if (requiredSlots.length) delete config.layout;
  config.moduleSettings = settings;
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
    { id: "cost-execution-chart", type: "full", title: "交易成本与执行", slots: ["trading_account_highlight"] },
    { id: "cost-execution-actions", type: "split", title: "MT5 操作", slots: ["quick_actions"] },
    { id: "cost-margin-strip", type: "full", title: "持仓与保证金", slots: ["asset_overview"] },
    { id: "cost-account-ledger", type: "full", title: "真实与模拟账号", slots: ["trading_accounts_list"] },
  ];
  delete next.layout;
  next.brickPlan = [
    { brickId: "accountPerformance.costBoard", brickName: "交易成本与执行看板", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "交易成本与账号表现属于大图表模块，用整横栏承载 PnL、保证金占用和执行效率。" },
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

function applyProfessionalTraderWorkbenchServerConfig(next, settings, understanding = {}) {
  next.name = understanding.recommendationId ? `AI ${understanding.recommendationId}`.slice(0, 28) : "AI 专业交易客户首页";
  next.layoutPreset = "tradingCommand";
  next.designGenome = "tradingCommand";
  next.pageStory = "tradingEfficiency";
  next.themePreset = understanding.wantsMinimalLight ? "minimalWhite" : "blueFinance";
  next.theme = next.themePreset;
  next.colorMode = homeColorModeFromPrompt(understanding.sourcePrompt, next.colorMode);
  next.density = "balanced";
  next.personalizationStrength = "strong";
  next.heroFocus = "trading_accounts_list";
  next.pageIntent = {
    ...ensureObject(next.pageIntent),
    primaryIntent: "trader",
    label: "专业交易客户首页",
    primaryGoal: "首屏聚焦交易账号状态、账户表现图表、持仓入口和 MT5 操作入口，不把数据接口要求误解成成本看板。",
  };
  next.sections = [
    { id: "trader-account-status-row", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
    { id: "trader-performance-row", type: "full", title: "账户表现", slots: ["trading_account_highlight"] },
    { id: "trader-operation-layer", type: "split", title: "持仓与 MT5 操作", slots: ["quick_actions"] },
    ...(understanding.wantsFaqSection ? [{ id: "trader-faq", type: "full", title: "FAQ", slots: ["faq_section"] }] : []),
  ];
  delete next.layout;
  next.brickPlan = [
    { brickId: "tradingAccounts.cardProof", brickName: "Live / Demo 合并账号卡片", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "真实账号和模拟账号在同一账号卡片区，用整横栏展示账号状态，避免与图表互相挤压。" },
    { brickId: "accountPerformance.proChart", brickName: "账户表现趋势图", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账户表现图表需要完整横向空间展示账号上下文、主数值、趋势图和指标带。" },
    { brickId: "quickActions.segmentedPanel", brickName: "持仓与 MT5 操作入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "2x1", zone: "main", reason: "持仓入口和 MT5 操作入口作为操作层，不抢账号状态主层级。" },
    ...(understanding.wantsFaqSection
      ? [{ brickId: "faqSection.topQuestions", brickName: "简约 FAQ", family: "FaqSection", feature: "faq_section", component: "faq_section", size: "3x1", zone: "full", reason: "FAQ 使用简约折叠或紧凑列表，作为低干扰解释区。" }]
      : []),
  ];
  next.modules = {
    ...ensureObject(next.modules),
    TradingAccounts: { variant: "accountWall" },
    AccountPerformance: { variant: "proChart" },
    QuickActions: { variant: "segmentedMenu" },
    FaqSection: { variant: "accordion" },
  };
  next.moduleStyles = {
    ...ensureObject(next.moduleStyles),
    tradingAccounts: "account-wall",
    accountPerformance: "pro-chart",
    quickActions: "segmented-panel",
    quick_actions: "segmented-panel",
    faq_section: understanding.wantsFaqSection ? "accordion" : ensureObject(next.moduleStyles).faq_section,
  };
  settings.adCarousel = { ...ensureObject(settings.adCarousel), enabled: false };
  settings.promoHighlight = { ...ensureObject(settings.promoHighlight), enabled: false };
  settings.assets = {
    ...ensureObject(settings.assets),
    enabled: false,
    showFundActions: false,
    showAccountBreakdown: false,
    showWalletBreakdown: false,
    showAvailable: false,
    showMargin: false,
    showRiskLevel: false,
    wallets: [],
  };
  settings.wallet = { ...ensureObject(settings.wallet), enabled: false, placement: "mergedWithAssets", showFundActions: false };
  settings.quickActions = {
    ...ensureObject(settings.quickActions),
    enabled: true,
    count: 4,
    display: "iconText",
    actions: [],
  };
  settings.tradingAccounts = {
    ...ensureObject(settings.tradingAccounts),
    enabled: true,
    realEnabled: true,
    demoEnabled: true,
    grouping: "combined",
    viewMode: "card",
    realViewMode: "card",
    demoViewMode: "card",
    demoFirst: false,
  };
  settings.openAccount = { ...ensureObject(settings.openAccount), enabled: true, real: true, demo: true, bind: false, placement: "insideTradingAccounts" };
  settings.riskNotice = { ...ensureObject(settings.riskNotice), enabled: false };
  settings.riskDisclosure = { ...ensureObject(settings.riskDisclosure), enabled: false };
  settings.faq = { ...ensureObject(settings.faq), enabled: Boolean(understanding.wantsFaqSection) };
  settings.copytrading = { ...ensureObject(settings.copytrading), enabled: false };
  settings.pamm = { ...ensureObject(settings.pamm), enabled: false };
  settings.announcements = { ...ensureObject(settings.announcements), enabled: false };
  settings.marketNews = { ...ensureObject(settings.marketNews), enabled: false };
  next.dataContract = homepageDataContractFromUnderstanding(understanding);
  next.brickTrace = {
    ...ensureObject(next.brickTrace),
    intent: "trader",
    pageIntent: "trader",
    strategy: "专业交易客户首页契约",
    score: 97,
    selectedCount: next.brickPlan.length,
    source: "server-professional-trader-guard",
  };
  next.emphasis = { ...ensureObject(next.emphasis), deposit: "low", openAccount: "medium", promo: "low", accounts: "high" };
  next.aiSummary = "已按专业交易客户首页重排：账号状态、账户表现、持仓与 MT5 入口优先，数据走接口契约。";
}

function depositGovernedBrickPlan() {
  return [
    { brickId: "promoBanner.depositLadder", brickName: "入金奖励阶梯", family: "PromotionBanner", feature: "promoHighlight", component: "promo_banner", size: "2x2", zone: "hero", reason: "首屏左侧突出 $500/$2,000/$10,000 三档奖励和最高赠金 $300。" },
    { brickId: "walletBalance.currencyRail", brickName: "钱包币种侧栏", family: "WalletBalance", feature: "walletBalance", component: "wallet_balance", size: "1x1", zone: "rail", reason: "右侧给出钱包余额，解释当前入金上下文。" },
    { brickId: "fundActions.priorityDock", brickName: "资金操作 Dock", family: "FundActions", feature: "fundActions", component: "fund_actions", size: "1x1", zone: "rail", reason: "主入金动作只在首屏操作区放大一次。" },
    { brickId: "openAccount.conversionPanel", brickName: "开户转化面板", family: "OpenAccount", feature: "openAccountActions", component: "open_account_panel", size: "1x2", zone: "rail", reason: "开真实账号作为入金前置动作，而不是散落在页面各处。" },
    { brickId: "quickActions.taskRail", brickName: "快捷入口", family: "QuickActions", feature: "quickActions", component: "quick_actions", size: "2x1", zone: "main", reason: "快捷入口紧跟首屏，承接转账、订单、持仓和客服，不重复主入金按钮。" },
    { brickId: "accountPerformance.proChart", brickName: "账号轻趋势", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账号趋势独占整横栏，避免图表与账号列表互相挤压。" },
    { brickId: "tradingAccounts.cardProof", brickName: "紧凑账号证明卡", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "账号信息作为整栏证明区承接，不抢首屏入金主线。" },
  ];
}

function applyHomepageUnderstandingToServerConfig(config, prompt) {
  const understanding = extractHomepageUnderstanding(prompt);
  const next = ensureObject(config);
  const settings = ensureHomepageModuleSettings(next.moduleSettings);
  const onboardingPresentation = onboardingPresentationFromText(prompt, next.designGenome);

  const needsTrustLayout =
    understanding.wantsMatureBrokerTrust ||
    understanding.wantsCombinedAccountFilter;

  if (understanding.wantsMinimalLight) {
    next.themePreset = "minimalWhite";
    next.theme = "minimalWhite";
  } else if (understanding.wantsLightBlue) {
    next.themePreset = "blueFinance";
    next.theme = "blueFinance";
  }
  next.colorMode = homeColorModeFromPrompt(prompt, next.colorMode);

  if (understanding.wantsFreshLayout) {
    next.personalizationStrength = "strong";
  }

  if (understanding.wantsSpaceEfficiency) {
    next.density = "compact";
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      onboarding_guide: "compact",
      onboardingProgress: "compact",
    };
    if (next.moduleStyles.quick_actions === "matrix") next.moduleStyles.quick_actions = "compact-grid";
    if (next.moduleStyles.quickActions === "matrix") next.moduleStyles.quickActions = "compact-grid";
    next.modules = {
      ...ensureObject(next.modules),
      OnboardingGuide: { variant: "compact" },
      OnboardingProgress: { variant: "compact" },
    };
  }

  if (understanding.wantsTradingCostWorkbench) {
    applyTradingCostWorkbenchServerConfig(next, settings, understanding);
  } else if (understanding.wantsProfessionalTraderWorkbench) {
    applyProfessionalTraderWorkbenchServerConfig(next, settings, understanding);
  } else if (understanding.wantsTradingDataContract) {
    next.dataContract = homepageDataContractFromUnderstanding(understanding);
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
    next.heroFocus = "asset_overview";
    next.sections = [
      { id: "trust-hero", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
      { id: "wallet-cards", type: "full", title: "钱包列表", slots: ["wallet_list"] },
      { id: "conversion-tools", type: "split", title: "活动", slots: ["promo_banner"] },
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
      visibleFields: ["total", "tradingAccount", "wallet"],
      showFundActions: false,
      showAccountBreakdown: true,
      showWalletBreakdown: true,
      showAvailable: false,
      showMargin: false,
      showRiskLevel: false,
      wallets: ["USD", "EUR", "USDT"],
    };
    settings.openAccount = { ...settings.openAccount, enabled: true, real: true, demo: true, bind: false, placement: "standalone" };
    settings.promoHighlight.enabled = true;
    settings.tradingAccounts = { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true };
    next.brickPlan = [
      { brickId: "assetOverview.tickerStrip", brickName: "三项资产汇总", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "main", reason: "首屏只展示余额合计、交易账号余额和钱包余额汇总。" },
      { brickId: "quickActions.taskRail", brickName: "五项快捷入口", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "与资产概览同行，避免右侧快捷入口下方大面积留白。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "wallet_list", component: "wallet_list", size: "3x2", zone: "full", reason: "多币种钱包卡片只在钱包列表模块展示。" },
      { brickId: "promoBanner.scoreboard", brickName: "主推活动看板", family: "PromotionBanner", feature: "promo_banner", component: "promo_banner", size: "2x1", zone: "main", reason: "活动作为辅助内容，不进入资产概览。" },
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
        OnboardingProgress: { variant: onboardingPresentation.variant },
        QuickActions: { variant: "taskRail" },
        TradingAccounts: { variant: "separatedList" },
        PammProducts: { variant: "yieldChartCards" },
        AssetOverview: { variant: "compactTable" },
      };
      next.moduleStyles = {
        ...ensureObject(next.moduleStyles),
        copytrading_signals: "curve-cards",
        onboardingProgress: onboardingPresentation.style,
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
        { brickId: onboardingPresentation.brickId, brickName: onboardingPresentation.brickName, family: "OnboardingProgress", feature: "onboardingProgress", component: "onboarding_progress", size: "2x1", zone: "main", reason: onboardingPresentation.reason },
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
      visibleFields: ["total", "tradingAccount", "wallet"],
      showAccountBreakdown: true,
      showWalletBreakdown: true,
      showAvailable: false,
      showMargin: false,
      showRiskLevel: false,
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

  const forceSingleAccountView = wantsServerTradingAccountSingleViewCorrection(prompt);
  if (wantsServerFlatAccountOptimization(prompt) || forceSingleAccountView) {
    const refineCards = wantsServerAccountCardRefinement(prompt) && !wantsServerTradingAccountList(prompt) && !forceSingleAccountView;
    const keepSeparatedCards = wantsServerTradingAccountCards(prompt) || /模拟(?:交易)?账(?:号|户)(?:列表)?[\s\S]{0,32}卡片/.test(String(prompt || ""));
    next.modules = {
      ...ensureObject(next.modules),
      AccountPerformance: { variant: "cleanSnapshot" },
      TradingAccounts: { variant: refineCards ? "denseCards" : "separatedList" },
    };
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      accountPerformance: "pro-chart",
      tradingAccounts: refineCards ? "dense-cards" : "calm-table",
    };
    settings.tradingAccounts = refineCards
      ? { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true, grouping: keepSeparatedCards ? "separated" : "combined", viewMode: "card", realViewMode: "card", demoViewMode: "card" }
	      : { ...settings.tradingAccounts, enabled: true, realEnabled: true, demoEnabled: true, grouping: "separated", viewMode: "list", realViewMode: "list", demoViewMode: "list" };
  }

  if (settings.quickActions?.enabled && !understanding.wantsProfessionalTraderWorkbench) {
    applyServerQuickActionPresentation(next, settings, prompt, understanding);
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
  next.colorMode = normalizeServerHomeColorMode(
    next.colorMode || next.themeMode || next.appearanceMode || next.homeColorMode,
    homeColorModeFromPrompt(prompt),
  );
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
    next.heroFocus = "asset_overview";
	    next.sections = [
	      { id: "asset-overview", type: "hero", title: "资产与快捷入口", slots: ["asset_overview", "quick_actions"] },
	      { id: "asset-wallets", type: "full", title: "多币种钱包", slots: ["wallet_list"] },
	      { id: "asset-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
	      { id: "asset-risk", type: "full", title: "风险提示", slots: ["risk_disclosure"] },
	      { id: "asset-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
	    ];
    delete next.layout;
    next.brickPlan = [
      { brickId: "assetOverview.tickerStrip", brickName: "三项资产汇总", family: "AssetOverview", feature: "asset_overview", component: "asset_overview", size: "2x1", zone: "main", reason: "资产概览只展示余额合计、交易账号余额和钱包余额汇总。" },
      { brickId: "quickActions.taskRail", brickName: "快捷入口侧栏", family: "QuickActions", feature: "quick_actions", component: "quick_actions", size: "1x1", zone: "rail", reason: "快捷入口与资产概览同行，减少右侧空白。" },
      { brickId: "walletList.tiles", brickName: "钱包磁贴组", family: "WalletList", feature: "wallet_list", component: "wallet_list", size: "3x2", zone: "full", reason: "各币种钱包卡片只在钱包列表模块展示。" },
	      { brickId: "accountPerformance.proChart", brickName: "账号表现图表", family: "AccountPerformance", feature: "trading_account_highlight", component: "trading_account_highlight", size: "3x2", zone: "full", reason: "账户表现图表独占整横栏承载账号上下文、趋势和指标。" },
	      { brickId: "riskDisclosure.marginGuard", brickName: "保证金风险提示", family: "RiskDisclosure", feature: "risk_disclosure", component: "risk_disclosure", size: "3x1", zone: "full", reason: "风险提示作为整栏合规说明，不挤压账号表现图表。" },
	      { brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", family: "TradingAccounts", feature: "trading_accounts_list", component: "trading_accounts_list", size: "3x2", zone: "full", reason: "交易账号列表作为下方管理区完整承接。" },
    ];
    next.brickTrace = { intent: "asset", strategy: "资产管理纵向流", score: 92, selectedCount: next.brickPlan.length, source: "server-intent-guard" };
    next.modules = ensureObject(next.modules);
    next.modules.AssetOverview = { variant: "tickerStrip" };
    next.modules.QuickActions = { variant: "taskRail" };
    next.modules.WalletList = { variant: "walletTiles" };
    next.modules.AccountPerformance = { variant: "proChart" };
    next.modules.TradingAccounts = { variant: "opsTable" };
    next.moduleStyles = {
      ...ensureObject(next.moduleStyles),
      balanceTotal: "ticker-strip",
      adCarousel: "clean",
      quickActions: "task-rail",
      walletList: "wallet-tiles",
      tradingAccounts: "ops-table",
    };
    settings.adCarousel.enabled = mentionsAd;
    settings.quickActions.enabled = mentionsQuick || settings.quickActions.enabled !== false;
    settings.referral = { ...ensureObject(settings.referral), enabled: mentionsReferral };
    settings.wallet.enabled = true;
    settings.wallet.placement = "standalone";
    settings.wallet.showFundActions = false;
    settings.assets.enabled = true;
    settings.assets.visibleFields = ["total", "tradingAccount", "wallet"];
    settings.assets.showFundActions = false;
    settings.assets.showAccountBreakdown = true;
    settings.assets.showWalletBreakdown = true;
    settings.assets.showAvailable = false;
    settings.assets.showMargin = false;
    settings.assets.showRiskLevel = false;
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
	      { id: "deposit-performance", type: "full", title: "账号表现", slots: ["trading_account_highlight"] },
	      { id: "deposit-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
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
    settings.tradingAccounts = { ...ensureObject(settings.tradingAccounts), enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "card", realViewMode: "card", demoViewMode: "list", demoFirst: false };
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

  const inferredKycStatus = inferKycStatusFromText(text, settings.userKycRail?.kycStatus || "verified");
  const mentionsKycStatus = textHasAny(text, ["kyc 状态", "kyc状态", "安全状态", "认证状态", "kyc", "未提交", "待审", "通过", "拒绝"]);
  if (mentionsKycStatus) settings.userKycRail.kycStatus = inferredKycStatus;

  const wantsDemoFirst = /模拟账号[\s\S]{0,24}(?:真实账号|live)[\s\S]{0,24}(?:上面|前面|之前)|demo[\s\S]{0,24}live[\s\S]{0,24}(?:上面|前面|之前)|demo\s*在\s*live\s*上/i.test(prompt);
  if (wantsDemoFirst) settings.tradingAccounts.demoFirst = true;

  const wantsRealCardsDemoList =
    !/卡片[\s\S]{0,8}(?:不要|不能|不应|别|禁止)|(?:不要|不能|不应|别|禁止)[\s\S]{0,16}卡片/.test(prompt) &&
    /真实(?:交易)?账(?:号|户)[\s\S]{0,24}卡片|卡片[\s\S]{0,24}真实(?:交易)?账(?:号|户)/.test(prompt);
  const wantsAccountList =
    /交易账号.{0,12}(?:建议)?用列表|账号.{0,16}(?:列表|用列表)|列表形式|不是卡片|真实账号列表|模拟账号列表|live.{0,8}list|demo.{0,8}list/i.test(prompt);
  if (wantsRealCardsDemoList) {
    settings.tradingAccounts.grouping = "separated";
    settings.tradingAccounts.viewMode = "card";
    settings.tradingAccounts.realViewMode = "card";
    settings.tradingAccounts.demoViewMode = "list";
    next.modules = { ...ensureObject(next.modules), TradingAccounts: { variant: "separatedList" } };
    next.moduleStyles = { ...ensureObject(next.moduleStyles), tradingAccounts: "dense-cards" };
  } else if (wantsAccountList) {
    settings.tradingAccounts.grouping = "separated";
    settings.tradingAccounts.viewMode = "list";
    settings.tradingAccounts.realViewMode = "list";
    settings.tradingAccounts.demoViewMode = "list";
    next.modules = { ...ensureObject(next.modules), TradingAccounts: { variant: "separatedList" } };
    next.moduleStyles = { ...ensureObject(next.moduleStyles), tradingAccounts: "calm-table" };
  }
  applyServerTradingAccountPresentationVariety(next, prompt, {
    forceVariety: Boolean(guidedIntake),
    preferNonCard: Boolean(guidedIntake),
  });

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
  applyGuidedIntakeOverrides(next, guidedIntake);
  if (next.themeCustom) {
    next.themeCustom = normalizeServerThemeCustom(next.themeCustom);
  }
  sanitizeHomepageAllowedBlocks(next, prompt, guidedIntake);

  const finalUnderstanding = extractHomepageUnderstanding(prompt);
  const isCostWorkbench = finalUnderstanding.wantsTradingCostWorkbench;
  const isProfessionalTraderWorkbench = finalUnderstanding.wantsProfessionalTraderWorkbench;
  if (!next.dataContract && finalUnderstanding.wantsTradingDataContract) {
    next.dataContract = homepageDataContractFromUnderstanding(finalUnderstanding);
  }
  next.brickTrace = {
    ...ensureObject(next.brickTrace),
    intent,
    pageIntent: intent,
    strategy: isCostWorkbench ? "专业交易成本工作台契约" : isProfessionalTraderWorkbench ? "专业交易客户首页契约" : `${intentProfile.label}服务端意图纠偏`,
    score: isCostWorkbench || isProfessionalTraderWorkbench ? (isCostWorkbench ? 98 : 97) : typeof intentProfile.confidence === "number" ? Math.round(intentProfile.confidence * 100) : Math.max(50, intentProfile.score),
    source: isCostWorkbench ? "server-cost-guard" : isProfessionalTraderWorkbench ? "server-professional-trader-guard" : "server-intent-profile",
  };
  next.autoLayout = normalizeServerAutoLayout(next.autoLayout, next.sections, next.layout);
  enforceServerComponentMorphs(next);

  return next;
}

function mockGeneratedComponent(payload, providerConfig) {
  const family = oneOfList(payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = normalizeComponentSize(payload.size, autoComponentSizeForFamily(family));
  const root = safeId(`${family}-${Date.now().toString(36)}`, "ai-brick");
  const prompt = cleanText(payload.prompt, componentFamilySpec(family).purpose, 160);
	  const baseCss = `
		    .${root}{min-height:${componentSizeRows(size) >= 3 ? "300px" : componentSizeRows(size) >= 2 ? "220px" : "168px"};display:grid;gap:14px;padding:18px;border:1px solid var(--home-border);border-radius:var(--home-radius-md,8px);background:var(--home-card-bg);color:var(--home-text);font-family:Inter,system-ui,sans-serif}
	    .${root} *{box-sizing:border-box}
	    .${root} span,.${root} small{color:var(--home-text-muted);font-size:12px;font-weight:850}
	    .${root} strong{color:var(--home-text-strong);font-weight:950;letter-spacing:0}
	    .${root} button,.${root} a{min-height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft);color:var(--home-text);font-size:12px;font-weight:900;text-decoration:none}
	    .${root} .primary{border-color:var(--home-button-border);background:var(--home-button-bg);color:var(--home-button-text)}
	  `;
  const templates = {
    AssetOverview: {
      name: "资产概览操作台",
      description: "展示总资产、钱包、交易账号余额和资金动作的首页资产积木。",
      html: `<section class="${root}"><div class="head"><span>Total Assets</span><strong>152,306.00 USD</strong></div><div class="metrics"><b>Wallet 52,306.00</b><b>TA Balance 100,000.00</b><b>Credit 8,918.00</b></div><div class="actions"><button class="primary" type="button">Deposit</button><button type="button">Withdraw</button></div></section>`,
	      css: `${baseCss}.${root} .head{display:grid;gap:6px}.${root} .head strong{font-size:32px}.${root} .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} b{padding:10px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} .actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:620px){.${root} .metrics{grid-template-columns:1fr}}`,
      dataRequirements: ["totalAssets", "walletBalance", "accountBalance", "credit", "fundingActions"],
    },
    WalletBalance: {
      name: "钱包余额分栏",
      description: "展示钱包总额、多币种余额和资金操作的钱包积木。",
      html: `<section class="${root}"><header><span>Wallet Balance</span><strong>52,306.00 USD</strong></header><div class="currencies"><p><b>USD</b><span>7,621.04</span></p><p><b>AUD</b><span>10.48</span></p><p><b>JPY</b><span>0.00</span></p></div><div class="actions"><button class="primary" type="button">Deposit</button><button type="button">Withdraw</button></div></section>`,
	      css: `${baseCss}.${root} header{display:grid;gap:6px}.${root} header strong{font-size:28px}.${root} .currencies{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} p{display:grid;gap:4px;margin:0;padding:10px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} b{font-size:13px}.${root} .actions{display:flex;gap:8px}@media(max-width:620px){.${root} .currencies{grid-template-columns:1fr}}`,
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
      html: `<section class="${root}"><span>Trading Contest</span><strong>五月盈利王挑战赛</strong><p>活动权益、报名状态和展示周期以后台活动配置为准。</p><div><b>奖池 $9,600</b><b>剩余 28 天</b><button class="primary" type="button">查看详情</button></div></section>`,
	      css: `${baseCss}.${root}{align-content:center;background:var(--home-banner-bg);color:var(--home-banner-text);border-color:var(--home-banner-border)}.${root} strong{color:var(--home-banner-text);font-size:26px}.${root} p{margin:0;color:var(--home-banner-muted)}.${root} div{display:flex;gap:8px;flex-wrap:wrap}.${root} b{padding:8px 10px;border:1px solid color-mix(in srgb,var(--home-banner-text) 24%,transparent);border-radius:var(--home-radius-sm,8px);color:var(--home-banner-text)}`,
      dataRequirements: ["campaignTitle", "reward", "remainingDays", "ctaUrl"],
    },
    ReferralLink: {
      name: "开户链接增长面板",
      description: "展示测试开户链接、邀请码、复制动作和渠道转化数据的邀请积木。",
      html: `<section class="${root}"><header><span>Referral Link</span><strong>开户链接增长面板</strong></header><div class="link"><small>Test registration link</small><p>https://user.hcs555.com/regist-real?invite=123456</p><button class="primary" type="button">Copy</button></div><div class="stats"><b>271 Clicks</b><b>62 Accounts</b><b>18 Trading A/C</b></div></section>`,
	      css: `${baseCss}.${root} header{display:grid;gap:4px}.${root} header strong{font-size:22px}.${root} .link{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;padding:10px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} .link small{grid-column:1/-1}.${root} p{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.${root} .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} b{padding:9px;border-radius:var(--home-radius-sm,8px);background:var(--home-primary-soft);color:var(--home-primary);font-size:12px}@media(max-width:620px){.${root} .link,.${root} .stats{grid-template-columns:1fr}}`,
      dataRequirements: ["inviteUrl", "inviteCode", "clicks", "registeredAccounts", "tradingAccounts"],
    },
	    TradingAccounts: {
	      name: "真实模拟账号列表",
	      description: "交易账号卡片或列表只展示账号类型、交易环境值、账号、余额、净值、信用金、账户类型、杠杆和保证金比例；卡片里不要露出“平台/服务器”字段名。",
	      html: `<section class="${root}"><header><span>Trading Accounts</span><div><button class="primary" type="button">All</button><button type="button">Live</button><button type="button">Demo</button></div></header><div class="rows"><p><b>Live</b><span>2000281</span><span>MT5 · HCHoldings-Live2</span><strong>99,999.99</strong><strong>101,280.60</strong><span>500.00</span><span>ECN Standard</span><span>1:100</span><span>528%</span></p><p><b>Demo</b><span>1000008</span><span>MT5 · HCHoldings-Demo</span><strong>50,000.00</strong><strong>51,280.60</strong><span>0.00</span><span>Demo ECN</span><span>1:500</span><span>4345%</span></p></div></section>`,
		      css: `${baseCss}.${root} header{display:flex;justify-content:space-between;gap:10px;align-items:center}.${root} header div{display:flex;gap:6px}.${root} .rows{display:grid;gap:8px;overflow-x:auto}.${root} p{display:grid;grid-template-columns:minmax(68px,.6fr) minmax(86px,.7fr) minmax(150px,1.4fr) repeat(2,minmax(92px,.8fr)) minmax(76px,.7fr) minmax(110px,.9fr) minmax(70px,.6fr) minmax(88px,.7fr);gap:8px;align-items:center;margin:0;padding:10px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} strong{text-align:right}@media(max-width:720px){.${root} header,.${root} p{grid-template-columns:1fr;display:grid}.${root} strong{text-align:left}}`,
	      dataRequirements: ["accountKind", "platform", "server", "account", "balance", "equity", "credit", "accountType", "leverage", "marginRatio"],
	    },
    OpenAccount: {
      name: "开户动作面板",
      description: "聚合开真实账号、开模拟账号、绑定账号和 KYC 状态的转化积木。",
      html: `<section class="${root}"><span>Open Account</span><strong>KYC 通过后可开真实账户</strong><div><button class="primary" type="button">开真实账户</button><button type="button">开模拟账户</button><button type="button">绑定账号</button></div><small>平台、账户类型和杠杆来自后台配置</small></section>`,
      css: `${baseCss}.${root}{align-content:center}.${root} strong{font-size:20px}.${root} div{display:grid;gap:8px}.${root} button{justify-content:flex-start;min-height:42px}`,
      dataRequirements: ["kycStatus", "openAccountActions", "accountTypes"],
    },
    OnboardingProgress: {
      name: "3步成为交易大师",
      description: "展示 KYC、创建真实账号和首次入金三个关键步骤，可生成账户开通进度面板、下一步主面板、里程碑票据、精美任务卡、旅程时间线或清单。",
      html: `<section class="${root}"><header><span>账户开通进度</span><strong>1/3</strong></header><div class="meter"><i></i></div><ol><li><b>身份认证</b><small>KYC 已通过</small></li><li class="active"><b>创建真实账户</b><small>下一步</small></li><li><b>首次入金</b><small>待完成</small></li></ol><button class="primary" type="button">去完成：创建真实账户</button></section>`,
	      css: `${baseCss}.${root}{background:var(--home-progress-card-bg)}.${root} header{display:flex;justify-content:space-between;gap:10px;align-items:center}.${root} header strong{color:var(--home-primary);font-size:20px}.${root} .meter{height:8px;overflow:hidden;border-radius:999px;background:var(--home-progress-track)}.${root} .meter i{display:block;width:33%;height:100%;border-radius:inherit;background:var(--home-progress-accent)}.${root} ol{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none}.${root} li{display:grid;gap:5px;min-height:74px;padding:12px;border:1px solid var(--home-progress-border);border-radius:var(--home-radius-sm,8px);background:var(--home-panel-bg)}.${root} li.active{border-color:var(--home-primary);box-shadow:0 12px 28px color-mix(in srgb,var(--home-primary) 14%,transparent)}.${root} b{color:var(--home-text);font-size:15px}.${root} small{color:var(--home-text-muted);font-size:12px;font-weight:850}.${root} button{width:max-content}@media(max-width:720px){.${root} ol{grid-template-columns:1fr}.${root} button{width:100%}}`,
      dataRequirements: ["kycStatus", "accountStatus", "depositStatus"],
    },
    UserKycRail: {
      name: "用户 KYC 钱包侧栏",
      description: "展示用户身份、KYC 状态、当地时间和钱包摘要的侧栏积木。",
      html: `<section class="${root}"><div class="profile"><b>JC</b><strong>Jay Chew</strong><span>Local time</span></div><div class="status"><span>KYC 状态</span><strong>--</strong><small>Wallet Balance</small></div></section>`,
	      css: `${baseCss}.${root}{align-content:start}.${root} .profile,.${root} .status{display:grid;gap:6px;padding:12px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} .profile b{width:38px;height:38px;display:grid;place-items:center;border-radius:var(--home-radius-sm,8px);background:var(--home-primary);color:var(--home-primary-contrast)}.${root} strong{font-size:20px}`,
      dataRequirements: ["userProfile", "kycStatus", "localTime", "walletBalance"],
    },
    AccountPerformance: {
      name: "账号表现图表",
      description: "展示单个账号上下文、一个主数值、ECharts 7D/30D 权益或 PnL 折线图和轻量指标带的交易账号表现积木。",
      html: `<section class="${root}"><header><div><span>Account Performance</span><strong>账号表现</strong></div><nav><button>7D</button><button>30D</button></nav></header><main><aside><small>Live · MT5</small><b>Equity --</b><p>Selected trading account</p></aside><div class="curve"><div data-home-echart data-chart-kind="account-performance" data-chart-axis-mode="xy" data-chart-period="7" role="img" aria-label="ECharts 账号净值和 PnL 日期走势"></div><p>05/05 · 05/08 · 05/11</p></div></main><footer><span>Floating P/L --</span><span>Margin Ratio --</span><span>Credit --</span><span>Leverage --</span></footer></section>`,
	      css: `${baseCss}.${root} header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.${root} nav{display:flex;gap:4px;padding:4px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} button{min-height:28px;border:0;border-radius:6px;background:var(--home-button-bg);color:var(--home-button-text);font-size:12px;font-weight:900}.${root} main{display:grid;grid-template-columns:.7fr 1.5fr;gap:16px;padding-top:10px;border-top:1px solid var(--home-border)}.${root} aside{display:grid;gap:8px;align-content:start}.${root} aside b{font-size:30px}.${root} .curve{display:grid;grid-template-rows:minmax(150px,1fr) auto;gap:8px}.${root} .curve div{min-height:150px}.${root} p{margin:0}.${root} footer{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding-top:10px;border-top:1px solid var(--home-border)}.${root} footer span{display:flex;justify-content:space-between;gap:8px;color:var(--home-text-muted);font-size:12px;font-weight:850}@media(max-width:720px){.${root} main,.${root} footer{grid-template-columns:1fr}}`,
      dataRequirements: ["balance", "equity", "credit", "pnlCurve"],
    },
    WalletList: {
      name: "多币种钱包卡片组",
      description: "以多币种卡片展示钱包货币和钱包余额，不展示可用余额、链路或资金动作。",
      html: `<section class="${root}"><header><span>Wallet List</span><strong>多币种钱包</strong></header><div class="wallets"><article><span><i>🇺🇸</i><b>USD</b></span><strong>99,999.99</strong></article><article><span><i>🇦🇺</i><b>AUD</b></span><strong>10.48</strong></article><article><span><i>₮</i><b>USDT</b></span><strong>6,280.00</strong></article></div></section>`,
	      css: `${baseCss}.${root} header{display:flex;align-items:center;justify-content:space-between;gap:10px}.${root} .wallets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.${root} article{display:grid;gap:12px;padding:14px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} article span{display:flex;align-items:center;gap:9px}.${root} article i{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--home-border);border-radius:999px;background:var(--home-surface);color:var(--home-text);font-style:normal;font-weight:950}.${root} article b{font-size:15px;color:var(--home-text)}.${root} article strong{font-size:24px}@media(max-width:720px){.${root} .wallets{grid-template-columns:1fr}}`,
      dataRequirements: ["walletRows", "currency", "balance", "currencyIcon"],
    },
    RiskDisclosure: {
      name: "风险披露提示条",
      description: "展示外汇、差价合约、杠杆和保证金风险披露的合规提示组件。",
      html: `<section class="${root}" role="note" aria-label="风险提示"><header><span>Risk Disclosure</span><strong>风险提示</strong></header><div class="risk-grid"><p><b>杠杆风险</b><small>杠杆交易可能放大亏损，亏损可能超过初始投入。</small></p><p><b>保证金风险</b><small>市场快速波动时可能触发追加保证金或强制平仓。</small></p><p><b>合规披露</b><small>正式风险披露、地区限制和条款链接以后台合规配置为准。</small></p></div><footer>交易前请结合自身财务状况、交易经验和风险承受能力独立判断。</footer></section>`,
      css: `${baseCss}.${root}{min-height:156px;border-style:solid;background:var(--home-surface-soft)}.${root} header{display:flex;justify-content:space-between;gap:12px;align-items:center}.${root} header strong{font-size:18px}.${root} .risk-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.${root} p{display:grid;gap:6px;margin:0;padding:12px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-card-bg)}.${root} b{color:var(--home-text-strong);font-size:13px}.${root} small{color:var(--home-text-muted);font-size:12px;line-height:1.55}.${root} footer{padding-top:10px;border-top:1px solid var(--home-border);color:var(--home-text-muted);font-size:12px;font-weight:850;line-height:1.55}@media(max-width:720px){.${root} .risk-grid{grid-template-columns:1fr}}`,
      dataRequirements: ["riskDisclosureCopy", "marginPolicy", "productRiskLevel", "complianceLinks"],
    },
    SupportContact: {
      name: "在线客服服务卡",
      description: "展示在线客服、客户经理、服务时间、工单和帮助入口的首页客服积木。",
      html: `<section class="${root}"><header><strong>在线客服</strong><span>服务状态</span></header><div class="support-grid"><p><small>服务时间</small><b>后台配置</b></p><p><small>在线状态</small><b>接口同步</b></p><p><small>客户经理</small><b>待分配</b></p></div><div class="ticket"><span>最近工单</span><b>#CS-1024 出金审核咨询</b><small>处理中 · 预计 24h 内回复</small></div><div class="actions"><a class="primary" data-home-action="contactSupport" href="#support">联系客服</a><a data-home-action="supportCenter" href="#support-center">帮助中心</a></div></section>`,
      css: `${baseCss}.${root}{min-height:168px;align-content:start;background:var(--home-card-bg)}.${root} header{display:flex;align-items:center;justify-content:space-between;gap:12px}.${root} header strong{font-size:18px}.${root} header span{padding:4px 8px;border-radius:var(--home-radius-sm,8px);background:var(--home-primary-soft);color:var(--home-primary);font-size:11px}.${root} .support-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.${root} p,.${root} .ticket{display:grid;gap:5px;margin:0;padding:10px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} b{color:var(--home-text-strong);font-size:13px}.${root} .ticket{grid-template-columns:auto minmax(0,1fr) auto;align-items:center}.${root} .ticket b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.${root} .actions{display:flex;gap:8px;flex-wrap:wrap}.${root} .actions a{min-width:112px}@media(max-width:720px){.${root} .support-grid,.${root} .ticket{grid-template-columns:1fr}.${root} .actions a{width:100%}}`,
      dataRequirements: ["serviceHours", "supportStatus", "accountManager", "ticketSummary", "supportLinks"],
    },
    CreateAccountForm: {
      name: "真实账号创建表单",
      description: "展示平台、账号类型、币种、杠杆和创建动作的开户表单积木。",
      html: `<section class="${root}"><strong>创建真实账号</strong><label><span>交易平台</span><b>MT5</b></label><label><span>账户类型</span><b>ECN</b></label><label><span>币种 / 杠杆</span><b>USD · 1:300</b></label><button class="primary" type="button">Create Live Account</button></section>`,
	      css: `${baseCss}.${root} strong{font-size:20px}.${root} label{display:flex;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--home-border);border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft)}.${root} b{font-size:13px}`,
      dataRequirements: ["platform", "accountType", "currency", "leverage"],
    },
    ClientHomeAtoms: {
      name: "首页业务小组件",
      description: "可嵌入首页卡片的细颗粒业务组件。",
      html: `<section class="${root}"><strong>账户服务快捷卡</strong><div><b>KYC 状态：接口同步</b><b>钱包余额：后台字段</b></div><button class="primary" type="button">查看详情</button></section>`,
	      css: `${baseCss}.${root} strong{font-size:20px}.${root} div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.${root} b{padding:9px;border-radius:var(--home-radius-sm,8px);background:var(--home-surface-soft);color:var(--home-text-soft);font-size:12px}`,
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
  return labels.length ? labels : ["KYC", "开真实账户", "首次入金"];
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
  const symbols = ["✓", "↗", "↓"];
  const safeTitle = escapeHtmlText(title || component.name || "3步成为交易大师");
  const stepMarkup = labels
    .map(
      (label, index) => `
        <li class="${states[index] || "pending"}">
          <i>${symbols[index] || "•"}</i>
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
	    .${rootClass}{display:grid;gap:14px;padding:18px;border:1px solid var(--home-progress-border);border-radius:var(--home-radius-md,8px);background:var(--home-progress-card-bg);color:var(--home-text)}
	    .${rootClass} *{box-sizing:border-box}
	    .${rootClass}>span{color:var(--home-primary);font-size:12px;font-weight:900}
	    .${rootClass}>strong{font-size:22px;letter-spacing:0}
	    .${rootClass} .onboarding-progress-steps{display:grid;grid-template-columns:minmax(260px,1.18fr) repeat(2,minmax(0,1fr));gap:10px;margin:0;padding:0;list-style:none}
	    .${rootClass} .onboarding-progress-steps li{position:relative;display:grid;grid-template-columns:auto 1fr auto;gap:8px 10px;align-items:end;min-height:132px;padding:14px;border:1px solid var(--home-progress-border);border-radius:var(--home-radius-sm,8px);background:var(--home-panel-bg);box-shadow:0 12px 28px color-mix(in srgb,var(--home-primary) 10%,transparent)}
	    .${rootClass} .onboarding-progress-steps li:first-child{min-height:176px;background:var(--home-primary-surface)}
	    .${rootClass} .onboarding-progress-steps i{width:42px;height:42px;display:grid;place-items:center;border-radius:var(--home-radius-sm,8px);background:var(--home-primary);color:var(--home-primary-contrast);font-style:normal;font-weight:950}
	    .${rootClass} .onboarding-progress-steps b{align-self:start;padding:4px 8px;border-radius:999px;background:var(--home-primary-soft);color:var(--home-primary);font-size:11px}
	    .${rootClass} .onboarding-progress-steps span{color:var(--home-text);font-size:15px;font-weight:950}
	    .${rootClass} .onboarding-progress-steps small{grid-column:2;color:var(--home-text-muted);font-size:11px;font-weight:800}
	    .${rootClass} .onboarding-progress-steps .done{border-color:color-mix(in srgb,var(--home-success) 38%,var(--home-border));background:color-mix(in srgb,var(--home-success) 10%,var(--home-panel-bg))}
	    .${rootClass} .onboarding-progress-steps .active{border-color:var(--home-primary-border-strong);background:var(--home-primary-faint);box-shadow:0 14px 32px color-mix(in srgb,var(--home-primary) 14%,transparent)}
	    @media(max-width:720px){.${rootClass} .onboarding-progress-steps{grid-template-columns:1fr}.${rootClass} .onboarding-progress-steps li:first-child{min-height:130px}}
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
  const components = sortComponentsForAiUse(Array.isArray(payload.components) ? payload.components : [], payload);
  return normalizeComposition(
    {
      name: "AI 首页积木组合",
      summary: `已用 ${providerConfig.name} / ${providerConfig.model} 组合 ${components.length} 个保存组件。`,
      layout: components.slice(0, 6).map((component, index) => ({
        componentId: component.id,
        size: component.size,
        zone: index === 0 ? "hero" : component.size.startsWith("1x") ? "rail" : "main",
        reason: `${component.name} 评分 ${normalizeComponentScore(component.score, 5)}/10，优先承接 ${component.family} 业务路径。`,
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

function minimaxJsonModeUnsupported(error) {
  const status = Number(error?.providerStatus || error?.details?.providerStatus);
  if (status && status !== 400) return false;
  return /response_format|json_object|json mode|unsupported|not support|not supported|invalid parameter|invalid param|不支持|无效|非法/i.test(String(error?.message || ""));
}

async function requestProviderJsonWithJsonModeFallback(config, headers, body) {
  try {
    return await requestProviderJson(config, headers, body);
  } catch (error) {
    if (config.provider !== "minimax" || !body?.response_format || !minimaxJsonModeUnsupported(error)) {
      throw error;
    }

    const fallbackBody = { ...body };
    delete fallbackBody.response_format;
    const retry = await requestProviderJson(config, headers, fallbackBody);
    retry.attempts = [
      ...(error.details?.attempts || []),
      {
        provider: config.provider,
        providerName: config.name,
        model: config.model,
        apiMode: config.apiMode,
        baseUrl: config.baseUrl,
        endpoint: config.endpoint,
        message: "MiniMax rejected response_format; retried without JSON mode.",
      },
      ...(retry.attempts || []),
    ];
    return retry;
  }
}

async function requestAndParseProviderJson(config, apiKey, promptParts, schema, schemaName = "ai_output", previousError = null) {
  const { headers, body } = buildProviderRequest(config, apiKey, promptParts, schema, schemaName);

  let providerResult;
  try {
    providerResult = await requestProviderJsonWithJsonModeFallback(config, headers, body);
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

const AUTH_STYLE_PRESETS = ["blueSplit", "clientOnboarding", "securityReset", "softPlatform", "photoDark"];
const AUTH_SCREEN_KEYS = ["login", "register", "forgot"];

function isObjectRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function deepMergeObjects(base, override) {
  const output = { ...(isObjectRecord(base) ? base : {}) };
  if (!isObjectRecord(override)) return output;

  Object.entries(override).forEach(([key, value]) => {
    if (isObjectRecord(value) && isObjectRecord(output[key])) {
      output[key] = deepMergeObjects(output[key], value);
      return;
    }
    if (Array.isArray(value)) {
      output[key] = value.slice();
      return;
    }
    if (value !== undefined && value !== null && value !== "") {
      output[key] = value;
    }
  });
  return output;
}

function authPromptText(payload = {}) {
  const guided = payload.guidedIntake && typeof payload.guidedIntake === "object" ? payload.guidedIntake : {};
  return [
    payload.prompt,
    payload.intent,
    payload.options?.stylePreset,
    payload.options?.screen,
    payload.options?.brandName,
    payload.options?.intent,
    payload.options?.audience,
    payload.options?.registerDepth,
    payload.options?.designStyle,
    payload.options?.theme,
    ...(Array.isArray(payload.options?.features) ? payload.options.features : []),
    guided.intent,
    guided.audience,
    guided.registerDepth,
    guided.designStyle,
    guided.theme,
    ...(Array.isArray(guided.features) ? guided.features : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function inferAuthStylePreset(payload = {}) {
  const explicit = cleanText(payload.stylePreset || payload.options?.stylePreset, "", 40);
  if (AUTH_STYLE_PRESETS.includes(explicit)) return explicit;

  const guidedText = authPromptText(payload).toLowerCase();
  if (/compliance|合规|clientonboarding/.test(guidedText)) return "clientOnboarding";
  if (/premium|blackgold|高净值|黑金|graphite|高级/.test(guidedText)) return "photoDark";
  if (/soft|friendly|亲和|轻量/.test(guidedText)) return "softPlatform";
  if (/secure|security|twofactor|双重|科技安全/.test(guidedText)) return "securityReset";
  const text = authPromptText(payload).toLowerCase();
  if (/找回|重置|密码|reset|forgot|security|安全/.test(text)) return "securityReset";
  if (/开户|注册流程|kyc|资料|问卷|投资|onboarding|client/.test(text)) return "clientOnboarding";
  if (/照片|城市|移民|护照|haame|statue|photo|dark|深色/.test(text)) return "photoDark";
  if (/平台|咨询|数字化|浅蓝|soft|轻/.test(text)) return "softPlatform";
  return "blueSplit";
}

function inferAuthDefaultScreen(payload = {}) {
  const explicit = cleanText(payload.defaultScreen || payload.screen || payload.options?.screen, "", 40);
  if (AUTH_SCREEN_KEYS.includes(explicit)) return explicit;
  const text = authPromptText(payload).toLowerCase();
  if (/注册|开户|open account|sign up|register/.test(text)) return "register";
  if (/找回|忘记|重置|reset|forgot/.test(text)) return "forgot";
  return "login";
}

function normalizeAuthHex(value, fallback) {
  const raw = cleanText(value, "", 24);
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(raw)) return raw;
  return fallback;
}

function authOptionList(value) {
  return Array.isArray(value) ? value.map((item) => cleanText(item, "", 60)).filter(Boolean) : [];
}

function authHasFeature(features = [], text = "", feature, pattern) {
  return features.includes(feature) || pattern.test(String(text || ""));
}

function authAccentFallback(options = {}, stylePreset = "blueSplit") {
  const theme = cleanText(options.theme, "", 40).toLowerCase();
  if (/blackgold/.test(theme)) return "#b7791f";
  if (/emerald/.test(theme)) return "#059669";
  if (/graphite/.test(theme)) return "#334155";
  if (/rose/.test(theme)) return "#e11d48";
  if (stylePreset === "photoDark") return "#e65b8d";
  return "#2563eb";
}

function authAudienceCopy(audience = "", defaultScreen = "login") {
  const map = {
    highNetWorth: ["专属账户安全中心", "为高净值客户提供更克制、更私密的开户注册体验。"],
    ibPartner: ["合作伙伴认证入口", "邀请码、联系资料与合作身份会在注册流程中清晰关联。"],
    returningTrader: ["欢迎回到交易账户", "快速登录、可靠找回和安全验证帮助客户顺畅回到交易。"],
    campaignLead: ["领取活动权益并完成开户", "以更短注册路径承接活动线索，同时保留必要风险提示。"],
    newTrader: ["创建您的交易账户", "用清晰步骤帮助新客户完成注册、安全设置和后续开户。"],
  };
  if (map[audience]) return map[audience];
  return [
    defaultScreen === "register" ? "创建您的交易账户" : defaultScreen === "forgot" ? "安全重置密码，放心回到您的账户" : "Welcome Back",
    defaultScreen === "register" ? "填写后台配置的注册信息，系统会自动创建客户资料并进入后续账户流程。" : "Sign in to access your account",
  ];
}

function defaultAuthScheme(payload = {}, providerConfig = {}, meta = {}) {
  const stylePreset = inferAuthStylePreset(payload);
  const defaultScreen = inferAuthDefaultScreen(payload);
  const options = payload.options && typeof payload.options === "object" ? payload.options : {};
  const guided = payload.guidedIntake && typeof payload.guidedIntake === "object" ? payload.guidedIntake : {};
  const features = authOptionList(options.features).length ? authOptionList(options.features) : authOptionList(guided.features);
  const promptText = authPromptText(payload);
  const audience = cleanText(options.audience || guided.audience, "newTrader", 40);
  const intent = cleanText(options.intent || guided.intent, "openAccount", 40);
  const registerDepth = cleanText(options.registerDepth || guided.registerDepth, "standard", 40);
  const designStyle = cleanText(options.designStyle || guided.designStyle, "trustClean", 40);
  const theme = cleanText(options.theme || guided.theme, "blueTrust", 40);
  const brandName = cleanText(options.brandName || payload.brandName, "ForexCRM", 40);
  const language = cleanText(options.language || payload.language, "zh-CN", 20);
  const accent = normalizeAuthHex(options.accent || guided.accent, authAccentFallback({ ...options, theme }, stylePreset));
  const accent2 = normalizeAuthHex(options.accent2, stylePreset === "softPlatform" ? "#24b7aa" : "#1d4ed8");
  const density = ["compact", "comfortable", "spacious"].includes(options.density) ? options.density : stylePreset === "clientOnboarding" ? "compact" : "comfortable";
  const hasInvite = authHasFeature(features, promptText, "inviteCode", /推荐码|邀请码|invite|ib/i);
  const hasCaptcha = authHasFeature(features, promptText, "captcha", /验证码|captcha|hcaptcha/i);
  const hasTwoFactor = authHasFeature(features, promptText, "twoFactor", /双重|2fa|two-factor|two factor/i);
  const hasSocial = authHasFeature(features, promptText, "socialLogin", /google|apple|第三方|social/i);
  const needsCompliance = registerDepth === "compliance" || authHasFeature(features, promptText, "riskConsent", /风险|risk|合规/i);

  const registerTitle = registerDepth === "light" ? "快速创建账户" : stylePreset === "clientOnboarding" ? "客户注册流程" : stylePreset === "photoDark" ? "账号注册" : "创建您的交易账户";
  const registerSubtitle = registerDepth === "light" ? "先完成必要信息，后续再补充开户地址和 KYC。" : stylePreset === "clientOnboarding" ? "标准客户注册，收集基本信息并自动进入后续审核。" : "填写注册信息，系统将自动创建客户资料并进入后续账户流程。";
  const [heroTitle, heroSubtitle] = authAudienceCopy(audience, defaultScreen);

  return {
    id: `auth-${Date.now().toString(36)}`,
    name: cleanText(options.name || payload.name, `${brandName} 认证中心`, 60),
    summary: cleanText(
      meta.summary || "",
      `${stylePreset === "photoDark" ? "深色品牌登录注册" : stylePreset === "clientOnboarding" ? "客户开户注册流程" : "蓝白金融认证界面"}，包含登录、注册和找回密码。`,
      260,
    ),
    language,
    stylePreset,
    defaultScreen,
    sourceType: meta.sourceType || "local-fallback",
    mock: Boolean(meta.mock),
    isFallback: Boolean(meta.isFallback),
    fallbackReason: cleanText(meta.fallbackReason, "", 220),
    provider: providerConfig.provider || "",
    model: providerConfig.model || "",
    brand: {
      name: brandName,
      tagline: cleanText(options.tagline, stylePreset === "softPlatform" ? "人工智能 + 全过程咨询服务平台" : "安全账户服务中心", 80),
      serviceLine: cleanText(options.serviceLine, "Client Portal", 60),
    },
    visual: {
      accent,
      accent2,
      panelTone: stylePreset === "photoDark" ? "dark" : "light",
      density,
      radius: stylePreset === "photoDark" ? "10px" : "18px",
      cardShadow: stylePreset === "clientOnboarding" ? "soft" : "elevated",
    },
    experience: {
      audience,
      intent,
      registerDepth,
      designStyle,
      theme,
      features,
    },
    hero: {
      title: cleanText(options.heroTitle, heroTitle, 80),
      subtitle: cleanText(
        options.heroSubtitle,
        heroSubtitle,
        160,
      ),
      bullets: [
        hasCaptcha || hasTwoFactor ? "验证码与安全校验降低账户风险" : "安全提交客户资料",
        hasInvite ? "支持推荐码自动关联" : "注册后可继续完成 KYC 与开户",
        registerDepth === "light" ? "移动端友好的轻量注册路径" : "注册信息按步骤清晰拆分",
      ],
    },
    screens: {
      login: {
        title: language.startsWith("zh") ? "登录你的账户" : "Welcome Back",
        subtitle: language.startsWith("zh") ? "使用邮箱、手机号或第三方方式进入账户" : "Sign in to access your account",
        identifierLabel: language.startsWith("zh") ? "邮箱或手机号" : "Email Address",
        identifierPlaceholder: language.startsWith("zh") ? "请输入您的邮箱或手机号" : "n02badd@gmail.com",
        passwordLabel: language.startsWith("zh") ? "密码" : "Password",
        passwordPlaceholder: language.startsWith("zh") ? "请输入密码" : "••••••••",
        rememberLabel: language.startsWith("zh") ? "记住账号" : "Remember me",
        forgotLabel: language.startsWith("zh") ? "忘记密码?" : "Forgot password?",
        primaryAction: language.startsWith("zh") ? "登录" : "Sign In",
        registerPrompt: language.startsWith("zh") ? "没有账号？" : "Don't have an account?",
        registerAction: language.startsWith("zh") ? "立即注册" : "Open Account",
        socialProviders: hasSocial ? ["Google", "Apple"] : [],
        extraFields: [
          ...(hasCaptcha ? [{ id: "loginCaptcha", label: "验证码", type: "text", placeholder: "请输入验证码" }] : []),
          ...(hasTwoFactor ? [{ id: "twoFactorCode", label: "双重验证码", type: "text", placeholder: "请输入动态验证码" }] : []),
        ],
        helperNotice: hasTwoFactor ? "已启用双重验证提示，保护账户登录安全" : "您的信息受到严格保护，安全加密传输",
      },
      register: {
        title: registerTitle,
        subtitle: registerSubtitle,
        modeTabs: ["手机号", "邮箱"],
        sections: [
          {
            title: "基本信息",
            description: "请填写您的个人基本信息",
              fields: [
                { id: "name", label: "姓名", type: "text", placeholder: "请输入您的真实姓名", required: true, span: "full" },
                { id: "country", label: "国家/地区", type: "select", placeholder: "Select country...", required: true },
                ...(registerDepth === "light" ? [] : [{ id: "birthDate", label: "出生日期", type: "date", placeholder: "年 / 月 / 日" }]),
                { id: "email", label: "邮箱", type: "email", placeholder: "请输入邮箱", required: true, span: "full" },
                ...(hasInvite ? [{ id: "inviteCode", label: "推荐码 / 邀请码", type: "text", placeholder: "如有请填写", span: "full" }] : []),
              ],
            },
            ...(registerDepth === "light" ? [] : [{
              title: "投资背景",
              description: "帮助我们了解您的投资经验",
              fields: [
                { id: "experience", label: "交易经验", type: "select", placeholder: "请选择", required: true },
                { id: "income", label: "年收入范围", type: "select", placeholder: "请选择" },
                { id: "goal", label: "投资目的", type: "radio", options: ["资产增值", "收益稳定", "短期投机", "对冲风险"], required: true, span: "full" },
                { id: "fundSource", label: "资金来源", type: "select", placeholder: "请选择" },
              ],
            }]),
            {
              title: "账户安全",
              fields: [
                { id: "password", label: "密码", type: "password", placeholder: "至少 8 位字符", required: true },
                { id: "confirmPassword", label: "确认密码", type: "password", placeholder: "再次输入密码", required: true },
                ...(hasCaptcha ? [{ id: "captcha", label: "图形验证码", type: "text", placeholder: "请输入验证码", span: "full" }] : []),
              ],
            },
            ...(needsCompliance ? [{
              title: "风险确认",
              fields: [
                { id: "riskAgreement", label: "我了解保证金交易存在较高风险", type: "radio", options: ["已了解并继续", "稍后再看"], required: true, span: "full" },
              ],
            }] : []),
          ],
        termsText: "我已阅读并同意 服务条款、隐私政策及风险披露，确认提交的信息真实有效。",
        primaryAction: language.startsWith("zh") ? "提交注册" : "Create Account",
        backAction: language.startsWith("zh") ? "返回登录" : "Back to Login",
          trustNotice: hasCaptcha ? "注册成功前需要完成验证码校验" : "注册成功后将向邮箱发送验证码",
        },
      forgot: {
        title: language.startsWith("zh") ? "Reset Password" : "Reset Password",
        subtitle: language.startsWith("zh") ? "输入邮箱，我们会发送受保护的重置链接。" : "Enter your email and we'll send you a reset link.",
        identifierLabel: language.startsWith("zh") ? "邮箱地址" : "Email Address",
        identifierPlaceholder: "your@email.com",
        primaryAction: language.startsWith("zh") ? "发送重置链接" : "Send Reset Link",
        backAction: language.startsWith("zh") ? "返回登录" : "Back to Login",
        registerAction: language.startsWith("zh") ? "去注册" : "Create Account",
        steps: ["使用邮箱", "验证身份", "设置新密码"],
      },
    },
    securityNotes: [
      hasTwoFactor ? "双重验证提示提升高风险登录安全" : "加密链接验证，保护账户安全",
      "密码不会通过邮件明文发送",
      hasCaptcha ? "验证码占位可接入真实风控服务" : "官方品牌页面，降低钓鱼风险",
    ],
    designNotes: [
      "参考界面仅作为质量学习标准，生成结果按当前业务目标重新组织。",
      "登录、注册和找回密码共享品牌与安全语义，但每个流程独立渲染。",
    ],
    generatedAt: new Date().toISOString(),
  };
}

function normalizeAuthFields(fields, fallbackFields) {
  const source = Array.isArray(fields) && fields.length ? fields : fallbackFields;
  return source
    .filter(Boolean)
    .slice(0, 16)
    .map((field, index) => ({
      id: safeId(field.id || field.label || `field-${index}`, "auth-field"),
      label: cleanText(field.label, `字段 ${index + 1}`, 40),
      type: cleanText(field.type, "text", 24),
      placeholder: cleanText(field.placeholder, "", 80),
      required: Boolean(field.required),
      span: field.span === "full" ? "full" : "",
      options: Array.isArray(field.options) ? field.options.map((item) => cleanText(item, "", 40)).filter(Boolean).slice(0, 8) : [],
    }));
}

function normalizeAuthScheme(source, payload = {}, providerConfig = {}, meta = {}) {
  const fallback = defaultAuthScheme(payload, providerConfig, meta);
  const raw = isObjectRecord(source?.scheme) ? source.scheme : source;
  const merged = deepMergeObjects(fallback, isObjectRecord(raw) ? raw : {});
  const stylePreset = AUTH_STYLE_PRESETS.includes(merged.stylePreset) ? merged.stylePreset : fallback.stylePreset;
  const defaultScreen = AUTH_SCREEN_KEYS.includes(merged.defaultScreen) ? merged.defaultScreen : fallback.defaultScreen;

  const normalized = {
    ...merged,
    id: cleanText(merged.id, fallback.id, 80),
    name: cleanText(merged.name, fallback.name, 60),
    summary: cleanText(merged.summary, fallback.summary, 260),
    language: cleanText(merged.language, fallback.language, 20),
    stylePreset,
    defaultScreen,
    sourceType: cleanText(meta.sourceType || merged.sourceType, fallback.sourceType, 40),
    mock: Boolean(meta.mock || merged.mock),
    isFallback: Boolean(meta.isFallback || merged.isFallback),
    fallbackReason: cleanText(meta.fallbackReason || merged.fallbackReason, "", 220),
    provider: providerConfig.provider || cleanText(merged.provider, "", 40),
    model: providerConfig.model || cleanText(merged.model, "", 80),
    generatedAt: new Date().toISOString(),
  };

  normalized.brand = {
    ...fallback.brand,
    ...(isObjectRecord(merged.brand) ? merged.brand : {}),
    name: cleanText(merged.brand?.name, fallback.brand.name, 40),
    tagline: cleanText(merged.brand?.tagline, fallback.brand.tagline, 80),
    serviceLine: cleanText(merged.brand?.serviceLine, fallback.brand.serviceLine, 60),
  };
  normalized.visual = {
    ...fallback.visual,
    ...(isObjectRecord(merged.visual) ? merged.visual : {}),
    accent: normalizeAuthHex(merged.visual?.accent, fallback.visual.accent),
    accent2: normalizeAuthHex(merged.visual?.accent2, fallback.visual.accent2),
    density: ["compact", "comfortable", "spacious"].includes(merged.visual?.density) ? merged.visual.density : fallback.visual.density,
  };
  normalized.experience = {
    ...(isObjectRecord(fallback.experience) ? fallback.experience : {}),
    ...(isObjectRecord(merged.experience) ? merged.experience : {}),
    audience: cleanText(merged.experience?.audience, fallback.experience?.audience || "", 40),
    intent: cleanText(merged.experience?.intent, fallback.experience?.intent || "", 40),
    registerDepth: cleanText(merged.experience?.registerDepth, fallback.experience?.registerDepth || "", 40),
    designStyle: cleanText(merged.experience?.designStyle, fallback.experience?.designStyle || "", 40),
    theme: cleanText(merged.experience?.theme, fallback.experience?.theme || "", 40),
    features: authOptionList(merged.experience?.features || fallback.experience?.features).slice(0, 12),
  };
  normalized.hero = {
    ...fallback.hero,
    ...(isObjectRecord(merged.hero) ? merged.hero : {}),
    title: cleanText(merged.hero?.title, fallback.hero.title, 80),
    subtitle: cleanText(merged.hero?.subtitle, fallback.hero.subtitle, 160),
    bullets: (Array.isArray(merged.hero?.bullets) ? merged.hero.bullets : fallback.hero.bullets).map((item) => cleanText(item, "", 80)).filter(Boolean).slice(0, 5),
  };

  const screens = isObjectRecord(merged.screens) ? merged.screens : {};
  normalized.screens = {
    login: deepMergeObjects(fallback.screens.login, screens.login),
    register: deepMergeObjects(fallback.screens.register, screens.register),
    forgot: deepMergeObjects(fallback.screens.forgot, screens.forgot),
  };

  normalized.screens.register.sections = (Array.isArray(normalized.screens.register.sections) ? normalized.screens.register.sections : fallback.screens.register.sections)
    .filter(Boolean)
    .slice(0, 5)
    .map((section, index) => {
      const fallbackSection = fallback.screens.register.sections[index] || { title: "注册信息", fields: [] };
      return {
        title: cleanText(section.title, fallbackSection.title, 50),
        description: cleanText(section.description, fallbackSection.description || "", 100),
        fields: normalizeAuthFields(section.fields, fallbackSection.fields || []),
      };
    });
  normalized.screens.login.socialProviders = (Array.isArray(normalized.screens.login.socialProviders) ? normalized.screens.login.socialProviders : fallback.screens.login.socialProviders)
    .map((item) => cleanText(item, "", 30))
    .filter(Boolean)
    .slice(0, 4);
  normalized.screens.login.extraFields = normalizeAuthFields(normalized.screens.login.extraFields, fallback.screens.login.extraFields || []).slice(0, 4);
  normalized.securityNotes = (Array.isArray(merged.securityNotes) ? merged.securityNotes : fallback.securityNotes).map((item) => cleanText(item, "", 100)).filter(Boolean).slice(0, 6);
  normalized.designNotes = (Array.isArray(merged.designNotes) ? merged.designNotes : fallback.designNotes).map((item) => cleanText(item, "", 140)).filter(Boolean).slice(0, 8);

  return normalized;
}

function buildAuthPrompt(payload = {}, config = {}) {
  const options = payload.options && typeof payload.options === "object" ? payload.options : {};
  const guided = payload.guidedIntake && typeof payload.guidedIntake === "object" ? payload.guidedIntake : null;
  const prompt = cleanText(payload.prompt, "生成一套 ForexCRM 登录、注册和找回密码认证界面。", 1200);
  const stylePreset = inferAuthStylePreset(payload);
  const defaultScreen = inferAuthDefaultScreen(payload);
  const referenceLearning = [
    "内部学习标准（不要作为模板名输出，也不要照搬版式）：",
    "参考素材展示了金融认证页应有的可信品牌区、低噪声表单、清晰开户注册步骤、安全找回密码、移动端友好按钮、验证码/Captcha 占位、第三方登录和合规协议表达。",
    "你的任务是基于用户需求重新组合一个个性化认证模块，让客户感觉这是为当前品牌和客群生成的，而不是通用登录模板。",
  ].join("\n");
  const system = [
    "你是 ForexCRM / 金融平台开户认证界面生成器。",
    "只返回 JSON，不要返回 Markdown，不要返回 HTML/CSS，不要解释。",
    "生成的是独立登录/注册/找回密码业务，不要引用首页 AI、首页模块、交易账号首页组件或其它业务代码。",
    "输出必须包含 login、register、forgot 三个 screen；三者共享 brand/visual，但流程文案、字段、按钮要各自完整。",
    "界面要像真实生产级金融平台开户认证页：克制、清晰、安全、对移动端友好；同时需要有明确的客群差异和品牌差异，避免千篇一律。",
    "字段只描述配置，不生成真实认证逻辑；验证码、Captcha、第三方登录可以作为 UI 占位。",
    "stylePreset 只是内部渲染适配字段，请选择最接近的值，但不要让它限制创意；真正的个性化要体现在 brand、visual、hero、screens、experience、securityNotes 和 designNotes。",
  ].join("\n");
  const user = [
    referenceLearning,
    "",
    "用户需求:",
    prompt,
    "",
    guided
      ? [
          "引导式选项:",
          compactJson({
            audience: guided.labels?.audience || guided.audience,
            intent: guided.labels?.intent || guided.intent,
            registerDepth: guided.labels?.registerDepth || guided.registerDepth,
            designStyle: guided.labels?.designStyle || guided.designStyle,
            theme: guided.labels?.theme || guided.theme,
            features: guided.labels?.features || guided.features,
            accent: guided.accent,
            note: guided.note,
          }),
          "",
        ].join("\n")
      : "",
    "当前选择:",
    compactJson({
      stylePreset,
      defaultScreen,
      brandName: options.brandName || "ForexCRM",
      language: options.language || "zh-CN",
      accent: options.accent || "#2563eb",
      density: options.density || "comfortable",
      audience: options.audience || "",
      intent: options.intent || "",
      registerDepth: options.registerDepth || "",
      designStyle: options.designStyle || "",
      theme: options.theme || "",
      features: options.features || [],
      provider: config.name,
      model: config.model,
    }),
    "",
    "请返回符合 schema 的 auth UI JSON。必须生成完整登录、注册、找回密码三套 screen。stylePreset 必须是 blueSplit、clientOnboarding、securityReset、softPlatform、photoDark 之一，但这是内部适配字段。",
    "建议额外返回 experience: { audience, registerDepth, designStyle, theme, features }，并可在 login.extraFields 中加入验证码/双重验证等字段配置。",
  ].join("\n");
  return { system, user };
}

async function callAuthProvider(payload = {}) {
  const config = normalizeProviderConfig(payload.modelConfig || {});
  const apiKey = resolveApiKey(config);
  const fallback = (reason, mock = false) => ({
    scheme: normalizeAuthScheme(null, payload, config, {
      sourceType: reason ? "local-fallback" : "local",
      mock,
      isFallback: Boolean(reason),
      fallbackReason: reason,
    }),
    provider: config.provider,
    model: config.model,
    rawText: "",
    mock,
    localFallback: Boolean(reason),
    fallbackReason: reason,
  });

  if (process.env.AUTH_AI_MOCK === "true" || process.env.HOME_AI_MOCK === "true") {
    return fallback("AUTH_AI_MOCK/HOME_AI_MOCK 已启用，使用本地认证界面草稿。", true);
  }

  if (!apiKey) {
    return fallback(`Missing API key. Set ${config.keyEnv.join(" or ")} or enter a temporary key in the UI.`, true);
  }

  try {
    const result = await requestAndParseProviderJson(config, apiKey, buildAuthPrompt(payload, config), AUTH_UI_JSON_SCHEMA, "auth_ui_scheme");
    return {
      scheme: normalizeAuthScheme(result.json, payload, { ...config, provider: result.provider, model: result.model }, { sourceType: "model" }),
      provider: result.provider,
      model: result.model,
      rawText: result.rawText,
      usage: result.usage,
    };
  } catch (error) {
    const reason = cleanText(providerFailureSummary(error), "认证界面 AI 生成失败，已使用本地安全草稿。", 220);
    return fallback(reason, false);
  }
}

function authRecordSnapshot(scheme = {}) {
  return {
    name: safeRecordText(scheme.name, 80),
    stylePreset: safeRecordText(scheme.stylePreset, 40),
    defaultScreen: safeRecordText(scheme.defaultScreen, 40),
    language: safeRecordText(scheme.language, 20),
    brand: safeRecordText(scheme.brand?.name, 40),
    sourceType: safeRecordText(scheme.sourceType, 40),
    fallbackReason: safeRecordText(scheme.fallbackReason, 180),
    audience: safeRecordText(scheme.experience?.audience, 40),
    registerDepth: safeRecordText(scheme.experience?.registerDepth, 40),
    screens: AUTH_SCREEN_KEYS.filter((key) => Boolean(scheme.screens?.[key])),
  };
}

async function runAuthGenerate(payload, startedAt = Date.now()) {
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    historyConfig = callHistoryConfig(payload);
    const result = await callAuthProvider(payload);
    const status = result.localFallback ? "fallback" : result.mock ? "mock" : "success";
    const callRecord = addAuthCallHistoryRecord({
      action: "auth-generate",
      providerId: result.provider || historyConfig.provider,
      provider: historyConfig.name,
      model: result.model || historyConfig.model,
      apiMode: historyConfig.apiMode,
      callMode: "serverProxy",
      baseUrl: historyConfig.baseUrl,
      endpoint: historyConfig.endpoint,
      temperature: historyConfig.temperature,
      maxOutputTokens: historyConfig.maxOutputTokens,
      status,
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.prompt),
      message: result.scheme?.name || result.fallbackReason || "登录注册界面生成成功",
      schemeSnapshot: authRecordSnapshot(result.scheme),
      usage: result.usage || null,
    });
    return { ok: true, ...result, callRecord };
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addAuthCallHistoryRecord({
        action: "auth-generate",
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
        message: safeRecordText(error.message || "Auth UI generation failed", 900),
      });
    }
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    const wrapped = new Error(error.message || "Auth UI generation failed");
    wrapped.statusCode = status;
    wrapped.details = error.details || null;
    wrapped.callRecord = failedCallRecord;
    throw wrapped;
  }
}

async function handleAuthGenerate(req, res) {
  try {
    const payload = await readJsonBody(req);
    sendJson(res, 200, await runAuthGenerate(payload));
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Auth UI generation failed",
      details: error.details || null,
      callRecord: error.callRecord || null,
    });
  }
}

async function handleAuthTest(req, res) {
  const startedAt = Date.now();
  let payload = null;
  let historyConfig = null;
  let failedCallRecord = null;

  try {
    payload = await readJsonBody(req);
    historyConfig = callHistoryConfig(payload);
    const result = await testProviderConnection(payload);
    const callRecord = addAuthCallHistoryRecord({
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
      prompt: "认证模块连通性测试",
      message: result.message || result.url || "连通成功",
      usage: result.usage || null,
    });
    sendJson(res, 200, { ok: true, ...result, callRecord });
  } catch (error) {
    if (payload) {
      const config = historyConfig || callHistoryConfig(payload);
      failedCallRecord = addAuthCallHistoryRecord({
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
        prompt: "认证模块连通性测试",
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

async function callProvider(payload) {
  const config = normalizeProviderConfig(payload.modelConfig);
  const renderMode = homepageRenderMode(payload);
  const compactAiHtmlProvider = providerUsesCompactAiHtml(config);

  if (process.env.HOME_AI_MOCK === "true") {
    const rawMockConfig = enforceHomepagePromptIntent(payload, mockHomepageConfig(payload, config));
    const guidedSnapshot = homepageGuidedSnapshotFromPayload(payload, rawMockConfig);
    const repaired = repairHomepageConfig(rawMockConfig, guidedSnapshot);
    const mockConfig = repaired.config;
    const htmlScheme = renderModeWantsAiHtml(renderMode) ? mockAiHtmlScheme(payload, mockConfig, config) : null;
    const finalQuality = finalizeHomepageQuality(payload, mockConfig, htmlScheme);
    const finalConfig = {
      ...mockConfig,
      validation: repaired.validation,
      repairActions: repaired.repairActions,
      qualityScore: finalQuality.score,
      quality: finalQuality.quality,
      htmlQualityStatus: finalQuality.htmlQualityStatus,
    };
    return {
      config: {
        ...finalConfig,
        renderMode,
        htmlGenerationEnabled: renderModeWantsAiHtml(renderMode),
        skeletonHtmlEnabled: renderMode === "skeletonHtml",
        activeRenderMode: activeRenderModeForRequest(renderMode, htmlScheme),
        ...(htmlScheme ? { htmlScheme } : {}),
      },
      ...(htmlScheme ? { htmlScheme } : {}),
      validation: repaired.validation,
      repairActions: repaired.repairActions,
      qualityScore: finalQuality.score,
      quality: finalQuality.quality,
      htmlQualityStatus: finalQuality.htmlQualityStatus,
      renderMode,
      activeRenderMode: activeRenderModeForRequest(renderMode, htmlScheme),
      provider: config.provider,
      model: config.model,
      rawText: "",
      mock: true,
    };
  }

  let freeHtmlResult = null;
  let freeHtmlError = null;
  if (renderModeWantsAiHtml(renderMode) && !compactAiHtmlProvider) {
    freeHtmlError = new Error("AI HTML generation waits for repairedConfig; free raw-config HTML is disabled.");
  }

  const result = await callProviderWithPrompt(payload, buildPrompt(payload, config), payload.context?.schema, "homepage_config");
  const rawHomepageConfig = enforceHomepagePromptIntent(
    payload,
    prepareProviderHomepageConfig(payload, result.json, { ...config, provider: result.provider, model: result.model }),
  );
  const guidedSnapshot = homepageGuidedSnapshotFromPayload(payload, rawHomepageConfig);
  const repaired = repairHomepageConfig(rawHomepageConfig, guidedSnapshot);
  const homepageConfig = repaired.config;
  const resultProviderConfig = { ...config, provider: result.provider, model: result.model };
  const htmlPayload = {
    ...payload,
    modelConfig: {
      ...(payload.modelConfig || {}),
      provider: resultProviderConfig.provider,
      model: resultProviderConfig.model,
      apiMode: resultProviderConfig.apiMode,
      baseUrl: resultProviderConfig.baseUrl,
      endpoint: resultProviderConfig.endpoint,
    },
  };
  let htmlScheme = null;
  let htmlUsage = null;
  let htmlRawText = "";

	  if (renderModeWantsAiHtml(renderMode)) {
	    if (freeHtmlResult?.json) {
      htmlScheme = repairAiHtmlScheme(freeHtmlResult.json, payload, homepageConfig, resultProviderConfig, {
        sourceType: "model/free-html",
	        generationPipeline: "free-html-first",
	        modelAttempted: true,
	        mock: false,
	      });
      htmlUsage = freeHtmlResult.usage || null;
      htmlRawText = freeHtmlResult.rawText || "";
      if (htmlScheme.qualityStatus !== "passed" && config.provider !== "minimax") {
        const qualityReport = evaluateAiHtmlQuality(htmlScheme, payload, homepageConfig);
	        try {
	          const htmlResult = await callProviderWithPrompt(
	            htmlPayload,
	            aiHtmlPromptForProvider(resultProviderConfig, payload, homepageConfig, { qualityReport, previousScheme: htmlScheme }),
	            AI_HTML_SCHEME_JSON_SCHEMA,
	            "homepage_ai_html_quality_repair",
	          );
          const previousHtmlScheme = htmlScheme;
          const repairedHtmlScheme = repairAiHtmlScheme(
            {
              ...htmlResult.json,
              correctionNotes: [
                `自由 HTML 质量门禁 ${qualityReport.score}/100，已根据问题自动返修。`,
                ...(Array.isArray(qualityReport.issues) ? qualityReport.issues : []),
                ...(Array.isArray(htmlResult.json?.correctionNotes) ? htmlResult.json.correctionNotes : []),
              ],
            },
	            payload,
	            homepageConfig,
	            resultProviderConfig,
		            { sourceType: "model-repair", generationPipeline: "free-html-quality-gate", modelAttempted: true, mock: false },
		          );
          const previousScore = Number(previousHtmlScheme.qualityScore);
          const repairedScore = Number(repairedHtmlScheme.qualityScore);
          if (Number.isFinite(previousScore) && Number.isFinite(repairedScore) && repairedScore < previousScore) {
            htmlScheme = {
              ...previousHtmlScheme,
              correctionNotes: [
                ...(Array.isArray(previousHtmlScheme.correctionNotes) ? previousHtmlScheme.correctionNotes : []),
                `质量返修得分 ${repairedScore}/100 低于自由版 ${previousScore}/100，已保留自由 HTML 方案。`,
              ].slice(0, 8),
              generationPipeline: "free-html-quality-gate",
            };
          } else {
            htmlScheme = repairedHtmlScheme;
          }
          htmlUsage = { free: freeHtmlResult.usage || null, repair: htmlResult.usage || null };
          htmlRawText = [freeHtmlResult.rawText, htmlResult.rawText].filter(Boolean).join("\n\n--- ai html quality repair ---\n\n");
        } catch (error) {
          htmlScheme = repairAiHtmlScheme(
            {
              ...htmlScheme,
              correctionNotes: [
                ...(Array.isArray(htmlScheme.correctionNotes) ? htmlScheme.correctionNotes : []),
                `质量返修调用失败，保留已清洗自由 HTML：${cleanText(providerFailureSummary(error), "", 140)}`,
              ],
            },
	            payload,
	            homepageConfig,
	            resultProviderConfig,
		            { sourceType: htmlScheme.sourceType || "model/free-html", generationPipeline: "free-html-quality-gate", modelAttempted: true, mock: false },
		          );
        }
      }
	    } else {
	      try {
        const compactHtmlGeneration = providerUsesCompactAiHtml(resultProviderConfig);
		        const htmlResult = await callProviderWithPrompt(
		          htmlPayload,
		          aiHtmlPromptForProvider(resultProviderConfig, payload, homepageConfig, { previousError: freeHtmlError }),
		          AI_HTML_SCHEME_JSON_SCHEMA,
		          compactHtmlGeneration ? `homepage_ai_html_${resultProviderConfig.provider}_compact` : "homepage_ai_html_repair",
		        );
	        htmlScheme = repairAiHtmlScheme(
	          {
	            ...htmlResult.json,
	            correctionNotes: [
	              compactHtmlGeneration
                  ? `${resultProviderConfig.name} 已使用短输出 AI HTML 通道，并参考组件库与配置契约生成。`
                  : `自由 HTML 首次生成失败，已改用配置参考修正版：${cleanText(providerFailureSummary(freeHtmlError), "", 120)}`,
	              ...(Array.isArray(htmlResult.json?.correctionNotes) ? htmlResult.json.correctionNotes : []),
	            ],
	          },
	          payload,
	          homepageConfig,
	          resultProviderConfig,
			          {
                  sourceType: compactHtmlGeneration ? `model/${resultProviderConfig.provider}-ai-html` : "model-repair",
                  generationPipeline: compactHtmlGeneration ? `${resultProviderConfig.provider}-compact-ai-html` : "config-guided-repair",
                  modelAttempted: true,
                  mock: false,
                },
			        );
        htmlUsage = htmlResult.usage || null;
        htmlRawText = htmlResult.rawText || "";
	      } catch (error) {
        const failureSummary = providerFailureSummary(error || freeHtmlError);
        htmlScheme = configBackedAiHtmlScheme(payload, homepageConfig, resultProviderConfig, {
          providerName: resultProviderConfig.name,
          sourceType: `model/${resultProviderConfig.provider}-config-html`,
          generationPipeline: `${resultProviderConfig.provider}-config-backed-html`,
          failureSummary,
          summary: `${resultProviderConfig.name} 已成功生成首页配置；AI HTML 长输出失败后，服务端改用配置蓝图装配可预览 HTML。`,
          visualBrief: "保留模型生成的首页意图、模块编排和主题，不再把 HTML 预览失败标记为整次生成回退。",
          correctionNotes: [
            freeHtmlError ? `自由 HTML 首次生成未采用：${cleanText(providerFailureSummary(freeHtmlError), "", 120)}` : "",
            `配置参考 HTML 未采用：${cleanText(providerFailureSummary(error), "", 120)}`,
          ].filter(Boolean),
        });
        htmlUsage = null;
        htmlRawText = "";
	      }
    }
  }

  const finalQuality = finalizeHomepageQuality(payload, homepageConfig, htmlScheme);
  const finalConfig = {
    ...homepageConfig,
    validation: repaired.validation,
    repairActions: repaired.repairActions,
    qualityScore: finalQuality.score,
    quality: finalQuality.quality,
    htmlQualityStatus: finalQuality.htmlQualityStatus,
  };

  return {
    config: {
      ...finalConfig,
      renderMode,
      htmlGenerationEnabled: renderModeWantsAiHtml(renderMode),
      skeletonHtmlEnabled: renderMode === "skeletonHtml",
      activeRenderMode: activeRenderModeForRequest(renderMode, htmlScheme),
      ...(htmlScheme ? { htmlScheme } : {}),
    },
    ...(htmlScheme ? { htmlScheme } : {}),
    validation: repaired.validation,
    repairActions: repaired.repairActions,
    qualityScore: finalQuality.score,
    quality: finalQuality.quality,
    htmlQualityStatus: finalQuality.htmlQualityStatus,
    renderMode,
    activeRenderMode: activeRenderModeForRequest(renderMode, htmlScheme),
    provider: result.provider,
    model: result.model,
    rawText: [result.rawText, htmlRawText].filter(Boolean).join("\n\n--- ai html ---\n\n"),
    usage: htmlUsage ? { config: result.usage || null, html: htmlUsage } : result.usage,
  };
}

function buildComponentPromptForProvider(payload, config = {}) {
  if (config.provider === "minimax") return buildMiniMaxComponentPrompt(payload, config);
  return buildComponentPrompt(payload);
}

function buildComponentEditPromptForProvider(payload, component, config = {}) {
  if (config.provider === "minimax") return buildMiniMaxComponentEditPrompt(payload, component, config);
  return buildComponentEditPrompt(payload, component);
}

function componentProviderCanUseLocalFallback(config, error) {
  if (config.provider !== "minimax") return false;
  const status = Number(error?.providerStatus || error?.details?.providerStatus || error?.statusCode);
  if ([400, 401, 403, 404].includes(status) && !/valid JSON object|Provider returned an empty/i.test(String(error?.message || ""))) {
    return false;
  }
  const details = error?.details || {};
  return (
    /valid JSON object|Provider returned an empty|timed out|timeout/i.test(String(error?.message || "")) ||
    Boolean(details.rawTextSnippet) ||
    Boolean(details.likelyTruncated) ||
    /length|max_tokens|content_filter/i.test(String(details.finishReason || ""))
  );
}

function componentProviderFallbackReason(error, fallback) {
  return cleanText(providerFailureSummary(error, fallback), fallback, 260);
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

  let result;
  try {
    result = await callProviderWithPrompt(payload, buildComponentPromptForProvider(payload, config), GENERATED_COMPONENT_JSON_SCHEMA, "homepage_component");
  } catch (error) {
    if (!componentProviderCanUseLocalFallback(config, error)) throw error;
    const reason = componentProviderFallbackReason(error, `${config.name} 输出不是可解析 JSON，已使用本地安全组件兜底。`);
    return {
      component: saveComponent(mockGeneratedComponent(payload, config)),
      provider: config.provider,
      model: config.model,
      rawText: "",
      usage: null,
      localFallback: true,
      fallbackReason: reason,
    };
  }
  const normalized = normalizeGeneratedComponent(result.json, payload);
  const component = saveComponent(generatedComponentTooGeneric(normalized) || generatedComponentViolatesFamily(normalized, payload) ? mockGeneratedComponent(payload, config) : normalized);
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

  let result;
  try {
    result = await callProviderWithPrompt(payload, buildComponentEditPromptForProvider(payload, currentComponent, config), GENERATED_COMPONENT_JSON_SCHEMA, "homepage_component_edit");
  } catch (error) {
    if (!componentProviderCanUseLocalFallback(config, error)) throw error;
    const reason = componentProviderFallbackReason(error, `${config.name} 输出不是可解析 JSON，已使用本地安全编辑兜底。`);
    return {
      component: saveComponent(mockEditedComponent(payload, currentComponent, config)),
      provider: config.provider,
      model: config.model,
      rawText: "",
      usage: null,
      localFallback: true,
      fallbackReason: reason,
    };
  }
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
  const violatesFamily = generatedComponentViolatesFamily(normalized, { ...payload, family: currentComponent.family });
  const component = saveComponent(
    generatedComponentTooGeneric(normalized) || violatesFamily
      ? violatesFamily
        ? mockGeneratedComponent({ ...payload, family: currentComponent.family, size: currentComponent.size, prompt: payload.instruction || currentComponent.sourcePrompt }, config)
        : mockEditedComponent(payload, currentComponent, config)
      : normalized,
  );
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

async function generateAestheticCandidate(payload = {}, index = 0, groupId = "") {
  const providerConfig = normalizeProviderConfig(payload.modelConfig || {});
  const renderMode = homepageRenderMode(payload);
  const candidatePayload = {
    ...payload,
    variant: Number.isFinite(Number(payload.variant)) ? Number(payload.variant) + index : index,
    context: {
      ...(payload.context || {}),
      aestheticTraining: aestheticTrainingContext(payload, { sampleLimit: 4, componentLimit: 10, feedbackLimit: 6 }),
      candidateIndex: index,
      candidateGroupId: groupId,
    },
  };

  let result = null;
  let errorMessageText = "";
  try {
    result = await callProvider(candidatePayload);
  } catch (error) {
    errorMessageText = cleanText(error.message, "模型候选生成失败，已使用本地安全候选。", 260);
    const fallbackConfig = enforceHomepagePromptIntent(candidatePayload, mockHomepageConfig(candidatePayload, providerConfig));
    const htmlScheme = renderModeWantsAiHtml(renderMode)
      ? mockAiHtmlScheme(candidatePayload, fallbackConfig, providerConfig)
      : null;
    result = {
      config: {
        ...fallbackConfig,
        renderMode,
        htmlGenerationEnabled: renderModeWantsAiHtml(renderMode),
        skeletonHtmlEnabled: renderMode === "skeletonHtml",
        activeRenderMode: activeRenderModeForRequest(renderMode, htmlScheme),
        ...(htmlScheme ? { htmlScheme: { ...htmlScheme, sourceType: "local-fallback", fallbackReason: errorMessageText, isFallback: true } } : {}),
      },
      renderMode,
      activeRenderMode: activeRenderModeForRequest(renderMode, htmlScheme),
      provider: providerConfig.provider,
      model: providerConfig.model,
      mock: false,
      localFallback: true,
      error: errorMessageText,
    };
  }

  const config = result.config || {};
  const aesthetic = evaluateHomepageAesthetic(candidatePayload, config);
  const record = addAestheticScoreRecord({
    action: "candidate-score",
    candidateGroupId: groupId,
    candidateIndex: index,
    prompt: safeRecordText(candidatePayload.prompt),
    source: result.localFallback ? "local-fallback" : result.mock ? "mock" : "model",
    providerId: result.provider || providerConfig.provider,
    provider: PROVIDERS[result.provider || providerConfig.provider]?.name || providerConfig.name,
    model: result.model || providerConfig.model,
    renderMode,
    status: aesthetic.status,
    score: aesthetic.score,
    label: config.name || `候选方案 ${index + 1}`,
    message: errorMessageText || config.aiSummary || "候选方案已评分",
    configSnapshot: aesthetic.configSnapshot,
    categories: aesthetic.categories,
    issues: aesthetic.issues,
    suggestions: aesthetic.suggestions,
    strengths: aesthetic.strengths,
    sampleReferences: aesthetic.sampleReferences.map((item) => ({ id: item.id, name: item.name, pageIntent: item.pageIntent })),
    componentReferences: aesthetic.componentReferences.map((item) => ({ id: item.id, name: item.name, family: item.family })),
  });

  return {
    id: record.id,
    index,
    score: aesthetic.score,
    status: aesthetic.status,
    label: config.name || `候选方案 ${index + 1}`,
    source: record.source,
    provider: record.provider,
    model: record.model,
    message: record.message,
    config,
    aesthetic,
    scoreRecord: record,
  };
}

async function handleAestheticCandidates(req, res) {
  try {
    const payload = await readJsonBody(req);
    const count = Math.max(2, Math.min(Number(payload.count) || 3, 4));
    const groupId = `candidate-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const candidates = [];

    for (let index = 0; index < count; index += 1) {
      candidates.push(await generateAestheticCandidate(payload, index, groupId));
    }

    const ranked = candidates.slice().sort((a, b) => b.score - a.score);
    sendJson(res, 200, {
      ok: true,
      groupId,
      bestCandidateId: ranked[0]?.id || "",
      candidates,
    });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Candidate generation failed",
      details: error.details || null,
    });
  }
}

async function handleAestheticScore(req, res) {
  try {
    const payload = await readJsonBody(req);
    const config = payload.config && typeof payload.config === "object" ? payload.config : {};
    const report = evaluateHomepageAesthetic(payload, config);
    const record = addAestheticScoreRecord({
      action: payload.action || "manual-score",
      candidateGroupId: cleanText(payload.candidateGroupId, "", 80),
      candidateIndex: Number.isFinite(Number(payload.candidateIndex)) ? Number(payload.candidateIndex) : null,
      prompt: safeRecordText(payload.prompt),
      source: cleanText(payload.source, "manual", 40),
      providerId: cleanText(payload.providerId, "", 40),
      provider: cleanText(payload.provider, "", 80),
      model: cleanText(payload.model, "", 80),
      renderMode: homepageRenderMode(payload),
      status: report.status,
      score: report.score,
      label: config.name || payload.label || "手动评分",
      message: cleanText(payload.message || config.aiSummary || "", "", 420),
      configSnapshot: report.configSnapshot,
      categories: report.categories,
      issues: report.issues,
      suggestions: report.suggestions,
      strengths: report.strengths,
      sampleReferences: report.sampleReferences.map((item) => ({ id: item.id, name: item.name, pageIntent: item.pageIntent })),
      componentReferences: report.componentReferences.map((item) => ({ id: item.id, name: item.name, family: item.family })),
    });
    sendJson(res, 200, { ok: true, report, record, records: readAestheticScoreRecords() });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Aesthetic scoring failed",
    });
  }
}

async function handleFeedbackMemorySave(req, res) {
  try {
    const payload = await readJsonBody(req);
    const config = payload.config && typeof payload.config === "object" ? payload.config : {};
    const scoreRecord = cleanText(payload.scoreRecordId, "", 90)
      ? readAestheticScoreRecords().find((record) => record.id === cleanText(payload.scoreRecordId, "", 90))
      : null;
    const rating = Number.isFinite(Number(payload.rating)) ? Math.max(1, Math.min(5, Number(payload.rating))) : 3;
    const decision = cleanText(payload.decision, rating >= 4 ? "approve" : rating <= 2 ? "reject" : "neutral", 40);
    const note = cleanText(payload.note, "", 900);
    const manualDimensions = payload.manualDimensions && typeof payload.manualDimensions === "object"
      ? Object.fromEntries(
          Object.entries(payload.manualDimensions)
            .map(([key, value]) => [cleanText(key, "", 40), Math.max(0, Math.min(10, Number(value) || 0))])
            .filter(([key]) => key),
        )
      : {};
    const referenceAssets = (Array.isArray(payload.referenceAssets) ? payload.referenceAssets : [])
      .map((asset) => ({
        id: cleanText(asset?.id, "", 90),
        name: cleanText(asset?.name, "", 120),
        tags: (Array.isArray(asset?.tags) ? asset.tags : []).map((tag) => cleanText(tag, "", 36)).filter(Boolean).slice(0, 8),
      }))
      .filter((asset) => asset.id || asset.name)
      .slice(0, 8);
    const preferenceSignals = [
      ...(Array.isArray(payload.preferenceSignals) ? payload.preferenceSignals : []),
      ...(decision === "approve" ? ["保留类似首屏结构", "复用命中的漂亮积木块"] : []),
      ...(decision === "reject" ? ["避免类似低分结构", "下次生成需要更强视觉焦点"] : []),
    ]
      .map((item) => cleanText(item, "", 100))
      .filter(Boolean)
      .slice(0, 10);
    const record = addFeedbackMemoryRecord({
      prompt: safeRecordText(payload.prompt || scoreRecord?.prompt),
      scoreRecordId: cleanText(payload.scoreRecordId, "", 90),
      candidateGroupId: cleanText(payload.candidateGroupId || scoreRecord?.candidateGroupId, "", 80),
      candidateIndex: Number.isFinite(Number(payload.candidateIndex)) ? Number(payload.candidateIndex) : scoreRecord?.candidateIndex ?? null,
      decision,
      rating,
      note,
      tags: (Array.isArray(payload.tags) ? payload.tags : []).map((tag) => cleanText(tag, "", 36)).filter(Boolean).slice(0, 10),
      preferenceSignals,
      pageIntent: cleanText(payload.pageIntent || config.pageIntent?.primaryIntent || config.brickTrace?.intent || scoreRecord?.configSnapshot?.intent, "", 60),
      visualStyle: cleanText(payload.visualStyle || config.themePreset || config.theme || scoreRecord?.configSnapshot?.themePreset, "", 80),
      score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : scoreRecord?.score ?? null,
      manualScore: Number.isFinite(Number(payload.manualScore)) ? Math.max(0, Math.min(100, Math.round(Number(payload.manualScore)))) : null,
      machineScore: Number.isFinite(Number(payload.machineScore)) ? Math.max(0, Math.min(100, Math.round(Number(payload.machineScore)))) : scoreRecord?.score ?? null,
      manualDimensions,
      referenceAssets,
      configSnapshot: homepageRecordSnapshot(config),
    });
    sendJson(res, 200, { ok: true, record, records: readFeedbackMemoryRecords() });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Feedback save failed",
    });
  }
}

async function runHomeAiComplete(payload, startedAt = Date.now()) {
  let historyConfig = null;
  let failedCallRecord = null;

  try {
	    historyConfig = callHistoryConfig(payload);
	    const result = await callProvider(payload);
	    const htmlScheme = result.config?.htmlScheme || result.htmlScheme || null;
	    const recordStatus = result.mock ? "mock" : htmlScheme?.isFallback ? "fallback" : "success";
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
		      status: recordStatus,
	      mock: Boolean(result.mock),
	      htmlSourceType: htmlScheme?.sourceType || "",
	      htmlPipeline: htmlScheme?.generationPipeline || "",
	      htmlIsFallback: Boolean(htmlScheme?.isFallback),
	      htmlFallbackReason: htmlScheme?.fallbackReason || "",
	      htmlQualityStatus: result.htmlQualityStatus || result.config?.htmlQualityStatus || htmlScheme?.qualityStatus || "",
	      qualityScore: Number.isFinite(Number(result.qualityScore)) ? result.qualityScore : null,
		      durationMs: Date.now() - startedAt,
	      prompt: safeRecordText(payload.prompt),
	      guidedSnapshot: guidedRecordSnapshot(payload),
	      message: result.config?.name || "首页生成成功",
	      configSnapshot: homepageRecordSnapshot(result.config),
	      usage: result.usage || null,
	    });
    return { ok: true, ...result, callRecord };
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
    const wrapped = new Error(error.message || "AI generation failed");
    wrapped.statusCode = status;
    wrapped.details = error.details || null;
    wrapped.callRecord = failedCallRecord;
    throw wrapped;
  }
}

async function handleAiComplete(req, res) {
  try {
    const payload = await readJsonBody(req);
    sendJson(res, 200, await runHomeAiComplete(payload));
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "AI generation failed",
      details: error.details || null,
      callRecord: error.callRecord || null,
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
      status: result.localFallback ? "fallback" : "success",
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.prompt),
      message: result.localFallback ? result.fallbackReason || result.component?.name || "组件生成已回退" : result.component?.name || "组件生成成功",
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
      status: result.localFallback ? "fallback" : "success",
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.instruction || payload.prompt),
      message: result.localFallback ? result.fallbackReason || result.component?.name || "组件编辑已回退" : result.component?.name || "组件编辑成功",
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
    const components = sortComponentsForAiUse(
      requestedIds.size ? library.components.filter((component) => requestedIds.has(component.id)) : library.components,
      payload,
    );
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

  if (req.method === "OPTIONS") {
    sendOptions(res);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/auth-ai/providers") {
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
              ...providerKeyStatus(provider),
            },
          ];
        }),
      ),
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/auth-ai/calls") {
    sendJson(res, 200, {
      ok: true,
      records: readAuthCallHistory(),
    });
    return;
  }

  if (req.method === "DELETE" && requestUrl.pathname === "/api/auth-ai/calls") {
    writeAuthCallHistory([]);
    sendJson(res, 200, {
      ok: true,
      records: [],
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth-ai/jobs") {
    await handleBackgroundJobStart(req, res, "auth-generate", runAuthGenerate, (id) => `/api/auth-ai/jobs/${id}`);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname.startsWith("/api/auth-ai/jobs/")) {
    handleBackgroundJobStatus(res, decodeURIComponent(requestUrl.pathname.split("/").pop() || ""));
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth-ai/generate") {
    await handleAuthGenerate(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth-ai/test") {
    await handleAuthTest(req, res);
    return;
  }

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
              ...providerKeyStatus(provider),
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

  if (req.method === "GET" && requestUrl.pathname === "/api/home-ai/design-samples") {
    const prompt = requestUrl.searchParams.get("prompt") || "";
    sendJson(res, 200, {
      ok: true,
      ...readDesignSamples(),
      rankedSamples: rankDesignSamplesForPrompt(prompt, 6).map(summarizeDesignSampleForPrompt),
      beautifulComponents: beautifulComponentReferences({ prompt, limit: 10 }),
      feedbackMemory: feedbackMemoryPromptReference(prompt, 8),
      referenceAssets: referenceAssetsForPrompt(prompt, { limit: 6 }),
    });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/design-samples") {
    try {
      const payload = await readJsonBody(req);
      const result = saveDesignSample(payload.sample || payload);
      sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
      sendJson(res, status, { ok: false, error: error.message || "Design sample save failed" });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/home-ai/aesthetic-scores") {
    sendJson(res, 200, {
      ok: true,
      records: readAestheticScoreRecords(),
    });
    return;
  }

  if (req.method === "DELETE" && requestUrl.pathname === "/api/home-ai/aesthetic-scores") {
    writeAestheticScoreRecords([]);
    sendJson(res, 200, { ok: true, records: [] });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/aesthetic-score") {
    await handleAestheticScore(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/candidates") {
    await handleAestheticCandidates(req, res);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/home-ai/reference-assets") {
    const prompt = requestUrl.searchParams.get("prompt") || "";
    sendJson(res, 200, {
      ok: true,
      records: readReferenceAssets(),
      rankedReferences: referenceAssetsForPrompt(prompt, { limit: 8 }),
    });
    return;
  }

  if (req.method === "DELETE" && requestUrl.pathname === "/api/home-ai/reference-assets") {
    readReferenceAssets().forEach((asset) => {
      const filePath = path.join(ROOT_DIR, asset.storagePath || "");
      if (asset.storagePath && filePath.startsWith(ROOT_DIR) && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // Best effort cleanup; metadata is still cleared below.
        }
      }
    });
    writeReferenceAssets([]);
    sendJson(res, 200, { ok: true, records: [] });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/reference-assets") {
    try {
      const payload = await readJsonBody(req);
      const assets = Array.isArray(payload.assets) ? payload.assets : [payload.asset || payload];
      assets.filter(Boolean).slice(0, 12).forEach((asset) => saveReferenceAsset(asset));
      sendJson(res, 200, { ok: true, records: readReferenceAssets() });
    } catch (error) {
      const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
      sendJson(res, status, { ok: false, error: error.message || "Reference asset save failed" });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/home-ai/feedback") {
    sendJson(res, 200, {
      ok: true,
      records: readFeedbackMemoryRecords(),
    });
    return;
  }

  if (req.method === "DELETE" && requestUrl.pathname === "/api/home-ai/feedback") {
    writeFeedbackMemoryRecords([]);
    sendJson(res, 200, { ok: true, records: [] });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/feedback") {
    await handleFeedbackMemorySave(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/home-ai/jobs") {
    await handleBackgroundJobStart(req, res, "homepage-generate", runHomeAiComplete, (id) => `/api/home-ai/jobs/${id}`);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname.startsWith("/api/home-ai/jobs/")) {
    handleBackgroundJobStatus(res, decodeURIComponent(requestUrl.pathname.split("/").pop() || ""));
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
  const lanUrls = getLanUrls(PORT);
  console.log(`ForexCRM home AI server running at http://127.0.0.1:${PORT}/${mockText}`);
  lanUrls.forEach((url) => console.log(`LAN access: ${url}`));
});
