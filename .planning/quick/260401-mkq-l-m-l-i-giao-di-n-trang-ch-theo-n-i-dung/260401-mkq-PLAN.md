---
phase: quick-260401-mkq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/HomePage.tsx
autonomous: true
requirements: [homepage-redesign]

must_haves:
  truths:
    - "Homepage displays all sections from Trangchu.md: Navbar, Hero, 8 Features/CTA, Trusted By, Pricing (3 plans), Enterprise, FAQ (5 items), Footer (4 columns)"
    - "All copy text matches Trangchu.md exactly (Vietnamese content)"
    - "Visual style follows code.html reference: Material Design 3 color palette, Manrope/Inter fonts, signature-gradient, glass-panel effects, rounded-2xl cards"
    - "Navigation links work: Dang nhap -> /login, Dang ky -> /register, Pricing scroll"
  artifacts:
    - path: "components/HomePage.tsx"
      provides: "Complete homepage with all sections from Trangchu.md"
      min_lines: 500
  key_links:
    - from: "components/HomePage.tsx"
      to: "App.tsx router"
      via: "onNavigate prop and handleNav"
      pattern: "handleNav.*login|register"
---

<objective>
Rewrite the HomePage.tsx component to match the content structure defined in Trangchu.md, using the visual style from code.html as reference.

Purpose: The current HomePage has placeholder/outdated copy and slightly different section structure. Trangchu.md defines the authoritative content (exact Vietnamese copy text for every section), while code.html provides the target visual design (color palette, layout patterns, component styles).

Output: Updated `components/HomePage.tsx` with all sections and exact copy from Trangchu.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@components/HomePage.tsx
@Trangchu.md
@code.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite HomePage.tsx with Trangchu.md content and code.html styling</name>
  <files>components/HomePage.tsx</files>
  <action>
Rewrite the entire HomePage.tsx component. Keep the existing component signature (`HomePage({ onNavigate }: HomePageProps)`) and the `handleNav` function unchanged. Replace all section content with the EXACT copy text from Trangchu.md. Use the visual patterns from code.html as the style reference.

**Sections to implement (in order), with EXACT copy from Trangchu.md:**

1. **Navbar (fixed top):** Logo "MoMai AI" | menu items: Tinh nang, Bang gia, Q&A | Dang nhap button | Dang ky button (signature-gradient rounded-full). Keep mobile hamburger menu. Add "San pham" link if needed per Trangchu.md menu spec.

2. **Hero Section:**
   - Badge: "Thu ky AI danh cho ban"
   - H1: "Bien moi cuoc hop, trao doi thong tin thanh tri thuc co cau truc."  with gradient text on "tri thuc"
   - Subtitle: "Tu dong chuyen am thanh, video, hinh anh thanh van ban va tom tat thong tin quan trong chi trong vai giay."
   - CTA buttons: "BAT DAU NGAY" (signature-gradient) + "Tim hieu them" (surface button with play icon)
   - Social proof: "Duoc ung ho boi: 500 chuyen vien, phong vien tai Viet Nam"
   - Right side: Keep the YouTube embed iframe (existing) with glass-panel and pulse overlay

3. **Features/CTA Section (8 features in bento grid):**
   - Section title: "Ung dung suc manh cua tri tue nhan tao (AI) cho ca nhan"
   - 8 feature cards using Material Symbols icons, each with title + description from Trangchu.md:
     1. "Tu dong hoa 100%" - auto_mode icon - "Loai bo hoan toan thao tac thu cong. Chi can tai len cac noi dung can tong hop, AI se xu ly moi khau tu phan tach nguoi noi den tom tat y chinh va hoan thien quy trinh theo quy chuan"
     2. "Do chinh xac 98%+" - verified_user icon - exact text from Trangchu.md
     3. "Xu ly sieu nhanh" - bolt icon - exact text
     4. "Da dang ngon ngu" - translate icon - "Ho tro hon 100 ngon ngu tren the gioi, am hieu ngon ngu dia phuong va nhan dien ngu canh thong minh."
     5. "Tiet kiem chi phi" - savings icon - exact text
     6. "Khong gioi han" - all_inclusive icon - exact text
     7. "Da dang" - swap_horiz icon - "Ho tro chuyen doi nhieu dinh dang: MP3, MP4, WAV, M4A ... sang noi dung tong hop voi cac dinh dang: PDF, docx, So do tu duy..."
     8. "Phu hop doanh nghiep, doi ngu" - groups icon - exact text
   - Use the existing bento grid layout: first card col-span-2, one card with primary bg, last card col-span-3 with image overlay. Adapt for 8 cards.

4. **Trusted By Section:**
   - Title: "DUOC TIN DUNG BOI"
   - Keep existing logo array (logo-htp, logo-tand, logo-giadinh, logo-hiu, logo-thethao)

5. **Pricing Section (3 plans):**
   - Section title: "BANG GIA LINH HOAT"
   - Subtitle: "Chon goi dich vu phu hop nhat voi nhu cau cong viec cua ban"
   - Plan 1 - "Danh cho PHONG VIEN": 399.000 VND, features: Ghi chep khong gioi han, Phong van & hop bao tu dong, Nhan dien nhieu nguoi noi, Xuat PDF DOCX TXT, 100+ ngon ngu
   - Plan 2 (featured) - "Danh cho CHUYEN VIEN": 299.000 VND, features: Khong gioi han gio ghi am, Tu dong tao bien ban hop, Tom tat AI nang cao, Uu tien xu ly sieu toc, Tich hop lich & email
   - Plan 3 - "Danh cho CAN BO VIEN CHUC": 499.000 VND, features: Ghi chep do chinh xac cao nhat, Nhan dien thuat ngu phap ly, Danh dau thoi gian tung cau, Ma hoa & bao mat toi da, Xuat dinh dang toa an
   - Each has "Dang ky" button -> /register

