import { z } from "zod";

const charge = z.object({
    bookingId: z.string().trim().min(1).max(64),
    amount: z.number().positive().max(1000000),
    currency: z.enum(["INR"]).default("INR"),
    cardToken: z.string().trim().min(3).max(64),
});

export default { charge };
