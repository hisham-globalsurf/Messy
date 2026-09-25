import { hashPassword } from "@/lib/auth/password";
import { verifyCurrentPassword } from "@/lib/auth/currentPassword";
import { changePasswordSchema } from "@/lib/validation";
import { ok, route } from "@/lib/api";

export const POST = route(async (session, request: Request) => {
  const body = changePasswordSchema.parse(await request.json());

  // Re-verified here even though the UI already ran the verify step — that step
  // is a UX nicety, not something the server can trust.
  const user = await verifyCurrentPassword(session.sub, body.currentPassword);
  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  return ok({ ok: true });
});
