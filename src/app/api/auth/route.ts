import { cookies } from "next/headers";
import { SESSION_COOKIE, isAuthed, passcodeMatches, tokenFor } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ authed: isAuthed() });
}

export async function POST(req: Request) {
  let passcode = "";
  try {
    const body = await req.json();
    passcode = String(body?.passcode ?? "");
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!process.env.APP_PASSCODE) {
    return Response.json(
      { error: "APP_PASSCODE is not configured on the server." },
      { status: 500 }
    );
  }

  if (!passcodeMatches(passcode)) {
    return Response.json({ error: "Incorrect passcode" }, { status: 401 });
  }

  cookies().set(SESSION_COOKIE, tokenFor(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });

  return Response.json({ authed: true });
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return Response.json({ authed: false });
}
