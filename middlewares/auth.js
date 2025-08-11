import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User/user.models.js";
import Doctor from "../models/User/doctor.models.js";

// Generate token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Protect router
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
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
  } else {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
});

// Protect router for any user type (user, doctor, admin)
export const protectAnyUser = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Thử tìm user thường trước
      req.user = await User.findById(decoded.id).select("-password");
      if (req.user) {
        return next();
      }
      
      // Nếu không phải user thường, thử tìm doctor
      req.doctor = await Doctor.findById(decoded.id).select("-password");
      if (req.doctor) {
        return next();
      }
      
      // Nếu không tìm thấy cả hai, trả lỗi
      return res.status(401).json({ message: "Token không hợp lệ" });
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
      // Check if doctor has role field, if not, set it to "doctor"
      if (!req.doctor.role) {
        req.doctor.role = "doctor";
        await req.doctor.save();
      }
      if (req.doctor.role !== "doctor") {
        return res.status(403).json({ message: "Chỉ dành cho bác sĩ" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
  } else {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
});

// Protect router for admin (User model with admin role)
export const protectRouterForAdmin = asyncHandler(async (req, res, next) => {
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
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Chỉ dành cho admin" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
  } else {
    return res.status(401).json({ message: "Chưa đăng nhập" });
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

// Protect router for doctors specifically
export const protectDoctorRouter = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Import Doctor model dynamically to avoid circular dependency
      const { default: Doctor } = await import("../models/User/doctor.models.js");

      req.doctor = await Doctor.findById(decoded.id).select("-password");
      if (!req.doctor) {
        return res
          .status(401)
          .json({ message: "Không tìm thấy bác sĩ với token này" });
      }

      // Check if doctor is verified
      if (req.doctor.doctorApplicationStatus !== "accepted") {
        return res.status(403).json({
          message: "Tài khoản bác sĩ chưa được xác minh",
        });
      }

      next();
    } catch (error) {
      console.error("Doctor token verification error:", error);
      return res.status(401).json({ message: "Token bác sĩ không hợp lệ" });
    }
  } else {
    return res
      .status(401)
      .json({ message: "Chưa đăng nhập với tài khoản bác sĩ" });
  }
});
