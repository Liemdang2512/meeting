---
phase: quick-260401-mkq
plan: 01
subsystem: frontend
tags: [homepage, ui, content, redesign]
dependency_graph:
  requires: []
  provides: [homepage-content-update]
  affects: [components/HomePage.tsx]
tech_stack:
  added: []
  patterns: [bento-grid, glass-panel, signature-gradient, Material-Symbols-Outlined]
key_files:
  created: []
  modified:
    - components/HomePage.tsx
decisions:
  - "Used 4-column bento grid layout for 8 features: first card col-span-2, primary-bg card, 6 normal cards, last card col-span-3 with gradient overlay"
  - "Footer uses 4 columns per Trangchu.md spec: brand description, contact (phone/address/email/socials), support links, about links"
  - "Enterprise section uses bg-primary scheme to match code.html reference; stats panel added as visual element on right side"
  - "Social proof in hero changed to plain text per Trangchu.md (removed avatar images)"
metrics:
  duration: 4min
  completed_date: "2026-04-01"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-260401-mkq Plan 01: Homepage Redesign Summary

**One-liner:** Rewrote HomePage.tsx with exact Vietnamese copy from Trangchu.md across all 8 sections (navbar, hero, 8-feature bento grid, trusted by, 3-plan pricing, enterprise, FAQ, 4-column footer).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite HomePage.tsx with Trangchu.md content and code.html styling | 57e4501 | components/HomePage.tsx |

## What Was Built

Complete rewrite of `components/HomePage.tsx` matching the content structure from `Trangchu.md`:

### Navbar
- Logo "MoMai AI" with primary color
- Menu: Sản phẩm, Tính năng, Bảng giá (scroll to #pricing), Q&A (scroll to #faq)
- Desktop: Đăng nhập + Đăng ký (signature-gradient rounded-full)
- Mobile hamburger with drawer

### Hero Section
- Badge: "Thư ký AI dành cho bạn"
- H1: "Biến mọi cuộc họp, trao đổi thông tin thành tri thức có cấu trúc." (gradient on "tri thức")
- Subtitle: exact Trangchu.md text about âm thanh/video/hình ảnh
- CTAs: "Bắt đầu ngay" (signature-gradient) + "Tìm hiểu thêm" (surface button)
- Social proof: "Được ủng hộ bởi: 500 chuyên viên, phóng viên tại Việt Nam"
- YouTube embed with glass-panel and pulse overlay

### Features/CTA (8 features bento grid)
- Section title: "Ứng dụng sức mạnh của trí tuệ nhân tạo (AI) cho cá nhân"
- Card 1 (col-span-2): Tự động hóa 100% — auto_mode icon
- Card 2 (primary bg): Độ chính xác 98%+ — verified_user icon
- Card 3: Xử lý siêu nhanh — bolt icon
- Card 4: Đa dạng ngôn ngữ — translate icon
- Card 5: Tiết kiệm chi phí — savings icon
- Card 6: Không giới hạn — all_inclusive icon
- Card 7: Đa dạng — swap_horiz icon
- Card 8 (col-span-3, gradient overlay): Phù hợp doanh nghiệp, đội ngũ — groups icon

### Trusted By
- 5 logos preserved: logo-htp, logo-tand, logo-giadinh, logo-hiu, logo-thethao

### Pricing (3 plans)
- "Dành cho PHÓNG VIÊN" — 399.000 ₫, 5 features, "Đăng ký" button
- "Dành cho CHUYÊN VIÊN" (featured, dark bg, scaled) — 299.000 ₫, 5 features, "Đăng ký" button
- "Dành cho CÁN BỘ VIÊN CHỨC" — 499.000 ₫, 5 features, "Đăng ký" button

### Enterprise Section
- Primary bg (bg-primary text-on-primary) per code.html reference
- Title: "Giải pháp dành cho doanh nghiệp"
- Exact copy from Trangchu.md about API, security, team management
- 3 sub-features: Tích hợp API, Bảo mật đa tầng, Quản lý dữ liệu tập trung
- CTA: "Liên hệ tư vấn" (white bg, primary text)

### FAQ (5 items)
- All 5 questions matching Trangchu.md exactly
- Expand/collapse with rotate animation

### Footer (4 columns)
- Col 1: "Meeting Minutes AI" + MoMai description
- Col 2: "Liên hệ" — phone (039 4902181), address, email, social icons (Facebook/Zalo/YouTube/Viber)
- Col 3: "Hỗ trợ khách hàng" — 7 links
- Col 4: "Về chúng tôi" — 4 links
- Copyright: "© 2025 MoMai by NeuronsAI. All rights reserved."

## Deviations from Plan

None - plan executed exactly as written. All sections, copy text, and styling matched Trangchu.md and code.html references.

## Known Stubs

None - all sections are wired with actual content from Trangchu.md. No placeholders or TODOs remain.

## Self-Check: PASSED

- [x] `components/HomePage.tsx` exists and was modified
- [x] Commit 57e4501 exists in git log
- [x] TypeScript compilation passes (no errors)
- [x] All 8 sections present
- [x] Pricing has 3 plans with correct prices (399k, 299k, 499k)
- [x] FAQ has 5 questions
- [x] Footer has 4 columns
- [x] Navigation routes to /login and /register
