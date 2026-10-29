import { Router } from "express";
import BookingRoutes from "./booking/booking.route.js";

const router = Router();

router.use("/bookings", BookingRoutes);

export default router;
