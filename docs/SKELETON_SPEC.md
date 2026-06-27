# SKELETON_SPEC.md — 首页骨架语法与来源（Step 1）

> 配合 `CLAUDE.md` 第 4 节（layout 现状）与 `docs/PROJECT_MAP.md` 第 3.3 节（layout 锚点）阅读。
> 目标：把"骨架"从软提示/事后修补，提级为**规划阶段先定、内容后填的硬产物**，并支持三来源（floor / golden / ai）。
> 行号为撰写时快照，可能漂移，以同名函数 grep 为准。

---

## 0. 为什么需要它（机器根因）

`server.js` 的 `splitLargeHomepageSections`（[server.js:848](../server.js)）会把**任何包含 LARGE 块的配对拆成纵向 full 行**。
因此模型即便想做左右布局，只要把大块塞进 split，事后修复就会把它拉直 → 这是"全纵向堆叠"的确定性根因，而非模型能力问题。

**能在最终渲染中存活的横向布局只有两类：**

| 机制 | 条件 | 结果 | 何处生效 |
|---|---|---|---|
| ① 服务端栅格 | `hero`/`split` 放**两个非 LARGE 块** | `[8,4]` / `[6,6]` | 服务端 `brickBackedSlotSpans`（[server.js:10365](../server.js)） |
| ② 客户端配对 | `WIDE_PAIRABLE` 块紧邻一个 `COMPACT_COMPANION` 块 | `[8,4]` | 客户端 renderer（dd93fb4 提交） |

骨架设计**必须只用这两类配对**，否则横向意图会被 `repairHomepageSectionLegality`（[server.js:1263](../server.js)）拆掉。

---

## 1. 模块分类（约束骨架的硬事实）

来自 [server.js:770](../server.js) 起的常量：

- **LARGE_FULL_ROW**（独占整行，配对会被拆）：`trading_accounts_list`、`copytrading_signals`、`trading_account_highlight`、`onboarding_guide`、`promo_banner`、`pamm_products`、`wallet_list`
- **WIDE_PAIRABLE**（LARGE 子集，可与 compact 客户端配对成 [8,4]）：`trading_account_highlight`、`onboarding_guide`、`promo_banner`、`pamm_products`
- **COMPACT_COMPANION**（可作 4 列伴随）：`faq_section`、`app_download`、`support_contact`、`announcements`、`market_news`、`referral_link_card`、`kyc_status_card`
- **非 LARGE 且可自由分栏**：`asset_overview`、`quick_actions`、`welcome_header`、`announcements`、`market_news`、`faq_section`、`support_contact`、`app_download`、`referral_link_card`、`kyc_status_card`、`risk_disclosure`
- **永远不降级为 4 列伴随**（刻意排除）：`asset_overview`、`quick_actions`

---

## 2. 骨架语法 Schema（三来源共用的封闭词汇）

```jsonc
sectionSkeleton = {
  skeletonId: "floor-accountOps-v1",
  source: "floor" | "golden" | "ai",
  goal: "asset",
  rows: [
    {
      type: "hero" | "full" | "split" | "rail",   // 复用已有 section 类型
      pair: "server" | "client" | "",              // 该行横向来自机制①还是②；"" = 纵向 full
      slots: [
        { role, prefer?, main? }                   // 语义角色 + 可选默认模块 + 主视觉标记
      ]
    }
  ]
}
```

字段约束（校验器强制）：

| 字段 | 取值 | 说明 |
|---|---|---|
| `type` | `hero`/`full`/`split`/`rail` | 渲染层已支持 |
| `role` | `primary`/`proof`/`support`/`secondary`/`decision`/`compliance` | 语义角色，不绑模块 |
| `main` | bool，全骨架**有且仅一个** | 主视觉槽，必须落在 row 1-2 |
| `prefer` | 可选，canonical 模块 id | floor 用它给默认模块；golden/ai 可省，填充阶段按 role + visualHierarchy 补 |
| `pair=server` | 该行 2 slot 且均非 LARGE | 产 `hero[8,4]` / `split[6,6]` |
| `pair=client` | 该行后紧跟一个 WIDE+COMPACT 相邻对 | 渲染期客户端配对 [8,4] |

> `prefer` 让 floor 既是安全默认又不锁死：填充阶段若 `prefer` 模块被选中且 `homepagePolicyAllowsSlot` 通过则放它，否则按 `role` 补；golden/ai 来源只产 `role`，模块选择全留给填充阶段。

