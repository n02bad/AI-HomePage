// 升级 #6：黄金对比自动门禁测试。确保配色/结构/CTA 三个维度能区分合格与不合格的首页配置，
// 同时回归 #1（颜色入库收敛）、#3（版式原型重排）、#4（积木尺寸适配）的纯函数。
const assert = require("assert");
const server = require("../server");

const {
  evaluateGoldenAlignment,
  enforceGoldenThemeOnCss,
  normalizeBrickContentForIngestion,
  reorderHomepageSectionsByArchetype,
  validateBrickFit,
} = server;

function run() {
  // #6 golden alignment: 合格配置应高分、不合格应被门禁拦下
  const goodConfig = {
    layoutPreset: "onboardingJourney",
    sections: [
      { slots: ["welcome_header"] },
      { slots: ["onboarding_guide"] },
      { slots: ["asset_overview"] },
      { slots: ["trading_accounts_list"] },
      { slots: ["risk_disclosure"] },
    ],
    skeletonHtmlScheme: {
      slotComponents: {
        a: { css: ".x{color:var(--home-primary);background:var(--home-card-bg)}", html: '<button data-home-action="deposit">入金</button>' },
      },
    },
  };
  const badConfig = {
    layoutPreset: "onboardingJourney",
    sections: [
      { slots: ["risk_disclosure"] },
      { slots: ["trading_accounts_list"] },
      { slots: ["welcome_header"] },
      { slots: ["asset_overview"] },
    ],
    skeletonHtmlScheme: {
      slotComponents: {
        a: { css: ".x{color:#14b8a6;background:#10b981}", html: '<button data-home-action="deposit">入金</button><a data-home-action="deposit">入金</a>' },
      },
    },
  };

  const good = evaluateGoldenAlignment(goodConfig);
  const bad = evaluateGoldenAlignment(badConfig);
  assert.ok(good.score >= 85, `合格配置应高分，实际 ${good.score}`);
  assert.strictEqual(good.issues.length, 0, "合格配置不应有门禁问题");
  assert.ok(bad.score < 75, `不合格配置应被压低，实际 ${bad.score}`);
  assert.ok(bad.metrics.offBrandColors >= 2, "应检测到非主题色字面量");
  assert.ok(bad.metrics.primaryActions >= 2, "应检测到重复主 CTA");
  assert.ok(bad.breakdown.structureAlignment < 100, "应检测到 section 顺序偏离");

  // #1 颜色入库收敛 + 动作语义 + 根标记
  const ingested = normalizeBrickContentForIngestion(
    '<div class="card"><button>立即入金</button></div>',
    ".card{background:#14b8a6;border:1px solid #0f766e}",
    "AssetOverview",
  );
  assert.ok(!/#14b8a6|#0f766e/i.test(ingested.css), "青绿字面量应被收敛");
  assert.ok(/var\(--home-/.test(ingested.css), "应使用主题 token");
  assert.ok(/data-brick-root="1"/.test(ingested.html), "最外层应标注 data-brick-root");
  assert.ok(ingested.actions.includes("deposit"), "应抽出 deposit 动作");
  // 语义色保留
  assert.ok(/#16a34a/i.test(enforceGoldenThemeOnCss(".up{color:#16a34a}")), "成功绿应保留");

  // #3 版式原型重排：打乱后应回到 首屏前置 / 法务收尾
  const scrambled = {
    layoutPreset: "onboardingJourney",
    sections: [
      { id: "s-risk", slots: ["risk_disclosure"] },
      { id: "s-welcome", slots: ["welcome_header"] },
      { id: "s-assets", slots: ["asset_overview"] },
    ],
  };
  reorderHomepageSectionsByArchetype(scrambled, []);
  assert.strictEqual(scrambled.sections[0].id, "s-welcome", "welcome 应排到最前");
  assert.strictEqual(scrambled.sections[scrambled.sections.length - 1].id, "s-risk", "风险披露应收尾");

  // #4 积木尺寸适配
  assert.strictEqual(validateBrickFit("3x1", { size: "3x1" }).fits, true, "同尺寸应合身");
  const misfit = validateBrickFit("3x1", { size: "1x1" });
  assert.strictEqual(misfit.fits, false, "3x1 槽位放 1x1 积木应判定不合身");
  assert.ok(misfit.reflowSize, "不合身应给出 reflowSize");

  console.log("home-golden-alignment.test.js: all assertions passed");
}

run();
