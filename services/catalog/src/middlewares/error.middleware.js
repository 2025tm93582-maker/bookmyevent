import AppError from "../utils/app-error.util.js";
import Logger from "../config/logger.config.js";

const { logger } = Logger;

const notFound = (req, res, next) => {
    next(new AppError(404, "ROUTE_NOT_FOUND", `No route for ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
    const log = req.log || logger;

    if (err.type === "entity.parse.failed") {
        err = new AppError(400, "INVALID_JSON", "Request body is not valid JSON");
    }

    const known = err instanceof AppError;
    if (known) log.warn({ code: err.code, status: err.status }, err.message);
    else log.error({ err }, "Unhandled error");

    res.status(known ? err.status : 500).json({
        error: {
            code: known ? err.code : "INTERNAL_ERROR",
            message: known ? err.message : "Something went wrong",
            details: known ? err.details : [],
            correlationId: req.correlationId,
        },
    });
};

export default { notFound, errorHandler };
