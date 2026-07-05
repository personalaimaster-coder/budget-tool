export const SPENDERS = ["Husband", "Wife"] as const;
export type Spender = (typeof SPENDERS)[number];

// Budget category kinds.
export const KINDS = ["fixed", "variable", "saving", "investment"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABELS: Record<Kind, string> = {
  fixed: "Fixed Expense",
  variable: "Variable Expense",
  saving: "Saving",
  investment: "Investment",
};

// Display order for grouping on the budget page.
export const KIND_ORDER: Kind[] = ["fixed", "variable", "saving", "investment"];

export const PRIORITIES = ["must_have", "optional"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  must_have: "Must-have",
  optional: "Optional",
};

export type BudgetCategory = {
  id: string;
  name: string;
  kind: Kind;
  priority: Priority;
  sort_order: number;
};

export function isKind(v: unknown): v is Kind {
  return typeof v === "string" && (KINDS as readonly string[]).includes(v);
}

export function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
