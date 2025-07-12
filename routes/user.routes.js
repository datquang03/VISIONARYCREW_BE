import express from "express";
import {
  register,
  verifyEmailCode,
  login,
  getMyProfile,
  getUserById,
  getAllUsers,
  updateUserProfile,
  deleteUserAccount,
  rechargeBalance,
  getBalance,
  getMyTransactions,
  approveDoctorAccount,
  rejectDoctorAccount,
  getPendingDoctorApplications,
  getDoctorApplicationsByStatus,
} from "../controllers/user.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmailCode);
router.post("/login", login);
router.get("/profile", protectRouter, getMyProfile);
router.get("/:id", getUserById);
router.get("/", protectRouter, admin, getAllUsers);
router.put("/profile", protectRouter, admin, updateUserProfile);
router.delete("/account", protectRouter, admin, deleteUserAccount);

// Doctor management routes (Admin only)
router.get("/doctors/pending", protectRouter, admin, getPendingDoctorApplications);
router.get("/doctors/status/:status", protectRouter, admin, getDoctorApplicationsByStatus);
router.post("/doctors/approve/:id", protectRouter, admin, approveDoctorAccount);
router.post("/doctors/reject/:id", protectRouter, admin, rejectDoctorAccount);

// Payment related routes
router.post("/recharge", protectRouter, rechargeBalance);
router.get("/balance", protectRouter, getBalance);
router.get("/transactions", protectRouter, getMyTransactions);

export default router;
