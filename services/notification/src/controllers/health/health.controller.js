import env from "../../config/env.config.js";
import NotificationDB from "../../config/db.config.js";

const check = async (req, res) => {
    try {
        await NotificationDB.ping();
        res.json({ status: "UP", service: env.serviceName, db: "UP" });
    } catch (err) {
        req.log.warn({ reason: err.message }, "Health check: database down");
        res.status(503).json({ status: "DOWN", service: env.serviceName, db: "DOWN" });
    }
};

export default { check };
