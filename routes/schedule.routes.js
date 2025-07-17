import express from "express";
import {  allowOnlyAcceptedDoctor, protectRouter, protectRouterForDoctor } from "../middlewares/auth.js";
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
router.post("/create", protectRouterForDoctor,allowOnlyAcceptedDoctor, createSchedule);
router.get("/my-schedules", protectRouter, getMySchedules);
router.put("/:scheduleId", protectRouter, updateSchedule);
router.delete("/:scheduleId", protectRouter, deleteSchedule);

// User routes (requires protectRouterentication)
router.post("/register/:scheduleId", protectRouter, registerSchedule);
router.post("/cancel/:scheduleId", protectRouter, cancelRegisteredSchedule);
router.get("/my-registered", protectRouter, getMyRegisteredSchedules);

// Public routes (no authentication required)
router.get("/all", getAllSchedules);
router.get("/available", getAvailableSchedules);
router.get("/doctor/:doctorId", getDoctorSchedules);

export default router;
