import express from "express";
import {
  registerDoctor,
  reRegisterDoctor,
  login,
  getAllDoctors,
  getMyProfile,
  getDoctorById,
  getDoctorByRegisterId,
  getPendingDoctor,
  handleDoctorApplication,
  getMySubscription,
  checkScheduleAvailability,
  incrementScheduleUsage,
  getAllDoctorsWithPriority,
  deleteDoctorByRegisterId,
} from "../controllers/doctor.controllers.js";
import { 
  admin, 
  allowOnlyAcceptedDoctor, 
  allowOnlyPendingOrRejectedDoctor, 
  protectRouter, 
  protectRouterForDoctor,
  protectDoctorRouter 
} from "../middlewares/auth.js";
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

// Authentication routes
router.post("/login", login);
router.get("/pending", getPendingDoctor);

// Doctor registration routes
router.get("/", getAllDoctors);
router.get("/pending",getPendingDoctor);
router.post("/register", uploadAny, handleMulterError, registerDoctor);
router.post("/reregister", protectRouterForDoctor, allowOnlyPendingOrRejectedDoctor, uploadAny, handleMulterError, reRegisterDoctor);

// Doctor profile routes
router.delete("/:doctorRegisterId", protectRouterForDoctor, deleteDoctorByRegisterId);
router.get("/profile", protectRouterForDoctor, allowOnlyAcceptedDoctor, getMyProfile);
router.get("/register/:doctorRegisterId", protectRouterForDoctor, allowOnlyPendingOrRejectedDoctor, getDoctorByRegisterId);
router.get("/:id", protectRouterForDoctor, getDoctorById);

// Doctor list and management routes
router.patch("/handle", protectRouter, admin, handleDoctorApplication);

// Subscription and package related routes
router.get("/subscription/my", protectDoctorRouter, getMySubscription);
router.get("/subscription/check", protectDoctorRouter, checkScheduleAvailability);
router.post("/subscription/increment", protectDoctorRouter, incrementScheduleUsage);

// Updated route for prioritized doctor listing
router.get("/list/priority", getAllDoctorsWithPriority);

export default router;
