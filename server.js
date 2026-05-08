const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = __dirname;
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
      requiredUi: ["USD/AUD/JPY/USDT 钱包", "余额", "可用余额", "Deposit/Withdraw"],
      forbidden: ["Primary Action", "只有 WalletList 标题"],
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
      "TradingAccounts 可以拆成 Live List 和 Demo List；用户要求两个列表或真实/模拟分开时必须用 separated + list。",
      "用户要求模拟账号在真实账号上面时，默认展示顺序必须是 Demo List 在上、Live List 在下。",
      "活动增长、交易大赛、奖池、广告轮播首屏核心这类需求优先按 growth 处理，不能被钱包/资产词误判为 asset。",
      "用户要求广告轮播首屏核心或单独长模块时，adCarousel 必须是首个 hero/full-width 模块，不能与快捷入口并排挤在一行。",
      "用户要求推广模块单独处理时，使用 ReferralLink/referral_link 单独成块，不要并进广告轮播或赛事看板。",
      "用户要求列表形式、不是卡片时，tradingAccounts.viewMode 必须是 list，不能用 card 或 switchable 作为主结果。",
      "用户要求快捷入口两行一行四个时，quickActions.count 必须是 8。",
      "用户要求不要绑定账号入口时，openAccount.bind 必须是 false。",
      "用户要求钱包列表时使用 walletList / wallet_list 积木，并优先渲染为小卡片组，不要只用 WalletBalance 伪装。",
      "正式用户端首页不能露出积木尺寸、名称或选择理由；这些信息只能放在数据结构和调试属性里。",
      "积木编排必须自动填充可用栅格，避免空白 section、空 slots、不可渲染模块和孤立小积木造成的大面积留白。",
      "桌面端一行可以放两个业务积木；同一行的两个积木必须合计 12 栅格并保持等高，不能出现 8 栅格内容旁边空 4 栅格的版面。",
    ],
    bricks: [
      { id: "assetOverview.vipHero", mapsTo: "asset_summary/balanceTotal", use: "高净值资产首屏、总资产、资金信任" },
      { id: "fundActions.priorityDock", mapsTo: "fund_actions/fundActions", use: "入金、出金独立操作 Dock" },
      { id: "quickActions.actionDock", mapsTo: "quick_actions/quickActions", use: "专业交易快捷入口" },
      { id: "adCarousel.heroCampaign", mapsTo: "ad_carousel/adCarousel", use: "首页广告轮播、活动主视觉" },
      { id: "referralLink.growthConsole", mapsTo: "referral_link/referralLink", use: "IB/渠道开户链接、邀请码、转化统计" },
      { id: "onboardingProgress.checklist", mapsTo: "onboarding_progress/onboardingProgress", use: "KYC、开户、首次入金任务" },
      { id: "openAccount.sidePanel", mapsTo: "open_account_panel/openAccountActions", use: "开真实、开模拟、绑定账号右侧面板" },
      { id: "userKycRail.profileWallet", mapsTo: "user_kyc_rail/userKycRail", use: "用户、KYC、当地时间、钱包摘要" },
      { id: "accountPerformance.proChart", mapsTo: "account_performance/accountPerformance", use: "账号余额、权益、PnL 图表" },
      { id: "tradingAccounts.separatedList", mapsTo: "account_list/tradingAccounts", use: "真实/模拟账号分区列表" },
      { id: "walletList.currencyTable", mapsTo: "wallet_list/walletList", use: "多币种钱包表格" },
      { id: "createAccountForm.realAccount", mapsTo: "create_account_form/createAccountForm", use: "真实账户创建表单" },
    ],
  };
}

