# AI UI Generation Protocol

This project should treat every homepage prompt as a product-design brief, not as a color-change request. Before generating or accepting a homepage blueprint, the AI must pass through this protocol and the local `design.md` governance document.

`design.md` is the design constitution. It limits AI freedom to the ForexCRM / Nxbroker financial CRM style: clear information hierarchy, dense but scannable modules, disciplined tokens, responsive behavior, and component-library semantics. The AI may still generate polished HTML, but polish must come from structure, spacing, state expression, data visualization, empty/loading states, and responsive refinement. It must not come from random gradients, thick shadows, oversized marketing heroes, card nesting, hard-coded colors, or newly invented business modules.

## 0. Default Visual Baseline

Every homepage generation should start from a spacious white fintech SaaS dashboard baseline unless the prompt explicitly asks for another brand mode such as dark terminal, black-gold VIP, campaign poster, or graphite institutional.

This baseline is a layout and spacing language, not a fixed component set:

- The page canvas should be white or very light blue-gray, centered, and capped around 1400-1500px on desktop.
- Desktop side gutters should feel generous, usually 64-96px; mobile gutters should stay around 20-24px.
- Main sections should keep 24-32px vertical rhythm, with 24-32px internal padding for most modules.
- Cards should be white, with thin blue-gray borders, very light shadow, and restrained 8-12px radius.
- Blue is the primary emphasis color. Use it for primary CTAs, selected states, key tags, and the most important values; do not flood the page with blue surfaces.
- Important money, account, progress, and status values should become large visual anchors; secondary copy should be smaller and gray-blue.
- The first screen should have only one or two dominant focal points. Do not make every module high contrast.
- The homepage should feel calm, spacious, trustworthy, and product-like. It should not look like a dense operations back office or a marketing landing page.
- Avoid nested card stacks, thick shadows, large decorative gradients, oversized hero posters, and equal-weight modules.

## 1. Understand First

For each prompt, split the request into three layers:

- Hard constraints: numeric counts, required modules, exact grouping rules, required filter style, forbidden modules, required visible values.
- Product intent: what the page should make the client feel or do first, such as trust funds, inspect balances, deposit, open an account, or join a campaign.
- Forbidden carry-over: previous layout order, repeated module skeletons, color-only changes, duplicated CTAs, separated lists when the user asked for one list.
- Component-library reference: before inventing a module form, inspect saved homepage bricks for their fields, size, labels, action language, card density, and responsive pattern. Use them as the design substrate, then create a new variant for the current intent.

If a phrase has an implied meaning, make it explicit before generation:

- "5 quick actions" means exactly 5 unless the user says "at least".
- Quick action contents come from backend configuration or API results. The AI may choose presentation, count, density, and placeholders, but must not hard-code specific entries.
- Asset overview may show any 1-3 of `total`, `wallet`, and `tradingAccount`; it must not invent additional asset fields or fake values.
- Referral link cards are only for agent/IB/partner users or tenants with referral-link capability enabled. They may show referral link, invite code, copy/share controls, and optional basic stats from APIs only.
- "real and demo accounts together" means one account module, not two separate account sections.
- "capsule filter" means lightweight filter buttons such as All / Real / Demo, not separate tables or a heavy tabbed workspace.
- "mature broker client" means trusted, data-led, dense enough for daily use, and not a marketing landing page.
- "do not only change color" means layout, module density, visual hierarchy, and module expression must change.
- Visual tokens such as "light blue", "flat", "10px radius", or "PingFang SC" are theme constraints only. They must not override the product intent or force the page into a generic asset/trust dashboard.
- "CopyTrading recommendation" means the `copytrading_signals` module should be treated as a primary opportunity module. If the user asks for signal name, return rate, total return, or return curve, choose a signal-card/curve-card expression instead of a blank summary. Return curves and "near N days" performance are continuous time-series data, so they must use an ECharts line chart or area line chart, not a bar chart.
- "Account performance" means one selected trading account plus a 7-day or 30-day equity/PnL trend. It is not a generic metric dump, and it must not use bars, capsule columns, or decorative histograms.
- "Trading account card/list" uses only these account fields: account type (`Demo`/`Live`), platform/server (`MT4`/`MT5`/`Sirix`/`XOH`/`Fortex` plus account server), account number, balance, equity, credit, account category, leverage, and margin ratio. Do not invent PnL, usage tags, positions, margin-used amounts, risk states, or action buttons as account fields.
- "Simpler", "flat", "too many modules inside a module", or "too many focal points" means reduce nested panels first. Do not answer this by only shrinking gaps or changing colors.
- "Mobile adaptation", "small screen", "autolayout", or "responsive" means the blueprint must include an `autoLayout` contract. Paired desktop modules should collapse to one module per row when the content area gets narrow, and each module must have its own internal stack/wrap rule.
- Metric labels such as total return, 30-day return, total profit, max drawdown, and risk level do not always need individual bordered cards. Prefer compact stat rows or quiet inline groups when the module already has a framed chart or recommendation card. Avoid heavy vertical dividers that make the metric row feel like a spreadsheet.
- Avoid decorative English eyebrow labels such as "AI Copytrading Match" when the title already explains the module. Show the business title directly unless the small label adds necessary product meaning.

