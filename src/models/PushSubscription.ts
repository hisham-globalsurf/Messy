import { Schema, model, models, Types, type Model } from "mongoose";

export interface PushSubscriptionDoc {
  _id: Types.ObjectId;
  personId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ personId: 1 });

export const PushSubscriptionModel: Model<PushSubscriptionDoc> =
  (models.PushSubscription as Model<PushSubscriptionDoc>) ??
  model<PushSubscriptionDoc>("PushSubscription", pushSubscriptionSchema);
