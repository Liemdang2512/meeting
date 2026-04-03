# Trang Chủ — UI Review

**Audited:** 2026-04-01
**Baseline:** Trangchu.md content spec + abstract 6-pillar standards
**Screenshots:** Not captured (Playwright browsers not installed — code-only audit)
**Component:** `components/HomePage.tsx` (580 lines)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Visual Hierarchy & Layout | 2/4 | H1 content inverted with badge; bento grid from spec not implemented; feature section head not centered |
| 2. Color & Contrast | 2/4 | Critical: `text-white` on `#eaddff` (secondary-container) fails WCAG AA; 20+ hardcoded hex values |
| 3. Typography | 3/4 | Good scale variety with clamp headings; missing gradient text on "tri thuc"; arbitrary 10px/15px sizes |
| 4. Spacing & Density | 3/4 | Section rhythm consistent; 59 inline style blocks erode token discipline; inconsistent footer gutter |
| 5. Interactivity & Feedback | 2/4 | FAQ uses div[role=button] not semantic button; 17 of 18 buttons missing type="button"; dead social links |
| 6. Accessibility | 3/4 | Good focus-visible coverage (18 instances); broken social icon src paths will 404; no main landmark |

**Overall: 15/24**

---

## Top 3 Priority Fixes

1. **Color contrast failure on hero stat badge (line 241)** — The "98%+ Do chinh xac" badge uses `bg-secondary-container` (`#eaddff`, a pale lavender) with `text-white`. The contrast ratio is approximately 1.6:1, far below the WCAG 2.1 AA minimum of 4.5:1. This is the page's primary trust signal and a key conversion element — it cannot be read by users with low vision. Fix: change `bg-secondary-container text-white` to `bg-primary text-on-primary` on line 241.

2. **Social icon images will 404 in production (lines 516-519)** — Footer social buttons reference paths with spaces and a typo: `/logo facebok.png`, `/logo zalo.png`, `/logo ytb.png`, `/viber.png`. The correctly-named versions already exist in `public/` as `/logo-facebook.png`, `/logo-zalo.png`, `/logo-ytb.png`, `/logo-viber.png`. During development Vite may serve from the root directory, masking this bug. Fix: update all four `src` values to use the hyphenated filenames from `public/`.

