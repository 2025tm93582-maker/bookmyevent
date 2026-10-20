import pino from "pino";
import env from "./env.config.js";

const logger = pino({
    level: env.logLevel,
    base: { service: env.serviceName },
});

export default logger;
