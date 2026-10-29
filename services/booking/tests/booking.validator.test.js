import { test } from "node:test";
import assert from "node:assert/strict";
import BookingValidator from "../src/validators/booking/booking.validator.js";

const base = { showId: 1, customerEmail: "aksh@example.com", cardToken: "tok_visa" };

test("BR4: 1 to 6 seats are accepted", () => {
    assert.equal(BookingValidator.create.safeParse({ ...base, seats: ["a1"] }).success, true);
    assert.equal(
        BookingValidator.create.safeParse({ ...base, seats: ["A1", "A2", "A3", "A4", "A5", "A6"] }).success,
        true,
    );
});

test("BR4: 0 or 7 seats are rejected", () => {
    assert.equal(BookingValidator.create.safeParse({ ...base, seats: [] }).success, false);
    assert.equal(
        BookingValidator.create.safeParse({ ...base, seats: ["A1", "A2", "A3", "A4", "A5", "A6", "A7"] }).success,
        false,
    );
});

test("BR4: duplicate seats are rejected", () => {
    assert.equal(BookingValidator.create.safeParse({ ...base, seats: ["A1", "a1"] }).success, false);
});

test("a valid email is required", () => {
    assert.equal(BookingValidator.create.safeParse({ ...base, seats: ["A1"], customerEmail: "nope" }).success, false);
});
