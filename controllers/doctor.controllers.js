import bcrypt from "bcryptjs";
import Doctor from "../models/User/doctor.models.js";
import { sendEmailDoctorApplication } from "../utils/sendEmailDoctorApplication.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { uploadImage, uploadMultipleImages } from "../config/cloudinary.js";
import { formatDate } from "../utils/dateFormat.js";

// All route handlers updated to use formatDate where appropriate

// Register a new doctor
export const registerDoctor = async (req, res) => {
  try {
    // ... unchanged code
    return res.status(200).json({
      message: "Đăng ký bác sĩ thành công. Vui lòng chờ xét duyệt.",
    });
  } catch (error) {
    console.error("Doctor registration error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Re-register a doctor
export const reRegisterDoctor = async (req, res) => {
  try {
    // ... unchanged code
    return res.status(200).json({
      message: "Đăng ký lại thành công. Vui lòng chờ xét duyệt.",
    });
  } catch (error) {
    console.error("Re-register doctor error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Handle doctor application
export const handleDoctorApplication = async (req, res) => {
  try {
    // ... unchanged code
    res.status(200).json({
      message: `Đã ${status === "accepted" ? "chấp nhận" : "từ chối"} đơn đăng ký bác sĩ`,
      doctorId,
    });
  } catch (error) {
    console.error("Handle doctor application error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Login doctor
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find doctor
    const doctor = await Doctor.findOne({ username });
    if (!doctor) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy tên tài khoản bác sĩ" });
    }

    // Check if email is verified
    if (!doctor.isVerified) {
      return res.status(403).json({
        message: "Email chưa được xác thực. Vui lòng kiểm tra email để xác thực.",
      });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khâu" });
    }
    // Generate token
    const token = generateToken(doctor._id);
    
    res.status(200).json({
      message: "Đăng nhập thành công",
      doctor: {
        id: doctor._id,
        username: doctor.username,
        email: doctor.email,
        fullName: doctor.fullName,
        role: doctor.role,
        doctorType: doctor.doctorType,
        workplace: doctor.workplace,
        token,
        balance: doctor.balance,
        doctorRegisterId: doctor.doctorRegisterId,
        doctorApplicationStatus: doctor.doctorApplicationStatus,
        rejectionMessage: doctor.rejectionMessage || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile
export const getMyProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.doctor._id).select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail");
    if (!doctor) return res.status(404).json({ message: "Bác sĩ không tồn tại." });

    res.status(200).json({
      message: "Lấy thông tin hồ sơ bác sĩ thành công.",
      doctor: {
        ...doctor.toObject(),
        dateOfBirth: doctor.dateOfBirth ? formatDate(doctor.dateOfBirth) : null,
        createdAt: formatDate(doctor.createdAt),
        updatedAt: formatDate(doctor.updatedAt),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -balance");
    if (!doctor) return res.status(404).json({ message: "Bác sĩ không tồn tại" });

    res.status(200).json({
      message: "Lấy thông tin bác sĩ thành công",
      doctor: {
        ...doctor.toObject(),
        dateOfBirth: doctor.dateOfBirth ? formatDate(doctor.dateOfBirth) : null,
        createdAt: formatDate(doctor.createdAt),
        updatedAt: formatDate(doctor.updatedAt),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail").sort({ createdAt: -1 });
    if (!doctors.length) return res.status(201).json({ message: "Không có bác sĩ nào" });

    res.status(200).json({
      message: `Có tổng ${doctors.length} bác sĩ`,
      doctors: doctors.map(d => ({
        ...d.toObject(),
        dateOfBirth: d.dateOfBirth ? formatDate(d.dateOfBirth) : null,
        createdAt: formatDate(d.createdAt),
        updatedAt: formatDate(d.updatedAt),
      })),
      totalDoctors: doctors.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending doctors
export const getPendingDoctor = async (req, res) => {
  try {
    const pendingDoctors = await Doctor.find({ doctorApplicationStatus: "pending" }).sort({ createdAt: -1 });
    if (!pendingDoctors.length) return res.status(201).json({ message: "Không có bác sĩ nào đang chờ xét duyệt" });

    res.status(200).json({
      message: `Có tổng ${pendingDoctors.length} bác sĩ đang chờ xét duyệt`,
      pendingDoctors: pendingDoctors.map(d => ({
        id: d._id,
        username: d.username,
        email: d.email,
        fullName: d.fullName,
        address: d.address,
        phone: d.phone,
        dateOfBirth: d.dateOfBirth ? formatDate(d.dateOfBirth) : null,
        avatar: d.avatar,
        doctorType: d.doctorType,
        workplace: d.workplace,
        certifications: d.certifications,
        doctorRegisterId: d.doctorRegisterId,
        doctorApplicationStatus: d.doctorApplicationStatus,
        rejectionMessage: d.rejectionMessage || null,
        createdAt: formatDate(d.createdAt),
        updatedAt: formatDate(d.updatedAt),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get doctor by register ID
export const getDoctorByRegisterId = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorRegisterId: req.params.doctorId }).select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -balance");
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký bác sĩ với mã này." });

    res.status(200).json({
      message: "Lấy thông tin đăng ký bác sĩ thành công",
      doctorId: doctor._id,
      status: doctor.doctorApplicationStatus,
      rejectionMessage: doctor.rejectionMessage || null,
      submittedAt: formatDate(doctor.createdAt),
      updatedAt: formatDate(doctor.updatedAt),
      fullName: doctor.fullName,
      avatar: doctor.avatar,
      doctorType: doctor.doctorType,
      workplace: doctor.workplace,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
