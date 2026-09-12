import { Schema, model, models, Types, type Model } from "mongoose";

export interface NotificationDoc {
  _id: Types.ObjectId;
  message: string;
  /** createdAt + 2 days — MongoDB auto-deletes at this instant (TTL index below); once a
   * notification's meal window has long passed there's no reason to keep it around. */
  expireAt: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    message: { type: String, required: true, trim: true, maxlength: 500 },
    expireAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const NotificationModel: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ?? model<NotificationDoc>("Notification", notificationSchema);
