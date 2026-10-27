import { test } from "node:test";
import assert from "node:assert/strict";
import HoldValidator from "../src/validators/hold/hold.validator.js";

test("accepts a valid hold and upper-cases seats", () => {
    const result = HoldValidator.create.safeParse({ showId: 1, seats: ["a1", "B12"] });
    assert.equal(result.success, true);
    assert.deepEqual(result.data.seats, ["A1", "B12"]);
});

test("rejects duplicate seats in one request", () => {
    assert.equal(HoldValidator.create.safeParse({ showId: 1, seats: ["A1", "a1"] }).success, false);
});

test("rejects badly formed seat numbers", () => {
    assert.equal(HoldValidator.create.safeParse({ showId: 1, seats: ["A0"] }).success, false);
    assert.equal(HoldValidator.create.safeParse({ showId: 1, seats: ["1A"] }).success, false);
});
