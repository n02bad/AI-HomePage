(function () {
  const MODEL_HISTORY_KEY = "forexcrm.home.ai.call.history";
  const AUTH_MODEL_HISTORY_KEY = "forexcrm.auth.ai.call.history";

  const BUSINESS_FILTER_OPTIONS = [
    { value: "all", label: "全部业务" },
    { value: "business:onboarding", label: "开户引导" },
    { value: "business:deposit", label: "入金转化" },
    { value: "business:trader", label: "交易工作台" },
    { value: "business:asset", label: "资产总览" },
    { value: "business:growth", label: "IB/邀请增长" },
    { value: "business:download", label: "APP/MT5 下载" },
    { value: "business:risk", label: "合规风控" },
    { value: "business:support", label: "客服 FAQ" },
    { value: "business:brand", label: "品牌信任" },
    { value: "render:skeletonHtml", label: "骨架 HTML" },
    { value: "render:aiHtml", label: "AI HTML" },
    { value: "render:config", label: "组件化" },
    { value: "module:home", label: "首页" },
    { value: "module:component", label: "组件" },
    { value: "module:auth", label: "登录注册" },
  ];

  const BUSINESS_RULES = [
    ["onboarding", "开户引导", /开户|开户注册|开通账户|真实账户|模拟账户|kyc|实名|认证|onboard|opening|openaccount|account_activation|accountActivation|onboarding/i],
    ["deposit", "入金转化", /入金|充值|存款|首存|deposit|funding|bonus|返现|赠金|活动|优惠|reward/i],
    ["trader", "交易工作台", /交易|持仓|订单|mt5|行情|杠杆|保证金|pnl|成本|professional|trader|positions|orders/i],
    ["asset", "资产总览", /资产|余额|钱包|净值|账户概览|asset|balance|wallet|equity/i],
    ["growth", "IB/邀请增长", /ib|代理|邀请|返佣|渠道|裂变|partner|referral|commission|growth/i],
    ["download", "APP/MT5 下载", /app|下载|移动端|手机端|mt5|download/i],
    ["risk", "合规风控", /风险|合规|披露|风控|risk|compliance|disclosure/i],
    ["support", "客服 FAQ", /客服|帮助|faq|工单|联系|support|help|service/i],
    ["brand", "品牌信任", /品牌|白标|监管|可信|安全|brand|trust|regulation/i],
  ];

  const els = {
    total: document.querySelector("[data-call-total]"),
    success: document.querySelector("[data-call-success]"),
    problems: document.querySelector("[data-call-problems]"),
    average: document.querySelector("[data-call-average]"),
    records: document.querySelector("[data-call-records]"),
    detail: document.querySelector("[data-call-detail]"),
    filters: [...document.querySelectorAll("[data-call-filter]")],
    businessFilter: document.querySelector("[data-call-business-filter]"),
    search: document.querySelector("[data-call-search]"),
    refresh: document.querySelector("[data-call-refresh]"),
    export: document.querySelector("[data-call-export]"),
    clear: document.querySelector("[data-call-clear]"),
    toast: document.querySelector("[data-call-toast]"),
    modal: document.querySelector("[data-call-modal]"),
    modalTitle: document.querySelector("[data-call-modal-title]"),
    modalSubtitle: document.querySelector("[data-call-modal-subtitle]"),
    modalBody: document.querySelector("[data-call-modal-body]"),
    modalExport: document.querySelector("[data-call-modal-export]"),
    modalClose: [...document.querySelectorAll("[data-call-modal-close]")],
  };

  let activeFilter = "all";
  let activeBusinessFilter = "all";
  let activeGroupId = "";
  let searchText = "";
  let serverRecords = [];
  let authServerRecords = [];
  let visibleGroups = [];
  let allGroups = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hashText(value) {
    return String(value || "")
      .split("")
      .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261)
      .toString(16);
  }

  function loadRecords(key = MODEL_HISTORY_KEY) {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function saveRecords(records, key = MODEL_HISTORY_KEY) {
    window.localStorage.setItem(key, JSON.stringify(Array.isArray(records) ? records : []));
  }

  async function refreshServerRecords() {
    const [homeResult, authResult] = await Promise.allSettled([
      fetch("/api/home-ai/calls", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/auth-ai/calls", { cache: "no-store" }).then((response) => response.json()),
    ]);
    serverRecords = homeResult.status === "fulfilled" && Array.isArray(homeResult.value?.records) ? homeResult.value.records : [];
    authServerRecords = authResult.status === "fulfilled" && Array.isArray(authResult.value?.records) ? authResult.value.records : [];
  }

  function moduleTypeForRecord(record = {}) {
    if (record.moduleType) return record.moduleType;
    if (record.source === "authServerProxy" || /^auth-/.test(String(record.id || "")) || String(record.action || "").startsWith("auth-") || record.schemeSnapshot) return "auth";
    if (String(record.action || "").startsWith("component-")) return "component";
    return "home";
  }

  function moduleLabel(record = {}) {
    const type = moduleTypeForRecord(record);
    if (type === "auth") return "登录注册";
    if (type === "component") return "组件";
    return "首页";
  }

  function mergedRecords() {
    const recordsById = new Map();
    const addRecord = (record, source, index, moduleType = "") => {
      const id = record?.id || `${source}-${index}`;
      const current = recordsById.get(id) || {};
      const finalPage =
        current.finalPage || record?.finalPage
          ? { ...(current.finalPage || {}), ...(record?.finalPage || {}) }
          : undefined;
      recordsById.set(id, {
        ...current,
        ...(record || {}),
        ...(finalPage ? { finalPage } : {}),
        id,
        source: record?.source || source,
        moduleType: record?.moduleType || moduleType || moduleTypeForRecord(record),
      });
    };

    loadRecords(MODEL_HISTORY_KEY).forEach((record, index) => addRecord(record, "browser", index, moduleTypeForRecord(record) || "home"));
    loadRecords(AUTH_MODEL_HISTORY_KEY).forEach((record, index) => addRecord(record, "browser", index, "auth"));
    serverRecords.forEach((record, index) => addRecord(record, "serverProxy", index, moduleTypeForRecord(record) || "home"));
    authServerRecords.forEach((record, index) => addRecord(record, "authServerProxy", index, "auth"));

    return [...recordsById.values()].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }

  function redactValue(value, depth = 0, seen = new WeakSet()) {
    if (value == null || typeof value !== "object") return value;
    if (seen.has(value)) return "[Circular]";
    if (depth > 10) return "[Max depth reached]";
    seen.add(value);
    if (Array.isArray(value)) {
      const output = value.map((item) => redactValue(item, depth + 1, seen));
      seen.delete(value);
      return output;
    }
    const blockedKeys = new Set(["apiKey", "apiKeys", "authorization", "Authorization", "headers"]);
    const output = {};
    Object.entries(value).forEach(([key, item]) => {
      if (blockedKeys.has(key)) return;
      output[key] = redactValue(item, depth + 1, seen);
    });
    seen.delete(value);
    return output;
  }

  function redactRecord(record) {
    return redactValue(record || {});
  }

  function formatDate(value) {
    if (!value) return "--";
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(value));
    } catch (error) {
      return "--";
    }
  }

  function formatShortDate(value) {
    if (!value) return "--";
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch (error) {
      return "--";
    }
  }

  function statusLabel(recordOrStatus) {
    const record = typeof recordOrStatus === "object" ? recordOrStatus : { status: recordOrStatus };
    if (record.status === "mock") return "Mock 预览";
    if (record.status === "success") return record.mock ? "Mock 成功" : "调用成功";
    if (record.status === "fallback") return "已回退";
    if (record.status === "local") return "本地生成";
    if (record.status === "failed") return "调用失败";
    return "未知";
  }

  function actionLabel(action) {
    if (action === "connectivity-test") return "连通性测试";
    if (action === "auth-generate") return "登录注册生成";
    if (action === "homepage-generate") return "首页生成";
    if (action === "component-generate") return "组件生成";
    if (action === "component-edit") return "组件编辑";
    if (action === "component-compose") return "组件编排";
    return "模型调用";
  }

  function callModeLabel(mode) {
    if (mode === "serverProxy") return "后端代理";
    if (mode === "local") return "本地规则";
    return mode || "--";
  }

  function compactHistorySummary(message) {
    return String(message || "")
      .replace(/\s*·\s*(?:\/api\/home-ai\/complete|\/api\/home-ai\/test|\/api\/auth-ai\/generate|\/api\/auth-ai\/test|\/api\/home-components\/generate|\/api\/home-components\/compose|https?:\/\/\S+)\s*$/i, "")
      .replace(/\s*·\s*(模型返回片段：|处理建议：)[\s\S]*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function parseMarkedHistoryMessage(message) {
    const source = String(message || "").replace(/\s*·\s*(?:\/api\/home-ai\/complete|\/api\/home-ai\/test|\/api\/auth-ai\/generate|\/api\/auth-ai\/test|\/api\/home-components\/generate|\/api\/home-components\/compose|https?:\/\/\S+)\s*$/i, "");
    const markerMap = [
      { key: "detail", marker: "模型返回片段：" },
      { key: "advice", marker: "处理建议：" },
    ];
    const markers = markerMap
      .map((item) => ({ ...item, index: source.indexOf(item.marker) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index);

    if (!markers.length) {
      return { summary: compactHistorySummary(source), advice: "", detail: "" };
    }

    const parsed = {
      summary: compactHistorySummary(source.slice(0, markers[0].index)),
      advice: "",
      detail: "",
    };

    markers.forEach((item, index) => {
      const start = item.index + item.marker.length;
      const end = markers[index + 1]?.index ?? source.length;
      const value = String(source.slice(start, end)).replace(/\s*·\s*$/, "").trim();
      parsed[item.key] = item.key === "advice" && value ? `${item.marker}${value}` : value;
    });

    return parsed;
  }

  function displayRecord(record) {
    const parsed = parseMarkedHistoryMessage(record.message || record.prompt || "");
    return {
      summary: parsed.summary || compactHistorySummary(record.message || record.prompt || "--") || "--",
      advice: parsed.advice,
      detail: parsed.detail,
    };
  }

  function renderModeForRecord(record = {}) {
    const profileMode = record.businessProfile?.renderMode || "";
    const snapshot = record.configSnapshot || {};
    const mode = profileMode || snapshot.renderMode || record.renderMode || record.activeRenderMode || "";
    if (mode === "skeletonHtml" || snapshot.skeletonScheme || record.finalPage?.skeletonHtmlScheme) return "skeletonHtml";
    if (mode === "aiHtml" || mode === "compare" || record.htmlScheme || snapshot.htmlScheme || record.finalPage?.aiHtml || record.finalPage?.htmlScheme) return "aiHtml";
    return "config";
  }

  function renderModeLabel(mode) {
    if (mode === "skeletonHtml") return "骨架 HTML";
    if (mode === "aiHtml") return "AI HTML";
    return "组件化";
  }

  function inferBusinessProfile(record = {}) {
    if (record.businessProfile?.businessId) {
      return {
        businessId: record.businessProfile.businessId,
        businessLabel: record.businessProfile.businessLabel || record.businessProfile.label || "通用首页",
        renderMode: record.businessProfile.renderMode || renderModeForRecord(record),
        renderModeLabel: record.businessProfile.renderModeLabel || renderModeLabel(renderModeForRecord(record)),
        inputMode: record.businessProfile.inputMode || record.inputMode || "",
        inputModeLabel: record.businessProfile.inputModeLabel || (record.inputMode === "guided" ? "引导式" : record.inputMode ? "快捷输入" : ""),
        tags: Array.isArray(record.businessProfile.tags) ? record.businessProfile.tags : [],
      };
    }

    const type = moduleTypeForRecord(record);
    if (type === "auth") {
      return { businessId: "auth", businessLabel: "登录注册", renderMode: "auth", renderModeLabel: "认证方案", inputMode: "", inputModeLabel: "", tags: ["登录注册"] };
    }
    if (type === "component") {
      return { businessId: "component", businessLabel: "组件", renderMode: "component", renderModeLabel: "组件生成", inputMode: "", inputModeLabel: "", tags: ["组件"] };
    }

    const snapshot = record.configSnapshot || {};
    const sourceText = [
      record.prompt,
      record.message,
      snapshot.intent,
      snapshot.strategy,
      snapshot.pageGoal,
      snapshot.mainVisual,
      snapshot.primaryCta,
      snapshot.layoutPreset,
      snapshot.themePreset,
      ...(Array.isArray(snapshot.brickIds) ? snapshot.brickIds : []),
      ...(Array.isArray(snapshot.sections) ? snapshot.sections : []),
    ]
      .filter(Boolean)
      .join(" ");
    const matched = BUSINESS_RULES.find(([, , regex]) => regex.test(sourceText)) || ["standard", "通用首页"];
    const mode = renderModeForRecord(record);
    return {
      businessId: matched[0],
      businessLabel: matched[1],
      renderMode: mode,
      renderModeLabel: renderModeLabel(mode),
      inputMode: record.inputMode || "",
      inputModeLabel: record.inputMode === "guided" ? "引导式" : record.inputMode ? "快捷输入" : "",
      tags: [matched[1], renderModeLabel(mode), snapshot.themePreset, snapshot.layoutPreset].filter(Boolean),
    };
  }

  function endpointLabel(record) {
    if (record.baseUrl && record.endpoint) return `${record.baseUrl}${record.endpoint}`;
    if (record.endpoint) return record.endpoint;
    return "--";
  }

  function htmlSourceSummary(record) {
    const snapshot = record.configSnapshot || {};
    const sourceType = record.htmlSourceType || snapshot.htmlSourceType || record.finalPage?.htmlScheme?.sourceType || "";
    const pipeline = record.htmlPipeline || snapshot.htmlPipeline || record.finalPage?.htmlScheme?.generationPipeline || "";
    const quality = record.htmlQualityStatus || snapshot.htmlQualityStatus || record.finalPage?.htmlScheme?.qualityStatus || "";
    const reason = record.htmlFallbackReason || snapshot.htmlFallbackReason || record.finalPage?.htmlScheme?.fallbackReason || "";
    const isMock = Boolean(record.mock || record.status === "mock" || snapshot.htmlMock);
    const isFallback = Boolean(record.status === "fallback" || record.htmlIsFallback || snapshot.htmlIsFallback);
    if (!sourceType && !pipeline && !quality && !reason && !isMock && !isFallback) return "";
    const label = isMock ? "Mock 预览" : sourceType === "local-fallback" ? "本地规则生成" : isFallback ? "Fallback 预览" : "模型生成";
    return [label, sourceType, pipeline, quality, reason].filter(Boolean).join(" · ");
  }

  function groupIdForRecord(record) {
    if (record.pageRunId) return String(record.pageRunId);
    if (record.serverCallId) return `call-${record.serverCallId}`;
    const type = moduleTypeForRecord(record);
    if (type !== "home" && record.id) return `${type}-${record.id}`;
    const snapshot = record.configSnapshot || {};
    const promptKey = String(record.prompt || "").replace(/\s+/g, " ").trim().slice(0, 320);
    return `legacy-${type}-${renderModeForRecord(record)}-${hashText([promptKey, snapshot.name, snapshot.intent, snapshot.layoutPreset, record.inputMode].join("|"))}`;
  }

  function groupTitle(group) {
    const record = group.finalRecord || group.records[0] || {};
    const snapshot = record.configSnapshot || {};
    const authSnapshot = record.schemeSnapshot || {};
    const display = displayRecord(record);
    return authSnapshot.name || snapshot.name || display.summary || actionLabel(record.action);
  }

  function groupStatus(records) {
    const statuses = records.map((record) => record.status).filter(Boolean);
    if (!statuses.length) return "unknown";
    if (statuses.every((status) => status === "failed")) return "failed";
    if (statuses.some((status) => status === "failed" || status === "fallback")) return "fallback";
    if (statuses.some((status) => status === "mock")) return "mock";
    if (statuses.some((status) => status === "local")) return "local";
    return "success";
  }

  function groupRecords(records) {
    const map = new Map();
    records.forEach((record) => {
      const id = groupIdForRecord(record);
      if (!map.has(id)) map.set(id, { id, records: [] });
      map.get(id).records.push(record);
    });

    return [...map.values()]
      .map((group) => {
        const sorted = group.records.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
        const finalRecord =
          sorted.find((record) => record.finalPage || record.responseJson || record.configSnapshot || record.schemeSnapshot) ||
          sorted[0] ||
          {};
        const business = inferBusinessProfile(finalRecord);
        const providers = [...new Set(sorted.map((record) => record.provider || record.providerId || "本地规则").filter(Boolean))];
        const models = [...new Set(sorted.map((record) => record.model).filter(Boolean))];
        const durations = sorted.map((record) => Number(record.durationMs)).filter(Number.isFinite);
        const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);
        const moduleTypes = [...new Set(sorted.map(moduleTypeForRecord))];
        return {
          ...group,
          records: sorted,
          finalRecord,
          title: "",
          business,
          status: groupStatus(sorted),
          latestAt: sorted[0]?.at || "",
          providers,
          models,
          moduleType: moduleTypes.length === 1 ? moduleTypes[0] : "mixed",
          moduleLabel: moduleTypes.length === 1 ? moduleLabel(sorted[0]) : "混合",
          totalDurationMs,
          promptCount: new Set(sorted.map((record) => record.prompt).filter(Boolean)).size,
          hasFullModelJson: sorted.some((record) => record.responseJson),
          hasFinalPage: sorted.some((record) => record.finalPage),
        };
      })
      .map((group) => ({ ...group, title: groupTitle(group) }))
      .sort((a, b) => new Date(b.latestAt || 0).getTime() - new Date(a.latestAt || 0).getTime());
  }

  function searchableGroupText(group) {
    return [
      group.title,
      group.business.businessId,
      group.business.businessLabel,
      group.business.renderModeLabel,
      group.moduleLabel,
      group.status,
      statusLabel(group.status),
      group.providers.join(" "),
      group.models.join(" "),
      ...group.records.flatMap((record) => [
        record.provider,
        record.providerId,
        record.model,
        moduleLabel(record),
        record.status,
        statusLabel(record),
        htmlSourceSummary(record),
        actionLabel(record.action),
        record.prompt,
        record.message,
        record.configSnapshot?.intent,
        record.configSnapshot?.strategy,
        record.configSnapshot?.layoutPreset,
        record.configSnapshot?.themePreset,
        record.schemeSnapshot?.name,
        record.schemeSnapshot?.brand,
        record.schemeSnapshot?.stylePreset,
        record.schemeSnapshot?.defaultScreen,
        record.schemeSnapshot?.registerDepth,
        record.schemeSnapshot?.audience,
        ...(Array.isArray(record.configSnapshot?.brickIds) ? record.configSnapshot.brickIds : []),
        endpointLabel(record),
        record.source,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function businessFilterMatches(group) {
    if (activeBusinessFilter === "all") return true;
    const [kind, value] = activeBusinessFilter.split(":");
    if (kind === "business") return group.business.businessId === value;
    if (kind === "render") return group.business.renderMode === value || group.records.some((record) => renderModeForRecord(record) === value);
    if (kind === "module") return group.moduleType === value || group.records.some((record) => moduleTypeForRecord(record) === value);
    return true;
  }

  function statusFilterMatches(group) {
    if (activeFilter === "all") return true;
    if (activeFilter === "mock") return group.records.some((record) => record.mock || record.status === "mock");
    return group.status === activeFilter || group.records.some((record) => record.status === activeFilter);
  }

  function filterGroups(groups) {
    const query = searchText.trim().toLowerCase();
    return groups.filter((group) => {
      const queryMatch = !query || searchableGroupText(group).includes(query);
      return statusFilterMatches(group) && businessFilterMatches(group) && queryMatch;
    });
  }

  function detailRow(label, value) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "--")}</dd></div>`;
  }

  function renderStats(groups) {
    const success = groups.filter((group) => group.status === "success").length;
    const problems = groups.filter((group) => group.records.some((record) => ["fallback", "failed"].includes(record.status))).length;
    const durations = groups.flatMap((group) => group.records.map((record) => Number(record.durationMs)).filter(Number.isFinite));
    const average = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;

    if (els.total) els.total.textContent = String(groups.length);
    if (els.success) els.success.textContent = String(success);
    if (els.problems) els.problems.textContent = String(problems);
    if (els.average) els.average.textContent = average ? `${average}ms` : "--";
  }

  function renderFilters() {
    els.filters.forEach((button) => {
      const active = button.dataset.callFilter === activeFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderBusinessFilterOptions() {
    if (!els.businessFilter) return;
    els.businessFilter.innerHTML = BUSINESS_FILTER_OPTIONS.map(
      (option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`,
    ).join("");
    els.businessFilter.value = activeBusinessFilter;
  }

  function renderList(groups) {
    if (!els.records) return;

    if (!groups.length) {
      els.records.innerHTML = '<p class="empty-history">暂无匹配记录</p>';
      return;
    }

    els.records.innerHTML = `
      <div class="model-call-table-head" aria-hidden="true">
        <span>业务</span>
        <span>状态</span>
        <span>更新时间</span>
        <span>模型</span>
        <span>调用数</span>
        <span>总耗时</span>
        <span>页面摘要</span>
      </div>
      ${groups
        .map((group) => {
          const active = group.id === activeGroupId;
          const summary = displayRecord(group.finalRecord).summary;
          const source = htmlSourceSummary(group.finalRecord);
          return `
            <button class="model-call-row${active ? " active" : ""}" type="button" data-call-group-id="${escapeHtml(group.id)}" data-call-status="${escapeHtml(group.status || "unknown")}">
              <span><b>${escapeHtml(group.business.businessLabel)}</b><small>${escapeHtml([group.moduleLabel, group.business.renderModeLabel].filter(Boolean).join(" · "))}</small></span>
              <span class="call-status-dot">${escapeHtml(group.records.length > 1 && group.status === "fallback" ? "部分异常" : statusLabel(group.status))}</span>
              <span>${escapeHtml(formatShortDate(group.latestAt))}</span>
              <span><b>${escapeHtml(group.providers.join(" / ") || "本地规则")}</b><small>${escapeHtml(group.models.join(" / ") || "--")}</small></span>
              <span>${escapeHtml(`${group.records.length} 次`)}</span>
              <span>${escapeHtml(group.totalDurationMs ? `${group.totalDurationMs}ms` : "--")}</span>
              <span><b>${escapeHtml(group.title)}</b><small>${escapeHtml([summary, source].filter(Boolean).join(" · "))}</small></span>
            </button>
          `;
        })
        .join("")}
    `;

  }

  function renderDetailPanel(group) {
    if (!els.detail) return;

    if (!group) {
      els.detail.innerHTML = '<p class="empty-history">选择一条页面记录后，在弹窗里查看同页调用链、Prompt、模型 JSON 和页面产物。</p>';
      return;
    }

    const tags = [group.business.businessLabel, group.business.renderModeLabel, group.business.inputModeLabel, group.hasFullModelJson ? "含模型 JSON" : "", group.hasFinalPage ? "含页面产物" : ""].filter(Boolean);
    els.detail.innerHTML = `
      <header>
        <span class="section-kicker">聚合概览</span>
        <h2>${escapeHtml(group.title)}</h2>
        <p data-call-status="${escapeHtml(group.status)}">${escapeHtml(statusLabel(group.status))}</p>
      </header>
      <dl class="model-call-detail-grid">
        ${detailRow("业务", group.business.businessLabel)}
        ${detailRow("页面模式", group.business.renderModeLabel)}
        ${detailRow("调用次数", `${group.records.length} 次`)}
        ${detailRow("更新时间", formatDate(group.latestAt))}
        ${detailRow("模型", group.models.join(" / ") || "--")}
        ${detailRow("总耗时", group.totalDurationMs ? `${group.totalDurationMs}ms` : "--")}
      </dl>
      <section>
        <h3>分析标签</h3>
        <p>${escapeHtml(tags.join(" · ") || "--")}</p>
      </section>
      <div class="model-call-detail-actions">
        <button type="button" data-call-open-detail>查看聚合详情</button>
        <button type="button" data-call-export-group>导出本页 JSON</button>
      </div>
    `;

    els.detail.querySelector("[data-call-open-detail]")?.addEventListener("click", () => openGroupDetail(group));
    els.detail.querySelector("[data-call-export-group]")?.addEventListener("click", () => exportGroup(group));
  }

  function jsonText(value) {
    if (!value) return "";
    try {
      return JSON.stringify(redactValue(value), null, 2);
    } catch (error) {
      return String(value || "");
    }
  }

  function detailBlock(title, value, emptyText = "暂无") {
    const text = typeof value === "string" ? value : jsonText(value);
    if (!text) return "";
    return `
      <details class="model-call-json-block">
        <summary>${escapeHtml(title)}</summary>
        <pre>${escapeHtml(text || emptyText)}</pre>
      </details>
    `;
  }

  function recordResponseJson(record) {
    return record.responseJson || record.modelResponseJson || record.finalPage?.configJson || record.configSnapshot || record.schemeSnapshot || null;
  }

  function renderTimelineRecord(record, index) {
    const display = displayRecord(record);
    const responseJson = recordResponseJson(record);
    const source = htmlSourceSummary(record);
    const safeRecord = redactRecord(record);
    return `
      <article class="model-call-timeline-item" data-call-status="${escapeHtml(record.status || "unknown")}">
        <header>
          <div>
            <span>${escapeHtml(`#${index + 1} · ${actionLabel(record.action)}`)}</span>
            <h3>${escapeHtml(record.provider || "本地规则")} / ${escapeHtml(record.model || "--")}</h3>
            <p>${escapeHtml([formatDate(record.at), statusLabel(record), record.durationMs ? `${record.durationMs}ms` : callModeLabel(record.callMode)].filter(Boolean).join(" · "))}</p>
          </div>
          <strong>${escapeHtml(moduleLabel(record))}</strong>
        </header>
        <dl class="model-call-detail-grid">
          ${detailRow("调用方式", callModeLabel(record.callMode))}
          ${detailRow("API 模式", record.apiMode || "--")}
          ${detailRow("接口", endpointLabel(record))}
          ${detailRow("方案轮次", record.variant ?? "--")}
          ${detailRow("输入方式", record.inputMode === "guided" ? "引导式" : record.inputMode ? "快捷输入" : "--")}
          ${detailRow("页面分组", record.pageRunId || "--")}
        </dl>
        ${record.prompt ? detailBlock("Prompt", record.prompt) : ""}
        ${source ? `<section class="model-call-warning"><h3>生成来源</h3><p>${escapeHtml(source)}</p></section>` : ""}
        <section>
          <h3>结果摘要</h3>
          <p>${escapeHtml(display.summary || "--")}</p>
        </section>
        ${display.advice ? `<section class="model-call-warning"><h3>处理建议</h3><p>${escapeHtml(display.advice)}</p></section>` : ""}
        ${display.detail ? detailBlock("模型返回片段", display.detail) : ""}
        ${detailBlock(responseJson === record.configSnapshot || responseJson === record.schemeSnapshot ? "模型/页面 JSON 摘要" : "AI 大模型返回 JSON", responseJson)}
        ${detailBlock("Raw Text", record.rawText)}
        ${detailBlock("最终页面产物", record.finalPage)}
        ${detailBlock("记录 JSON", safeRecord)}
      </article>
    `;
  }

  function finalPageForGroup(group) {
    const record = group.records.find((item) => item.finalPage) || group.finalRecord || group.records[0] || {};
    return (
      record.finalPage || {
        configJson: record.responseJson?.normalizedConfig || record.configSnapshot || null,
        aiHtml: record.htmlScheme?.html || "",
        aiCss: record.htmlScheme?.css || "",
        skeletonHtmlScheme: record.configSnapshot?.skeletonScheme || null,
      }
    );
  }

  function buildGroupExport(group) {
    const finalPage = finalPageForGroup(group);
    const calls = group.records.map((record, index) => ({
      index,
      id: record.id,
      at: record.at,
      action: record.action,
      moduleType: moduleTypeForRecord(record),
      providerId: record.providerId,
      provider: record.provider,
      model: record.model,
      status: record.status,
      durationMs: record.durationMs,
      prompt: record.prompt || "",
      pageRunId: record.pageRunId || group.id,
      businessProfile: inferBusinessProfile(record),
      request: redactValue({
        apiMode: record.apiMode,
        callMode: record.callMode,
        baseUrl: record.baseUrl,
        endpoint: record.endpoint,
        temperature: record.temperature,
        maxOutputTokens: record.maxOutputTokens,
        inputMode: record.inputMode,
        variant: record.variant,
      }),
      responseJson: recordResponseJson(record),
      rawText: record.rawText || "",
      configSnapshot: record.configSnapshot || null,
      guidedSnapshot: record.guidedSnapshot || null,
      schemeSnapshot: record.schemeSnapshot || null,
      finalPage: record.finalPage || null,
      usage: record.usage || null,
      record: redactRecord(record),
    }));

    return {
      exportType: "home-model-calls-page-group",
      exportedAt: new Date().toISOString(),
      pageRunId: group.id,
      title: group.title,
      businessProfile: group.business,
      summary: {
        status: group.status,
        moduleType: group.moduleType,
        moduleLabel: group.moduleLabel,
        latestAt: group.latestAt,
        callCount: group.records.length,
        promptCount: group.promptCount,
        providers: group.providers,
        models: group.models,
        totalDurationMs: group.totalDurationMs,
        hasFullModelJson: group.hasFullModelJson,
        hasFinalPage: group.hasFinalPage,
      },
      finalPage,
      modelJsonFiles: calls.map((call) => ({
        filename: `${String(call.index + 1).padStart(2, "0")}-${call.action || "model-call"}-${call.id || "record"}.json`,
        prompt: call.prompt,
        json: call.responseJson,
      })),
      calls,
    };
  }

  function safeFilePart(value) {
    return String(value || "model-calls")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80);
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(redactValue(data), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportGroup(group) {
    if (!group) {
      showToast("暂无记录可导出");
      return;
    }
    downloadJson(buildGroupExport(group), `home-page-calls-${safeFilePart(group.title)}-${new Date().toISOString().slice(0, 10)}.json`);
    showToast("已导出本页聚合 JSON");
  }

  function exportGroups(groups) {
    if (!groups.length) {
      showToast("暂无记录可导出");
      return;
    }
    downloadJson(
      {
        exportType: "home-model-calls-grouped",
        exportedAt: new Date().toISOString(),
        groupCount: groups.length,
        callCount: groups.reduce((sum, group) => sum + group.records.length, 0),
        filters: { status: activeFilter, business: activeBusinessFilter, search: searchText },
        groups: groups.map(buildGroupExport),
      },
      `home-model-calls-grouped-${new Date().toISOString().slice(0, 10)}.json`,
    );
    showToast("已导出当前筛选聚合 JSON");
  }

  function openGroupDetail(group) {
    if (!els.modal || !els.modalBody) return;
    activeGroupId = group.id;
    if (els.modalTitle) els.modalTitle.textContent = group.title;
    if (els.modalSubtitle) {
      els.modalSubtitle.textContent = [
        group.business.businessLabel,
        group.business.renderModeLabel,
        `${group.records.length} 次调用`,
        group.hasFullModelJson ? "含模型 JSON" : "仅摘要记录",
      ]
        .filter(Boolean)
        .join(" · ");
    }
    const finalPage = finalPageForGroup(group);
    els.modalBody.innerHTML = `
      <section class="model-call-modal-summary">
        <dl class="model-call-detail-grid">
          ${detailRow("业务", group.business.businessLabel)}
          ${detailRow("页面模式", group.business.renderModeLabel)}
          ${detailRow("输入方式", group.business.inputModeLabel || "--")}
          ${detailRow("调用次数", `${group.records.length} 次`)}
          ${detailRow("模型", group.models.join(" / ") || "--")}
          ${detailRow("总耗时", group.totalDurationMs ? `${group.totalDurationMs}ms` : "--")}
          ${detailRow("更新时间", formatDate(group.latestAt))}
          ${detailRow("页面分组 ID", group.id)}
        </dl>
        <div class="model-call-tag-list">
          ${(group.business.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          ${group.hasFullModelJson ? "<span>AI 大模型 JSON</span>" : "<span>旧摘要记录</span>"}
          ${group.hasFinalPage ? "<span>最终页面产物</span>" : ""}
        </div>
        ${detailBlock("聚合导出预览", {
          pageRunId: group.id,
          businessProfile: group.business,
          callCount: group.records.length,
          modelJsonFiles: group.records.map((record, index) => ({
            index: index + 1,
            action: record.action,
            hasResponseJson: Boolean(recordResponseJson(record)),
            prompt: record.prompt || "",
          })),
        })}
        ${detailBlock("最终页面产物", finalPage)}
      </section>
      <section class="model-call-timeline">
        <h3>同一页面调用链</h3>
        ${group.records.map(renderTimelineRecord).join("")}
      </section>
    `;
    els.modal.hidden = false;
    document.body.classList.add("model-call-modal-open");
    els.modal.querySelector(".model-call-modal-dialog")?.focus?.();
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.hidden = true;
    document.body.classList.remove("model-call-modal-open");
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

  function render() {
    allGroups = groupRecords(mergedRecords());
    visibleGroups = filterGroups(allGroups);
    if (!visibleGroups.some((group) => group.id === activeGroupId)) {
      activeGroupId = visibleGroups[0]?.id || "";
    }

    renderStats(allGroups);
    renderFilters();
    renderList(visibleGroups);
    renderDetailPanel(visibleGroups.find((group) => group.id === activeGroupId));
  }

  els.filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.callFilter || "all";
      render();
    });
  });

  els.businessFilter?.addEventListener("change", () => {
    activeBusinessFilter = els.businessFilter.value || "all";
    render();
  });

  els.search?.addEventListener("input", () => {
    searchText = els.search.value || "";
    render();
  });

  els.records?.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-call-group-id]");
    if (!button || !els.records.contains(button)) return;
	    event.preventDefault();
	    activeGroupId = button.dataset.callGroupId || "";
	    let group = visibleGroups.find((item) => item.id === activeGroupId) || allGroups.find((item) => item.id === activeGroupId);
	    render();
	    group = group || visibleGroups.find((item) => item.id === activeGroupId) || allGroups.find((item) => item.id === activeGroupId);
	    if (group) openGroupDetail(group);
	  });

  els.refresh?.addEventListener("click", async () => {
    await refreshServerRecords();
    render();
    showToast("已刷新");
  });

  els.export?.addEventListener("click", () => exportGroups(visibleGroups.length ? visibleGroups : allGroups));
  els.modalExport?.addEventListener("click", () => exportGroup(allGroups.find((group) => group.id === activeGroupId)));
  els.modalClose.forEach((button) => button.addEventListener("click", closeModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.modal?.hidden) closeModal();
  });

  els.clear?.addEventListener("click", async () => {
    if (!mergedRecords().length) {
      showToast("暂无记录");
      return;
    }
    if (!window.confirm("确认清空当前调用记录？")) return;
    saveRecords([]);
    saveRecords([], AUTH_MODEL_HISTORY_KEY);
    try {
      await Promise.allSettled([
        fetch("/api/home-ai/calls", { method: "DELETE" }),
        fetch("/api/auth-ai/calls", { method: "DELETE" }),
      ]);
      serverRecords = [];
      authServerRecords = [];
    } catch (error) {
      serverRecords = [];
      authServerRecords = [];
    }
    activeGroupId = "";
    closeModal();
    render();
    showToast("已清空");
  });

  window.addEventListener("storage", (event) => {
    if ([MODEL_HISTORY_KEY, AUTH_MODEL_HISTORY_KEY].includes(event.key)) render();
  });

  renderBusinessFilterOptions();
  refreshServerRecords().then(render);
})();
