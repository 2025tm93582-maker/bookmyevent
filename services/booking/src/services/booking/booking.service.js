import { randomUUID } from "node:crypto";
import AppError from "../../utils/app-error.util.js";
import env from "../../config/env.config.js";
import Rules from "./booking.rules.js";
import BookingRepository from "../../repositories/booking/booking.repository.js";
import CatalogClient from "../../clients/catalog.client.js";
import InventoryClient from "../../clients/inventory.client.js";
import PaymentClient from "../../clients/payment.client.js";
import NotificationClient from "../../clients/notification.client.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const describe = (res) => (res.status ? `HTTP ${res.status} ${res.data?.error?.code ?? ""}`.trim() : res.reason);

const failure = (status, code, message, booking) =>
    new AppError(status, code, message, [{ bookingId: booking.id, status: booking.status }]);

const step = (booking, name, outcome, detail) => BookingRepository.logStep(booking.id, name, outcome, detail);

const move = async (booking, to, fields = {}) => {
    if (!Rules.canMove(booking.status, to)) {
        throw new AppError(500, "INVALID_TRANSITION", `Booking cannot move from ${booking.status} to ${to}`);
    }
    if (!(await BookingRepository.transition(booking.id, booking.status, to, fields))) {
        throw new AppError(409, "BOOKING_STATE_CHANGED", `Booking ${booking.id} changed state unexpectedly`);
    }
    booking.status = to;
};

const get = async (id) => {
    const booking = await BookingRepository.findById(id);
    if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", `Booking ${id} not found`);
    return booking;
};

const prepare = async ({ showId, seats }, ctx) => {
    const show = await CatalogClient.getShow(showId, ctx);
    if (show.status === 404) throw new AppError(404, "SHOW_NOT_FOUND", `Show ${showId} not found`);
    if (show.status !== 200) throw new AppError(503, "CATALOG_UNAVAILABLE", "Catalog service is unavailable");

    if (Rules.isBookingClosed(show.data.startsAt, new Date(), env.bookingCutoffMinutes)) {
        throw new AppError(
            422,
            "BOOKING_CLOSED",
            `Booking closes ${env.bookingCutoffMinutes} minutes before the show starts`,
        );
    }

    const map = await InventoryClient.getSeats(showId, ctx);
    if (map.status === 404) throw new AppError(422, "NO_SEAT_LAYOUT", `Show ${showId} has no seats yet`);
    if (map.status !== 200) throw new AppError(503, "INVENTORY_UNAVAILABLE", "Inventory service is unavailable");

    const { amount, missing } = Rules.calculateAmount(seats, map.data.seats, show.data.prices);
    if (missing.length) {
        throw new AppError(
            422,
            "UNKNOWN_SEATS",
            "Some seats do not exist or have no price",
            missing.map((seat) => ({ seat })),
        );
    }

    return { show: show.data, amount };
};

const chargeWithRetry = async (booking, cardToken, ctx) => {
    for (let attempt = 1; ; attempt++) {
        const res = await PaymentClient.charge({ bookingId: booking.id, amount: booking.amount, cardToken }, ctx);
        const transient = res.status === 0 || res.status === 503 || res.status === 409;
        if (!transient || attempt === 3) return res;
        ctx.log.warn(
            { bookingId: booking.id, attempt, result: describe(res) },
            "Charge failed, retrying with the same key",
        );
        await sleep(200 * attempt);
    }
};

