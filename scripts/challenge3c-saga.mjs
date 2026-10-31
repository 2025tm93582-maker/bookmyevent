const CATALOG = "http://localhost:3001/api/v1";
const INVENTORY = "http://localhost:3002/api/v1";
const BOOKING = "http://localhost:3003/api/v1";
const PAYMENT = "http://localhost:3004/api/v1";
const run = Date.now().toString(36);
const correlationId = `saga-${run}`;

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
    return { status: res.status, body: await res.json() };
};

console.log(`Challenge 3C: saga with compensation (correlation id ${correlationId})`);

const event = await post(`${CATALOG}/events`, { title: `Saga demo ${run}`, category: "CONCERT", durationMinutes: 120 });
const show = await post(`${CATALOG}/events/${event.body.id}/shows`, {
    venue: "Demo Hall",
    startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    prices: [{ tier: "GOLD", price: 2000 }],
});
const showId = show.body.id;
await post(`${INVENTORY}/shows/${showId}/seats`, { rows: [{ row: "A", count: 4, tier: "GOLD" }] });
console.log(`show ${showId} with seats A1-A4, booking A1 and A2`);

const response = await post(
    `${BOOKING}/bookings`,
    { showId, seats: ["A1", "A2"], customerEmail: "aksh@example.com", cardToken: "tok_visa" },
    { "Idempotency-Key": correlationId },
);
console.log(`\nPOST /bookings: ${response.status}`);

let bookingId = response.body.id;
if (response.status !== 201) bookingId = response.body.error.details[0].bookingId;

const booking = await get(`${BOOKING}/bookings/${bookingId}`);
console.log(`booking ${bookingId}: ${booking.status}`);
console.log("saga steps:");
for (const step of booking.steps) {
    console.log(`  ${step.step} ${step.outcome} ${step.detail || ""}`);
}

const payments = await get(`${PAYMENT}/payments?bookingId=${bookingId}`);
const hold = await get(`${INVENTORY}/holds/${booking.holdId}`);
const seatMap = await get(`${INVENTORY}/shows/${showId}/seats`);
const paymentStatus = payments.length > 0 ? payments[0].status : "none";
const a1 = seatMap.seats.find((seat) => seat.seatNo === "A1").status;
const a2 = seatMap.seats.find((seat) => seat.seatNo === "A2").status;

console.log("\nfinal state:");
console.log(`  booking: ${booking.status}`);
console.log(`  payment: ${paymentStatus}`);
console.log(`  hold: ${hold.status}, seats: A1 ${a1}, A2 ${a2}`);

let consistent;
if (booking.status === "CONFIRMED") {
    consistent = paymentStatus === "SUCCEEDED" && hold.status === "CONFIRMED" && a1 === "SOLD" && a2 === "SOLD";
} else {
    consistent =
        booking.status === "FAILED" &&
        paymentStatus !== "SUCCEEDED" &&
        hold.status === "RELEASED" &&
        a1 === "AVAILABLE" &&
        a2 === "AVAILABLE";
}

console.log(consistent ? "\nRESULT: CONSISTENT" : "\nRESULT: INCONSISTENT");
process.exit(consistent ? 0 : 1);
