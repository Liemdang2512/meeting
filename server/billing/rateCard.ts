import type {
  BillingActionType,
  BillingRateDefinition,
  CreditPackDefinition,
  CreditPackId,
} from './types';

const CREDIT_PACKS: Record<CreditPackId, CreditPackDefinition> = {
  specialist: { packId: 'specialist', priceVnd: 299000, credits: 299000 },
  reporter: { packId: 'reporter', priceVnd: 399000, credits: 399000 },
  officer: { packId: 'officer', priceVnd: 499000, credits: 499000 },
};

const ACTION_RATES: Record<BillingActionType, BillingRateDefinition> = {
  'minutes-generate': { actionType: 'minutes-generate', costCredits: 10000 },
};

function failUnknown(kind: 'pack' | 'action', value: string): never {
  throw new Error(`Unknown ${kind} type: ${value}`);
}

export function getPackPrice(packId: CreditPackId | string): number {
  const pack = CREDIT_PACKS[packId as CreditPackId];
  return pack ? pack.priceVnd : failUnknown('pack', packId);
}

export function getPackCredits(packId: CreditPackId | string): number {
  const pack = CREDIT_PACKS[packId as CreditPackId];
  return pack ? pack.credits : failUnknown('pack', packId);
}

export function getActionCost(actionType: BillingActionType | string): number {
  const rate = ACTION_RATES[actionType as BillingActionType];
  return rate ? rate.costCredits : failUnknown('action', actionType);
}
