import { Schema, model, models, Types, type Model } from "mongoose";

export interface NotificationDoc {
  _id: Types.ObjectId;
  message: string;
  /** Empty (the default) means every member. Non-empty scopes this notification to just these
   * people — both its in-app visibility (see the member GET route's filter) and, at send time,
   * who actually gets pushed/live-notified (see src/app/api/notifications/route.ts). */
  personIds: Types.ObjectId[];
  /** createdAt + 2 days — MongoDB auto-deletes at this instant (TTL index below); once a
   * notification's meal window has long passed there's no reason to keep it around. */
  expireAt: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    message: { type: String, required: true, trim: true, maxlength: 500 },
    personIds: { type: [Schema.Types.ObjectId], ref: "Person", default: [] },
    expireAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const NotificationModel: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ?? model<NotificationDoc>("Notification", notificationSchema);
