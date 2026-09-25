import { Schema, model, models, Types, type Model } from "mongoose";

/** A device where the admin turned on notifications (Settings → General). Kept apart from the
 * member PushSubscription collection so member broadcasts can never reach it and vice versa —
 * even though, on a phone that runs both apps, the endpoint itself can be the very same one
 * (both apps share one origin and service worker, so one browser holds one push subscription). */
export interface AdminPushSubscriptionDoc {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
  updatedAt: Date;
}

const adminPushSubscriptionSchema = new Schema<AdminPushSubscriptionDoc>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true },
);

export const AdminPushSubscriptionModel: Model<AdminPushSubscriptionDoc> =
  (models.AdminPushSubscription as Model<AdminPushSubscriptionDoc>) ??
  model<AdminPushSubscriptionDoc>("AdminPushSubscription", adminPushSubscriptionSchema);
