import pino from "pino";
import pinoHttp from "pino-http";
import env from "./env.config.js";

const logger = pino({
    level: env.logLevel,
    base: { service: env.serviceName },
});

const httpLogger = pinoHttp({
    logger,
    genReqId: (req) => req.correlationId,
    customProps: (req) => ({ correlationId: req.correlationId }),
    serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
    customErrorObject: (req, res, err, val) => {
        const { err: _, ...rest } = val;
        return rest;
    },
    customErrorMessage: () => "request completed",
});

export default { logger, httpLogger };
