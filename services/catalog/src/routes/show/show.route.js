import { Router } from "express";
import Shows from "../../controllers/show/show.controller.js";

const router = Router();

router.get("/:id", Shows.get);

export default router;
