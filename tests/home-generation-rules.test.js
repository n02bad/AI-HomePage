const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const ALLOWED_BLOCKS = new Set([
  "welcome_header",
  "asset_overview",
  "wallet_list",
  "quick_actions",
  "onboarding_guide",
  "trading_account_highlight",
  "trading_accounts_list",
  "promo_banner",
  "pamm_products",
  "copytrading_signals",
  "referral_link_card",
  "announcements",
  "market_news",
  "risk_disclosure",
  "faq_section",
  "support_contact",
  "app_download",
]);
const FORBIDDEN_BLOCKS = new Set([
  "reward_tasks",
  "kyc_risk_notice",
  "ib_dashboard",
  "support_help",
  "referralLink",
  "referral_link",
  "userKycRail",
  "user_kyc_rail",
  "riskNotice",
  "risk_notice",
]);
const CORE_MORPH_MODULES = [
  "AssetOverview",
  "WalletList",
  "QuickActions",
  "TradingAccounts",
  "OnboardingProgress",
  "AccountPerformance",
  "PromotionBanner",
  "ReferralLinkCard",
  "RiskDisclosure",
];
const BLOCK_TO_MORPH_MODULE = {
  asset_overview: "AssetOverview",
  wallet_list: "WalletList",
  quick_actions: "QuickActions",
  onboarding_guide: "OnboardingProgress",
  trading_account_highlight: "AccountPerformance",
  trading_accounts_list: "TradingAccounts",
  promo_banner: "PromotionBanner",
  referral_link_card: "ReferralLinkCard",
  risk_disclosure: "RiskDisclosure",
};

