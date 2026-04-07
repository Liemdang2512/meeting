import { DEFAULT_OVERDRAFT_LIMIT_CREDITS } from './types';

export const LEGACY_OVERDRAFT_FLOOR_CREDITS = DEFAULT_OVERDRAFT_LIMIT_CREDITS;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isLegacyAccessAllowed(
  legacyAccessUntil: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const sunset = toDate(legacyAccessUntil);
  if (!sunset) {
    return false;
  }

  return now.getTime() <= sunset.getTime();
}

export function canDebitWithOverdraftFloor(
  currentBalanceCredits: number,
  debitAmountCredits: number,
  floorCredits: number = LEGACY_OVERDRAFT_FLOOR_CREDITS,
): boolean {
  if (!Number.isFinite(currentBalanceCredits) || !Number.isFinite(debitAmountCredits)) {
    return false;
  }
  if (debitAmountCredits <= 0) {
    return false;
  }

  return currentBalanceCredits - debitAmountCredits >= floorCredits;
}
