# Homepage — UI Review

**Audited:** 2026-03-21
**Baseline:** Abstract 6-pillar standards (no UI-SPEC available)
**Screenshots:** Partially captured — dev server at localhost:3000 serves a different app (AI News Assistant). HomePage.tsx is routed via App.tsx lazy-load but the current running server does not serve this component at the root path. Visual audit conducted via code review of components/HomePage.tsx.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Placeholder "Logo 1–5" in trusted-by section; three different brand names used across the page |
| 2. Visuals | 2/4 | No mobile hamburger menu; hardcoded "active" card state; trusted-by section shows only grey boxes |
| 3. Color | 2/4 | 128 unique hardcoded hex values; 7+ distinct accent colors; zero Tailwind color tokens used |
| 4. Typography | 1/4 | ~14 distinct inline font sizes and ~7 font weight values; no Tailwind type scale; major proliferation |
| 5. Spacing | 2/4 | 161 inline style attributes; non-8pt values (6px, 10px, 14px); no Tailwind spacing tokens |
| 6. Experience Design | 2/4 | No aria-labels; no loading/error states; FAQ non-animated; pricing order is counterintuitive |

**Overall: 11/24**

---

## Top 3 Priority Fixes

1. **Typography scale explosion (14 font sizes, 7 weights)** — Cognitive overload makes hierarchy unreadable at a glance; content appears unpolished — Define a 5-step scale (xs/sm/base/lg/xl/2xl) in Tailwind config and replace all inline `fontSize` and `fontWeight` style props with Tailwind classes `text-sm`, `text-lg`, `font-semibold` etc.

2. **Placeholder "Logo 1–5" content in Trusted-By section** — Signals an unfinished product to every real visitor; destroys social proof — Replace the 5 grey boxes with real partner logos or remove the section entirely until real logos are available.

3. **No mobile navigation** — On viewports below ~640px the desktop `<nav>` with 3 buttons overflows or collapses against the logo with no hamburger/drawer — Add a mobile-responsive navigation: hide the link row on small screens and show a hamburger icon that opens a full-width drawer.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**Strengths:**
- All primary CTAs are specific and action-oriented: "Bắt đầu ngay" (hero, in-product preview), "Dùng thử ngay" (Phóng viên, Cán bộ), "Liên hệ tư vấn" (Enterprise). No generic "Submit" or "Click Here" found.
- FAQ answers are informative and specific.
- Hero headline "THƯ KÝ AI 24/7 CỦA BẠN" is bold and benefit-led.

**Issues:**

- **Line 285 — Placeholder content:** Five instances of `Logo {i}` text (i = 1–5) in the "Được tin dùng bởi" (Trusted By) section. These grey boxes clearly indicate unfinished content that shipped to production.

- **Brand name inconsistency across 4 variations:**
  - Line 47: "Meeting Minute I Thư ký AI" (nav header — "I" appears to be a separator or Roman numeral, ambiguous)
  - Line 180: "Tại sao chọn MoMai?" (features section heading)
  - Line 507 (footer): "Meeting Minute I Thư ký họp AI" (footer description — uses different subtitle)
  - Line 562 (copyright): "© 2026 Meeting AI" (third distinct brand name)
  - Line 504 (footer logo): "NeuronsAI" (parent brand shown as product name)
  - Users cannot determine the actual product name from this page alone.

- **Pricing order logic:** "Chuyên viên" (299.000₫) is marked "Phổ biến nhất" and highlighted as the premium plan, yet it is priced lower than "Phóng viên" (399.000₫). Either the pricing order should be low→high, or the plan positioning copy needs revision to explain why the "most popular" plan costs less.

- **Hero sub-label tags:** "NHANH CHÓNG", "CHÍNH XÁC", "DỄ SỬ DỤNG" (line 78–80) are generic attribute labels that any SaaS product could claim. These add visual noise without differentiation.

---

### Pillar 2: Visuals (2/4)

**Strengths:**
- Clear visual hierarchy in the hero: large headline → sub-text → trust badges → CTA button.
- Product preview section with embedded YouTube demo is well-positioned above the fold.
- Dark Enterprise section creates strong contrast break to draw the eye.
- Pricing card uses dark background for "Phổ biến nhất" — good use of visual emphasis.
- `shadow-xl-soft` and `shadow-soft` CSS classes provide depth differentiation.

