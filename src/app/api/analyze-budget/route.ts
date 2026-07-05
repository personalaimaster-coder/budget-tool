import { GoogleGenAI } from "@google/genai";
import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatINR } from "@/lib/categories";
import {
  currentMonthKey,
  isValidMonthKey,
  monthEndUtcISO,
  monthStartUtcISO,
} from "@/lib/month";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Act as a strict but helpful financial advisor for an Indian couple (currency is INR / rupees).
You are given a month's plan vs actuals, broken down by category kind (fixed, variable, saving, investment)
and priority (must-have vs optional), plus income and who spent what.
In your response:
- State the overall picture: total income, total spent, and net (saved/overspent).
- Point out where they FAILED their budget limits (over 100% used), prioritising must-have overspends.
- Flag optional/"nice-to-have" categories that ate into savings.
- Comment on whether savings & investment targets were met.
- Call out who spent the most in the problem categories.
- Give exactly 3 actionable, highly specific rules for next month.
Be concise and direct. Use clean Markdown with short sections and bullet points.`;

type StatusRow = {
  category: string;
  kind: string;
  priority: string;
  planned: number;
  spent: number;
  percentage_used: number;
};

export async function POST(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let month = currentMonthKey();
  try {
    const body = await req.json();
    if (body?.month && isValidMonthKey(String(body.month))) {
      month = String(body.month);
    }
  } catch {
    // no body -> default to current month
  }

  try {
    const supabase = getSupabaseAdmin();

    const [
      { data: expenses, error: expErr },
      { data: status, error: statErr },
      { data: incomes, error: incErr },
    ] = await Promise.all([
      supabase
        .from("expenses")
        .select("amount, category, item_description, description, spender, date")
        .gte("date", monthStartUtcISO(month))
        .lt("date", monthEndUtcISO(month)),
      supabase.rpc("budget_status_for_month", { p_month: month }),
      supabase.from("incomes").select("amount, spender").eq("month", month),
    ]);

    if (expErr) throw expErr;
    if (statErr) throw statErr;
    if (incErr) throw incErr;

    const totalIncome = (incomes ?? []).reduce(
      (s, r) => s + Number(r.amount),
      0
    );

    if ((!expenses || expenses.length === 0) && totalIncome === 0) {
      return Response.json({
        report:
          "No income or expenses recorded for this month yet. Add some data to get an analysis!",
      });
    }

    const bySpenderCategory: Record<string, number> = {};
    for (const e of expenses ?? []) {
      const key = `${e.spender} | ${e.category}`;
      bySpenderCategory[key] = (bySpenderCategory[key] ?? 0) + Number(e.amount);
    }

    const rows = (status ?? []) as StatusRow[];
    const totalSpent = (expenses ?? []).reduce(
      (s, e) => s + Number(e.amount),
      0
    );

    const summary = {
      month,
      totalIncome,
      totalSpent,
      net: totalIncome - totalSpent,
      planVsActual: rows.map((r) => ({
        category: r.category,
        kind: r.kind,
        priority: r.priority,
        planned: r.planned,
        actual: r.spent,
        percentage_used: r.percentage_used,
      })),
      spendingBySpenderAndCategory: Object.entries(bySpenderCategory).map(
        ([key, total]) => {
          const [spender, category] = key.split(" | ");
          return { spender, category, total };
        }
      ),
      transactionCount: (expenses ?? []).length,
    };

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this month's finances (amounts in INR). Income: ${formatINR(
                totalIncome
              )}, Spent: ${formatINR(totalSpent)}.\n\n${JSON.stringify(
                summary,
                null,
                2
              )}`,
            },
          ],
        },
      ],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.4 },
    });

    const report = result.text;
    if (!report) {
      return Response.json(
        { error: "AI returned an empty report. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ report });
  } catch (err) {
    console.error("[analyze-budget]", err);
    return Response.json(
      { error: "Failed to generate the report. Please try again." },
      { status: 500 }
    );
  }
}
