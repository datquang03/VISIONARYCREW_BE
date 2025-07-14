import bcrypt from "bcryptjs";
import Doctor from "../models/User/doctor.models.js";
import { sendEmailDoctorApplication } from "../utils/sendEmailDoctorApplication.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { uploadImage, uploadMultipleImages } from "../config/cloudinary.js";
import { stat } from "fs";

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
    if (
      !username ||
      !email ||
      !phone ||
      !dateOfBirth ||
      !password ||
      !fullName ||
      !address ||
      !doctorType
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc" });
    }

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({
      $or: [{ email }, { phone }, { username }],
    });
    if (existingDoctor) {
      return res.status(400).json({
        message: `Bác sĩ với ${
          existingDoctor.email === email
            ? "email"
            : existingDoctor.phone === phone
            ? "số điện thoại"
            : "tên đăng nhập"
        } đã tồn tại`,
      });
    }

    // Handle avatar upload
    let avatarUrl = null;
    if (req.files && req.files.length > 0) {
      const avatarFile = req.files.find((file) => file.fieldname === "avatar");
      if (avatarFile) {
        try {
          avatarUrl = await uploadImage(avatarFile.buffer, "doctor_avatars");
        } catch (uploadError) {
          console.error("Avatar upload error:", uploadError);
        }
      }
    }

    // Handle certifications and images
    let parsedCertifications = [];
    try {
      parsedCertifications = certifications ? JSON.parse(certifications) : [];
    } catch (parseError) {
      console.error("Certifications JSON parse error:", parseError);
      parsedCertifications = [];
    }

    if (req.files && req.files.length > 0) {
      const certificationFiles = req.files.filter(
        (file) => file.fieldname === "certificationImages"
      );
      if (certificationFiles.length > 0) {
        try {
          const certUrls = await uploadMultipleImages(
            certificationFiles.map((file) => file.buffer),
            "doctor_certifications"
          );
          parsedCertifications = parsedCertifications.map((cert, index) => ({
            ...cert,
            url: certUrls[index] || cert.url,
            uploadedAt: cert.uploadedAt || new Date(),
          }));
        } catch (uploadError) {
          console.error("Certification images upload error:", uploadError);
        }
      }
    }

    // Parse other array fields safely
    let parsedEducation = [];
    let parsedWorkExperience = [];

    try {
      parsedEducation = education ? JSON.parse(education) : [];
    } catch (parseError) {
      console.error("Education JSON parse error:", parseError);
      parsedEducation = [];
    }

    try {
      parsedWorkExperience = workExperience ? JSON.parse(workExperience) : [];
    } catch (parseError) {
      console.error("Work experience JSON parse error:", parseError);
      parsedWorkExperience = [];
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate doctorRegisterId
    const doctorRegisterId = new mongoose.Types.ObjectId().toString();

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
      doctorRegisterId,
      avatar: avatarUrl,
    });

    // Save doctor
    await doctor.save();

    // Send application email
    try {
      await sendEmailDoctorApplication(doctor, "pending");
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    res.status(200).json({
      message: "Đăng ký bác sĩ thành công. Vui lòng chờ xét duyệt đơn đăng ký.",
    });
  } catch (error) {
    console.error("Doctor registration error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const handleDoctorApplication = async (req, res) => {
  try {
    const { doctorId, status, rejectionMessage } = req.body; 

    // Validate input
    if (!doctorId || !status) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp doctorId và status" });
    }

    if (status === "rejected" && !rejectionMessage) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp rejectionMessage khi từ chối" });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status phải là 'accepted' hoặc 'rejected'" });
    }

    // Find doctor by _id
    const doctor = await Doctor.findById(doctorId); // Changed to findById
    if (!doctor) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy bác sĩ với doctorId này" });
    }

    // Check application status
    if (doctor.doctorApplicationStatus !== "pending") {
      return res
        .status(400)
        .json({
          message: `Đơn đăng ký bác sĩ đang ở trạng thái: ${doctor.doctorApplicationStatus}`,
        });
    }

    // Update doctor status
    doctor.doctorApplicationStatus = status;
    if (status === "accepted") {
      doctor.isVerified = true;
      doctor.rejectionMessage = null;
    } else {
      doctor.isVerified = false;
      doctor.rejectionMessage = rejectionMessage;
    }
    await doctor.save();

    // Send email notification
    try {
      await sendEmailDoctorApplication(doctor, status, rejectionMessage);
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

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
    const doctor = await Doctor.findOne({ username });
    if (!doctor) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy tên tài khoản bác sĩ" });
    }
    if (doctor.doctorApplicationStatus !== "accepted") {
      return res.status(403).json({
        message: `Đăng nhập thất bại. Đơn đăng ký bác sĩ đang ở trạng thái: ${doctor.doctorApplicationStatus}`,
        rejectionMessage: doctor.rejectionMessage || null,
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
        doctorRegisterId: doctor.doctorRegisterId,
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
    const doctor = await Doctor.findById(doctorId).select(
      "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail"
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
        status: doctor.status,
        likedBlogs: doctor.likedBlogs,
        conversations: doctor.conversations,
        isVerified: doctor.isVerified,
        doctorApplicationStatus: doctor.doctorApplicationStatus,
        rejectionMessage: doctor.rejectionMessage,
        doctorRegisterId: doctor.doctorRegisterId,
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
      return res
        .status(400)
        .json({ message: "ID bác sĩ không hợp lệ, phải là ObjectId hợp lệ." });
    }
    const doctor = await Doctor.findById(doctorId).select(
      "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -balance"
    );
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại" });
    }
    res.status(200).json({
      message: "Lấy thông tin bác sĩ thành công",
      doctor: {
        ...doctor.toObject(),
        doctorRegisterId: doctor.doctorRegisterId,
      },
    });
  } catch (error) {
    console.error("Get doctor by ID error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const doctors = await Doctor.find()
      .select(
        "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail"
      )
      .sort({ createdAt: -1 });
    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "Không có bác sĩ nào" });
    }
    res.status(200).json({
      message: `Có tổng ${doctors.length} bác sĩ`,
      doctors: doctors.map((doctor) => ({
        ...doctor.toObject(),
        doctorRegisterId: doctor.doctorRegisterId,
      })),
      totalDoctors,
    });
  } catch (error) {
    console.error("Get all doctors error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get pending doctors (returns only doctorRegisterId)
export const getPendingDoctor = async (req, res) => {
  try {
    const pendingDoctors = await Doctor.find({
      doctorApplicationStatus: "pending",
    })
      .sort({ createdAt: -1 });

    if (!pendingDoctors || pendingDoctors.length === 0) {
      return res
        .status(404)
        .json({ message: "Không có bác sĩ nào đang chờ xét duyệt" });
    }

    res.status(200).json({
      message: `Có tổng ${pendingDoctors.length} bác sĩ đang chờ xét duyệt`,
      pendingDoctors : pendingDoctors.map((doctor) => {
        return {
          id: doctor._id,
          username: doctor.username,
          email: doctor.email,
          fullName: doctor.fullName,
          address: doctor.address,
          phone: doctor.phone,
          dateOfBirth: doctor.dateOfBirth,
          avatar: doctor.avatar,
          doctorType: doctor.doctorType,
          workplace: doctor.workplace,
          certifications: doctor.certifications,
          doctorRegisterId: doctor.doctorRegisterId,
          doctorApplicationStatus: doctor.doctorApplicationStatus,
          rejectionMessage: doctor.rejectionMessage || null,
          createdAt: doctor.createdAt,
          updatedAt: doctor.updatedAt,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
