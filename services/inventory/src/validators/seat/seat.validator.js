import { z } from "zod";

const row = z.object({
    row: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{1,2}$/, "Use 1–2 letters"),
    count: z.number().int().min(1).max(50),
    tier: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z_]{2,20}$/, "Use 2–20 letters or underscores"),
});

const createLayout = z.object({
    rows: z
        .array(row)
        .min(1)
        .max(26)
        .refine((list) => new Set(list.map((r) => r.row)).size === list.length, "Each row must appear only once"),
});

export default { createLayout };
