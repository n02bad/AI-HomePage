(function () {
  const MODEL_CONFIG_KEY = "forexcrm.home.ai.model.config";
  const COMPONENT_CACHE_KEY = "forexcrm.home.ai.component.library";
  const COMPOSITION_CACHE_KEY = "forexcrm.home.ai.component.composition";

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
  };

  let savedComponents = [];

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

  function loadModelConfig() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_CONFIG_KEY) || "{}");
      return {
        provider: saved.provider || "openai",
        model: saved.model || "gpt-5.2",
        baseUrl: saved.baseUrl || "https://api.openai.com/v1",
        endpoint: saved.endpoint || "/responses",
        apiMode: saved.apiMode || "responses",
        apiKey: saved.apiKey || "",
        temperature: Number.isFinite(Number(saved.temperature)) ? Number(saved.temperature) : 0.35,
        maxOutputTokens: Number.isFinite(Number(saved.maxOutputTokens)) ? Number(saved.maxOutputTokens) : 2400,
      };
    } catch (error) {
      return {
        provider: "openai",
        model: "gpt-5.2",
        baseUrl: "https://api.openai.com/v1",
        endpoint: "/responses",
        apiMode: "responses",
        apiKey: "",
        temperature: 0.35,
        maxOutputTokens: 2400,
      };
    }
  }

  function loadCachedComponents() {
    try {
      const data = JSON.parse(window.localStorage.getItem(COMPONENT_CACHE_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function cacheComponents(components) {
    const map = new Map(loadCachedComponents().map((component) => [component.id, component]));
    components.forEach((component) => {
      if (component?.id) map.set(component.id, component);
    });
    const next = [...map.values()];
    window.localStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(next));
    savedComponents = next;
    return next;
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

  async function refreshLibrary() {
    const cached = loadCachedComponents();
    savedComponents = cached;

    try {
      const response = await fetch("/api/home-components/library", { headers: { accept: "application/json" } });
      const data = await response.json();
      if (data.ok && Array.isArray(data.components)) {
        savedComponents = cacheComponents(data.components);
      }
    } catch (error) {
      try {
        const response = await fetch("./home-component-library.json", { headers: { accept: "application/json" }, cache: "no-store" });
        const data = await response.json();
        if (Array.isArray(data.components)) {
          savedComponents = cacheComponents(data.components);
        } else {
          savedComponents = cached;
        }
      } catch (fallbackError) {
        savedComponents = cached;
      }
    }

    renderSavedComponents();
  }

  function generatedCard(component) {
    return `
      <article class="brick-card brick-generated-card">
        <header>
          <span>${escapeHtml(component.name)}</span>
          <b>${escapeHtml(component.size)}</b>
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

  function renderGeneratedPreviews() {
    document.querySelectorAll("[data-generated-preview]").forEach((host) => {
      const component = savedComponents.find((item) => item.id === host.dataset.generatedPreview);
      if (!component) return;

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
    });
  }

  function renderSavedComponents() {
    if (!els.savedSection || !els.savedComponents) return;

    els.savedSection.hidden = savedComponents.length === 0;
    if (els.savedCount) els.savedCount.textContent = `${savedComponents.length} 个`;
    els.savedComponents.innerHTML = savedComponents.map(generatedCard).join("");
    renderGeneratedPreviews();
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

  async function generateComponent() {
    const prompt = els.prompt?.value.trim() || "生成一个适合 ForexCRM 首页的专业组件。";
    const family = els.family?.value || "ClientHomeAtoms";
    const size = els.size?.value || "2x1";

    setStatus("正在调用大模型生成组件...");
    els.generate.disabled = true;

    try {
      const data = await requestJson("/api/home-components/generate", {
        prompt,
        family,
        size,
        modelConfig: loadModelConfig(),
      });
      cacheComponents([data.component]);
      renderSavedComponents();
      setStatus(`已生成并保存：${data.component.name}`, data.mock ? "mock" : "success");
    } catch (error) {
      setStatus(`${error.message}。如果还没有配置密钥，可以用 npm run start:mock 先演示完整链路。`, "error");
    } finally {
      els.generate.disabled = false;
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

    try {
      const compositionResult = await requestJson("/api/home-components/compose", {
        prompt: els.prompt?.value || "用已保存组件组合一个专业首页。",
        componentIds: savedComponents.map((component) => component.id),
        modelConfig: loadModelConfig(),
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
        modelConfig: loadModelConfig(),
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

  els.generate?.addEventListener("click", generateComponent);
  els.compose?.addEventListener("click", composeHome);

  refreshLibrary();
  refreshSavedComposition();
})();
