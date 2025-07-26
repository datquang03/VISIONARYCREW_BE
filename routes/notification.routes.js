import express from "express";
import { 
  getNotifications, 
  markNotificationRead, 
  deleteNotification, 
  deleteAllNotification,
  createNotification
} from "../controllers/notification.controllers.js";
import { protectAnyUser } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", protectAnyUser, createNotification);
router.get("/", protectAnyUser, getNotifications);
router.patch("/:id/read", protectAnyUser, markNotificationRead);
router.delete("/:id", protectAnyUser, deleteNotification);
router.delete("/", protectAnyUser, deleteAllNotification);

export default router; 