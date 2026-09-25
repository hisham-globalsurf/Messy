import { z } from "zod";

const name = z.string().trim().min(1, "Name is required").max(60);

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const verifyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Use at least 6 characters"),
});

const phone = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-\s()]*$/, "Invalid phone number")
  .optional();

const variantName = z.string().trim().min(1).max(40);

export const foodVariantSchema = z.object({ name: variantName, price: z.number().min(0) });

export const personCreateSchema = z.object({ name, phone, preferredVariant: variantName.optional() });

const fullEaterInput = z.object({
  name,
  variant: variantName.nullable().optional().default(null),
  count: z.number().int().min(1).max(20).default(1),
});

const halfPairInput = z
  .object({
    names: z.tuple([name, name]),
    variant: variantName.nullable().optional().default(null),
  })
  .refine((v) => v.names[0].toLowerCase() !== v.names[1].toLowerCase(), "A pair needs two different people");

export const entryInputSchema = z
  .object({
    date: z.coerce.date(),
    fullEaters: z.array(fullEaterInput).default([]),
    halfPairs: z.array(halfPairInput).default([]),
    pricePerMeal: z.number().min(0).optional(),
  })
  .refine((v) => v.fullEaters.length + v.halfPairs.length > 0, {
    message: "Add at least one eater",
    path: ["fullEaters"],
  })
  .refine(
    (v) => {
      const all = [...v.fullEaters.map((e) => e.name), ...v.halfPairs.flatMap((p) => p.names)].map((n) =>
        n.toLowerCase(),
      );
      return new Set(all).size === all.length;
    },
    { message: "A person can only appear once per day", path: ["fullEaters"] },
  );

export const entryUpdateSchema = entryInputSchema;

export const entryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  settled: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  person: z.string().trim().min(1).optional(),
});

export const settlementCreateSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date(),
  note: z.string().trim().max(200).optional().default(""),
});

export const settlementDeleteSchema = z.object({
  mode: z.enum(["unsettle", "delete-entries"]),
});

export const entryParticipantSchema = z
  .object({
    name: z.string().trim().min(1),
    paid: z.boolean().optional(),
    variant: variantName.nullable().optional(),
    count: z.number().int().min(1).max(20).optional(),
  })
  .refine((v) => v.paid !== undefined || v.variant !== undefined || v.count !== undefined, "Nothing to update");

export const settingsUpdateSchema = z
  .object({
    pricePerMeal: z.number().min(0).optional(),
    messName: z.string().trim().min(1).max(60).optional(),
    currency: z.string().trim().min(1).max(4).optional(),
    foodVariants: z
      .array(foodVariantSchema)
      .refine((v) => {
        const names = v.map((f) => f.name.toLowerCase());
        return new Set(names).size === names.length;
      }, "Variant names must be unique")
      .optional(),
    defaultVariant: variantName.nullable().optional(),
    supplierPhone: phone,
    orderCutoffTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm, e.g. 10:25")
      .optional(),
    orderReminderMinutes: z.number().int().min(1).max(300).optional(),
    orderConfirmedUntilTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm, e.g. 12:30")
      .optional(),
    lunchReminderTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm, e.g. 09:30")
      .optional(),
    messClosedFrom: z.coerce.date().nullable().optional(),
    messClosedTo: z.coerce.date().nullable().optional(),
    messClosedMessage: z.string().trim().max(300).optional(),
    weekendClosed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update")
  .refine(
    (v) => !(v.messClosedFrom && v.messClosedTo) || v.messClosedFrom <= v.messClosedTo,
    { message: "Closure end date must be on or after the start date", path: ["messClosedTo"] },
  );

export const memberLoginSchema = z.object({
  phone: z.string().trim().min(1, "Enter a phone number"),
});

export const memberOrderSchema = z
  .object({
    date: z.coerce.date(),
    kind: z.enum(["full", "half"]),
    variant: variantName.nullable().optional().default(null),
    count: z.number().int().min(1).max(20).optional().default(1),
    partnerName: name.optional(),
  })
  .refine((v) => v.kind !== "half" || !!v.partnerName?.trim(), {
    message: "Pick a partner for a half meal",
    path: ["partnerName"],
  });

export const reportCreateSchema = z.object({
  message: z.string().trim().min(1, "Tell us what's wrong").max(1000),
});

export const reportReplySchema = z.object({
  message: z.string().trim().min(1, "Reply can't be empty").max(500),
});

export const notificationCreateSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required").max(500),
    push: z.boolean(),
    inApp: z.boolean(),
    /** Empty (the default) means every member. Checked as ids up front — a malformed one would
     * otherwise pass here and then crash the Notification insert with a cast error (500). */
    personIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid recipient")).optional().default([]),
  })
  .refine((v) => v.push || v.inApp, { message: "Pick at least one delivery method", path: ["push"] });

export type EntryInput = z.infer<typeof entryInputSchema>;
export type SettlementCreateInput = z.infer<typeof settlementCreateSchema>;
export type MemberOrderInput = z.infer<typeof memberOrderSchema>;
