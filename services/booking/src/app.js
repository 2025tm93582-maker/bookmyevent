import express from "express";
import Logger from "./config/logger.config.js";
import correlationId from "./middlewares/correlation.middleware.js";
import ErrorMiddleware from "./middlewares/error.middleware.js";
import HealthRoutes from "./routes/health/health.route.js";
import ApiRoutes from "./routes/index.js";
import { readFileSync } from "node:fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

const app = express();
const spec = YAML.parse(readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8"));

app.use(correlationId);
app.use(Logger.httpLogger);
app.use(express.json());

app.use("/health", HealthRoutes);
app.use("/api/v1", ApiRoutes);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

app.use(ErrorMiddleware.notFound);
app.use(ErrorMiddleware.errorHandler);

export default app;
