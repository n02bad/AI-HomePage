// 两阶段首页生成（骨架 HTML + 逐槽组件并发）回归测试。
// 用 HOME_AI_MOCK=true + HOME_AI_TWO_STAGE=true 起服务，断言确定性两阶段产物的关键契约：
//   - renderMode=skeletonHtml 时输出 skeletonHtmlScheme（走既有渲染路径）
//   - 骨架含 data-home-skeleton-slot 占位；slotComponents 按 brick 填齐
//   - 每个片段带 data-ai-html-module、token 合规（无裸色值）、声明式 data-action
//   - 必选模块（guided mustHave）全部出现在 slotComponents（验证阶段0修复 + 两阶段覆盖）
const assert = require("assert");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

function postJson(port, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: "/api/home-ai/complete", method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch (error) { reject(new Error(`bad json: ${error.message}: ${data.slice(0, 200)}`)); }
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function waitForServer(child, port) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timed out")), 8000);
    child.stdout.on("data", (chunk) => { if (String(chunk).includes(`127.0.0.1:${port}`)) { clearTimeout(timer); resolve(); } });
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));
    child.on("exit", (code) => reject(new Error(`server exited before start: ${code}`)));
  });
}

// 片段 CSS 去掉 var() 与 :root 变量定义后，不应再出现裸色值。
function fragmentBareColorViolations(css) {
  return (String(css || "").replace(/var\([^)]*\)/g, "").match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) || []).length;
}

async function run() {
  const port = 5198;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOME_AI_MOCK: "true", HOME_AI_TWO_STAGE: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForServer(child, port);
    const mustHave = ["asset_overview", "quick_actions", "onboarding_guide", "trading_accounts_list", "faq_section", "referral_link_card"];
    const response = await postJson(port, {
      prompt: "开户首页，必须有资产概览、快捷入口、新手引导、交易账号列表、FAQ、推广链接",
      renderMode: "skeletonHtml",
      inputMode: "guided",
      guidedIntake: {
        source: "guided-builder",
        pageGoal: { id: "openAccount" },
        canonical: { primaryIntent: "onboarding", heroFocus: "onboarding_guide", mustHave },
        modules: mustHave.map((target, i) => ({ id: `m${i}`, canonicalTargets: [target] })),
      },
      modelConfig: { provider: "openai" },
    });

    assert.strictEqual(response.ok, true, "response ok");
    const scheme = response.skeletonHtmlScheme || response.config?.skeletonHtmlScheme;
    assert(scheme && scheme.enabled, "skeletonHtmlScheme 应启用");
    assert.strictEqual(scheme.generationPipeline, "two-stage-skeleton", "管线应为 two-stage-skeleton");
    assert(/data-home-skeleton-slot/.test(scheme.skeletonHtml || scheme.html || ""), "骨架应含 data-home-skeleton-slot 占位");

    const slotComponents = scheme.slotComponents || {};
    // 必选模块全部进入 slotComponents（阶段0 mustHave 修复 + 两阶段覆盖）
    mustHave.forEach((brick) => {
      assert(slotComponents[brick] && slotComponents[brick].html, `必选模块 ${brick} 应有 slotComponent`);
    });

    Object.entries(slotComponents).forEach(([brick, comp]) => {
      assert(/data-ai-html-module=/.test(comp.html), `${brick} 片段应带 data-ai-html-module`);
      assert.strictEqual(fragmentBareColorViolations(comp.css), 0, `${brick} 片段 CSS 不应有裸色值（须用 --home-* 变量）`);
      assert(!/<script|\son[a-z]+\s*=/i.test(comp.html), `${brick} 片段不应含 script/内联事件`);
    });

    // 至少有一个带交互的片段声明了 data-action（交互原语）
    const hasDeclaredInteraction = Object.values(slotComponents).some((comp) => /data-action=/.test(comp.html));
    assert(hasDeclaredInteraction, "应至少有一个片段声明 data-action 交互");

    console.log("home-two-stage.test.js: all assertions passed");
  } finally {
    child.kill();
  }
}

run().catch((error) => { console.error(error); process.exit(1); });
