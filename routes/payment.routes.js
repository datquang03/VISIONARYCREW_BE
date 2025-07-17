import express from "express";
import {
  createPackagePayment,
  handlePackagePaymentWebhook,
  checkPackagePaymentStatus,
  getDoctorPaymentHistory,
  cancelPackagePayment,
  getPackages,
} from "../controllers/payment.controllers.js";
import { protectDoctorRouter } from "../middlewares/auth.js";

const router = express.Router();

// Get available packages and pricing
router.get("/packages", getPackages);

// Create package payment link (doctor only)
router.post("/package/create", protectDoctorRouter, createPackagePayment);

// PayOS webhook for package payments (no auth required)
router.post("/package/webhook", handlePackagePaymentWebhook);

// Check package payment status (doctor only)
router.get("/package/status/:orderCode", protectDoctorRouter, checkPackagePaymentStatus);

// Get doctor's package payment history (doctor only)
router.get("/package/history", protectDoctorRouter, getDoctorPaymentHistory);

// Cancel package payment (doctor only)
router.post("/package/cancel/:orderCode", protectDoctorRouter, cancelPackagePayment);

export default router;
