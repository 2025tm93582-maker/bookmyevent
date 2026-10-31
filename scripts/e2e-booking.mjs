const CATALOG = "http://localhost:3001/api/v1";
const INVENTORY = "http://localhost:3002/api/v1";
const BOOKING = "http://localhost:3003/api/v1";
const PAYMENT = "http://localhost:3004/api/v1";
const NOTIFICATION = "http://localhost:3005/api/v1";
const services = { catalog: 3001, inventory: 3002, booking: 3003, payment: 3004, notification: 3005 };
const run = Date.now().toString(36);
const correlationId = `e2e-${run}`;
let passed = 0;
let failed = 0;

const get = async (url) => {
    const res = await fetch(url, { headers: { "X-Correlation-Id": correlationId } });
    return res.json();
};

const post = async (url, body, headers = {}) => {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Correlation-Id": correlationId, ...headers },
        body: JSON.stringify(body),
    });
    return { status: res.status, replayed: res.headers.get("idempotent-replayed") === "true", body: await res.json() };
};

const check = (name, ok) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (ok) passed++;
    else failed++;
};

const isUp = async (port) => {
    try {
        const res = await fetch(`http://localhost:${port}/health`);
        return res.status === 200;
    } catch {
        return false;
    }
};

console.log(`End-to-end test of the main booking transaction (correlation id ${correlationId})`);

console.log("\n1. All services are up");
for (const name in services) {
    check(`${name} is UP`, await isUp(services[name]));
}
if (failed > 0) {
    console.log("\nRESULT: FAILED, some services are not running");
    process.exit(1);
}

console.log("\n2. Set up an event, a show (GOLD 2500, SILVER 1200) and 8 seats");
const event = await post(`${CATALOG}/events`, { title: `E2E Concert ${run}`, category: "CONCERT", durationMinutes: 150 });
const show = await post(`${CATALOG}/events/${event.body.id}/shows`, {
    venue: "E2E Arena",
    startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    prices: [
        { tier: "GOLD", price: 2500 },
        { tier: "SILVER", price: 1200 },
    ],
});
const showId = show.body.id;
const seats = await post(`${INVENTORY}/shows/${showId}/seats`, {
    rows: [
        { row: "A", count: 4, tier: "GOLD" },
        { row: "B", count: 4, tier: "SILVER" },
    ],
});
check(`event, show ${showId} and 8 seats created`, event.status === 201 && show.status === 201 && seats.status === 201);

const book = (seatList, cardToken, key) =>
    post(`${BOOKING}/bookings`, { showId, seats: seatList, customerEmail: "e2e@example.com", cardToken }, { "Idempotency-Key": key });

console.log("\n3. Book A1 (GOLD) and B1 (SILVER)");
const first = await book(["A1", "B1"], "tok_visa", `e2e-${run}`);
const booking = first.body;
check("booking is CONFIRMED (201)", first.status === 201 && booking.status === "CONFIRMED");
if (first.status !== 201) process.exit(1);
check("BR6: amount calculated by the server is 3700", booking.amount === 3700);
check("all 5 saga steps are OK", booking.steps.length === 5 && booking.steps.every((step) => step.outcome === "OK"));

console.log("\n4. Every service agrees");
const payments = await get(`${PAYMENT}/payments?bookingId=${booking.id}`);
const hold = await get(`${INVENTORY}/holds/${booking.holdId}`);
const notifications = await get(`${NOTIFICATION}/notifications?bookingId=${booking.id}`);
let seatMap = await get(`${INVENTORY}/shows/${showId}/seats`);
const seatStatus = (seatNo) => seatMap.seats.find((seat) => seat.seatNo === seatNo).status;
check("Payment: one SUCCEEDED payment of 3700", payments.length === 1 && payments[0].status === "SUCCEEDED" && payments[0].amount === 3700);
check("Inventory: hold CONFIRMED, A1 and B1 SOLD", hold.status === "CONFIRMED" && seatStatus("A1") === "SOLD" && seatStatus("B1") === "SOLD");
check("Notification: one BOOKING_CONFIRMED message", notifications.length === 1 && notifications[0].template === "BOOKING_CONFIRMED");

console.log("\n5. Same request again with the same Idempotency-Key");
const repeat = await book(["A1", "B1"], "tok_visa", `e2e-${run}`);
const paymentsAfter = await get(`${PAYMENT}/payments?bookingId=${booking.id}`);
check("same booking returned and marked as replayed", repeat.status === 201 && repeat.replayed && repeat.body.id === booking.id);
check("still only one payment", paymentsAfter.length === 1);

console.log("\n6. Failure paths");
const taken = await book(["A1"], "tok_visa", `taken-${run}`);
check("BR3: seat already sold gives 409 SEAT_UNAVAILABLE", taken.status === 409 && taken.body.error.code === "SEAT_UNAVAILABLE");

const declined = await book(["A2"], "tok_decline", `declined-${run}`);
check("declined card gives 402 PAYMENT_DECLINED", declined.status === 402 && declined.body.error.code === "PAYMENT_DECLINED");
const declinedBooking = await get(`${BOOKING}/bookings/${declined.body.error.details[0].bookingId}`);
seatMap = await get(`${INVENTORY}/shows/${showId}/seats`);
check("declined booking is FAILED and A2 is AVAILABLE again", declinedBooking.status === "FAILED" && seatStatus("A2") === "AVAILABLE");

const unknown = await book(["Z9"], "tok_visa", `unknown-${run}`);
check("BR6: unknown seat gives 422 UNKNOWN_SEATS", unknown.status === 422 && unknown.body.error.code === "UNKNOWN_SEATS");

const tooMany = await book(["A1", "A2", "A3", "A4", "B1", "B2", "B3"], "tok_visa", `toomany-${run}`);
check("BR4: 7 seats gives 400 VALIDATION_FAILED", tooMany.status === 400 && tooMany.body.error.code === "VALIDATION_FAILED");

const noKey = await post(`${BOOKING}/bookings`, { showId, seats: ["A3"], customerEmail: "e2e@example.com", cardToken: "tok_visa" });
check("missing Idempotency-Key gives 400", noKey.status === 400 && noKey.body.error.code === "IDEMPOTENCY_KEY_REQUIRED");

console.log(`\nRESULT: ${failed === 0 ? "ALL PASS" : "FAILED"} (${passed} of ${passed + failed} checks passed)`);
process.exit(failed === 0 ? 0 : 1);