**Issues:**

- **No mobile navigation (line 51–63):** The header nav renders as a flex row of three buttons at all viewport sizes. There is no `@media` query, no Tailwind responsive prefix (`sm:`, `lg:`), and no hamburger/drawer implementation. On viewports under ~600px, the nav will overflow the header or wrap awkwardly against the logo.

- **Hardcoded "active" card state (line 138):** The "Chuyên viên" use-case card has `className="mode-card active"` and `border: '2px solid #2563eb'` hardcoded. The `.mode-card` CSS in the `<style>` block defines hover transitions, implying interactivity, but the card is not actually clickable or selectable. This creates a false affordance.

- **Trusted-By section (lines 282–290):** Five identical grey rectangle placeholders labelled "Logo 1" through "Logo 5" with `background: '#f1f5f9'` are visible in the current codebase. This section provides negative social proof rather than positive.

- **Social icons (lines 511–520):** The footer references `/logo-facebook.png`, `/logo-zalo.png`, `/logo-viber.png`, `/logo-ytb.png` as relative local paths. If these assets are not in the `public/` directory, the footer renders four broken image slots.

- **No visual feedback on FAQ expand/collapse:** The native `<details>` + `<summary>` element at lines 483–491 uses a static "+" symbol. There is no CSS to rotate or change the indicator when the item is open, leaving users unsure of the open/closed state.

---

### Pillar 3: Color (2/4)

**Strengths:**
- Primary blue (`#2563eb`) is used consistently for all primary CTAs and interactive elements, creating a reliable action color.
- Neutral dark (`#0f172a`, `#1e293b`) and neutral light (`#f8fafc`, `#f1f5f9`) are used consistently for backgrounds.
- The 60/30/10 split is approximately respected for the white/grey background areas vs. dark text vs. blue accent.

**Issues:**

- **128 unique hardcoded hex color values** with zero Tailwind color token usage. Every color is a magic number inline. This makes global theme changes (e.g., rebranding from blue to indigo) require touching 160+ lines.

- **7+ distinct accent colors across feature icons (lines 187–264):**
  - Blue: `#2563eb` (primary)
  - Purple: `#7c3aed`
  - Green: `#059669`, `#16a34a`
  - Amber: `#d97706`
  - Cyan: `#0891b2`
  - Red/Rose: `#e11d48`
  - Indigo (enterprise): `#6366f1`, `#8b5cf6`, `#818cf8`

  Each feature card icon uses a different brand color creating a "crayon box" effect rather than a unified design system. Best practice for SaaS landing pages is to use 1–2 accent colors maximum for icon backgrounds.

- **Two blue-family values for brand accent:** `#2563eb` (Tailwind blue-600) and `#3b5bdb` (Mantine indigo-700) used interchangeably in the logo and nav text (lines 47, 504). These are visually close but not identical, indicating inconsistent sourcing of the brand color.

---

### Pillar 4: Typography (1/4)

**Strengths:**
- Inter font is imported via Google Fonts (line 20) — a good professional choice for SaaS.
- `clamp()` is used for major headings, providing fluid responsive scaling without breakpoints.
- Consistent tracking (`letterSpacing: '-0.025em'`) on hero headline.

**Issues (critical):**

- **~14 distinct font size values in use** (measured from inline style attributes):
  `10px`, `0.75rem`, `0.8rem`, `0.875rem`, `0.9rem`, `0.95rem`, `1rem`, `1.05rem`, `1.1rem`, `1.125rem`, `1.25rem`, `1.5rem`, `1.875rem`, `2.75rem`, `3.5rem` + clamp values

  A well-designed type scale typically has 5–7 steps. 14+ sizes creates visual noise and makes the hierarchy inconsistent between sections.

- **~7 distinct font weight values:** `500`, `600`, `700`, `800`, `900` are all present, plus Inter 300 and 400 imported (lines 20). Using both `800` and `900` in close proximity creates negligible visual difference while adding maintenance complexity.

- **No Tailwind typography classes used.** All font sizing is via inline `style={{ fontSize: '...' }}`. This bypasses Tailwind's `font-size` + `line-height` pairing system, which is a known best practice for consistent leading.

