import { Router } from "express";
import Health from "../../controllers/health/health.controller.js";

const router = Router();
router.get("/", Health.check);

export default router;
