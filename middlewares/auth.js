import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User/user.models.js";
import Doctor from "../models/User/doctor.models.js";

// Generate token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Protect router for general users (User model)
export const protectRouter = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Không tìm thấy user với token này" });
      }
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
  } else {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
});

// Protect router for doctors (Doctor model)
export const protectRouterForDoctor = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.doctor = await Doctor.findById(decoded.id).select("-password");
      if (!req.doctor) {
        return res
          .status(401)
          .json({ message: "Không tìm thấy bác sĩ với token này" });
      }
      if (req.doctor.role !== "doctor") {
        return res.status(403).json({ message: "Chỉ dành cho bác sĩ" });
      }
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
  } else {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
});

// Admin middleware (User model)
export const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Chỉ dành cho admin" });
  }
});

// Doctor middleware (Doctor model)
export const doctor = asyncHandler(async (req, res, next) => {
  if (req.doctor && req.doctor.role === "doctor") {
    next();
  } else {
    res.status(403).json({ message: "Chỉ dành cho bác sĩ" });
  }
});

// Admin or Doctor middleware
export const restrictToAdminOrDoctor = asyncHandler(async (req, res, next) => {
  if (
    (req.user && ["admin"].includes(req.user.role)) ||
    (req.doctor && req.doctor.role === "doctor")
  ) {
    next();
  } else {
    res.status(403).json({ message: "Yêu cầu quyền admin hoặc bác sĩ" });
  }
});

// Allow only accepted doctors (Doctor model)
export const allowOnlyAcceptedDoctor = asyncHandler(async (req, res, next) => {
  if (req.doctor?.role === "doctor") {
    if (req.doctor.doctorApplicationStatus === "accepted") {
      return next();
    }
    return res.status(403).json({
      message: "Tài khoản bác sĩ chưa được chấp nhận. Vui lòng chờ xét duyệt hoặc đăng ký lại.",
    });
  }
  next();
});

// Allow only pending or rejected doctors (Doctor model)
export const allowOnlyPendingOrRejectedDoctor = asyncHandler(async (req, res, next) => {
  if (req.doctor?.role === "doctor") {
    if (["pending", "rejected"].includes(req.doctor.doctorApplicationStatus)) {
      return next();
    }
    return res.status(403).json({
      message: "Tài khoản bác sĩ đã được chấp nhận. Không thể thực hiện hành động này.",
    });
  }
  next();
});