import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";

const personSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    preferredVariant: { type: String, trim: true, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Case-insensitive uniqueness on name.
personSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export type PersonDoc = InferSchemaType<typeof personSchema>;

export const PersonModel: Model<PersonDoc> =
  (models.Person as Model<PersonDoc>) ?? model<PersonDoc>("Person", personSchema);
