import mysql from "mysql2/promise";
import env from "./env.config.js";
import logger from "./logger.config.js";

const pool = mysql.createPool({
    ...env.db,
    waitForConnections: true,
    connectionLimit: 10,
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

const ping = async () => {
    await pool.query("SELECT 1");
};

export default { pool, connect, ping };
