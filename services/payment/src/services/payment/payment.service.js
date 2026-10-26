import AppError from "../../utils/app-error.util.js";
import env from "../../config/env.config.js";
import PaymentRepository from "../../repositories/payment/payment.repository.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDeclined = (cardToken) => cardToken === "tok_decline";

const gatewayIsDown = (rate = env.paymentFailRate, roll = Math.random()) => roll < rate;

const get = async (id) => {
    const payment = await PaymentRepository.findById(id);
    if (!payment) throw new AppError(404, "PAYMENT_NOT_FOUND", `Payment ${id} not found`);
    return payment;
};

const listByBooking = (bookingId) => PaymentRepository.findByBooking(bookingId);

const charge = async ({ bookingId, amount, currency, cardToken }) => {
    if (env.paymentDelayMs) await sleep(env.paymentDelayMs);

    if (gatewayIsDown()) {
        throw new AppError(503, "GATEWAY_UNAVAILABLE", "Payment gateway is temporarily unavailable");
    }

    const status = isDeclined(cardToken) ? "DECLINED" : "SUCCEEDED";
    const payment = await PaymentRepository.create({ bookingId, amount, currency, status });

    if (!payment) throw new AppError(409, "PAYMENT_EXISTS", `Booking ${bookingId} already has a payment`);
    if (status === "DECLINED") {
        throw new AppError(402, "PAYMENT_DECLINED", "The card was declined", [{ paymentId: payment.id }]);
    }

    return payment;
};

const refund = async (id) => {
    const payment = await get(id);

    if (payment.status === "REFUNDED") return payment;
    if (payment.status !== "SUCCEEDED") {
        throw new AppError(409, "PAYMENT_NOT_REFUNDABLE", `A ${payment.status} payment cannot be refunded`);
    }

    await PaymentRepository.refund(id);
    return get(id);
};

export default { get, listByBooking, charge, refund, isDeclined, gatewayIsDown };
