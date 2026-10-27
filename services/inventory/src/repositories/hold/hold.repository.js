import { randomUUID } from "node:crypto";
import InventoryDB from "../../config/db.config.js";
import env from "../../config/env.config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toHold = (row) => ({
    id: row.id,
    showId: row.show_id,
    status: row.status,
    seats: row.seats,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const findById = async (id) => {
    const [rows] = await InventoryDB.pool.query("SELECT * FROM holds WHERE id = ?", [id]);
    return rows[0] ? toHold(rows[0]) : null;
};

const findSeats = async (showId, seats) => {
    const [rows] = await InventoryDB.pool.query(
        "SELECT seat_no, status FROM show_seats WHERE show_id = ? AND seat_no IN (?)",
        [showId, seats],
    );
    return rows;
};

const naiveHold = async (showId, seats) => {
    const [rows] = await InventoryDB.pool.query(
        "SELECT seat_no, status FROM show_seats WHERE show_id = ? AND seat_no IN (?)",
        [showId, seats],
    );
    if (rows.length !== seats.length || rows.some((row) => row.status !== "AVAILABLE")) return null;

    await sleep(50);

    const id = randomUUID();
    await InventoryDB.pool.query(
        "UPDATE show_seats SET status = 'HELD', hold_id = ? WHERE show_id = ? AND seat_no IN (?)",
        [id, showId, seats],
    );
    await InventoryDB.pool.query("INSERT INTO holds (id, show_id, seats) VALUES (?, ?, ?)", [
        id,
        showId,
        JSON.stringify(seats),
    ]);
    return id;
};

const hold = async (showId, seats) => {
    if (env.holdStrategy === "naive") return naiveHold(showId, seats);
    const id = randomUUID();
    const conn = await InventoryDB.pool.getConnection();

    try {
        await conn.beginTransaction();

        const [result] = await conn.query(
            `UPDATE show_seats
                SET status = 'HELD', hold_id = ?
              WHERE show_id = ? AND seat_no IN (?) AND status = 'AVAILABLE'`,
            [id, showId, seats],
        );

        if (result.affectedRows !== seats.length) {
            await conn.rollback();
            return null;
        }

        await conn.query("INSERT INTO holds (id, show_id, seats) VALUES (?, ?, ?)", [
            id,
            showId,
            JSON.stringify(seats),
        ]);
        await conn.commit();
        return id;
    } catch (err) {
        await conn.rollback();
        if (err.code === "ER_LOCK_DEADLOCK") return null;
        throw err;
    } finally {
        conn.release();
    }
};

const settle = async (id, target, allowed) => {
    const conn = await InventoryDB.pool.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query("SELECT id, status FROM holds WHERE id = ? FOR UPDATE", [id]);
        const current = rows[0];

        if (!current || !allowed(current.status, target)) {
            await conn.rollback();
            return { found: Boolean(current), status: current?.status, changed: false };
        }

        if (target === "CONFIRMED") {
            await conn.query("UPDATE show_seats SET status = 'SOLD' WHERE hold_id = ?", [id]);
        } else {
            await conn.query("UPDATE show_seats SET status = 'AVAILABLE', hold_id = NULL WHERE hold_id = ?", [id]);
        }

        await conn.query("UPDATE holds SET status = ? WHERE id = ?", [target, id]);
        await conn.commit();
        return { found: true, status: target, changed: true };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

export default { findById, findSeats, hold, settle };
