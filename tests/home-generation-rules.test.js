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

  assertOnlyAllowedBlocks(home.DEFAULT_CONFIG);
  assert.strictEqual(hasBlock(home.DEFAULT_CONFIG, "referral_link_card"), false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(home.DEFAULT_CONFIG.moduleSettings.quickActions.actions)), []);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(home.DEFAULT_CONFIG.moduleSettings.assets.visibleFields)), ["total", "wallet", "tradingAccount"]);
  assert.strictEqual(home.DEFAULT_CONFIG.moduleSettings.referralLinkCard.enabled, false);

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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(normalized.moduleSettings.assets.visibleFields)), ["wallet"]);

  const localOrdinary = home.promptToConfig("普通客户首页，展示资产概览、快捷入口和交易账号列表，不要代理数据、KYC 风控或客服帮助。");
  assertOnlyAllowedBlocks(localOrdinary);
  assert.strictEqual(hasBlock(localOrdinary, "referral_link_card"), false);
  assert.strictEqual(localOrdinary.moduleSettings.referralLinkCard.enabled, false);

  const localReferral = home.promptToConfig("IB 代理用户首页，只展示推广链接、邀请码和复制按钮，不展示统计、返佣、团队层级或完整代理数据。");
  assertOnlyAllowedBlocks(localReferral);
  assert.strictEqual(hasBlock(localReferral, "referral_link_card"), true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.enabled, true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.showPromoLink, true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.showInviteCode, true);
  assert.strictEqual(localReferral.moduleSettings.referralLinkCard.showStats, false);

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
    assert.deepStrictEqual(response.config.moduleSettings.assets.visibleFields, ["wallet", "tradingAccount"]);
    assert.strictEqual(response.config.moduleSettings.quickActions.count, 5);
    assert.deepStrictEqual(response.config.moduleSettings.quickActions.actions, []);
    assert.strictEqual(response.config.moduleSettings.pamm.enabled, true);
    assert.strictEqual(response.config.moduleSettings.copytrading.enabled, true);
    assert.strictEqual(response.config.moduleSettings.referral.enabled, false);
    assert.strictEqual(response.config.moduleSettings.referralLinkCard.enabled, false);
    assert.strictEqual(response.config.moduleSettings.riskNotice.enabled, false);
    assert.strictEqual(hasBlock(response.config, "referral_link_card"), false);

    const referralCoreResponse = await postJson(port, {
      prompt:
        "生成 IB 代理用户首页，允许展示轻量 referral_link_card，只展示推广链接、邀请码、复制推广链接按钮和复制邀请码按钮。不要返佣、团队层级、下级客户列表或完整代理数据区。",
      modelConfig: { provider: "openai" },
    });
    assert.strictEqual(referralCoreResponse.ok, true);
    assertOnlyAllowedBlocks(referralCoreResponse.config);
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