---

## 3. 五套 Floor 骨架（来源 C）

`▓` = 主视觉槽（main）；`🔒` = 合规锁定；`══` = 服务端 split/hero（机制①）；`╌╌` = 客户端 WIDE+COMPACT 相邻配对（机制②）。

### 3.1 `asset` / 默认 — 账户运营控制台 accountOps
```
row1 hero   ══ ▓ asset_overview [8]  │  quick_actions [4]
row2 full      trading_account_highlight (WIDE) ╌╮ 客户端 [8,4]
row3 full      announcements (COMPACT)           ╌╯
row4 split  ══ market_news [6]  │  faq_section [6]
row5 full      trading_accounts_list
row6 full   🔒 risk_disclosure
```

### 3.2 `deposit` — 入金转化优先 conversionFirst
```
row1 hero   ══ ▓ asset_overview [8]  │  kyc_status_card [4]
row2 full      quick_actions  (入金强调 CTA，整横栏放大)
row3 full      promo_banner (WIDE) ╌╮ 客户端 [8,4]
row4 full      support_contact (COMPACT) ╌╯
row5 split  ══ faq_section [6]  │  app_download [6]
row6 full   🔒 risk_disclosure
```

### 3.3 `openAccount` — 新客开户旅程 onboardingJourney
```
row1 full      ▓ onboarding_guide (WIDE) ╌╮ 客户端 [8,4]
row2 full      kyc_status_card (COMPACT)  ╌╯
row3 split  ══ asset_overview [6]  │  quick_actions [6]
row4 full      trading_accounts_list
row5 split  ══ faq_section [6]  │  support_contact [6]
row6 full   🔒 risk_disclosure
```

### 3.4 `trading` / `startTrading` — 交易指挥台 tradingCommand
```
row1 full      ▓ trading_account_highlight (WIDE) ╌╮ 客户端 [8,4]
row2 full      announcements (COMPACT)             ╌╯
row3 split  ══ asset_overview [6]  │  quick_actions [6]
row4 full      trading_accounts_list
row5 split  ══ market_news [6]  │  app_download [6]
row6 full   🔒 risk_disclosure
```

### 3.5 `copytrading` / `pamm` — 机会/产品市场 opportunities
```
row1 full      ▓ <copytrading_signals | pamm_products> (WIDE) ╌╮ 客户端 [8,4]
row2 full      referral_link_card (COMPACT)                    ╌╯
row3 split  ══ asset_overview [6]  │  quick_actions [6]
row4 full      <pamm_products | copytrading_signals>  (另一个产品)
row5 split  ══ announcements [6]  │  market_news [6]
row6 full   🔒 risk_disclosure
```

> 五套统一满足：主视觉在 row 1-2、≥2 个横向行（≥1 个服务端 split 保证可在 `/api/home-ai/candidates` 服务端输出里检出）、`risk_disclosure` 锁定末行、行数 ∈ [3,6]（按可见模块裁剪后）。

---

## 4. 统一校验器（三来源都过）

### 4.1 语法 snap（确定性，不调模型）
1. `split`/`hero` 若含 LARGE 块 → 拆行（对齐 `splitLargeHomepageSections`），并把横向意图降级标记。
2. `type` 与 slot 数不匹配 → 重判 type（复用 `normalizeHomepageSectionType` [server.js:937](../server.js)）。
3. 非白名单 `type`/`role` → 拒绝该来源，降级到 floor。

### 4.2 骨架 critic（确定性打分，仿 `evaluateSkeletonSlotQuality` [server.js:9238](../server.js)）

| 规则 | 严重度 | 对治 |
|---|---|---|
| `main` 槽唯一且在 row 1-2 | blocking | 主视觉焦点 |
| **≥1 个机制①横向行**（服务端可检出） | blocking | **全纵向堆叠** |
| `risk_disclosure` 存在且为末行 full | blocking | 合规锁定 |
| 行数 ∈ [3,6] | repair | 过长/过短 |
| 无相邻同型大色块、无孤儿 rail | repair | 视觉节奏 |
| 不达标 → 退 floor，或触发来源 B 一次重试 | — | 永不开天窗 |
| **salvage**：零 server 横向行且存在 ≥2 个非 LARGE 单槽 full 行 → 合并前两个成 `split[6,6]` | repair | 稀疏模块集也保证横向（仅 1 个非 LARGE 时诚实报 `needs-floor`） |

