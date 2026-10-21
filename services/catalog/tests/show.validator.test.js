import { test } from "node:test";
import assert from "node:assert/strict";
import ShowValidator from "../src/validators/show/show.validator.js";

const valid = {
    venue: "JLN Stadium, Delhi",
    startsAt: "2026-12-20T19:30:00+05:30",
    prices: [{ tier: "gold", price: 3500 }],
};

test("BR-C2: accepts a valid show and upper-cases tiers", () => {
    const result = ShowValidator.create.safeParse(valid);
    assert.equal(result.success, true);
    assert.equal(result.data.prices[0].tier, "GOLD");
});

test("BR-C2: rejects duplicate tiers (case-insensitive)", () => {
    const result = ShowValidator.create.safeParse({
        ...valid,
        prices: [
            { tier: "GOLD", price: 3500 },
            { tier: "gold", price: 3000 },
        ],
    });
    assert.equal(result.success, false);
});

test("BR-C2: rejects an empty price list", () => {
    assert.equal(ShowValidator.create.safeParse({ ...valid, prices: [] }).success, false);
});

test("BR-C2: rejects a zero price", () => {
    assert.equal(ShowValidator.create.safeParse({ ...valid, prices: [{ tier: "GOLD", price: 0 }] }).success, false);
});
