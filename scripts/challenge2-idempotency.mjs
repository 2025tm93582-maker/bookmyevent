const PAYMENT = "http://localhost:3004/api/v1";
const run = Date.now().toString(36);
let allPassed = true;

const charge = async (key, body) => {
    const res = await fetch(`${PAYMENT}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
        status: res.status,
        replayed: res.headers.get("idempotent-replayed") === "true",
        id: data.id,
        error: data.error ? data.error.code : "",
    };
};

const countPayments = async (bookingId) => {
    const res = await fetch(`${PAYMENT}/payments?bookingId=${bookingId}`);
    const payments = await res.json();
    return payments.length;
};

const sendAtOnce = (count, send) => {
    const requests = [];
    for (let i = 0; i < count; i++) {
        requests.push(send(i));
    }
    return Promise.all(requests);
};

const check = (name, passed) => {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
    if (!passed) allPassed = false;
};

console.log(`Challenge 2: idempotency (run ${run})`);

console.log(`\nCase 1: same request 4 times in a row (key seq-${run})`);
const seqBody = { bookingId: `bk-seq-${run}`, amount: 7000, cardToken: "tok_visa" };
const first = await charge(`seq-${run}`, seqBody);
console.log(`call 1: ${first.status} ${first.id || first.error}`);
let sameEveryTime = true;
for (let i = 2; i <= 4; i++) {
    const repeat = await charge(`seq-${run}`, seqBody);
    console.log(`call ${i}: ${repeat.status} ${repeat.id || repeat.error}, replayed: ${repeat.replayed}`);
    if (!repeat.replayed || repeat.id !== first.id) sameEveryTime = false;
}
check("repeats return the same payment", first.status === 201 && sameEveryTime);
check("one payment in the database", (await countPayments(seqBody.bookingId)) === 1);

console.log(`\nCase 2: same key, different amount (key mismatch-${run})`);
await charge(`mismatch-${run}`, { bookingId: `bk-mm-${run}`, amount: 500, cardToken: "tok_visa" });
const reused = await charge(`mismatch-${run}`, { bookingId: `bk-mm-${run}`, amount: 9999, cardToken: "tok_visa" });
console.log(`second call: ${reused.status} ${reused.error}`);
check("different payload is rejected with 422", reused.status === 422);

console.log(`\nCase 3: 20 identical requests at the same moment (key burst-${run})`);
const burstBody = { bookingId: `bk-burst-${run}`, amount: 3500, cardToken: "tok_visa" };
const burst = await sendAtOnce(20, () => charge(`burst-${run}`, burstBody));
let created = 0;
let replayed = 0;
let inProgress = 0;
let other = 0;
for (const result of burst) {
    if (result.status === 201 && result.replayed) replayed++;
    else if (result.status === 201) created++;
    else if (result.status === 409) inProgress++;
    else other++;
}
console.log(`created: ${created}, replayed: ${replayed}, 409 in progress: ${inProgress}, other: ${other}`);
check("only one request created a payment", created === 1);
check("one payment in the database", (await countPayments(burstBody.bookingId)) === 1);

console.log("\nCase 4: 20 requests with different keys for the same booking");
const keys = await sendAtOnce(20, (i) =>
    charge(`multi-${run}-${i}`, { bookingId: `bk-keys-${run}`, amount: 1200, cardToken: "tok_visa" }),
);
let success = 0;
for (const result of keys) {
    if (result.status === 201) success++;
}
console.log(`success: ${success}, rejected: ${20 - success}`);
check("one payment in the database", (await countPayments(`bk-keys-${run}`)) === 1);

console.log(allPassed ? "\nRESULT: ALL PASS" : "\nRESULT: SOME CHECKS FAILED");
process.exit(allPassed ? 0 : 1);
