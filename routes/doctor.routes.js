import express from "express";
import {
  registerDoctor,
  login,
  getAllDoctors,
  getMyProfile,
  getDoctorById,
  getPendingDoctor,
  handleDoctorApplication, // Updated import
} from "../controllers/doctor.controllers.js";
import { admin, protectRouter } from "../middlewares/auth.js";
import multer from "multer";
import path from "path";

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
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Kích thước file vượt quá 5MB" });
    }
    return res.status(400).json({ message: `Lỗi tải file: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

const uploadAny = upload.any();

const router = express.Router();

router.post("/register", uploadAny, handleMulterError, registerDoctor);

router.post("/login", login);

router.get("/profile", protectRouter, getMyProfile);

router.get("/pending", protectRouter, admin, getPendingDoctor);
router.get("/:id", getDoctorById);

router.get("/", protectRouter, admin, getAllDoctors);

router.post("/handle", protectRouter, admin, handleDoctorApplication);

export default router;