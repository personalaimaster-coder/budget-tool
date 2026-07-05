import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { SPENDERS } from "@/lib/categories";
import { isValidMonthKey, monthEndUtcISO, monthStartUtcISO } from "@/lib/month";

export const runtime = "nodejs";

const SELECT = "id, amount, category, item_description, description, spender, date";

async function categoryNameSet(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Set<string>> {
  const { data } = await supabase.from("budget_categories").select("name");
  return new Set((data ?? []).map((r) => r.name as string));
}

// GET filters: ?month=YYYY-MM-01 &spender= &category= &kind= &limit=
export async function GET(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const spender = searchParams.get("spender");
  const category = searchParams.get("category");
  const kind = searchParams.get("kind");
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("expenses")
      .select(SELECT)
      .order("date", { ascending: false })
      .limit(limit);

    if (month && isValidMonthKey(month)) {
      query = query
        .gte("date", monthStartUtcISO(month))
        .lt("date", monthEndUtcISO(month));
    }
    if (spender && (SPENDERS as readonly string[]).includes(spender)) {
      query = query.eq("spender", spender);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (kind) {
      const { data: cats } = await supabase
        .from("budget_categories")
        .select("name")
        .eq("kind", kind);
      const names = (cats ?? []).map((c) => c.name as string);
      query = query.in("category", names.length ? names : ["__none__"]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ expenses: data ?? [] });
  } catch (err) {
    console.error("[expenses GET]", err);
    return Response.json({ error: "Failed to load expenses" }, { status: 500 });
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

  const amount = Number(body.amount);
  const category = String(body.category ?? "");
  const item = String(body.item_description ?? body.item ?? "").trim();
  const description = String(body.description ?? "").trim();
  const spender = String(body.spender ?? "");
  const date = body.date ? String(body.date) : null;

  if (!Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!(SPENDERS as readonly string[]).includes(spender)) {
    return Response.json({ error: "Invalid spender" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const names = await categoryNameSet(supabase);
    if (!names.has(category)) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }

    const insert: Record<string, unknown> = {
      amount,
      category,
      item_description: item || null,
      description: description || null,
      spender,
    };
    if (date) insert.date = date;

    const { data, error } = await supabase
      .from("expenses")
      .insert(insert)
      .select(SELECT)
      .single();
    if (error) throw error;
    return Response.json({ expense: data });
  } catch (err) {
    console.error("[expenses POST]", err);
    return Response.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

// Retroactive edit.
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

  try {
    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = {};

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0)
        return Response.json({ error: "Invalid amount" }, { status: 400 });
      update.amount = amount;
    }
    if (body.category !== undefined) {
      const names = await categoryNameSet(supabase);
      if (!names.has(String(body.category)))
        return Response.json({ error: "Invalid category" }, { status: 400 });
      update.category = String(body.category);
    }
    if (body.item_description !== undefined)
      update.item_description = String(body.item_description).trim() || null;
    if (body.description !== undefined)
      update.description = String(body.description).trim() || null;
    if (body.spender !== undefined) {
      if (!(SPENDERS as readonly string[]).includes(String(body.spender)))
        return Response.json({ error: "Invalid spender" }, { status: 400 });
      update.spender = String(body.spender);
    }
    if (body.date !== undefined) update.date = String(body.date);

    if (Object.keys(update).length === 0)
      return Response.json({ error: "Nothing to update" }, { status: 400 });

    const { data, error } = await supabase
      .from("expenses")
      .update(update)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    return Response.json({ expense: data });
  } catch (err) {
    console.error("[expenses PATCH]", err);
    return Response.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[expenses DELETE]", err);
    return Response.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
