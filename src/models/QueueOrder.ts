import { Schema, model, models, Types, type Model } from "mongoose";

export interface QueueOrderDoc {
  _id: Types.ObjectId;
  personId: Types.ObjectId;
  personName: string;
  date: Date;
  kind: "full" | "half";
  variant: string | null;
  count: number;
  partnerPersonId: Types.ObjectId | null;
  partnerName: string | null;
  /** 2pm IST on `date` — MongoDB auto-deletes the row at this instant (TTL index below),
   * so unprocessed queue orders never linger past their own lunch window. */
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const queueOrderSchema = new Schema<QueueOrderDoc>(
  {
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    personName: { type: String, required: true },
    date: { type: Date, required: true },
    kind: { type: String, enum: ["full", "half"], required: true },
    variant: { type: String, default: null },
    count: { type: Number, default: 1, min: 1, max: 20 },
    partnerPersonId: { type: Schema.Types.ObjectId, ref: "Person", default: null },
    partnerName: { type: String, default: null },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// One order per person per date — also the concurrency backstop for the submit upsert.
queueOrderSchema.index({ personId: 1, date: 1 }, { unique: true });
queueOrderSchema.index({ date: 1 });
// TTL index — MongoDB's background process deletes a row once `expireAt` passes, no cron needed.
queueOrderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const QueueOrderModel: Model<QueueOrderDoc> =
  (models.QueueOrder as Model<QueueOrderDoc>) ?? model<QueueOrderDoc>("QueueOrder", queueOrderSchema);
