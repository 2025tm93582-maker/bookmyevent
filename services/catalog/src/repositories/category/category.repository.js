import CatalogDB from "../../config/db.config.js";

const findAll = async () => {
    const [rows] = await CatalogDB.pool.query("SELECT code, name FROM categories ORDER BY name");
    return rows;
};

const findByCode = async (code) => {
    const [rows] = await CatalogDB.pool.query("SELECT code, name FROM categories WHERE code = ?", [code]);
    return rows[0] || null;
};

const create = async ({ code, name }) => {
    try {
        await CatalogDB.pool.query("INSERT INTO categories (code, name) VALUES (?, ?)", [code, name]);
        return { code, name };
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return null;
        throw err;
    }
};

export default { findAll, findByCode, create };
