import { z } from "zod";

const price = z.object({
    tier: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z_]{2,20}$/, "Use 2–20 letters or underscores"),
    price: z.number().positive().max(100000),
});

const create = z.object({
    venue: z.string().trim().min(2).max(150),
    startsAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
    prices: z
        .array(price)
        .min(1)
        .max(10)
        .refine((list) => new Set(list.map((p) => p.tier)).size === list.length, "Each tier must appear only once"),
});

export default { create };
