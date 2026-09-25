import { verifyCurrentPassword } from "@/lib/auth/currentPassword";
import { verifyPasswordSchema } from "@/lib/validation";
import { ok, route } from "@/lib/api";

export const POST = route(async (session, request: Request) => {
  const body = verifyPasswordSchema.parse(await request.json());
  await verifyCurrentPassword(session.sub, body.currentPassword);
  return ok({ ok: true });
});
