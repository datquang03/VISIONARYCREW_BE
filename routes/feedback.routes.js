import express from "express";
import { protectRouter, protectRouterForDoctor, protectRouterForAdmin } from "../middlewares/auth.js";
import { createFeedback, getFeedbackBySchedule, getDoctorFeedback, getDoctorFeedbackStats, getAllFeedback } from "../controllers/feedback.controllers.js";

const router = express.Router();

// Patient routes
router.post("/create", protectRouter, createFeedback);
router.get("/schedule/:scheduleId", protectRouter, getFeedbackBySchedule);

// Doctor routes
router.get("/doctor", protectRouterForDoctor, getDoctorFeedback);
router.get("/doctor/stats", protectRouterForDoctor, getDoctorFeedbackStats);

// Admin routes
router.get("/admin/all", protectRouterForAdmin, getAllFeedback);

export default router; 