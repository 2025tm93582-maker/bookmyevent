import { Router } from "express";
import SeatRoutes from "./seat/seat.route.js";
import HoldRoutes from "./hold/hold.route.js";

const router = Router();

router.use("/shows", SeatRoutes);
router.use("/holds", HoldRoutes);

export default router;
