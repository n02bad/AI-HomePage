const accounts = [
  { id: "80010", kind: "real", balance: "12480.50", equity: "12726.40", currency: "USD", platform: "MT5", broker: "HCHoldings-Live2", type: "ECN Standard", credit: "500.00", leverage: "1:100", pnl: "+1,280.60", margin: "2,410.00", marginLevel: "528%", positions: "3", usages: ["Trade", "CopyTrading"] },
  { id: "80011", kind: "real", balance: "8250.00", equity: "8196.70", currency: "USD", platform: "MT5", broker: "HCHoldings-Live2", type: "PAMM Investor", credit: "0.00", leverage: "1:200", pnl: "-53.30", margin: "620.00", marginLevel: "1322%", positions: "1", usages: ["PAMM"] },
  { id: "90021", kind: "demo", balance: "50000.00", equity: "51280.60", currency: "USD", platform: "MT5", broker: "HCHoldings-Demo", type: "Demo ECN", credit: "0.00", leverage: "1:500", pnl: "+428.20", margin: "1,180.00", marginLevel: "4345%", positions: "5", usages: ["Practice", "Strategy Test"] },
];

const demoPracticeAccount = {
  id: "D-202605",
  balance: "100000.00",
  platform: "MT5 Web Demo",
  purpose: "新手练习 / 跟单前策略测试",
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
    demoPracticeCard: document.querySelector("[data-demo-practice-card]"),
    realAccountCount: document.querySelector("[data-real-account-count]"),
    demoAccountCount: document.querySelector("[data-demo-account-count]"),
    accountOpenMenu: document.querySelector("[data-account-open-menu]"),
    filterButtons: [...document.querySelectorAll("[data-account-filter]")],
    viewButtons: [...document.querySelectorAll("[data-view-mode]")],
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
  return account.kind === "demo" ? "模拟交易" : "真实交易";
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
          <span class="section-kicker">真实账号</span>
          <strong>真实交易账号列表</strong>
        </div>
        <div class="account-section-tools">
          <b data-real-account-count>0</b>
          <button class="account-create-button" data-home-action="openAccount" data-account-entry-kind="real" type="button">
            <span>${icon("plus")}</span>
            创建真实交易账号
          </button>
        </div>
      </header>
      <div class="real-account-card-grid" data-real-account-cards></div>
    </section>
    <section class="account-split-module account-split-module-demo" data-account-section="demo">
      <header>
        <div>
          <span class="section-kicker">模拟账号</span>
          <strong>模拟交易账号列表</strong>
        </div>
        <b data-demo-account-count>0</b>
      </header>
      <div data-demo-account-list></div>
      <div data-demo-practice-card></div>
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

function renderBalanceOverview() {
  const accountTotal = accounts
    .filter((account) => account.kind === "real")
    .reduce((sum, account) => sum + toUsd(account.balance, account.currency), 0);

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
  const usageTags = (account.usages || ["Trade"])
    .map((usage) => `<span>${escapeHtml(usage)}</span>`)
    .join("");
  const actions =
    account.kind === "demo"
      ? [
          { label: "补充模拟金", action: "demoTopUp" },
          { label: "重置", action: "resetDemo" },
          { label: "交易", action: "trade" },
        ]
      : [
          { label: "入金", action: "deposit" },
          { label: "交易", action: "trade" },
          { label: "资金划转", action: "transfer" },
        ];

  return `
    <article class="trade-account-card" data-kind="${escapeHtml(account.kind)}">
      <div class="account-card-head">
        <span class="account-status${account.kind === "demo" ? " demo" : ""}">${kindLabel(account)}</span>
        <span class="account-number">${escapeHtml(account.id)}</span>
        <button class="account-menu" type="button" aria-label="更多操作">${icon("dots")}</button>
      </div>
      <div class="account-tags">
        ${usageTags}
      </div>
      <div class="account-value-grid">
        <div>
          <span>余额(USD)</span>
          <strong>${escapeHtml(formatUsdNumber(toUsd(account.balance, account.currency)))}</strong>
        </div>
        <div>
          <span>净值(USD)</span>
          <strong>${escapeHtml(formatUsdNumber(toUsd(account.equity || account.balance, account.currency)))}</strong>
        </div>
        <div>
          <span>持仓 PnL</span>
          <strong class="${String(account.pnl || "").startsWith("-") ? "is-loss" : "is-profit"}">${escapeHtml(account.pnl || "--")}</strong>
        </div>
        <div>
          <span>保证金占用</span>
          <strong>${escapeHtml(account.margin || "--")}</strong>
        </div>
      </div>
      <div class="account-platform">
        <span class="platform-chip">${escapeHtml(account.platform)}</span>
        <span>${escapeHtml(account.broker)}</span>
      </div>
      <div class="account-meta">
        <div><span>类型</span><b>${escapeHtml(account.type)}</b></div>
        <div><span>信用金</span><b>${escapeHtml(account.credit)}</b></div>
        <div><span>杠杆</span><b>${escapeHtml(account.leverage)}</b></div>
        <div><span>持仓</span><b>${escapeHtml(account.positions || "0")}</b></div>
      </div>
      <div class="account-card-actions">
        ${actions
          .map((action) => `<button type="button" data-home-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>`)
          .join("")}
      </div>
    </article>
  `;
}

function renderDemoPracticeCard() {
  return `
    <article class="demo-practice-card">
      <div>
        <span class="section-kicker">模拟账号</span>
        <strong>${escapeHtml(demoPracticeAccount.id)}</strong>
        <p>${escapeHtml(demoPracticeAccount.purpose)}</p>
      </div>
      <div class="demo-practice-metrics">
        <span><small>模拟余额</small><b>$${escapeHtml(formatUsdNumber(demoPracticeAccount.balance))}</b></span>
        <span><small>平台</small><b>${escapeHtml(demoPracticeAccount.platform)}</b></span>
      </div>
      <div class="demo-practice-actions">
        <button type="button" data-home-action="demoTopUp">入金</button>
        <button type="button" data-home-action="resetDemo">重置</button>
        <button type="button" data-home-action="trade">交易</button>
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
          <td><strong>${escapeHtml(account.id)}</strong></td>
          <td>${escapeHtml((account.usages || ["Trade"]).join(" / "))}</td>
          <td>${escapeHtml(account.platform)}</td>
          <td>${escapeHtml(account.broker)}</td>
          <td><strong>${escapeHtml(formatUsdNumber(toUsd(account.balance, account.currency)))}</strong> USD</td>
          <td><strong class="${String(account.pnl || "").startsWith("-") ? "is-loss" : "is-profit"}">${escapeHtml(account.pnl || "--")}</strong></td>
          <td>${escapeHtml(account.margin || "--")} USD</td>
          <td>${escapeHtml(account.positions || "0")}</td>
          <td>${escapeHtml(account.type)}</td>
          <td>${escapeHtml(account.credit)}</td>
          <td>${escapeHtml(account.leverage)}</td>
          <td>
            <div class="table-actions">
              <button type="button" data-home-action="deposit">入金</button>
              <button type="button">更多</button>
            </div>
          </td>
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
            <th>分类</th>
            <th>账号</th>
            <th>用途</th>
            <th>平台</th>
            <th>服务器</th>
            <th>余额</th>
            <th>持仓 PnL</th>
            <th>保证金占用</th>
            <th>持仓</th>
            <th>账号类型</th>
            <th>信用额</th>
            <th>杠杆</th>
            <th>操作</th>
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

  if (els.demoPracticeCard) {
    els.demoPracticeCard.innerHTML = renderDemoPracticeCard();
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
        showToast("已复制");
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
  renderBalanceOverview();
  bindPageActions();
}

window.ClientHome = {
  refresh: refreshClientHome,
};

refreshClientHome();
