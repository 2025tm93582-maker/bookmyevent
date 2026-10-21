import AppError from "./app-error.util.js";

const toId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new AppError(400, "INVALID_ID", `"${value}" is not a valid id`);
    return id;
};

export default { toId };