const compensate = async (booking, ctx, { holdId, paymentId, refund, reason }) => {
    await move(booking, "COMPENSATING");

    if (refund) {
        let id = paymentId;
        if (!id) {
            const found = await PaymentClient.listByBooking(booking.id, ctx);
            id = found.data?.find?.((p) => p.status === "SUCCEEDED")?.id;
        }
        if (id) {
            const res = await PaymentClient.refund(id, ctx);
            await step(booking, "REFUND_PAYMENT", res.status === 200 ? "OK" : "FAILED", describe(res));
            if (res.status !== 200)
                throw failure(500, "COMPENSATION_INCOMPLETE", "Refund failed; booking left in COMPENSATING", booking);
        } else {
            await step(booking, "REFUND_PAYMENT", "SKIPPED", "no successful payment found");
        }
    }

    if (holdId) {
        const res = await InventoryClient.release(holdId, ctx);
        await step(booking, "RELEASE_SEATS", res.status === 200 ? "OK" : "FAILED", describe(res));
        if (res.status !== 200)
            throw failure(500, "COMPENSATION_INCOMPLETE", "Seat release failed; booking left in COMPENSATING", booking);
    }

    await move(booking, "FAILED", { failure_reason: reason });
};

const notify = async (booking, template, data, ctx) => {
    const res = await NotificationClient.send(
        { bookingId: booking.id, recipient: booking.customerEmail, template, data },
        ctx,
    );
    await step(booking, "NOTIFY", res.status === 201 || res.status === 200 ? "OK" : "FAILED", describe(res));
};

const create = async (input, ctx) => {
    const { show, amount } = await prepare(input, ctx);
    const booking = await BookingRepository.create({ id: randomUUID(), ...input, amount });
    await step(booking, "CHECK", "OK", `show ${show.id}, amount ${amount}`);

    const held = await InventoryClient.hold(input.showId, input.seats, ctx);
    if (held.status !== 201) {
        await step(booking, "HOLD_SEATS", "FAILED", describe(held));
        if (held.status === 409) {
            await move(booking, "REJECTED", { failure_reason: "SEAT_UNAVAILABLE" });
            throw new AppError(
                409,
                "SEAT_UNAVAILABLE",
                "One or more seats are no longer available",
                held.data.error.details,
            );
        }
        await move(booking, "FAILED", { failure_reason: "INVENTORY_UNAVAILABLE" });
        throw failure(503, "INVENTORY_UNAVAILABLE", "Seats could not be held", booking);
    }
    const holdId = held.data.id;
    await move(booking, "SEATS_HELD", { hold_id: holdId });
    await step(booking, "HOLD_SEATS", "OK", `hold ${holdId}`);

    const charged = await chargeWithRetry(booking, input.cardToken, ctx);
    if (charged.status !== 201) {
        await step(booking, "CHARGE_PAYMENT", "FAILED", describe(charged));
        const declined = charged.status === 402;
        await compensate(booking, ctx, {
            holdId,
            refund: charged.status === 0,
            reason: declined ? "PAYMENT_DECLINED" : "PAYMENT_UNAVAILABLE",
        });
        await notify(booking, "BOOKING_FAILED", { reason: declined ? "payment declined" : "payment unavailable" }, ctx);
        throw declined
            ? failure(402, "PAYMENT_DECLINED", "The card was declined; seats released", booking)
            : failure(503, "PAYMENT_UNAVAILABLE", "Payment is unavailable; seats released", booking);
    }
    const paymentId = charged.data.id;
    await move(booking, "PAID", { payment_id: paymentId });
    await step(booking, "CHARGE_PAYMENT", "OK", `payment ${paymentId}`);

    const confirmed = await InventoryClient.confirm(holdId, ctx);
    if (confirmed.status !== 200) {
        await step(booking, "CONFIRM_SEATS", "FAILED", describe(confirmed));
        await compensate(booking, ctx, { holdId, paymentId, refund: true, reason: "SEAT_CONFIRMATION_FAILED" });
        await notify(booking, "BOOKING_FAILED", { reason: "seats could not be confirmed, payment refunded" }, ctx);
        throw failure(
            502,
            "BOOKING_FAILED",
            "Seats could not be confirmed; payment refunded and seats released",
            booking,
        );
    }
    await move(booking, "CONFIRMED");
    await step(booking, "CONFIRM_SEATS", "OK");

    await notify(booking, "BOOKING_CONFIRMED", { eventTitle: show.eventTitle, seats: input.seats }, ctx);

    return get(booking.id);
};

export default { create, get };
