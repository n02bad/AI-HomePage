const TRADING_ACCOUNT_FIELDS = [
  { key: "accountKind", label: "账号类型", note: "Demo / Live" },
  { key: "platformServer", label: "交易环境", note: "展示如 MT5 · HCHoldings-Live2" },
  { key: "account", label: "账号", note: "交易账号" },
  { key: "balance", label: "余额", note: "账户的余额" },
  { key: "equity", label: "净值", note: "账号的净值" },
  { key: "credit", label: "信用金", note: "账户的信用金" },
  { key: "accountType", label: "账户类型", note: "账户类型" },
  { key: "leverage", label: "杠杆", note: "账号杠杆" },
  { key: "marginRatio", label: "保证金比例", note: "账户保证金比例" },
];

const accounts = [
  { id: "80010", account: "80010", kind: "real", accountKind: "Live", platform: "MT5", server: "HCHoldings-Live2", balance: "12480.50", equity: "12726.40", credit: "500.00", accountType: "ECN Standard", leverage: "1:100", marginRatio: "528%" },
  { id: "80011", account: "80011", kind: "real", accountKind: "Live", platform: "MT5", server: "HCHoldings-Live2", balance: "8250.00", equity: "8196.70", credit: "0.00", accountType: "PAMM Investor", leverage: "1:200", marginRatio: "1322%" },
  { id: "90021", account: "90021", kind: "demo", accountKind: "Demo", platform: "MT5", server: "HCHoldings-Demo", balance: "50000.00", equity: "51280.60", credit: "0.00", accountType: "Demo ECN", leverage: "1:500", marginRatio: "4345%" },
];

const performanceSnapshotsByAccount = {
  80010: { floatingPnl: "+1,280.60" },
  80011: { floatingPnl: "-53.30" },
  90021: { floatingPnl: "+428.20" },
};

const performanceSeriesByAccount = {
  80010: {
    7: { equity: [100, 108, 104, 118, 126, 130, 116], pnl: [80, 89, 86, 96, 104, 109, 98], delta: "+16.8%", peak: "13,120.00", drawdown: "-3.2%" },
    30: { equity: [100, 104, 101, 112, 121, 126, 118], pnl: [80, 86, 84, 92, 101, 104, 96], delta: "+13.4%", peak: "13,120.00", drawdown: "-5.1%" },
  },
  80011: {
    7: { equity: [96, 94, 97, 95, 93, 92, 94], pnl: [76, 75, 77, 76, 73, 72, 74], delta: "-0.6%", peak: "8,320.00", drawdown: "-2.4%" },
    30: { equity: [98, 97, 99, 96, 94, 92, 94], pnl: [78, 77, 79, 75, 73, 71, 74], delta: "-1.8%", peak: "8,460.00", drawdown: "-4.8%" },
  },
  90021: {
    7: { equity: [100, 101, 103, 102, 104, 106, 105], pnl: [70, 72, 73, 73, 75, 77, 76], delta: "+2.6%", peak: "51,620.80", drawdown: "-0.8%" },
    30: { equity: [100, 101, 102, 104, 103, 105, 106], pnl: [70, 71, 72, 74, 73, 76, 77], delta: "+4.1%", peak: "52,140.00", drawdown: "-1.2%" },
  },
};

const wallets = [
  { name: "USD Wallet", balance: 9999.99, currency: "USD" },
  { name: "EUR Wallet", balance: 1200, currency: "EUR" },
];

const usdRates = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.25,
  JPY: 0.0068,
  CNH: 0.138,
  USDT: 1,
};

let activeFilter = "all";
let activeView = "card";
let accountEntryExpanded = false;
let activePerformanceAccountId = accounts[0]?.id || "";
let activePerformanceMetric = "pnl";

let els = {};

