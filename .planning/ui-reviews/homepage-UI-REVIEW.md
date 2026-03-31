# Homepage — UI Review

**Audited:** 2026-03-21
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md)
**Screenshots:** Not captured — dev server at localhost:3000 serves a different app (AI News Assistant), not the Meeting Scribe homepage. Audit is code-only.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | CTAs are specific; "GIỚI THIỆU" heading mislabels a product demo section |
| 2. Visuals | 2/4 | Tag pills appear after the video they describe; "Chuyên viên" card hardcoded as always-active |
| 3. Color | 2/4 | 8 icon accent colors in features grid; zero design token system, all raw hex |
| 4. Typography | 1/4 | 15+ distinct font-size declarations; 6 font-weight values in use |
| 5. Spacing | 2/4 | All spacing is arbitrary inline pixels with no consistent scale |
| 6. Experience Design | 2/4 | Footer nav links are non-navigable buttons; no FAQ animation; hardcoded active state |

**Overall: 12/24**

---

## Top 3 Priority Fixes

1. **Typography scale explosion (15+ sizes, 6 weights)** — Users perceive visual noise and the page lacks authority; reading hierarchy is undermined — Define a 5-step scale (xs/sm/base/lg/xl) and 3 weights (500/700/900), replace all intermediate values like `0.8rem`, `0.85rem`, `0.9rem`, `0.95rem`, `1.05rem`, `1.1rem` with the nearest scale step.

2. **Feature tag pills placed below video instead of above** — The "NHANH CHÓNG · CHÍNH XÁC · DỄ SỬ DỤNG" pills at line 148 appear after the video ends, breaking the narrative setup — move the tag row to immediately below the "GIỚI THIỆU" heading and before the video iframe so they prime the viewer before watching.

3. **Rainbow accent colors in features grid** — 8 features each use a different icon stroke color (`#2563eb`, `#7c3aed`, `#059669`, `#0891b2`, `#d97706`, `#e11d48`) creating a fairground effect that dilutes brand identity — standardize to 2 accent colors: primary blue `#2563eb` for core features and a secondary neutral slate for supporting ones.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**What works:**
- Primary CTA "Bắt đầu ngay" (lines 119, 222) is action-oriented and benefit-implied.
- Pricing CTAs are differentiated: "Dùng thử ngay" (amber/green tier, lines 389, 462) vs "Bắt đầu ngay" (blue tier, line 426) vs "Liên hệ tư vấn" (enterprise, line 503). Good hierarchy.
- FAQ answers are conversational and specific, not template boilerplate.
- Hero subheading (line 111) concisely states the core value proposition.
- Mobile CTA is "Đăng ký miễn phí" (line 96) — more explicit than desktop's "Đăng ký". Slight inconsistency but net positive.

**Issues:**
- Line 131: `<h2>GIỚI THIỆU</h2>` — "Introduction" as a panel heading inside a product card is weak. The section shows a live YouTube demo and use-case cards. A label like "XEM SẢN PHẨM HOẠT ĐỘNG" or "DEMO TRỰC TIẾP" would communicate what the user is about to see.
- Line 57: "Meeting Minute I Thư ký AI" — the "I" character between the English and Vietnamese names reads as the letter "I" not a separator. If intended as a divider, use "·" or a pipe `|` with spacing. If intentional branding, it is ambiguous.
- Line 234: "Không chỉ là công cụ, chúng tôi hiểu công việc của bạn" is a claim with no supporting evidence in the subheading position — reads as marketing filler. The features grid below does the proving; the subheading could reference that: "Được xây dựng cho từng ngành nghề cụ thể."

### Pillar 2: Visuals (2/4)

**What works:**
- Hero hierarchy is clear: massive h1 → subtitle → single CTA button. Good focal point.
- Sticky nav with backdrop blur is a solid pattern.
- Pricing section uses dark card for "Phổ biến nhất" to create visual distinction.
- `shadow-xl-soft` custom shadow on the product preview card creates appropriate depth.

