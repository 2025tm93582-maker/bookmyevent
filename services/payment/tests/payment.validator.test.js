import { test } from "node:test";
import assert from "node:assert/strict";
import PaymentValidator from "../src/validators/payment/payment.validator.js";

test("currency defaults to INR", () => {
    const result = PaymentValidator.charge.safeParse({ bookingId: "bk-1", amount: 100, cardToken: "tok_visa" });
    assert.equal(result.data.currency, "INR");
});

test("rejects zero or negative amounts", () => {
    for (const amount of [0, -50]) {
        assert.equal(
            PaymentValidator.charge.safeParse({ bookingId: "bk-1", amount, cardToken: "tok_visa" }).success,
            false,
        );
    }
});

test("rejects other currencies", () => {
    const result = PaymentValidator.charge.safeParse({
        bookingId: "bk-1",
        amount: 100,
        currency: "USD",
        cardToken: "tok_visa",
    });
    assert.equal(result.success, false);
});
