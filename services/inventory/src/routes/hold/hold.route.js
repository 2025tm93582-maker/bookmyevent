import { Router } from "express";
import Holds from "../../controllers/hold/hold.controller.js";
import HoldValidator from "../../validators/hold/hold.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = Router();

router.post("/", validate(HoldValidator.create), Holds.create);
router.get("/:id", Holds.get);
router.post("/:id/confirm", Holds.confirm);
router.post("/:id/release", Holds.release);

export default router;
