import { Router } from "express";
import Payments from "../../controllers/payment/payment.controller.js";
import PaymentValidator from "../../validators/payment/payment.validator.js";
import validate from "../../middlewares/validate.middleware.js";
import idempotency from "../../middlewares/idempotency.middleware.js";

const router = Router();

router.post("/", validate(PaymentValidator.charge), idempotency, Payments.charge);
router.get("/", Payments.list);
router.get("/:id", Payments.get);
router.post("/:id/refund", Payments.refund);

export default router;