function readBooleanDataset(name, fallback = true) {
  const value = document.body?.dataset?.[name];
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function homeAccountSettings() {
  const configuredView = ["card", "list", "switchable"].includes(document.body?.dataset?.homeAccountView)
    ? document.body.dataset.homeAccountView
    : "switchable";

  return {
    realEnabled: readBooleanDataset("homeAccountReal", true),
    demoEnabled: readBooleanDataset("homeAccountDemo", true),
    grouping: document.body?.dataset?.homeAccountGrouping === "separated" ? "separated" : "combined",
    viewMode: configuredView,
    realViewMode: ["card", "list"].includes(document.body?.dataset?.homeAccountRealView)
      ? document.body.dataset.homeAccountRealView
      : configuredView === "list"
      ? "list"
      : "card",
    demoViewMode: ["card", "list"].includes(document.body?.dataset?.homeAccountDemoView)
      ? document.body.dataset.homeAccountDemoView
      : configuredView === "card"
      ? "card"
      : "list",
    demoFirst: readBooleanDataset("homeAccountDemoFirst", false),
    openEnabled: readBooleanDataset("homeOpenAccountEnabled", true),
    openReal: readBooleanDataset("homeOpenAccountReal", true),
    openDemo: readBooleanDataset("homeOpenAccountDemo", true),
    openBind: readBooleanDataset("homeOpenAccountBind", true),
  };
}

function syncConfiguredState() {
  const settings = homeAccountSettings();

  if (!settings.realEnabled && activeFilter === "real") activeFilter = settings.demoEnabled ? "demo" : "all";
  if (!settings.demoEnabled && activeFilter === "demo") activeFilter = settings.realEnabled ? "real" : "all";
  if (!(settings.realEnabled && settings.demoEnabled) && activeFilter === "all") {
    activeFilter = settings.realEnabled ? "real" : settings.demoEnabled ? "demo" : "all";
  }

  if (settings.viewMode === "card" || settings.viewMode === "list") {
    activeView = settings.viewMode;
  }

  if (!settings.openEnabled) {
    accountEntryExpanded = false;
  }
}

function collectElements() {
  els = {
    cardView: document.querySelector("[data-accounts-card-view]"),
    listView: document.querySelector("[data-accounts-list-view]"),
    splitView: document.querySelector("[data-accounts-split-view]"),
    realAccountCards: document.querySelector("[data-real-account-cards]"),
    demoAccountList: document.querySelector("[data-demo-account-list]"),
    realAccountCount: document.querySelector("[data-real-account-count]"),
    demoAccountCount: document.querySelector("[data-demo-account-count]"),
    accountOpenMenu: document.querySelector("[data-account-open-menu]"),
    filterButtons: [...document.querySelectorAll("[data-account-filter]")],
    viewButtons: [...document.querySelectorAll("[data-view-mode]")],
    performanceWidgets: [...document.querySelectorAll("[data-account-performance]")],
    summaryTotal: document.querySelector("[data-summary-total]"),
    summaryAccounts: document.querySelector("[data-summary-accounts]"),
    summaryWallets: document.querySelector("[data-summary-wallets]"),
    summaryWalletNote: document.querySelector("[data-summary-wallet-note]"),
    toast: document.querySelector("[data-client-toast]"),
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function kindLabel(account) {
  return account.accountKind || (account.kind === "demo" ? "Demo" : "Live");
}

function accountStatusLabel(account) {
  return account.accountKind || (account.kind === "demo" ? "Demo" : "Live");
}

function performanceAccountLabel(account) {
  return `${account.account || account.id}-${account.server}`;
}

function platformServerLabel(account) {
  return [account.platform, account.server].filter(Boolean).join(" · ");
}

function visibleAccounts() {
  const settings = homeAccountSettings();
  const allowed = accounts.filter((account) => {
    if (account.kind === "real") return settings.realEnabled;
    if (account.kind === "demo") return settings.demoEnabled;
    return true;
  });

  if (activeFilter === "all") return allowed;
  return allowed.filter((account) => account.kind === activeFilter);
}

function shouldRenderSplitAccounts(settings = homeAccountSettings()) {
  return settings.grouping === "separated" && settings.realEnabled && settings.demoEnabled;
}

function ensureSplitAccountShell() {
  if (els.splitView || !els.cardView) return;

  const splitView = document.createElement("div");
  splitView.className = "accounts-split-view";
  splitView.dataset.accountsSplitView = "";
  splitView.hidden = true;
  splitView.innerHTML = `
    <section class="account-split-module account-split-module-real" data-account-section="real">
      <header>
        <div>
          <strong>真实交易账号列表</strong>
        </div>
        <div class="account-section-tools">
          <button class="account-create-button" data-home-action="openAccount" data-account-entry-kind="real" type="button">
            <span>${icon("plus")}</span>
            创建账号
          </button>
        </div>
      </header>
      <div class="real-account-card-grid" data-real-account-cards></div>
    </section>
    <section class="account-split-module account-split-module-demo" data-account-section="demo">
      <header>
        <div>
          <strong>模拟交易账号列表</strong>
        </div>
        <div class="account-section-tools">
          <button class="account-create-button" data-home-action="openAccount" data-account-entry-kind="demo" type="button">
            <span>${icon("demo")}</span>
            创建账号
          </button>
        </div>
      </header>
      <div data-demo-account-list></div>
    </section>
  `;

  els.cardView.insertAdjacentElement("beforebegin", splitView);
  collectElements();
}

function toUsd(amount, currency = "USD") {
  const rate = usdRates[currency] || 1;
  return Number(amount || 0) * rate;
}

function formatUsd(amount) {
  return formatUsdNumber(amount);
}

function formatUsdNumber(amount) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatSignedUsd(value) {
  const raw = String(value || "0").trim();
  const amount = Number(raw.replace(/[+,$\s]/g, ""));
  const sign = raw.startsWith("-") ? "-" : "+";
  return `${sign}$${formatUsdNumber(Math.abs(Number.isFinite(amount) ? amount : 0))}`;
}

function renderBalanceOverview() {
  const accountTotal = accounts
    .filter((account) => account.kind === "real")
    .reduce((sum, account) => sum + toUsd(account.balance), 0);

  const walletTotal = wallets.reduce((sum, wallet) => sum + toUsd(wallet.balance, wallet.currency), 0);
  const total = accountTotal + walletTotal;
  const convertedWallets = wallets.filter((wallet) => wallet.currency !== "USD").map((wallet) => wallet.currency);

  if (els.summaryAccounts) els.summaryAccounts.textContent = formatUsd(accountTotal);
  if (els.summaryWallets) els.summaryWallets.textContent = formatUsd(walletTotal);
  if (els.summaryTotal) els.summaryTotal.textContent = formatUsd(total);
  if (els.summaryWalletNote) {
    els.summaryWalletNote.textContent = convertedWallets.length
      ? "非基础币种已按汇率统一折算"
      : "钱包币种已统一折算";
  }
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) node.textContent = value;
}

function currentPerformancePeriod(widget) {
  const activeButton = widget.querySelector("[data-chart-period].active");
  const chart = widget.querySelector("[data-home-echart]");
  return activeButton?.dataset.chartPeriod === "30" || chart?.dataset.chartPeriod === "30" ? "30" : "7";
}

function performanceSeries(account, period) {
  return performanceSeriesByAccount[account.id]?.[period] || performanceSeriesByAccount[accounts[0]?.id]?.[period] || { equity: [], pnl: [], delta: "--", peak: "--", drawdown: "--" };
}

function hydratePerformanceSelect(select, selectedValue) {
  if (!select) return;
  const nextOptions = accounts
    .map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(performanceAccountLabel(account))}</option>`)
    .join("");

  if (select.dataset.optionsHydrated !== "true" || select.innerHTML !== nextOptions) {
    select.innerHTML = nextOptions;
    select.dataset.optionsHydrated = "true";
  }
  select.value = selectedValue;
}

function renderAccountPerformanceWidgets() {
  if (!els.performanceWidgets?.length) return;

  const selectedAccount = accounts.find((account) => account.id === activePerformanceAccountId) || accounts[0];
  if (!selectedAccount) return;
  activePerformanceAccountId = selectedAccount.id;

  els.performanceWidgets.forEach((widget) => {
    const period = currentPerformancePeriod(widget);
    const series = performanceSeries(selectedAccount, period);
    const snapshot = performanceSnapshotsByAccount[selectedAccount.id] || {};
    const floatingPnl = snapshot.floatingPnl || "--";
    const isLoss = String(floatingPnl || "").startsWith("-");

    hydratePerformanceSelect(widget.querySelector("[data-performance-account-select]"), selectedAccount.id);
    const metricSelect = widget.querySelector("[data-performance-metric-select]");
    if (metricSelect) metricSelect.value = activePerformanceMetric;

    const status = widget.querySelector("[data-performance-status]");
    if (status) {
      status.textContent = accountStatusLabel(selectedAccount);
      status.classList.toggle("demo", selectedAccount.kind === "demo");
    }

    setText(widget, "[data-performance-account-label]", performanceAccountLabel(selectedAccount));
    setText(widget, "[data-performance-account-meta]", `${platformServerLabel(selectedAccount)} · ${selectedAccount.accountType}`);
    setText(widget, "[data-performance-equity]", formatUsdNumber(toUsd(selectedAccount.equity || selectedAccount.balance)));
    setText(widget, "[data-performance-balance]", `Balance ${formatUsdNumber(toUsd(selectedAccount.balance))}`);
    setText(widget, '[data-performance-metric-value="pnl"]', floatingPnl === "--" ? "--" : formatSignedUsd(floatingPnl));
    setText(widget, '[data-performance-metric-value="margin"]', selectedAccount.marginRatio || "--");
    setText(widget, '[data-performance-metric-value="credit"]', `$${formatUsdNumber(toUsd(selectedAccount.credit || 0))}`);
    setText(widget, '[data-performance-metric-value="leverage"]', selectedAccount.leverage || "--");
    widget.querySelector('[data-performance-metric-value="pnl"]')?.classList.toggle("positive", !isLoss);
    widget.querySelector('[data-performance-metric-value="pnl"]')?.classList.toggle("negative", isLoss);

    setText(widget, "[data-performance-delta-label]", `${period}D Equity`);
    setText(widget, "[data-performance-delta]", series.delta);
    setText(widget, "[data-performance-peak]", series.peak);
    setText(widget, "[data-performance-drawdown]", series.drawdown);

    widget.querySelectorAll("[data-home-echart]").forEach((chart) => {
      chart.dataset.chartKind = activePerformanceMetric === "pnl" ? "account-performance" : "account-performance-equity";
      chart.dataset.chartValues = JSON.stringify(series.equity);
      chart.dataset.chartPnlValues = activePerformanceMetric === "pnl" ? JSON.stringify(series.pnl) : "[]";
    });
  });
}

function icon(name) {
  const icons = {
    dots: '<circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />',
    plus: '<path d="M12 5v14" /><path d="M5 12h14" />',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />',
    user: '<circle cx="10" cy="8" r="3" /><path d="M4 20a6 6 0 0 1 12 0" /><path d="M18 8v6" /><path d="M15 11h6" />',
    demo: '<rect x="4" y="5" width="16" height="12" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="M8 9h8" />',
    chevron: '<path d="m6 9 6 6 6-6" />',
  };

  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
}

function renderAccountEntryActions(context = "card") {
  const settings = homeAccountSettings();
  if (!settings.openEnabled) return "";

  const actions = [
    settings.openReal
      ? { kind: "real", icon: "user", label: "真实账号", primary: true, action: "openAccount" }
      : null,
    settings.openDemo
      ? { kind: "demo", icon: "demo", label: "模拟账号", action: "openAccount" }
      : null,
    settings.openBind ? { kind: "bind", icon: "link", label: "绑定账号", action: "bindAccount" } : null,
  ].filter(Boolean);

  if (!actions.length) return "";

  const tabIndex = accountEntryExpanded ? "" : ' tabindex="-1"';
  const actionClass = context === "compact" ? "account-entry-action compact" : "account-entry-action";

  return `
    <div class="account-entry-actions" ${accountEntryExpanded ? "" : "hidden"}>
      ${actions
        .map((action) =>
          `<button class="${actionClass}${action.primary ? " primary" : ""}" data-home-action="${escapeHtml(action.action)}" data-account-entry-kind="${escapeHtml(action.kind)}" type="button"${tabIndex}><span>${icon(action.icon)}</span><b>${escapeHtml(action.label)}</b></button>`,
        )
        .join("")}
    </div>
  `;
}

function renderAccountEntryMenu() {
  if (!els.accountOpenMenu) return;
  const settings = homeAccountSettings();
  const actions = renderAccountEntryActions("compact");

  if (!settings.openEnabled || !actions) {
    els.accountOpenMenu.innerHTML = "";
    return;
  }

  els.accountOpenMenu.innerHTML = `
    <button
      class="account-entry-trigger compact"
      data-account-entry-trigger
      type="button"
      aria-expanded="${accountEntryExpanded}"
      aria-label="展开开户操作"
    >
      <span>${icon("plus")}</span>
      <b>开户</b>
      <i>${icon("chevron")}</i>
    </button>
    ${actions}
  `;
}

function renderAccountCard(account) {
  const platformServer = platformServerLabel(account);

  return `
    <article class="trade-account-card" data-kind="${escapeHtml(account.kind)}">
      <div class="account-card-head">
        <span class="account-status${account.kind === "demo" ? " demo" : ""}">${kindLabel(account)}</span>
        <span class="account-number">${escapeHtml(account.account || account.id)}</span>
        ${platformServer ? `<span class="account-environment" title="${escapeHtml(platformServer)}">${escapeHtml(platformServer)}</span>` : ""}
      </div>
      <div class="account-card-hero">
        <div>
          <span>净值(USD)</span>
          <strong>${escapeHtml(formatUsdNumber(toUsd(account.equity || account.balance)))}</strong>
        </div>
      </div>
      <div class="account-card-flat-meta" aria-label="账号概要">
        <span><small>余额</small><b>${escapeHtml(formatUsdNumber(toUsd(account.balance)))}</b></span>
        <span><small>信用金</small><b>${escapeHtml(formatUsdNumber(toUsd(account.credit || 0)))}</b></span>
        <span><small>账户类型</small><b>${escapeHtml(account.accountType)}</b></span>
        <span><small>杠杆</small><b>${escapeHtml(account.leverage)}</b></span>
        <span><small>保证金比例</small><b>${escapeHtml(account.marginRatio)}</b></span>
      </div>
    </article>
  `;
}

function renderCards(items) {
  if (!els.cardView) return;
  const settings = homeAccountSettings();

  if (settings.grouping === "separated" && settings.realEnabled && settings.demoEnabled) {
    els.cardView.classList.add("is-grouped");
    const groups = [
      { kind: "demo", label: "模拟账号", items: items.filter((account) => account.kind === "demo") },
      { kind: "real", label: "真实账号", items: items.filter((account) => account.kind === "real") },
    ].filter((group) => group.items.length);

    els.cardView.innerHTML = groups
      .map(
        (group) => `
          <section class="account-kind-group">
            <header><span>${escapeHtml(group.label)}</span><b>${group.items.length}</b></header>
            <div>${group.items.map(renderAccountCard).join("")}</div>
          </section>
        `,
      )
      .join("");
    return;
  }

  els.cardView.classList.remove("is-grouped");
  els.cardView.innerHTML = items.map(renderAccountCard).join("");
}

function renderAccountRows(items) {
  return items
    .map(
      (account) => `
        <tr>
          <td><span class="account-status${account.kind === "demo" ? " demo" : ""}">${kindLabel(account)}</span></td>
          <td><strong>${escapeHtml(account.account || account.id)}</strong></td>
          <td>${escapeHtml(platformServerLabel(account))}</td>
          <td><strong>${escapeHtml(formatUsdNumber(toUsd(account.balance)))}</strong></td>
          <td><strong>${escapeHtml(formatUsdNumber(toUsd(account.equity || account.balance)))}</strong></td>
          <td>${escapeHtml(formatUsdNumber(toUsd(account.credit || 0)))}</td>
          <td>${escapeHtml(account.accountType)}</td>
          <td>${escapeHtml(account.leverage)}</td>
          <td>${escapeHtml(account.marginRatio)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderAccountTable(items, title = "") {
  const titleMarkup = title
    ? `
      <header>
        <span>${escapeHtml(title)}</span>
        <b>${items.length}</b>
      </header>
    `
    : "";

  return `
    <section class="account-list-group">
      ${titleMarkup}
      ${renderAccountTableContent(items)}
    </section>
  `;
}

function renderAccountTableContent(items) {
  const rows = renderAccountRows(items);
  return `
    <div class="account-table-scroll">
      <table class="account-table">
        <thead>
          <tr>
            <th>账号类型</th>
            <th>账号</th>
            <th>交易环境</th>
            <th>余额</th>
            <th>净值</th>
            <th>信用金</th>
            <th>账户类型</th>
            <th>杠杆</th>
            <th>保证金比例</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderList(items) {
  if (!els.listView) return;
  const settings = homeAccountSettings();

  if (settings.grouping === "separated" && settings.realEnabled && settings.demoEnabled && activeFilter === "all") {
    els.listView.classList.add("is-grouped");
    const groups = [
      { kind: "demo", label: "模拟账号列表", items: items.filter((account) => account.kind === "demo") },
      { kind: "real", label: "真实交易账号列表", items: items.filter((account) => account.kind === "real") },
    ].filter((group) => group.items.length);

    els.listView.innerHTML = groups.map((group) => renderAccountTable(group.items, group.label)).join("");
    return;
  }

  els.listView.classList.remove("is-grouped");
  els.listView.innerHTML = `
    ${renderAccountTable(items)}
  `;
}

function renderSplitAccounts() {
  ensureSplitAccountShell();
  if (!els.splitView) return;

  const settings = homeAccountSettings();
  const realItems = accounts.filter((account) => account.kind === "real");
  const demoItems = accounts.filter((account) => account.kind === "demo");
  const realSection = els.splitView.querySelector('[data-account-section="real"]');
  const demoSection = els.splitView.querySelector('[data-account-section="demo"]');

  realSection?.setAttribute("data-account-view", settings.realViewMode);
  demoSection?.setAttribute("data-account-view", settings.demoViewMode);
  if (realSection) realSection.style.order = settings.demoFirst ? "2" : "1";
  if (demoSection) demoSection.style.order = settings.demoFirst ? "1" : "2";

  if (els.realAccountCount) els.realAccountCount.textContent = String(realItems.length);
  if (els.demoAccountCount) els.demoAccountCount.textContent = String(demoItems.length);

  if (els.realAccountCards) {
    els.realAccountCards.innerHTML = realItems.length
      ? settings.realViewMode === "list"
        ? renderAccountTableContent(realItems)
        : realItems.map(renderAccountCard).join("")
      : '<div class="account-empty-state">暂无真实交易账号</div>';
    els.realAccountCards.classList.toggle("real-account-card-grid", settings.realViewMode === "card");
  }

  if (els.demoAccountList) {
    els.demoAccountList.innerHTML = demoItems.length
      ? settings.demoViewMode === "card"
        ? `<div class="real-account-card-grid">${demoItems.map(renderAccountCard).join("")}</div>`
        : renderAccountTableContent(demoItems)
      : '<div class="account-empty-state">暂无模拟交易账号</div>';
  }

}

function bindAccountEntry() {
  document.querySelectorAll("[data-account-entry-trigger]").forEach((button) => {
    if (button.dataset.boundAccountEntryTrigger) return;
    button.dataset.boundAccountEntryTrigger = "true";
    button.addEventListener("click", () => {
      accountEntryExpanded = !accountEntryExpanded;
      renderAccounts();
    });
  });

  bindHomeActions();
}

function renderAccounts() {
  syncConfiguredState();
  const items = visibleAccounts();
  const settings = homeAccountSettings();
  const useSplitAccounts = shouldRenderSplitAccounts(settings);

  document.querySelectorAll(".account-filter").forEach((filter) => {
    filter.hidden = useSplitAccounts;
  });
  document.querySelectorAll(".view-toggle").forEach((toggle) => {
    toggle.hidden = useSplitAccounts;
  });

  els.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.accountFilter === activeFilter);
  });
  els.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewMode === activeView);
  });
  renderAccountEntryMenu();
  if (useSplitAccounts) {
    renderSplitAccounts();
  } else {
    if (els.splitView) els.splitView.hidden = true;
    renderCards(items);
    renderList(items);
  }
  bindAccountEntry();

  if (els.splitView) {
    els.splitView.hidden = !useSplitAccounts;
    els.splitView.style.display = useSplitAccounts ? "" : "none";
  }

  if (els.cardView) {
    els.cardView.hidden = useSplitAccounts || activeView !== "card";
    els.cardView.style.display = !useSplitAccounts && activeView === "card" ? "" : "none";
  }

  if (els.listView) {
    els.listView.hidden = useSplitAccounts || activeView !== "list";
    els.listView.style.display = !useSplitAccounts && activeView === "list" ? "" : "none";
  }
}

function setFilter(filter) {
  const settings = homeAccountSettings();
  if (filter === "real" && !settings.realEnabled) return;
  if (filter === "demo" && !settings.demoEnabled) return;
  activeFilter = filter;
  els.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.accountFilter === filter);
  });
  renderAccounts();
}

function setView(view) {
  const settings = homeAccountSettings();
  if (settings.viewMode !== "switchable") return;
  activeView = view;
  els.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewMode === view);
  });
  renderAccounts();
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

function markCopied(control) {
  if (!control) return;
  control.classList.add("is-copied");
  control.setAttribute("data-copy-status", "success");
  window.clearTimeout(control.copyStatusTimer);
  control.copyStatusTimer = window.setTimeout(() => {
    control.classList.remove("is-copied");
    control.removeAttribute("data-copy-status");
  }, 1400);
}

function homeActionMessage(action, element) {
  if (action === "openAccount") {
    const kind = element?.dataset?.accountEntryKind;
    if (kind === "real") return "真实账号开户入口已保留在首页";
    if (kind === "demo") return "模拟账号开户入口已保留在首页";
    return "开户入口已保留在首页";
  }

  return {
    bindAccount: "绑定账号入口已保留在首页",
    deposit: "入金入口已保留在首页",
    demoTopUp: "模拟账户入金入口已保留在首页",
    withdraw: "出金入口已保留在首页",
    transfer: "转账入口已保留在首页",
    trade: "交易入口已保留在首页",
    resetDemo: "模拟账号重置入口已保留在首页",
    transactions: "交易记录入口已保留在首页",
    orders: "订单入口已保留在首页",
    positions: "持仓入口已保留在首页",
    kyc: "KYC 入口已保留在首页",
    promo: "活动入口已保留在首页",
    referral: "推广链接入口已保留在首页",
    openReal: "开真实账号入口已保留在首页",
    openDemo: "开模拟账户入口已保留在首页",
    copytrading: "Copytrading 跟单入口已保留在首页",
    pamm: "PAMM 跟单入口已保留在首页",
    inviteFriends: "邀请好友入口已保留在首页",
    eventSignup: "活动报名入口已保留在首页",
    viewCommission: "返佣查看入口已保留在首页",
    downloadMaterial: "素材下载入口已保留在首页",
    contactService: "客服入口已保留在首页",
    downloadMt5: "MT5 下载入口已保留在首页",
    switchAccount: "切换账号入口已保留在首页",
    risk: "风险提醒入口已保留在首页",
  }[action] || "该入口已保留在首页";
}

function bindHomeActions() {
  document.querySelectorAll("[data-home-action]").forEach((control) => {
    if (control.dataset.boundHomeAction) return;
    control.dataset.boundHomeAction = "true";
    control.addEventListener("click", (event) => {
      event.preventDefault();
      showToast(homeActionMessage(control.dataset.homeAction, control));

      const target = control.getAttribute("href");
      if (target && target.startsWith("#") && target.length > 1) {
        document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function bindPageActions() {
  bindHomeActions();

  els.performanceWidgets.forEach((widget) => {
    const accountSelect = widget.querySelector("[data-performance-account-select]");
    if (accountSelect && !accountSelect.dataset.boundPerformanceAccount) {
      accountSelect.dataset.boundPerformanceAccount = "true";
      accountSelect.addEventListener("change", () => {
        activePerformanceAccountId = accountSelect.value;
        renderAccountPerformanceWidgets();
        window.HomePersonalization?.refreshCharts?.(document);
      });
    }

    const metricSelect = widget.querySelector("[data-performance-metric-select]");
    if (metricSelect && !metricSelect.dataset.boundPerformanceMetric) {
      metricSelect.dataset.boundPerformanceMetric = "true";
      metricSelect.addEventListener("change", () => {
        activePerformanceMetric = metricSelect.value === "equity" ? "equity" : "pnl";
        renderAccountPerformanceWidgets();
        window.HomePersonalization?.refreshCharts?.(document);
      });
    }
  });

  els.filterButtons.forEach((button) => {
    if (button.dataset.boundAccountFilter) return;
    button.dataset.boundAccountFilter = "true";
    button.addEventListener("click", () => setFilter(button.dataset.accountFilter));
  });

  els.viewButtons.forEach((button) => {
    if (button.dataset.boundViewMode) return;
    button.dataset.boundViewMode = "true";
    button.addEventListener("click", () => setView(button.dataset.viewMode));
  });

  document.querySelectorAll("[data-copy-value]").forEach((button) => {
    if (button.dataset.boundCopyValue) return;
    button.dataset.boundCopyValue = "true";
    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue || "";
      try {
        await navigator.clipboard.writeText(value);
        markCopied(button);
        showToast("复制成功，已保存到剪贴板");
      } catch (error) {
        showToast("复制内容：" + value);
      }
    });
  });

  document.querySelectorAll(".account-progress-card .icon-only").forEach((button) => {
    if (button.dataset.boundProgressClose) return;
    button.dataset.boundProgressClose = "true";
    button.addEventListener("click", (event) => {
      event.currentTarget.closest(".account-progress-card")?.remove();
    });
  });

  document.querySelectorAll("[data-ad-carousel]").forEach((carousel) => {
    if (carousel.dataset.boundAdCarousel) return;
    carousel.dataset.boundAdCarousel = "true";

    const slides = [...carousel.querySelectorAll("[data-ad-slide]")];
    const dots = [...carousel.querySelectorAll("[data-ad-dot]")];
    const prev = carousel.querySelector("[data-ad-prev]");
    const next = carousel.querySelector("[data-ad-next]");
    let active = slides.findIndex((slide) => slide.classList.contains("active"));
    if (active < 0) active = 0;

    const setActive = (index) => {
      if (!slides.length) return;
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle("active", slideIndex === active);
      });
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === active);
      });
    };

    prev?.addEventListener("click", () => setActive(active - 1));
    next?.addEventListener("click", () => setActive(active + 1));
    dots.forEach((dot) => {
      dot.addEventListener("click", () => setActive(Number(dot.dataset.adDot || 0)));
    });

    window.setInterval(() => {
      if (!document.body.contains(carousel)) return;
      setActive(active + 1);
    }, 4500);

    setActive(active);
  });
}

function refreshClientHome() {
  collectElements();
  syncConfiguredState();
  renderAccounts();
  renderAccountPerformanceWidgets();
  renderBalanceOverview();
  bindPageActions();
}

window.ClientHome = {
  refresh: refreshClientHome,
};

refreshClientHome();
