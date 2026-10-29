import { z } from "zod";

const send = z
    .object({
        bookingId: z.string().trim().min(1).max(64),
        channel: z.enum(["EMAIL", "SMS"]).default("EMAIL"),
        recipient: z.string().trim().min(3).max(150),
        template: z.enum(["BOOKING_CONFIRMED", "BOOKING_FAILED", "BOOKING_CANCELLED"]),
        data: z.record(z.string(), z.unknown()).default({}),
    })
    .refine((n) => (n.channel === "EMAIL" ? n.recipient.includes("@") : /^\+?[0-9]{10,13}$/.test(n.recipient)), {
        message: "Recipient must be an email for EMAIL or a 10–13 digit phone number for SMS",
        path: ["recipient"],
    });

export default { send };
