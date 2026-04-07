# Deferred Items (Out of Scope)

- `npm run test:unit` has pre-existing failures unrelated to plan `11-01`, including:
  - `components/__tests__/UpgradeModal.test.tsx` (5 failing tests)
  - `components/__tests__/PricingPage.test.tsx` (1 failing test)
  - DB-dependent integration suites under `tests/integration/*` and `tests/integration/tokenUsage.test.ts`
- These failures were discovered during plan-level verification and intentionally not fixed because they are outside task scope.
