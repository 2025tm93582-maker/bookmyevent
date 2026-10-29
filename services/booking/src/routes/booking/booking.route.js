import { Router } from "express";
import Bookings from "../../controllers/booking/booking.controller.js";
import BookingValidator from "../../validators/booking/booking.validator.js";
import validate from "../../middlewares/validate.middleware.js";
import idempotency from "../../middlewares/idempotency.middleware.js";

const router = Router();

router.post("/", validate(BookingValidator.create), idempotency, Bookings.create);
router.get("/:id", Bookings.get);

export default router;
