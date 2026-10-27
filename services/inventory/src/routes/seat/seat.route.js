import { Router } from "express";
import Seats from "../../controllers/seat/seat.controller.js";
import SeatValidator from "../../validators/seat/seat.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = Router();

router.get("/:id/seats", Seats.getMap);
router.post("/:id/seats", validate(SeatValidator.createLayout), Seats.createLayout);

export default router;
