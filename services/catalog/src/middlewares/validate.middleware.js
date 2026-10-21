import AppError from "../utils/app-error.util.js";

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const details = result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
        return next(new AppError(400, "VALIDATION_FAILED", "Request body is invalid", details));
    }

    req.body = result.data;
    next();
};

export default validate;
