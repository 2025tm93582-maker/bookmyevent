import { randomUUID } from "node:crypto";

const correlationId = (req, res, next) => {
    const id = req.get("X-Correlation-Id") || randomUUID();
    req.correlationId = id;
    res.set("X-Correlation-Id", id);
    next();
};

export default correlationId;
