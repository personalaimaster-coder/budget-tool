import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isKind, isPriority } from "@/lib/categories";

export const runtime = "nodejs";

export async function GET() {
  if (!isAuthed()) return unauthorizedResponse();
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("budget_categories")
      .select("id, name, kind, priority, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return Response.json({ categories: data ?? [] });
  } catch (err) {
    console.error("[categories GET]", err);
    return Response.json({ error: "Failed to load categories" }, { status: 500 });
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

  const name = String(body.name ?? "").trim();
  const kind = body.kind;
  const priority = body.priority;
  const sortOrder = Number(body.sort_order);

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!isKind(kind)) return Response.json({ error: "Invalid kind" }, { status: 400 });
  if (!isPriority(priority))
    return Response.json({ error: "Invalid priority" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        name,
        kind,
        priority,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      })
      .select("id, name, kind, priority, sort_order")
      .single();
    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "A category with that name already exists." },
          { status: 409 }
        );
      }
      throw error;
    }
    return Response.json({ category: data });
  } catch (err) {
    console.error("[categories POST]", err);
    return Response.json({ error: "Failed to create category" }, { status: 500 });
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
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
    update.name = name;
  }
  if (body.kind !== undefined) {
    if (!isKind(body.kind))
      return Response.json({ error: "Invalid kind" }, { status: 400 });
    update.kind = body.kind;
  }
  if (body.priority !== undefined) {
    if (!isPriority(body.priority))
      return Response.json({ error: "Invalid priority" }, { status: 400 });
    update.priority = body.priority;
  }
  if (body.sort_order !== undefined) {
    const so = Number(body.sort_order);
    if (Number.isFinite(so)) update.sort_order = so;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("budget_categories")
      .update(update)
      .eq("id", id)
      .select("id, name, kind, priority, sort_order")
      .single();
    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "A category with that name already exists." },
          { status: 409 }
        );
      }
      throw error;
    }
    return Response.json({ category: data });
  } catch (err) {
    console.error("[categories PATCH]", err);
    return Response.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("budget_categories")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[categories DELETE]", err);
    return Response.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
