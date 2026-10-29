import "dotenv/config";

const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
};

const env = {
    serviceName: process.env.SERVICE_NAME || "booking",
    port: Number(process.env.PORT || 3003),
    logLevel: process.env.LOG_LEVEL || "info",
    httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS || 2000),
    bookingCutoffMinutes: Number(process.env.BOOKING_CUTOFF_MINUTES || 15),
    services: {
        catalog: required("CATALOG_URL"),
        inventory: required("INVENTORY_URL"),
        payment: required("PAYMENT_URL"),
        notification: required("NOTIFICATION_URL"),
    },
    db: {
        host: required("DB_HOST"),
        port: Number(process.env.DB_PORT || 3306),
        user: required("DB_USER"),
        password: required("DB_PASSWORD"),
        database: required("DB_NAME"),
    },
};

export default env;
