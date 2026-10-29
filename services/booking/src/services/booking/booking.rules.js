const TRANSITIONS = {
    PENDING: ["SEATS_HELD", "REJECTED", "FAILED"],
    SEATS_HELD: ["PAID", "COMPENSATING"],
    PAID: ["CONFIRMED", "COMPENSATING"],
    COMPENSATING: ["FAILED"],
    CONFIRMED: ["CANCELLED"],
    REJECTED: [],
    FAILED: [],
    CANCELLED: [],
};

const canMove = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

const isBookingClosed = (startsAt, now = new Date(), cutoffMinutes = 15) =>
    new Date(startsAt).getTime() - now.getTime() < cutoffMinutes * 60000;

const calculateAmount = (seats, seatMap, prices) => {
    const tierOf = new Map(seatMap.map((s) => [s.seatNo, s.tier]));
    const priceOf = new Map(prices.map((p) => [p.tier, p.price]));
    const missing = seats.filter((seat) => !priceOf.has(tierOf.get(seat)));
    const total = seats.reduce((sum, seat) => sum + (priceOf.get(tierOf.get(seat)) ?? 0), 0);
    return { amount: Math.round(total * 100) / 100, missing };
};

export default { TRANSITIONS, canMove, isBookingClosed, calculateAmount };