> **实现状态（来源 C，已落地）**：`HOMEPAGE_SKELETON_FLOOR_TEMPLATES` + `HOMEPAGE_GOAL_TO_SKELETON_FLOOR` + `buildHomepageFloorSkeleton()` + `validateHomepageSectionSkeleton()` 已在 `server.js` 实现（`buildHomepagePagePlan` 前）；`pagePlan.sectionSkeleton` 已输出，compositionRules 注入权威骨架规则，prompt 序列化器（`pageDesignContextForPrompt` ~3292）已带 `sectionSkeleton.sectionContract`。三个函数已加入 `module.exports` 便于门禁测试。
> **Step 2/3 两阶段编排（已落地）**：
> - `homepageModuleTier(module)` + `HOMEPAGE_TIER_A_MODULES`：Tier A（资金/账户数据/合规，11 个模块）只走积木；其余 Tier B 可走 AI 组件。
> - `homepageSkeletonPreview(payload)` → `POST /api/home-ai/skeleton`：阶段1，确定性、零 LLM，返回带 tier/span/main 标注的 rows，供前端直接渲染线框预览。
> - `fillHomepageSkeleton(payload)` → `POST /api/home-ai/fill`：阶段2，Tier A 槽走积木（瞬时），Tier B 槽并行 `callComponentProvider`（mock/失败回退积木），产出 `slotComponents`（经 `sanitizeAiHtmlMarkup` + `enforceGoldenThemeOnCss`）。
> - 三个函数已加入 `module.exports`。
>
> **组件生成 prompt 去重（已落地，2026-06）**：`buildComponentPrompt`（[server.js:11433](../server.js)）system 从 32 行压到 21 行（合并"漂亮非装饰/参考高分积木/铺满宽度"三簇重复，硬安全约束一条不删）；user 去掉与 system 重复的治理摘要块，只留 `forbidden` 清单。
>
> **fill 接入渲染（已落地）**：`assembleFilledSkeletonRenderConfig(payload, filled)` 把填充结果组装成可渲染 config 并挂在 `/fill` 返回的 `config` 字段：
> - `config.sections` = 骨架 sections（决定布局/栅格）；客户端 `buildSkeletonHtmlScheme` 从 `config.sections` 生成 skeletonHtml 栅格。
> - `config.skeletonHtmlScheme = { enabled, slots, slotComponents }`：Tier B 的 AI 组件按 module 进 `slotComponents`；Tier A 槽无 slotComponent → 客户端 `renderSkeletonHtmlScheme`（[home-personalization.js:13642](../home-personalization.js)）自动回退 `renderSlot` 渲积木。
> - `renderMode/activeRenderMode = "skeletonHtml"`；主题/moduleSettings/积木脚手架复用确定性的 `mockHomepageConfig`（零真实 LLM）。
> - 行级混合已验证：如 `split:quick_actions(Tier A 积木)+faq_section(Tier B AI)` 同行分别渲染。
>
> **来源 A（黄金抽取）+ B（AI 合成）已落地**：
> - 黄金样本**不带结构化 sections**（`homepageConfig`/`configSnapshot` 为空），但带 `sampleBlocks`（有序 + `page` 区位）和 `functions`（name→canonical `modules`）。
> - `buildHomepageGoldenSkeleton(payload, pagePlan?)`（来源 A）：`rankGoldenDesignSamplesForPrompt` 选样 → 从 `sampleBlocks`/`functions` 抽取**模块组成 + 顺序 + 首屏焦点**（与 `visibleModules` 交集）→ `packModulesIntoSkeletonRows` 通用打包器 → `validateHomepageSectionSkeleton`；不达标回退 floor。返回带 `goldenSampleId/Name`。
> - `buildHomepageAiSkeleton(payload, pagePlan?)`（来源 B，async）：`requestAndParseProviderJson` + `HOMEPAGE_SKELETON_AI_SCHEMA` 只让模型产**骨架语法**（rows×{type,slots:{module,role}}，含横向/LARGE/main/risk 硬规则）→ 强制 main=pagePlan.mainVisual → 同一校验器；mock / 缺 key / 失败 / 未过校验都回退 floor（`source="ai-fallback-floor"` + `aiFallbackReason`）。
> - `packModulesIntoSkeletonRows(modules, mainVisual, firstScreen)`：通用打包器，连续非 LARGE→hero/split，LARGE→full（后接 compact 标 client 配对），risk 收尾。
> - 选择入口：`payload.skeletonSource ∈ {floor(默认)|golden|ai}`，`/api/home-ai/skeleton` 与 `/fill` 均已支持（ai 异步预构，floor/golden 同步 `resolveHomepageSkeletonSync`）。
> - 三来源 HTTP 端到端验证通过；golden 产出与 floor 不同的派生顺序（如命中"入金转化版 · 钱包hero+三步引导+账号表格"）。
>
> **渲染一致性/左右布局修复（已落地，2026-06，浏览器验证）**：
> - 阴影一致性：`enforceGoldenThemeOnCss`（[server.js](../server.js)）新增 box-shadow 收编——drop shadow 统一到 `var(--home-card-shadow)`，保留 none/inset。修复后整页只剩 1 种卡片阴影（此前 AI 组件各带各的，跨生成轻重不一）。
> - 左右布局真渲出：根因是 client `skeletonSlotSizeForGrid`（[home-personalization.js](../home-personalization.js)）对 split 行给每个 slot 都 `2x1`(span8) → 8+8=16 溢出折行，且 asset_overview 硬编码 3x1 全宽永不配对。已改为按行内 slot 数/索引给互补跨列（2 slot→[8,4]，3→[4,4,4]），`skeletonSlotRecord` 传入 index+slotCount。
> - `assembleFilledSkeletonRenderConfig` 按行内 slot 数给 slot `size`（单 slot 全宽、2 slot→2x1+1x1），让 `/fill` config 的 slot 跨列与骨架一致。
>
> **未落地（下一步）**：① 前端 UI 入口（POST `/skeleton`+`/fill` → 渲染器）以便正式浏览器实景预览——当前需手动 `HomePersonalization.applyConfig` 注入；② 客户端 `normalizeConfig` 有自己的配对/重排逻辑，会覆盖服务端骨架的具体分组（净效果左右仍出，但分组不完全等于服务端骨架）——若要完全以骨架为准需让 client 尊重 `skeletonHtmlScheme.slots`；③ golden 那种"贯穿整页的主区+持久右侧栏"需要跨行 rail 布局原语，当前是逐行配对；④ 脚手架租户 guided 主题；⑤ `sanitizeGeneratedHtml` 升级白名单 sanitizer。

