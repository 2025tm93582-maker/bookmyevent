import { test } from "node:test";
import assert from "node:assert/strict";
import HoldService from "../src/services/hold/hold.service.js";

test("BR3: a HELD hold can be confirmed or released", () => {
    assert.equal(HoldService.canMove("HELD", "CONFIRMED"), true);
    assert.equal(HoldService.canMove("HELD", "RELEASED"), true);
});

test("BR3: a CONFIRMED hold can never be released (sold seats stay sold)", () => {
    assert.equal(HoldService.canMove("CONFIRMED", "RELEASED"), false);
});

test("BR3: a RELEASED hold cannot be confirmed", () => {
    assert.equal(HoldService.canMove("RELEASED", "CONFIRMED"), false);
});

test("BR3: unknown states are rejected", () => {
    assert.equal(HoldService.canMove("PENDING", "CONFIRMED"), false);
});
