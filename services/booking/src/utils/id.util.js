import AppError from "./app-error.util.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_ID", `"${value}" is not a valid id`);
    return id;
};

const toUuid = (value) => {
    if (!UUID.test(value)) throw new AppError(400, "INVALID_ID", `"${value}" is not a valid id`);
    return value.toLowerCase();
};

export default { toId, toUuid };