3. **H1 semantic and content hierarchy is inverted (lines 201-207)** — Trangchu.md defines "Thu ky AI danh cho ban" as the eyebrow badge and "Bien moi cuoc hop, trao doi thong tin thanh tri thuc co cau truc." as the main headline. The code puts "Thu ky AI danh cho ban" as the `<h1>` (line 204) and demotes the primary value proposition to a `<p>` (line 207). This harms SEO (wrong keyword in H1) and visual hierarchy (the most impactful statement is not the page's largest text). The plan also specifies gradient text on "tri thuc" which is absent. Fix: make "Bien moi cuoc hop..." the `<h1>`, wrap "tri thuc" in `<span className="signature-gradient bg-clip-text text-transparent">`, and move "Thu ky AI danh cho ban" into the eyebrow badge.

---

## Detailed Findings

### Pillar 1: Visual Hierarchy & Layout (2/4)

**What works:**
- Two-column hero (7/5 split via `lg:col-span-7` / `lg:col-span-5`) gives text appropriate weight dominance over the video embed.
- Pricing section uses `transform: scale(1.05)` plus a "PHO BIEN NHAT" badge to visually elevate the featured "Chuyen Vien" plan — a classic and effective emphasis pattern.
- FAQ section uses a 1/3 + 2/3 sticky-title layout (`sticky top-32`) — effective for long-form Q&A scrolling.
- Section alternation between `bg-surface` and `bg-surface-container-low` creates clear visual rhythm without color noise.
- Enterprise section's dark card (`bg-[#1f2f54]`) creates a strong contrast break in the page's otherwise light-background flow.

**Issues:**

- **H1 content inverted (line 204).** "Thu ky AI danh cho ban" is in the `<h1>`. Trangchu.md and the PLAN.md both specify this as the badge/eyebrow, with "Bien moi cuoc hop..." as the main headline. Additionally, the badge row at line 199-202 conflates two distinct pieces of copy in a single `<div>`: the product tagline and the social proof text ("Duoc ung ho boi: 500..."). The two should be separate elements.

- **Bento grid not implemented (line 277).** The PLAN.md explicitly specified a bento grid for the 8 features: first card `col-span-2`, one card with `primary` background, last card `col-span-3` with gradient overlay. The implementation uses a uniform `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. The `isPrimary` flag on card index 1 only changes background shade — no spanning differentiation. The feature grid is visually flat and misses the designed focal hierarchy.

- **Features section heading (line 273) is left-aligned; pricing section heading (line 302) is `text-center`.** Adjacent full-width sections with inconsistent heading alignment feel disjointed.

- **Navbar uses `grid-cols-3` with no mobile breakpoint (line 100).** On viewports below `md`, the three-column nav grid still renders. With the center nav items hidden and only the logo (left) and hamburger (right) visible, the grid wastes horizontal space and creates uneven logo centering on very small screens.

- **Social proof text at line 201 uses `text-[10px]`**, rendering the key "500 chuyen vien, phong vien" social proof nearly illegible on non-retina displays.

---

### Pillar 2: Color & Contrast (2/4)

**What works:**
- `signature-gradient` applied consistently to the primary CTA, featured pricing badge, and mobile register button.
- Dark enterprise section `bg-[#1f2f54]` with `text-primary-fixed-dim` for body copy — readable contrast.
- Trusted-by logos use `opacity: 0.6` with `grayscale(100%) contrast(1.2)` — consistent, neutral treatment.
- 18 `focus-visible:ring-2 focus-visible:ring-primary` instances ensure keyboard-visible interactions throughout.

**Issues:**

- **Critical contrast failure at line 241.** `bg-secondary-container` resolves to `#eaddff` (light lavender per tailwind.config.js). `text-white` on this produces a contrast ratio of approximately 1.6:1. WCAG 2.1 AA requires 4.5:1 for normal text and 3:1 for large text. The "98%+ Do chinh xac" badge that carries the brand's core accuracy claim is effectively invisible to low-vision users.

- **20+ hardcoded hex values bypass the design token system.** Every hex value must be updated independently when the brand color changes. Key offenders by location:
  - Lines 115, 499: `text-[#1f2f54]` — should be `text-on-background` (token value `#213156`, close but different)
  - Lines 124, 125, 129, 134, 139, 149, 154: `text-[#4E45E4]` and `border-[#4E45E4]` — should be `text-primary` and `border-primary` (identical value, zero-cost fix)
  - Lines 129, 134, 139, 149: `text-[#464555]` — not a defined token; closest is `text-on-surface-variant` (`#4f5e86`)
  - Lines 179-183: Mobile drawer buttons `color: '#4f5e86'` — should be `text-on-surface-variant`
  - Line 401: `bg-[#1f2f54]` — no token equivalent; should define `inverse-surface` or `on-background` usage
  - Lines 331, 388: `border: '1px solid #c7c4d8'` — should be `border-outline-variant` (`#a2b1dd`, close)
  - Line 488: `background: '#f2f3ff'` — this matches `surface-container-low` exactly; use `bg-surface-container-low`

- **Two `#1f2f54` values disagree with `on-background` token.** The config defines `on-background: '#213156'`. The component uses `#1f2f54` in 4 places. These are different colors. One of them is wrong — this creates visual inconsistency in heading colors across the page.

---

### Pillar 3: Typography (3/4)

**What works:**
- `font-headline` (Manrope) used consistently for all section headings and the H1.
- `clamp()` on all four H2 headings provides responsive fluid sizing that prevents overflow on mid-range viewports.
- Clear macro-level size hierarchy: 36px for prices/stats, 24px for pricing plan names, 20px for FAQ questions, 18px for feature headings, 14px for card body copy, 12px for label spans.
- `font-semibold` for nav links, `font-bold` for body emphasis, `font-extrabold` for section headings, `font-black` for price numbers — the weight scale is purposeful.

**Issues:**

- **No gradient text on "tri thuc" (line 207).** The PLAN.md explicitly requires: `H1: "Bien moi cuoc hop..." with gradient text on "tri thuc"`. The subtitle (currently a `<p>`) renders as plain `text-on-surface-variant`. A `<span className="signature-gradient bg-clip-text text-transparent">tri thuc</span>` wrapper is needed inside whichever element carries the headline.

- **`text-[10px]` at line 201** is below the Tailwind minimum (12px = `text-xs`) and below the WCAG 1.4.4 recommended minimum for readable text at normal viewing distance. Replace with `text-xs`.

- **`text-[15px]` at line 115** (nav brand name) is not a Tailwind scale step. Replace with `text-sm` (14px) or `text-base` (16px).

- **Currency symbol inconsistency.** Trangchu.md uses the `d` with stroke (`₫`, Unicode U+20AB). The component uses a plain `d` appended: `399.000d` (lines 315, 345, 373). Use `₫` to match the spec and Vietnamese typographic convention.

- **Pricing subtitle labels deviate from spec.** Trangchu.md says "Danh cho PHONG VIEN" as the plan name. The component uses "DANH CHO NHA BAO" (line 309), "DANH CHO VAN PHONG" (line 340), "DANH CHO NHA NUOC" (line 368) as eyebrow labels. These are invented categories not in the spec. The spec's "Danh cho PHONG VIEN / CHUYEN VIEN / CAN BO VIEN CHUC" should be the displayed identity.

---

### Pillar 4: Spacing & Density (3/4)

**What works:**
- Section vertical rhythm is consistent: `py-32` (128px) on all major content sections, `py-16` on the social proof strip.
- Card internal padding is consistent: `p-8` on feature cards, `p-10` on pricing cards.
- `space-y-*`, `gap-*`, and `mb-*` classes are predominantly Tailwind-native.
- `max-w-[1440px] px-12` applied uniformly as a container pattern across sections.

**Issues:**

- **59 inline `style={{}}` blocks.** Many contain spacing and sizing values that have direct Tailwind equivalents:
  - `padding: '20px 40px'` on hero CTA buttons (lines 213, 220) → `py-5 px-10`
  - `padding: '16px 32px'` on enterprise CTA (line 428) → `py-4 px-8`
  - `bottom: '-24px', right: '-24px'` on stat badge (line 241) → `-bottom-6 -right-6`
  - `top: '-16px'` on pricing featured badge (line 339) → `-top-4`
  - `padding: '8px'` on hamburger (line 163) → `p-2`
  - The remaining inline styles for box-shadow, filter, and complex background values are legitimate uses of inline style.

- **Footer horizontal gutter is `px-16`** (line 489) vs `px-12` used on every other section. Inconsistent gutter creates a subtle but visible left-edge shift when scrolling.

- **Two different top-radius values for the same decorative pattern:** Pricing section uses `borderRadius: '5rem 5rem 0 0'` (line 299); footer uses `borderRadius: '3rem 3rem 0 0'` (line 488). If this is a shared design motif it should use the same value.

- **Enterprise card padding `p-16`** (64px) creates a noticeably denser card than the `p-8`/`p-10` cards in features and pricing. This is intentional for premium signaling but the jump is large.

---

### Pillar 5: Interactivity & Feedback (2/4)

**What works:**
- FAQ accordion expand/collapse with `rotate(180deg)` chevron animation and `transition: 300ms ease` — clear directional feedback.
- Hamburger animates to X on open (lines 168-170) — correct expected behavior.
- Primary CTA has `active:scale-95` providing tactile press feedback.
- Pricing outline buttons use `hover:bg-primary hover:text-white` — clear fill-on-hover affordance.
- `aria-expanded` set correctly on both hamburger (line 165) and FAQ items (line 465).

**Issues:**

- **FAQ items use `div[role="button"]` (line 463) instead of a native `<button>`.** The `onKeyDown` handler (line 468) manually restores Enter and Space handling, but native `<button>` elements get this for free, plus correct implicit ARIA role announcement, proper browser default focus management, and guaranteed tab sequence inclusion. This is an ARIA anti-pattern when a native element is available.

- **17 of 18 `<button>` elements are missing `type="button"` (only line 104 has it).** While there is no `<form>` on this page currently, buttons without an explicit type default to `type="submit"` in HTML. If a form is ever introduced above or around these buttons, they will trigger unintended form submissions. This is a defensive coding gap with zero cost to fix.

- **"Tim hieu them (video)" button (line 218) uses `document.querySelector('iframe')`.** This is fragile — it targets the first `<iframe>` found anywhere in the DOM. Adding any other iframe above the hero (e.g., analytics embed) would break this. Fix: add `id="demo-video"` to the hero iframe and scroll to `document.getElementById('demo-video')`.

- **Social icon buttons (lines 521-529) have no `onClick` handler.** They render as interactive buttons with `aria-label` but no action. Users who click them get no feedback and no navigation. Either add external URL navigation or convert to `<a href rel="noopener noreferrer">` anchor elements.

- **Mobile drawer has no close-on-Escape or close-on-outside-click behavior.** A user who opens the hamburger menu cannot dismiss it with Escape or by clicking elsewhere. This is a common UX gap that causes frustration on mobile and fails WCAG 2.1 Success Criterion 1.4.13 (Content on Hover or Focus) for keyboard users.

- **All footer navigation links navigate to `'/'`** (lines 546, 562). Clicking "Cau chuyen", "Chinh sach thanh toan", "Tin tuc" reloads the homepage with no visible change — silent failure from the user's perspective.

---

### Pillar 6: Accessibility (3/4)

**What works:**
- `aria-label="Menu"` on hamburger (line 164), `aria-expanded` and `aria-controls="mobile-menu"` (lines 165-166).
- `alt` text on all `<img>` tags, including descriptive text for trusted-by logos.
- `aria-label` on all social icon buttons (line 524).
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` on 18 interactive elements — strong keyboard visual feedback coverage.
- `prefers-reduced-motion` in `index.css` line 67 disables all animations globally — excellent inclusion.
- `loading="lazy"` on the YouTube iframe.
- `referrerPolicy="strict-origin-when-cross-origin"` on the iframe — good security hygiene.

**Issues:**

- **Social icon images will 404 in production (lines 516-519).** Paths reference root-level files with spaces in filenames: `/logo facebok.png` (note "facebok" typo), `/logo zalo.png`, `/logo ytb.png`, `/viber.png`. Vite dev server serves from project root during development, masking this. A production build only includes `public/` contents. The correct versions already exist in `public/`: `/logo-facebook.png`, `/logo-zalo.png`, `/logo-ytb.png`, `/logo-viber.png`. Fix all four `src` values.

- **External logo URL dependency (lines 111, 495).** The navbar and footer logo load from `https://neuronsai.net/assets/NAI.png`. If this external URL is unavailable, both brand marks show broken images. The file already exists at `public/NAI.png`. Fix: change both `src` values to `/NAI.png`.

- **No `<main>` landmark wraps page content.** The entire page is inside a `<div>` (line 96). Screen reader users cannot use the "jump to main content" shortcut, requiring them to tab through all 6 navigation links on every page load. Fix: wrap the hero and all sections in `<main id="main-content">` and add a skip link as the first child of the outer div: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Bo qua dieu huong</a>`.

- **`<header>` element used for the hero section (line 196).** In HTML semantics, a `<header>` as a direct child of `<body>` represents the site header. The marketing hero is not the site header — the `<nav>` above is. Change to `<section aria-label="Gioi thieu san pham">` inside `<main>`.

- **Active nav item has no `aria-current` attribute (line 123).** The "San pham" link has a visual underline but no `aria-current="page"`. Screen reader users cannot determine which nav item corresponds to the current page.

- **Icon-only arrow spans lack `aria-hidden="true"`.** The `keyboard_arrow_down` span (line 475) inside FAQ items is purely decorative — the expanded/collapsed state is already communicated by `aria-expanded` on the parent. Without `aria-hidden="true"`, screen readers may announce the icon name redundantly.

---

## Registry Safety

`components.json` not detected. Registry audit skipped.

---

## Files Audited

| File | Purpose |
|------|---------|
| `components/HomePage.tsx` | Primary component (580 lines) — full audit |
| `tailwind.config.js` | Design token definitions — color system reference |
| `index.css` | Global styles — gradient, glass-panel, animation, breakpoint classes |
| `Trangchu.md` | Content specification — copy, sections, pricing, footer |
| `.planning/quick/260401-mkq-.../260401-mkq-PLAN.md` | Execution plan — styling intent, icon choices |
| `.planning/quick/260401-mkq-.../260401-mkq-SUMMARY.md` | What was built — deviation tracking |

---

## Issue Quick Reference

| # | Issue | Line(s) | Severity |
|---|-------|---------|----------|
| 1 | `text-white` on `bg-secondary-container` (#eaddff) — contrast ~1.6:1, fails WCAG AA | 241 | Critical |
| 2 | Social icon src paths have spaces + typo — will 404 in production | 516-519 | High |
| 3 | H1 is eyebrow tagline; main headline demoted to `<p>` — SEO and hierarchy inversion | 204, 207 | High |
| 4 | Gradient text on "tri thuc" not implemented (specified in PLAN.md) | 207 | Medium |
| 5 | External logo URL dependency — `/NAI.png` already exists in public/ | 111, 495 | Medium |
| 6 | FAQ items use `div[role=button]` instead of native `<button>` | 463 | Medium |
| 7 | 17 of 18 buttons missing `type="button"` | multiple | Medium |
| 8 | No `<main>` landmark — screen reader users cannot skip navigation | 96 | Medium |
| 9 | 20+ hardcoded hex values bypass Tailwind token system | multiple | Medium |
| 10 | Pricing category eyebrow labels deviate from Trangchu.md spec | 309, 340, 368 | Low |
| 11 | Currency symbol `d` used instead of `d-stroke` (U+20AB) per spec | 315, 345, 373 | Low |
| 12 | `text-[10px]` below readable minimum — replace with `text-xs` | 201 | Low |
| 13 | `text-[15px]` non-Tailwind-scale — replace with `text-sm` or `text-base` | 115 | Low |
| 14 | Footer gutter `px-16` inconsistent with `px-12` on all other sections | 489 | Low |
| 15 | Social icon buttons have no click handler — dead interactive elements | 521-529 | Low |
| 16 | Bento grid (col-span-2/3 featured cards) from spec not implemented | 277 | Low |
| 17 | `active nav aria-current` missing on "San pham" nav item | 123 | Low |

## UI REVIEW COMPLETE
