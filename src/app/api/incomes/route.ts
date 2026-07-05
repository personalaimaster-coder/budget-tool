import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { currentMonthKey, isValidMonthKey } from "@/lib/month";
import { SPENDERS } from "@/lib/categories";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || currentMonthKey();
  if (!isValidMonthKey(month)) {
    return Response.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("incomes")
      .select("id, month, label, amount, spender, created_at")
      .eq("month", month)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const total = (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    return Response.json({ incomes: data ?? [], total });
  } catch (err) {
    console.error("[incomes GET]", err);
    return Response.json({ error: "Failed to load income" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const month = String(body.month ?? "");
  const label = String(body.label ?? "").trim();
  const amount = Number(body.amount);
  const spender = body.spender ? String(body.spender) : null;

  if (!isValidMonthKey(month)) {
    return Response.json({ error: "Invalid month" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (spender && !(SPENDERS as readonly string[]).includes(spender)) {
    return Response.json({ error: "Invalid spender" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("incomes")
      .insert({ month, label: label || null, amount, spender })
      .select("id, month, label, amount, spender, created_at")
      .single();
    if (error) throw error;
    return Response.json({ income: data });
  } catch (err) {
    console.error("[incomes POST]", err);
    return Response.json({ error: "Failed to add income" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = String(body.label).trim() || null;
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0)
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    update.amount = amount;
  }
  if (body.spender !== undefined) {
    const spender = body.spender ? String(body.spender) : null;
    if (spender && !(SPENDERS as readonly string[]).includes(spender))
      return Response.json({ error: "Invalid spender" }, { status: 400 });
    update.spender = spender;
  }
  if (Object.keys(update).length === 0)
    return Response.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("incomes")
      .update(update)
      .eq("id", id)
      .select("id, month, label, amount, spender, created_at")
      .single();
    if (error) throw error;
    return Response.json({ income: data });
  } catch (err) {
    console.error("[incomes PATCH]", err);
    return Response.json({ error: "Failed to update income" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("incomes").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[incomes DELETE]", err);
    return Response.json({ error: "Failed to delete income" }, { status: 500 });
  }
}
