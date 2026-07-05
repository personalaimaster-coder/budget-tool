import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { currentMonthKey } from "@/lib/month";

export const runtime = "nodejs";

// Current-month status with category metadata (used for the main-page warnings).
export async function GET() {
  if (!isAuthed()) return unauthorizedResponse();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("budget_status_for_month", {
      p_month: currentMonthKey(),
    });
    if (error) throw error;
    return Response.json({ budgets: data ?? [] });
  } catch (err) {
    console.error("[budget-status]", err);
    return Response.json(
      { error: "Failed to load budget status" },
      { status: 500 }
    );
  }
}
