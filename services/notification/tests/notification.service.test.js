import { test } from "node:test";
import assert from "node:assert/strict";
import NotificationService from "../src/services/notification/notification.service.js";

test("confirmed template includes event and seats", () => {
    const message = NotificationService.render("BOOKING_CONFIRMED", "bk-1", {
        eventTitle: "Arijit Singh Live",
        seats: ["A1", "A2"],
    });
    assert.equal(message, "Your booking bk-1 for Arijit Singh Live is confirmed. Seats: A1, A2.");
});

test("failed template includes the reason", () => {
    assert.match(
        NotificationService.render("BOOKING_FAILED", "bk-2", { reason: "payment declined" }),
        /payment declined/,
    );
});

test("provider is down only when the roll is below the fail rate", () => {
    assert.equal(NotificationService.providerIsDown(0.5, 0.2), true);
    assert.equal(NotificationService.providerIsDown(0.5, 0.8), false);
    assert.equal(NotificationService.providerIsDown(0, 0), false);
});
