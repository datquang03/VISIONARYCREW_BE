import express from "express";
import {
  createPackagePayment,
  handlePackagePaymentWebhook,
  checkPackagePaymentStatus,
  getDoctorPaymentHistory,
  cancelPackagePayment,
  getPackages,
  handlePaymentCancel,
  handlePaymentSuccess,
  getPaymentStatistics,
  getPaymentSystemHealth,
  getAllPayment,
} from "../controllers/payment.controllers.js";
import { admin, protectDoctorRouter, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/packages", getPackages);
router.post("/package/webhook", handlePackagePaymentWebhook);
router.get("/package/success", handlePaymentSuccess);
router.get("/package/cancel", handlePaymentCancel);
router.get("/health", getPaymentSystemHealth);

// Admin routes (admin auth required)
router.get("/admin/all", protectRouter, admin, getAllPayment);

// Protected routes (doctor auth required)
router.post("/package/create", protectDoctorRouter, createPackagePayment);
router.get("/package/status/:orderCode", protectDoctorRouter, checkPackagePaymentStatus);
router.get("/package/history", protectDoctorRouter, getDoctorPaymentHistory);
router.get("/package/statistics", protectDoctorRouter, getPaymentStatistics);
router.post("/package/cancel/:orderCode", protectDoctorRouter, cancelPackagePayment);

export default router;
