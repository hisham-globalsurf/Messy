import { Schema, model, models, Types, type Model } from "mongoose";

export interface ReportDoc {
  _id: Types.ObjectId;
  personId: Types.ObjectId;
  personName: string;
  message: string;
  createdAt: Date;
}

const reportSchema = new Schema<ReportDoc>(
  {
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    personName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

reportSchema.index({ createdAt: -1 });

export const ReportModel: Model<ReportDoc> =
  (models.Report as Model<ReportDoc>) ?? model<ReportDoc>("Report", reportSchema);
