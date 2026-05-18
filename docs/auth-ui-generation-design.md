# Auth UI Generation Design Contract

## Goal

The login/register/forgot-password generator should not behave like a fixed left-right template selector. It must translate user copy and visual references into executable structure:

- centered auth card
- media left, form right
- form left, media right
- full-bleed/background visual with floating form
- mobile-first form flow

The model can suggest the structure, but the renderer must have explicit fields that can make the preview actually change.

## Visual Reference Ingestion

Uploaded visual references are not treated as manual tags only. Every auth reference asset gets an automatic `visualStructure` summary:

```json
{
  "source": "auto-structure",
  "confidence": 0.78,
  "layoutType": "mediaSplit",
  "formPosition": "right",
  "mediaPosition": "left",
  "heroVisibility": "full",
  "logoPlacement": "heroTopLeft",
  "mobileStrategy": "singleColumn",
  "styleSignals": ["tech", "minimal"],
  "summary": "媒体/表单分栏认证页；表单在右；视觉在左"
}
```

This field is generated even when the admin does not fill tags, segments, or notes. Manual labels can help, but they are not required for the generation path.

## Auth Scheme Fields

The auth JSON should include these executable layout fields under `visual`:

```json
{
  "visual": {
    "composition": "splitTrust",
    "layoutType": "mediaSplit",
    "formPosition": "right",
    "mediaPosition": "left",
    "heroVisibility": "full",
    "mobileStrategy": "singleColumn",
    "referenceStructure": "Media panel on the left, form on the right."
  }
}
```

Allowed values:

- `layoutType`: `split`, `mediaSplit`, `centeredCard`, `fullBleed`, `cardOverlay`, `mobileFirst`
- `formPosition`: `left`, `right`, `center`
- `mediaPosition`: `left`, `right`, `background`, `none`
- `heroVisibility`: `full`, `compact`, `hidden`
- `mobileStrategy`: `logoFirst`, `formFirst`, `mediaMuted`, `singleColumn`

## Rendering Rules

- `centeredCard` renders a centered form card and hides the side hero.
- `mediaSplit` can render media/brand visuals on either side based on `mediaPosition`.
- `cardOverlay` renders the brand/visual layer behind a floating form.
- `formPosition=left` must reorder the DOM so the form is actually first.
- Mobile always collapses to one column; `mobileStrategy` decides whether brand/logo or form content gets first priority.

## Prompt Rules

When references are present, the prompt must tell the model to read `visualStructure` first. The model should not rely on admin-entered tags and must not copy the source design.

If a reference says or implies "image on the left", the output should use:

```json
{ "formPosition": "right", "mediaPosition": "left" }
```

If a reference says or implies "image on the right", the output should use:

```json
{ "formPosition": "left", "mediaPosition": "right" }
```

If a reference is centered:

```json
{ "layoutType": "centeredCard", "formPosition": "center", "mediaPosition": "none" }
```

If the user explicitly asks for "左右布局", "左右分栏", "双栏", "两栏", or `split layout`, that request overrides a centered model response:

```json
{ "layoutType": "mediaSplit", "formPosition": "right", "mediaPosition": "left", "heroVisibility": "full" }
```

The renderer and server normalizer must not allow `centeredCard`, `mobileFirst`, `cardOverlay`, `formPosition: "center"`, or hidden hero output for that prompt. Mobile still collapses to one column, but the desktop structure remains left-right.

## Skill Boundary

Keep this as a project design contract first. Promote it into a reusable skill only after the auth generator proves stable across several real prompts and reference images.
