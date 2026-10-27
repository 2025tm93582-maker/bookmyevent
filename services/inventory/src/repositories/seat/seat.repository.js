import InventoryDB from "../../config/db.config.js";

const toSeat = (row) => ({
    seatNo: row.seat_no,
    tier: row.tier,
    status: row.status,
});

const findByShow = async (showId) => {
    const [rows] = await InventoryDB.pool.query(
        "SELECT seat_no, tier, status FROM show_seats WHERE show_id = ? ORDER BY row_label, seat_number",
        [showId],
    );
    return rows.map(toSeat);
};

const createLayout = async (showId, rows) => {
    const values = rows.flatMap((r) =>
        Array.from({ length: r.count }, (_, i) => [showId, `${r.row}${i + 1}`, r.row, i + 1, r.tier]),
    );

    try {
        await InventoryDB.pool.query(
            "INSERT INTO show_seats (show_id, seat_no, row_label, seat_number, tier) VALUES ?",
            [values],
        );
        return values.length;
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return null;
        throw err;
    }
};

export default { findByShow, createLayout };
