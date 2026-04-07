export const CREDIT_PACK_IDS = ['specialist', 'reporter', 'officer'] as const;
export type CreditPackId = (typeof CREDIT_PACK_IDS)[number];

export const BILLING_ACTION_TYPES = ['minutes-generate'] as const;
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

export const DEFAULT_OVERDRAFT_LIMIT_CREDITS = -10_000;

export interface CreditPackDefinition {
  packId: CreditPackId;
  priceVnd: number;
  credits: number;
}

export interface BillingRateDefinition {
  actionType: BillingActionType;
  costCredits: number;
}
