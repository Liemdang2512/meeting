# Internal App UI-SPEC (Post-login Only)

## 0) Scope and Constraints
- Pham vi ap dung: `login/register`, `app shell`, `meeting flow`, `mindmap`, `user management`, `settings`, `pricing`, `workflow pages`.
- Khong ap dung cho landing/homepage (`HomePage`) theo rang buoc.
- Muc tieu UX: giao dien SaaS chuyen nghiep, ro rang cho 3 nhom nguoi dung: phong vien, doanh nghiep, can bo phap ly.

## 1) Baseline Hien Trang (Codebase)
- Chua co design system trung tam (`components.json` khong ton tai, khong co shadcn init).
- Token mau/spacing dang hardcode phan tan trong nhieu file (`#1E3A8A`, `#1E40AF`, `slate-*`, `indigo-*` dung xen ke).
- Typography xung dot: `tailwind.config.js` dat `DM Sans`, nhung `index.css` set `Inter`; can hop nhat.
- Muc do component reuse con thap (nut/input/modal/table lap lai class string tai `App.tsx`, `UserManagementPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`).
- Route workflow `specialist` dang redirect thang ve `/meeting`, trong khi `reporter/officer` la placeholder; co nguy co trai ky vong nguoi dung.

## 2) Design Contract Theo 6 Tru Cot

### A. Visual Hierarchy
- 3 cap heading:
  - H1 page: `28px / 600 / lh 1.2`
  - H2 section: `20px / 600 / lh 1.3`
  - Body: `15px / 400 / lh 1.5`
- Muc tieu quet nhanh: moi page co `Page Header -> Primary Actions -> Main Content -> Secondary Info`.
- Trang admin va legal uu tien mat do thong tin, khong dung hero block lon.

### B. Consistency
- Dung 1 he token duy nhat (mau, radius, shadow, focus).
- Cung 1 quy tac trang thai cho button/input/badge/table.
- Khong dung emoji lam icon UI cho flow chinh (chi chap nhan tam thoi o placeholder, can thay Lucide).

### C. Accessibility
- Contrast toi thieu WCAG AA cho text thuong.
- Tat ca input co label ro rang, thong bao loi co `aria-live="polite"` cho form submit state.
- Focus ring bat buoc hien thi bang ban phim.
- Hit area toi thieu: 40px (khuyen nghi 44px cho nut quan trong).

### D. Interaction Feedback
- Quy tac loading: skeleton/inline spinner theo context, khong block toan page neu khong can.
- Quy tac success/error: dung inline alert/toast co action tiep theo ro rang.
- Disable state phai co ly do (tooltip/description) cho nut bi khoa.

### E. Responsiveness
- Breakpoint contract:
  - Mobile: <768
  - Tablet: 768-1023
  - Desktop: >=1024
- Table admin bat buoc co behavior mobile: priority columns + horizontal scroll co sticky action.
- Header/tab app shell tranh stack qua nhieu dong tren mobile; uu tien overflow menu.

### F. Performance-aware UI
- Giu lazy loading cho route lon (dang co) va bo sung skeleton thay vi spinner trang.
- Tranh re-render nheiu o bang lon: tach row component + memo cho cell interactive.
- Virtualize neu danh sach user/log > 200 dong.

## 3) Design Tokens De Xuat (Professional Legal SaaS)

### Color
- **Primary / Brand**
  - `--color-primary-700: #1E3A8A`
  - `--color-primary-600: #1E40AF`
  - `--color-primary-50: #EFF6FF`
- **Neutral**
  - `--color-bg: #F8FAFC`
  - `--color-surface: #FFFFFF`
  - `--color-border: #E2E8F0`
  - `--color-text: #0F172A`
  - `--color-text-muted: #475569`
- **Semantic**
  - `--color-success: #047857`
  - `--color-warning: #B45309`
  - `--color-danger: #B91C1C`
  - `--color-info: #0369A1`
- Ty le 60/30/10:
  - 60% `bg/surface` (nen va card)
  - 30% neutral secondary (border, muted blocks, tabs in-active)
  - 10% accent primary (CTA chinh, focus, active tab, selected states)

