import bcrypt from "bcryptjs";
import Doctor from "../models/User/doctor.models.js";
import { sendEmailDoctorApplication } from "../utils/sendEmailDoctorApplication.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { uploadImage, uploadMultipleImages } from "../config/cloudinary.js";
// Register a new doctor with avatar and certification images
export const registerDoctor = async (req, res) => {
  try {
    const {
      username,
      email,
      phone,
      dateOfBirth,
      password,
      fullName,
      address,
      doctorType,
      certifications,
      education,
      workExperience,
      workplace,
      description,
    } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !dateOfBirth || !password || !fullName || !address || !doctorType) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc" });
    }

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ $or: [{ email }, { phone }, { username }] });
    if (existingDoctor) {
      return res.status(400).json({
        message: `Bác sĩ với ${
          existingDoctor.email === email ? "email" : existingDoctor.phone === phone ? "số điện thoại" : "tên đăng nhập"
        } đã tồn tại`,
      });
    }

    // Handle avatar upload
    let avatarUrl = null;
    if (req.files.avatar && req.files.avatar[0]) {
      avatarUrl = await uploadImage(req.files.avatar[0].path, "doctor_avatars");
    }

    // Handle certifications and images
    let parsedCertifications = certifications ? JSON.parse(certifications) : [];
    if (req.files.certificationImages) {
      const certUrls = await uploadMultipleImages(req.files.certificationImages, "doctor_certifications");
      parsedCertifications = parsedCertifications.map((cert, index) => ({
        ...cert,
        url: certUrls[index] || cert.url,
        uploadedAt: cert.uploadedAt || new Date(),
      }));
    }

    // Parse other array fields
    const parsedEducation = education ? JSON.parse(education) : [];
    const parsedWorkExperience = workExperience ? JSON.parse(workExperience) : [];

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new doctor
    const doctor = new Doctor({
      username,
      email,
      phone,
      dateOfBirth,
      password: hashedPassword,
      fullName,
      address,
      doctorType,
      certifications: parsedCertifications,
      education: parsedEducation,
      workExperience: parsedWorkExperience,
      workplace: workplace || null,
      description: description || null,
      role: "doctor",
      isVerified: false,
      doctorApplicationStatus: "pending",
      avatar: avatarUrl,
    });

    // Save doctor
    await doctor.save();

    // Send application email
    await sendEmailDoctorApplication(doctor);

    res.status(200).json({ message: "Đăng ký bác sĩ thành công. Vui lòng chờ xét duyệt đơn đăng ký." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login doctor
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const doctor = await Doctor.findOne({ username });
    if (!doctor) {
      return res.status(400).json({ message: "Không tìm thấy tên tài khoản bác sĩ" });
    }
    if (doctor.doctorApplicationStatus !== "accepted") {
      return res.status(403).json({
        message: `Đăng nhập thất bại. Đơn đăng ký bác sĩ đang ở trạng thái: ${doctor.doctorApplicationStatus}`,
      });
    }
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }
    const token = generateToken(doctor._id);
    res.status(200).json({
      message: "Đăng nhập thành công",
      doctor: {
        id: doctor._id,
        username,
        email: doctor.email,
        fullName: doctor.fullName,
        role: doctor.role,
        doctorType: doctor.doctorType,
        workplace: doctor.workplace,
        token,
        balance: doctor.balance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile of logged-in doctor
export const getMyProfile = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "ID bác sĩ không hợp lệ." });
    }
    const doctor = await Doctor.findById(doctorId).select(
      "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
    );
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại." });
    }
    res.status(200).json({
      message: "Lấy thông tin hồ sơ bác sĩ thành công.",
      doctor: {
        id: doctor._id,
        username: doctor.username,
        email: doctor.email,
        phone: doctor.phone,
        dateOfBirth: doctor.dateOfBirth,
        fullName: doctor.fullName,
        address: doctor.address,
        doctorType: doctor.doctorType,
        certifications: doctor.certifications,
        education: doctor.education,
        workExperience: doctor.workExperience,
        workplace: doctor.workplace,
        description: doctor.description,
        role: doctor.role,
        balance: doctor.balance,
        avatar: doctor.avatar,
        likedBlogs: doctor.likedBlogs,
        savedBlogs: doctor.savedBlogs,
        isVerified: doctor.isVerified,
        doctorApplicationStatus: doctor.doctorApplicationStatus,
        rejectionMessage: doctor.rejectionMessage,
        conversations: doctor.conversations,
        createdAt: doctor.createdAt,
        updatedAt: doctor.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctorId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "ID bác sĩ không hợp lệ." });
    }
    const doctor = await Doctor.findById(doctorId).select(
      "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires -balance"
    );
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại" });
    }
    res.status(200).json({ message: "Lấy thông tin bác sĩ thành công", doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const doctors = await Doctor.find()
      .select(
        "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
      )
      .sort({ createdAt: -1 });
    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "Không có bác sĩ nào" });
    }
    res.status(200).json({
      message: `Có tổng ${doctors.length} bác sĩ`,
      doctors,
      totalDoctors,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};