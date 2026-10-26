import AppError from "../utils/app-error.util.js";
import Hash from "../utils/hash.util.js";
import IdempotencyRepository from "../repositories/idempotency/idempotency.repository.js";

const KEY = /^[A-Za-z0-9_-]{8,64}$/;

const replay = (stored, hash, req, res, next) => {
    if (stored.request_hash !== hash) {
        return next(
            new AppError(422, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was used with a different request"),
        );
    }
    if (stored.status === "IN_PROGRESS") {
        res.set("Retry-After", "1");
        return next(new AppError(409, "REQUEST_IN_PROGRESS", "The original request is still being processed"));
    }

    req.log.info({ idempotencyKey: stored.idem_key }, "Idempotent replay");
    res.set("Idempotent-Replayed", "true");
    res.status(stored.response_code).json(stored.response_body);
};

const own = (key, req, res, next) => {
    const send = res.json.bind(res);
    res.json = (body) => {
        const save =
            res.statusCode >= 500
                ? IdempotencyRepository.release(key)
                : IdempotencyRepository.complete(key, res.statusCode, body);

        save.catch((err) => req.log.error({ err }, "Could not save idempotency result")).finally(() => send(body));
        return res;
    };
    next();
};

const idempotency = async (req, res, next) => {
    const key = req.get("Idempotency-Key");
    if (!key) return next(new AppError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required"));
    if (!KEY.test(key)) return next(new AppError(400, "INVALID_IDEMPOTENCY_KEY", "Use 8–64 letters, digits, - or _"));

    const hash = Hash.fingerprint(req);

    for (let attempt = 1; attempt <= 3; attempt++) {
        if (await IdempotencyRepository.claim(key, hash)) return own(key, req, res, next);

        const stored = await IdempotencyRepository.find(key);
        if (stored) return replay(stored, hash, req, res, next);
    }

    res.set("Retry-After", "1");
    next(new AppError(409, "REQUEST_IN_PROGRESS", "The original request is still being processed"));
};

export default idempotency;
