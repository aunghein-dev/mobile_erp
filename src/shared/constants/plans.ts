import dayjs from "dayjs";

export const BILLING_PLANS = {
  free: { maxUsers: 1 },
  basic: { maxUsers: 5 },
  pro: { maxUsers: 20 },
  business: { maxUsers: 100 },
} as const;

export function isBillingExpired(expiredDate: string) {
  if (!expiredDate) return false;
  return !dayjs(expiredDate).isAfter(dayjs());
}

export function availableUserLimit(planCode: string) {
  const key = (planCode || "").toLowerCase() as keyof typeof BILLING_PLANS;
  return BILLING_PLANS[key]?.maxUsers ?? 0;
}

export function canCreateTeller(currentUsers: number, expiredDate: string, planCode: string) {
  if (isBillingExpired(expiredDate)) return false;
  return currentUsers < availableUserLimit(planCode);
}
