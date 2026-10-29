import env from "./src/config/env.config.js";
import Logger from "./src/config/logger.config.js";
import app from "./src/app.js";
import NotificationDB from "./src/config/db.config.js";

const { logger } = Logger;

app.listen(env.port, async () => {
    logger.info({ port: env.port }, `${env.serviceName} service listening`);
    try {
        await NotificationDB.connect();
        await NotificationDB.migrate();
    } catch (err) {
        logger.fatal({ err }, "Failed to start");
        process.exit(1);
    }
});
