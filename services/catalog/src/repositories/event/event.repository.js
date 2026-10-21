import CatalogDB from "../../config/db.config.js";

const toEvent = (row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    durationMinutes: row.duration_minutes,
    createdAt: row.created_at,
});

const findById = async (id) => {
    const [rows] = await CatalogDB.pool.query("SELECT * FROM events WHERE id = ?", [id]);
    return rows[0] ? toEvent(rows[0]) : null;
};

const findAll = async ({ category }) => {
    const [rows] = category
        ? await CatalogDB.pool.query("SELECT * FROM events WHERE category = ? ORDER BY id", [category])
        : await CatalogDB.pool.query("SELECT * FROM events ORDER BY id");
    return rows.map(toEvent);
};

const create = async ({ title, category, description, durationMinutes }) => {
    const [result] = await CatalogDB.pool.query(
        "INSERT INTO events (title, category, description, duration_minutes) VALUES (?, ?, ?, ?)",
        [title, category, description ?? null, durationMinutes],
    );
    return findById(result.insertId);
};

export default { findById, findAll, create };