**Issues:**
- **Tag pill order (lines 147-151):** The three badge pills NHANH CHÓNG / CHÍNH XÁC / DỄ SỬ DỤNG appear after the 16:9 video embed. The user watches the video then sees what it was supposed to be about. The pills should precede the video to frame the experience.
- **Hardcoded "active" state on Chuyên viên card (line 179):** `className="mode-card active"` is static — the card is always highlighted with a blue border regardless of user interaction. This is a visual affordance (clickable, selected) with no corresponding behavior. Users who click other cards see nothing happen, breaking the implied interaction contract.
- **"Phù hợp với" label (line 156):** Styled in `#94a3b8` (very light gray) at 0.75rem — this section label is nearly invisible before the use-case cards grid. It needs more weight or a different treatment to function as a section header.
- **Features grid gap inconsistency:** `gap: '48px 56px'` at line 236 uses unequal row/column gaps which on auto-fit grids can look unbalanced at mid breakpoints.
- **Social buttons in footer (lines 568-578):** Image-only buttons with no visible label. They have `title` attribute but `title` is not reliable for screen readers and has no visible tooltip on mobile.

### Pillar 3: Color (2/4)

**What works:**
- Primary blue `#2563eb` is used consistently for main CTAs and primary interactive elements.
- The dark pricing card (`#0f172a`) creates intentional contrast within the pricing row.
- Background alternation between `white` and `#f8fafc` sections gives gentle rhythm.

**Issues:**
- **No token system:** All colors are raw hex strings in inline styles. There are 20+ distinct color values across the file with no central definition. Any brand color update requires find-replace across hundreds of lines.
- **8-color features icon rainbow (lines 240-314):** Icons use: `#2563eb` (blue), `#7c3aed` (purple), `#059669` (green), `#7c3aed` (purple repeat), `#0891b2` (cyan), `#059669` (green repeat), `#d97706` (amber), `#e11d48` (rose). 6 unique accent colors for 8 feature icons is visually chaotic. Standard practice is 1-2 accent colors with icon backgrounds doing the color differentiation (which is already happening via `bg` per card).
- **Brand color inconsistency:** The logo brand uses `#3b5bdb` (line 57, footer line 561) while all buttons and accents use `#2563eb`. These are similar blues but distinct — the brand color and the action color are mismatched.
- **`#60a5fa` in dark pricing card (line 416):** Using blue-400 (`#60a5fa`) for checkmarks on a dark `#0f172a` background produces lower contrast than white or the standard `#93c5fd`. Recommend checking WCAG AA on this combination.

### Pillar 4: Typography (1/4)

**Font size inventory (from code):**
- `0.75rem` — micro labels (×6 uses)
- `0.8rem` — card bullet text (×3 uses)
- `0.85rem` — trusted-by label (×1)
- `0.875rem` — nav, footer body, pricing bullets (×6)
- `0.9rem` — features grid body (×1)
- `0.95rem` — pricing buttons (×2)
- `1rem` — FAQ questions, mobile nav (×3)
- `1.05rem` — features grid title (×1)
- `1.1rem` — features section subtitle (×1)
- `1.125rem` — hero button, use-case card titles (×3)
- `1.25rem` — GIỚI THIỆU heading button CTA (×2)
- `1.5rem` — GIỚI THIỆU heading (×1)
- `2.75rem` — pricing prices (×3)
- `3.5rem` — enterprise price (×1)
- `clamp(1.75rem, 3.5vw, 2.5rem)` — section headings (×3)
- `clamp(2rem, 4vw, 3rem)` — pricing heading (×1)
- `clamp(2.5rem, 6vw, 4.5rem)` — hero h1 (×1)

That is **17 distinct size expressions** across one component. Best practice for a landing page is 5-6 distinct sizes max.

**Font weight inventory:**
`400, 500, 600, 700, 800, 900` — all 6 weights are used. This is double the recommended maximum of 3 weights per page.

