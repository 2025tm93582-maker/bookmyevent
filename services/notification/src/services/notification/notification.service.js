import AppError from "../../utils/app-error.util.js";
import env from "../../config/env.config.js";
import Logger from "../../config/logger.config.js";
import NotificationRepository from "../../repositories/notification/notification.repository.js";

const { logger } = Logger;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TEMPLATES = {
    BOOKING_CONFIRMED: (id, d) =>
        `Your booking ${id} for ${d.eventTitle ?? "your event"} is confirmed. Seats: ${(d.seats ?? []).join(", ")}.`,
    BOOKING_FAILED: (id, d) => `Sorry, booking ${id} could not be completed: ${d.reason ?? "unknown reason"}.`,
    BOOKING_CANCELLED: (id) => `Your booking ${id} has been cancelled and refunded.`,
};

const render = (template, bookingId, data = {}) => TEMPLATES[template](bookingId, data);

const providerIsDown = (rate = env.notifyFailRate, roll = Math.random()) => roll < rate;

const send = async ({ bookingId, channel, recipient, template, data }) => {
    if (env.notifyDelayMs) await sleep(env.notifyDelayMs);

    if (providerIsDown()) {
        throw new AppError(503, "PROVIDER_UNAVAILABLE", "Email/SMS provider is temporarily unavailable");
    }

    const message = render(template, bookingId, data);
    const result = await NotificationRepository.create({ bookingId, channel, recipient, template, message });

    if (result.created) logger.info({ bookingId, channel, recipient, message }, "Notification sent (mock)");
    return result;
};

const listByBooking = (bookingId) => NotificationRepository.findByBooking(bookingId);

export default { send, listByBooking, render, providerIsDown };
