export const billingPlans = ["free", "student", "pro", "supporter"] as const;

export type BillingPlan = (typeof billingPlans)[number];

export type PlanConfig = {
  id: BillingPlan;
  name: string;
  priceLabel: string;
  dailyLimit: number;
  softLimit: boolean;
  historyLimit: number | null;
  favoriteLimit: number | null;
  checkoutEnv?: string;
  canCreate: boolean;
  canConsult: boolean;
  canUseScore: boolean;
  canUseHighQuality: boolean;
};

export const planConfigs: Record<BillingPlan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "無料",
    dailyLimit: 10,
    softLimit: false,
    historyLimit: 10,
    favoriteLimit: 10,
    canCreate: false,
    canConsult: false,
    canUseScore: false,
    canUseHighQuality: false
  },
  student: {
    id: "student",
    name: "Student β",
    priceLabel: "300円 / 月",
    dailyLimit: 100,
    softLimit: false,
    historyLimit: null,
    favoriteLimit: null,
    checkoutEnv: "STRIPE_STUDENT_PRICE_ID",
    canCreate: true,
    canConsult: true,
    canUseScore: true,
    canUseHighQuality: false
  },
  pro: {
    id: "pro",
    name: "Pro β",
    priceLabel: "500円 / 月",
    dailyLimit: 300,
    softLimit: true,
    historyLimit: null,
    favoriteLimit: null,
    checkoutEnv: "STRIPE_PRO_PRICE_ID",
    canCreate: true,
    canConsult: true,
    canUseScore: true,
    canUseHighQuality: true
  },
  supporter: {
    id: "supporter",
    name: "Supporter β",
    priceLabel: "980円 / 月",
    dailyLimit: 300,
    softLimit: true,
    historyLimit: null,
    favoriteLimit: null,
    checkoutEnv: "STRIPE_SUPPORTER_PRICE_ID",
    canCreate: true,
    canConsult: true,
    canUseScore: true,
    canUseHighQuality: true
  }
};

export function normalizePlan(value: unknown): BillingPlan {
  return billingPlans.includes(value as BillingPlan)
    ? (value as BillingPlan)
    : "free";
}

export function getPlanConfig(plan: unknown) {
  return planConfigs[normalizePlan(plan)];
}

export function getPriceIdForPlan(plan: BillingPlan) {
  const envName = planConfigs[plan].checkoutEnv;
  return envName ? process.env[envName] : null;
}

export function resolvePlanByPriceId(priceId: string | null | undefined): BillingPlan {
  if (!priceId) return "free";

  if (priceId === process.env.STRIPE_STUDENT_PRICE_ID) return "student";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_SUPPORTER_PRICE_ID) return "supporter";

  return "free";
}
