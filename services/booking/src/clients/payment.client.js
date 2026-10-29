import Http from "./http.client.js";

const charge = ({ bookingId, amount, cardToken }, ctx) =>
    Http.call(
        "payment",
        {
            method: "POST",
            path: "/payments",
            data: { bookingId, amount, cardToken },
            headers: { "Idempotency-Key": bookingId },
        },
        ctx,
    );

const refund = (paymentId, ctx) => Http.call("payment", { method: "POST", path: `/payments/${paymentId}/refund` }, ctx);

const listByBooking = (bookingId, ctx) =>
    Http.call("payment", { method: "GET", path: `/payments?bookingId=${encodeURIComponent(bookingId)}` }, ctx);

export default { charge, refund, listByBooking };
