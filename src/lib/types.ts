import type { Kind, Priority } from "@/lib/categories";

export type StatusRow = {
  category_id: string;
  category: string;
  kind: Kind;
  priority: Priority;
  sort_order: number;
  planned: number;
  spent: number;
  percentage_used: number;
};

export type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  item_description: string | null;
  description: string | null;
  spender: string;
  date: string;
};
