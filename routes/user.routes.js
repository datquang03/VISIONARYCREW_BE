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
  getMyTransactions
} from "../controllers/user.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmailCode);
router.post("/login", login);
router.get("/profile", protectRouter, getMyProfile);
router.get("/:id", getUserById);
router.get("/", getAllUsers);
router.put("/profile", protectRouter, admin, updateUserProfile);
router.delete("/account", protectRouter, admin, deleteUserAccount);


// Payment related routes
router.post("/recharge", protectRouter, rechargeBalance);
router.get("/balance", protectRouter, getBalance);
router.get("/transactions", protectRouter, getMyTransactions);

export default router;
