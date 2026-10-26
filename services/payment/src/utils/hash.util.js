import { createHash } from "node:crypto";

const stable = (value) => {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
            .join(",")}}`;
    }
    return JSON.stringify(value);
};

const fingerprint = (req) =>
    createHash("sha256")
        .update(`${req.method} ${req.baseUrl}${req.path} ${stable(req.body)}`)
        .digest("hex");

export default { fingerprint };
