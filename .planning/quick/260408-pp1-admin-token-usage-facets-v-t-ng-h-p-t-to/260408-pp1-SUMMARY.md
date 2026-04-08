# Quick 260408-pp1 — Summary

## Done

- **Root cause:** `availableEmails` / `availableActionTypes` dùng `facets?.emails?.length` — khi API trả `emails: []` hợp lệ, UI coi như chưa có facet và lấy option từ `logs` (một trang).
- **Fix:** Chỉ fallback sang `logs` khi `facets === null` (summary không dùng được). Thêm `aggregateScope` (`off` | `server` | `page`) trong `useTokenUsageLogs`.
- **TokenUsageAdminPage:** `fetchAggregate: true` rõ ràng; gợi ý dưới bộ lọc theo `isLoading` + `aggregateScope`.
- **TokenUsageOverview:** Footnote theo `aggregateScope`; Top người dùng vẫn slice 5 (server chỉ trả 5 user).
- **server/routes/tokenLogs.ts:** `byUser` `LIMIT 5` thay vì 100.

## Files

- `features/token-usage-admin/hooks/useTokenUsageLogs.ts`
- `features/token-usage-admin/TokenUsageAdminPage.tsx`
- `features/token-usage-admin/components/TokenUsageOverview.tsx`
- `server/routes/tokenLogs.ts`

## Commit

(sau khi gsd-tools commit)
