import bcrypt from "bcryptjs";
import Doctor from "../models/User/doctor.models.js";
import { sendEmailDoctorApplication } from "../utils/sendEmailDoctorApplication.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { uploadImage, uploadMultipleImages } from "../config/cloudinary.js";
import { formatDate } from "../utils/dateFormat.js";

// Register a new doctor
export const registerDoctor = async (req, res) => {
  try {
    const {
      username, email, phone, dateOfBirth, password,
      fullName, address, doctorType,
      certifications, education, workExperience,
      workplace, description,
    } = req.body;

    if (!username || !email || !phone || !dateOfBirth || !password || !fullName || !address || !doctorType) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc" });
    }

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

    let avatarUrl = null;
    if (req.files?.length > 0) {
      const avatarFile = req.files.find((file) => file.fieldname === "avatar");
      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile.buffer, "doctor_avatars");
      }
    }

    let parsedCertifications = [];
    try {
      parsedCertifications = certifications ? JSON.parse(certifications) : [];
    } catch (e) { console.error("Certification parse error", e); }

    const certFiles = req.files?.filter(f => f.fieldname === "certificationImages") || [];
    if (certFiles.length > 0) {
      const urls = await uploadMultipleImages(certFiles.map(f => f.buffer), "doctor_certifications");
      parsedCertifications = parsedCertifications.map((cert, idx) => ({
        ...cert,
        url: urls[idx] || cert.url,
        uploadedAt: cert.uploadedAt || new Date(),
      }));
    }

    let parsedEducation = [];
    let parsedWorkExperience = [];
    try { parsedEducation = education ? JSON.parse(education) : []; } catch (e) {}
    try { parsedWorkExperience = workExperience ? JSON.parse(workExperience) : []; } catch (e) {}

    const hashedPassword = await bcrypt.hash(password, 10);
    const doctorRegisterId = new mongoose.Types.ObjectId().toString();

    const doctor = new Doctor({
      username, email, phone, dateOfBirth, password: hashedPassword,
      fullName, address, doctorType,
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

    await doctor.save();
    await sendEmailDoctorApplication(doctor, "pending");
    return res.status(200).json({ message: "Đăng ký bác sĩ thành công. Vui lòng chờ xét duyệt." });

  } catch (error) {
    console.error("Doctor registration error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Re-register a doctor
export const reRegisterDoctor = async (req, res) => {
  try {
    const {
      doctorId, fullName, address, doctorType,
      certifications, education, workExperience,
      workplace, description,
    } = req.body;

    if (!doctorId || !fullName || !address || !doctorType) {
      return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin bắt buộc để đăng ký lại." });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });

    if (doctor.doctorApplicationStatus !== 'rejected') {
      return res.status(400).json({
        message: `Chỉ những bác sĩ bị từ chối mới có thể đăng ký lại. Trạng thái hiện tại: ${doctor.doctorApplicationStatus}`,
      });
    }

    if (req.files?.length > 0) {
      const avatarFile = req.files.find((file) => file.fieldname === "avatar");
      if (avatarFile) doctor.avatar = await uploadImage(avatarFile.buffer, "doctor_avatars");
    }

    let parsedCertifications = [];
    try {
      parsedCertifications = certifications ? JSON.parse(certifications) : [];
    } catch (e) {}

    const certFiles = req.files?.filter(f => f.fieldname === "certificationImages") || [];
    if (certFiles.length > 0) {
      const urls = await uploadMultipleImages(certFiles.map(f => f.buffer), "doctor_certifications");
      parsedCertifications = parsedCertifications.map((cert, idx) => ({
        ...cert,
        url: urls[idx] || cert.url,
        uploadedAt: cert.uploadedAt || new Date(),
      }));
    }

    let parsedEducation = [];
    let parsedWorkExperience = [];
    try { parsedEducation = education ? JSON.parse(education) : []; } catch (e) {}
    try { parsedWorkExperience = workExperience ? JSON.parse(workExperience) : []; } catch (e) {}

    doctor.fullName = fullName;
    doctor.address = address;
    doctor.doctorType = doctorType;
    doctor.certifications = parsedCertifications;
    doctor.education = parsedEducation;
    doctor.workExperience = parsedWorkExperience;
    doctor.workplace = workplace || null;
    doctor.description = description || null;
    doctor.doctorApplicationStatus = "pending";
    doctor.rejectionMessage = null;
    doctor.isVerified = false;

    await doctor.save();
    await sendEmailDoctorApplication(doctor, "pending");

    return res.status(200).json({ message: "Đăng ký lại thành công. Vui lòng chờ xét duyệt." });
  } catch (error) {
    console.error("Re-register doctor error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Accept / Reject
export const handleDoctorApplication = async (req, res) => {
  try {
    const { doctorId, status, rejectionMessage } = req.body;

    if (!doctorId || !status) return res.status(400).json({ message: "Thiếu thông tin yêu cầu." });
    if (status === "rejected" && !rejectionMessage) return res.status(400).json({ message: "Cần rejectionMessage khi từ chối." });
    if (!["accepted", "rejected"].includes(status)) return res.status(400).json({ message: "Status phải là 'accepted' hoặc 'rejected'" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });
    if (doctor.doctorApplicationStatus !== "pending") {
      return res.status(400).json({ message: `Trạng thái hiện tại: ${doctor.doctorApplicationStatus}` });
    }

    doctor.doctorApplicationStatus = status;
    doctor.isVerified = status === "accepted";
    doctor.rejectionMessage = status === "rejected" ? rejectionMessage : null;

    await doctor.save();
    await sendEmailDoctorApplication(doctor, status, rejectionMessage);

    return res.status(200).json({ message: `Đã ${status === "accepted" ? "chấp nhận" : "từ chối"} đơn đăng ký bác sĩ.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const doctor = await Doctor.findOne({ username });
    if (!doctor) return res.status(400).json({ message: "Tài khoản không tồn tại." });

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu." });

    const token = generateToken(doctor._id);

    return res.status(200).json({
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

// Get my profile
export const getMyProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.doctor._id).select("-password -resetPasswordCode -verifyToken -tempEmail");
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });

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

// Get all
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: `Tổng cộng ${doctors.length} bác sĩ`,
      doctors: doctors.map((d) => ({
        ...d.toObject(),
        dateOfBirth: d.dateOfBirth ? formatDate(d.dateOfBirth) : null,
        createdAt: formatDate(d.createdAt),
        updatedAt: formatDate(d.updatedAt),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get by register ID
export const getDoctorByRegisterId = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorRegisterId: req.params.doctorId });
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy đơn đăng ký bác sĩ với mã này." });

    res.status(200).json({
      message: "Lấy thông tin thành công",
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

// Get pending
export const getPendingDoctor = async (req, res) => {
  try {
    const doctors = await Doctor.find({ doctorApplicationStatus: "pending" });
    res.status(200).json({
      message: `Có tổng ${doctors.length} bác sĩ đang chờ xét duyệt`,
      pendingDoctors: doctors.map((d) => ({
        id: d._id,
        fullName: d.fullName,
        avatar: d.avatar,
        doctorType: d.doctorType,
        phone: d.phone,
        dateOfBirth: d.dateOfBirth ? formatDate(d.dateOfBirth) : null,
        workplace: d.workplace,
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

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select(
      "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail"
    );

    if (!doctor) {
      return res.status(404).json({ message: "Không tìm thấy bác sĩ." });
    }

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
