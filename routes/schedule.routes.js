import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  createSchedule,
  getAllSchedules,
  getDoctorSchedules,
  getMySchedules,
  updateSchedule,
  deleteSchedule,
  getAvailableSchedules,
  registerSchedule,
  cancelRegisteredSchedule,
  getMyRegisteredSchedules,
} from "../controllers/schedule.controllers.js";

const router = express.Router();

// Doctor routes (requires authentication)
router.post("/create", auth, createSchedule);
router.get("/my-schedules", auth, getMySchedules);
router.put("/:scheduleId", auth, updateSchedule);
router.delete("/:scheduleId", auth, deleteSchedule);

// User routes (requires authentication)
router.post("/register/:scheduleId", auth, registerSchedule);
router.post("/cancel/:scheduleId", auth, cancelRegisteredSchedule);
router.get("/my-registered", auth, getMyRegisteredSchedules);

// Public routes (no authentication required)
router.get("/all", getAllSchedules);
router.get("/available", getAvailableSchedules);
router.get("/doctor/:doctorId", getDoctorSchedules);

export default router;