**Structural heading issues:**
- `h1` → hero title (correct)
- `h2` → GIỚI THIỆU, Tại sao chọn MoMai, Bảng giá linh hoạt, Enterprise, Câu hỏi (5× h2 — appropriate)
- `h3` → pricing card names (appropriate)
- `h4` → feature titles inside use-case cards, then footer columns — inconsistent; feature titles are `h4` but occupy visual prominence between h2 sections

### Pillar 5: Spacing (2/4)

**What works:**
- Consistent section-level padding of `80px 1rem` and `96px 1rem` creates macro-level rhythm.
- Card internal padding is consistently `24px` or `40px` across all cards.
- `maxWidth` containers are consistently `1100px` or `1280px`.

**Issues:**
- **All spacing is arbitrary inline pixels** — no Tailwind spacing scale (4px base / multiples of 4). Values like `gap: '48px 56px'`, `gap: '6px'`, `gap: '14px'`, `marginBottom: '36px'` are off the 4px grid.
- **Mixed units:** `marginBottom: '24px'` alongside `margin: '0 auto 24px'` (in shorthand at line 110) alongside `padding: 'clamp(40px, 6vw, 72px)'` — three different patterns for vertical spacing.
- **Non-scale values:** `gap: '14px'` (line 319), `gap: '6px'` (line 169), `marginBottom: '36px'` (line 334) — none of these fall on a 4px or 8px grid.
- **Hero padding shorthand conflict:** Line 104 has `paddingTop: '80px', paddingBottom: '64px', padding: '80px 1rem 64px'` — the shorthand `padding` at the end overrides both individual properties. This is a dead code bug: the first two declarations are unused.

### Pillar 6: Experience Design (2/4)

**What works:**
- Hamburger menu animation (lines 80-83) uses CSS transform with transition for the X animation — functional and smooth.
- Pricing buttons have `onMouseEnter`/`onMouseLeave` hover states for immediate feedback.
- FAQ uses native `<details>/<summary>` — keyboard accessible and works without JavaScript.
- Enterprise CTA has a "Phản hồi trong vòng 24 giờ" (line 505) trust signal below the button — good conversion pattern.

**Issues:**
- **Footer navigation buttons (lines 585-615):** All footer links — "Tin khuyến mãi", "Chính sách bảo mật", "Câu chuyện", etc. — are `<button>` elements with no `href`, no `role="link"`, and no navigation behavior (no `onClick` handler). They are inert. Users cannot right-click to open in new tab, keyboard navigation expects links not buttons for page navigation, and crawlers cannot follow them.
- **Hardcoded active state (line 179):** The "Chuyên viên" use-case card has `className="mode-card active"` hardcoded. There is no `useState` or click handler to change the active card. The visual affordance (blue border, active styling) implies interactivity that does not exist.
- **No FAQ expand/collapse indicator update:** The `<details>` element shows a static `+` span as the indicator (line 544). Native `<details>` uses `[open]` attribute when expanded, but this `+` span does not toggle to `−` on open. Users have no visual confirmation the item expanded beyond the content appearing.
- **Social icon buttons (lines 568-578):** `title` attribute provides tooltip on desktop hover but is inaccessible on mobile and not announced by screen readers. These need `aria-label` instead of or in addition to `title`.
- **No scroll-to-section behavior:** Nav links "Bảng giá" and "Đăng nhập" navigate to separate routes, but there is no anchor-based scroll within the page. A long landing page benefits from smooth-scroll to the pricing section without a full navigation.

---

## Files Audited

- `/Users/tanliem/Desktop/meeting-main/components/HomePage.tsx` (627 lines, primary subject)

**Registry audit:** shadcn not initialized — skipped.
**Screenshots:** Captured to `.planning/ui-reviews/homepage-20260321-182041/` but show a different application (AI News Assistant) served at localhost:3000. Visual assessment is code-derived only.
