# AI UI Generation Protocol

This project should treat every homepage prompt as a product-design brief, not as a color-change request. Before generating or accepting a homepage blueprint, the AI must pass through this protocol.

## 1. Understand First

For each prompt, split the request into three layers:

- Hard constraints: numeric counts, required modules, exact grouping rules, required filter style, forbidden modules, required visible values.
- Product intent: what the page should make the client feel or do first, such as trust funds, inspect balances, deposit, open an account, or join a campaign.
- Forbidden carry-over: previous layout order, repeated module skeletons, color-only changes, duplicated CTAs, separated lists when the user asked for one list.

If a phrase has an implied meaning, make it explicit before generation:

- "5 quick actions" means exactly 5 unless the user says "at least".
- Quick action contents come from backend configuration or API results. The AI may choose presentation, count, density, and placeholders, but must not hard-code specific entries.
- Asset overview may show any 1-3 of `total`, `wallet`, and `tradingAccount`; it must not invent additional asset fields or fake values.
- Referral link cards are only for agent/IB/partner users or tenants with referral-link capability enabled. They may show referral link, invite code, copy/share controls, and optional basic stats from APIs only.
- "real and demo accounts together" means one account module, not two separate account sections.
- "capsule filter" means lightweight filter buttons such as All / Real / Demo, not separate tables or a heavy tabbed workspace.
- "mature broker client" means trusted, data-led, dense enough for daily use, and not a marketing landing page.
- "do not only change color" means layout, module density, visual hierarchy, and module expression must change.

## 2. Design Strategy

Before implementation, choose a layout strategy and make it different from the previous skeleton.

Allowed homepage blocks are limited to:

```text
welcome_header, asset_overview, quick_actions, onboarding_guide,
trading_account_highlight, trading_accounts_list, promo_banner,
pamm_products, copytrading_signals, referral_link_card,
announcements, market_news
```

Do not proactively generate reward/task, KYC/risk, full IB/agent dashboard, or support/help modules. Legacy names such as `referralLink`, `userKycRail`, and `riskNotice` are compatibility inputs only and should not appear in new homepage output. Agent referral needs must use the lightweight `referral_link_card`, not `ib_dashboard`.

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

## 3. Quality Gate

The generated homepage must pass these checks before delivery:

- Exact requested quick-action count is respected.
- At least the requested number of visible values are present.
- Required account grouping is respected.
- Required filter style is respected.
- The first screen supports the product intent.
- The result is not just a theme/color swap.
- At least three module forms differ, such as metric strip, wallet tiles, campaign panel, account table, or conversion rail.
- CTAs are not repeated everywhere; one primary action and one secondary action are enough.
- No empty modules, disabled placeholders, or large accidental gaps.
- White-label trust pages put balance/fund-safety before campaign media.
- PAMM and CopyTrading are separate blocks: `pamm_products` and `copytrading_signals`.
- `referral_link_card` appears only for agent/IB/partner or referral-enabled tenant contexts, and ordinary customer homepages do not include it.
- `referral_link_card` does not show commissions, team hierarchy, downline lists, team deposits, or complex IB performance data.
- No fake products, activities, rewards, balances, signal sources, risk levels, chart data, or quick-entry functions are introduced by the AI.
- No fake referral link, invite code, opens, registrations, account openings, or conversion rates are introduced by the AI.

If any hard constraint fails, regenerate or repair the blueprint before preview.

## 4. Prompt Template

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
5. Self-check the result against hard constraints before returning JSON.

Output:
Return only a JSON object that can be parsed by JSON.parse.
```

## 5. Example Interpretation

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
