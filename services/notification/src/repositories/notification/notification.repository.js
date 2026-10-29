import { randomUUID } from "node:crypto";
import NotificationDB from "../../config/db.config.js";

const toNotification = (row) => ({
    id: row.id,
    bookingId: row.booking_id,
    channel: row.channel,
    recipient: row.recipient,
    template: row.template,
    message: row.message,
    createdAt: row.created_at,
});

const findOne = async ({ bookingId, template, channel }) => {
    const [rows] = await NotificationDB.pool.query(
        "SELECT * FROM notifications WHERE booking_id = ? AND template = ? AND channel = ?",
        [bookingId, template, channel],
    );
    return rows[0] ? toNotification(rows[0]) : null;
};

const findByBooking = async (bookingId) => {
    const [rows] = await NotificationDB.pool.query(
        "SELECT * FROM notifications WHERE booking_id = ? ORDER BY created_at",
        [bookingId],
    );
    return rows.map(toNotification);
};

const create = async ({ bookingId, channel, recipient, template, message }) => {
    try {
        await NotificationDB.pool.query(
            "INSERT INTO notifications (id, booking_id, channel, recipient, template, message) VALUES (?, ?, ?, ?, ?, ?)",
            [randomUUID(), bookingId, channel, recipient, template, message],
        );
        return { notification: await findOne({ bookingId, template, channel }), created: true };
    } catch (err) {
        if (err.code !== "ER_DUP_ENTRY") throw err;
        return { notification: await findOne({ bookingId, template, channel }), created: false };
    }
};

export default { findByBooking, create };
