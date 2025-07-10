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

// Configure multer with file filter for image validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".svg", ".png", ".jpg", ".jpeg"];
  const extname = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(extname)) {
    cb(null, true);
  } else {
    cb(new Error("Ảnh phải có định dạng SVG, PNG, JPG hoặc JPEG"), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter,
});

// Define fields for multiple file uploads
const uploadFields = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "certificationImages", maxCount: 10 },
]);

const router = express.Router();

router.post("/register", uploadFields, registerDoctor);
router.post("/login", login);
router.get("/profile", protectRouter, getMyProfile);
router.get("/:id", getDoctorById);
router.get("/", protectRouter, admin, getAllDoctors);

export default router;