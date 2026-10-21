import { Router } from "express";
import Events from "../../controllers/event/event.controller.js";
import EventValidator from "../../validators/event/event.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = Router();

router.get("/", Events.list);
router.get("/:id", Events.get);
router.post("/", validate(EventValidator.create), Events.create);

export default router;
