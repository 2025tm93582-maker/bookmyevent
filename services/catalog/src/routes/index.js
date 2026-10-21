import { Router } from "express";
import EventRoutes from "./event/event.route.js";
import CategoryRoutes from "./category/category.route.js";
import ShowRoutes from "./show/show.route.js";

const router = Router();

router.use("/events", EventRoutes);
router.use("/categories", CategoryRoutes);
router.use("/shows", ShowRoutes);

export default router;
