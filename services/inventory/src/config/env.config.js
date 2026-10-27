import "dotenv/config";

const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
};

const env = {
    serviceName: process.env.SERVICE_NAME || "inventory",
    port: Number(process.env.PORT || 3002),
    logLevel: process.env.LOG_LEVEL || "info",
    holdStrategy: process.env.HOLD_STRATEGY === "naive" ? "naive" : "atomic",
    faultConfirmFail: process.env.FAULT_CONFIRM_FAIL === "true",
    db: {
        host: required("DB_HOST"),
        port: Number(process.env.DB_PORT || 3306),
        user: required("DB_USER"),
        password: required("DB_PASSWORD"),
        database: required("DB_NAME"),
    },
};

export default env;
