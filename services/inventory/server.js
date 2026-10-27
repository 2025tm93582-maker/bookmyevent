import env from "./src/config/env.config.js";
import Logger from "./src/config/logger.config.js";
import app from "./src/app.js";
import InventoryDB from "./src/config/db.config.js";

const { logger } = Logger;

app.listen(env.port, async () => {
    logger.info({ port: env.port }, `${env.serviceName} service listening`);
    try {
        if (env.holdStrategy === "naive") logger.warn("HOLD_STRATEGY=naive: check-then-update demo mode, NOT SAFE");
        if (env.faultConfirmFail) logger.warn("FAULT_CONFIRM_FAIL=true: every seat confirmation will fail");
        await InventoryDB.connect();
        await InventoryDB.migrate();
    } catch (err) {
        logger.fatal({ err }, "Failed to start");
        process.exit(1);
    }
});
