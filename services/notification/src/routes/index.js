import { Router } from "express";
import NotificationRoutes from "./notification/notification.route.js";

const router = Router();

router.use("/notifications", NotificationRoutes);

export default router;
