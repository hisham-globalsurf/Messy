import { z } from "zod";

const name = z.string().trim().min(1, "Name is required").max(60);

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
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

export const personCreateSchema = z.object({ name, phone });

const halfPair = z
  .tuple([name, name])
  .refine(([a, b]) => a.toLowerCase() !== b.toLowerCase(), "A pair needs two different people");

export const entryInputSchema = z
  .object({
    date: z.coerce.date(),
    fullEaters: z.array(name).default([]),
    halfPairs: z.array(halfPair).default([]),
    pricePerMeal: z.number().min(0).optional(),
  })
  .refine((v) => v.fullEaters.length + v.halfPairs.length > 0, {
    message: "Add at least one eater",
    path: ["fullEaters"],
  })
  .refine(
    (v) => {
      const all = [...v.fullEaters, ...v.halfPairs.flat()].map((n) => n.toLowerCase());
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

export const entryPaidSchema = z.object({
  name: z.string().trim().min(1),
  paid: z.boolean(),
});

export const settingsUpdateSchema = z
  .object({
    pricePerMeal: z.number().min(0).optional(),
    messName: z.string().trim().min(1).max(60).optional(),
    currency: z.string().trim().min(1).max(4).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export type EntryInput = z.infer<typeof entryInputSchema>;
export type SettlementCreateInput = z.infer<typeof settlementCreateSchema>;
