import PaymentDB from "../../config/db.config.js";

const claim = async (key, hash) => {
    try {
        const [result] = await PaymentDB.pool.query(
            "INSERT IGNORE INTO idempotency_keys (idem_key, request_hash, status) VALUES (?, ?, 'IN_PROGRESS')",
            [key, hash],
        );
        return result.affectedRows === 1;
    } catch (err) {
        if (err.code === "ER_LOCK_DEADLOCK") return false;
        throw err;
    }
};

const find = async (key) => {
    const [rows] = await PaymentDB.pool.query("SELECT * FROM idempotency_keys WHERE idem_key = ?", [key]);
    return rows[0] || null;
};

const complete = async (key, code, body) => {
    await PaymentDB.pool.query(
        "UPDATE idempotency_keys SET status = 'COMPLETED', response_code = ?, response_body = ? WHERE idem_key = ?",
        [code, JSON.stringify(body), key],
    );
};

const release = async (key) => {
    await PaymentDB.pool.query("DELETE FROM idempotency_keys WHERE idem_key = ?", [key]);
};

export default { claim, find, complete, release };