### Typography
- Font stack thong nhat: `Inter, system-ui, sans-serif` (de dong bo voi `index.css` hien tai).
- 4 co chu:
  - `12` (caption/meta)
  - `15` (body)
  - `20` (section title)
  - `28` (page title)
- Weight dung 2 muc:
  - `400` (normal)
  - `600` (semibold)

### Spacing
- Scale 4-point: `4, 8, 12, 16, 24, 32, 40, 48`.
- Khoang cach section trong page: `24`.
- Padding card mac dinh: `16` (desktop co the `24`).

### Radius, Shadow, Border
- Radius:
  - Input/button: `10-12`
  - Card/modal: `16`
- Shadow:
  - Surface default: `0 1px 2px rgba(15,23,42,0.08)`
  - Elevated modal/dropdown: `0 10px 30px rgba(15,23,42,0.12)`
- Border width: 1px default, 2px cho selected state.

### Focus Styles
- Focus ring chuan:
  - `outline: none`
  - `box-shadow: 0 0 0 3px rgba(30,64,175,0.25)`
  - Border doi sang `primary-600`.

## 4) Component Standards (Can Chuan Hoa)

### Button
- Variants: `primary`, `secondary`, `ghost`, `danger`.
- Kich thuoc: `sm (36)`, `md (40)`, `lg (44)`.
- Co trang thai: `default / hover / active / disabled / loading`.
- Quy tac: loading giu width nut, icon trai text.

### Input / Select / Textarea
- Label luon o tren.
- Help text va error text tach ro.
- Error state: border danger + helper text danger.
- Numeric/date input admin can width/token thong nhat.

### Card
- Cung token bg/border/shadow/radius.
- Card title dung `20/600`, body `15/400`.
- Card action area cach content bang divider 1px.

### Table
- Header sticky, cot hanh dong ben phai sticky tren desktop.
- Zebra nhe hoac hover state nhat quan.
- Mobile: card-row fallback hoac priority columns.

### Tabs
- App shell tabs: active indicator + keyboard navigation.
- Khong de tab selected phu thuoc chi vao mau; bo sung border/underline.

### Modal
- 3 loai: confirm, form, destructive.
- Trap focus + ESC close + click outside (tru destructive critical).
- Footer button order: secondary ben trai, primary/destructive ben phai.

### Badge / Status
- Badge role/quota/workflow dung 1 map mau semantic.
- Khong mix badge rounded-full va rounded-xl ngau nhien cho cung nghia.

### Empty / Loading / Error States
- Empty state: icon + 1 cau mo ta + 1 CTA.
- Loading:
  - Inline: spinner nho + text ngan.
  - Page section: skeleton thay cho spinner lon.
- Error: mo ta van de + hanh dong tiep (`Thu lai`, `Lien he`).

## 5) Page-level Guidance (Sau Dang Nhap)

### Login / Register (`components/LoginPage.tsx`, `components/RegisterPage.tsx`, `components/auth/AuthShell.tsx`)
- Giu auth shell hien tai, nhung chuan hoa token mau/typography.
- Register group selector doi sang card checklist co icon role (khong chi text).
- Form error chuyen ve inline alert component dung chung.

### App Shell + Meeting Flow (`App.tsx`)
- Tach phan UI lon trong `App.tsx` thanh subcomponents theo step de giam do phuc tap.
- Header: gom action phu vao overflow menu tren mobile.
- Stepper: toi uu contrast + states, bo class bat thuong (`group- group-`) va icon emoji.
- API key modal/toast/alert chuyen sang component dung chung.

### Mindmap (`features/mindmap/*`)
- Giu canvas va export flow, nhung thong nhat button/input with global tokens.
- Empty state co the giu illustration, nhung doi palette ve token neutral/primary.
- Tranh mix inline style va tailwind cho cung component tru vung ReactFlow bat buoc.

### User Management (`features/user-management/UserManagementPage.tsx`)
- Tach thanh: page header, filters bar, users table, modal set.
- Chuan hoa mau destructive (xoa), hien thi permission warning ro hon.
- Bo sung bulk actions (future phase) nhung khong lam thay doi behavior hien tai.

