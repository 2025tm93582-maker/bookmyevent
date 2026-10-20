import express from "express";
import pinoHttp from "pino-http";
import logger from "./config/logger.config.js";
import correlationId from "./middlewares/correlation.middleware.js";
import ErrorMiddleware from "./middlewares/error.middleware.js";
import HealthRoutes from "./routes/health/health.routes.js";
import ApiRoutes from "./routes/index.js";

const app = express();

app.use(correlationId);
app.use(
    pinoHttp({
        logger,
        genReqId: (req) => req.correlationId,
        customProps: (req) => ({ correlationId: req.correlationId }),
    }),
);
app.use(express.json());

app.use("/health", HealthRoutes);
app.use("/api/v1", ApiRoutes);

app.use(ErrorMiddleware.notFound);
app.use(ErrorMiddleware.errorHandler);

export default app;
