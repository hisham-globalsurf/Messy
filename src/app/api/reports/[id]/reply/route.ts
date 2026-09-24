import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { ReportModel } from "@/models/Report";
import { NotificationModel } from "@/models/Notification";
import { SettingsModel } from "@/models/Settings";
import { reportReplySchema } from "@/lib/validation";
import { sendPushToPerson } from "@/lib/push";
import { publishNotificationsChangedForPerson } from "@/lib/ably";
import { ApiError, ok, route } from "@/lib/api";

/** Admin's direct reply to one member's report — delivered as a "reply"-kind in-app
 * notification (and a best-effort push) targeted at just that member, then the report is
 * removed from the queue since it's now resolved. */
export const POST = route(
  async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid id");
    const { message } = reportReplySchema.parse(await request.json());
    await connectDB();

    const [report, settings] = await Promise.all([
      ReportModel.findById(id).lean(),
      SettingsModel.findOne({ key: "singleton" }).lean(),
    ]);
    if (!report) throw new ApiError(404, "Report not found");
    if (!settings) throw new ApiError(500, "Settings not found");

    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    await NotificationModel.create({
      message,
      personIds: [report.personId],
      kind: "reply",
      expireAt: new Date(Date.now() + TWO_DAYS_MS),
    });

    // Best-effort, same contract as the broadcast notification route — the reply is already
    // saved even if live-push/delivery fails.
    await publishNotificationsChangedForPerson(report.personId.toString());
    let delivered = 0;
    try {
      const result = await sendPushToPerson(report.personId.toString(), {
        title: settings.messName,
        body: message,
        url: "/order",
      });
      delivered = result.sent;
    } catch (err) {
      console.error("Push send failed:", err);
    }

    await ReportModel.findByIdAndDelete(id);

    return ok({ ok: true, delivered }, 201);
  },
);
