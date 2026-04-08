---
status: awaiting_human_verify
trigger: "Credit không bị trừ sau khi dùng Gemini API. Và số "Số tiền còn để sử dụng dịch vụ" trong trang quản lý user hiển thị số credit (không phải VND)."
created: 2026-04-07T00:00:00Z
updated: 2026-04-07T00:00:00Z
---

## Current Focus

hypothesis: TWO separate bugs found via code reading — (1) credit not deducted because billing flow charges in raw credits but UserManagementPage shows raw balance_credits without VND conversion, (2) quota endpoint table name mismatch causes schema fallback, (3) UserManagementPage "Số tiền còn để sử dụng dịch vụ" column renders balance_credits (raw integer) not VND.
test: Reading all relevant code files to trace data flow
expecting: Root causes confirmed with specific code locations
next_action: Document bugs and apply fixes

## Symptoms

expected: Sau khi gọi /api/gemini/generate thành công, credit của user phải bị trừ tương ứng với số output tokens. Trang quản lý user phải hiển thị số dư bằng VND (không phải credits thô).
actual: Credit không bị trừ. Trang quản lý user hiển thị số credit thô thay vì VND.
errors: Không rõ có lỗi server hay không — cần kiểm tra billing flow.
reproduction: Gọi API generate, kiểm tra DB user_wallets hoặc billing_transactions, credit không thay đổi.
timeline: Chưa rõ khi nào bắt đầu lỗi.

## Eliminated

- hypothesis: authorizeAndCharge không ghi DB
  evidence: Code hoàn toàn đúng — có tx block, UPDATE wallet_balances, INSERT wallet_ledger. Nếu không có skippedReason thì ghi DB bình thường.
  timestamp: 2026-04-07

- hypothesis: amountCredits luôn bằng 0
  evidence: resolveBillableOutputTokens fallback về text.length/4 nếu không có usageMetadata. getOutputTokenChargeCredits trả về 0 chỉ khi tokens=0. Với prompt thực tế sẽ > 0.
  timestamp: 2026-04-07

## Evidence

- timestamp: 2026-04-07
  checked: server/billing/billingService.ts — isLegacyAccessAllowed path
  found: Nếu user có row trong legacy_migration_assignments VÀ legacy_access_until chưa hết hạn thì authorizeAndCharge trả về skippedReason='legacy-access' và KHÔNG trừ credits. Đây là cơ chế hợp lệ nhưng có thể là nguyên nhân nếu data migration bị sai.
  implication: Cần kiểm tra bảng legacy_migration_assignments.

- timestamp: 2026-04-07
  checked: server/routes/quota.ts — loadLegacyAssignment query
  found: BUG #1 — quota.ts query bảng `public.migration_assignments` (dòng 70), nhưng billingService.ts query bảng `public.legacy_migration_assignments` (dòng 73). Tên bảng KHÔNG KHỚP giữa hai file.
  implication: Nếu bảng thực tế là legacy_migration_assignments thì quota.ts fallback về balance=0 hoặc lỗi schema. Nếu bảng thực tế là migration_assignments thì billingService không tìm thấy legacy assignment nên đi tiếp vào charge path — nhưng credits vẫn có thể bị skip vì lý do khác.

- timestamp: 2026-04-07
  checked: features/user-management/UserManagementPage.tsx dòng 370, 439-447
  found: BUG #2 — Column header là "Số tiền còn để sử dụng dịch vụ" nhưng input field hiển thị `u.balance_credits` (raw integer, đơn vị credits). Không có conversion sang VND. balance_credits là credits (1 credit ≈ 1 VND theo pack design), nhưng label gây hiểu nhầm. Cần format hoặc đổi label.
  implication: Đây là bug display — user thấy số như 299000 nghĩ là credits thô, không hiểu đây là ~VND tương đương.

- timestamp: 2026-04-07
  checked: features/pricing/QuotaBadge.tsx dòng 69, 125
  found: QuotaBadge hiển thị "{balance.toLocaleString('vi-VN')} credits" — đúng là raw credits, không convert sang VND. Đây là thiết kế hiện tại (credits ≈ VND 1:1 theo pack definition).
  implication: Không phải bug, là thiết kế. Nhưng label "credits" trong badge và "Số tiền còn để sử dụng dịch vụ" trong admin table gây nhầm lẫn.

- timestamp: 2026-04-07
  checked: server/routes/admin.ts dòng 52-53
  found: Admin list users query lấy `COALESCE(wb.balance_credits, 0) AS balance_credits` từ wallet_balances — đây là raw credits. Không có VND conversion.
  implication: Data trả về là raw credits. UserManagementPage nhận balance_credits là số nguyên raw.

- timestamp: 2026-04-07
  checked: server/billing/rateCard.ts
  found: Thiết kế: 1 credit = 1 VND (pack priceVnd = credits, e.g. 299000 VND = 299000 credits). Vậy balance_credits thực ra IS VND equivalent, chỉ cần format đúng (thêm đ hoặc VND suffix).
  implication: Không cần conversion math, chỉ cần đổi label từ "credits" sang "₫" hoặc "VND" trong display.

- timestamp: 2026-04-07
  checked: server/routes/gemini.ts — billing flow
  found: Billing flow đúng về logic. authorizeAndCharge được gọi đúng sau khi có outputTokens và amountCredits. Nếu credit không bị trừ thì phải là do: (a) legacy-access skip, (b) zero-amount skip (outputTokens=0), (c) skippedReason không được log ra user.
  implication: Cần kiểm tra server logs để xác nhận skippedReason.

## Resolution

root_cause:
  BUG 1 (Credit không trừ — potential): Trong authorizeAndCharge, nếu user có row trong bảng legacy_migration_assignments với legacy_access_until còn hiệu lực, billing sẽ bị skip hoàn toàn (skippedReason='legacy-access'). Đây là design đúng nhưng nếu data migration sai thì mọi user đều bị skip. Tuy nhiên đây là runtime behavior cần kiểm tra DB.

  BUG 2 (Display — confirmed): UserManagementPage.tsx hiển thị balance_credits (raw integer) trong cột "Số tiền còn để sử dụng dịch vụ" mà KHÔNG có format VND. Vì 1 credit = 1 VND (theo pack design), cần format số với suffix "₫" và dùng toLocaleString('vi-VN') để hiển thị đúng.

  BUG 3 (Table name mismatch — confirmed): quota.ts dòng 70 query `public.migration_assignments` nhưng billingService.ts dòng 73 query `public.legacy_migration_assignments`. Tên bảng không khớp — một trong hai file đang query sai bảng.

fix:
  1. UserManagementPage.tsx: Thêm format VND cho balance_credits display — hiển thị "{value.toLocaleString('vi-VN')} ₫" thay vì raw number.
  2. quota.ts: Sửa tên bảng trong loadLegacyAssignment query từ `public.migration_assignments` thành `public.legacy_migration_assignments` để khớp với billingService.ts.
  3. (Investigation) Kiểm tra DB legacy_migration_assignments — nếu có rows với legacy_access_until trong tương lai thì đó là nguyên nhân credit không bị trừ.

verification: pending human confirm
files_changed:
  - server/routes/quota.ts
  - features/user-management/UserManagementPage.tsx