function loadHomeEngine() {
  const code = fs.readFileSync(path.join(ROOT, "home-personalization.js"), "utf8");
  const document = {
    readyState: "complete",
    addEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    body: { dataset: {} },
    documentElement: { dataset: {} },
  };
  const sandbox = {
    console,
    document,
    window: {
      document,
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {},
        removeItem() {},
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.HomePersonalization;
}

function collectBlocks(config) {
  return [
    ...(config.sections || []).flatMap((section) => section.slots || []),
    ...(config.layout || []).map((block) => block.component),
    ...(config.brickPlan || []).flatMap((brick) => [brick.feature, brick.component]),
  ].filter(Boolean);
}

function assertOnlyAllowedBlocks(config) {
  const blocks = collectBlocks(config);
  assert(blocks.length > 0, "expected homepage blocks");
  for (const block of blocks) {
    assert(!FORBIDDEN_BLOCKS.has(block), `forbidden block leaked: ${block}`);
    assert(ALLOWED_BLOCKS.has(block), `non-canonical block leaked: ${block}`);
  }
}

function hasBlock(config, blockId) {
  return collectBlocks(config).includes(blockId);
}

function sectionForSlot(config, blockId) {
  return (config.sections || []).find((section) => Array.isArray(section.slots) && section.slots.includes(blockId));
}

function brickForComponent(config, blockId) {
  return (config.brickPlan || []).find((brick) => brick.component === blockId || brick.feature === blockId);
}

function visibleCoreMorphModules(config) {
  return [...new Set(collectBlocks(config).map((block) => BLOCK_TO_MORPH_MODULE[block]).filter(Boolean))];
}

function assertCoreMorphRegistry(home) {
  assert(home.COMPONENT_MORPH_REGISTRY, "component morph registry must be exported");
  CORE_MORPH_MODULES.forEach((moduleId) => {
    const morphs = home.COMPONENT_MORPH_REGISTRY[moduleId];
    assert(Array.isArray(morphs), `${moduleId} morph pool must be an array`);
    assert(morphs.length >= 10, `${moduleId} must expose at least 10 DOM morphs`);
    assert.strictEqual(new Set(morphs.map((item) => item.id)).size, morphs.length, `${moduleId} morph ids must be unique`);
  });
}

function assertVisibleModulesHaveMorph(config) {
  const morphs = config.componentMorphs || {};
  visibleCoreMorphModules(config).forEach((moduleId) => {
    assert(morphs[moduleId], `${moduleId} must include componentMorphs contract`);
    assert(morphs[moduleId].morph || morphs[moduleId].morphId, `${moduleId} must include morph/morphId`);
  });
}

function postJson(port, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/home-ai/complete",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function waitForServer(child, port) {
  const started = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timed out")), 8000);
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes(`127.0.0.1:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    child.on("exit", (code) => {
      reject(new Error(`server exited before start: ${code}`));
    });
  });
  await started;
}

async function run() {
  const home = loadHomeEngine();
  const homeSource = fs.readFileSync(path.join(ROOT, "home-personalization.js"), "utf8");
  const clientSourceForTitles = fs.readFileSync(path.join(ROOT, "client-home.js"), "utf8");

  assertCoreMorphRegistry(home);
  assertOnlyAllowedBlocks(home.DEFAULT_CONFIG);
  assertVisibleModulesHaveMorph(home.DEFAULT_CONFIG);
  assert.strictEqual(hasBlock(home.DEFAULT_CONFIG, "referral_link_card"), false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(home.DEFAULT_CONFIG.moduleSettings.quickActions.actions)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(home.DEFAULT_CONFIG.moduleSettings.assets.visibleFields)), ["total", "wallet", "tradingAccount"]);
  assert.strictEqual(home.DEFAULT_CONFIG.moduleSettings.referralLinkCard.enabled, false);
  assert.strictEqual(home.t("home.asset.title"), "资产概览");
  assert.strictEqual(home.t("home.asset.totalLabel"), "余额合计");

  const normalizedAiHtml = home.normalizeConfig({
    schemaVersion: 4,
    renderMode: "aiHtml",
    htmlScheme: {
      enabled: true,
      name: "Admin HTML Draft",
      html: '<section onclick="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">入金</a></section>',
      css: '@import "https://example.com/a.css"; .hero{position:fixed;background:url(javascript:alert(1));color:red}',
	      generationPipeline: "free-html-first",
	      correctionStatus: "sanitized-and-corrected",
		      sourceType: "model/free-html",
		      isFallback: false,
		      mock: false,
		      modelAttempted: true,
	      correctionNotes: ["补齐动作"],
	      requiredModules: ["资产概览", "交易账号"],
	      moduleMapping: { 资产概览: "首屏主金额区域", 交易账号: "账号卡片列表" },
	      implementationContract: [
	        {
	          module: "asset_overview",
	          label: "资产概览",
	          family: "AssetOverview",
	          dataFields: ["totalAssets", "walletBalance"],
	          states: ["normal"],
	          actions: ["deposit"],
	          interactions: ["主金额区接入入金动作"],
	          renderEvidence: ["首屏主金额和钱包余额可见"],
	        },
	      ],
	      componentReferences: [{ componentId: "asset-overview-vip-hero", family: "AssetOverview", module: "asset_overview", reason: "参考主金额层级" }],
	      designNotes: ["保留自由 HTML，但参考组件库。"],
	      qualityScore: 88,
	      qualityStatus: "passed",
	      qualityIssues: [],
	      aestheticChecks: ["使用首页主题 token。"],
	    },
	  });
  assert.strictEqual(normalizedAiHtml.renderMode, "aiHtml");
  assert.strictEqual(normalizedAiHtml.activeRenderMode, "aiHtml");
  assert.strictEqual(normalizedAiHtml.htmlScheme.enabled, true);
  assert(!normalizedAiHtml.htmlScheme.html.includes("<script"), "AI HTML scheme must strip script tags");
  assert(!normalizedAiHtml.htmlScheme.html.includes("onclick"), "AI HTML scheme must strip inline event handlers");
  assert(!normalizedAiHtml.htmlScheme.html.includes("javascript:"), "AI HTML scheme must strip javascript links");
  assert(!normalizedAiHtml.htmlScheme.css.includes("@import"), "AI HTML CSS must strip imports");
  assert(!normalizedAiHtml.htmlScheme.css.includes("position:fixed"), "AI HTML CSS must strip fixed positioning");
  assert.strictEqual(normalizedAiHtml.htmlScheme.generationPipeline, "free-html-first");
	  assert.strictEqual(normalizedAiHtml.htmlScheme.correctionStatus, "sanitized-and-corrected");
		  assert.strictEqual(normalizedAiHtml.htmlScheme.sourceType, "model/free-html");
		  assert.strictEqual(normalizedAiHtml.htmlScheme.isFallback, false);
		  assert.strictEqual(normalizedAiHtml.htmlScheme.mock, false);
		  assert.strictEqual(normalizedAiHtml.htmlScheme.modelAttempted, true);
	  assert.deepStrictEqual(normalizedAiHtml.htmlScheme.correctionNotes, ["补齐动作"]);
	  assert.deepStrictEqual(normalizedAiHtml.htmlScheme.requiredModules, ["资产概览", "交易账号"]);
	  assert.strictEqual(normalizedAiHtml.htmlScheme.moduleMapping["资产概览"], "首屏主金额区域");
	  assert.strictEqual(normalizedAiHtml.htmlScheme.implementationContract[0].module, "asset_overview");
	  assert.deepStrictEqual(normalizedAiHtml.htmlScheme.implementationContract[0].dataFields, ["totalAssets", "walletBalance"]);
	  assert.strictEqual(normalizedAiHtml.htmlScheme.componentReferences[0].componentId, "asset-overview-vip-hero");
	  assert.deepStrictEqual(normalizedAiHtml.htmlScheme.designNotes, ["保留自由 HTML，但参考组件库。"]);
	  assert.strictEqual(normalizedAiHtml.htmlScheme.qualityScore, 88);
	  assert.strictEqual(normalizedAiHtml.htmlScheme.qualityStatus, "passed");
	  assert.deepStrictEqual(normalizedAiHtml.htmlScheme.aestheticChecks, ["使用首页主题 token。"]);

  const normalizedAssetTriplet = home.normalizeConfig({
    schemaVersion: 4,
    moduleSettings: {
      assets: { visibleFields: ["total", "tradingAccount"] },
    },
  });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalizedAssetTriplet.moduleSettings.assets.visibleFields)), ["total", "wallet", "tradingAccount"]);

  const normalizedLargeRows = home.normalizeConfig({
    schemaVersion: 4,
    sections: [
      { id: "dense-accounts", type: "full", title: "账号与表现", slots: ["trading_account_highlight", "trading_accounts_list"] },
    ],
    moduleSettings: {
      tradingAccounts: { enabled: true },
    },
  });
  assert.strictEqual(sectionForSlot(normalizedLargeRows, "trading_account_highlight").type, "full");
  assert.strictEqual(sectionForSlot(normalizedLargeRows, "trading_accounts_list").type, "full");
  assert.notStrictEqual(sectionForSlot(normalizedLargeRows, "trading_account_highlight").id, sectionForSlot(normalizedLargeRows, "trading_accounts_list").id);
  assert.strictEqual(normalizedLargeRows.layout.find((block) => block.component === "trading_account_highlight").slot, "full");
  assert.strictEqual(normalizedLargeRows.layout.find((block) => block.component === "trading_accounts_list").slot, "full");

  const normalized = home.normalizeConfig({
    schemaVersion: 4,
    sections: [
      {
        id: "legacy",
        type: "hero",
        slots: ["balanceTotal", "fundActions", "referralLink", "riskNotice", "pamm_products", "copytrading_signals"],
      },
    ],
    moduleSettings: {
      assets: { visibleFields: ["wallet"] },
      quickActions: { enabled: true, count: 5, actions: ["deposit", "contactService"] },
      referral: { enabled: true },
      riskNotice: { enabled: true },
      pamm: { enabled: true },
      copytrading: { enabled: true },
    },
  });
  assertOnlyAllowedBlocks(normalized);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.moduleSettings.quickActions.actions)), []);
  assert.strictEqual(normalized.moduleSettings.referral.enabled, false);
  assert.strictEqual(normalized.moduleSettings.referralLinkCard.enabled, false);
  assert.strictEqual(normalized.moduleSettings.riskNotice.enabled, false);
  assert.strictEqual(normalized.moduleSettings.riskDisclosure.enabled, true);
  assert.strictEqual(hasBlock(normalized, "risk_disclosure"), true);
  assert.strictEqual(normalized.moduleStyles.risk_disclosure, "legal-strip");
  assert.strictEqual(normalized.sections.at(-1).slots.includes("risk_disclosure"), true);
  assert.strictEqual(normalized.layout.find((block) => block.component === "risk_disclosure").slot, "full");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.moduleSettings.assets.visibleFields)), ["wallet"]);

  const guidedModules = home.normalizeConfig({
    schemaVersion: 4,
    sections: [
      {
        id: "guided-extra",
        type: "split",
        slots: ["risk_disclosure", "faq_section", "support_contact", "app_download"],
      },
    ],
    moduleSettings: {
      riskDisclosure: { enabled: true },
      faq: { enabled: true },
      supportContact: { enabled: true },
      appDownload: { enabled: true },
    },
  });
  assertOnlyAllowedBlocks(guidedModules);
  assert.strictEqual(hasBlock(guidedModules, "risk_disclosure"), true);
  assert.strictEqual(hasBlock(guidedModules, "faq_section"), true);
  assert.strictEqual(hasBlock(guidedModules, "support_contact"), true);
  assert.strictEqual(hasBlock(guidedModules, "app_download"), true);
  assert.strictEqual(guidedModules.moduleStyles.risk_disclosure, "legal-strip");
  assert.strictEqual(guidedModules.sections.at(-1).slots.includes("risk_disclosure"), true);

  const guidedStaleLayout = home.normalizeConfig({
    schemaVersion: 4,
    blueprintVersion: 5,
    generationMode: "brick-v2",
    sections: [
      { id: "guided-welcome", type: "hero", slots: ["welcome_header"] },
      { id: "guided-hero", type: "split", slots: ["copytrading_signals", "onboarding_guide"] },
      { id: "guided-products", type: "split", slots: ["pamm_products", "quick_actions"] },
      { id: "guided-accounts", type: "full", slots: ["trading_accounts_list"] },
      { id: "guided-risk", type: "full", slots: ["risk_disclosure"] },
    ],
    layout: [
      { id: "welcome-header", component: "welcome_header", slot: "hero", priority: 0 },
      { id: "risk-disclosure-footer", component: "risk_disclosure", slot: "full", priority: 100 },
    ],
    moduleSettings: {
      quickActions: { enabled: true, count: 5 },
      pamm: { enabled: true },
      copytrading: { enabled: true },
      riskDisclosure: { enabled: true },
    },
  });
  assertOnlyAllowedBlocks(guidedStaleLayout);
  assert.strictEqual(hasBlock(guidedStaleLayout, "copytrading_signals"), true);
  assert.strictEqual(hasBlock(guidedStaleLayout, "pamm_products"), true);
  assert.strictEqual(hasBlock(guidedStaleLayout, "quick_actions"), true);
  assert.strictEqual(hasBlock(guidedStaleLayout, "trading_accounts_list"), true);
  assert(guidedStaleLayout.layout.some((block) => block.component === "copytrading_signals"), "stale explicit layout must not hide guided sections");

  const localOrdinary = home.promptToConfig("普通客户首页，展示资产概览、快捷入口和交易账号列表，不要代理数据、KYC 风控或客服帮助。");
  assertOnlyAllowedBlocks(localOrdinary);
  assert.strictEqual(hasBlock(localOrdinary, "referral_link_card"), false);
  assert.strictEqual(localOrdinary.moduleSettings.referralLinkCard.enabled, false);
  assert.strictEqual(localOrdinary.moduleSettings.tradingAccounts.viewMode, "list");

  const flexibleAccounts = home.promptToConfig("交易账号模块要灵活变化，卡片列表都支持，不要总是卡片。");
  assertOnlyAllowedBlocks(flexibleAccounts);
  assert(["workbench", "calm-table", "account-wall", "ops-table"].includes(flexibleAccounts.moduleStyles.tradingAccounts));

  const localReferral = home.promptToConfig("IB 代理用户首页，只展示推广链接、邀请码和复制按钮，不展示统计、返佣、团队层级或完整代理数据。");
  assertOnlyAllowedBlocks(localReferral);
  assert.strictEqual(hasBlock(localReferral, "referral_link_card"), true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.enabled, true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.showPromoLink, true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.showInviteCode, true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.showStats, false);

  const localAnnouncementTicker = home.promptToConfig("首页第一栏展示跑马灯公告，滚动系统公告、活动公告和维护通知，交易账号列表放下方。");
  assertOnlyAllowedBlocks(localAnnouncementTicker);
  assert.strictEqual(hasBlock(localAnnouncementTicker, "announcements"), true);
  assert.strictEqual(localAnnouncementTicker.moduleSettings.announcements.enabled, true);
  assert.strictEqual(localAnnouncementTicker.moduleStyles.announcements, "ticker-strip");
  assert.strictEqual(localAnnouncementTicker.sections[0].slots.includes("announcements"), true);

  const targetPrompt =
    "新用户开户引导、真实交易账号卡片、模拟账号卡片、Copytrading推荐：要显示信号源名字、收益率、总收益、还有收益率的曲线。、5个快捷入口。淡蓝色扁平化。圆角10，字体pingfangsc。";
  const localCopytrading = home.promptToConfig(targetPrompt);
  assertOnlyAllowedBlocks(localCopytrading);
  assert.strictEqual(localCopytrading.layoutPreset, "onboardingJourney");
  assert.strictEqual(localCopytrading.themePreset, "blueFinance");
  assert.strictEqual(localCopytrading.heroFocus, "copytrading_signals");
  assert.strictEqual(localCopytrading.moduleSettings.quickActions.count, 5);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(localCopytrading.moduleSettings.quickActions.actions)), []);
  assert.strictEqual(localCopytrading.moduleSettings.copytrading.enabled, true);
  assert.strictEqual(localCopytrading.moduleSettings.tradingAccounts.grouping, "separated");
  assert.strictEqual(localCopytrading.moduleSettings.tradingAccounts.realViewMode, "card");
  assert.strictEqual(localCopytrading.moduleSettings.tradingAccounts.demoViewMode, "card");
  assert.strictEqual(localCopytrading.moduleStyles.copytrading_signals, "curve-cards");
  assert.strictEqual(hasBlock(localCopytrading, "copytrading_signals"), true);
	  assert.strictEqual(home.t("home.copytrading.eyebrow"), "");
	  assert.strictEqual(home.t("home.onboarding.eyebrow"), "");
	  assert.strictEqual(home.t("home.copytrading.title"), "适合新手的信号源");

		  const localOnboardingThreeStep = home.promptToConfig("新用户 Onboarding：KYC、创建真实账户、首次入金三步旅程，做成开户进度首页。");
		  assert.strictEqual(localOnboardingThreeStep.brickTrace.intent, "onboarding");
		  assert.strictEqual(localOnboardingThreeStep.pageIntent.primaryIntent, "onboarding");
		  assert.strictEqual(localOnboardingThreeStep.layoutPreset, "onboardingJourney");
		  assert.strictEqual(localOnboardingThreeStep.brickPlan.some((brick) => brick.brickId === "promoBanner.depositLadder"), false);

		  const localOpeningWithTradingTerms = home.promptToConfig(
		    "开户引导首页，目标是推动真实账户开户、KYC、首次入金准备；必须包含交易账号列表、真实账号、模拟账号和 MT5 下载入口，但主 CTA 是立即开户。",
		  );
		  assert.strictEqual(localOpeningWithTradingTerms.pageIntent.primaryIntent, "onboarding");
		  assert.strictEqual(localOpeningWithTradingTerms.brickTrace.intent, "onboarding");
		  assert.notStrictEqual(localOpeningWithTradingTerms.layoutPreset, "tradingCommand");
		  assert.strictEqual(hasBlock(localOpeningWithTradingTerms, "onboarding_guide"), true);

	  assert.strictEqual(homeSource.includes("showEyebrow"), false);
  assert.strictEqual(homeSource.includes('class="section-kicker">真实账号'), false);
  assert.strictEqual(homeSource.includes('class="section-kicker">模拟账号'), false);
  assert.strictEqual(clientSourceForTitles.includes('class="section-kicker">真实账号'), false);
  assert.strictEqual(clientSourceForTitles.includes('class="section-kicker">模拟账号'), false);

  const proTraderCostPrompt =
    "独立生成目标：专业交易客户首页，突出交易成本和执行效率：EURUSD 点差 0.2 起、佣金 $7/手、持仓 PnL、保证金占用、MT5 快捷操作；真实账号和模拟账号分开，整体像专业交易工作台。保留这些价格、金额和指标作为页面内容，整体要明显区别于默认首页。不沿用上一版模块顺序和布局骨架。本轮推荐编号 pro-trader-cost-3-1，避免重复上一轮方案。";
  const localProTraderCost = home.promptToConfig(proTraderCostPrompt);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(localProTraderCost.validationErrors)), []);
  assertOnlyAllowedBlocks(localProTraderCost);
  assertVisibleModulesHaveMorph(localProTraderCost);
  assert.strictEqual(localProTraderCost.name, "AI pro-trader-cost-3-1");
  assert.strictEqual(localProTraderCost.layoutPreset, "tradingCommand");
  assert.strictEqual(localProTraderCost.themePreset, "darkTech");
  assert.strictEqual(localProTraderCost.heroFocus, "trading_account_highlight");
  assert.strictEqual(localProTraderCost.moduleStyles.accountPerformance, "cost-board");
  assert.strictEqual(localProTraderCost.moduleStyles.quickActions, "command-bar");
  assert.strictEqual(localProTraderCost.moduleSettings.tradingAccounts.grouping, "separated");
  assert.strictEqual(localProTraderCost.moduleSettings.tradingAccounts.realViewMode, "list");
  assert.strictEqual(localProTraderCost.moduleSettings.tradingAccounts.demoViewMode, "list");
  assert.strictEqual(localProTraderCost.moduleSettings.copytrading.enabled, false);
  assert.strictEqual(hasBlock(localProTraderCost, "copytrading_signals"), false);
  assert.strictEqual(hasBlock(localProTraderCost, "onboarding_guide"), false);
  assert.strictEqual(hasBlock(localProTraderCost, "trading_account_highlight"), true);
  assert.strictEqual(hasBlock(localProTraderCost, "quick_actions"), true);

  const professionalTraderWorkbenchPrompt =
    "请生成一个专业交易客户首页，首屏突出交易账号状态、账户表现图表、持仓入口和 MT5 操作入口；所有交易成本、PnL、保证金和图表数据都必须来自接口，缺失时用占位，不要写死具体数值。交易账号要用卡片的方案，并且真实账号、模拟账号要在一起。让首屏、操作区和账号区有清晰层级；真实数值必须来自后台或接口。推荐编号 professional-trader-workbench-prompt-1-0，生成页面时需避免重复上一版模块顺序和布局骨架。需要补充FAQ的模块，要简约大气。希望是商务风的淡蓝色的色调。";
  const localProfessionalTrader = home.promptToConfig(professionalTraderWorkbenchPrompt);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(localProfessionalTrader.validationErrors)), []);
  assertOnlyAllowedBlocks(localProfessionalTrader);
  assertVisibleModulesHaveMorph(localProfessionalTrader);
  assert.strictEqual(localProfessionalTrader.name, "AI professional-trader-workb");
  assert.strictEqual(localProfessionalTrader.layoutPreset, "tradingCommand");
  assert.strictEqual(localProfessionalTrader.themePreset, "blueFinance");
  assert.notStrictEqual(localProfessionalTrader.themePreset, "darkTech");
  assert.strictEqual(localProfessionalTrader.heroFocus, "trading_accounts_list");
  assert.strictEqual(localProfessionalTrader.moduleStyles.accountPerformance, "pro-chart");
  assert.notStrictEqual(localProfessionalTrader.moduleStyles.accountPerformance, "cost-board");
  assert.strictEqual(localProfessionalTrader.moduleStyles.tradingAccounts, "account-wall");
  assert.strictEqual(localProfessionalTrader.moduleSettings.tradingAccounts.grouping, "combined");
  assert.strictEqual(localProfessionalTrader.moduleSettings.tradingAccounts.viewMode, "card");
  assert.strictEqual(localProfessionalTrader.moduleSettings.tradingAccounts.realViewMode, "card");
  assert.strictEqual(localProfessionalTrader.moduleSettings.tradingAccounts.demoViewMode, "card");
  assert.strictEqual(hasBlock(localProfessionalTrader, "trading_accounts_list"), true);
  assert.strictEqual(hasBlock(localProfessionalTrader, "trading_account_highlight"), true);
  assert.strictEqual(hasBlock(localProfessionalTrader, "quick_actions"), true);
  assert.strictEqual(hasBlock(localProfessionalTrader, "faq_section"), true);
  assert.strictEqual(hasBlock(localProfessionalTrader, "asset_overview"), false);
  assert.strictEqual(localProfessionalTrader.moduleSettings.faq.enabled, true);
  assert(["accordion", "compact-list"].includes(localProfessionalTrader.moduleStyles.faq_section));
	  assert.strictEqual(localProfessionalTrader.dataContract.previewSample, true);
	  assert.strictEqual(localProfessionalTrader.dataContract.dataBindingRequired, true);
	  assert.strictEqual(localProfessionalTrader.dataContract.fields.tradingAccounts.binding, "api.trading.accounts");
	  assert.deepStrictEqual(Array.from(localProfessionalTrader.dataContract.fields.tradingAccounts.allowedFields), ["accountKind", "platform", "server", "account", "balance", "equity", "credit", "accountType", "leverage", "marginRatio"]);
	  assert(localProfessionalTrader.dataContract.fields.tradingAccounts.forbiddenFields.includes("pnl"));
	  assert.strictEqual(localProfessionalTrader.dataContract.fields.tradingCost.dataBindingRequired, true);
  assert.strictEqual(localProfessionalTrader.dataContract.fields.pnl.fallback, "--");
  assert.strictEqual(localProfessionalTrader.dataContract.fields.margin.previewSample, true);
  assert.strictEqual(localProfessionalTrader.dataContract.fields.charts.binding, "api.trading.performanceSeries");
  assert.strictEqual(localProfessionalTrader.brickPlan.some((brick) => String(brick.brickId).includes("costBoard")), false);
  assert.strictEqual(sectionForSlot(localProfessionalTrader, "trading_accounts_list").type, "full");
  assert.strictEqual(sectionForSlot(localProfessionalTrader, "trading_account_highlight").type, "full");
  assert.notStrictEqual(sectionForSlot(localProfessionalTrader, "trading_accounts_list").id, sectionForSlot(localProfessionalTrader, "trading_account_highlight").id);
  assert.strictEqual(localProfessionalTrader.layout.find((block) => block.component === "trading_accounts_list").slot, "full");
  assert.strictEqual(localProfessionalTrader.layout.find((block) => block.component === "trading_account_highlight").slot, "full");
  assert.strictEqual(brickForComponent(localProfessionalTrader, "trading_account_highlight").size, "3x2");
  assert.strictEqual(brickForComponent(localProfessionalTrader, "trading_account_highlight").zone, "full");
  const localProfessionalChecks = Object.fromEntries((localProfessionalTrader.pageGovernance?.checks || []).map((item) => [item.id, item.passed]));
  assert.strictEqual(localProfessionalChecks["professional-theme"], true);
  assert.strictEqual(localProfessionalChecks["combined-card-accounts"], true);
  assert.strictEqual(localProfessionalChecks["no-cost-board"], true);
  assert.strictEqual(localProfessionalChecks["data-contract"], true);

  const localMinimalLightTrader = home.promptToConfig(
    "极简的淡色风格，生成专业交易客户首页，首屏展示交易账号状态、账户表现图表和快捷入口，要考虑白天模式跟暗夜模式。",
  );
  assertOnlyAllowedBlocks(localMinimalLightTrader);
  assertVisibleModulesHaveMorph(localMinimalLightTrader);
  assert.strictEqual(localMinimalLightTrader.layoutPreset, "tradingCommand");
  assert.strictEqual(localMinimalLightTrader.themePreset, "minimalWhite");
  assert.notStrictEqual(localMinimalLightTrader.themePreset, "darkTech");
  assert.strictEqual(localMinimalLightTrader.colorMode, "auto");

  const accountPerformancePrompt =
    "账号表现模块要展示 7日 或 30日 的账号净值和持仓 PnL 折线图，交易账号卡片不要乱摆指标，真实账号和模拟账号用列表。";
  const localAccountPerformance = home.promptToConfig(accountPerformancePrompt);
  assertOnlyAllowedBlocks(localAccountPerformance);
  assertVisibleModulesHaveMorph(localAccountPerformance);
  assert.strictEqual(hasBlock(localAccountPerformance, "trading_account_highlight"), true);
  assert.strictEqual(sectionForSlot(localAccountPerformance, "trading_account_highlight").type, "full");
  assert.strictEqual(localAccountPerformance.layout.find((block) => block.component === "trading_account_highlight").slot, "full");
  assert.strictEqual(localAccountPerformance.moduleStyles.accountPerformance, "pro-chart");
  assert(["calm-table", "ops-table"].includes(localAccountPerformance.moduleStyles.tradingAccounts));
  assert.strictEqual(localAccountPerformance.moduleSettings.tradingAccounts.grouping, "separated");
  assert.strictEqual(localAccountPerformance.moduleSettings.tradingAccounts.viewMode, "list");

  const flatAccountPrompt =
    "账号表现的数据指标排版需要更简洁扁平，不要模块内还有好多模块；交易账号卡片排版做视觉优化，单个小卡片里面模块太多、重点太多。";
  const localFlatAccounts = home.promptToConfig(flatAccountPrompt);
  assertOnlyAllowedBlocks(localFlatAccounts);
  assertVisibleModulesHaveMorph(localFlatAccounts);
  assert.strictEqual(localFlatAccounts.moduleStyles.accountPerformance, "pro-chart");
  assert.strictEqual(localFlatAccounts.moduleStyles.tradingAccounts, "calm-table");
  assert.strictEqual(localFlatAccounts.moduleSettings.tradingAccounts.viewMode, "list");
  assert.strictEqual(localFlatAccounts.moduleSettings.tradingAccounts.realViewMode, "list");
  assert.strictEqual(localFlatAccounts.moduleSettings.tradingAccounts.demoViewMode, "list");

  const compactOnboardingPrompt = "开户引导首页，样式需要优化，大面积空白区域是可以舍去的，注意空间利用。";
  const localCompactOnboarding = home.promptToConfig(compactOnboardingPrompt);
  assertOnlyAllowedBlocks(localCompactOnboarding);
  assertVisibleModulesHaveMorph(localCompactOnboarding);
  assert.strictEqual(localCompactOnboarding.density, "compact");
  assert.strictEqual(localCompactOnboarding.moduleStyles.onboardingProgress, "compact");

  const personalizationSource = fs.readFileSync(path.join(ROOT, "home-personalization.js"), "utf8");
  assert(!personalizationSource.includes('<i style="height: 34%"'), "account performance must not render decorative bar placeholders");
  assert(personalizationSource.includes("ECHARTS_RUNTIME_URL"), "generated statistical charts must load an ECharts runtime");
  assert(personalizationSource.includes("data-home-echart"), "account performance renderer must output an ECharts chart container");
  assert(personalizationSource.includes('data-chart-kind="recommendation-curve"'), "recommendation trend charts must also use ECharts containers");
  assert(personalizationSource.includes("chartDateLabels"), "trend chart x axes must use date labels");
  assert(!personalizationSource.includes("<span>D1</span>"), "trend chart visible labels must not use D1/D7 placeholders");
  assert(personalizationSource.includes('data-chart-axis-mode="xy"'), "analytical account charts must support an XY axis mode");
  assert(personalizationSource.includes('data-chart-axis-mode="minimal"'), "recommendation charts must support a minimal axis mode");
	  assert(personalizationSource.includes("ai-performance-summary"), "account performance should use a flat account summary");
	  assert(personalizationSource.includes("ai-chart-insights"), "account performance charts must reserve the lower chart area for compact trend insights");
  assert(personalizationSource.includes("ai-support-bar"), "support contact must render as a compact service bar");
	  assert(personalizationSource.includes("ai-balance-metric-row"), "asset overview should render multi-field balances in one metric row");
	  assert(!personalizationSource.includes("ai-performance-ledger"), "account performance must not nest balance/equity ledger cards");
  assert(personalizationSource.includes("wantsTradingAccountSingleViewCorrection"), "account-card problem prompts must route TradingAccounts to one primary view");
  const clientHomeSource = fs.readFileSync(path.join(ROOT, "client-home.js"), "utf8");
  assert(clientHomeSource.includes("account-card-flat-meta"), "trading account cards must use a flat metadata strip");
  assert(!clientHomeSource.includes("account-value-grid"), "trading account cards must not render a nested metric grid");
  const personalizationCss = fs.readFileSync(path.join(ROOT, "home-personalization.css"), "utf8");
  assert(personalizationCss.includes(".ai-accounts-feature .accounts-list-view[hidden]"), "inactive account view must stay hidden in AI preview CSS");
  const serverSource = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
  assert(serverSource.includes("空间利用是硬约束"), "AI prompt must treat space utilization as a hard constraint");
  assert(serverSource.includes("同一组账号数据不得在同一个模块里同时渲染上方摘要卡/摘要行和下方列表/表格"), "AI prompt must forbid duplicate account card plus table views");
  assert(serverSource.includes("账号类型(accountKind=Live/Demo)和账户类型(accountType=ECN Standard/Demo ECN)"), "AI prompt must distinguish account kind and account type");
  const componentLibrary = JSON.parse(fs.readFileSync(path.join(ROOT, "home-component-library.json"), "utf8"));
  const tradingAccountsBrick = componentLibrary.components.find((component) => component.id === "trading-accounts-separated-list");
  assert(tradingAccountsBrick.sourcePrompt.includes("不能上方摘要卡片下方再重复完整表格"), "TradingAccounts library contract must forbid duplicate summary/table views");
  assert(serverSource.includes("const MINIMAX_MAX_COMPLETION_TOKENS = 2048"), "MiniMax should keep the documented OpenAI-compatible completion token cap");
  assert(serverSource.includes('const KIMI_DEFAULT_MODEL = "kimi-k2.6"'), "Kimi preset should use the current default model");
  assert(serverSource.includes('const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1"'), "Kimi should default to the China API domain");
  assert(serverSource.includes("body.max_completion_tokens = config.maxOutputTokens"), "Kimi chat requests should use max_completion_tokens instead of deprecated max_tokens");
  assert(serverSource.includes("function isKimiFixedTemperatureModel"), "Kimi K2.6/K2.5 requests should use model-specific fixed parameters");
  assert(serverSource.includes('body.thinking = { type: "disabled" }'), "Kimi K2.6/K2.5 JSON requests should disable thinking to avoid homepage generation timeouts");
  assert(serverSource.includes("return isKimiFixedTemperatureModel(model) ? 0.6 : 1"), "Kimi K2.6/K2.5 non-thinking requests should force temperature 0.6");
  assert(!serverSource.includes('["minimax", "kimi"].includes(config.provider) ? Math.min(config.temperature, 0.6)'), "Kimi structured JSON requests must not be clamped below its required temperature");
	  assert(serverSource.includes("buildLowLatencyHomepagePrompt"), "MiniMax and Kimi should use a short homepage prompt to avoid provider timeouts");
	  assert(serverSource.includes("质量门禁"), "AI HTML generation must include an aesthetic quality gate");
	  assert(serverSource.includes("componentReferenceHints"), "AI HTML generation must use component-library reference hints");
	  assert(serverSource.includes("implementationContract"), "AI HTML generation must require per-module implementation contracts");
	  assert(serverSource.includes("无法证明 AI HTML 不是静态外观空壳"), "AI HTML quality gate must reject static shell drafts");
	  assert(serverSource.includes("质量返修得分"), "AI HTML quality repair must not replace a higher-scoring free HTML draft");
	  assert(serverSource.includes("aiHtmlResponsiveFallbackCss"), "AI HTML repair must add a responsive fallback when the model omits media rules");
	  assert(!/\.ai-copy-signal-metrics span\s*\{[\s\S]{0,220}border-left:\s*1px/.test(personalizationCss), "recommendation metric rows should not be divided by heavy vertical lines");
  assert(!/\.ai-copy-curve\s*\{[\s\S]{0,260}repeating-linear-gradient/.test(personalizationCss), "recommendation charts should not default to dense grid backgrounds");
  assert(/\.ai-guide-card\s*\{[\s\S]{0,220}min-height:\s*96px/.test(personalizationCss), "onboarding guide cards should avoid tall empty cards");
  const accountPerformanceBrick = componentLibrary.components.find((component) => component.id === "account-performance-pro-chart");
  assert(accountPerformanceBrick.html.includes("data-home-echart"), "account performance demo must use an ECharts chart container");
  assert(accountPerformanceBrick.html.includes('data-chart-axis-mode="xy"'), "account performance demo must declare chart axis mode");
  assert(accountPerformanceBrick.html.includes("05/05") && accountPerformanceBrick.html.includes("05/11"), "account performance demo must use date labels");
  assert(accountPerformanceBrick.tags.includes("echarts"), "account performance brick must be tagged as an ECharts chart");
  assert(accountPerformanceBrick.html.includes("7D") && accountPerformanceBrick.html.includes("30D"), "account performance demo must include 7D/30D semantics");

  const port = 5197;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOME_AI_MOCK: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServer(child, port);
    const response = await postJson(port, {
      prompt:
        "生成首页，资产概览只展示钱包余额和交易账号余额，快捷入口展示 5 个，需要 PAMM 产品推荐和 CopyTrading 信号源推荐，也要公告通知和市场资讯。不要 KYC 风控、代理数据、客服帮助。",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(response.ok, true);
    assertOnlyAllowedBlocks(response.config);
    assertVisibleModulesHaveMorph(response.config);
    assert.deepStrictEqual(response.config.moduleSettings.assets.visibleFields, ["wallet", "tradingAccount"]);
    assert.strictEqual(response.config.moduleSettings.quickActions.count, 5);
    assert.deepStrictEqual(response.config.moduleSettings.quickActions.actions, []);
    assert.strictEqual(response.config.moduleSettings.pamm.enabled, true);
    assert.strictEqual(response.config.moduleSettings.copytrading.enabled, true);
    assert.strictEqual(response.config.moduleSettings.referral.enabled, false);
    assert.strictEqual(response.config.moduleSettings.referralLinkCard.enabled, false);
	    assert.strictEqual(response.config.moduleSettings.riskNotice.enabled, false);
	    assert.strictEqual(response.config.moduleSettings.supportContact.enabled, false);
	    assert.strictEqual(hasBlock(response.config, "referral_link_card"), false);
	    assert.strictEqual(hasBlock(response.config, "support_contact"), false);

	    const tickerResponse = await postJson(port, {
	      prompt: "生成首页，顶部第一栏展示跑马灯公告，滚动系统公告、活动公告和维护通知；下方保留资产概览、快捷入口和交易账号列表。",
	      modelConfig: { provider: "openai" },
	    });
	    assert.strictEqual(tickerResponse.ok, true);
	    assertOnlyAllowedBlocks(tickerResponse.config);
	    assert.strictEqual(hasBlock(tickerResponse.config, "announcements"), true);
	    assert.strictEqual(tickerResponse.config.moduleSettings.announcements.enabled, true);
	    assert.strictEqual(tickerResponse.config.moduleStyles.announcements, "ticker-strip");
	    assert.strictEqual(tickerResponse.config.sections[0].slots.includes("announcements"), true);

	    const walletListResponse = await postJson(port, {
	      prompt:
	        "生成资产管理首页，首屏资产概览只展示余额合计、交易账号余额、钱包余额。多币种钱包用钱包列表模块展示，不要把各钱包卡片放在资产概览。",
	      modelConfig: { provider: "openai" },
	    });
	    assert.strictEqual(walletListResponse.ok, true);
	    assertOnlyAllowedBlocks(walletListResponse.config);
	    assertVisibleModulesHaveMorph(walletListResponse.config);
	    assert.strictEqual(hasBlock(walletListResponse.config, "asset_overview"), true);
	    assert.strictEqual(hasBlock(walletListResponse.config, "quick_actions"), true);
	    assert.strictEqual(hasBlock(walletListResponse.config, "wallet_list"), true);
	    assert.deepStrictEqual(walletListResponse.config.moduleSettings.assets.visibleFields, ["total", "wallet", "tradingAccount"]);
	    assert.strictEqual(walletListResponse.config.moduleSettings.assets.showAccountBreakdown, true);
	    assert.strictEqual(walletListResponse.config.moduleSettings.assets.showWalletBreakdown, true);
	    assert.strictEqual(walletListResponse.config.moduleSettings.assets.showAvailable, false);
	    assert.strictEqual(walletListResponse.config.moduleSettings.assets.showMargin, false);
	    assert.strictEqual(walletListResponse.config.moduleSettings.assets.showRiskLevel, false);
	    assert.strictEqual(walletListResponse.config.moduleSettings.wallet.placement, "standalone");

	    const guidedCoreResponse = await postJson(port, {
	      inputMode: "guided",
	      prompt: "请生成开户引导首页，必须可见模块：首屏 Banner、新手引导、账户类型与优势、交易账号。不要编造收益、下载链接、后台未提供的数据或未选择的辅助模块。",
	      guidedIntake: {
	        source: "guided-builder",
	        canonical: {
	          primaryIntent: "onboarding",
	          layoutPreset: "onboardingJourney",
	          heroFocus: "onboarding_guide",
	          mustHave: ["welcome_header", "promo_banner", "onboarding_guide", "trading_accounts_list"],
	        },
	        modules: [
	          { id: "heroBanner", label: "首屏 Banner", canonicalTargets: ["welcome_header", "promo_banner"] },
	          { id: "openingFlow", label: "新手引导", canonicalTargets: ["onboarding_guide"] },
	          { id: "accountBenefits", label: "账户类型与优势", canonicalTargets: ["onboarding_guide", "trading_accounts_list"] },
	          { id: "tradingAccounts", label: "交易账号", canonicalTargets: ["trading_accounts_list"] },
	        ],
	      },
	      modelConfig: { provider: "openai" },
	    });
	    assert.strictEqual(guidedCoreResponse.ok, true);
	    assertOnlyAllowedBlocks(guidedCoreResponse.config);
	    assertVisibleModulesHaveMorph(guidedCoreResponse.config);
	    assert.strictEqual(hasBlock(guidedCoreResponse.config, "support_contact"), false);
	    assert.strictEqual(hasBlock(guidedCoreResponse.config, "faq_section"), false);
	    assert.strictEqual(hasBlock(guidedCoreResponse.config, "app_download"), false);
	    assert.strictEqual(hasBlock(guidedCoreResponse.config, "risk_disclosure"), false);
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.supportContact.enabled, false);
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.faq.enabled, false);
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.appDownload.enabled, false);
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.riskDisclosure.enabled, false);
	    assert(["workbench", "calm-table", "ops-table"].includes(guidedCoreResponse.config.moduleStyles.tradingAccounts));
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.tradingAccounts.viewMode, "list");

	    const guidedAccountOverviewResponse = await postJson(port, {
	      inputMode: "guided",
	      prompt:
	        "请生成开户引导首页，必须可见模块：账户概览、新手引导、交易账号。账户概览字段仅展示余额总额和交易账号余额。视觉自定义色值 #0EA5E9。",
	      guidedIntake: {
	        source: "guided-builder",
	        theme: { id: "blueFinance", label: "蓝色金融", customInput: "#0EA5E9 国际科技蓝" },
	        canonical: {
	          primaryIntent: "onboarding",
	          layoutPreset: "onboardingJourney",
	          heroFocus: "onboarding_guide",
	          mustHave: ["asset_overview", "onboarding_guide", "trading_accounts_list"],
	        },
	        moduleSettings: {
	          assets: {
	            enabled: true,
	            visibleFields: ["total", "tradingAccount"],
	          },
	        },
	        modules: [
	          { id: "accountOverview", label: "账户概览", canonicalTargets: ["asset_overview"] },
	          { id: "openingFlow", label: "新手引导", canonicalTargets: ["onboarding_guide"] },
	          { id: "tradingAccounts", label: "交易账号", canonicalTargets: ["trading_accounts_list"] },
	        ],
	      },
	      modelConfig: { provider: "openai" },
	    });
	    assert.strictEqual(guidedAccountOverviewResponse.ok, true);
	    assertOnlyAllowedBlocks(guidedAccountOverviewResponse.config);
	    assertVisibleModulesHaveMorph(guidedAccountOverviewResponse.config);
	    assert.strictEqual(hasBlock(guidedAccountOverviewResponse.config, "asset_overview"), true);
		    assert.deepStrictEqual(guidedAccountOverviewResponse.config.moduleSettings.assets.visibleFields, ["total", "wallet", "tradingAccount"]);
		    assert.strictEqual(guidedAccountOverviewResponse.config.moduleSettings.assets.showAccountBreakdown, true);
		    assert.strictEqual(guidedAccountOverviewResponse.config.moduleSettings.assets.showWalletBreakdown, true);
		    assert.strictEqual(guidedAccountOverviewResponse.config.moduleSettings.wallet.enabled, true);
		    assert.strictEqual(guidedAccountOverviewResponse.config.themeCustom.input, "#0EA5E9 国际科技蓝");
		    assert.strictEqual(guidedAccountOverviewResponse.config.themeCustom.primaryColor, "#0ea5e9");
		    assert(guidedAccountOverviewResponse.config.themeCustom.backgroundStyle, "custom theme text should expand into a palette");

	    const guidedResponse = await postJson(port, {
      inputMode: "guided",
      prompt: "请生成开户引导首页，必须可见模块：风险提示、FAQ、在线客服、APP 下载。不要编造在线状态或下载链接。",
      guidedIntake: {
        source: "guided-builder",
        canonical: {
          primaryIntent: "onboarding",
          layoutPreset: "onboardingJourney",
          heroFocus: "onboarding_guide",
          mustHave: ["risk_disclosure", "faq_section", "support_contact", "app_download"],
        },
        modules: [
          { id: "riskDisclosure", label: "风险提示", canonicalTargets: ["risk_disclosure"] },
          { id: "faq", label: "FAQ", canonicalTargets: ["faq_section"] },
          { id: "customerService", label: "在线客服", canonicalTargets: ["support_contact"] },
          { id: "appDownload", label: "APP 下载", canonicalTargets: ["app_download"] },
        ],
      },
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(guidedResponse.ok, true);
    assertOnlyAllowedBlocks(guidedResponse.config);
    assert.strictEqual(hasBlock(guidedResponse.config, "risk_disclosure"), true);
    assert.strictEqual(hasBlock(guidedResponse.config, "faq_section"), true);
    assert.strictEqual(hasBlock(guidedResponse.config, "support_contact"), true);
    assert.strictEqual(hasBlock(guidedResponse.config, "app_download"), true);
    assert.strictEqual(guidedResponse.config.moduleSettings.riskDisclosure.enabled, true);
    assert.strictEqual(guidedResponse.config.moduleSettings.faq.enabled, true);
    assert.strictEqual(guidedResponse.config.moduleSettings.supportContact.enabled, true);
    assert.strictEqual(guidedResponse.config.moduleSettings.appDownload.enabled, true);
    assert.strictEqual(guidedResponse.config.moduleStyles.risk_disclosure, "legal-strip");
    assert.strictEqual(guidedResponse.config.sections.at(-1).slots.includes("risk_disclosure"), true);
    assert.strictEqual(guidedResponse.config.brickPlan.find((brick) => brick.component === "risk_disclosure").zone, "full");

    const copytradingResponse = await postJson(port, {
      prompt: targetPrompt,
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(copytradingResponse.ok, true);
    assertOnlyAllowedBlocks(copytradingResponse.config);
    assertVisibleModulesHaveMorph(copytradingResponse.config);
    assert.strictEqual(copytradingResponse.config.layoutPreset, "onboardingJourney");
    assert.strictEqual(copytradingResponse.config.themePreset, "blueFinance");
    assert.strictEqual(copytradingResponse.config.heroFocus, "copytrading_signals");
    assert.strictEqual(copytradingResponse.config.moduleSettings.quickActions.count, 5);
    assert.deepStrictEqual(copytradingResponse.config.moduleSettings.quickActions.actions, []);
    assert.strictEqual(copytradingResponse.config.moduleSettings.copytrading.enabled, true);
    assert.strictEqual(copytradingResponse.config.moduleSettings.tradingAccounts.grouping, "separated");
    assert.strictEqual(copytradingResponse.config.moduleSettings.tradingAccounts.realViewMode, "card");
    assert.strictEqual(copytradingResponse.config.moduleSettings.tradingAccounts.demoViewMode, "card");
    assert.strictEqual(copytradingResponse.config.moduleStyles.copytrading_signals, "curve-cards");
    assert.strictEqual(hasBlock(copytradingResponse.config, "copytrading_signals"), true);

    const proTraderCostResponse = await postJson(port, {
      prompt: proTraderCostPrompt,
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(proTraderCostResponse.ok, true);
    assertOnlyAllowedBlocks(proTraderCostResponse.config);
    assertVisibleModulesHaveMorph(proTraderCostResponse.config);
    assert.strictEqual(proTraderCostResponse.config.name, "AI pro-trader-cost-3-1");
    assert.strictEqual(proTraderCostResponse.config.layoutPreset, "tradingCommand");
    assert.strictEqual(proTraderCostResponse.config.themePreset, "darkTech");
    assert.strictEqual(proTraderCostResponse.config.heroFocus, "trading_account_highlight");
    assert.strictEqual(proTraderCostResponse.config.moduleStyles.accountPerformance, "cost-board");
    assert.strictEqual(proTraderCostResponse.config.moduleStyles.quickActions, "command-bar");
    assert.strictEqual(proTraderCostResponse.config.moduleSettings.tradingAccounts.grouping, "separated");
    assert.strictEqual(proTraderCostResponse.config.moduleSettings.tradingAccounts.realViewMode, "list");
    assert.strictEqual(proTraderCostResponse.config.moduleSettings.tradingAccounts.demoViewMode, "list");
    assert.strictEqual(proTraderCostResponse.config.moduleSettings.copytrading.enabled, false);
    assert.strictEqual(hasBlock(proTraderCostResponse.config, "copytrading_signals"), false);
    assert.strictEqual(hasBlock(proTraderCostResponse.config, "onboarding_guide"), false);
    assert.strictEqual(hasBlock(proTraderCostResponse.config, "trading_account_highlight"), true);
    assert.strictEqual(hasBlock(proTraderCostResponse.config, "quick_actions"), true);

    const professionalTraderResponse = await postJson(port, {
      prompt: professionalTraderWorkbenchPrompt,
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(professionalTraderResponse.ok, true);
    assertOnlyAllowedBlocks(professionalTraderResponse.config);
    assertVisibleModulesHaveMorph(professionalTraderResponse.config);
    assert.strictEqual(professionalTraderResponse.config.name, "AI professional-trader-workb");
    assert.strictEqual(professionalTraderResponse.config.layoutPreset, "tradingCommand");
    assert.strictEqual(professionalTraderResponse.config.themePreset, "blueFinance");
    assert.notStrictEqual(professionalTraderResponse.config.themePreset, "darkTech");
    assert.strictEqual(professionalTraderResponse.config.heroFocus, "trading_accounts_list");
    assert.strictEqual(professionalTraderResponse.config.moduleStyles.accountPerformance, "pro-chart");
    assert.notStrictEqual(professionalTraderResponse.config.moduleStyles.accountPerformance, "cost-board");
    assert.strictEqual(professionalTraderResponse.config.moduleStyles.tradingAccounts, "account-wall");
    assert.strictEqual(professionalTraderResponse.config.moduleSettings.tradingAccounts.grouping, "combined");
    assert.strictEqual(professionalTraderResponse.config.moduleSettings.tradingAccounts.viewMode, "card");
    assert.strictEqual(professionalTraderResponse.config.moduleSettings.tradingAccounts.realViewMode, "card");
    assert.strictEqual(professionalTraderResponse.config.moduleSettings.tradingAccounts.demoViewMode, "card");
    assert.strictEqual(hasBlock(professionalTraderResponse.config, "trading_accounts_list"), true);
    assert.strictEqual(hasBlock(professionalTraderResponse.config, "trading_account_highlight"), true);
    assert.strictEqual(hasBlock(professionalTraderResponse.config, "quick_actions"), true);
    assert.strictEqual(hasBlock(professionalTraderResponse.config, "faq_section"), true);
    assert.strictEqual(hasBlock(professionalTraderResponse.config, "asset_overview"), false);
    assert.strictEqual(professionalTraderResponse.config.moduleSettings.faq.enabled, true);
    assert(["accordion", "compact-list"].includes(professionalTraderResponse.config.moduleStyles.faq_section));
	    assert.strictEqual(professionalTraderResponse.config.dataContract.previewSample, true);
	    assert.strictEqual(professionalTraderResponse.config.dataContract.dataBindingRequired, true);
	    assert.strictEqual(professionalTraderResponse.config.dataContract.fields.tradingAccounts.binding, "api.trading.accounts");
	    assert.deepStrictEqual(Array.from(professionalTraderResponse.config.dataContract.fields.tradingAccounts.allowedFields), ["accountKind", "platform", "server", "account", "balance", "equity", "credit", "accountType", "leverage", "marginRatio"]);
	    assert(professionalTraderResponse.config.dataContract.fields.tradingAccounts.forbiddenFields.includes("pnl"));
	    assert.strictEqual(professionalTraderResponse.config.dataContract.fields.tradingCost.dataBindingRequired, true);
    assert.strictEqual(professionalTraderResponse.config.dataContract.fields.pnl.fallback, "--");
    assert.strictEqual(professionalTraderResponse.config.dataContract.fields.margin.previewSample, true);
    assert.strictEqual(professionalTraderResponse.config.dataContract.fields.charts.binding, "api.trading.performanceSeries");
    assert.strictEqual(professionalTraderResponse.config.brickPlan.some((brick) => String(brick.brickId).includes("costBoard")), false);
    assert.strictEqual(sectionForSlot(professionalTraderResponse.config, "trading_accounts_list").type, "full");
    assert.strictEqual(sectionForSlot(professionalTraderResponse.config, "trading_account_highlight").type, "full");
    assert.notStrictEqual(sectionForSlot(professionalTraderResponse.config, "trading_accounts_list").id, sectionForSlot(professionalTraderResponse.config, "trading_account_highlight").id);
    assert.strictEqual(brickForComponent(professionalTraderResponse.config, "trading_account_highlight").size, "3x2");
    assert.strictEqual(brickForComponent(professionalTraderResponse.config, "trading_account_highlight").zone, "full");

    const accountPerformanceResponse = await postJson(port, {
      prompt: accountPerformancePrompt,
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(accountPerformanceResponse.ok, true);
    assertOnlyAllowedBlocks(accountPerformanceResponse.config);
    assert.strictEqual(hasBlock(accountPerformanceResponse.config, "trading_account_highlight"), true);
    assert.strictEqual(sectionForSlot(accountPerformanceResponse.config, "trading_account_highlight").type, "full");
    assert.strictEqual(accountPerformanceResponse.config.moduleStyles.accountPerformance, "pro-chart");
    assert(["calm-table", "ops-table"].includes(accountPerformanceResponse.config.moduleStyles.tradingAccounts));

    const flatAccountResponse = await postJson(port, {
      prompt: flatAccountPrompt,
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(flatAccountResponse.ok, true);
    assertOnlyAllowedBlocks(flatAccountResponse.config);
    assert.strictEqual(flatAccountResponse.config.moduleStyles.accountPerformance, "pro-chart");
    assert.strictEqual(flatAccountResponse.config.moduleStyles.tradingAccounts, "calm-table");
    assert.strictEqual(flatAccountResponse.config.moduleSettings.tradingAccounts.viewMode, "list");
    assert.strictEqual(flatAccountResponse.config.moduleSettings.tradingAccounts.realViewMode, "list");
    assert.strictEqual(flatAccountResponse.config.moduleSettings.tradingAccounts.demoViewMode, "list");

	    const onboardingAiHtmlPrompt =
	      "开户引导类首页：目标是推动真实账户开户、KYC、首次入金准备，主 CTA 是“立即开户”，视觉是极简白，语气专业稳健；必须包含 asset_overview、onboarding_guide、交易账号列表、活动权益、PAMM 条件展示、推广链接、下载入口、客服、FAQ、风险提示等模块。不要编造收益、下载链接、后台未提供的数据。";
	    const aiHtmlResponse = await postJson(port, {
	      prompt: onboardingAiHtmlPrompt,
	      renderMode: "aiHtml",
	      modelConfig: { provider: "openai" },
	    });
    assert.strictEqual(aiHtmlResponse.ok, true);
    assert.strictEqual(aiHtmlResponse.renderMode, "aiHtml");
    assert.strictEqual(aiHtmlResponse.activeRenderMode, "aiHtml");
    assert.strictEqual(aiHtmlResponse.config.renderMode, "aiHtml");
    assert.strictEqual(aiHtmlResponse.config.activeRenderMode, "aiHtml");
		    assert.strictEqual(aiHtmlResponse.config.htmlScheme.enabled, true);
		    assert.strictEqual(aiHtmlResponse.htmlScheme.enabled, true);
		    assert.strictEqual(aiHtmlResponse.htmlScheme.generationPipeline, "mock-free-html");
		    assert.strictEqual(aiHtmlResponse.htmlScheme.sourceType, "mock");
		    assert.strictEqual(aiHtmlResponse.htmlScheme.isFallback, true);
		    assert.strictEqual(aiHtmlResponse.htmlScheme.mock, true);
		    assert.strictEqual(aiHtmlResponse.htmlScheme.modelAttempted, false);
		    assert(aiHtmlResponse.htmlScheme.fallbackReason.includes("HOME_AI_MOCK"), "mock AI HTML must explain why it is not a model result");
		    assert.notStrictEqual(aiHtmlResponse.htmlScheme.qualityStatus, "passed");
			    assert(Number.isFinite(aiHtmlResponse.htmlScheme.qualityScore), "server AI HTML scheme must expose quality score");
			    assert(aiHtmlResponse.htmlScheme.qualityScore >= 70, "mock AI HTML should pass the basic aesthetic floor");
			    assert(aiHtmlResponse.htmlScheme.requiredModules.includes("资产概览"), "server AI HTML scheme must expose required module contract");
			    assert(Array.isArray(aiHtmlResponse.htmlScheme.implementationContract), "server AI HTML scheme must expose implementation contracts");
			    ["onboarding_guide", "pamm_products", "referral_link_card", "app_download", "faq_section", "support_contact", "risk_disclosure"].forEach((moduleId) => {
		      assert(
		        aiHtmlResponse.htmlScheme.implementationContract.some((contract) => contract.module === moduleId),
		        `AI HTML required module must include ${moduleId}`,
			      );
			      assert(aiHtmlResponse.htmlScheme.html.includes(`data-ai-html-module="${moduleId}"`), `AI HTML must visibly render ${moduleId}`);
			    });
		    assert(aiHtmlResponse.htmlScheme.implementationContract.some((contract) => contract.module === "asset_overview"), "server AI HTML implementation contract must include asset overview");
		    assert(aiHtmlResponse.htmlScheme.qualityIssues.every((issue) => !issue.includes("静态外观空壳")), "mock AI HTML must satisfy the anti-shell quality gate");
		    assert(Array.isArray(aiHtmlResponse.htmlScheme.componentReferences), "server AI HTML scheme must expose component references");
		    assert(!aiHtmlResponse.htmlScheme.html.includes("<script"), "server AI HTML scheme must not contain script tags");
	    assert(!aiHtmlResponse.htmlScheme.html.includes("javascript:"), "server AI HTML scheme must not contain javascript URLs");
	    assert(!aiHtmlResponse.htmlScheme.html.includes("AI HTML VISUAL DRAFT"), "mock AI HTML must not expose internal draft labels");
	    assert(!aiHtmlResponse.htmlScheme.html.includes(onboardingAiHtmlPrompt.slice(0, 40)), "AI HTML must not paste the administrator prompt into the customer page");
			    assert(aiHtmlResponse.htmlScheme.html.includes("立即开户"), "onboarding AI HTML must expose the requested primary CTA");
	    assert.strictEqual(aiHtmlResponse.config.pageIntent.primaryIntent, "onboarding");
	    assert.strictEqual(aiHtmlResponse.config.brickTrace.intent, "onboarding");
	    assert.strictEqual(aiHtmlResponse.callRecord.status, "mock");
	    assert.strictEqual(aiHtmlResponse.callRecord.configSnapshot.htmlMock, true);

    const referralCoreResponse = await postJson(port, {
      prompt:
        "生成 IB 代理用户首页，允许展示轻量 referral_link_card，只展示推广链接、邀请码、复制推广链接按钮和复制邀请码按钮。不要返佣、团队层级、下级客户列表或完整代理数据区。",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(referralCoreResponse.ok, true);
    assertOnlyAllowedBlocks(referralCoreResponse.config);
    assertVisibleModulesHaveMorph(referralCoreResponse.config);
    assert.strictEqual(hasBlock(referralCoreResponse.config, "referral_link_card"), true);
    assert.strictEqual(referralCoreResponse.config.moduleSettings.referralLinkCard.enabled, true);
    assert.strictEqual(referralCoreResponse.config.moduleSettings.referralLinkCard.showPromoLink, true);
    assert.strictEqual(referralCoreResponse.config.moduleSettings.referralLinkCard.showInviteCode, true);
    assert.strictEqual(referralCoreResponse.config.moduleSettings.referralLinkCard.showStats, false);
    assert.strictEqual(hasBlock(referralCoreResponse.config, "ib_dashboard"), false);

    const referralStatsResponse = await postJson(port, {
      prompt:
        "生成合作伙伴推广链接首页，需要 referral_link_card 展示推广链接、邀请码，以及打开数、注册数、开户数、注册转化率、开户转化率；不要完整 IB 数据区。",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(referralStatsResponse.ok, true);
    assertOnlyAllowedBlocks(referralStatsResponse.config);
    assert.strictEqual(hasBlock(referralStatsResponse.config, "referral_link_card"), true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.enabled, true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.showStats, true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.showOpens, true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.showRegistrations, true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.showAccounts, true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.showRegistrationRate, true);
    assert.strictEqual(referralStatsResponse.config.moduleSettings.referralLinkCard.showAccountRate, true);
  } finally {
    child.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