- **Inconsistent non-standard sizes:** `0.8rem` (line 79, 134, 271), `0.9rem` (line 271), `1.05rem` (line 270) are off-scale values that do not correspond to any standard type system. Replace with nearest standard step.

- **`font-size: 10px`** used on the "Gói miễn phí" badge (line 102) and the "Phổ biến nhất" badge (line 338). This is below the WCAG minimum recommended body text size of 12px for accessibility.

---

### Pillar 5: Spacing (2/4)

**Strengths:**
- Major section vertical rhythm is relatively consistent: 80px, 96px, 64px padding values appear across sections.
- Inner card padding is consistently 24px or 40px.

**Issues:**

- **161 inline `style=` attributes** in a single 570-line file. Zero Tailwind spacing utility classes (`p-`, `px-`, `py-`, `m-`, `gap-`) are used. This prevents any global spacing scale enforcement.

- **Non-8pt grid values present:**
  - `6px` (line 79: badge padding)
  - `10px` (line 44: logo gap; line 127, 302: card flex gap)
  - `14px` (line 266: feature card flex gap)
  - `6vw` (clamp padding)
  These break an 8pt (8px/0.5rem) spatial system. A 4pt or 8pt grid would yield: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96.

- **Inconsistent gap values in feature grid:** Feature cards use `gap: '48px 56px'` (line 183) — a non-square gap that uses a non-standard 56px column gap. Standard 8pt values would be 48px or 64px.

- **Section top/bottom padding inconsistency:** Hero section has `padding: '80px 1rem 64px'` set twice — both the shorthand and individual `paddingTop`/`paddingBottom` on line 68 (`paddingTop: '80px', paddingBottom: '64px', padding: '80px 1rem 64px'`). The shorthand overrides the individual values, making the code misleading.

---

### Pillar 6: Experience Design (2/4)

**Strengths:**
- CTA buttons have `onMouseEnter`/`onMouseLeave` hover feedback (scale, color change) — tactile feel.
- The Enterprise section provides clear response time expectation: "Phản hồi trong vòng 24 giờ".
- FAQ uses semantic `<details>`/`<summary>` — accessible by default for screen readers.
- YouTube embed includes proper `allowFullScreen` and `referrerPolicy`.

**Issues:**

- **Zero `aria-label` attributes found.** Social icon buttons (lines 517) use `title={label}` for tooltip but no `aria-label`. Buttons that navigate to other pages have no accessible names for screen readers beyond their text content.

- **No loading or error states.** The component is entirely static presentation. There is no skeleton, spinner, or error boundary — appropriate for a static marketing page, but image loading failures (broken social icons, potentially broken NeuronsAI logo if CDN is down) produce silent broken-image UI.

- **No focus ring styles.** Buttons use `border: 'none'` and no explicit `:focus-visible` CSS. The `<style>` block on lines 19–36 does not define focus styles. Keyboard-only users will have no visible focus indicator on any of the 10+ interactive buttons.

- **FAQ "+" indicator does not toggle.** The `<details>` element will show/hide content natively, but the "+" character in the `<summary>` (line 487) does not change to "−" or rotate when expanded. Users may not understand the section is now open.

- **Hardcoded "active" use-case card** (line 138) looks interactive (cursor: pointer, hover class, border highlight) but clicking it does nothing. This false affordance may frustrate users who expect to switch the active persona.

- **External font load without fallback timing.** The Google Fonts `@import` (line 20) is inside a `<style>` tag injected at render time, which can cause FOUT (Flash of Unstyled Text) since it is not in the document `<head>`. The `fontFamily: "'Inter', sans-serif"` fallback will show before Inter loads.

- **No `rel="noopener noreferrer"` on the YouTube iframe.** The `<iframe>` uses `allow="...clipboard-write..."` which is a permission grant — should be reviewed to confirm clipboard access is intentional.

---

## Files Audited

- `/Users/tanliem/Desktop/meeting-main/components/HomePage.tsx` (primary — 570 lines, full read)
- `/Users/tanliem/Desktop/meeting-main/App.tsx` (routing context — lines 1–60)
- Screenshot attempts: localhost:3000 serves different app (AI News Assistant); localhost:3000/home and /meeting render blank. Code-only audit applied to HomePage.tsx.
- Registry audit: shadcn not initialized (no components.json) — skipped.
