import { test } from "node:test";
import assert from "node:assert/strict";
import ShowService from "../src/services/show/show.service.js";

const now = new Date("2026-12-01T10:00:00Z");

test("BR-C1: rejects a show starting in 30 minutes", () => {
    assert.equal(ShowService.startsTooSoon(new Date("2026-12-01T10:30:00Z"), now), true);
});

test("BR-C1: rejects a show in the past", () => {
    assert.equal(ShowService.startsTooSoon(new Date("2026-11-30T10:00:00Z"), now), true);
});

test("BR-C1: accepts a show exactly 1 hour ahead", () => {
    assert.equal(ShowService.startsTooSoon(new Date("2026-12-01T11:00:00Z"), now), false);
});
