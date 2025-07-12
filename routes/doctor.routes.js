import express from "express";
import {
  registerDoctor,
  login,
  getAllDoctors,
  getMyProfile,
  getDoctorById,
} from "../controllers/doctor.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";
import multer from "multer";
import path from "path";

// Configure multer with memory storage (không cần thư mục uploads)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".svg", ".png", ".jpg", ".jpeg"];
  const extname = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(extname)) {
    cb(null, true);
  } else {
    cb(new Error("Ảnh phải có định dạng SVG, PNG, JPG hoặc JPEG"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Sử dụng upload.any() để chấp nhận bất kỳ field nào
const uploadAny = upload.any();

const router = express.Router();

router.post("/register", uploadAny, registerDoctor);
router.post("/login", login);
router.get("/profile", protectRouter, getMyProfile);
router.get("/:id", getDoctorById);
router.get("/", protectRouter, admin, getAllDoctors);

export default router;