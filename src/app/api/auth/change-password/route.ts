import { connectDB } from "@/lib/db/mongoose";
import { AdminUserModel } from "@/models/AdminUser";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation";
import { ApiError, ok, route } from "@/lib/api";

export const POST = route(async (session, request: Request) => {
  const body = changePasswordSchema.parse(await request.json());
  await connectDB();

  const user = await AdminUserModel.findById(session.sub);
  if (!user) throw new ApiError(404, "Account not found");

  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  return ok({ ok: true });
});
