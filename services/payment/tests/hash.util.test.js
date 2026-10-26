import { test } from "node:test";
import assert from "node:assert/strict";
import Hash from "../src/utils/hash.util.js";

const req = (body) => ({ method: "POST", baseUrl: "/api/v1/payments", path: "/", body });

test("same body in a different key order gives the same fingerprint", () => {
    const a = Hash.fingerprint(req({ bookingId: "bk-1", amount: 7000, cardToken: "tok_visa" }));
    const b = Hash.fingerprint(req({ cardToken: "tok_visa", amount: 7000, bookingId: "bk-1" }));
    assert.equal(a, b);
});

test("a different amount gives a different fingerprint", () => {
    const a = Hash.fingerprint(req({ bookingId: "bk-1", amount: 7000 }));
    const b = Hash.fingerprint(req({ bookingId: "bk-1", amount: 9999 }));
    assert.notEqual(a, b);
});

test("the same body on a different path gives a different fingerprint", () => {
    const body = { bookingId: "bk-1" };
    assert.notEqual(Hash.fingerprint(req(body)), Hash.fingerprint({ ...req(body), path: "/other" }));
});
