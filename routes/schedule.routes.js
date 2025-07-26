import express from "express";
import { protectRouter, protectRouterForDoctor } from "../middlewares/auth.js";
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
  cancelPendingSchedule,
  getMyRegisteredSchedules,
  makeScheduleAvailable,
  rejectRegisterSchedule,
  acceptRegisterSchedule,
  getPendingSchedules,
} from "../controllers/schedule.controllers.js";

const router = express.Router();
// Public routes (no authentication required)
router.get("/all", getAllSchedules);
router.get("/available", getAvailableSchedules);
router.get("/doctor/:doctorId", getDoctorSchedules);

// Doctor routes (requires authentication)
router.post("/create", protectRouterForDoctor, createSchedule);
router.get("/my-schedules", protectRouterForDoctor, getMySchedules);
router.get("/pending", protectRouterForDoctor, getPendingSchedules);
router.put("/:scheduleId", protectRouterForDoctor, updateSchedule);
router.delete("/:scheduleId", protectRouterForDoctor, deleteSchedule);
router.post("/reactivate/:scheduleId", protectRouterForDoctor, makeScheduleAvailable);
router.post("/reject/:scheduleId", protectRouterForDoctor, rejectRegisterSchedule);
router.post("/accept/:scheduleId", protectRouterForDoctor, acceptRegisterSchedule);

// User routes (requires authentication)
router.post("/register/:scheduleId", protectRouter, registerSchedule);
router.post("/cancel/:scheduleId", protectRouter, cancelRegisteredSchedule);
router.post("/cancel-pending/:scheduleId", protectRouter, cancelPendingSchedule);
router.get("/my-registered", protectRouter, getMyRegisteredSchedules);



export default router;
