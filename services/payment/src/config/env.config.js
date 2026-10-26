import "dotenv/config";

const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
};

const env = {
    serviceName: process.env.SERVICE_NAME || "payment",
    port: Number(process.env.PORT || 3004),
    logLevel: process.env.LOG_LEVEL || "info",
    paymentDelayMs: Number(process.env.PAYMENT_DELAY_MS || 0),
    paymentFailRate: Number(process.env.PAYMENT_FAIL_RATE || 0),
    db: {
        host: required("DB_HOST"),
        port: Number(process.env.DB_PORT || 3306),
        user: required("DB_USER"),
        password: required("DB_PASSWORD"),
        database: required("DB_NAME"),
    },
};

export default env;