6. **Enterprise Section:**
   - Title: "GIAI PHAP DANH CHO DOANH NGHIEP"
   - Description: exact text from Trangchu.md about API integration, security, team management
   - 3 sub-features: Tich hop API, Bao mat da tang, Quan ly du lieu tap trung - with exact descriptions
   - CTA: "Lien he tu van" button
   - Use primary bg color scheme from code.html (bg-primary text-on-primary)

7. **FAQ Section (5 items with expand/collapse):**
   - Title: "CAU HOI THUONG GAP"
   - Q1: "MoMai AI co ho tro nhan dien tieng Viet tot khong?" with full answer from Trangchu.md
   - Q2: "Du lieu cua toi co duoc bao mat khong?" (expand only, keep existing answer)
   - Q3: "Toi co the huy goi dich vu bat ky luc nao khong?" (expand only, keep existing answer)
   - Q4: "He thong co the phan biet duoc bao nhieu nguoi noi?" (expand only, keep existing answer)
   - Q5: "MOMAI ho tro nhung dinh dang file nao?" (expand only, keep existing answer)

8. **Footer (4 columns per Trangchu.md):**
   - Col 1: "Meeting Minutes AI" brand + description from Trangchu.md: "Automate meeting notes - MoMai su dung tri tue nhan tao..."
   - Col 2: "Lien he" - Phone: 039 4902181, Address: 68 Pho Nguyen Hue..., Email: info@, Social icons (Facebook, Zalo, YouTube, Viber using existing logo images)
   - Col 3: "Ho tro khach hang" - Tai khoan, Chinh sach thanh vien, Chinh sach thanh toan, Tinh nang, Giai phap, Chi phi, Huong dan thanh toan
   - Col 4: "Ve chung toi" - Trang chu, Cau chuyen, Gioi thieu, Tin tuc
   - Copyright: "2025 MoMai by NeuronsAI. All rights reserved."
   - Add Visa/payment icons row if images available, otherwise skip

**Styling rules (from code.html):**
- Keep existing Tailwind custom colors (primary, secondary, surface-*, on-surface-*, etc.)
- Keep glass-panel and signature-gradient CSS classes
- Keep Material Symbols Outlined for icons
- Font: Manrope for headings (font-headline), Inter for body (font-body)
- Rounded corners: rounded-2xl for cards, rounded-full for buttons
- Hover effects: translate-y-[-8px] on feature cards, scale effects on buttons
- Keep the existing `onNavigate` prop pattern and `handleNav` function
- Keep the YouTube iframe in the hero section
- Keep mobile responsive: hidden md:flex for desktop nav, hamburger for mobile
  </action>
  <verify>
    <automated>cd /Users/tanliem/Desktop/meeting-main && npx tsc --noEmit components/HomePage.tsx 2>&1 | head -20</automated>
  </verify>
  <done>
    - HomePage.tsx compiles without TypeScript errors
    - All 8 sections present with exact copy from Trangchu.md
    - Pricing shows 3 plans with correct prices (399k, 299k, 499k) and features
    - FAQ has 5 questions matching Trangchu.md
    - Footer has 4 columns with contact info, support links, about links
    - Enterprise section has API/Security/Management sub-features
    - Navigation buttons route to /login and /register correctly
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete homepage redesign with all content from Trangchu.md and styling from code.html</what-built>
  <how-to-verify>
    1. Run `npm run dev` and visit http://localhost:5173 (or the dev URL)
    2. Verify Navbar: Logo, menu items (Tinh nang, Bang gia, Q&A), Dang nhap/Dang ky buttons
    3. Verify Hero: "Thu ky AI danh cho ban" badge, main heading with gradient text, CTA buttons, social proof "500 chuyen vien"
    4. Scroll to Features: 8 feature cards with correct icons and text from Trangchu.md
    5. Scroll to Trusted By: Logo row
    6. Scroll to Pricing: 3 plans (Phong vien 399k, Chuyen vien 299k featured, Can bo 499k)
    7. Scroll to Enterprise: Purple bg section with API/Security/Management
    8. Scroll to FAQ: 5 expandable questions
    9. Scroll to Footer: 4 columns (brand, contact, support, about), copyright
    10. Test mobile view: hamburger menu works, responsive layout
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues to fix</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compilation passes
- All sections from Trangchu.md are present
- Visual style matches code.html reference
- Navigation works (login, register)
- Mobile responsive
</verification>

<success_criteria>
- Homepage displays all 8 sections with exact Vietnamese copy from Trangchu.md
- Pricing shows 3 plans with correct prices and feature lists
- Footer has 4-column layout with contact info
- Style follows code.html patterns (colors, fonts, gradients, rounded cards)
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/260401-mkq-l-m-l-i-giao-di-n-trang-ch-theo-n-i-dung/260401-mkq-SUMMARY.md`
</output>
