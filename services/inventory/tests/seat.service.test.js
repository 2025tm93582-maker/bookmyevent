import { test } from "node:test";
import assert from "node:assert/strict";
import SeatService from "../src/services/seat/seat.service.js";

test("summary counts seats by status", () => {
    const seats = [{ status: "AVAILABLE" }, { status: "HELD" }, { status: "SOLD" }, { status: "AVAILABLE" }];
    assert.deepEqual(SeatService.summarise(seats), { AVAILABLE: 2, HELD: 1, SOLD: 1 });
});
