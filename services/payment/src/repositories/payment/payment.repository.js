import { randomUUID } from "node:crypto";
import PaymentDB from "../../config/db.config.js";

const toPayment = (row) => ({
    id: row.id,
    bookingId: row.booking_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    refundedAt: row.refunded_at,
});

const findById = async (id) => {
    const [rows] = await PaymentDB.pool.query("SELECT * FROM payments WHERE id = ?", [id]);
    return rows[0] ? toPayment(rows[0]) : null;
};

const findByBooking = async (bookingId) => {
    const [rows] = await PaymentDB.pool.query("SELECT * FROM payments WHERE booking_id = ?", [bookingId]);
    return rows.map(toPayment);
};

const create = async ({ bookingId, amount, currency, status }) => {
    const id = randomUUID();
    try {
        await PaymentDB.pool.query(
            "INSERT INTO payments (id, booking_id, amount, currency, status) VALUES (?, ?, ?, ?, ?)",
            [id, bookingId, amount, currency, status],
        );
        return findById(id);
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return null;
        throw err;
    }
};

const refund = async (id) => {
    const [result] = await PaymentDB.pool.query(
        "UPDATE payments SET status = 'REFUNDED', refunded_at = NOW() WHERE id = ? AND status = 'SUCCEEDED'",
        [id],
    );
    return result.affectedRows === 1;
};

export default { findById, findByBooking, create, refund };
