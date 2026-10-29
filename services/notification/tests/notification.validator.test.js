import { test } from "node:test";
import assert from "node:assert/strict";
import NotificationValidator from "../src/validators/notification/notification.validator.js";

const base = { bookingId: "bk-1", template: "BOOKING_CONFIRMED" };

test("EMAIL needs an email address", () => {
    assert.equal(NotificationValidator.send.safeParse({ ...base, recipient: "a@b.com" }).success, true);
    assert.equal(NotificationValidator.send.safeParse({ ...base, recipient: "9876543210" }).success, false);
});

test("SMS needs a phone number", () => {
    assert.equal(
        NotificationValidator.send.safeParse({ ...base, channel: "SMS", recipient: "+919876543210" }).success,
        true,
    );
    assert.equal(
        NotificationValidator.send.safeParse({ ...base, channel: "SMS", recipient: "a@b.com" }).success,
        false,
    );
});

test("unknown template is rejected", () => {
    assert.equal(
        NotificationValidator.send.safeParse({ ...base, template: "HELLO", recipient: "a@b.com" }).success,
        false,
    );
});
