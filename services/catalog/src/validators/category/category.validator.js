import { z } from "zod";

const create = z.object({
    code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z_]{2,30}$/, "Use 2–30 letters or underscores"),
    name: z.string().trim().min(2).max(60),
});

export default { create };
