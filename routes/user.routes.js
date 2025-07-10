import express from "express";
import {
  register,
  verifyEmailCode,
  login,
  getAllUsers,
  getMyProfile,
  getUserById,
} from "../controllers/user.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmailCode);
router.post("/login", login);
router.get("/profile", protectRouter, getMyProfile);
router.get("/:id", getUserById);
router.get("/", protectRouter, admin, getAllUsers);

export default router;
