import { GoogleGenAI, Type } from "@google/genai";
import { isAuthed, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildPrompt(categories: string[]): string {
  return `You are a financial parsing assistant for an Indian household (currency is INR / rupees).
The user will dictate an expense out loud. You receive the audio.
1. Transcribe what was said.
2. Extract the numeric amount in rupees (no currency symbol, just the number).
3. Identify a short item name (e.g. "Ice cream", "Petrol").
4. Capture any EXTRA details the user mentioned beyond the item name (e.g. "from BigBasket",
   "for the kids' party", "monthly SIP") into the "description" field. If there are no extra
   details, return an empty string.
5. Map it to EXACTLY ONE of these budget categories: ${categories.join(", ")}.
   If nothing fits well, use "Other".
Respond ONLY with the structured JSON. If you cannot find an amount, set amount to 0.`;
}

export async function POST(req: Request) {
  if (!isAuthed()) return unauthorizedResponse();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let audioBase64 = "";
  let mimeType = "audio/webm";
  let textFallback = "";
  try {
    const body = await req.json();
    audioBase64 = String(body?.audioBase64 ?? "");
    mimeType = String(body?.mimeType ?? "audio/webm");
    textFallback = String(body?.text ?? "");
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!audioBase64 && !textFallback) {
    return Response.json({ error: "No audio or text provided" }, { status: 400 });
  }

  // Load the user's categories from the DB so the AI maps to real buckets.
  let categories: string[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("budget_categories")
      .select("name")
      .order("sort_order");
    categories = (data ?? []).map((c) => c.name as string);
  } catch {
    // fall through; we'll require at least one category below
  }
  if (categories.length === 0) {
    return Response.json(
      { error: "No budget categories set up yet. Add some on the Budget page." },
      { status: 400 }
    );
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER },
      category: { type: Type.STRING, enum: categories },
      item: { type: Type.STRING },
      description: { type: Type.STRING },
      transcript: { type: Type.STRING },
    },
    required: ["amount", "category", "item", "description", "transcript"],
  };

  const ai = new GoogleGenAI({ apiKey });
  const parts: Array<Record<string, unknown>> = [];
  if (audioBase64) {
    parts.push({ inlineData: { mimeType, data: audioBase64 } });
    parts.push({ text: "Parse the expense described in this audio." });
  } else {
    parts.push({ text: `Parse this dictated expense: "${textFallback}"` });
  }

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: buildPrompt(categories),
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
      },
    });

    const text = result.text;
    if (!text) {
      return Response.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text);
    const category = categories.includes(parsed.category)
      ? parsed.category
      : categories.includes("Other")
      ? "Other"
      : categories[0];

    return Response.json({
      amount: Number(parsed.amount) || 0,
      category,
      item: String(parsed.item ?? "").trim(),
      description: String(parsed.description ?? "").trim(),
      transcript: String(parsed.transcript ?? "").trim(),
    });
  } catch (err) {
    console.error("[parse-expense] Gemini error:", err);
    return Response.json(
      { error: "Failed to parse the expense. Please try again." },
      { status: 502 }
    );
  }
}
