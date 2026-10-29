import axios from "axios";
import env from "../config/env.config.js";

const call = async (service, { method, path, data, headers = {} }, ctx) => {
    try {
        const res = await axios.request({
            baseURL: env.services[service],
            url: path,
            method,
            data,
            timeout: env.httpTimeoutMs,
            headers: { "X-Correlation-Id": ctx.correlationId, ...headers },
            validateStatus: () => true,
        });
        return { status: res.status, data: res.data };
    } catch (err) {
        const reason = err.code === "ECONNABORTED" ? "TIMEOUT" : "UNREACHABLE";
        ctx.log.warn({ service, path, reason }, "Dependency call failed");
        return { status: 0, data: null, reason };
    }
};

export default { call };
