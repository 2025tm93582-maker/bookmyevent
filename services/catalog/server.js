import env from "./src/config/env.config.js";
import logger from "./src/config/logger.config.js";
import app from "./src/app.js";
import CatalogDB from "./src/config/db.config.js";

app.listen(env.port, async () => {
    logger.info({ port: env.port }, `${env.serviceName} service listening`);
    try {
        await CatalogDB.connect();
        await CatalogDB.migrate();
    } catch (err) {
        logger.fatal({ err }, "Failed to start");
        process.exit(1);
    }
});