## 2. Design Strategy

Before implementation, choose a layout strategy and make it different from the previous skeleton.

Allowed homepage blocks are limited to:

```text
welcome_header, asset_overview, quick_actions, onboarding_guide,
trading_account_highlight, trading_accounts_list, promo_banner,
pamm_products, copytrading_signals, referral_link_card,
announcements, market_news, risk_disclosure, faq_section,
support_contact, app_download
```

Do not proactively generate reward/task, KYC risk, or full IB/agent dashboard modules. Legacy names such as `referralLink`, `userKycRail`, `riskNotice`, and `support_help` are compatibility inputs only. Risk, FAQ, support, and app-download needs must use `risk_disclosure`, `faq_section`, `support_contact`, and `app_download`; agent referral needs must use the lightweight `referral_link_card`, not `ib_dashboard`.

The default previous skeleton to avoid is:

```text
welcome -> asset summary -> quick actions -> wallet cards -> chart -> account table
```

For trust/broker/homepage prompts, prefer a broker-client workbench, not a campaign cover:

```text
fund safety + balance -> open-account conversion -> wallet cards -> exact quick actions + campaign -> combined account list
```

The structure may vary, but the first screen must make the primary intent obvious.
If the user asks for white-label trust, fund safety, mature broker client, or light-blue trust, do not start with a large ad carousel unless the prompt explicitly asks for an ad carousel as the first-screen core.

Component-library freedom rule:

- Saved components and compositions are inspiration and shape references, not permission to add new business capabilities.
- Risk disclosure is a footer compliance region. If `risk_disclosure` is selected, place it as the final full-width section using `legal-strip` style; it should hold long rich-text disclosure copy from backend/compliance, not short metric cards.
- FAQ should default to an accordion question list. Do not render all answers as static cards unless explicitly requested.
- Trading accounts should choose from table/list, split real-demo lists, switchable workbench, or card wall based on account count and fields. Do not default every account module to cards.
- Avoid redundant module labels. If the title already explains the module, omit the eyebrow/tag.
- A generated module should be traceable to an existing parent module, field set, size token, or component interaction pattern.
- Do not copy a saved brick verbatim or only recolor it; the new result should change layout, density, hierarchy, or composition in a way that supports the prompt intent.
- Do not embed component-library HTML/CSS into homepage blueprints. Homepage output still uses `sections`, `brickPlan`, `moduleStyles`, and `moduleSettings`.

Responsive auto layout rule:

- Every generated blueprint should include `autoLayout` with `desktop`, `tablet`, `mobile`, and `moduleRules`.
- `desktop` uses a 12-column grid and equal-height paired rows. Stable row recipes are `3x` full row, `2x+1x`, and `2x+2x`.
- `tablet` collapses paired rows when the content container is narrow, not only when the browser viewport is narrow. Default collapse threshold is `1040px`.
- `mobile` is single column. Internal module layouts must stack: promotion ladders become copy above tiers, onboarding steps become a vertical journey or checklist, quick actions become two or one columns, and account-performance summary/chart stack vertically.
- If a module would be cramped in a half-width row, prefer internal wrapping or a different compact presentation before letting text overflow or creating a fake empty area.

