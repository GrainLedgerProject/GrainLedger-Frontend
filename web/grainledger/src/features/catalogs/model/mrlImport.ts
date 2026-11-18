import { z } from "zod";

// Preserve decimal text on import; backend accepts at most 12 integer/decimal digits.
export const mrlDecimal = /^\d{1,12}(?:\.\d{1,12})?$/;
const timestamp = z.string().datetime({ offset: true });
export const mrlImportSchema = z
  .object({
    marketId: z.string().uuid(),
    commodityId: z.string().uuid(),
    effectiveFrom: timestamp,
    effectiveTo: timestamp.nullish().transform((value) => value ?? null),
    sourceRef: z.string().trim().min(1),
    limits: z
      .array(
        z.object({
          substanceCode: z.string().trim().min(1).max(60),
          limitValue: z.string().trim().regex(mrlDecimal),
          unit: z.literal("mg/kg"),
        }),
      )
      .min(1)
      .max(500),
  })
  .superRefine((value, context) => {
    if (
      value.effectiveTo &&
      Date.parse(value.effectiveTo) <= Date.parse(value.effectiveFrom)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveTo"],
        message: "End must be after start",
      });
    const codes = new Set<string>();
    value.limits.forEach((row, index) => {
      const code = row.substanceCode.toUpperCase();
      if (codes.has(code))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["limits", index, "substanceCode"],
          message: "Duplicate substance",
        });
      codes.add(code);
    });
  });
