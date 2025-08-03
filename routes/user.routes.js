import express from "express";
import {
  register,
  verifyEmailCode,
  login,
  getMyProfile,
  getUserById,
  getUserProfileById,
  getAllUsers,
  updateUserProfile,
  deleteUserAccount,
  rechargeBalance,
  getBalance,
  getMyTransactions
} from "../controllers/user.controllers.js";
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

router.post("/register", register);
router.post("/verify-email", verifyEmailCode);
router.post("/login", login);
router.get("/profile/:id", protectRouter, getUserProfileById);
router.get("/profile", protectRouter, getMyProfile);
router.put("/profile", protectRouter, uploadAny, handleMulterError, updateUserProfile);
router.get("/:id", getUserById);
router.get("/", getAllUsers);
router.delete("/account", protectRouter, admin, deleteUserAccount);


// Payment related routes
router.post("/recharge", protectRouter, rechargeBalance);
router.get("/balance", protectRouter, getBalance);
router.get("/transactions", protectRouter, getMyTransactions);

export default router;
