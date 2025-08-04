import express from "express";
import { protectRouter, protectRouterForDoctor, protectRouterForAdmin, admin } from "../middlewares/auth.js";
import { createFeedback, getFeedbackBySchedule, getDoctorFeedback, getDoctorFeedbackStats, getAllFeedback } from "../controllers/feedback.controllers.js";

const router = express.Router();

// Patient routes
router.post("/create", protectRouter, createFeedback);
router.get("/schedule/:scheduleId", protectRouter, getFeedbackBySchedule);
router.get("/admin/all", protectRouter, admin, getAllFeedback);

// Doctor routes
router.get("/doctor", protectRouterForDoctor, getDoctorFeedback);
router.get("/doctor/stats", protectRouterForDoctor, getDoctorFeedbackStats);

// Admin routes

export default router; 