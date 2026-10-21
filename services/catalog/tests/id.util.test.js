import { test } from "node:test";
import assert from "node:assert/strict";
import Id from "../src/utils/id.util.js";

test("toId parses a numeric string", () => {
    assert.equal(Id.toId("5"), 5);
});

test("toId rejects non-numeric and non-positive ids", () => {
    for (const bad of ["abc", "0", "-3", "1.5"]) {
        assert.throws(() => Id.toId(bad), { code: "INVALID_ID", status: 400 });
    }
});
