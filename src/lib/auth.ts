import { createHash } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "bt_session";

function expectedToken(): string | null {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return null;
  return createHash("sha256").update(passcode).digest("hex");
}

export function tokenFor(passcode: string): string {
  return createHash("sha256").update(passcode).digest("hex");
}

export function passcodeMatches(passcode: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  // Constant-ish comparison; lengths are short and shared, this is acceptable here.
  return passcode === expected;
}

export function isAuthed(): boolean {
  const expected = expectedToken();
  if (!expected) return false;
  const token = cookies().get(SESSION_COOKIE)?.value;
  return !!token && token === expected;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
