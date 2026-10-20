import { Schema, model, models, Types, type Model } from "mongoose";

/** How long a login request waits for the admin before it lapses. */
export const LOGIN_REQUEST_TTL_MS = 15 * 60 * 1000;
/** How long an approved request waits for its browser to collect the session (the member may
 * have closed the app while waiting) before it's discarded unused. */
export const APPROVAL_PICKUP_TTL_MS = 24 * 60 * 60 * 1000;

export type MemberDeviceStatus = "pending" | "approved" | "rejected";

/** One browser a member has asked to log in from. Starts "pending" until the admin approves or
 * rejects it; an approved device is what a member session cookie points at (its `did` claim),
 * so deleting the document logs that browser out. Anything not yet in use carries `expireAt` and
 * is cleaned up by the TTL index: pending and rejected requests, and approvals the browser hasn't
 * collected yet. Once the browser collects its session, `expireAt` is cleared and the device
 * lives until logged out. */
export interface MemberDeviceDoc {
  _id: Types.ObjectId;
  personId: Types.ObjectId;
  /** Snapshot for the admin's request list — the Person may be renamed later. */
  personName: string;
  status: MemberDeviceStatus;
  /** Two-digit code shown on the member's waiting screen and in the admin's request, so the
   * admin can confirm with the member which request is really theirs. */
  code: string;
  /** Human-readable "iPhone · Safari" style label, derived from the user agent at login. */
  label: string;
  userAgent: string;
  decidedAt: Date | null;
  lastSeenAt: Date | null;
  expireAt: Date | null;
  createdAt: Date;
}

const memberDeviceSchema = new Schema<MemberDeviceDoc>(
  {
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    personName: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], required: true },
    code: { type: String, required: true },
    label: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    expireAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

memberDeviceSchema.index({ personId: 1, status: 1 });
memberDeviceSchema.index({ status: 1, createdAt: -1 });
// Documents with expireAt: null are never removed by this index.
memberDeviceSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const MemberDeviceModel: Model<MemberDeviceDoc> =
  (models.MemberDevice as Model<MemberDeviceDoc>) ?? model<MemberDeviceDoc>("MemberDevice", memberDeviceSchema);
