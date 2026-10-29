import { z } from "zod";

const create = z.object({
    showId: z.number().int().positive(),
    seats: z
        .array(
            z
                .string()
                .trim()
                .toUpperCase()
                .regex(/^[A-Z]{1,2}[1-9][0-9]?$/, "Seat must look like A1 or AB12"),
        )
        .min(1)
        .max(6)
        .refine((list) => new Set(list).size === list.length, "Each seat must appear only once"),
    customerEmail: z.email(),
    cardToken: z.string().trim().min(3).max(64),
});

export default { create };
