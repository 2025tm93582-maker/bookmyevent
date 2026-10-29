import { Router } from "express";
import Notifications from "../../controllers/notification/notification.controller.js";
import NotificationValidator from "../../validators/notification/notification.validator.js";
import validate from "../../middlewares/validate.middleware.js";

const router = Router();

router.post("/", validate(NotificationValidator.send), Notifications.send);
router.get("/", Notifications.list);

export default router;