## 3. Chart and Layout Semantics

Before choosing a module style, the AI must classify the data semantics:

| Data semantics | Trigger words | Required expression | Forbidden expression |
| --- | --- | --- | --- |
| Continuous time trend | near N days, 7/30/90 day return, trend, curve, net value, PnL change, drawdown change | ECharts line chart or area line chart | bar chart, capsule bars, decorative histogram |
| Category comparison | signal source comparison, products, channels, account groups | bar chart or horizontal bar chart | line chart |
| Composition / share | ratio, distribution, allocation, structure | donut, stacked bar, segmented metric | line chart |
| Single status | risk level, stability label, current status | metric card, status tag, compact badge | complex chart |

Hard rules:

- If the field or prompt combines "near N days / 7 days / 30 days / 90 days" with "return / net value / trend / curve / PnL / drawdown", default to a line chart or area line chart.
- If the prompt asks for account performance, account overview trend, account net value, or account PnL, the module must include 7D/30D period semantics and a visible time axis cue.
- Time-series chart X axes should use date labels such as `05/05`, `05/08`, `05/11`, not placeholder labels such as `D1`, `D4`, or `D7`.
- Choose the axis mode deliberately: analytical account performance can use a visible XY axis; compact recommendation cards should prefer a minimal or no-strong-axis chart with only date cues.
- Do not turn continuous trend data into vertical bars, capsule bars, or decorative columns unless the user explicitly asks for a bar chart.
- Generated statistical charts should use ECharts as the preferred rendering component, or another approved interactive chart component when explicitly chosen. Inline SVG is only acceptable as a loading/error fallback or static component-library reference.
- A trend chart must include at least a visible time axis cue, a readable trend line, and one or more meaningful reference points such as current value, high point, low point, drawdown point, or start/end labels.
- If there are fewer than 4 data points, do not fake a trend chart. Use a metric card or short explanation instead.
- Chart pixels must carry data meaning. A graph-shaped decoration with no axis cue, value cue, or trend semantics fails this protocol.

Recommended layout for `trading_account_highlight` account performance:

1. Header: title, selected account label, and a 7D/30D segmented period control.
2. Left side: account identity, platform/server, and one dominant value such as equity or balance.
3. Right side: ECharts line or area line chart for equity, net value, or PnL. Use date labels on the X axis and choose `xy` or `minimal` axis mode based on density.
4. Bottom: 3 to 4 quiet metrics such as floating P/L, margin ratio, credit, and leverage.
5. Missing API values render as `--`; do not invent balances, PnL, account numbers, or risk levels.

Avoid equal-weight metric grids, random color blocks, nested cards, oversized empty white space, and chart shapes without a time period.

Flat account-performance refinement:

- The selected account context should be a quiet line or summary block, not another large card inside the module.
- Balance/Equity/Floating P/L/Margin/Credit/Leverage should collapse into one restrained metric strip unless the prompt explicitly asks for a detailed ledger.
- If the visual hierarchy feels crowded, keep the chart and one main value prominent, then demote secondary metrics to inline text.

Recommended layout for `copytrading_signals` curve cards:

1. Top: module title and one-sentence recommendation conclusion.
2. Signal source row: source name, risk/stability tag, and no oversized decorative banner.
3. Core metrics: 3 to 4 compact metrics such as near-30-day return, total return, max drawdown, and risk level. Do not divide every metric with heavy vertical rules.
4. Trend chart: ECharts line or area line chart as the main visual evidence, usually with minimal axis chrome and date labels.
5. AI recommendation reason: explain how the metrics and curve support the recommendation.
6. Primary action: one restrained CTA, usually 44-56px high.

Avoid large gradient strips, nested cards, empty white space, and buttons that visually outweigh the data. The largest visual region in the module should carry the strongest decision evidence.

## 4. Quality Gate

The generated homepage must pass these checks before delivery:

