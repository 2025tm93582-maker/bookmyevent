import { z } from "zod";

const create = z.object({
    title: z.string().trim().min(2).max(150),
    category: z.string().trim().toUpperCase().min(2).max(30),
    description: z.string().trim().max(2000).optional(),
    durationMinutes: z.number().int().min(10).max(600),
});

export default { create };
