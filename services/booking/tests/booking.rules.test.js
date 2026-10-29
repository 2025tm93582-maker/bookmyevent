import { test } from "node:test";
import assert from "node:assert/strict";
import Rules from "../src/services/booking/booking.rules.js";

const now = new Date("2026-12-20T13:00:00Z");

test("BR5: booking is open 30 minutes before the show", () => {
    assert.equal(Rules.isBookingClosed("2026-12-20T13:30:00Z", now, 15), false);
});

test("BR5: booking is closed 10 minutes before the show", () => {
    assert.equal(Rules.isBookingClosed("2026-12-20T13:10:00Z", now, 15), true);
});

test("BR5: booking is closed after the show started", () => {
    assert.equal(Rules.isBookingClosed("2026-12-20T12:00:00Z", now, 15), true);
});

const seatMap = [
    { seatNo: "A1", tier: "GOLD" },
    { seatNo: "A2", tier: "GOLD" },
    { seatNo: "C1", tier: "SILVER" },
    { seatNo: "V1", tier: "VIP" },
];
const prices = [
    { tier: "GOLD", price: 3500 },
    { tier: "SILVER", price: 1500 },
];

test("BR6: amount is the sum of Catalog tier prices", () => {
    assert.deepEqual(Rules.calculateAmount(["A1", "A2", "C1"], seatMap, prices), { amount: 8500, missing: [] });
});

test("BR6: unknown seats or unpriced tiers are reported", () => {
    assert.deepEqual(Rules.calculateAmount(["A1", "Z9", "V1"], seatMap, prices).missing, ["Z9", "V1"]);
});

test("BR7: happy path transitions are allowed", () => {
    assert.equal(Rules.canMove("PENDING", "SEATS_HELD"), true);
    assert.equal(Rules.canMove("SEATS_HELD", "PAID"), true);
    assert.equal(Rules.canMove("PAID", "CONFIRMED"), true);
});

test("BR7: a confirmed booking can never be failed or compensated", () => {
    assert.equal(Rules.canMove("CONFIRMED", "FAILED"), false);
    assert.equal(Rules.canMove("CONFIRMED", "COMPENSATING"), false);
});

test("BR7: final states cannot move", () => {
    for (const state of ["FAILED", "REJECTED"]) {
        assert.equal(Rules.canMove(state, "PENDING"), false);
    }
});
