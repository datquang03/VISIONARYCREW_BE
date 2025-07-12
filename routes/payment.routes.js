import express from "express";
import {
  createPayment,
  handlePayOSWebhook,
  checkPaymentStatus,
  getPaymentHistory,
  cancelPayment,
} from "../controllers/payment.controllers.js";
import { protectRouter } from "../middlewares/auth.js";

const router = express.Router();

// Create payment link
router.post("/create", protectRouter, createPayment);

// PayOS webhook (no auth required)
router.post("/webhook", handlePayOSWebhook);

// Check payment status
router.get("/status/:orderCode", protectRouter, checkPaymentStatus);

// Get payment history
router.get("/history", protectRouter, getPaymentHistory);

// Cancel payment
router.post("/cancel/:orderCode", protectRouter, cancelPayment);

export default router;
