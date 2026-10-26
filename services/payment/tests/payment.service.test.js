import { test } from "node:test";
import assert from "node:assert/strict";
import PaymentService from "../src/services/payment/payment.service.js";

test("tok_decline is declined, other tokens are not", () => {
    assert.equal(PaymentService.isDeclined("tok_decline"), true);
    assert.equal(PaymentService.isDeclined("tok_visa"), false);
});

test("gateway is down when the roll is below the fail rate", () => {
    assert.equal(PaymentService.gatewayIsDown(0.3, 0.1), true);
    assert.equal(PaymentService.gatewayIsDown(0.3, 0.5), false);
});

test("a fail rate of 0 never fails, 1 always fails", () => {
    assert.equal(PaymentService.gatewayIsDown(0, 0), false);
    assert.equal(PaymentService.gatewayIsDown(1, 0.999), true);
});
