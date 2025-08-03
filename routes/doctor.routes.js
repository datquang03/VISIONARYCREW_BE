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
  // deleteDoctorByRegisterId,
  updateProfile,
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

// ===== PUBLIC ROUTES =====
router.post("/login", login);
router.get("/", getAllDoctors);
router.get("/list/priority", getAllDoctorsWithPriority);
router.post("/register", uploadAny, handleMulterError, registerDoctor);

// ===== ADMIN ROUTES =====
router.get("/pending",protectRouter,admin, getPendingDoctor); // public getPendingDoctor (if needed, move to admin below)
router.patch("/handle", protectRouter, admin, handleDoctorApplication);
// ===== DOCTOR AUTHENTICATED ROUTES (any doctor, any status) =====
router.get("/register", protectRouterForDoctor, getDoctorByRegisterId);
// ===== ACCEPTED DOCTOR ROUTES =====
router.get("/profile", protectRouterForDoctor, getMyProfile);
router.put("/profile", protectRouterForDoctor, allowOnlyAcceptedDoctor, uploadAny, handleMulterError, updateProfile);
// ===== DOCTOR AUTHENTICATED ROUTES (any doctor, any status) tiếp =====
router.get("/:id", protectRouter, getDoctorById);
// router.delete("/:doctorRegisterId", protectRouterForDoctor, deleteDoctorByRegisterId);

// ===== PENDING OR REJECTED DOCTOR ROUTES =====
router.post("/reregister", protectRouterForDoctor, uploadAny, handleMulterError, reRegisterDoctor);

// ===== DOCTOR SUBSCRIPTION (require doctor, any status) =====
router.get("/subscription/my", protectDoctorRouter, getMySubscription);
router.get("/subscription/check", protectDoctorRouter, checkScheduleAvailability);
router.post("/subscription/increment", protectDoctorRouter, incrementScheduleUsage);


export default router;
