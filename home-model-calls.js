(function () {
  const MODEL_HISTORY_KEY = "forexcrm.home.ai.call.history";

  const els = {
    total: document.querySelector("[data-call-total]"),
    success: document.querySelector("[data-call-success]"),
    problems: document.querySelector("[data-call-problems]"),
    average: document.querySelector("[data-call-average]"),
    records: document.querySelector("[data-call-records]"),
    detail: document.querySelector("[data-call-detail]"),
    filters: [...document.querySelectorAll("[data-call-filter]")],
    search: document.querySelector("[data-call-search]"),
    refresh: document.querySelector("[data-call-refresh]"),
    export: document.querySelector("[data-call-export]"),
    clear: document.querySelector("[data-call-clear]"),
    toast: document.querySelector("[data-call-toast]"),
  };

  let activeFilter = "all";
  let activeRecordId = "";
  let searchText = "";
  let serverRecords = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadRecords() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_HISTORY_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function saveRecords(records) {
    window.localStorage.setItem(MODEL_HISTORY_KEY, JSON.stringify(Array.isArray(records) ? records : []));
  }

  async function refreshServerRecords() {
    try {
      const response = await fetch("/api/home-ai/calls", { cache: "no-store" });
      const data = await response.json();
      serverRecords = Array.isArray(data.records) ? data.records : [];
    } catch (error) {
      serverRecords = [];
    }
  }

  function mergedRecords() {
    const recordsById = new Map();
    const addRecord = (record, source, index) => {
      const id = record?.id || `${source}-${index}`;
      const current = recordsById.get(id) || {};
      recordsById.set(id, { ...current, ...(record || {}), id, source: record?.source || source });
    };

    serverRecords.forEach((record, index) => addRecord(record, "serverProxy", index));
    loadRecords().forEach((record, index) => addRecord(record, "browser", index));

    return [...recordsById.values()].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }

  function redactRecord(record) {
    const copy = { ...(record || {}) };
    delete copy.apiKey;
    delete copy.apiKeys;
    return copy;
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

  function statusLabel(record) {
    if (record.status === "success") return record.mock ? "Mock 成功" : "调用成功";
    if (record.status === "fallback") return "已回退";
    if (record.status === "local") return "本地生成";
    if (record.status === "failed") return "调用失败";
    return "未知";
  }

  function actionLabel(action) {
    if (action === "connectivity-test") return "连通性测试";
    if (action === "homepage-generate") return "首页生成";
    if (action === "component-generate") return "组件生成";
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
      .replace(/\s*·\s*(?:\/api\/home-ai\/complete|\/api\/home-ai\/test|\/api\/home-components\/generate|\/api\/home-components\/compose|https?:\/\/\S+)\s*$/i, "")
      .replace(/\s*·\s*(模型返回片段：|处理建议：)[\s\S]*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function parseMarkedHistoryMessage(message) {
    const source = String(message || "").replace(/\s*·\s*(?:\/api\/home-ai\/complete|\/api\/home-ai\/test|\/api\/home-components\/generate|\/api\/home-components\/compose|https?:\/\/\S+)\s*$/i, "");
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

  function endpointLabel(record) {
    if (record.baseUrl && record.endpoint) return `${record.baseUrl}${record.endpoint}`;
    if (record.endpoint) return record.endpoint;
    return "--";
  }

  function searchableText(record) {
    return [
      record.provider,
      record.providerId,
      record.model,
      record.status,
      statusLabel(record),
      actionLabel(record.action),
	      record.prompt,
	      record.message,
	      record.configSnapshot?.intent,
	      record.configSnapshot?.strategy,
	      record.configSnapshot?.layoutPreset,
	      record.configSnapshot?.themePreset,
	      ...(Array.isArray(record.configSnapshot?.brickIds) ? record.configSnapshot.brickIds : []),
	      endpointLabel(record),
	      record.source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function filterRecords(records) {
    const query = searchText.trim().toLowerCase();
    return records.filter((record) => {
      const filterMatch =
        activeFilter === "all" ||
        record.status === activeFilter ||
        (activeFilter === "mock" && record.mock);
      const queryMatch = !query || searchableText(record).includes(query);
      return filterMatch && queryMatch;
    });
  }

  function renderStats(records) {
    const success = records.filter((record) => record.status === "success").length;
    const problems = records.filter((record) => ["fallback", "failed"].includes(record.status)).length;
    const durations = records.map((record) => Number(record.durationMs)).filter(Number.isFinite);
    const average = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;

    if (els.total) els.total.textContent = String(records.length);
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

  function renderList(records) {
    if (!els.records) return;

    if (!records.length) {
      els.records.innerHTML = '<p class="empty-history">暂无匹配记录</p>';
      return;
    }

    els.records.innerHTML = `
      <div class="model-call-table-head" aria-hidden="true">
        <span>状态</span>
        <span>时间</span>
        <span>模型</span>
        <span>调用</span>
        <span>耗时</span>
        <span>摘要</span>
      </div>
      ${records
        .map((record) => {
          const display = displayRecord(record);
          const active = record.id === activeRecordId;
          return `
            <button class="model-call-row${active ? " active" : ""}" type="button" data-call-id="${escapeHtml(record.id || "")}" data-call-status="${escapeHtml(record.status || "unknown")}">
              <span class="call-status-dot">${escapeHtml(statusLabel(record))}</span>
              <span>${escapeHtml(formatDate(record.at))}</span>
              <span><b>${escapeHtml(record.provider || "本地规则")}</b><small>${escapeHtml(record.model || "--")}</small></span>
              <span>${escapeHtml(actionLabel(record.action))}</span>
              <span>${escapeHtml(record.durationMs ? `${record.durationMs}ms` : callModeLabel(record.callMode))}</span>
              <span>${escapeHtml(display.summary)}</span>
            </button>
          `;
        })
        .join("")}
    `;

    els.records.querySelectorAll("[data-call-id]").forEach((button) => {
      button.addEventListener("click", () => {
        activeRecordId = button.dataset.callId || "";
        render();
      });
    });
  }

  function detailRow(label, value) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "--")}</dd></div>`;
  }

	  function renderDetail(record) {
    if (!els.detail) return;

    if (!record) {
      els.detail.innerHTML = '<p class="empty-history">暂无调用记录</p>';
      return;
    }

	    const display = displayRecord(record);
	    const safeRecord = redactRecord(record);
	    const snapshot = record.configSnapshot || {};
	    const structureRows = [
	      ["首页名称", snapshot.name],
	      ["意图", snapshot.intent],
	      ["布局", snapshot.layoutPreset],
	      ["主题", snapshot.themePreset],
	      ["策略", snapshot.strategy],
	      ["积木", Array.isArray(snapshot.brickIds) ? snapshot.brickIds.join(" → ") : ""],
	      ["分区", Array.isArray(snapshot.sections) ? snapshot.sections.join(" / ") : ""],
	    ].filter(([, value]) => value);

	    els.detail.innerHTML = `
      <header>
        <span class="section-kicker">${escapeHtml(actionLabel(record.action).toUpperCase())}</span>
        <h2>${escapeHtml(record.provider || "本地规则")} / ${escapeHtml(record.model || "--")}</h2>
        <p data-call-status="${escapeHtml(record.status || "unknown")}">${escapeHtml(statusLabel(record))}</p>
      </header>
      <dl class="model-call-detail-grid">
        ${detailRow("调用时间", formatDate(record.at))}
        ${detailRow("耗时", record.durationMs ? `${record.durationMs}ms` : "--")}
        ${detailRow("调用方式", callModeLabel(record.callMode))}
        ${detailRow("API 模式", record.apiMode || "--")}
        ${detailRow("记录来源", record.source === "serverProxy" ? "后端代理" : record.source === "browser" ? "浏览器" : record.source || "--")}
        ${detailRow("接口", endpointLabel(record))}
        ${detailRow("Temperature", record.temperature ?? "--")}
        ${detailRow("输出上限", record.maxOutputTokens ?? "--")}
        ${detailRow("方案轮次", record.variant ?? "--")}
      </dl>
      <section>
        <h3>提示词</h3>
        <p>${escapeHtml(record.prompt || "--")}</p>
      </section>
	      <section>
	        <h3>结果摘要</h3>
	        <p>${escapeHtml(display.summary)}</p>
	      </section>
	      ${
	        structureRows.length
	          ? `<section><h3>首页结构</h3><dl class="model-call-detail-grid">${structureRows
	              .map(([label, value]) => detailRow(label, value))
	              .join("")}</dl></section>`
	          : ""
	      }
	      ${
        display.advice
          ? `<section class="model-call-warning"><h3>处理建议</h3><p>${escapeHtml(display.advice)}</p></section>`
          : ""
      }
      ${
        display.detail
          ? `<section><h3>模型返回片段</h3><pre>${escapeHtml(display.detail)}</pre></section>`
          : ""
      }
      <section>
        <h3>记录 JSON</h3>
        <pre>${escapeHtml(JSON.stringify(safeRecord, null, 2))}</pre>
      </section>
    `;
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

  function exportRecords(records) {
    if (!records.length) {
      showToast("暂无记录可导出");
      return;
    }
    const blob = new Blob([JSON.stringify(records.map(redactRecord), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `home-model-calls-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("已导出调用记录");
  }

  function render() {
    const records = mergedRecords();
    const visibleRecords = filterRecords(records);
    if (!visibleRecords.some((record) => record.id === activeRecordId)) {
      activeRecordId = visibleRecords[0]?.id || "";
    }

    renderStats(records);
    renderFilters();
    renderList(visibleRecords);
    renderDetail(visibleRecords.find((record) => record.id === activeRecordId));
  }

  els.filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.callFilter || "all";
      render();
    });
  });

  els.search?.addEventListener("input", () => {
    searchText = els.search.value || "";
    render();
  });

  els.refresh?.addEventListener("click", async () => {
    await refreshServerRecords();
    render();
    showToast("已刷新");
  });

  els.export?.addEventListener("click", () => exportRecords(mergedRecords()));

  els.clear?.addEventListener("click", async () => {
    if (!mergedRecords().length) {
      showToast("暂无记录");
      return;
    }
    if (!window.confirm("确认清空当前调用记录？")) return;
    saveRecords([]);
    try {
      await fetch("/api/home-ai/calls", { method: "DELETE" });
      serverRecords = [];
    } catch (error) {
      serverRecords = [];
    }
    activeRecordId = "";
    render();
    showToast("已清空");
  });

  window.addEventListener("storage", (event) => {
    if (event.key === MODEL_HISTORY_KEY) render();
  });

  refreshServerRecords().then(render);
})();
