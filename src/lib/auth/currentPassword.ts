import { connectDB } from "@/lib/db/mongoose";
import { AdminUserModel } from "@/models/AdminUser";
import { verifyPassword } from "@/lib/auth/password";
import { ApiError } from "@/lib/api";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

/**
 * Checks the signed-in admin's current password and returns their user doc.
 * Shared by the verify step and the final change so both draw from one
 * rate-limit budget — keyed by user, not IP, so a stolen session cookie can't
 * brute-force the password through either endpoint.
 */
export async function verifyCurrentPassword(userId: string, currentPassword: string) {
  await connectDB();

  const rateLimitKey = `change-password:${userId}`;
  const { allowed, retryAfterSeconds } = rateLimit(rateLimitKey, MAX_ATTEMPTS, WINDOW_MS);
  if (!allowed) {
    throw new ApiError(429, `Too many attempts. Try again in ${retryAfterSeconds}s.`);
  }

  const user = await AdminUserModel.findById(userId);
  if (!user) throw new ApiError(404, "Account not found");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }

  resetRateLimit(rateLimitKey);
  return user;
}
