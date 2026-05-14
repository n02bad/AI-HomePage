(function () {
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const COMPONENT_CACHE_KEY = "forexcrm.home.ai.component.library";
  const COMPOSITION_CACHE_KEY = "forexcrm.home.ai.component.composition";
  const MINIMAX_CN_BASE_URL = "https://api.minimaxi.com/v1";
  const MINIMAX_CN_TYPED_ALIAS_BASE_URL = "https://api.minimaxi.cn/v1";
  const MINIMAX_GLOBAL_BASE_URL = "https://api.minimax.io/v1";
  const MINIMAX_MAX_COMPLETION_TOKENS = 2048;
  const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1";
  const KIMI_GLOBAL_BASE_URL = "https://api.moonshot.ai/v1";
  const KIMI_BASE_URL = KIMI_CN_BASE_URL;
  const KIMI_DEFAULT_MODEL = "kimi-k2.6";
  const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
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
      note: "适合生成稳定 JSON 蓝图、结构化组件定义和复杂首页策略。",
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
      note: "适合较长需求理解、信息架构判断和多步骤方案推理。",
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
      note: `适合中文业务语境。CN 站点官方 API Base URL 是 ${MINIMAX_CN_BASE_URL}，不是 ${MINIMAX_CN_TYPED_ALIAS_BASE_URL}；如旧配置填了 ${MINIMAX_GLOBAL_BASE_URL} 会自动切回国内入口。MiniMax OpenAI 兼容接口输出上限为 ${MINIMAX_MAX_COMPLETION_TOKENS}，首页蓝图会使用短 prompt 和紧凑 JSON。`,
    },
    kimi: {
      provider: "kimi",
      name: "Kimi",
      badge: "OpenAI Compatible",
      model: KIMI_DEFAULT_MODEL,
      models: [KIMI_DEFAULT_MODEL, "kimi-k2.5", "kimi-k2-thinking", "moonshot-v1-128k"],
      baseUrl: KIMI_BASE_URL,
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
      apiKeyLabel: "MOONSHOT_API_KEY",
      note: `适合中文长文本理解、运营需求摘要和组件方案整理；默认使用 ${KIMI_DEFAULT_MODEL} 与国内入口 ${KIMI_CN_BASE_URL}。K2.6/K2.5 关闭 thinking 时固定使用 temperature=0.6，避免参数冲突。`,
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
      note: "DeepSeek V4 官方 API 模型。组件和首页生成默认用 V4-Flash 提升稳定性；V4-Pro 仍可手动选择，代理会关闭 thinking 并在超时后降级到 Flash。",
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
  };

  const buttons = [...document.querySelectorAll("[data-brick-filter]")];
  const groups = [...document.querySelectorAll("[data-brick-group]")];

  const els = {
    prompt: document.querySelector("[data-ai-component-prompt]"),
    family: document.querySelector("[data-ai-component-family]"),
    size: document.querySelector("[data-ai-component-size]"),
    generate: document.querySelector("[data-ai-generate-component]"),
    compose: document.querySelector("[data-ai-compose-home]"),
    status: document.querySelector("[data-ai-component-status]"),
    savedSection: document.querySelector("[data-saved-section]"),
    savedCount: document.querySelector("[data-saved-count]"),
    savedComponents: document.querySelector("[data-saved-components]"),
    compositionSection: document.querySelector("[data-composition-section]"),
    compositionName: document.querySelector("[data-composition-name]"),
    compositionSummary: document.querySelector("[data-composition-summary]"),
    compositionLayout: document.querySelector("[data-composition-layout]"),
    compositionPolish: document.querySelector("[data-composition-polish]"),
    modelSummary: document.querySelector("[data-component-model-summary]"),
  };

  let savedComponents = [];
  let aiModelConfig = loadModelConfig();
  let editingModelConfig = null;
  let modelTestState = { tone: "", message: "组件生成会复用这套模型配置" };
  let componentEditorState = { componentId: "", messages: [], busy: false };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, tone = "") {
    if (!els.status) return;
    els.status.textContent = message;
    els.status.dataset.tone = tone;
  }

  function setFilter(filter) {
    const nextFilter = filter || "all";

    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.brickFilter === nextFilter);
    });

    groups.forEach((group) => {
      group.hidden = nextFilter !== "all" && group.dataset.brickGroup !== nextFilter;
    });
  }

  function providerPreset(provider) {
    return AI_MODEL_PRESETS[provider] || AI_MODEL_PRESETS.openai;
  }

  function isKimiFixedTemperatureModel(model) {
    return /^kimi-k2\.(?:6|5)\b/i.test(String(model || ""));
  }

  function kimiTemperatureForModel(model) {
    return isKimiFixedTemperatureModel(model) ? 0.6 : 1;
  }

  function normalizeModelTemperature(provider, value, model = "") {
    if (provider === "kimi") return kimiTemperatureForModel(model);
    if (!Number.isFinite(value)) return DEFAULT_MODEL_CONFIG.temperature;
    if (provider === "minimax") return Math.min(Math.max(value, 0.01), 1);
    return Math.min(Math.max(value, 0), 2);
  }

  function normalizeModelBaseUrl(provider, value) {
    const baseUrl = String(value || "").trim().replace(/\/+$/, "");
    if (!["minimax", "kimi"].includes(provider)) return baseUrl;

    try {
      const target = new URL(baseUrl);
      if (provider === "minimax" && ["api.minimaxi.cn", "api.minimax.io"].includes(target.hostname)) return MINIMAX_CN_BASE_URL;
      if (provider === "kimi" && target.hostname === "api.moonshot.ai") return KIMI_CN_BASE_URL;
    } catch (error) {
      return baseUrl;
    }

    if (provider === "minimax") return [MINIMAX_CN_TYPED_ALIAS_BASE_URL, MINIMAX_GLOBAL_BASE_URL].includes(baseUrl) ? MINIMAX_CN_BASE_URL : baseUrl;
    return baseUrl === KIMI_GLOBAL_BASE_URL ? KIMI_CN_BASE_URL : baseUrl;
  }

  function sanitizeModelConfig(config) {
    const preset = providerPreset(config?.provider);
    const source = config && typeof config === "object" ? config : {};
    const apiKeys = {
      ...(DEFAULT_MODEL_CONFIG.apiKeys || {}),
      ...(source.apiKeys && typeof source.apiKeys === "object" ? source.apiKeys : {}),
    };
    const merged = {
      ...DEFAULT_MODEL_CONFIG,
      ...preset,
      ...source,
    };
    const model = String(merged.model || preset.model || DEFAULT_MODEL_CONFIG.model).trim();
    const baseUrl = normalizeModelBaseUrl(preset.provider, merged.baseUrl || preset.baseUrl);
    const endpoint = String(merged.endpoint || preset.endpoint).trim();
    const proxyEndpoint = String(merged.proxyEndpoint || DEFAULT_MODEL_CONFIG.proxyEndpoint).trim();
    const temperature = Number(merged.temperature);
    const maxOutputTokens = Number(merged.maxOutputTokens);
    const hasApiKeyField = Object.prototype.hasOwnProperty.call(source, "apiKey");
    const apiKey = hasApiKeyField
      ? String(source.apiKey || "").trim()
      : String(merged.apiKey || apiKeys[preset.provider] || "").trim();

    if (apiKey) {
      apiKeys[preset.provider] = apiKey;
    } else if (hasApiKeyField) {
      delete apiKeys[preset.provider];
    }

    return {
      ...preset,
      provider: preset.provider,
      model: model.slice(0, 80),
      baseUrl: baseUrl.slice(0, 180),
      endpoint: endpoint.startsWith("/") ? endpoint.slice(0, 120) : `/${endpoint.slice(0, 119)}`,
      apiMode: String(merged.apiMode || preset.apiMode).slice(0, 40),
      callMode: "serverProxy",
      proxyEndpoint: proxyEndpoint || DEFAULT_MODEL_CONFIG.proxyEndpoint,
      temperature: normalizeModelTemperature(preset.provider, temperature, model),
      maxOutputTokens: Number.isFinite(maxOutputTokens)
        ? Math.min(Math.max(Math.round(maxOutputTokens), preset.provider === "minimax" ? 512 : 6000), preset.provider === "minimax" ? MINIMAX_MAX_COMPLETION_TOKENS : 12000)
        : preset.provider === "minimax"
          ? MINIMAX_MAX_COMPLETION_TOKENS
          : DEFAULT_MODEL_CONFIG.maxOutputTokens,
      apiKey,
      apiKeys,
    };
  }

  function loadModelConfig() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_CONFIG_KEY) || "null");
      return sanitizeModelConfig(saved || DEFAULT_MODEL_CONFIG);
    } catch (error) {
      return sanitizeModelConfig(DEFAULT_MODEL_CONFIG);
    }
  }

  function saveModelConfig(config) {
    const normalized = sanitizeModelConfig(config);
    window.localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function aiRequestModelConfig(config = aiModelConfig) {
    const normalized = sanitizeModelConfig(config);
    return {
      provider: normalized.provider,
      model: normalized.model,
      baseUrl: normalized.baseUrl,
      endpoint: normalized.endpoint,
      apiMode: normalized.apiMode,
      temperature: normalized.temperature,
      maxOutputTokens: normalized.maxOutputTokens,
      apiKey: normalized.apiKey,
    };
  }

  function modelLabel(config = aiModelConfig) {
    const normalized = sanitizeModelConfig(config);
    return `${providerPreset(normalized.provider).name} / ${normalized.model}`;
  }

  function maskedApiKey(value) {
    const key = String(value || "");
    if (!key) return "未填写";
    if (key.length <= 10) return "已填写";
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  }

  function componentLooksGeneric(component) {
    const source = `${component?.name || ""} ${component?.description || ""} ${component?.html || ""}`;
    return /Primary Action|AI\s*样式|Lorem ipsum|Sample Component/i.test(source);
  }

  function stripEditorArtifacts(value) {
    return String(value || "").replace(/<small\b[^>]*data-ai-edit-note[^>]*>[\s\S]*?<\/small>/gi, "");
  }

  function stripEditorCssArtifacts(value) {
    return String(value || "")
      .replace(/[^{}]*\.ai-edit-note[^{}]*\{[^{}]*\}/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function stripEditorTextArtifacts(value) {
    return String(value || "")
      .replace(/\s*已按「[^」]{0,300}」调整。?/g, "")
      .replace(/\s*AI\s*修改[:：][^。.!！?？]{0,300}[。.!！?？]?/gi, "")
      .replace(/\s*已改为带编号、状态和连接线的渐进式开户路径。?/g, "")
      .replace(/\s*标题已更新为[^。.!！?？]{1,120}[。.!！?？]?/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function sanitizeComponentForClient(component) {
    if (!component || typeof component !== "object") return component;
    return {
      ...component,
      description: stripEditorTextArtifacts(component.description),
      html: stripEditorArtifacts(component.html),
      css: stripEditorCssArtifacts(component.css),
    };
  }

  function loadCachedComponents() {
    try {
      const data = JSON.parse(window.localStorage.getItem(COMPONENT_CACHE_KEY) || "[]");
      return Array.isArray(data)
        ? data.map(sanitizeComponentForClient).filter((component) => component?.id && !componentLooksGeneric(component))
        : [];
    } catch (error) {
      return [];
    }
  }

  function cacheComponents(components, options = {}) {
    const source = options.replace ? [] : loadCachedComponents();
    const map = new Map(source.map((component) => [component.id, component]));
    components.forEach((component) => {
      const cleanComponent = sanitizeComponentForClient(component);
      if (cleanComponent?.id && !componentLooksGeneric(cleanComponent)) map.set(cleanComponent.id, cleanComponent);
    });
    const next = [...map.values()];
    window.localStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(next));
    savedComponents = next;
    return next;
  }

  function removeCachedComponent(componentId) {
    const next = loadCachedComponents().filter((component) => component.id !== componentId);
    window.localStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(next));
    savedComponents = next;
    return next;
  }

  function syncComponentLibraryFromResponse(data) {
    if (Array.isArray(data?.library?.components)) {
      cacheComponents(data.library.components, { replace: true });
      return true;
    }
    return false;
  }

  function proxyErrorMessage(data, response) {
    const details = data?.details || {};
    const attempts = Array.isArray(details.attempts) ? details.attempts : [];
    const triedBaseUrls = [...new Set(attempts.map((item) => item.baseUrl).filter(Boolean))];
    const parts = [data?.error || `HTTP ${response.status}`];

    if (details.providerStatus) parts.push(`HTTP ${details.providerStatus}`);
    if (details.providerCode) parts.push(`code ${details.providerCode}`);
    if (details.providerName || details.model) {
      parts.push([details.providerName || details.provider, details.model].filter(Boolean).join(" / "));
    }
    if (triedBaseUrls.length > 1) parts.push(`已尝试 ${triedBaseUrls.join(" -> ")}`);

    return parts.filter(Boolean).join(" · ");
  }

  async function requestJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(proxyErrorMessage(data, response));
    }
    return data;
  }

  function renderModelSummary() {
    if (!els.modelSummary) return;
    const config = sanitizeModelConfig(aiModelConfig);
    const preset = providerPreset(config.provider);
    els.modelSummary.innerHTML = `
      <div>
        <span>共用首页 AI 模型</span>
        <strong>${escapeHtml(config.model)}</strong>
        <small>${escapeHtml(preset.name)} · ${escapeHtml(preset.badge)} · 后端代理调用</small>
        <p>${escapeHtml(`组件生成接口会把需求转给 ${config.baseUrl}${config.endpoint}`)}</p>
      </div>
      <button type="button" data-model-config-open>配置模型</button>
    `;
  }

  function ensureModelConfigModal() {
    let modal = document.querySelector("[data-model-config-modal]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "ai-model-modal";
    modal.dataset.modelConfigModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="ai-model-modal-backdrop" data-model-config-close></div>
      <section class="ai-model-dialog" role="dialog" aria-modal="true" aria-labelledby="component-model-dialog-title">
        <header>
          <div>
            <span class="brick-kicker">LLM SETTINGS</span>
            <h2 id="component-model-dialog-title">首页/组件共用大模型配置</h2>
            <p>这里保存的配置会同时用于首页云生成、组件生成和组件编排；页面只提交需求，真实请求由本地后端代理转发。</p>
          </div>
          <button class="ai-model-close" type="button" data-model-config-close aria-label="关闭">×</button>
        </header>

        <div class="ai-model-provider-grid" data-model-provider-list></div>

        <form class="ai-model-form" data-model-config-form>
          <label>
            <span>模型 ID</span>
            <input data-model-config-field="model" list="component-ai-model-options" autocomplete="off" />
            <datalist id="component-ai-model-options" data-model-option-list></datalist>
          </label>
          <label>
            <span>API Base URL</span>
            <input data-model-config-field="baseUrl" autocomplete="off" />
          </label>
          <label>
            <span>接口路径</span>
            <input data-model-config-field="endpoint" autocomplete="off" />
          </label>
          <label>
            <span>调用协议</span>
            <input data-model-config-field="apiMode" autocomplete="off" />
          </label>
          <label>
            <span>API Key</span>
            <input data-model-config-field="apiKey" type="password" autocomplete="off" />
          </label>
          <label>
            <span>Temperature</span>
            <input data-model-config-field="temperature" type="number" min="0" max="2" step="0.1" />
          </label>
          <label>
            <span>最大输出 Tokens</span>
            <input data-model-config-field="maxOutputTokens" type="number" min="512" max="12000" step="256" />
          </label>
        </form>

        <div class="ai-model-config-note" data-model-config-note></div>

        <footer>
          <button type="button" data-model-config-reset>恢复当前厂商预设</button>
          <button type="button" data-model-config-test>测试连通性</button>
          <button class="primary" type="button" data-model-config-save>保存配置</button>
        </footer>
      </section>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll("[data-model-config-close]").forEach((button) => {
      button.addEventListener("click", closeModelConfigModal);
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("input", () => {
      editingModelConfig = readModelConfigForm();
      modelTestState = { tone: "", message: "配置已修改，保存后用于组件和首页生成" };
      renderModelConfigNote();
    });

    modal.querySelector("[data-model-config-form]")?.addEventListener("change", () => {
      editingModelConfig = readModelConfigForm();
      modelTestState = { tone: "", message: "配置已修改，保存后用于组件和首页生成" };
      renderModelConfigNote();
    });

    modal.querySelector("[data-model-config-reset]")?.addEventListener("click", () => {
      const current = readModelConfigForm();
      const preset = providerPreset(current.provider);
      editingModelConfig = sanitizeModelConfig({
        ...preset,
        apiKey: current.apiKey,
        apiKeys: current.apiKeys,
        temperature: DEFAULT_MODEL_CONFIG.temperature,
        maxOutputTokens: DEFAULT_MODEL_CONFIG.maxOutputTokens,
      });
      modelTestState = { tone: "", message: "已恢复预设，保存后生效" };
      renderModelConfigModal();
    });

    modal.querySelector("[data-model-config-test]")?.addEventListener("click", testModelConnection);

    modal.querySelector("[data-model-config-save]")?.addEventListener("click", () => {
      aiModelConfig = saveModelConfig(readModelConfigForm());
      editingModelConfig = sanitizeModelConfig(aiModelConfig);
      modelTestState = { tone: "success", message: `已保存 ${modelLabel(aiModelConfig)}` };
      renderModelSummary();
      renderModelConfigNote();
      setStatus(`已切换组件生成模型：${modelLabel(aiModelConfig)}`, "success");
      closeModelConfigModal();
    });

    return modal;
  }

  function readModelConfigForm() {
    const modal = ensureModelConfigModal();
    const fieldValue = (name) => modal.querySelector(`[data-model-config-field="${name}"]`)?.value || "";
    return sanitizeModelConfig({
      ...(editingModelConfig || aiModelConfig),
      model: fieldValue("model"),
      baseUrl: fieldValue("baseUrl"),
      endpoint: fieldValue("endpoint"),
      apiMode: fieldValue("apiMode"),
      apiKey: fieldValue("apiKey"),
      temperature: fieldValue("temperature"),
      maxOutputTokens: fieldValue("maxOutputTokens"),
    });
  }

  function renderModelConfigNote() {
    const modal = document.querySelector("[data-model-config-modal]");
    if (!modal) return;
    const config = sanitizeModelConfig(editingModelConfig || aiModelConfig);
    const preset = providerPreset(config.provider);
    const note = modal.querySelector("[data-model-config-note]");
    if (!note) return;

    note.innerHTML = `
      <b>${escapeHtml(preset.name)} · ${escapeHtml(config.model)}</b>
      <p>${escapeHtml(preset.note)}</p>
      <dl>
        <div><dt>密钥状态</dt><dd>${escapeHtml(maskedApiKey(config.apiKey))}</dd></div>
        <div><dt>运行状态</dt><dd>后端代理调用</dd></div>
        <div><dt>调用地址</dt><dd>${escapeHtml(`${config.baseUrl}${config.endpoint}`)}</dd></div>
        <div><dt>测试状态</dt><dd data-model-test-status data-tone="${escapeHtml(modelTestState.tone || "")}">${escapeHtml(modelTestState.message || "尚未测试")}</dd></div>
      </dl>
      <small>保存后配置会写入与首页 AI 生成相同的浏览器配置 key；生成组件时会调用 /api/home-components/generate。</small>
    `;
  }

  function renderModelConfigModal() {
    const modal = ensureModelConfigModal();
    const config = sanitizeModelConfig(editingModelConfig || aiModelConfig);
    const preset = providerPreset(config.provider);
    const providerList = modal.querySelector("[data-model-provider-list]");
    const optionList = modal.querySelector("[data-model-option-list]");
    const setField = (name, value) => {
      const field = modal.querySelector(`[data-model-config-field="${name}"]`);
      if (field) field.value = value;
    };

    providerList.innerHTML = Object.values(AI_MODEL_PRESETS)
      .map(
        (item) => `
          <button class="${item.provider === config.provider ? "active" : ""}" type="button" data-model-provider="${item.provider}">
            <span>${escapeHtml(item.name)}</span>
            <strong>${escapeHtml(item.model)}</strong>
            <small>${escapeHtml(item.badge)}</small>
          </button>
        `,
      )
      .join("");

    providerList.querySelectorAll("[data-model-provider]").forEach((button) => {
      button.addEventListener("click", () => {
        const current = readModelConfigForm();
        const nextPreset = providerPreset(button.dataset.modelProvider);
        editingModelConfig = sanitizeModelConfig({
          ...nextPreset,
          apiKey: current.provider === nextPreset.provider ? current.apiKey : current.apiKeys?.[nextPreset.provider] || "",
          apiKeys: current.apiKeys,
          temperature: current.temperature,
          maxOutputTokens: current.maxOutputTokens,
        });
        modelTestState = { tone: "", message: "已切换厂商，保存后生效" };
        renderModelConfigModal();
      });
    });

    optionList.innerHTML = preset.models.map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
    const temperatureField = modal.querySelector('[data-model-config-field="temperature"]');
    if (temperatureField) {
      const kimiTemperature = config.provider === "kimi" ? kimiTemperatureForModel(config.model) : null;
      temperatureField.min = config.provider === "minimax" ? "0.01" : config.provider === "kimi" ? String(kimiTemperature) : "0";
      temperatureField.max = config.provider === "minimax" ? "1" : config.provider === "kimi" ? String(kimiTemperature) : "2";
      temperatureField.step = config.provider === "minimax" ? "0.01" : "0.1";
    }
    const maxTokensField = modal.querySelector('[data-model-config-field="maxOutputTokens"]');
    if (maxTokensField) {
      maxTokensField.max = config.provider === "minimax" ? String(MINIMAX_MAX_COMPLETION_TOKENS) : "12000";
      maxTokensField.step = config.provider === "minimax" ? "128" : "256";
    }

    setField("model", config.model);
    setField("baseUrl", config.baseUrl);
    setField("endpoint", config.endpoint);
    setField("apiMode", config.apiMode);
    setField("apiKey", config.apiKey);
    setField("temperature", String(config.temperature));
    setField("maxOutputTokens", String(config.maxOutputTokens));
    renderModelConfigNote();
  }

  function openModelConfigModal() {
    editingModelConfig = sanitizeModelConfig(aiModelConfig);
    modelTestState = { tone: "", message: "组件生成会复用这套模型配置" };
    const modal = ensureModelConfigModal();
    renderModelConfigModal();
    modal.hidden = false;
  }

  function closeModelConfigModal() {
    const modal = document.querySelector("[data-model-config-modal]");
    if (modal) modal.hidden = true;
  }

  async function testModelConnection() {
    const modal = ensureModelConfigModal();
    const button = modal.querySelector("[data-model-config-test]");
    const config = readModelConfigForm();
    editingModelConfig = config;
    modelTestState = { tone: "loading", message: "正在测试连通性..." };
    renderModelConfigNote();
    if (button) button.disabled = true;

    try {
      const data = await requestJson("/api/home-ai/test", { modelConfig: aiRequestModelConfig(config) });
      const latency = data.durationMs ? `${data.durationMs}ms` : "已响应";
      modelTestState = { tone: "success", message: `连通成功 · ${modelLabel(config)} · ${latency}` };
    } catch (error) {
      modelTestState = { tone: "error", message: error.message };
    } finally {
      if (button) button.disabled = false;
      renderModelConfigNote();
    }
  }

  async function refreshLibrary() {
    const cached = loadCachedComponents();
    savedComponents = cached;

    try {
      const response = await fetch("/api/home-components/library", { headers: { accept: "application/json" } });
      const data = await response.json();
      if (data.ok && Array.isArray(data.components)) {
        savedComponents = cacheComponents(data.components, { replace: true });
      }
    } catch (error) {
      try {
        const response = await fetch("./home-component-library.json", { headers: { accept: "application/json" }, cache: "no-store" });
        const data = await response.json();
        if (Array.isArray(data.components)) {
          savedComponents = cacheComponents(data.components, { replace: true });
        } else {
          savedComponents = cached;
        }
      } catch (fallbackError) {
        savedComponents = cached;
      }
    }

    renderSavedComponents();
  }

  function familyFromCard(card) {
    return card?.closest(".brick-family")?.querySelector(".brick-family-head span")?.textContent.trim() || "ClientHomeAtoms";
  }

  function sizeFromCard(card) {
    return card?.querySelector(":scope > header b")?.textContent.trim() || "2x1";
  }

  function titleFromCard(card) {
    return card?.querySelector(":scope > header span")?.textContent.trim() || "首页业务小组件";
  }

  function promptFromCard(card) {
    const family = familyFromCard(card);
    const title = titleFromCard(card);
    const size = sizeFromCard(card);
    const previewText = [...card.querySelectorAll(".brick-canvas :is(strong, b, span, small, label, button, a, p, dt, dd)")]
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .slice(0, 18)
      .join(" / ");

    return [
      `基于组件库里的「${title}」生成一个真实可用的 ForexCRM 首页积木组件。`,
      `模块归属 ${family}，推荐尺寸 ${size}。`,
      previewText ? `参考现有业务字段：${previewText}。` : "",
      "不要生成通用卡片，不要出现 Primary Action 或 AI 样式；必须保留真实业务字段、真实按钮文案和可嵌入首页的布局。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function enhanceStaticBrickCards() {
    document.querySelectorAll(".brick-family .brick-card:not(.brick-generated-card)").forEach((card) => {
      const header = card.querySelector(":scope > header");
      const sizeBadge = header?.querySelector("b");
      if (!header || !sizeBadge || header.querySelector("[data-ai-generate-from-card]")) return;

      let tools = header.querySelector(".brick-card-tools");
      if (!tools) {
        tools = document.createElement("div");
        tools.className = "brick-card-tools";
        header.appendChild(tools);
      }

      tools.appendChild(sizeBadge);

      const button = document.createElement("button");
      button.className = "brick-ai-inline-generate";
      button.type = "button";
      button.dataset.aiGenerateFromCard = "true";
      button.textContent = "AI 生成";
      button.title = "用当前组件作为参考生成新 AI 积木";
      tools.appendChild(button);
    });
  }

  function generatedCard(component) {
    return `
      <article class="brick-card brick-generated-card">
        <header>
          <span>${escapeHtml(component.name)}</span>
          <div class="brick-card-tools">
            <b>${escapeHtml(component.size)}</b>
            <button class="brick-ai-inline-generate" type="button" data-ai-regenerate-component="${escapeHtml(component.id)}">再生成</button>
            <button class="brick-ai-secondary-action" type="button" data-ai-edit-component="${escapeHtml(component.id)}">编辑</button>
            <button class="brick-ai-danger-action" type="button" data-ai-delete-component="${escapeHtml(component.id)}">删除</button>
          </div>
        </header>
        <div class="brick-canvas">
          <div class="generated-preview-host" data-generated-preview="${escapeHtml(component.id)}"></div>
        </div>
        <div class="generated-meta">
          <span>${escapeHtml(component.family)}</span>
          <p>${escapeHtml(component.description || "")}</p>
        </div>
      </article>
    `;
  }

  function renderComponentPreview(host, component) {
    if (!host || !component) return;
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          color: #172033;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        }
        *, *::before, *::after { box-sizing: border-box; }
        button { font: inherit; cursor: pointer; }
        a { color: inherit; text-decoration: none; }
        ${component.css || ""}
      </style>
      ${component.html || ""}
    `;
  }

  function renderGeneratedPreviews() {
    document.querySelectorAll("[data-generated-preview]").forEach((host) => {
      const component = savedComponents.find((item) => item.id === host.dataset.generatedPreview);
      if (!component) return;
      renderComponentPreview(host, component);
    });
  }

  function renderSavedComponents() {
    if (!els.savedSection || !els.savedComponents) return;

    els.savedSection.hidden = savedComponents.length === 0;
    if (els.savedCount) els.savedCount.textContent = `${savedComponents.length} 个`;
    els.savedComponents.innerHTML = savedComponents.map(generatedCard).join("");
    renderGeneratedPreviews();
  }

  function componentById(componentId) {
    return savedComponents.find((component) => component.id === componentId);
  }

  function ensureComponentEditorModal() {
    let modal = document.querySelector("[data-component-editor-modal]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "component-editor-modal";
    modal.dataset.componentEditorModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="component-editor-backdrop" data-component-editor-close></div>
      <section class="component-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="component-editor-title">
        <header>
          <div>
            <span class="brick-kicker">AI Component Editor</span>
            <h2 id="component-editor-title" data-component-editor-title>编辑积木组件</h2>
            <p data-component-editor-subtitle></p>
          </div>
          <button class="component-editor-close" type="button" data-component-editor-close aria-label="关闭">×</button>
        </header>

        <div class="component-editor-layout">
          <aside class="component-editor-preview-card">
            <div class="component-editor-meta" data-component-editor-meta></div>
            <div class="component-editor-preview" data-component-editor-preview></div>
          </aside>

          <section class="component-editor-chat" aria-label="组件编辑对话">
            <div class="component-editor-messages" data-component-editor-messages></div>
            <form class="component-editor-form" data-component-editor-form>
              <textarea data-component-editor-input rows="4" placeholder="例如：把主按钮改成入金优先，增加 KYC 状态提示，整体更紧凑。"></textarea>
              <footer>
                <button type="button" data-component-editor-close>取消</button>
                <button class="primary" type="submit" data-component-editor-submit>发送修改</button>
              </footer>
            </form>
          </section>
        </div>
      </section>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll("[data-component-editor-close]").forEach((button) => {
      button.addEventListener("click", closeComponentEditorModal);
    });
    modal.querySelector("[data-component-editor-form]")?.addEventListener("submit", submitComponentEdit);

    return modal;
  }

  function componentEditorGreeting(component) {
    return {
      role: "assistant",
      content: `正在编辑「${component.name}」。你可以直接描述要调整的结构、文案、字段、按钮优先级或视觉密度。`,
    };
  }

  function renderComponentEditorModal() {
    const modal = ensureComponentEditorModal();
    const component = componentById(componentEditorState.componentId);
    if (!component) {
      closeComponentEditorModal();
      return;
    }

    const title = modal.querySelector("[data-component-editor-title]");
    const subtitle = modal.querySelector("[data-component-editor-subtitle]");
    const meta = modal.querySelector("[data-component-editor-meta]");
    const preview = modal.querySelector("[data-component-editor-preview]");
    const messages = modal.querySelector("[data-component-editor-messages]");
    const input = modal.querySelector("[data-component-editor-input]");
    const submit = modal.querySelector("[data-component-editor-submit]");

    if (title) title.textContent = `编辑：${component.name}`;
    if (subtitle) subtitle.textContent = `${component.family} · ${component.size}`;
    if (meta) {
      meta.innerHTML = `
        <span>${escapeHtml(component.family)}</span>
        <strong>${escapeHtml(component.name)}</strong>
        <p>${escapeHtml(component.description || "")}</p>
      `;
    }
    renderComponentPreview(preview, component);

    if (messages) {
      messages.innerHTML = componentEditorState.messages
        .map(
          (message) => `
            <article class="${message.role === "user" ? "user" : "assistant"}">
              <span>${message.role === "user" ? "你" : "AI"}</span>
              <p>${escapeHtml(message.content)}</p>
            </article>
          `,
        )
        .join("");
      messages.scrollTop = messages.scrollHeight;
    }

    if (input) input.disabled = componentEditorState.busy;
    if (submit) {
      submit.disabled = componentEditorState.busy;
      submit.textContent = componentEditorState.busy ? "修改中..." : "发送修改";
    }
  }

  function openComponentEditor(componentId) {
    const component = componentById(componentId);
    if (!component) return;

    componentEditorState = {
      componentId,
      messages: [componentEditorGreeting(component)],
      busy: false,
    };

    const modal = ensureComponentEditorModal();
    renderComponentEditorModal();
    modal.hidden = false;
    modal.querySelector("[data-component-editor-input]")?.focus();
  }

  function closeComponentEditorModal() {
    const modal = document.querySelector("[data-component-editor-modal]");
    if (modal) modal.hidden = true;
  }

  async function submitComponentEdit(event) {
    event.preventDefault();
    const modal = ensureComponentEditorModal();
    const input = modal.querySelector("[data-component-editor-input]");
    const instruction = input?.value.trim() || "";
    const component = componentById(componentEditorState.componentId);

    if (!instruction || !component || componentEditorState.busy) return;

    componentEditorState.messages.push({ role: "user", content: instruction });
    componentEditorState.busy = true;
    if (input) input.value = "";
    renderComponentEditorModal();
    setStatus(`正在通过 ${modelLabel()} 修改「${component.name}」...`);

    try {
      const data = await requestJson("/api/home-components/edit", {
        componentId: component.id,
        instruction,
        messages: componentEditorState.messages,
        component,
        modelConfig: aiRequestModelConfig(),
      });
      if (data.component) {
        cacheComponents([data.component]);
        componentEditorState.componentId = data.component.id;
        componentEditorState.messages.push({
          role: "assistant",
          content: `已更新为「${data.component.name}」。可以继续描述下一轮调整。`,
        });
      } else {
        componentEditorState.messages.push({ role: "assistant", content: "修改完成，但接口没有返回组件内容。" });
      }
      renderSavedComponents();
      setStatus(`已保存修改：${data.component?.name || component.name}`, data.mock ? "mock" : "success");
    } catch (error) {
      componentEditorState.messages.push({ role: "assistant", content: `${error.message}。可以调整模型配置后再试。` });
      setStatus(`组件修改失败：${error.message}`, "error");
    } finally {
      componentEditorState.busy = false;
      renderComponentEditorModal();
    }
  }

  function pruneCompositionComponent(componentId) {
    try {
      const composition = JSON.parse(window.localStorage.getItem(COMPOSITION_CACHE_KEY) || "null");
      if (!composition || !Array.isArray(composition.layout)) return;

      const nextLayout = composition.layout.filter((item) => item.componentId !== componentId);
      if (nextLayout.length === composition.layout.length) return;

      if (!nextLayout.length) {
        window.localStorage.removeItem(COMPOSITION_CACHE_KEY);
        if (els.compositionSection) els.compositionSection.hidden = true;
        return;
      }

      const nextComposition = { ...composition, layout: nextLayout, updatedAt: new Date().toISOString() };
      window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(nextComposition));
      renderComposition(nextComposition);
    } catch (error) {
      // Ignore invalid cached compositions.
    }
  }

  async function deleteComponent(componentId, trigger) {
    const component = componentById(componentId);
    if (!component) return;
    const confirmed = window.confirm(`删除已保存组件「${component.name}」？`);
    if (!confirmed) return;

    if (trigger) trigger.disabled = true;

    try {
      const data = await requestJson("/api/home-components/delete", { componentId });
      if (!syncComponentLibraryFromResponse(data)) removeCachedComponent(componentId);
      setStatus(`已删除组件：${component.name}`, "success");
    } catch (error) {
      removeCachedComponent(componentId);
      setStatus(`已从当前浏览器缓存删除：${component.name}。后端同步失败：${error.message}`, "mock");
    } finally {
      pruneCompositionComponent(componentId);
      if (componentEditorState.componentId === componentId) closeComponentEditorModal();
      renderSavedComponents();
      if (trigger) trigger.disabled = false;
    }
  }

  function renderComposition(composition) {
    if (!composition || !els.compositionSection) return;

    const byId = new Map(savedComponents.map((component) => [component.id, component]));
    els.compositionSection.hidden = false;
    if (els.compositionName) els.compositionName.textContent = composition.name || "首页积木组合";
    if (els.compositionSummary) els.compositionSummary.textContent = composition.summary || "";
    if (els.compositionPolish) {
      els.compositionPolish.textContent = [composition.themeAdvice, composition.polishInstructions].filter(Boolean).join(" ");
    }
    if (els.compositionLayout) {
      els.compositionLayout.innerHTML = (composition.layout || [])
        .map((item) => {
          const component = byId.get(item.componentId);
          return `
            <article>
              <span>${escapeHtml(item.zone || "main")} · ${escapeHtml(item.size || "")}</span>
              <strong>${escapeHtml(component?.name || item.componentId)}</strong>
              <p>${escapeHtml(item.reason || "")}</p>
            </article>
          `;
        })
        .join("");
    }
  }

  async function refreshSavedComposition() {
    try {
      const savedComposition = JSON.parse(window.localStorage.getItem(COMPOSITION_CACHE_KEY) || "null");
      if (savedComposition) {
        renderComposition(savedComposition);
        return;
      }
    } catch (error) {
      // Ignore invalid cached compositions.
    }

    try {
      const response = await fetch("./home-component-compositions.json", { headers: { accept: "application/json" }, cache: "no-store" });
      const data = await response.json();
      const composition = Array.isArray(data.compositions) ? data.compositions[0] : null;
      if (composition) {
        window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(composition));
        renderComposition(composition);
      }
    } catch (error) {
      // Static composition suggestions are optional.
    }
  }

  async function generateComponent(options = {}) {
    const prompt = options.prompt || els.prompt?.value.trim() || "生成一个适合 ForexCRM 首页的专业组件。";
    const family = options.family || els.family?.value || "ClientHomeAtoms";
    const size = options.size || els.size?.value || "2x1";
    const requestConfig = aiRequestModelConfig();
    const trigger = options.trigger || els.generate;

    if (els.prompt && options.prompt) els.prompt.value = options.prompt;
    if (els.family && options.family) els.family.value = options.family;
    if (els.size && options.size) els.size.value = options.size;

    setStatus(`正在通过 ${modelLabel()} 生成组件...`);
    if (trigger) trigger.disabled = true;
    if (trigger !== els.generate && els.generate) els.generate.disabled = true;

    try {
      const data = await requestJson("/api/home-components/generate", {
        prompt,
        family,
        size,
        modelConfig: requestConfig,
      });
      cacheComponents([data.component]);
      renderSavedComponents();
      setStatus(`已生成并保存：${data.component.name} · ${data.provider || requestConfig.provider} / ${data.model || requestConfig.model}`, data.mock ? "mock" : "success");
    } catch (error) {
      setStatus(`${error.message}。如果还没有配置密钥，可以用 npm run start:mock 先演示完整链路。`, "error");
    } finally {
      if (trigger) trigger.disabled = false;
      if (trigger !== els.generate && els.generate) els.generate.disabled = false;
    }
  }

  function buildHomepagePrompt(composition) {
    const componentList = savedComponents
      .map((component) => `${component.name}(${component.family}, ${component.size}): ${component.description}`)
      .join("\n");

    return [
      "请基于已保存的首页积木组件，生成一个美观、克制、专业的 ForexCRM 用户端首页草稿。",
      "要先搭积木，再调整布局美观度，首屏重点清晰，业务路径完整。",
      "",
      "已保存组件:",
      componentList || "暂无自定义组件，使用内置模块。",
      "",
      "AI 组合建议:",
      composition ? JSON.stringify(composition, null, 2) : "请自动组合。",
      "",
      "要求：资产、入金/出金、交易账号、开户入口、邀请或广告中至少保留主要业务路径。自定义组件目前作为设计参考，最终首页配置仍需使用已有白名单模块渲染。",
    ].join("\n");
  }

  async function composeHome() {
    if (!savedComponents.length) {
      setStatus("还没有已保存的 AI 组件，先生成并保存一个组件。", "error");
      return;
    }

    setStatus("正在用已保存组件生成首页组合...");
    els.compose.disabled = true;

    let composition = null;
    const requestConfig = aiRequestModelConfig();

    try {
      const compositionResult = await requestJson("/api/home-components/compose", {
        prompt: els.prompt?.value || "用已保存组件组合一个专业首页。",
        componentIds: savedComponents.map((component) => component.id),
        modelConfig: requestConfig,
      });
      composition = compositionResult.composition;
      window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(composition));
      renderComposition(composition);
    } catch (error) {
      composition = {
        name: "本地临时首页积木组合",
        summary: "大模型组合暂不可用，已按组件尺寸生成一个临时组合，配置密钥后可以重新生成。",
        layout: savedComponents.slice(0, 8).map((component, index) => ({
          componentId: component.id,
          size: component.size,
          zone: index === 0 ? "hero" : component.size.startsWith("1x") ? "rail" : "main",
          reason: `${component.name} 用于承接 ${component.family} 路径。`,
        })),
        themeAdvice: "保持当前蓝白金融风格。",
        polishInstructions: "首屏优先展示主业务模块，侧栏承载状态类组件，长表格放在页面下方。",
      };
      window.localStorage.setItem(COMPOSITION_CACHE_KEY, JSON.stringify(composition));
      renderComposition(composition);
      setStatus("大模型组合暂不可用，已生成本地临时组合。配置密钥后可以重新生成。", "mock");
    }

    if (!window.HomePersonalization) {
      setStatus("组件组合已保存，但当前页面没有加载首页生成器。", "success");
      els.compose.disabled = false;
      return;
    }

    const prompt = buildHomepagePrompt(composition);
    try {
      const homeResult = await requestJson("/api/home-ai/complete", {
        prompt,
        modelConfig: requestConfig,
        context: {
          defaultConfig: window.HomePersonalization.DEFAULT_CONFIG,
          schema: window.HomePersonalization.HOMEPAGE_CONFIG_JSON_SCHEMA,
          features: window.HomePersonalization.FEATURES,
          moduleVariantOptions: window.HomePersonalization.MODULE_VARIANT_OPTIONS,
          moduleStyleOptions: window.HomePersonalization.MODULE_STYLE_OPTIONS,
          currentConfig: window.HomePersonalization.loadDraft(),
        },
      });
      window.HomePersonalization.saveDraft(homeResult.config);
      setStatus("首页草稿已生成并保存，可以打开首页预览查看。", homeResult.mock ? "mock" : "success");
    } catch (error) {
      const fallback = window.HomePersonalization.promptToConfig(prompt);
      window.HomePersonalization.saveDraft(fallback);
      setStatus("组件组合已保存；大模型首页美化未完成，已用本地规则生成临时草稿。配置密钥后可重新生成。", "mock");
    } finally {
      els.compose.disabled = false;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.brickFilter));
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const cardGenerateButton = target?.closest("[data-ai-generate-from-card]");
    if (cardGenerateButton) {
      event.preventDefault();
      const card = cardGenerateButton.closest(".brick-card");
      generateComponent({
        prompt: promptFromCard(card),
        family: familyFromCard(card),
        size: sizeFromCard(card),
        trigger: cardGenerateButton,
      });
      return;
    }

    const regenerateButton = target?.closest("[data-ai-regenerate-component]");
    if (regenerateButton) {
      event.preventDefault();
      const component = savedComponents.find((item) => item.id === regenerateButton.dataset.aiRegenerateComponent);
      if (component) {
        generateComponent({
          prompt: [
            `重新生成「${component.name}」，做成真实可用的 ForexCRM 首页积木。`,
            component.sourcePrompt || component.description || "",
            "必须比当前版本更具体，包含真实业务字段和操作，不要 Primary Action，不要 AI 样式。",
          ]
            .filter(Boolean)
            .join("\n"),
          family: component.family,
          size: component.size,
          trigger: regenerateButton,
        });
      }
      return;
    }

    const editButton = target?.closest("[data-ai-edit-component]");
    if (editButton) {
      event.preventDefault();
      openComponentEditor(editButton.dataset.aiEditComponent);
      return;
    }

    const deleteButton = target?.closest("[data-ai-delete-component]");
    if (deleteButton) {
      event.preventDefault();
      deleteComponent(deleteButton.dataset.aiDeleteComponent, deleteButton);
      return;
    }

    const trigger = target?.closest("[data-model-config-open]");
    if (!trigger) return;
    event.preventDefault();
    aiModelConfig = loadModelConfig();
    openModelConfigModal();
  });

  els.generate?.addEventListener("click", generateComponent);
  els.compose?.addEventListener("click", composeHome);

  enhanceStaticBrickCards();
  renderModelSummary();
  refreshLibrary();
  refreshSavedComposition();
})();
