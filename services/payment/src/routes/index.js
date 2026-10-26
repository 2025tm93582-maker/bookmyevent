import { Router } from "express";
import PaymentRoutes from "./payment/payment.route.js";

const router = Router();

router.use("/payments", PaymentRoutes);

export default router;
