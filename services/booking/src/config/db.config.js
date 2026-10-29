import mysql from "mysql2/promise";
import env from "./env.config.js";
import Logger from "./logger.config.js";
import { readdir, readFile } from "node:fs/promises";

const { logger } = Logger;

const pool = mysql.createPool({
    ...env.db,
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: 10,
});

pool.pool.on("connection", (conn) => {
    conn.query("SET time_zone = '+00:00'");
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connect = async (retries = 10, delayMs = 2000) => {
    for (let attempt = 1; ; attempt++) {
        try {
            await pool.query("SELECT 1");
            logger.info("Database connected");
            return;
        } catch (err) {
            logger.warn({ attempt, reason: err.message }, "Database not ready, retrying");
            if (attempt >= retries) throw err;
            await sleep(delayMs);
        }
    }
};

const migrate = async () => {
    const dir = new URL("../migrations/", import.meta.url);
    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
    const conn = await mysql.createConnection({ ...env.db, timezone: "Z", multipleStatements: true });

    try {
        await conn.query(
            "CREATE TABLE IF NOT EXISTS schema_migrations (file VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        );
        const [rows] = await conn.query("SELECT file FROM schema_migrations");
        const applied = new Set(rows.map((row) => row.file));

        for (const file of files) {
            if (applied.has(file)) continue;
            await conn.query(await readFile(new URL(file, dir), "utf8"));
            await conn.query("INSERT INTO schema_migrations (file) VALUES (?)", [file]);
            logger.info({ file }, "Migration applied");
        }
    } finally {
        await conn.end();
    }
};

const ping = async () => {
    await pool.query("SELECT 1");
};

export default { pool, connect, ping, migrate };