---

## 5. 填充阶段如何消费（衔接 Step 2/3）

1. 遍历 `rows[].slots`：`prefer` 模块若被选中且 `homepagePolicyAllowsSlot`（见 `buildHomepagePagePlan` [server.js:12820](../server.js)）通过 → 放入；否则按 `role` + `visualHierarchy`（[server.js:12857](../server.js)）从可见模块挑权重匹配的补。
2. **Tier A 模块（资金/合规）只允许积木填充**；Tier B 槽可走 AI 组件（对接后续 Step 3/4）。
3. 选中模块多于槽位 → 溢出按权重追加为 full 行；少于槽位 → 删空槽并 snap 重排该行。

---

## 6. 落点（server.js 锚点）

| 项 | 锚点 | 改动 |
|---|---|---|
| 模块分类常量 | [server.js:770](../server.js) | 复用，不改 |
| floor 表 + 构建函数 | 新增，挂 `buildHomepagePagePlan`（[server.js:12802](../server.js)）末尾 | 产出并校验后写入 `pagePlan.sectionSkeleton` |
| 校验器 | 新增，复用 `brickBackedSlotSpans` / `normalizeHomepageSectionType` | snap + critic |
| 喂模型 | `skeletonHomepagePromptLines`（[server.js:3399](../server.js)）/ user prompt | 把骨架作为**权威 section 顺序**注入，非软提示 |
| 兜底 | `HOMEPAGE_RECOMMENDED_SECTION_ORDERS` 默认（[server.js:1251](../server.js)） | 模型输出空/损坏时用骨架兜底 |

---

## 7. 实施顺序与验证

1. **C（本 spec 五套 floor）+ 校验器** → `/api/home-ai/candidates` 看是否稳定出现 `hero`/`split`（机制①），`npm test` 看 golden-alignment / visual-style。
2. **A（黄金抽取）** → 读 `readDesignSamples()`（[server.js:6120](../server.js)）里 `isGolden` 样本的 `homepageConfig.sections`，映射成骨架语法。
3. **B（AI 合成）** → 独立强约束小 prompt，只产骨架，过同一校验器；需配 1-2 个左右范例。

每步：`npm run check`（语法）→ `npm test`（golden/规则/视觉）→ `/api/home-ai/candidates`（横向检出）。