- Exact requested quick-action count is respected.
- At least the requested number of visible values are present.
- Required account grouping is respected.
- Required filter style is respected.
- The first screen supports the product intent.
- The result is not just a theme/color swap.
- At least three module forms differ, such as metric strip, wallet tiles, campaign panel, account table, or conversion rail.
- Theme-only wording does not change the page intent; if the user asks for light blue plus new-user or CopyTrading content, the homepage still needs a new-user or CopyTrading structure.
- CTAs are not repeated everywhere; one primary action and one secondary action are enough.
- No empty modules, disabled placeholders, or large accidental gaps.
- White-label trust pages put balance/fund-safety before campaign media.
- PAMM and CopyTrading are separate blocks: `pamm_products` and `copytrading_signals`.
- `referral_link_card` appears only for agent/IB/partner or referral-enabled tenant contexts, and ordinary customer homepages do not include it.
- `referral_link_card` does not show commissions, team hierarchy, downline lists, team deposits, or complex IB performance data.
- No fake products, activities, rewards, balances, signal sources, risk levels, chart data, or quick-entry functions are introduced by the AI.
- No fake referral link, invite code, opens, registrations, account openings, or conversion rates are introduced by the AI.
- Continuous time-series data such as near-30-day return curves are rendered as line or area line charts, not bar charts or decorative capsule columns.
- Recommendation modules put the chart and metrics ahead of decorative backgrounds, oversized empty banners, or heavy CTA blocks.
- Account performance modules include a selected account context, 7D/30D period semantics, and an ECharts line/area line chart.
- Trading account cards/lists respect the fixed trading-account field contract and do not add PnL, usage, positions, margin-used amounts, risk states, or action buttons as account fields.
- `autoLayout` is present and the result has a credible tablet/mobile fallback for every paired row and crowded module.
- Paired modules are visually equal height on desktop, and they collapse into one module per row on narrow content containers.

If any hard constraint fails, regenerate or repair the blueprint before preview.

## 5. Prompt Template

Use this wrapper when sending a UI-generation request to an AI model:

```text
Role:
You are a senior financial product designer and frontend implementation planner.

Task:
Generate a controlled homepage blueprint for ForexCRM. Do not write arbitrary HTML/CSS. Use the allowed modules, sections, moduleStyles, moduleSettings, and brickPlan.

Understanding protocol:
1. Internally extract hard constraints, product intent, and forbidden carry-over.
2. Treat exact numbers as exact.
3. Treat "together" account wording as one combined account module unless the user explicitly says separate.
4. Choose a layout strategy that is visibly different from the previous skeleton.
5. Classify chart data before choosing chart type: time-series return/PNL/net-value data must use ECharts line or area line charts, not bars.
6. For account performance, use a selected account context, 7D/30D period semantics, and an ECharts line/area line chart.
7. Trading account cards/lists must use only the fixed trading-account field contract; use lists/tables when the nine allowed fields make cards too dense.
8. Put risk disclosure at the bottom, FAQ as accordion, and account lists in the most suitable account presentation.
9. Include autoLayout with desktop/tablet/mobile rules; paired rows must be equal height on desktop and stack on narrow content containers.
10. Self-check the result against hard constraints before returning JSON.
11. Apply the default spacious white fintech SaaS visual baseline unless a stronger explicit brand mode overrides it; this controls spacing, gutters, card treatment, typography hierarchy, and color restraint, not component selection.

Output:
Return only a JSON object that can be parsed by JSON.parse.
```

## 6. Example Interpretation

Input:

```text
淡蓝色客户首页，突出资金安全、资金余额、卡片的钱包列表、快捷入口放置5个、主推活动和开户转化；真实交易账号、模拟交易账号一起，只用胶囊式的按钮做快速筛选。
```

Correct interpretation:

- Theme: light blue financial trust.
- Intent: fund safety, balance clarity, account opening conversion.
- Quick actions: exactly 5.
- Visible values: at least 3.
- Wallets: card/tile list.
- Accounts: real and demo in one list.
- Account filter: capsule buttons only.
- Layout: must not reuse the previous welcome-summary-actions-wallet-chart-table skeleton.
