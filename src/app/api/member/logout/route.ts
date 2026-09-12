import { NextResponse } from "next/server";
import { clearMemberSessionCookie } from "@/lib/auth/memberSession";

export async function POST(): Promise<Response> {
  await clearMemberSessionCookie();
  return NextResponse.json({ ok: true });
}
