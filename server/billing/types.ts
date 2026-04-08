export const CREDIT_PACK_IDS = ['specialist', 'reporter', 'officer'] as const;
export type CreditPackId = (typeof CREDIT_PACK_IDS)[number];

// Keep in sync with token usage action types emitted by the app.
// These are used for wallet ledger attribution; the actual debit amount is computed elsewhere.
export const BILLING_ACTION_TYPES = [
  'minutes-generate',
  'transcribe-basic',
  'transcribe-deep',
  'transcribe-synthesize',
  'mindmap-generate',
  'checklist-generate',
  'diagram-generate',
  'other',
] as const;
export type BillingActionType = (typeof BILLING_ACTION_TYPES)[number];

export const BILLING_EVENT_TYPES = [
  'topup',
  'debit',
  'refund',
  'migration_grant',
  'migration_expire',
  'adjustment',
] as const;
export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export const DEFAULT_OVERDRAFT_LIMIT_CREDITS = 0;

export interface CreditPackDefinition {
  packId: CreditPackId;
  priceVnd: number;
  credits: number;
}
