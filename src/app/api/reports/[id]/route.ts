import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { ReportModel } from "@/models/Report";
import { ApiError, ok, route } from "@/lib/api";

export const DELETE = route(
  async (_session, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
    await connectDB();

    const result = await ReportModel.findByIdAndDelete(id);
    if (!result) throw new ApiError(404, "Report not found");

    return ok({ ok: true });
  },
);
