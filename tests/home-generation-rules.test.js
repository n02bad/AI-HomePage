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
  "kyc_status_card",
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

function loadModelSettingsEngine() {
  const code = fs.readFileSync(path.join(ROOT, "ai-model-settings.js"), "utf8");
  const storage = {};
  const sandbox = {
    console,
    window: {
      localStorage: {
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
        },
        setItem(key, value) {
          storage[key] = String(value);
        },
        removeItem(key) {
          delete storage[key];
        },
      },
      dispatchEvent() {},
      CustomEvent: function CustomEvent(type, init) {
        return { type, ...init };
      },
    },
  };
  sandbox.CustomEvent = sandbox.window.CustomEvent;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.ForexCRMModelSettings;
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

function assertLegalHomepageSections(config) {
  const heroSections = (config.sections || []).filter((section) => section.type === "hero");
  assert(heroSections.length <= 1, "homepage config must not contain duplicate hero sections");
  (config.sections || []).forEach((section) => {
    const slots = Array.isArray(section.slots) ? section.slots : [];
    if (section.type === "split") assert.strictEqual(slots.length, 2, `split section must have two modules: ${section.id}`);
    if (section.type === "full") assert.strictEqual(slots.length, 1, `full section must have one module: ${section.id}`);
    if (section.type === "hero") assert(slots.length >= 1 && slots.length <= 2, `hero section must have one or two modules: ${section.id}`);
  });
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

function homepageStructuralSignature(config) {
  return [
    config.layoutPreset,
    config.designGenome,
    config.pageStory,
    config.heroFocus,
    (config.sections || []).map((section) => `${section.type}:${(section.slots || []).join("+")}`).join("|"),
    (config.brickPlan || []).map((brick) => `${brick.zone}:${brick.brickId}`).join("|"),
    config.moduleStyles?.quickActions,
  ].join(" || ");
}

function assertVariantDiversity(home, prompt, expectedMin = 2) {
  const signatures = new Set([0, 1, 2].map((variant) => homepageStructuralSignature(home.promptToConfig(prompt, variant))));
  assert(signatures.size >= expectedMin, `expected at least ${expectedMin} structural variants for prompt`);
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

function assertComponentReferencesApplied(config) {
  const references = Array.isArray(config.componentReferences) ? config.componentReferences : [];
  assert(references.length > 0, "homepage config must expose component-library references");
  const visibleModules = visibleCoreMorphModules(config);
  const coreReference = references.find((reference) => visibleModules.includes(reference.module));
  assert(coreReference, "component references must cover at least one visible core morph module");
  assert(coreReference.componentId, "component reference must include componentId");
  assert(coreReference.variantHint || coreReference.morphHint || coreReference.styleHint, "component reference must include applied structure hints");
  assert.strictEqual(config.componentMorphs?.[coreReference.module]?.referenceComponentId, coreReference.componentId);
  assert(
    (config.brickPlan || []).some((brick) => brick.referenceComponentId === coreReference.componentId),
    "brickPlan must preserve the component reference used for its slot",
  );
}

function normalizedLibraryScore(component) {
  const score = Number(component?.score);
  if (!Number.isFinite(score)) return 5;
  return Math.max(1, Math.min(10, Math.round(score)));
}

function assertNoBlockedComponentReferences(config, componentLibrary) {
  const scoreById = new Map((componentLibrary.components || []).map((component) => [component.id, normalizedLibraryScore(component)]));
  const skeletonSlotComponents = Object.values(config.skeletonHtmlScheme?.slotComponents || {});
  const ids = new Set([
    ...(Array.isArray(config.componentReferences) ? config.componentReferences.map((reference) => reference.componentId || reference.id) : []),
    ...(Array.isArray(config.brickPlan) ? config.brickPlan.map((brick) => brick.referenceComponentId) : []),
    ...Object.values(config.componentMorphs || {}).map((morph) => morph.referenceComponentId),
    ...(Array.isArray(config.htmlScheme?.componentReferences) ? config.htmlScheme.componentReferences.map((reference) => reference.componentId || reference.id) : []),
    ...skeletonSlotComponents.flatMap((component) => [component?.id, component?.referenceComponentId]),
  ].filter(Boolean));
  const blocked = [...ids].filter((id) => scoreById.has(id) && scoreById.get(id) <= 5);
  assert.deepStrictEqual(blocked, [], "5-point-or-lower component-library bricks must not be referenced by generated homepage output");
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

function requestJson(port, requestPath, payload = null, method = payload ? "POST" : "GET") {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        method,
        headers: {
          accept: "application/json",
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode < 200 || res.statusCode >= 300 || json.ok === false) {
              reject(new Error(json.error || `${res.statusCode} ${res.statusMessage}`));
              return;
            }
            resolve(json);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function assertServerVariantDiversity(port, prompt, expectedMin = 2) {
  const responses = [];
  for (const variant of [0, 1, 2]) {
    const response = await postJson(port, { prompt, variant, modelConfig: { provider: "openai" } });
    assert.strictEqual(response.ok, true);
    responses.push(response.config);
  }
  const signatures = new Set(responses.map(homepageStructuralSignature));
  assert(signatures.size >= expectedMin, `expected at least ${expectedMin} server structural variants for prompt`);
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
  const modelSettings = loadModelSettingsEngine();
  const homeSource = fs.readFileSync(path.join(ROOT, "home-personalization.js"), "utf8");
  const modelSettingsPageSource = fs.readFileSync(path.join(ROOT, "ai-model-settings.html"), "utf8");
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
  assert.strictEqual(
    modelSettings.sanitizeModelConfig({
      provider: "openai",
      model: "gemini-2.5-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      endpoint: "/chat/completions",
      apiMode: "openai-chat",
    }).provider,
    "gemini",
    "stale OpenAI-compatible Gemini configs must be inferred as Gemini",
  );
  assert.strictEqual(
    modelSettings.providerIdFromValue("OpenAI Compatible gemini-2.5-flash"),
    "gemini",
    "model picker history must not classify Gemini OpenAI-compatible records as OpenAI",
  );
  [
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.1-pro-preview-customtools",
  ].forEach((model) => {
    assert(modelSettings.AI_MODEL_PRESETS.gemini.models.includes(model), `Gemini picker should include ${model}`);
  });
  assert.strictEqual(
    modelSettings.sanitizeModelConfig({ provider: "gemini", model: "Gemini 3 Flash Preview" }).model,
    "gemini-3-flash-preview",
    "Gemini display labels must be normalized to actual model ids before saving",
  );
  assert.strictEqual(
    modelSettings.sanitizeModelConfig({ provider: "gemini", model: "gemini-3-pro-preview" }).model,
    "gemini-3.1-pro-preview",
    "shut down Gemini 3 Pro Preview ids must be migrated to Gemini 3.1 Pro Preview",
  );
  assert.strictEqual(
    modelSettings.sanitizeModelConfig({ provider: "gemini", model: "deepseek-v4-flash" }).model,
    "gemini-2.5-flash",
    "Gemini configs must not retain another provider's model id when switching providers",
  );
  assert(modelSettingsPageSource.includes('<select data-model-settings-field="model"'), "model settings page must use a real model ID select");
  assert(!modelSettingsPageSource.includes('list="ai-model-settings-options"'), "model settings page must not rely on free-text datalist for model IDs");

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

  const normalizedComponentRefs = home.normalizeConfig({
    schemaVersion: 4,
    sections: [{ id: "hero", type: "hero", slots: ["asset_overview", "quick_actions"] }],
    componentReferences: [
      {
        componentId: "quickactions-command-ref",
        name: "快捷操作命令栏",
        family: "QuickActions",
        module: "QuickActions",
        component: "quick_actions",
        tags: ["commandBar", "operationDock"],
        layoutHints: ["命令栏"],
        reason: "参考命令栏结构",
      },
    ],
  });
  assert.strictEqual(normalizedComponentRefs.modules.QuickActions.variant, "commandBar");
  assert.strictEqual(normalizedComponentRefs.moduleStyles.quickActions, "command-bar");
  assert.strictEqual(normalizedComponentRefs.componentMorphs.QuickActions.referenceComponentId, "quickactions-command-ref");
  assert.strictEqual(normalizedComponentRefs.componentReferences[0].variantHint, "commandBar");

  const normalizedSkeletonHtml = home.normalizeConfig({
    schemaVersion: 4,
    renderMode: "skeletonHtml",
    activeRenderMode: "skeletonHtml",
    sections: [
      { id: "skeleton-hero", type: "hero", title: "骨架首屏", slots: ["asset_overview", "quick_actions"] },
      { id: "skeleton-accounts", type: "full", title: "交易账号", slots: ["trading_accounts_list"] },
    ],
  });
  assert.strictEqual(normalizedSkeletonHtml.renderMode, "skeletonHtml");
  assert.strictEqual(normalizedSkeletonHtml.activeRenderMode, "skeletonHtml");
  assert.strictEqual(normalizedSkeletonHtml.htmlScheme.enabled, false);
  assert.strictEqual(normalizedSkeletonHtml.skeletonHtmlScheme.enabled, true);
  assert(normalizedSkeletonHtml.skeletonHtmlScheme.skeletonHtml.includes("data-home-skeleton-slot"), "skeleton mode must generate slot placeholder HTML");
  assert(normalizedSkeletonHtml.skeletonHtmlScheme.skeletonHtml.includes("data-home-skeleton-contract"), "skeleton mode must stamp the page style contract into the shell");
  assert.strictEqual(normalizedSkeletonHtml.skeletonHtmlScheme.designContract.label.length > 0, true, "skeleton mode must expose a style contract");
  assert(
    normalizedSkeletonHtml.skeletonHtmlScheme.slots.some((slot) => slot.id === "asset_overview"),
    "skeleton scheme must expose individual slot records",
  );
  assert.strictEqual(typeof home.buildSkeletonHtmlScheme, "function", "skeleton builder must be exported for admin slot refresh");
  assert.strictEqual(typeof home.buildSkeletonDesignContract, "function", "skeleton style contract builder must be exported for slot prompts");

  const assetSkeletonA = home.buildSkeletonHtmlScheme(home.promptToConfig("生成一个资产管理首页", 0));
  const assetSkeletonB = home.buildSkeletonHtmlScheme(home.promptToConfig("生成一个资产管理首页", 1));
  assert.notStrictEqual(
    assetSkeletonA.designContract.id,
    assetSkeletonB.designContract.id,
    "different skeleton candidates should carry different page-level style contracts",
  );

  const normalizedFilledSkeletonHtml = home.normalizeConfig({
    schemaVersion: 4,
    renderMode: "skeletonHtml",
    activeRenderMode: "skeletonHtml",
    skeletonHtmlScheme: {
      enabled: true,
      status: "review",
      skeletonHtml:
        '<section data-home-skeleton-root><article data-home-skeleton-slot="asset_overview"><div data-home-skeleton-placeholder></div></article></section>',
      slots: [{ id: "asset_overview", label: "账户概览", status: "filled" }],
      slotComponents: {
        asset_overview: {
          id: "asset-overview-ai-slot",
          name: "资产概览组件",
          family: "AssetOverview",
          html: '<article class="asset-overview-ai-slot">资产概览</article>',
          css: ".asset-overview-ai-slot{display:grid}",
          locked: true,
        },
      },
    },
  });
  assert.strictEqual(normalizedFilledSkeletonHtml.skeletonHtmlScheme.status, "review");
  assert.strictEqual(normalizedFilledSkeletonHtml.skeletonHtmlScheme.slotComponents.asset_overview.locked, true);
  assert.strictEqual(normalizedFilledSkeletonHtml.skeletonHtmlScheme.slots[0].status, "locked");

  const normalizedLeakedSupportSlot = home.normalizeConfig({
    schemaVersion: 4,
    renderMode: "skeletonHtml",
    activeRenderMode: "skeletonHtml",
    skeletonHtmlScheme: {
      enabled: true,
      status: "review",
      skeletonHtml:
        '<section data-home-skeleton-root><article data-home-skeleton-slot="support_contact"><div data-home-skeleton-placeholder></div></article></section>',
      slots: [{ id: "support_contact", label: "在线客服", status: "filled" }],
      slotComponents: {
        support_contact: {
          id: "support-contact-bad-slot",
          name: "首页业务小组件",
          family: "SupportContact",
          html: '<section class="bad-support"><span>Client Home Atom</span><strong>首页目标：生成这个 slot 的完整组件</strong><b>KYC Verified</b><button>Open Account</button></section>',
          css: ".bad-support{display:grid}",
        },
      },
    },
  });
  assert.strictEqual(
    normalizedLeakedSupportSlot.skeletonHtmlScheme.slotComponents.support_contact,
    undefined,
    "support_contact skeleton components must drop leaked prompt/wrong-module cached HTML",
  );

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

  const localDepositConversion = home.promptToConfig(
    "请为 ForexCRM 用户端首页生成可发布的首页方案；页面目标：推动首次入金；全页主 CTA 统一为立即入金。主 CTA：立即入金（data-home-action=deposit）。专业版，蓝色金融，精致美观。必选模块：账户概览、快捷入口、新手 Onboarding 引导；欢迎模块必须第一栏；KYC 状态：未提交、待审、通过、拒绝，只展示当前状态；首页 Banner、账号表现、CopyTrading、推广链接卡片、FAQ、风险提示；交易账号列表必须同时包含真实交易账号和模拟交易账号。",
    2,
  );
  assertOnlyAllowedBlocks(localDepositConversion);
  assertVisibleModulesHaveMorph(localDepositConversion);
  assert.strictEqual(localDepositConversion.pageIntent.primaryIntent, "deposit");
  assert.strictEqual(localDepositConversion.layoutPreset, "conversionFirst");
  assert.strictEqual(localDepositConversion.heroFocus, "promo_banner");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(localDepositConversion.sections[0].slots)), ["welcome_header"]);
  assert.strictEqual(hasBlock(localDepositConversion, "promo_banner"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "asset_overview"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "onboarding_guide"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "quick_actions"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "trading_account_highlight"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "trading_accounts_list"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "copytrading_signals"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "referral_link_card"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "faq_section"), true);
  assert.strictEqual(hasBlock(localDepositConversion, "risk_disclosure"), true);
  ["promoHighlight", "walletBalance", "fundActions", "openAccountActions"].forEach((legacySlot) => {
    assert.strictEqual(collectBlocks(localDepositConversion).includes(legacySlot), false, `${legacySlot} must not leak into deposit homepage`);
  });
  assert.strictEqual(localDepositConversion.pageIntent.primaryCta.label, "立即入金");
  assert.strictEqual(localDepositConversion.pageIntent.primaryCta.action, "deposit");
  assert.strictEqual(localDepositConversion.componentMorphs.PromotionBanner.morphId, "depositLadder");
  assert.strictEqual(localDepositConversion.componentMorphs.AssetOverview.morphId, "metricTriplet");
  assert(["accentCards", "segmentedPanel"].includes(localDepositConversion.componentMorphs.QuickActions.morphId));
  assert.strictEqual(localDepositConversion.componentMorphs.TradingAccounts.morphId, "liveDemoSplit");
  assert.strictEqual(localDepositConversion.moduleSettings.userKycRail.kycStatus, "verified");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(localDepositConversion.moduleSettings.quickActions.actions)), []);
  assert.strictEqual(localDepositConversion.moduleSettings.assets.enabled, true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(localDepositConversion.moduleSettings.assets.visibleFields)), ["total", "wallet", "tradingAccount"]);
  assert.strictEqual(localDepositConversion.moduleSettings.tradingAccounts.grouping, "separated");
  assert.strictEqual(localDepositConversion.moduleSettings.tradingAccounts.realViewMode, "list");
  assert.strictEqual(localDepositConversion.moduleSettings.tradingAccounts.demoViewMode, "list");

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

	  const growthDepositVariantPrompt = "增长活动首页，首屏展示活动报名、入金奖励、推广链接和快捷入口。";
	  const partnerVariantPrompt = "合作伙伴首页，展示推广链接、邀请码、注册转化率、返佣和开户链接。";
	  assertVariantDiversity(home, proTraderCostPrompt, 3);
	  assertVariantDiversity(home, professionalTraderWorkbenchPrompt, 3);
	  assertVariantDiversity(home, growthDepositVariantPrompt, 3);
	  assertVariantDiversity(home, partnerVariantPrompt, 3);

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

  const localProfessionalKyc = home.promptToConfig(
    "tier=professional 专业版首页，heroFocus=asset_overview，需要资产概览、账号表现、推广链接；CRM 账户 KYC 状态：未提交，只展示当前状态，未提交时展示去提交按钮。",
  );
  assertOnlyAllowedBlocks(localProfessionalKyc);
  assert.strictEqual(hasBlock(localProfessionalKyc, "asset_overview"), true);
  assert.strictEqual(hasBlock(localProfessionalKyc, "trading_account_highlight"), true);
  assert.strictEqual(hasBlock(localProfessionalKyc, "referral_link_card"), true);
  assert.strictEqual(hasBlock(localProfessionalKyc, "kyc_status_card"), true);
  assert.notStrictEqual(localProfessionalKyc.layoutPreset, "onboardingJourney");
  assert.strictEqual(localProfessionalKyc.moduleSettings.userKycRail.enabled, true);
  assert.strictEqual(localProfessionalKyc.moduleSettings.userKycRail.kycStatus, "pending");
  assert(sectionForSlot(localProfessionalKyc, "asset_overview"), "asset overview should be rendered");

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
  const commonLayoutSource = fs.readFileSync(path.join(ROOT, "common-layout.js"), "utf8");
  assert(personalizationCss.includes(".ai-accounts-feature .accounts-list-view[hidden]"), "inactive account view must stay hidden in AI preview CSS");
	  const serverSource = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
	  const adminSource = fs.readFileSync(path.join(ROOT, "home-layout-admin.js"), "utf8");
	  const adminHtmlSource = fs.readFileSync(path.join(ROOT, "home-layout-admin.html"), "utf8");
	  const modelSettingsSource = fs.readFileSync(path.join(ROOT, "ai-model-settings.js"), "utf8");
	  const modulePreviewSource = fs.readFileSync(path.join(ROOT, "home-module-preview.js"), "utf8");
	  const modulePreviewHtmlSource = fs.readFileSync(path.join(ROOT, "home-module-preview.html"), "utf8");
  assert(serverSource.includes("空间利用是硬约束"), "AI prompt must treat space utilization as a hard constraint");
  assert(serverSource.includes("同一组账号数据不得在同一个模块里同时渲染上方摘要卡/摘要行和下方列表/表格"), "AI prompt must forbid duplicate account card plus table views");
  assert(serverSource.includes("账号类型(accountKind=Live/Demo)和账户类型(accountType=ECN Standard/Demo ECN)"), "AI prompt must distinguish account kind and account type");
  const componentLibrary = JSON.parse(fs.readFileSync(path.join(ROOT, "home-component-library.json"), "utf8"));
  const tradingAccountsBrick = componentLibrary.components.find((component) => component.id === "trading-accounts-separated-list");
  const tradingAccountsContract = tradingAccountsBrick?.sourcePrompt || serverSource;
  assert(
    tradingAccountsContract.includes("不能上方摘要卡片下方再重复完整表格") || tradingAccountsContract.includes("摘要卡片和完整表格上下重复"),
    "TradingAccounts generation contract must forbid duplicate summary/table views",
  );
  assert(serverSource.includes("const MINIMAX_MAX_COMPLETION_TOKENS = 2048"), "MiniMax should keep the documented OpenAI-compatible completion token cap");
  assert(serverSource.includes('const KIMI_DEFAULT_MODEL = "kimi-k2.6"'), "Kimi preset should use the current default model");
  assert(serverSource.includes('const KIMI_CN_BASE_URL = "https://api.moonshot.cn/v1"'), "Kimi should default to the China API domain");
  assert(serverSource.includes("body.max_completion_tokens = config.maxOutputTokens"), "Kimi chat requests should use max_completion_tokens instead of deprecated max_tokens");
  assert(serverSource.includes("function isKimiFixedTemperatureModel"), "Kimi K2.6/K2.5 requests should use model-specific fixed parameters");
  assert(serverSource.includes('body.thinking = { type: "disabled" }'), "Kimi K2.6/K2.5 JSON requests should disable thinking to avoid homepage generation timeouts");
  assert(serverSource.includes("return isKimiFixedTemperatureModel(model) ? 0.6 : 1"), "Kimi K2.6/K2.5 non-thinking requests should force temperature 0.6");
	  assert(!serverSource.includes('["minimax", "kimi"].includes(config.provider) ? Math.min(config.temperature, 0.6)'), "Kimi structured JSON requests must not be clamped below its required temperature");
	  assert(serverSource.includes("buildLowLatencyHomepagePrompt"), "MiniMax and Kimi should use a short homepage prompt to avoid provider timeouts");
	  assert(serverSource.includes('config.provider === "kimi" || config.provider === "deepseek"'), "DeepSeek config generation should also use the short homepage prompt");
	  assert(serverSource.includes("function inferProviderId"), "server proxy must infer Gemini/compatible providers from stale model configs");
	  assert(serverSource.includes('explicit === "openai" && inferred && inferred !== "openai"'), "stale OpenAI provider ids must yield to Gemini/compatible model signatures");
	  assert(serverSource.includes("GEMINI_TEXT_MODELS"), "server provider metadata must expose the expanded Gemini text model list");
	  assert(modelSettingsSource.includes("function inferProviderFromConfig"), "shared model settings must infer the provider from model/baseUrl signatures");
	  assert(modelSettingsSource.includes("gemini-3.1-pro-preview-customtools"), "shared model settings must list current Gemini 3.1 Pro custom tools text model");
	  assert(adminSource.includes("function inferProviderFromConfig"), "home admin must infer provider before sending model configs");
	  assert(adminSource.includes("gemini-3.1-flash-lite"), "home admin must expose Gemini 3.1 Flash-Lite choices");
		  assert(modulePreviewSource.includes("function inferProviderFromConfig"), "module preview must infer provider before sending model configs");
		  assert(modulePreviewSource.includes("gemini-3.1-pro-preview"), "module preview must expose Gemini 3.1 Pro Preview choices");
		  assert(serverSource.includes("COMPONENT_SCORE_FILE"), "component brick scores must persist outside browser localStorage");
		  assert(serverSource.includes("/api/home-components/score"), "component brick scores must have a backend sync endpoint");
		  assert(serverSource.includes("deleteComponentScoreEntries"), "deleting a component must clean persisted score records");
		  assert(serverSource.includes("deleteComponentReferenceAsset"), "deleting a component must clean uploaded component visual assets");
		  assert(modulePreviewSource.includes("syncLocalComponentScoresToServer"), "module preview should sync existing local scores into the persisted score store");
		  assert(modulePreviewHtmlSource.includes("data-ai-component-reference-file"), "AI component generation must support uploaded image/screenshot references");
		  assert(modulePreviewHtmlSource.includes("data-ai-component-result"), "AI component generation must render a pending preview before saving");
		  assert(modulePreviewHtmlSource.includes("data-ai-component-confirm-save"), "AI component generation must require explicit save confirmation");
		  assert(modulePreviewSource.includes("save: false"), "AI component preview generation must request a draft instead of immediately saving");
		  assert(modulePreviewSource.includes("confirmSavePendingComponent"), "AI component preview must have a confirmed save path");
		  assert(serverSource.includes("shouldPersistGeneratedComponent"), "component generation API must support draft-only generation before confirmed save");
		  assert(serverSource.includes("componentVisualReferencePromptReference"), "component generation prompts must include image/screenshot visual references");
		  assert(serverSource.includes("input_image"), "OpenAI Responses component generation should forward uploaded image references");
	  assert(serverSource.includes("productWarnings"), "homepage responses should expose productWarnings separately from HTML quality");
	  assert(serverSource.includes("质量门禁"), "AI HTML generation must include an aesthetic quality gate");
	  assert(serverSource.includes("designRulesPromptReference"), "AI generation must load design.md as prompt governance");
	  assert(serverSource.includes("design.md 设计治理"), "AI prompts must explicitly reference design.md governance");
	  assert(serverSource.includes("硬编码颜色过多"), "AI HTML quality gate must penalize hard-coded color drift");
	  assert(serverSource.includes("装饰性渐变过多"), "AI HTML quality gate must penalize decorative gradient drift");
	  assert(serverSource.includes("按钮仍像原生控件"), "AI HTML quality gate must penalize native-looking browser controls");
	  assert(serverSource.includes("组件库参考是硬约束"), "AI HTML prompts must treat component-library references as a hard constraint");
	  assert(serverSource.includes("componentReferences 至少覆盖 3 个 requiredModules"), "AI HTML prompts must require broad component-library reference coverage");
	  assert(serverSource.includes("goldenSamplePages 是整页黄金样本 primary reference"), "AI generation must treat whole-page golden samples as primary references");
	  assert(serverSource.includes("lowScoreAntiExamples"), "AI generation must retrieve low-score anti examples");
	  assert(serverSource.includes("HOME_GOLDEN_SAMPLE_DIMENSIONS"), "golden samples must persist the expanded aesthetic scoring dimensions");
	  assert(serverSource.includes("saveGoldenSampleScreenshotAsset"), "golden sample saves must support persisted screenshot evidence");
		  assert(serverSource.includes("componentReferenceHints"), "AI HTML generation must use component-library reference hints");
		  assert(serverSource.includes("applyComponentReferencesToHomepageConfig"), "homepage config generation must apply component-library references to modules and morphs");
		  assert(serverSource.includes("referenceComponentId"), "homepage config must persist applied component-library reference ids");
		  assert(serverSource.includes("COMPONENT_REFERENCE_SCORE_POLICY"), "homepage generation must centralize component-library score reference policy");
		  assert(serverSource.includes("5 分及以下禁止参考"), "homepage generation must block low-scored component-library references");
		  assert(serverSource.includes("componentReferenceConstraintPolicy"), "homepage generation must expose a brick-first component reference constraint policy");
		  assert(serverSource.includes("保底同款微调"), "homepage generation must document same-brick fallback with micro tuning");
		  assert(serverSource.includes("brickBackedAiHtmlScheme"), "AI HTML fallback must be able to assemble high-scored brick-backed HTML");
		  assert(serverSource.includes("high-score-brick-backed-html"), "AI HTML fallback pipeline must identify high-score brick-backed rendering");
		  assert(adminSource.includes("high-score-same-brick-micro-tune"), "admin skeleton fallback must preserve high-score same-brick fallback metadata");
		  assert(serverSource.includes("purgeBlockedComponentReferencesFromConfig"), "homepage generation must directly purge low-scored component-library references");
		  assert(serverSource.includes("已直接杜绝"), "homepage repair actions must record direct elimination of low-scored component references");
		  assert(personalizationSource.includes("normalizeHomepageComponentReferences"), "homepage renderer must normalize top-level component-library references");
	  assert(personalizationSource.includes("dataset.componentReference"), "homepage renderer must expose component reference provenance on rendered slots");
	  assert(serverSource.includes("implementationContract"), "AI HTML generation must require per-module implementation contracts");
	  assert(serverSource.includes("无法证明 AI HTML 不是静态外观空壳"), "AI HTML quality gate must reject static shell drafts");
	  assert(serverSource.includes("质量返修得分"), "AI HTML quality repair must not replace a higher-scoring free HTML draft");
	  assert(serverSource.includes("aiHtmlResponsiveFallbackCss"), "AI HTML repair must add a responsive fallback when the model omits media rules");
	  assert(serverSource.includes("aiHtmlControlFallbackCss"), "AI HTML repair must add scoped control styles when the model leaves native buttons");
			  assert(serverSource.includes("buildCompactAiHtmlPrompt"), "DeepSeek/Kimi AI HTML calls should use a compact JSON-first prompt");
			  assert(
			    serverSource.includes("function providerUsesCompactAiHtml") &&
			      ["minimax", "deepseek", "kimi"].every((provider) => serverSource.includes(`"${provider}"`)),
			    "MiniMax, DeepSeek and Kimi should all use compact model-generated AI HTML instead of skipping HTML generation",
			  );
			  const compactAiHtmlProviderFunction = serverSource.match(/function providerUsesCompactAiHtml[\s\S]*?\n}/)?.[0] || "";
			  assert(!compactAiHtmlProviderFunction.includes('"gemini"'), "Gemini should use the full repaired AI HTML prompt so it receives richer component-library context");
			  assert(serverSource.includes("aiHtmlComponentReferenceRegion"), "AI HTML quality gate must inspect each referenced brick region, not just whole-page signals");
			  assert(serverSource.includes("score < 68"), "AI HTML should only fall back to high-score bricks when it falls below the repair floor");
			  assert(serverSource.includes("function validateHomepageConfig"), "server must validate homepage config before HTML generation");
			  assert(serverSource.includes("function repairHomepageConfig"), "server must repair homepage config before HTML generation");
			  assert(serverSource.includes("function buildHomepageModulePolicy"), "server must build modulePolicy before homepage generation");
			  assert(serverSource.includes("function validateHomepageModulePolicy"), "server must validate model output against modulePolicy");
			  assert(serverSource.includes("modulePolicyScore"), "homepage quality must include modulePolicyScore");
			  assert(serverSource.includes("buildHomepagePagePlan"), "server must create a pagePlan before final homepage assembly");
		  assert(serverSource.includes("HOMEPAGE_OPTIONAL_BLOCK_REQUEST_PATTERNS"), "optional homepage modules must preserve prompt request patterns");
		  const removedMaterialAdmissionLabel = ["素材", "准入"].join("");
		  assert(!adminHtmlSource.includes(removedMaterialAdmissionLabel), "guided builder must not render the removed material-admission section");
		  assert(!adminHtmlSource.includes('data-guided-group="materials"'), "guided builder must not expose material-admission choices");
		  assert(!adminSource.includes(removedMaterialAdmissionLabel), "guided prompt builder must not mention material admission");
		  assert(!serverSource.includes(`${removedMaterialAdmissionLabel}硬约束`), "server prompts must not inject material-admission constraints");
			  assert(serverSource.includes("pagePlan.mainVisual"), "AI HTML prompts must preserve the single visual hero from pagePlan");
			  assert(serverSource.includes("homepageRepairedConfigPromptContract"), "AI HTML prompts must receive repairedConfig sections");
			  assert(serverSource.includes("必须严格按照 repairedConfig.sections 渲染"), "AI HTML prompt must forbid adding, deleting, or reordering modules");
			  assert(serverSource.includes("homepage_ai_html_free"), "server must attempt true free AI HTML before config-backed repair for non-compact providers");
			  assert(!serverSource.includes("free raw-config HTML is disabled"), "server must not disable the free AI HTML path for full-output providers");
			  assert(serverSource.includes("isFallback: options.isFallback !== false"), "brick-backed AI HTML must be marked as fallback when it replaces model HTML");
			  assert(serverSource.includes("componentId: item.componentId"), "compact AI HTML prompts must pass real component ids from reference hints");
		  assert(serverSource.includes("requiredFamily"), "AI HTML component references must preserve the required target family for alias coverage");
		  assert(serverSource.includes("synthesizeAiHtmlImplementationContract"), "compact AI HTML repair must synthesize implementation contracts when short-output models omit them");
		  assert(serverSource.includes("AI_UI_GENERATION_PROTOCOL.md"), "AI generation must include the UI protocol governance reference");
		  assert(serverSource.includes("providerFailureSummary"), "AI HTML fallback reasons should include parse/finish diagnostics");
		  assert(adminSource.includes('"/api/home-ai/complete"'), "homepage-generate must use the home AI completion endpoint");
		  assert(!adminSource.includes("/api/auth-ai/generate"), "homepage-generate must not call the auth AI generation endpoint");
	  assert(serverSource.includes("风险披露提示条"), "RiskDisclosure skeleton component fallback must render a real risk disclosure component");
	  assert(serverSource.includes("在线客服、客户经理、服务时间和帮助入口"), "SupportContact generation must have a dedicated family contract");
		  assert(serverSource.includes("在线客服服务卡"), "SupportContact mock fallback must render a real support card");
		  assert(!serverSource.includes("<strong>${prompt}</strong>"), "component fallbacks must not paste the administrator prompt into the customer UI");
		  assert(serverSource.includes("generatedComponentViolatesFamily"), "component generation must reject family-mismatched RiskDisclosure output");
		  assert(serverSource.includes('"CopytradingSignals"'), "CopyTrading signal slots must be a dedicated component family");
		  assert(serverSource.includes('family === "CopytradingSignals"'), "component generation must reject onboarding/PAMM output for CopyTrading slots");
		  assert(adminSource.includes('copytrading_signals: "CopytradingSignals"'), "skeleton slot generation must request the CopyTrading family for signal slots");
		  assert(modulePreviewHtmlSource.includes('value="CopytradingSignals"'), "component workbench family selector must expose saved CopyTrading signal bricks");
		  assert(modulePreviewHtmlSource.includes('value="ReferralLinkCard"'), "component workbench must use ReferralLinkCard for promotion link bricks");
		  assert(!/<option\s+value="ReferralLink">/.test(modulePreviewHtmlSource), "component workbench must not create new bricks under the legacy ReferralLink family");
		  assert(serverSource.includes("function canonicalComponentFamily"), "server must canonicalize legacy component families before saving/filtering");
	  assert(adminSource.includes("interpretationRound += 1;"), "normal homepage generation must advance interpretation variant");
	  assert(serverSource.includes("applyHomepageUnderstandingToServerConfig(next, prompt, payload.variant)"), "server prompt governance must receive the generation variant");
	  assert(serverSource.includes("depositGovernedBrickPlan(payload.variant)"), "server deposit governance must preserve variant diversity");
		  assert(adminSource.includes("在线客服硬性要求"), "skeleton slot prompt must include SupportContact-specific constraints");
		  assert(adminSource.includes("isRealModelAiHtmlScheme"), "admin distinct-generation guard must preserve real model AI HTML");
	  assert(adminSource.includes("serverHtmlLooksModelGenerated"), "admin history must not mislabel model/free-html as fallback when server metadata is older");
		  assert(adminSource.includes("积木保底"), "admin history must label brick-backed AI HTML as a fallback source");
	  assert(adminSource.includes("prepareConfigForPublish"), "publishing must normalize skeleton drafts into a clean final customer config");
	  assert(personalizationCss.includes(".home-skeleton-render-host.is-published-skeleton"), "published skeleton pages must hide editor shell markers");
	  assert(personalizationSource.includes("home-skeleton-module-loading"), "generating skeleton slots must render a module-level lazy-loading placeholder");
	  assert(personalizationCss.includes(".home-skeleton-section-split .home-skeleton-slot:only-child"), "single-slot split skeleton sections must span the full row");
	  assert(personalizationCss.includes('body[data-home-preview="content-only"] > .sidebar'), "iframe previews must stay content-only");
	  assert(!personalizationCss.includes('body[data-home-published="true"] > .sidebar'), "published customer pages must keep the shared sidebar");
	  assert(!commonLayoutSource.includes('params.has("published")'), "published customer pages must still mount common chrome");
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
    const designSamplesPath = path.join(ROOT, "home-design-samples.json");
    const originalDesignSamples = fs.readFileSync(designSamplesPath, "utf8");
    try {
      const savedGolden = await requestJson(port, "/api/home-ai/design-samples", {
        sample: {
          id: "test-blackgold-vip-golden-page",
          sampleKind: "golden-page",
          name: "测试黑金 VIP 黄金首页",
          prompt: "黑金 VIP 首页，首屏突出资产、入金和专属服务。",
          scenarioTags: ["黑金 VIP", "白标资金安全"],
          pageIntent: "vip",
          visualStyle: "blackGold premium wealth desk",
          homepageConfig: {
            name: "VIP Golden",
            themePreset: "blackGold",
            layoutPreset: "privateWealthDesk",
            heroFocus: "asset_overview",
            sections: [{ id: "hero", type: "hero", slots: ["asset_overview", "quick_actions"] }],
            brickPlan: [{ brickId: "asset-overview-vip-hero", component: "asset_overview", family: "AssetOverview", size: "2x1", zone: "main" }],
          },
          renderEvidence: {
            domSnapshot: '<main class="client-home-page"><section data-home-component="asset_overview">VIP</section></main>',
            cssSummary: { themePreset: "blackGold", density: "balanced" },
            themeTokens: { "--home-primary": "#d6b56d" },
            screenshotPath: "artifacts/home-golden-samples/test-blackgold.png",
          },
          humanScore: 96,
          scoreDimensions: {
            firstScreenFocus: 9,
            informationHierarchy: 9,
            moduleBalance: 8,
            componentCraft: 9,
            financialTone: 10,
            businessTruth: 9,
            responsive: 8,
            visualConsistency: 9,
            publishability: 9,
          },
          whyGood: "首屏资产和入金层级明确，黑金质感克制。",
          applicableScenarios: ["黑金 VIP"],
          forbiddenReuse: "不要照搬演示金额或临时文案。",
        },
      });
      assert.strictEqual(savedGolden.sample.isGolden, true);
      assert.strictEqual(savedGolden.sample.sampleKind, "golden-page");
      assert.strictEqual(savedGolden.sample.renderEvidence.screenshotPath, "artifacts/home-golden-samples/test-blackgold.png");
      const rankedGolden = await requestJson(port, `/api/home-ai/design-samples?prompt=${encodeURIComponent("黑金 VIP 首页")}`);
      assert(
        rankedGolden.goldenSamples.some((sample) => sample.id === "test-blackgold-vip-golden-page"),
        "similar prompt must retrieve the saved whole-page golden sample",
      );
      assert(rankedGolden.learningSchema.scoringDimensions.includes("publishability"));

      const visualOnlyId = "test-visual-only-golden-sample";
      const savedVisualOnly = await requestJson(port, "/api/home-ai/design-samples", {
        sample: {
          id: visualOnlyId,
          sampleKind: "golden-page",
          sourceType: "visual-only",
          visualOnly: true,
          isGolden: true,
          name: "测试外部视觉黄金样本",
          prompt: "极简白开户注册首页，移动端优先。",
          scenarioTags: ["极简白", "移动端优先"],
          applicableScenarios: ["新客开户"],
          pageIntent: "onboarding",
          themePreset: "minimalWhite",
          visualStyle: "minimal white mobile onboarding",
          renderEvidence: {
            screenshotUrl: "/artifacts/home-ai-reference-assets/test-visual-only.png",
            sourceUrl: "/artifacts/home-ai-reference-assets/test-visual-only.png",
            cssSummary: { referenceAssetId: "test-reference-asset", referenceType: "image" },
          },
          humanScore: 95,
          scoreDimensions: {
            firstScreenFocus: 9,
            informationHierarchy: 9,
            moduleBalance: 8,
            componentCraft: 9,
            financialTone: 8,
            businessTruth: 9,
            responsive: 10,
            visualConsistency: 9,
            publishability: 9,
          },
          whyGood: "移动端首屏焦点清楚，信息密度克制。",
          forbiddenReuse: "不要照搬截图里的品牌素材。",
        },
      });
      assert.strictEqual(savedVisualOnly.sample.visualOnly, true);
      assert.strictEqual(savedVisualOnly.sample.configSnapshot, null);

      const retrievedVisualOnly = await requestJson(port, `/api/home-ai/design-samples?prompt=${encodeURIComponent("极简白 移动端 开户")}`);
      const visualGolden = retrievedVisualOnly.goldenSamples.find((sample) => sample.id === visualOnlyId);
      assert(visualGolden, "visual-only golden sample must be retrievable in goldenSamplePages");
      assert.strictEqual(visualGolden.visualOnly, true);
      assert.strictEqual(visualGolden.evidence.configSnapshot, null);
      assert.strictEqual(visualGolden.evidence.configSnapshotStatus, "empty-visual-reference-only");

      const patchedVisualOnly = await requestJson(
        port,
        `/api/home-ai/design-samples/${encodeURIComponent(visualOnlyId)}`,
        {
          sample: {
            sampleKind: "anti-example",
            sourceType: "sample-notes",
            visualOnly: false,
            isGolden: false,
            isAntiExample: true,
            humanScore: 64,
            aestheticScore: 64,
            scenarioTags: ["活动增长"],
            whyBad: "活动首屏焦点分散，CTA 和资产信息抢权重。",
          },
        },
        "PATCH",
      );
      const patchedSample = patchedVisualOnly.library.samples.find((sample) => sample.id === visualOnlyId);
      assert.strictEqual(patchedSample.humanScore, 64);
      assert.deepStrictEqual(patchedSample.scenarioTags, ["活动增长"]);
      assert.strictEqual(patchedSample.isAntiExample, true);

      const retrievedAnti = await requestJson(port, `/api/home-ai/design-samples?prompt=${encodeURIComponent("活动增长 首页")}`);
      assert(
        retrievedAnti.lowScoreAntiExamples.some((sample) => sample.id === visualOnlyId && sample.humanScore === 64 && sample.scenarioTags.includes("活动增长")),
        "updated low-score anti example must be reflected in retrieval results",
      );

      await requestJson(port, `/api/home-ai/design-samples/${encodeURIComponent(visualOnlyId)}`, null, "DELETE");
      const afterDelete = await requestJson(port, `/api/home-ai/design-samples?prompt=${encodeURIComponent("活动增长 极简白")}`);
      assert(!afterDelete.samples.some((sample) => sample.id === visualOnlyId), "deleted sample must not remain in full sample list");
      assert(!afterDelete.goldenSamples.some((sample) => sample.id === visualOnlyId), "deleted sample must not remain in golden retrieval");
      assert(!afterDelete.lowScoreAntiExamples.some((sample) => sample.id === visualOnlyId), "deleted sample must not remain in anti-example retrieval");
    } finally {
      fs.writeFileSync(designSamplesPath, originalDesignSamples, "utf8");
    }

    const response = await postJson(port, {
      prompt:
        "生成首页，资产概览只展示钱包余额和交易账号余额，快捷入口展示 5 个，需要 PAMM 产品推荐和 CopyTrading 信号源推荐，也要公告通知和市场资讯。不要 KYC 风控、代理数据、客服帮助。",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(response.ok, true);
	    assertOnlyAllowedBlocks(response.config);
	    assertVisibleModulesHaveMorph(response.config);
	    assertComponentReferencesApplied(response.config);
	    assertNoBlockedComponentReferences(response.config, componentLibrary);
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
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.adCarousel.enabled, true);
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.adCarousel.autoRotate, true);
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.adCarousel.slideCount, 3);
	    assert(["workbench", "calm-table", "ops-table"].includes(guidedCoreResponse.config.moduleStyles.tradingAccounts));
	    assert.strictEqual(guidedCoreResponse.config.moduleSettings.tradingAccounts.viewMode, "list");

		    const guidedPollutionResponse = await postJson(port, {
		      inputMode: "guided",
		      prompt:
		        "请生成开户引导首页，设计风格简约留白，视觉蓝色金融。快捷入口说明里可能提到联系客服，但表单没有选择在线客服，不要生成未选择的辅助模块。",
		      guidedIntake: {
		        source: "guided-builder",
		        theme: { id: "blueFinance", label: "蓝色金融", themePreset: "blueFinance" },
		        designStyle: { id: "minimalClean", label: "简约留白" },
		        canonical: {
		          primaryIntent: "onboarding",
		          layoutPreset: "onboardingJourney",
		          heroFocus: "onboarding_guide",
		          mustHave: ["asset_overview", "quick_actions", "onboarding_guide", "trading_accounts_list", "support_contact"],
		        },
		        modules: [
		          { id: "accountOverview", label: "账户概览", canonicalTargets: ["asset_overview"] },
		          { id: "quickActions", label: "快捷入口", canonicalTargets: ["quick_actions"] },
		          { id: "openingFlow", label: "新手引导", canonicalTargets: ["onboarding_guide"] },
		          { id: "tradingAccounts", label: "交易账号", canonicalTargets: ["trading_accounts_list"] },
		        ],
		      },
		      modelConfig: { provider: "openai" },
		    });
		    assert.strictEqual(guidedPollutionResponse.ok, true);
		    assertOnlyAllowedBlocks(guidedPollutionResponse.config);
		    assert.strictEqual(hasBlock(guidedPollutionResponse.config, "support_contact"), false);
		    assert.strictEqual(guidedPollutionResponse.config.moduleSettings.supportContact.enabled, false);
		    assert.deepStrictEqual(guidedPollutionResponse.config.moduleSettings.quickActions.actions, []);
		    assert.strictEqual(guidedPollutionResponse.config.themePreset, "blueFinance");
		    assert.strictEqual(guidedPollutionResponse.config.theme, "blueFinance");

			    const guidedExplicitOptionalResponse = await postJson(port, {
		      inputMode: "guided",
		      prompt:
		        "请生成开户首页；首页 Banner / 广告轮播需要展示；CopyTrading 信号源、推广链接、FAQ 和风险提示都要保留。交易账号卡片宽度适中，不要过大，希望一行至少能放4个卡片。",
		      context: { userRole: "client" },
			      guidedIntake: {
			        source: "guided-builder",
			        pageGoal: { id: "openAccount", label: "开真实账户" },
			        primaryAction: { action: "openAccount", label: "立即开户" },
			        canonical: {
			          primaryIntent: "onboarding",
			          layoutPreset: "onboardingJourney",
		          heroFocus: "onboarding_guide",
		          mustHave: ["asset_overview", "quick_actions", "onboarding_guide", "trading_accounts_list"],
		        },
		        modules: [
		          { id: "accountOverview", label: "账户概览", canonicalTargets: ["asset_overview"] },
			          { id: "quickActions", label: "快捷入口", canonicalTargets: ["quick_actions"] },
			          { id: "openingFlow", label: "新手引导", canonicalTargets: ["onboarding_guide"] },
			          { id: "tradingAccounts", label: "交易账号", canonicalTargets: ["trading_accounts_list"] },
			        ],
			      },
		      modelConfig: { provider: "openai" },
		    });
		    assert.strictEqual(guidedExplicitOptionalResponse.ok, true);
		    assertOnlyAllowedBlocks(guidedExplicitOptionalResponse.config);
		    assert.strictEqual(hasBlock(guidedExplicitOptionalResponse.config, "promo_banner"), true);
		    assert.strictEqual(hasBlock(guidedExplicitOptionalResponse.config, "copytrading_signals"), true);
		    assert.strictEqual(hasBlock(guidedExplicitOptionalResponse.config, "referral_link_card"), true);
		    assert.strictEqual(hasBlock(guidedExplicitOptionalResponse.config, "faq_section"), true);
		    assert.strictEqual(hasBlock(guidedExplicitOptionalResponse.config, "risk_disclosure"), true);
		    assert.strictEqual(guidedExplicitOptionalResponse.config.modulePolicy.blockedModules.includes("referral_link_card"), false);
		    assert.strictEqual(guidedExplicitOptionalResponse.config.moduleSettings.referralLinkCard.enabled, true);
		    assert.strictEqual(guidedExplicitOptionalResponse.config.moduleSettings.tradingAccounts.grouping, "combined");
		    assert.strictEqual(guidedExplicitOptionalResponse.config.moduleSettings.tradingAccounts.viewMode, "card");
		    assert.strictEqual(guidedExplicitOptionalResponse.config.moduleSettings.tradingAccounts.preferredColumns, 4);

			    const modulePolicyBlockedResponse = await postJson(port, {
		      inputMode: "guided",
		      prompt: "请生成开户首页；没有 FAQ 内容不要生成 FAQ，不要生成风险提示，也不要生成推广链接。",
		      context: { userRole: "client" },
			      guidedIntake: {
			        source: "guided-builder",
			        pageGoal: { id: "openAccount", label: "开真实账户" },
			        primaryAction: { action: "openAccount", label: "立即开户" },
			        canonical: {
			          primaryIntent: "onboarding",
			          layoutPreset: "onboardingJourney",
		          heroFocus: "onboarding_guide",
		          mustHave: ["asset_overview", "quick_actions", "onboarding_guide", "trading_accounts_list", "faq_section", "risk_disclosure", "referral_link_card"],
		        },
		        modules: [
		          { id: "accountOverview", label: "账户概览", canonicalTargets: ["asset_overview"] },
			          { id: "quickActions", label: "快捷入口", canonicalTargets: ["quick_actions"] },
			          { id: "openingFlow", label: "新手引导", canonicalTargets: ["onboarding_guide"] },
			          { id: "tradingAccounts", label: "交易账号", canonicalTargets: ["trading_accounts_list"] },
			          { id: "faq", label: "FAQ", canonicalTargets: ["faq_section"] },
			          { id: "riskDisclosure", label: "风险提示", canonicalTargets: ["risk_disclosure"] },
			          { id: "referralLink", label: "推广链接", canonicalTargets: ["referral_link_card"] },
			        ],
			      },
		      modelConfig: { provider: "openai" },
		    });
		    assert.strictEqual(modulePolicyBlockedResponse.ok, true);
		    assertOnlyAllowedBlocks(modulePolicyBlockedResponse.config);
		    assert.strictEqual(hasBlock(modulePolicyBlockedResponse.config, "faq_section"), false);
		    assert.strictEqual(hasBlock(modulePolicyBlockedResponse.config, "risk_disclosure"), false);
		    assert.strictEqual(hasBlock(modulePolicyBlockedResponse.config, "referral_link_card"), false);
		    assert(modulePolicyBlockedResponse.modulePolicy.blockedModules.includes("faq_section"));
		    assert(modulePolicyBlockedResponse.modulePolicy.blockedModules.includes("risk_disclosure"));
		    assert(modulePolicyBlockedResponse.modulePolicy.blockedModules.includes("referral_link_card"));
		    assert(modulePolicyBlockedResponse.repairActions.some((action) => action.includes("modulePolicy")));
		    assert(modulePolicyBlockedResponse.validationWarnings.some((warning) => warning.includes("modulePolicy removed")));
		    assert(modulePolicyBlockedResponse.modulePolicyScore < 100);
		    assert(modulePolicyBlockedResponse.qualityScore <= modulePolicyBlockedResponse.modulePolicyScore);

		    const systemRequiredRiskResponse = await postJson(port, {
		      inputMode: "guided",
		      prompt: "开户首页，不要生成风险提示；但当前租户合规要求固定展示风险披露。",
		      context: { userRole: "client", riskDisclosureRequired: true },
		      guidedIntake: {
		        source: "guided-builder",
		        pageGoal: { id: "openAccount", label: "开真实账户" },
		        canonical: {
		          primaryIntent: "onboarding",
		          layoutPreset: "onboardingJourney",
		          heroFocus: "onboarding_guide",
		          mustHave: ["asset_overview", "quick_actions", "onboarding_guide", "trading_accounts_list"],
		        },
		        modules: [
		          { id: "accountOverview", label: "账户概览", canonicalTargets: ["asset_overview"] },
		          { id: "quickActions", label: "快捷入口", canonicalTargets: ["quick_actions"] },
		          { id: "openingFlow", label: "新手引导", canonicalTargets: ["onboarding_guide"] },
		          { id: "tradingAccounts", label: "交易账号", canonicalTargets: ["trading_accounts_list"] },
		        ],
		      },
		      modelConfig: { provider: "openai" },
		    });
		    assert.strictEqual(systemRequiredRiskResponse.ok, true);
		    assert.strictEqual(hasBlock(systemRequiredRiskResponse.config, "risk_disclosure"), true);
		    assert(systemRequiredRiskResponse.modulePolicy.systemRequiredModules.includes("risk_disclosure"));
		    assert.strictEqual(systemRequiredRiskResponse.modulePolicy.blockedModules.includes("risk_disclosure"), false);
		    assert.strictEqual(systemRequiredRiskResponse.config.sections.at(-1).slots.includes("risk_disclosure"), true);

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
			    assert.strictEqual(guidedAccountOverviewResponse.config.themePreset, "blueFinance");
			    assert.strictEqual(guidedAccountOverviewResponse.config.theme, "blueFinance");
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
    assert.strictEqual(guidedResponse.config.moduleSettings.riskDisclosure.demoFallback, true);
    assert(Array.isArray(guidedResponse.config.moduleSettings.riskDisclosure.demoCopy));
    assert(guidedResponse.config.moduleSettings.riskDisclosure.demoCopy.length >= 3);
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
	    await assertServerVariantDiversity(port, proTraderCostPrompt, 3);
	    await assertServerVariantDiversity(port, growthDepositVariantPrompt, 2);

	    const professionalKycResponse = await postJson(port, {
      prompt:
        "tier=professional 专业版首页，heroFocus=asset_overview，必须有资产概览、账号表现、交易账号列表、推广链接；CRM 账户 KYC 状态：未提交、待审、通过、拒绝；只展示当前状态，未提交时展示去提交按钮，拒绝时展示再次提交。",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(professionalKycResponse.ok, true);
    assertOnlyAllowedBlocks(professionalKycResponse.config);
    assert.strictEqual(hasBlock(professionalKycResponse.config, "asset_overview"), true);
    assert.strictEqual(hasBlock(professionalKycResponse.config, "trading_account_highlight"), true);
    assert.strictEqual(hasBlock(professionalKycResponse.config, "trading_accounts_list"), true);
    assert.strictEqual(hasBlock(professionalKycResponse.config, "referral_link_card"), true);
    assert.strictEqual(hasBlock(professionalKycResponse.config, "kyc_status_card"), true);
    assert.notStrictEqual(professionalKycResponse.config.layoutPreset, "onboardingJourney");
    assert.strictEqual(professionalKycResponse.config.moduleSettings.userKycRail.enabled, true);
    assert.strictEqual(professionalKycResponse.config.moduleSettings.userKycRail.kycStatus, "verified");
    const assetSectionIndex = (professionalKycResponse.config.sections || []).findIndex((section) => section.slots?.includes("asset_overview"));
    const onboardingSectionIndex = (professionalKycResponse.config.sections || []).findIndex((section) => section.slots?.includes("onboarding_guide"));
    assert(assetSectionIndex >= 0 && assetSectionIndex <= 1, "asset overview must be in the first two core sections when heroFocus=asset_overview");
    if (onboardingSectionIndex >= 0) assert(assetSectionIndex < onboardingSectionIndex, "asset overview must appear before onboarding guide");
    assert(Array.isArray(professionalKycResponse.productWarnings), "response should include productWarnings");
    assert.strictEqual(professionalKycResponse.productWarnings.includes("professional tier was converted to onboarding layout"), false);
    assert.strictEqual(professionalKycResponse.productWarnings.includes("referral_link_card was mentioned but not selected"), false);
    assert.strictEqual(professionalKycResponse.productWarnings.includes("kyc_status was mentioned but not rendered"), false);

    const agentReferralResponse = await postJson(port, {
      prompt: "生成专业版客户首页，突出资产概览、快捷操作和交易账号列表。",
      context: { userRole: "agent", tenant: { features: ["referral"] } },
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(agentReferralResponse.ok, true);
    assertOnlyAllowedBlocks(agentReferralResponse.config);
    assert.strictEqual(hasBlock(agentReferralResponse.config, "referral_link_card"), true);
    assert.strictEqual(agentReferralResponse.config.moduleSettings.referralLinkCard.enabled, true);

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
		    assert(aiHtmlResponse.validation, "server response must include homepage config validation");
		    assert(Array.isArray(aiHtmlResponse.repairActions), "server response must include repair actions");
		    assert(Number.isFinite(aiHtmlResponse.qualityScore), "server response must include final quality score");
		    assert(["publishable", "needs-polish", "needs-repair", "fallback"].includes(aiHtmlResponse.quality.status), "server response must expose mapped quality.status");
		    assert.strictEqual(aiHtmlResponse.htmlQualityStatus, aiHtmlResponse.quality.status);
		    assert.strictEqual(aiHtmlResponse.config.htmlQualityStatus, aiHtmlResponse.quality.status);
			    assertLegalHomepageSections(aiHtmlResponse.config);
			    assertComponentReferencesApplied(aiHtmlResponse.config);
			    assertNoBlockedComponentReferences(aiHtmlResponse.config, componentLibrary);
			    assert.strictEqual(aiHtmlResponse.validation.invalidSections.length, 0);
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
				    ["onboarding_guide", "pamm_products", "app_download", "referral_link_card", "faq_section", "support_contact", "risk_disclosure"].forEach((moduleId) => {
		      assert(
		        aiHtmlResponse.htmlScheme.implementationContract.some((contract) => contract.module === moduleId),
		        `AI HTML required module must include ${moduleId}`,
			      );
			      assert(aiHtmlResponse.htmlScheme.html.includes(`data-ai-html-module="${moduleId}"`), `AI HTML must visibly render ${moduleId}`);
			    });
		    assert.strictEqual(hasBlock(aiHtmlResponse.config, "referral_link_card"), true);
		    assert.strictEqual(aiHtmlResponse.modulePolicy.blockedModules.includes("referral_link_card"), false);
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

    const skeletonResponse = await postJson(port, {
      prompt: "生成一个开户引导首页，使用骨架 HTML 填充方式预览，保留资产概览、快捷入口和交易账号。",
      renderMode: "skeletonHtml",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(skeletonResponse.ok, true);
    assert.strictEqual(skeletonResponse.renderMode, "skeletonHtml");
    assert.strictEqual(skeletonResponse.activeRenderMode, "skeletonHtml");
    assert.strictEqual(skeletonResponse.config.renderMode, "skeletonHtml");
    assert.strictEqual(skeletonResponse.config.activeRenderMode, "skeletonHtml");
    assert.strictEqual(skeletonResponse.config.htmlGenerationEnabled, false);
    assert.strictEqual(skeletonResponse.config.skeletonHtmlEnabled, true);
    assert.strictEqual(Boolean(skeletonResponse.config.htmlScheme), false, "skeleton mode must not reuse the AI HTML scheme payload");
    assert.strictEqual(skeletonResponse.callRecord.configSnapshot.renderMode, "skeletonHtml");

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
