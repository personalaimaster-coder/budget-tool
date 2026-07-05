import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { currentMonthKey, isValidMonthKey } from "@/lib/month";

export const runtime = "nodejs";

type StatusRow = {
  category_id: string;
  category: string;
  kind: string;
  priority: string;
  sort_order: number;
  planned: number;
  spent: number;
  percentage_used: number;
};

// GET ?month=YYYY-MM-01 -> planned vs actual rows for that month.
export async function GET(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || currentMonthKey();
  if (!isValidMonthKey(month)) {
    return Response.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("budget_status_for_month", {
      p_month: month,
    });
    if (error) throw error;

    const rows = (data ?? []) as StatusRow[];
    const hasBudget = rows.some((r) => Number(r.planned) > 0);
    return Response.json({ month, categories: rows, hasBudget });
  } catch (err) {
    console.error("[budgets GET]", err);
    return Response.json({ error: "Failed to load budget" }, { status: 500 });
  }
}

// PUT { month, items: [{ category_id, planned_amount }] } -> upsert planned amounts.
export async function PUT(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const month = String(body.month ?? "");
  if (!isValidMonthKey(month)) {
    return Response.json({ error: "Invalid month" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  const rows: { month: string; category_id: string; planned_amount: number }[] =
    [];
  for (const it of items) {
    const categoryId = String((it as Record<string, unknown>).category_id ?? "");
    const amount = Number((it as Record<string, unknown>).planned_amount);
    if (!categoryId) continue;
    rows.push({
      month,
      category_id: categoryId,
      planned_amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    });
  }

  if (rows.length === 0) {
    return Response.json({ error: "No items to save" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("monthly_budgets")
      .upsert(rows, { onConflict: "month,category_id" });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[budgets PUT]", err);
    return Response.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

// POST { action: "carry_forward", fromMonth, toMonth } -> copy planned amounts.
export async function POST(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action !== "carry_forward") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const fromMonth = String(body.fromMonth ?? "");
  const toMonth = String(body.toMonth ?? "");
  if (!isValidMonthKey(fromMonth) || !isValidMonthKey(toMonth)) {
    return Response.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: source, error: srcErr } = await supabase
      .from("monthly_budgets")
      .select("category_id, planned_amount")
      .eq("month", fromMonth);
    if (srcErr) throw srcErr;

    if (!source || source.length === 0) {
      return Response.json(
        { error: "No budget found in the source month to copy." },
        { status: 400 }
      );
    }

    const rows = source.map((s) => ({
      month: toMonth,
      category_id: s.category_id,
      planned_amount: s.planned_amount,
    }));

    const { error: upErr } = await supabase
      .from("monthly_budgets")
      .upsert(rows, { onConflict: "month,category_id" });
    if (upErr) throw upErr;

    return Response.json({ ok: true, copied: rows.length });
  } catch (err) {
    console.error("[budgets POST carry_forward]", err);
    return Response.json({ error: "Failed to carry forward" }, { status: 500 });
  }
}
