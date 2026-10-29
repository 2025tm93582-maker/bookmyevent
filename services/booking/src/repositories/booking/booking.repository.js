import BookingDB from "../../config/db.config.js";

const toStep = (row) => ({ step: row.step, outcome: row.outcome, detail: row.detail, at: row.created_at });

const toBooking = (row, steps = []) => ({
    id: row.id,
    showId: row.show_id,
    customerEmail: row.customer_email,
    seats: row.seats,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    holdId: row.hold_id,
    paymentId: row.payment_id,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps: steps.map(toStep),
});

const findById = async (id) => {
    const [rows] = await BookingDB.pool.query("SELECT * FROM bookings WHERE id = ?", [id]);
    if (!rows[0]) return null;

    const [steps] = await BookingDB.pool.query("SELECT * FROM saga_steps WHERE booking_id = ? ORDER BY id", [id]);
    return toBooking(rows[0], steps);
};

const create = async ({ id, showId, customerEmail, seats, amount }) => {
    await BookingDB.pool.query(
        "INSERT INTO bookings (id, show_id, customer_email, seats, amount, status) VALUES (?, ?, ?, ?, ?, 'PENDING')",
        [id, showId, customerEmail, JSON.stringify(seats), amount],
    );
    return findById(id);
};

const transition = async (id, from, to, fields = {}) => {
    const columns = Object.keys(fields);
    const [result] = await BookingDB.pool.query(
        `UPDATE bookings SET status = ?${columns.map((c) => `, ${c} = ?`).join("")} WHERE id = ? AND status = ?`,
        [to, ...Object.values(fields), id, from],
    );
    return result.affectedRows === 1;
};

const logStep = async (bookingId, step, outcome, detail = null) => {
    await BookingDB.pool.query("INSERT INTO saga_steps (booking_id, step, outcome, detail) VALUES (?, ?, ?, ?)", [
        bookingId,
        step,
        outcome,
        detail,
    ]);
};

export default { findById, create, transition, logStep };
