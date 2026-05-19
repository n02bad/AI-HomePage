(function () {
  const STORAGE_KEY = "forexcrm.ai.model.config";
  const RECENT_KEY = "forexcrm.ai.model.recent";
  const LEGACY_CONFIG_KEYS = ["forexcrm.home.ai.model.config", "forexcrm.auth.ai.model.config"];
  const HOME_HISTORY_KEY = "forexcrm.home.ai.call.history";
  const MAX_RECENT_MODELS = 24;
  const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
  const MINIMAX_CN_TYPED_ALIAS_BASE_URL = "https://api.minimaxi.cn/v1";
  const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io/v1";
  const MINIMAX_MAX_COMPLETION_TOKENS = 2048;
  const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1";
  const KIMI_GLOBAL_BASE_URL = "https://api.moonshot.ai/v1";
  const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  const GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
  const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
  const GEMINI_TEXT_MODELS = [
    GEMINI_DEFAULT_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.1-pro-preview-customtools",
  ];
  const GEMINI_MODEL_ALIASES = {
    "gemini 3 flash": "gemini-3-flash-preview",
    "gemini 3 pro preview": "gemini-3.1-pro-preview",
    "gemini 3 pro preview customtools": "gemini-3.1-pro-preview-customtools",
    "gemini 3 pro preview custom tools": "gemini-3.1-pro-preview-customtools",
    "gemini 3 1 pro preview custom tools": "gemini-3.1-pro-preview-customtools",
  };
  const PROVIDER_ORDER = ["gemini", "deepseek", "kimi", "minimax", "openai", "claude"];

  const AI_MODEL_PRESETS = {
    openai: {
      provider: "openai",
      name: "OpenAI",
      badge: "Responses API",
      model: "gpt-5.2",
      models: ["gpt-5.2", "gpt-5.2-pro", "gpt-5-mini", "gpt-4.1"],
      baseUrl: "https://api.openai.com/v1",
      endpoint: "/responses",
      apiMode: "responses",
      apiKeyLabel: "OPENAI_API_KEY",
      note: "适合生成稳定 JSON 蓝图、结构化输出和复杂页面策略。",
    },
    claude: {
      provider: "claude",
      name: "Claude",
      badge: "Messages API",
      model: "claude-sonnet-4-6",
      models: ["claude-sonnet-4-6", "claude-sonnet-4-5-20250929", "claude-opus-4-6"],
      baseUrl: "https://api.anthropic.com/v1",
      endpoint: "/messages",
      apiMode: "anthropic-messages",
      apiKeyLabel: "ANTHROPIC_API_KEY",
      note: "适合长需求理解、信息架构判断和多步骤方案推理。",
    },
    minimax: {
      provider: "minimax",
      name: "MiniMax",
      badge: "OpenAI Compatible",
      model: "MiniMax-M2.7",
      models: ["MiniMax-M2.7", "MiniMax-M2.7-highspeed", "MiniMax-M2.5", "MiniMax-M2.5-highspeed", "MiniMax-M2.1"],
      baseUrl: MINIMAX_CN_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MINIMAX_API_KEY",
      note: `适合中文业务语境。国内入口使用 ${MINIMAX_CN_BASE_URL}。`,
    },
    kimi: {
      provider: "kimi",
      name: "Kimi",
      badge: "OpenAI Compatible",
      model: "kimi-k2.6",
      models: ["kimi-k2.6", "kimi-k2.5", "kimi-k2-thinking", "moonshot-v1-128k"],
      baseUrl: KIMI_CN_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MOONSHOT_API_KEY",
      note: "适合中文长文本理解、运营需求摘要和页面方案整理。",
    },
    deepseek: {
      provider: "deepseek",
      name: "DeepSeek",
      badge: "OpenAI Compatible",
      model: "deepseek-v4-flash",
      models: ["deepseek-v4-flash", "deepseek-v4-pro"],
      baseUrl: DEEPSEEK_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "DEEPSEEK_API_KEY",
      note: "DeepSeek V4 官方 API 模型。V4-Flash 适合稳定生成，V4-Pro 可手动选择。",
    },
    gemini: {
      provider: "gemini",
      name: "Gemini",
      badge: "OpenAI Compatible",
      model: GEMINI_DEFAULT_MODEL,
      models: GEMINI_TEXT_MODELS,
      baseUrl: GEMINI_OPENAI_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "GEMINI_API_KEY",
      note: `Google Gemini API 的 OpenAI 兼容接口；可选择 Gemini 2.5、Gemini 3 Flash Preview、Gemini 3.1 Flash-Lite 和 Gemini 3.1 Pro Preview 文本模型。Base URL 是 ${GEMINI_OPENAI_BASE_URL}。`,
    },
  };

  const DEFAULT_MODEL_CONFIG = {
    ...AI_MODEL_PRESETS.openai,
    callMode: "serverProxy",
    proxyEndpoint: "/api/home-ai/complete",
    temperature: 0.4,
    maxOutputTokens: 6000,
    apiKey: "",
    apiKeys: {},
    providerConfigs: {},
  };

  let providerRuntimeStatus = {};
  let activePickerModal = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readJsonStorage(key, fallback) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function hasOwn(source, key) {
    return Object.prototype.hasOwnProperty.call(source || {}, key);
  }

  function providerPreset(provider) {
    return AI_MODEL_PRESETS[provider] || AI_MODEL_PRESETS.openai;
  }

  function canonicalModelKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function modelIdFromValue(provider, value) {
    const preset = providerPreset(provider);
    const raw = String(value || "").trim();
    if (!raw) return preset.model;
    const knownModels = preset.models || [preset.model];
    if (knownModels.includes(raw)) return raw;

    const key = canonicalModelKey(raw);
    const inferredProvider = providerIdFromValue(raw);
    if (inferredProvider && inferredProvider !== preset.provider) return preset.model;
    const known = knownModels.find((model) => canonicalModelKey(model) === key);
    if (known) return known;
    if (preset.provider === "gemini" && GEMINI_MODEL_ALIASES[key]) return GEMINI_MODEL_ALIASES[key];
    return raw;
  }

  function providerIdFromValue(value) {
    const source = String(value || "").trim().toLowerCase();
    if (!source) return "";

    const exact = PROVIDER_ORDER.find((provider) => source === provider || source === providerPreset(provider).name.toLowerCase());
    if (exact) return exact;

    if (/generativelanguage\.googleapis\.com|\bgemini[-_\s]/i.test(source)) return "gemini";
    if (/api\.deepseek\.com|\bdeepseek[-_\s]/i.test(source)) return "deepseek";
    if (/api\.moonshot\.(?:cn|ai)|\bkimi[-_\s]|\bmoonshot[-_\s]/i.test(source)) return "kimi";
    if (/api\.minimax(?:i)?\.(?:com|cn|io)|\bminimax[-_\s]/i.test(source)) return "minimax";
    if (/anthropic\.com|\bclaude[-_\s]/i.test(source)) return "claude";
    if (/api\.openai\.com|\bgpt[-_\s]|\bo[0-9]/i.test(source)) return "openai";

    return PROVIDER_ORDER.find((provider) => source.includes(provider) || source.includes(providerPreset(provider).name.toLowerCase())) || "";
  }

  function inferProviderFromConfig(source = {}) {
    const raw = source && typeof source === "object" ? source : {};
    const explicit = providerIdFromValue(raw.provider || raw.providerId || raw.providerName || raw.name);
    const inferred = providerIdFromValue([raw.model, raw.baseUrl, raw.endpoint, raw.apiMode].filter(Boolean).join(" "));
    if (explicit && !(explicit === "openai" && inferred && inferred !== "openai")) return explicit;
    return inferred || explicit || "openai";
  }

  function isKimiFixedTemperatureModel(model) {
    return /^kimi-k2\.(?:6|5)\b/i.test(String(model || ""));
  }

  function normalizeTemperature(provider, value, model) {
    if (provider === "kimi") return isKimiFixedTemperatureModel(model) ? 0.6 : 1;
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_MODEL_CONFIG.temperature;
    if (provider === "minimax") return Math.min(Math.max(number, 0.01), 1);
    return Math.min(Math.max(number, 0), 2);
  }

  function normalizeBaseUrl(provider, value) {
    const baseUrl = String(value || "").trim().replace(/\/+$/, "");
    if (!["minimax", "kimi", "gemini"].includes(provider)) return baseUrl;

    try {
      const target = new URL(baseUrl);
      if (provider === "minimax" && ["api.minimaxi.cn", "api.minimax.io"].includes(target.hostname)) return MINIMAX_CN_BASE_URL;
      if (provider === "kimi" && target.hostname === "api.moonshot.ai") return KIMI_CN_BASE_URL;
      if (provider === "gemini" && target.hostname === "generativelanguage.googleapis.com") {
        if (target.pathname === "/" || target.pathname === "/v1beta" || target.pathname === "/v1beta/openai/") return GEMINI_OPENAI_BASE_URL;
      }
    } catch (error) {
      return baseUrl;
    }

    if (provider === "minimax") return [MINIMAX_CN_TYPED_ALIAS_BASE_URL, MINIMAX_GLOBAL_BASE_URL].includes(baseUrl) ? MINIMAX_CN_BASE_URL : baseUrl;
    if (provider === "gemini") return baseUrl === "https://generativelanguage.googleapis.com/v1beta/openai/" ? GEMINI_OPENAI_BASE_URL : baseUrl;
    return baseUrl === KIMI_GLOBAL_BASE_URL ? KIMI_CN_BASE_URL : baseUrl;
  }

  function profileFromConfig(config) {
    return {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      endpoint: config.endpoint,
      apiMode: config.apiMode,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    };
  }

  function collectKeysFromProviderConfigs(providerConfigs = {}) {
    return Object.values(providerConfigs).reduce((keys, item) => {
      if (item?.provider && item.apiKey) keys[item.provider] = String(item.apiKey).trim();
      return keys;
    }, {});
  }

  function sanitizeModelConfig(source = {}, options = {}) {
    const raw = source && typeof source === "object" ? source : {};
    const provider = inferProviderFromConfig(raw);
    const preset = providerPreset(provider);
    const sourceProviderConfigs = raw.providerConfigs && typeof raw.providerConfigs === "object" ? raw.providerConfigs : {};
    const storedProviderConfig = sourceProviderConfigs[provider] && typeof sourceProviderConfigs[provider] === "object" ? sourceProviderConfigs[provider] : {};
    const merged = {
      ...DEFAULT_MODEL_CONFIG,
      ...preset,
      ...storedProviderConfig,
      ...raw,
      provider,
    };
    const apiKeys = {
      ...collectKeysFromProviderConfigs(sourceProviderConfigs),
      ...(raw.apiKeys && typeof raw.apiKeys === "object" ? raw.apiKeys : {}),
    };
    const model = modelIdFromValue(provider, merged.model || preset.model);
    const baseUrl = normalizeBaseUrl(provider, merged.baseUrl || preset.baseUrl);
    const endpoint = String(merged.endpoint || preset.endpoint).trim() || preset.endpoint;
    const temperature = normalizeTemperature(provider, merged.temperature, model);
    const maxOutputTokensNumber = Number(merged.maxOutputTokens);
    const maxOutputTokens = Number.isFinite(maxOutputTokensNumber)
      ? Math.min(Math.max(Math.round(maxOutputTokensNumber), provider === "minimax" ? 512 : 6000), provider === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 12000)
      : provider === "minimax"
        ? MINIMAX_MAX_COMPLETION_TOKENS
        : DEFAULT_MODEL_CONFIG.maxOutputTokens;
    const hasApiKeyField = hasOwn(raw, "apiKey");
    let apiKey = hasApiKeyField ? String(raw.apiKey || "").trim() : String(merged.apiKey || apiKeys[provider] || "").trim();

    if (!apiKey && hasApiKeyField && options.preserveEmptyApiKey !== false && apiKeys[provider]) {
      apiKey = String(apiKeys[provider]).trim();
    }

    if (apiKey) {
      apiKeys[provider] = apiKey;
    } else if (hasApiKeyField && options.clearEmptyApiKey) {
      delete apiKeys[provider];
    }

    const providerConfigs = {
      ...sourceProviderConfigs,
      [provider]: {
        provider,
        model: model.slice(0, 100),
        baseUrl: baseUrl.slice(0, 180),
        endpoint: endpoint.startsWith("/") ? endpoint.slice(0, 120) : `/${endpoint.slice(0, 119)}`,
        apiMode: String(merged.apiMode || preset.apiMode).slice(0, 40),
        temperature,
        maxOutputTokens,
      },
    };

    return {
      ...preset,
      provider,
      model: model.slice(0, 100),
      baseUrl: baseUrl.slice(0, 180),
      endpoint: endpoint.startsWith("/") ? endpoint.slice(0, 120) : `/${endpoint.slice(0, 119)}`,
      apiMode: String(merged.apiMode || preset.apiMode).slice(0, 40),
      callMode: ["local", "serverProxy"].includes(merged.callMode) ? merged.callMode : DEFAULT_MODEL_CONFIG.callMode,
      proxyEndpoint: String(merged.proxyEndpoint || DEFAULT_MODEL_CONFIG.proxyEndpoint).trim() || DEFAULT_MODEL_CONFIG.proxyEndpoint,
      temperature,
      maxOutputTokens,
      apiKey,
      apiKeys,
      providerConfigs,
    };
  }

  function legacyConfigCandidates() {
    return LEGACY_CONFIG_KEYS.map((key) => readJsonStorage(key, null)).filter((item) => item && typeof item === "object");
  }

  function migratedLegacyConfig() {
    const legacyConfigs = legacyConfigCandidates();
    if (!legacyConfigs.length) return null;

    const apiKeys = {};
    const providerConfigs = {};
    legacyConfigs.forEach((item) => {
      const normalized = sanitizeModelConfig(item);
      Object.assign(apiKeys, normalized.apiKeys || {});
      providerConfigs[normalized.provider] = profileFromConfig(normalized);
    });

    const preferred = legacyConfigs.find((item) => item?.apiKey) || legacyConfigs[0];
    return sanitizeModelConfig({
      ...preferred,
      apiKeys,
      providerConfigs,
    });
  }

  function loadModelConfig() {
    const saved = readJsonStorage(STORAGE_KEY, null);
    if (saved && typeof saved === "object") return sanitizeModelConfig(saved);

    const migrated = migratedLegacyConfig();
    if (migrated) {
      writeJsonStorage(STORAGE_KEY, migrated);
      return migrated;
    }

    return sanitizeModelConfig(DEFAULT_MODEL_CONFIG);
  }

  function hasSavedConfig() {
    return Boolean(window.localStorage.getItem(STORAGE_KEY) || LEGACY_CONFIG_KEYS.some((key) => window.localStorage.getItem(key)));
  }

  function saveModelConfig(config, options = {}) {
    const current = loadModelConfig();
    const normalized = sanitizeModelConfig(
      {
        ...current,
        ...(config || {}),
        apiKeys: {
          ...(current.apiKeys || {}),
          ...((config && config.apiKeys) || {}),
        },
        providerConfigs: {
          ...(current.providerConfigs || {}),
          ...((config && config.providerConfigs) || {}),
        },
      },
      options,
    );
    writeJsonStorage(STORAGE_KEY, normalized);
    LEGACY_CONFIG_KEYS.forEach((key) => writeJsonStorage(key, normalized));
    rememberModel(normalized, options.source || "manual");
    window.dispatchEvent(new CustomEvent("forexcrm:model-config-change", { detail: { config: normalized } }));
    return normalized;
  }

  function clearProviderKey(provider) {
    const current = loadModelConfig();
    const targetProvider = providerPreset(provider || current.provider).provider;
    const apiKeys = { ...(current.apiKeys || {}) };
    delete apiKeys[targetProvider];
    const next = sanitizeModelConfig({
      ...current,
      provider: targetProvider,
      apiKey: "",
      apiKeys,
    }, { clearEmptyApiKey: true, preserveEmptyApiKey: false });
    writeJsonStorage(STORAGE_KEY, next);
    LEGACY_CONFIG_KEYS.forEach((key) => writeJsonStorage(key, next));
    window.dispatchEvent(new CustomEvent("forexcrm:model-config-change", { detail: { config: next } }));
    return next;
  }

  function configForProvider(provider, baseConfig = loadModelConfig()) {
    const current = sanitizeModelConfig(baseConfig);
    const targetProvider = providerPreset(provider).provider;
    const preset = providerPreset(targetProvider);
    const profile = current.providerConfigs?.[targetProvider] || {};
    return sanitizeModelConfig({
      ...current,
      ...preset,
      ...profile,
      provider: targetProvider,
      apiKey: current.apiKeys?.[targetProvider] || "",
      apiKeys: current.apiKeys,
      providerConfigs: current.providerConfigs,
    });
  }

  function configFromOption(option, baseConfig = loadModelConfig()) {
    const targetProvider = providerPreset(option?.provider).provider;
    const base = configForProvider(targetProvider, baseConfig);
    return sanitizeModelConfig({
      ...base,
      ...(option || {}),
      provider: targetProvider,
      apiKey: base.apiKeys?.[targetProvider] || "",
      apiKeys: base.apiKeys,
      providerConfigs: base.providerConfigs,
    });
  }

  function modelIdentity(value) {
    const provider = providerPreset(value?.provider).provider;
    return `${provider}:${modelIdFromValue(provider, value?.model || providerPreset(provider).model)}`;
  }

  function loadRecentModels() {
    const saved = readJsonStorage(RECENT_KEY, []);
    const recent = Array.isArray(saved) ? saved : [];
    const history = readJsonStorage(HOME_HISTORY_KEY, []);
    const historyOptions = Array.isArray(history)
      ? history
          .map((record) => ({
            provider: inferProviderFromConfig(record),
            model: record.model,
            source: "调用记录",
            at: record.at,
          }))
          .filter((item) => item.provider && item.model)
      : [];
    return recent.concat(historyOptions);
  }

  function rememberModel(config, source = "manual") {
    const normalized = sanitizeModelConfig(config);
    const records = loadRecentModels().filter((item) => modelIdentity(item) !== modelIdentity(normalized));
    const next = [
      {
        provider: normalized.provider,
        model: normalized.model,
        baseUrl: normalized.baseUrl,
        endpoint: normalized.endpoint,
        apiMode: normalized.apiMode,
        temperature: normalized.temperature,
        maxOutputTokens: normalized.maxOutputTokens,
        source,
        at: new Date().toISOString(),
      },
      ...records,
    ].slice(0, MAX_RECENT_MODELS);
    writeJsonStorage(RECENT_KEY, next);
  }

  function providerStatus(provider) {
    return providerRuntimeStatus[provider] || {};
  }

  function maskedApiKey(value) {
    const key = String(value || "");
    if (!key) return "";
    if (key.length <= 10) return "已保存 Key";
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  }

  function keyStatusLabel(config, runtimeStatus = providerRuntimeStatus) {
    const normalized = sanitizeModelConfig(config);
    const savedKey = normalized.apiKey || normalized.apiKeys?.[normalized.provider] || "";
    const runtime = runtimeStatus[normalized.provider] || {};
    if (savedKey) return maskedApiKey(savedKey);
    if (runtime.hasServerKey) return `服务端已配置 ${runtime.serverKeyEnv || providerPreset(normalized.provider).apiKeyLabel}`;
    return "未配置 Key";
  }

  async function fetchProviderStatus(endpoint = "/api/home-ai/providers") {
    try {
      const response = await fetch(endpoint, { headers: { accept: "application/json" }, cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.providers) return providerRuntimeStatus;
      providerRuntimeStatus = Object.fromEntries(
        Object.entries(payload.providers).map(([provider, item]) => [
          provider,
          {
            hasServerKey: Boolean(item?.hasServerKey),
            serverKeyEnv: String(item?.serverKeyEnv || ""),
            keyEnv: Array.isArray(item?.keyEnv) ? item.keyEnv : [],
            model: modelIdFromValue(provider, item?.model || providerPreset(provider).model),
            models: Array.isArray(item?.models) ? item.models.map((model) => modelIdFromValue(provider, model)).filter(Boolean) : [],
          },
        ]),
      );
      return providerRuntimeStatus;
    } catch (error) {
      return providerRuntimeStatus;
    }
  }

  function modelOptions(baseConfig = loadModelConfig(), runtimeStatus = providerRuntimeStatus) {
    const current = sanitizeModelConfig(baseConfig);
    const options = new Map();
    const add = (item, sourceLabel) => {
      const provider = providerPreset(item.provider).provider;
      const config = configFromOption({ ...item, provider }, current);
      const key = modelIdentity(config);
      if (options.has(key)) {
        options.set(key, { ...options.get(key), ...config, sourceLabel: options.get(key).sourceLabel || sourceLabel });
        return;
      }
      options.set(key, {
        ...profileFromConfig(config),
        sourceLabel,
        providerName: providerPreset(provider).name,
        keyStatus: keyStatusLabel(config, runtimeStatus),
        active: modelIdentity(config) === modelIdentity(current),
      });
    };

    add(current, "当前模型");
    PROVIDER_ORDER.forEach((provider) => {
      const configured = configForProvider(provider, current);
      const runtimeModels = runtimeStatus[provider]?.models || [];
      const presetModels = providerPreset(provider).models || [configured.model];
      const models = [...new Set([configured.model, ...runtimeModels, ...presetModels].map((model) => modelIdFromValue(provider, model)).filter(Boolean))];
      models.forEach((model) => {
        const sourceLabel = model === configured.model ? (current.providerConfigs?.[provider] ? "已配置" : "默认模型") : "支持模型";
        add({ ...configured, model }, sourceLabel);
      });
    });
    loadRecentModels().forEach((item) => add(item, item.source || "已用模型"));
    return [...options.values()];
  }

  function closeModelPicker() {
    if (activePickerModal) {
      activePickerModal.remove();
      activePickerModal = null;
    }
  }

  function openModelPicker(options = {}) {
    closeModelPicker();
    let runtimeStatus = options.providerStatus || providerRuntimeStatus;
    let selectedConfig = sanitizeModelConfig(options.activeConfig || loadModelConfig());
    const modal = document.createElement("div");
    activePickerModal = modal;
    modal.className = "ai-model-modal ai-model-picker-modal";
    modal.dataset.sharedModelPicker = "true";

    const render = () => {
      const selectedPreset = providerPreset(selectedConfig.provider);
      const availableOptions = modelOptions(selectedConfig, runtimeStatus);
      const usedOptions = availableOptions.filter((item) => ["当前模型", "已配置", "已用模型", "调用记录", "manual"].includes(item.sourceLabel) || item.active);
      modal.innerHTML = `
        <div class="ai-model-modal-backdrop" data-model-picker-close></div>
        <section class="ai-model-dialog ai-model-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="sharedModelPickerTitle">
          <header>
            <div>
              <span class="section-kicker">MODEL SELECT</span>
              <h2 id="sharedModelPickerTitle">${escapeHtml(options.title || "选择当前使用的大模型")}</h2>
              <p>${escapeHtml(options.description || "这里只选择当前想用的模型。API Key、Base URL、Endpoint 等信息在统一大模型配置页维护，已保存的 Key 会自动沿用。")}</p>
            </div>
            <button class="ai-model-close" type="button" data-model-picker-close aria-label="关闭">×</button>
          </header>

          <div class="ai-model-current-card">
            <div>
              <span>当前选择</span>
              <strong>${escapeHtml(selectedPreset.name)} / ${escapeHtml(selectedConfig.model)}</strong>
              <small>${escapeHtml(keyStatusLabel(selectedConfig, runtimeStatus))}</small>
            </div>
            <a href="./ai-model-settings.html">统一配置</a>
          </div>

          <section class="ai-model-picker-section">
            <div class="ai-model-section-head">
              <span>可选模型</span>
              <strong>选择这次生成要使用的模型</strong>
            </div>
            <div class="ai-model-option-grid">
              ${availableOptions
                .map((item, index) => {
                  const isActive = modelIdentity(item) === modelIdentity(selectedConfig);
                  return `
                    <button class="${isActive ? "active" : ""}" type="button" data-model-picker-option="${index}">
                      <span>${escapeHtml(item.providerName || providerPreset(item.provider).name)}</span>
                      <strong>${escapeHtml(item.model)}</strong>
                      <small>${escapeHtml(`${item.sourceLabel || "模型"} · ${item.keyStatus || keyStatusLabel(item, runtimeStatus)}`)}</small>
                    </button>
                  `;
                })
                .join("")}
            </div>
          </section>

          <section class="ai-model-picker-section">
            <div class="ai-model-section-head">
              <span>已用模型</span>
              <strong>最近保存或调用过的模型</strong>
            </div>
            <div class="ai-model-used-list">
              ${
                usedOptions.length
                  ? usedOptions
                      .slice(0, 8)
                      .map(
                        (item, index) => `
                          <button type="button" data-model-picker-used="${index}">
                            <b>${escapeHtml(item.providerName || providerPreset(item.provider).name)} / ${escapeHtml(item.model)}</b>
                            <small>${escapeHtml(item.sourceLabel || "已用模型")}</small>
                          </button>
                        `,
                      )
                      .join("")
                  : '<p class="ai-model-empty">暂无已用模型，先去统一配置页保存一个模型。</p>'
              }
            </div>
          </section>

          <footer>
            <button type="button" data-model-picker-close>取消</button>
            <button class="primary" type="button" data-model-picker-save>${escapeHtml(options.saveLabel || "使用这个模型")}</button>
          </footer>
        </section>
      `;

      modal.querySelectorAll("[data-model-picker-close]").forEach((button) => button.addEventListener("click", closeModelPicker));
      modal.querySelectorAll("[data-model-picker-option]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedConfig = configFromOption(availableOptions[Number(button.dataset.modelPickerOption)], selectedConfig);
          render();
        });
      });
      modal.querySelectorAll("[data-model-picker-used]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedConfig = configFromOption(usedOptions[Number(button.dataset.modelPickerUsed)], selectedConfig);
          render();
        });
      });
      modal.querySelector("[data-model-picker-save]")?.addEventListener("click", () => {
        const saved = saveModelConfig(selectedConfig, { source: options.source || "picker" });
        options.onSave?.(saved);
        closeModelPicker();
      });
    };

    document.body.appendChild(modal);
    render();
    fetchProviderStatus().then((status) => {
      if (!activePickerModal) return;
      runtimeStatus = status;
      render();
    });
  }

  window.ForexCRMModelSettings = {
    STORAGE_KEY,
    RECENT_KEY,
    LEGACY_CONFIG_KEYS,
    AI_MODEL_PRESETS,
    PROVIDER_ORDER,
    DEFAULT_MODEL_CONFIG,
    providerPreset,
    providerStatus,
    providerIdFromValue,
    inferProviderFromConfig,
    sanitizeModelConfig,
    loadModelConfig,
    saveModelConfig,
    hasSavedConfig,
    clearProviderKey,
    configForProvider,
    configFromOption,
    modelIdFromValue,
    modelIdentity,
    modelOptions,
    rememberModel,
    keyStatusLabel,
    fetchProviderStatus,
    openModelPicker,
    closeModelPicker,
  };
})();
