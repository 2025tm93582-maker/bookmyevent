import CatalogDB from "../../config/db.config.js";

const SELECT_SHOW = `
    SELECT s.id, s.event_id, s.venue, s.starts_at, e.title, e.duration_minutes
    FROM shows s
    JOIN events e ON e.id = s.event_id`;

const toShow = (row, prices) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.title,
    venue: row.venue,
    startsAt: row.starts_at,
    endsAt: new Date(row.starts_at.getTime() + row.duration_minutes * 60000),
    prices: prices.map((p) => ({ tier: p.tier, price: Number(p.price) })),
});

const findById = async (id) => {
    const [rows] = await CatalogDB.pool.query(`${SELECT_SHOW} WHERE s.id = ?`, [id]);
    if (!rows[0]) return null;

    const [prices] = await CatalogDB.pool.query(
        "SELECT tier, price FROM show_prices WHERE show_id = ? ORDER BY price DESC",
        [id],
    );
    return toShow(rows[0], prices);
};

const findByEvent = async (eventId) => {
    const [shows] = await CatalogDB.pool.query(`${SELECT_SHOW} WHERE s.event_id = ? ORDER BY s.starts_at`, [eventId]);
    if (!shows.length) return [];

    const [prices] = await CatalogDB.pool.query(
        "SELECT show_id, tier, price FROM show_prices WHERE show_id IN (?) ORDER BY price DESC",
        [shows.map((s) => s.id)],
    );
    return shows.map((s) =>
        toShow(
            s,
            prices.filter((p) => p.show_id === s.id),
        ),
    );
};

const create = async ({ eventId, venue, startsAt, prices }) => {
    const conn = await CatalogDB.pool.getConnection();

    try {
        await conn.beginTransaction();
        const [result] = await conn.query("INSERT INTO shows (event_id, venue, starts_at) VALUES (?, ?, ?)", [
            eventId,
            venue,
            startsAt,
        ]);
        await conn.query("INSERT INTO show_prices (show_id, tier, price) VALUES ?", [
            prices.map((p) => [result.insertId, p.tier, p.price]),
        ]);
        await conn.commit();
        return findById(result.insertId);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

export default { findById, findByEvent, create };
