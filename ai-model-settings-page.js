(function () {
  const settings = window.ForexCRMModelSettings;
  if (!settings) return;

  const els = {
    current: document.querySelector("[data-model-settings-current]"),
    savedKeys: document.querySelector("[data-model-settings-saved-keys]"),
    usedCount: document.querySelector("[data-model-settings-used-count]"),
    providerGrid: document.querySelector("[data-model-settings-provider-grid]"),
    form: document.querySelector("[data-model-settings-form]"),
    modelList: document.querySelector("[data-model-settings-model-options]"),
    note: document.querySelector("[data-model-settings-note]"),
    usedList: document.querySelector("[data-model-settings-used-list]"),
    save: document.querySelector("[data-model-settings-save]"),
    test: document.querySelector("[data-model-settings-test]"),
    clearKey: document.querySelector("[data-model-settings-clear-key]"),
    reset: document.querySelector("[data-model-settings-reset]"),
    toast: document.querySelector("[data-model-settings-toast]"),
  };

  const providerOrder = settings.PROVIDER_ORDER || Object.keys(settings.AI_MODEL_PRESETS || {});
  let state = {
    config: settings.loadModelConfig(),
    providerStatus: {},
    testTone: "",
    testMessage: "尚未测试",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 1800);
  }

  function field(name) {
    return els.form?.querySelector(`[data-model-settings-field="${name}"]`);
  }

  function setField(name, value) {
    const target = field(name);
    if (target) target.value = value ?? "";
  }

  function readForm(options = {}) {
    const current = settings.sanitizeModelConfig(state.config);
    const apiKeyValue = field("apiKey")?.value?.trim() || "";
    const next = {
      ...current,
      provider: field("provider")?.value || current.provider,
      model: field("model")?.value || current.model,
      baseUrl: field("baseUrl")?.value || current.baseUrl,
      endpoint: field("endpoint")?.value || current.endpoint,
      apiMode: field("apiMode")?.value || current.apiMode,
      callMode: field("callMode")?.value || current.callMode,
      temperature: field("temperature")?.value || current.temperature,
      maxOutputTokens: field("maxOutputTokens")?.value || current.maxOutputTokens,
    };

    if (apiKeyValue || options.includeBlankKey) next.apiKey = apiKeyValue;
    return settings.sanitizeModelConfig(next, {
      clearEmptyApiKey: options.clearEmptyKey,
      preserveEmptyApiKey: !options.clearEmptyKey,
    });
  }

  function aiRequestModelConfig(config) {
    const normalized = settings.sanitizeModelConfig(config);
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

  function modelTestEndpointCandidates() {
    const candidates = ["/api/home-ai/test"];
    const currentHost = window.location.hostname || "127.0.0.1";
    [...new Set([currentHost, "127.0.0.1", "localhost"])].forEach((host) => {
      ["5174", "5184"].forEach((port) => candidates.push(`http://${host}:${port}/api/home-ai/test`));
    });
    return [...new Set(candidates)];
  }

  async function requestModelTest(config) {
    const endpoints = modelTestEndpointCandidates();
    let lastMessage = "";
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ modelConfig: aiRequestModelConfig(config) }),
        });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.ok !== false) return data || {};
        lastMessage = data?.error || `${response.status} ${response.statusText}`;
        if (![404, 405, 501].includes(response.status)) break;
      } catch (error) {
        lastMessage = String(error?.message || error || "Failed to fetch");
      }
    }
    throw new Error(`${lastMessage || "Failed to fetch"} · 已尝试 ${endpoints.join(" -> ")}`);
  }

  function renderStats() {
    const config = settings.sanitizeModelConfig(state.config);
    const preset = settings.providerPreset(config.provider);
    const savedKeyCount = Object.values(config.apiKeys || {}).filter(Boolean).length;
    const usedCount = settings.modelOptions(config, state.providerStatus).length;
    if (els.current) els.current.textContent = `${preset.name} / ${config.model}`;
    if (els.savedKeys) els.savedKeys.textContent = savedKeyCount ? `${savedKeyCount} 个厂商` : "暂无";
    if (els.usedCount) els.usedCount.textContent = `${usedCount} 个`;
  }

  function renderProviderGrid() {
    if (!els.providerGrid) return;
    const current = settings.sanitizeModelConfig(state.config);
    els.providerGrid.innerHTML = providerOrder
      .map((provider) => {
        const config = settings.configForProvider(provider, current);
        const preset = settings.providerPreset(provider);
        const active = current.provider === provider;
        return `
          <button class="${active ? "active" : ""}" type="button" data-model-settings-provider="${escapeHtml(provider)}">
            <span>${escapeHtml(preset.name)}</span>
            <strong>${escapeHtml(config.model)}</strong>
            <small>${escapeHtml(`${preset.badge} · ${settings.keyStatusLabel(config, state.providerStatus)}`)}</small>
          </button>
        `;
      })
      .join("");
    els.providerGrid.querySelectorAll("[data-model-settings-provider]").forEach((button) => {
      button.addEventListener("click", () => {
        state.config = settings.configForProvider(button.dataset.modelSettingsProvider, readForm());
        state.testTone = "";
        state.testMessage = "切换厂商后尚未测试";
        render();
      });
    });
  }

  function renderForm() {
    if (!els.form) return;
    const config = settings.sanitizeModelConfig(state.config);
    const preset = settings.providerPreset(config.provider);
    setField("provider", config.provider);
    setField("model", config.model);
    setField("baseUrl", config.baseUrl);
    setField("endpoint", config.endpoint);
    setField("apiMode", config.apiMode);
    setField("callMode", config.callMode);
    setField("temperature", String(config.temperature));
    setField("maxOutputTokens", String(config.maxOutputTokens));
    setField("apiKey", "");
    const apiKeyField = field("apiKey");
    if (apiKeyField) {
      apiKeyField.placeholder = config.apiKey || config.apiKeys?.[config.provider] ? "已保存，可留空不变" : preset.apiKeyLabel;
    }
    if (els.modelList) els.modelList.innerHTML = (preset.models || [config.model]).map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
  }

  function renderNote() {
    if (!els.note) return;
    const config = settings.sanitizeModelConfig(state.config);
    const preset = settings.providerPreset(config.provider);
    els.note.dataset.tone = state.testTone || "";
    els.note.innerHTML = `
      <b>${escapeHtml(preset.name)} · ${escapeHtml(config.model)}</b>
      <span>${escapeHtml(preset.note || "")}</span>
      <span>Key 状态：${escapeHtml(settings.keyStatusLabel(config, state.providerStatus))}</span>
      <span>测试状态：${escapeHtml(state.testMessage || "尚未测试")}</span>
    `;
  }

  function renderUsedList() {
    if (!els.usedList) return;
    const options = settings.modelOptions(state.config, state.providerStatus).slice(0, 12);
    els.usedList.innerHTML = options.length
      ? options
          .map(
            (item, index) => `
              <button type="button" data-model-settings-used="${index}">
                <b>${escapeHtml(item.providerName || settings.providerPreset(item.provider).name)} / ${escapeHtml(item.model)}</b>
                <small>${escapeHtml(`${item.sourceLabel || "模型"} · ${item.keyStatus || settings.keyStatusLabel(item, state.providerStatus)}`)}</small>
              </button>
            `,
          )
          .join("")
      : '<p class="ai-model-empty">暂无已用模型。</p>';
    els.usedList.querySelectorAll("[data-model-settings-used]").forEach((button) => {
      button.addEventListener("click", () => {
        state.config = settings.configFromOption(options[Number(button.dataset.modelSettingsUsed)], readForm());
        state.testTone = "";
        state.testMessage = "已切换为已用模型，保存后生效";
        render();
      });
    });
  }

  function render() {
    renderStats();
    renderProviderGrid();
    renderForm();
    renderNote();
    renderUsedList();
  }

  function bindForm() {
    els.form?.addEventListener("input", (event) => {
      if (event.target?.matches("[data-model-settings-field]")) {
        state.config = readForm();
        state.testTone = "";
        state.testMessage = "配置已修改，保存后生效";
        renderStats();
        renderProviderGrid();
        renderNote();
      }
    });
    els.form?.addEventListener("change", (event) => {
      if (!event.target?.matches("[data-model-settings-field]")) return;
      if (event.target.dataset.modelSettingsField === "provider") {
        state.config = settings.configForProvider(event.target.value, readForm());
      } else {
        state.config = readForm();
      }
      state.testTone = "";
      state.testMessage = "配置已修改，保存后生效";
      render();
    });
  }

  function bindActions() {
    els.save?.addEventListener("click", () => {
      state.config = settings.saveModelConfig(readForm(), { source: "settings-page" });
      state.testTone = "success";
      state.testMessage = "配置已保存，已保存的 Key 后续会自动沿用";
      render();
      showToast("大模型配置已保存");
    });
    els.clearKey?.addEventListener("click", () => {
      const provider = readForm().provider;
      state.config = settings.clearProviderKey(provider);
      state.testTone = "";
      state.testMessage = "已清除当前厂商 Key";
      render();
      showToast("当前厂商 Key 已清除");
    });
    els.reset?.addEventListener("click", () => {
      const current = readForm();
      const preset = settings.providerPreset(current.provider);
      state.config = settings.sanitizeModelConfig({
        ...current,
        ...preset,
        provider: current.provider,
        apiKey: current.apiKeys?.[current.provider] || "",
        apiKeys: current.apiKeys,
        providerConfigs: current.providerConfigs,
      });
      state.testTone = "";
      state.testMessage = "已恢复当前厂商预设，保存后生效";
      render();
    });
    els.test?.addEventListener("click", async () => {
      const button = els.test;
      state.config = readForm();
      state.testTone = "loading";
      state.testMessage = "正在测试模型连通性...";
      renderNote();
      if (button) button.disabled = true;
      try {
        const data = await requestModelTest(state.config);
        state.testTone = "success";
        state.testMessage = `连通成功：${data.message || data.url || state.config.model}`;
        showToast("模型连通性测试成功");
      } catch (error) {
        state.testTone = "error";
        state.testMessage = `连通失败：${String(error.message || error).slice(0, 220)}`;
        showToast("模型连通性测试失败");
      } finally {
        if (button) button.disabled = false;
        renderNote();
      }
    });
  }

  async function init() {
    bindForm();
    bindActions();
    render();
    state.providerStatus = await settings.fetchProviderStatus();
    render();
  }

  init();
})();
