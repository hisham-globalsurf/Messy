import { connectDB } from "@/lib/db/mongoose";
import { AdminUserModel } from "@/models/AdminUser";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation";
import { ApiError, ok, route } from "@/lib/api";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

export const POST = route(async (session, request: Request) => {
  const body = changePasswordSchema.parse(await request.json());
  await connectDB();

  // Keyed by the authenticated user, not IP — this guards against a stolen/leaked
  // session cookie being used to brute-force the current password, same limits as login.
  const rateLimitKey = `change-password:${session.sub}`;
  const { allowed, retryAfterSeconds } = rateLimit(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);
  if (!allowed) {
    throw new ApiError(429, `Too many attempts. Try again in ${retryAfterSeconds}s.`);
  }

  const user = await AdminUserModel.findById(session.sub);
  if (!user) throw new ApiError(404, "Account not found");

  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }

  resetRateLimit(rateLimitKey);
  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  return ok({ ok: true });
});