### Settings (`features/settings/WorkflowGroupsSection.tsx`)
- Doi card select group sang `selection-card` component dung lai cho register.
- Save state hien thi non-blocking toast + timestamp "da cap nhat".

### Pricing (`features/pricing/PricingPage.tsx`)
- Card pricing theo cung token card/button; highlight card khong over-shadow.
- CTA hierarchy ro: `Goi hien tai` disabled neutral, `Nang cap` primary, `Lien he` secondary.
- Copy goi can huong business/professional (giam marketing tone neu o app nội bộ).

### Workflow Pages (`features/workflows/*`)
- Reporter/Officer placeholder can co empty state chuan + timeline "sap co".
- Specialist redirect nen them notice 1 lan ("ban duoc chuyen ve luong lam viec chinh").
- Group switcher dung segmented control component chuan.

## 6) Anti-patterns Can Tranh Trong Codebase Nay
- Hardcode mau hex lap lai trong JSX (`#1E3A8A`, `#1E40AF`) khong qua token.
- Emoji lam icon trong nut/step (`⚡`, `🔍`, `🧠`, `🗺`) cho man hinh nghiep vu.
- 1 file qua lon (`App.tsx`) vua routing vua view logic vua UI details.
- Modal style copy-paste (overlay/radius/button) khong qua base component.
- Border radius khong nhat quan (`rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`) cho cung loai control.
- Font family xung dot (`DM Sans` vs `Inter`) gay truot visual.

## 7) Migration Plan (Nho, It Rui Ro)

### Phase 1 - Token Foundation (thap rui ro)
- [ ] Tao `styles/tokens.css` + map tailwind theme extension cho color/radius/shadow.
- [ ] Chot 1 font stack (de xuat Inter) va bo config xung dot.
- [ ] Tao helper class focus ring dung chung.

### Phase 2 - Base UI Primitives
- [ ] Tao components trong `components/ui/`: `Button`, `Input`, `Card`, `Modal`, `Badge`, `AlertState`.
- [ ] Ap dung truoc cho `LoginPage`, `RegisterPage`, `WorkflowGroupsSection`.
- [ ] Dam bao snapshot/test rendering khong doi behavior.

### Phase 3 - App Shell and Core Flows
- [ ] Refactor `App.tsx` thanh section components (`HeaderNav`, `StepIndicator`, `MeetingStep*`).
- [ ] Chuan hoa tab/header/toast/modal sang primitives.
- [ ] Test flow meeting end-to-end (upload -> summary -> export/email).

### Phase 4 - Admin and Data-heavy Views
- [ ] Refactor `UserManagementPage` layout + table responsiveness.
- [ ] Giam rerender bang tach row component + memo.
- [ ] Bo sung empty/loading/error components thong nhat.

### Phase 5 - Mindmap and Workflow Polish
- [ ] Dong bo visual mindmap controls voi design token.
- [ ] Chuan hoa placeholder workflow pages theo empty state contract.
- [ ] Rasoat a11y keyboard/focus tren toan bo post-login app.

## 8) Xung Dot / Rui Ro Voi Implementation Hien Tai
- Xung dot font: `tailwind.config.js` va `index.css` khac nhau -> visual drift.
- Neu doi token mau dong loat, nguy co sai contrast o cac state custom (admin table, warning/danger modals).
- Tach `App.tsx` co the anh huong flow state phuc tap (viewStep, status, modal refs) neu khong co regression tests.
- Chuyen emoji sang icon set co the tac dong test snapshot/hinh anh mong doi.
- User management table dang nhieu hanh vi inline; refactor can uu tien "khong doi API contract".

## 9) Execution Checklist
- [ ] Khong sua `HomePage`/landing.
- [ ] Chuan hoa token truoc, component sau, page cuoi.
- [ ] Moi phase deu co smoke test route lien quan.
- [ ] Moi thay doi UI critical deu test keyboard focus + mobile width 375.
- [ ] Khong trien khai thay doi behavior nghiep vu trong phase UI.