function buildMiniMaxPrompt(payload) {
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
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
    "brickPlan、brickTrace、brickName、brickReason 只供系统调试，不是用户端页面可见内容。",
  ].join("\n");

  const contract = {
    requiredFields: [
      "schemaVersion",
      "blueprintVersion",
      "generationMode",
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
      "moduleSettings",
      "emphasis",
      "aiSummary",
    ],
    enums: {
      layoutPreset: ["standardDashboard", "conversionFirst", "assetFirst", "tradingPro", "vipService"],
      themePreset: ["default", "blackGold", "blueFinance", "darkTech", "minimalWhite"],
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
      ],
      moduleVariants: {
        AssetOverview: ["standard", "vipHero", "compactTable", "darkTerminal"],
        WalletBalance: ["standard", "splitCurrency", "compact", "premiumCard"],
        FundActions: ["dock", "splitButtons", "compactRow"],
        QuickActions: ["gridCards", "actionDock", "priorityButtons", "minimalIcons"],
        PromotionBanner: ["imageBanner", "gradientHero", "blackGoldVip", "splitVisual"],
        ReferralLink: ["console", "linkFirst", "compact"],
        TradingAccounts: ["workbench", "separatedList", "denseCards", "calmTable"],
        OpenAccount: ["sidePanel", "inlineActions", "softCard"],
        OnboardingProgress: ["path", "checklist", "compact"],
        UserKycRail: ["profileWallet", "kycChecklist", "compactStatus"],
        AccountPerformance: ["proChart", "terminalChart", "cleanSnapshot"],
        WalletList: ["currencyTable", "compactRows", "actionTable"],
        CreateAccountForm: ["realAccountForm", "compactForm", "guidedForm"],
      },
      moduleStyles: {
        balanceTotal: ["command", "metric-strip", "quiet-card"],
        fundActions: ["dock", "split-buttons", "compact-row"],
        adCarousel: ["immersive", "clean", "compact"],
        quickActions: ["matrix", "toolbar", "compact-grid"],
        referralLink: ["console", "link-first", "compact"],
        tradingAccounts: ["workbench", "dense-cards", "calm-table"],
      },
      emphasis: ["low", "medium", "high"],
    },
    rules: [
      "sections 只返回 3 到 5 个，每个为 {id,type,title,slots}，slots 只能使用 sectionSlots。",
      "brickPlan 返回 4 到 8 个，字段为 {brickId,brickName,family,feature,component,size,zone,reason}，brickId 必须来自 brickReference.bricks。",
      "不要返回 layout；前端会根据 brickPlan 和 sections 自动映射到积木布局。",
      "按 auto layout 组织 sections：hero/main/rail/full 要能被 12 栅格紧凑填充，小积木必须和相关业务积木成组出现。",
      "一行两个积木时优先使用 8+4 或 6+6，同行高度必须一致；如果没有合适搭档，模块必须自动占满整行。",
      "禁止返回空 section、空 slots、不可渲染 slot 或明显会留下大面积空白的单模块区域。",
      "交易账号如需真实/模拟分开，moduleSettings.tradingAccounts.grouping 必须为 separated 且 viewMode 为 list。",
      "列表需求优先使用 tradingAccounts.viewMode=list，不要使用卡片作为主结果。",
      "不要绑定账号入口时，moduleSettings.openAccount.bind 必须为 false。",
      "入金/出金出现时，emphasis.deposit 使用 high，且 assets.showFundActions 为 true。",
      "aiSummary 不超过 80 个中文字符。",
    ],
    outputShape: {
      schemaVersion: 4,
      blueprintVersion: 5,
      generationMode: "brick-v2",
      name: "不超过28字",
      layoutPreset: "standardDashboard",
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
        quickActions: { enabled: true, count: 7, display: "iconText" },
        wallet: { enabled: true, placement: "standalone", showFundActions: false },
        assets: { enabled: true, showFundActions: true },
        referral: { enabled: true },
        tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: "combined", viewMode: "switchable" },
        openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "insideTradingAccounts" },
      },
      emphasis: { deposit: "high", openAccount: "medium", promo: "medium", accounts: "medium" },
      aiSummary: "一句话说明方案",
    },
  };

  const user = [
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
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
    "sections、layout 和 brickPlan 只能包含可渲染且启用的业务模块；禁止空 section、空 slots、东缺一块西缺一块的断裂拼版。",
    "brickPlan、brickTrace、brickName、brickReason 只用于系统调试和数据属性，不能作为用户端可见 UI 文案。",
    "如果管理员要求交易账号分成两个列表、真实和模拟分开、Live/Demo 分开，必须设置 moduleSettings.tradingAccounts.grouping = \"separated\" 且 viewMode = \"list\"。",
    "如果管理员要求模拟账号列表在真实账号列表上面，必须在 aiSummary 或 layout reason 中保留 Demo 在上、Live 在下的排序意图，前端会按该顺序渲染。",
    "如果管理员要求列表形式、不是卡片，禁止返回交易账号卡片主视图。",
    "如果管理员要求活动增长、交易大赛、奖池、广告轮播首屏核心，必须把 adCarousel 作为第一个 full-width hero 模块，heroFocus 使用 ad_carousel，不能用欢迎卡、资产卡或快捷入口抢首屏。",
    "如果管理员要求推广模块单独处理，必须保留 referralLink/referral_link 独立 section；赛事活动看板 promoHighlight 不能替代推广链接模块。",
    "如果管理员要求钱包列表小卡片，必须使用 walletList/wallet_list，wallet.placement = \"standalone\"。",
    "如果管理员要求不要绑定账号入口，必须设置 moduleSettings.openAccount.bind = false。",
    "优先使用传入 schema、默认配置、模块变体和模块样式中的白名单值。",
    "返回字段建议包括 schemaVersion、blueprintVersion、generationMode、name、layoutPreset、themePreset、density、heroFocus、sections、layout、modules、moduleStyles、moduleSettings、brickPlan、brickTrace、emphasis、aiSummary。",
  ].join("\n");

  const user = [
    `当前时间: ${now}`,
    `生成轮次: ${Number.isFinite(variant) ? variant : 0}`,
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

function mockHomepageConfig(payload, providerConfig) {
  const text = String(payload.prompt || "").toLowerCase();
  const isVip = /vip|高净值|黑金|大气/.test(text);
  const isGrowth = /活动|比赛|增长|转化|奖池/.test(text);
  const isTrader = /交易|mt4|mt5|持仓|订单|专业/.test(text);
  const wantsClear = /轻快|清晰|清爽|明亮|浅色|轻量/.test(text);
  const wantsWalletList = /钱包列表|多币种钱包/.test(text);
  const wantsSeparatedAccounts = /真实账号|模拟账号|两个列表|分开|live|demo/.test(text);
  const growthLayout = [
    { id: "ad-carousel", component: "ad_carousel", slot: "hero", priority: 10, props: {}, brickId: "adCarousel.heroCampaign", brickName: "首屏广告轮播", brickFamily: "PromotionBanner", brickSize: "3x1", brickZone: "hero", brickReason: "活动增长首页把交易大赛和奖池作为首屏长模块。" },
    { id: "quick-actions", component: "quick_actions", slot: "main", priority: 100, props: {}, brickId: "quickActions.priorityMatrix", brickName: "转化快捷矩阵", brickFamily: "QuickActions", brickSize: "2x1", brickZone: "main", brickReason: "保留 8 个快捷入口承接参与、入金和账号操作。" },
    { id: "promo-scoreboard", component: "promo_banner", slot: "main", priority: 110, props: {}, brickId: "promoBanner.scoreboard", brickName: "赛事活动看板", brickFamily: "PromotionBanner", brickSize: "2x1", brickZone: "main", brickReason: "把奖池、倒计时和活动 CTA 从轮播里拆成独立活动看板。" },
    { id: "referral", component: "referral_link", slot: "full", priority: 130, props: {}, brickId: "referralLink.growthConsole", brickName: "推广链接控制台", brickFamily: "ReferralLink", brickSize: "3x1", brickZone: "full", brickReason: "推广模块单独展示开户链接、邀请码和二维码。" },
    wantsWalletList
      ? { id: "wallet-list", component: "wallet_list", slot: "full", priority: 200, props: {}, brickId: "walletList.currencyTable", brickName: "钱包小卡片列表", brickFamily: "WalletList", brickSize: "3x2", brickZone: "full", brickReason: "钱包列表按小卡片组展示多币种余额。" }
      : null,
    { id: "trading-accounts", component: "account_list", slot: "full", priority: 220, props: {}, brickId: "tradingAccounts.separatedList", brickName: "真实/模拟账号双列表", brickFamily: "TradingAccounts", brickSize: "3x2", brickZone: "full", brickReason: "默认展示模拟账号列表在上、真实账号列表在下。" },
  ].filter(Boolean);

  return {
    schemaVersion: 4,
    blueprintVersion: 5,
    generationMode: "brick-v2",
    name: isVip ? "AI 黑金资产首页" : isGrowth ? "AI 活动增长首页" : isTrader ? "AI 专业交易首页" : "AI 平衡工作台",
    layoutPreset: isVip ? "vipService" : isGrowth ? "conversionFirst" : isTrader ? "tradingPro" : "standardDashboard",
    themePreset: isVip ? "blackGold" : isTrader ? "default" : isGrowth && !wantsClear ? "darkTech" : "blueFinance",
    density: isTrader ? "compact" : isVip ? "spacious" : "balanced",
    personalizationStrength: isVip || isGrowth ? "strong" : "medium",
    heroFocus: isGrowth ? "ad_carousel" : isTrader ? "account_list" : "asset_summary",
    sections: [
      { id: "ai-hero", type: "hero", title: "AI 首屏", slots: isGrowth ? ["adCarousel"] : ["balanceTotal", "fundActions", "adCarousel"] },
      { id: "ai-actions", type: "split", title: "操作路径", slots: isGrowth ? ["quickActions", "promoHighlight", "referralLink"] : ["quickActions", "onboardingProgress", "referralLink"] },
      ...(isGrowth && wantsWalletList ? [{ id: "ai-wallets", type: "full", title: "钱包列表", slots: ["walletList"] }] : []),
      { id: "ai-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
    layout: isGrowth ? growthLayout : undefined,
    modules: {
      AssetOverview: { variant: isVip ? "vipHero" : isTrader ? "compactTable" : "standard" },
      WalletBalance: { variant: isVip ? "premiumCard" : "splitCurrency" },
      QuickActions: { variant: isGrowth ? "priorityButtons" : isTrader ? "minimalIcons" : "actionDock" },
      PromotionBanner: { variant: isVip ? "blackGoldVip" : isGrowth ? "gradientHero" : "splitVisual" },
    },
    moduleStyles: {
      balanceTotal: isTrader ? "metric-strip" : "command",
      fundActions: "split-buttons",
      openAccountActions: "horizontal",
      onboardingProgress: isGrowth ? "checklist" : "path",
      promoHighlight: isGrowth ? "scoreboard" : "clean",
      adCarousel: isVip || isGrowth ? "immersive" : "clean",
      quickActions: isTrader ? "toolbar" : "compact-grid",
      referralLink: isGrowth ? "link-first" : "compact",
      tradingAccounts: isTrader ? "calm-table" : "dense-cards",
    },
    moduleSettings: {
      adCarousel: { enabled: true },
      quickActions: { enabled: true, count: isTrader ? 6 : 8, display: isTrader ? "iconOnly" : "iconText" },
      wallet: { enabled: true, placement: isGrowth && !wantsWalletList ? "mergedWithAssets" : "standalone", showFundActions: isVip },
      assets: { enabled: true, showFundActions: true },
      referral: { enabled: true, showClicks: true, showRegistrations: true, showTradingAccounts: true, showPromoLink: true, showInviteCode: true, showQrCode: true },
      tradingAccounts: {
        enabled: true,
        realEnabled: true,
        demoEnabled: true,
        grouping: isTrader || wantsSeparatedAccounts ? "separated" : "combined",
        viewMode: isTrader || wantsSeparatedAccounts ? "list" : "switchable",
      },
      openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "insideTradingAccounts" },
    },
    emphasis: {
      deposit: isGrowth || isVip ? "high" : "medium",
      openAccount: isGrowth ? "high" : "medium",
      promo: isGrowth ? "high" : "medium",
      accounts: isTrader ? "high" : "medium",
    },
    aiSummary: isGrowth
      ? `已通过 ${providerConfig.name} / ${providerConfig.model} 生成活动增长首页：广告轮播首屏长模块，推广独立，Demo 列表在 Live 列表上方。`
      : `已通过 ${providerConfig.name} / ${providerConfig.model} 生成首页蓝图。`,
  };
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
      description: "以卡片或表格展示多币种钱包、余额、可用资金和出入金动作。",
      html: `<section class="${root}"><header><span>Wallet List</span><strong>多币种钱包</strong></header><div class="wallets"><article><b>USD Wallet</b><strong>99,999.99</strong><span>Available 92,100.00</span><button class="primary" type="button">Deposit</button></article><article><b>AUD Wallet</b><strong>10.48</strong><span>Available 10.48</span><button type="button">Withdraw</button></article><article><b>USDT Wallet</b><strong>6,280.00</strong><span>TRC20</span><button type="button">Transfer</button></article></div></section>`,
      css: `${baseCss}.${root} header{display:flex;align-items:center;justify-content:space-between;gap:10px}.${root} .wallets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.${root} article{display:grid;gap:7px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fbff}.${root} article strong{font-size:20px}.${root} button{width:100%}@media(max-width:720px){.${root} .wallets{grid-template-columns:1fr}}`,
      dataRequirements: ["walletRows", "currency", "balance", "availableBalance", "fundingActions"],
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
      config: mockHomepageConfig(payload, config),
      provider: config.provider,
      model: config.model,
      rawText: "",
      mock: true,
    };
  }

  const result = await callProviderWithPrompt(payload, buildPrompt(payload, config), payload.context?.schema, "homepage_config");
  return {
    config: result.json,
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
      status: "success",
      mock: Boolean(result.mock),
      durationMs: Date.now() - startedAt,
      prompt: safeRecordText(payload.prompt),
      message: result.config?.name || "首页生成成功",
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
