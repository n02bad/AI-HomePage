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
    model: "deepseek-v4-pro",
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
  const defaultMaxOutputTokens = providerId === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 2400;
  const maxOutputCeiling = providerId === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 12000;

  return {
    provider: providerId,
    name: preset.name,
    apiMode: String(modelConfig.apiMode || preset.apiMode),
    model,
    baseUrl,
    endpoint: /^https?:\/\//i.test(endpoint) ? endpoint : endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
    temperature: normalizeTemperature(providerId, temperature),
    maxOutputTokens: Number.isFinite(maxOutputTokens) ? Math.min(Math.max(Math.round(maxOutputTokens), 512), maxOutputCeiling) : defaultMaxOutputTokens,
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
    const request = client.request(
      target,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          ...options.headers,
        },
        timeout: 60_000,
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

function shouldRetryProviderRequest(config, error, attemptNumber, totalAttempts) {
  if (config.provider !== "minimax" || attemptNumber >= totalAttempts) return false;
  const status = Number(error.providerStatus);
  if ([401, 403, 404].includes(status)) return true;
  if (status === 400 && /key|token|model|plan|endpoint|base|region|not found/i.test(error.message || "")) return true;
  return !Number.isFinite(status);
}

async function requestProviderJson(config, headers, body) {
  const candidates = providerBaseUrlCandidates(config);
  const attempts = [];
  let lastError = null;
  let lastTarget = null;
  let lastConfig = config;

  for (let index = 0; index < candidates.length; index += 1) {
    const attemptConfig = { ...config, baseUrl: candidates[index] };
    const target = providerUrl(attemptConfig);

    try {
      const response = await requestJson(target, { headers, body });
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

function readComponentLibrary() {
  const data = readJsonFile(COMPONENT_LIBRARY_FILE, { components: [] });
  const components = Array.isArray(data.components) ? data.components.map((item) => normalizeGeneratedComponent(item)).filter((item) => item.html && item.css) : [];
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

function buildComponentPrompt(payload) {
  const prompt = String(payload.prompt || "").trim();
  const family = oneOfList(payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = oneOfList(payload.size, COMPONENT_SIZES, "2x1");

  const system = [
    "你是 ForexCRM 首页积木组件设计器。",
    "你只能返回一个 JSON object，不要 markdown，不要解释。",
    "组件用于金融/交易 CRM 用户端首页，必须克制、专业、信息清晰。",
    "返回 HTML 和 CSS 片段，但不要返回 script、外链、iframe、表单提交逻辑、图片 URL 或不安全属性。",
    "HTML 根元素必须使用 class，并且 CSS 必须只作用于该 class 范围，避免污染其他页面。",
    "圆角控制在 8px 或以下，避免营销式大圆角和装饰性渐变球。",
    "组件必须能作为积木参与首页布局，明确 size、layoutHints 和 dataRequirements。",
  ].join("\n");

  const user = [
    `目标模块: ${family}`,
    `推荐尺寸: ${size}`,
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
      "先按业务积木选模块，再用 sections/moduleStyles/moduleSettings 组合，不直接生成 HTML/CSS。",
      "TradingAccounts 可以拆成 Live List 和 Demo List；用户要求两个列表或真实/模拟分开时必须用 separated + list。",
      "用户要求列表形式、不是卡片时，tradingAccounts.viewMode 必须是 list，不能用 card 或 switchable 作为主结果。",
      "用户要求快捷入口两行一行四个时，quickActions.count 必须是 8。",
      "用户要求不要绑定账号入口时，openAccount.bind 必须是 false。",
      "用户要求钱包列表时，当前正式首页先用 WalletBalance/钱包独立模块承接，不能伪造不存在的 WalletList 表格。",
    ],
    bricks: [
      { id: "AssetOverview", mapsTo: "balanceTotal/assets", use: "账户余额总览、总资产、资金动作承接" },
      { id: "WalletBalance", mapsTo: "walletBalance/wallet", use: "钱包余额、钱包独立展示、多币种钱包的临时承接" },
      { id: "QuickActions", mapsTo: "quickActions", use: "快捷入口矩阵、两行四列、交易工具入口" },
      { id: "PromotionBanner", mapsTo: "adCarousel/promoHighlight", use: "轮播图、广告图、活动 Banner" },
      { id: "TradingAccounts", mapsTo: "tradingAccounts", use: "真实账号列表、模拟账号列表、账号工作台" },
      { id: "OpenAccount", mapsTo: "openAccount/openAccountActions", use: "开真实账号、开模拟账号、绑定账号入口" },
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
    "必须使用白名单枚举值；未知需求用最接近的白名单值承接。",
  ].join("\n");

  const contract = {
    requiredFields: [
      "schemaVersion",
      "blueprintVersion",
      "name",
      "layoutPreset",
      "themePreset",
      "personalizationStrength",
      "density",
      "heroFocus",
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
      heroFocus: ["asset_summary", "promo_banner", "quick_actions", "account_list", "risk_notice", "wallet_balance", "copytrading_summary"],
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
      ],
      moduleVariants: {
        AssetOverview: ["standard", "vipHero", "compactTable", "darkTerminal"],
        WalletBalance: ["standard", "splitCurrency", "compact", "premiumCard"],
        QuickActions: ["gridCards", "actionDock", "priorityButtons", "minimalIcons"],
        PromotionBanner: ["imageBanner", "gradientHero", "blackGoldVip", "splitVisual"],
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
      "不要返回 layout；前端会根据 sections 自动生成 layout。",
      "交易账号如需真实/模拟分开，moduleSettings.tradingAccounts.grouping 必须为 separated 且 viewMode 为 list。",
      "列表需求优先使用 tradingAccounts.viewMode=list，不要使用卡片作为主结果。",
      "不要绑定账号入口时，moduleSettings.openAccount.bind 必须为 false。",
      "入金/出金出现时，emphasis.deposit 使用 high，且 assets.showFundActions 为 true。",
      "aiSummary 不超过 80 个中文字符。",
    ],
    outputShape: {
      schemaVersion: 4,
      blueprintVersion: 4,
      name: "不超过28字",
      layoutPreset: "standardDashboard",
      themePreset: "default",
      personalizationStrength: "medium",
      density: "balanced",
      heroFocus: "asset_summary",
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
  if (config.provider === "minimax") return buildMiniMaxPrompt(payload);

  const context = payload.context || {};
  const prompt = String(payload.prompt || "").trim();
  const variant = Number(payload.variant || 0);
  const now = new Date().toISOString();

  const system = [
    "你是 ForexCRM 的首页蓝图生成器。",
    "你的任务是把管理员的中文需求转换成安全的首页配置 JSON。",
    "只能返回一个 JSON object，不要 markdown，不要解释，不要生成 HTML/CSS/JS。",
    "配置必须围绕已有业务模块：资产、钱包、入金出金、开户、开户进度、活动广告、快捷入口、邀请链接、交易账号。",
    "不要删除核心业务能力；如果隐藏某模块，必须让相关能力被其他模块承接。",
    "开户动作必须保留真实账号、模拟账号、绑定账号三类可配置动作。",
    "入金、出金如果出现，应作为高可见操作。",
    "必须参考首页积木编排规则，把需求映射到 sections、moduleStyles 和 moduleSettings。",
    "如果管理员要求交易账号分成两个列表、真实和模拟分开、Live/Demo 分开，必须设置 moduleSettings.tradingAccounts.grouping = \"separated\" 且 viewMode = \"list\"。",
    "如果管理员要求列表形式、不是卡片，禁止返回交易账号卡片主视图。",
    "如果管理员要求不要绑定账号入口，必须设置 moduleSettings.openAccount.bind = false。",
    "优先使用传入 schema、默认配置、模块变体和模块样式中的白名单值。",
    "返回字段建议包括 schemaVersion、blueprintVersion、name、layoutPreset、themePreset、density、heroFocus、sections、modules、moduleStyles、moduleSettings、emphasis、aiSummary。",
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

function buildOpenAiResponsesBody(config, promptParts, schema) {
  const body = {
    model: config.model,
    instructions: promptParts.system,
    input: promptParts.user,
    temperature: config.temperature,
    max_output_tokens: config.maxOutputTokens,
  };

  if (schema && typeof schema === "object") {
    body.text = {
      format: {
        type: "json_schema",
        name: "homepage_config",
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
  }

  return body;
}

function buildProviderRequest(config, apiKey, promptParts, schema) {
  const headers = { authorization: `Bearer ${apiKey}` };
  let body;

  if (config.apiMode === "responses") {
    body = buildOpenAiResponsesBody(config, promptParts, schema);
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

  throw Object.assign(new Error("AI response did not contain valid homepage JSON"), { statusCode: 502 });
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

  return {
    schemaVersion: 4,
    blueprintVersion: 4,
    name: isVip ? "AI 黑金资产首页" : isGrowth ? "AI 活动增长首页" : isTrader ? "AI 专业交易首页" : "AI 平衡工作台",
    layoutPreset: isVip ? "vipService" : isGrowth ? "conversionFirst" : isTrader ? "tradingPro" : "standardDashboard",
    themePreset: isVip ? "blackGold" : isTrader ? "default" : "blueFinance",
    density: isTrader ? "compact" : isVip ? "spacious" : "balanced",
    personalizationStrength: isVip || isGrowth ? "strong" : "medium",
    heroFocus: isGrowth ? "promo_banner" : isTrader ? "account_list" : "asset_summary",
    sections: [
      { id: "ai-hero", type: "hero", title: "AI 首屏", slots: isGrowth ? ["adCarousel", "fundActions", "quickActions"] : ["balanceTotal", "fundActions", "adCarousel"] },
      { id: "ai-actions", type: "split", title: "操作路径", slots: ["quickActions", "onboardingProgress", "referralLink"] },
      { id: "ai-accounts", type: "full", title: "交易账号", slots: ["tradingAccounts"] },
    ],
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
      wallet: { enabled: true, placement: isGrowth ? "mergedWithAssets" : "standalone", showFundActions: isVip },
      assets: { enabled: true, showFundActions: true },
      referral: { enabled: true, showClicks: true, showRegistrations: true, showTradingAccounts: true, showPromoLink: true, showInviteCode: true, showQrCode: true },
      tradingAccounts: { enabled: true, realEnabled: true, demoEnabled: true, grouping: isTrader ? "separated" : "combined", viewMode: isTrader ? "list" : "switchable" },
      openAccount: { enabled: true, real: true, demo: true, bind: true, placement: "insideTradingAccounts" },
    },
    emphasis: {
      deposit: isGrowth || isVip ? "high" : "medium",
      openAccount: isGrowth ? "high" : "medium",
      promo: isGrowth ? "high" : "medium",
      accounts: isTrader ? "high" : "medium",
    },
    aiSummary: `已通过 ${providerConfig.name} / ${providerConfig.model} 生成首页蓝图。`,
  };
}

function mockGeneratedComponent(payload, providerConfig) {
  const family = oneOfList(payload.family, COMPONENT_FAMILIES, "ClientHomeAtoms");
  const size = oneOfList(payload.size, COMPONENT_SIZES, "2x1");
  const name = `${family} AI 样式`;
  const root = safeId(`${family}-${Date.now().toString(36)}`, "ai-brick");

  return normalizeGeneratedComponent(
    {
      name,
      family,
      size,
      description: `通过 ${providerConfig.name} / ${providerConfig.model} 生成的 ${family} 组件样式。`,
      tags: [family, size, "AI"],
      html: `
        <section class="${root}">
          <div>
            <span>${family}</span>
            <strong>${name}</strong>
            <p>${cleanText(payload.prompt, "适合首页积木组合的业务组件。", 120)}</p>
          </div>
          <button type="button">Primary Action</button>
        </section>
      `,
      css: `
        .${root} {
          min-height: 148px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          background: #fff;
          color: #172033;
          font-family: Inter, system-ui, sans-serif;
        }
        .${root} span {
          color: #2563eb;
          font-size: 12px;
          font-weight: 850;
        }
        .${root} strong {
          display: block;
          margin-top: 7px;
          font-size: 22px;
          letter-spacing: 0;
        }
        .${root} p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }
        .${root} button {
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid #2563eb;
          border-radius: 8px;
          background: #2563eb;
          color: #fff;
          font-weight: 800;
        }
      `,
      layoutHints: ["可放在 main 或 full 区域", "与资产、快捷入口或交易账号模块搭配"],
      dataRequirements: ["模块标题", "说明文案", "主操作链接"],
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

async function callProviderWithPrompt(payload, promptParts, schema) {
  const config = normalizeProviderConfig(payload.modelConfig);

  const apiKey = resolveApiKey(config);
  if (!apiKey) {
    const expected = config.keyEnv.join(" or ");
    throw Object.assign(new Error(`Missing API key. Set ${expected} or enter a temporary key in the UI.`), { statusCode: 400 });
  }

  const { headers, body } = buildProviderRequest(config, apiKey, promptParts, schema || payload.context?.schema);

  let providerResult;
  try {
    providerResult = await requestProviderJson(config, headers, body);
  } catch (error) {
    throw error.details ? error : enrichProviderError(error, config, null);
  }
  const usedConfig = providerResult.config;
  const rawText = extractTextFromAiResponse(providerResult.response, usedConfig.apiMode);
  let json;
  try {
    json = extractJsonObject(rawText);
  } catch (error) {
    throw enrichProviderError(error, usedConfig, providerResult.target, {
      rawTextSnippet: stripReasoningText(rawText).slice(0, 500),
      attempts: providerResult.attempts,
    });
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
  const testConfig = { ...config, maxOutputTokens: Math.min(config.maxOutputTokens, 512) };
  const { headers, body } = buildProviderRequest(testConfig, apiKey, promptParts, null);

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

  const result = await callProviderWithPrompt(payload, buildPrompt(payload, config), payload.context?.schema);
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

  const result = await callProviderWithPrompt(payload, buildComponentPrompt(payload), GENERATED_COMPONENT_JSON_SCHEMA);
  const component = saveComponent(normalizeGeneratedComponent(result.json, payload));
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

  const result = await callProviderWithPrompt(payload, buildCompositionPrompt(payload), COMPONENT_COMPOSITION_JSON_SCHEMA);
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
  try {
    const payload = await readJsonBody(req);
    const result = await callComponentProvider(payload);
    sendJson(res, 200, { ok: true, ...result, library: readComponentLibrary() });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component generation failed",
      details: error.details || null,
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
  try {
    const payload = await readJsonBody(req);
    const library = readComponentLibrary();
    const requestedIds = new Set(Array.isArray(payload.componentIds) ? payload.componentIds : []);
    const components = requestedIds.size ? library.components.filter((component) => requestedIds.has(component.id)) : library.components;
    const result = await callCompositionProvider({ ...payload, components });
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500;
    sendJson(res, status, {
      ok: false,
      error: error.message || "Component composition failed",
      details: error.details || null,
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
