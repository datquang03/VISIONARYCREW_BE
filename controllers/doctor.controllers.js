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
      certifications, education, workExperience,description,
      recentJob,
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

    // Parse education
    let parsedEducation = [];
    if (Array.isArray(education)) {
      parsedEducation = education;
    } else if (typeof education === "string") {
      try {
        parsedEducation = JSON.parse(education);
      } catch (e) {
        parsedEducation = [];
      }
    }
    // Parse workExperience
    let parsedWorkExperience = [];
    if (Array.isArray(workExperience)) {
      parsedWorkExperience = workExperience;
    } else if (typeof workExperience === "string") {
      try {
        parsedWorkExperience = JSON.parse(workExperience);
      } catch (e) {
        parsedWorkExperience = [];
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = new Doctor({
      username, email, phone, dateOfBirth, password: hashedPassword,
      fullName, address, doctorType,
      certifications: parsedCertifications,
      education: parsedEducation,
      workExperience: parsedWorkExperience,
      description: description || null,
      recentJob: recentJob || null,
      role: "doctor",
      isVerified: false,
      doctorApplicationStatus: "pending",
      avatar: avatarUrl,
    });

    await doctor.save();
    
    try {
      await sendEmailDoctorApplication(doctor, "pending");
    } catch (emailError) {
      console.error('Doctor application email error:', emailError.message);
      // Không throw error để doctor vẫn có thể đăng ký thành công
      // Chỉ log lỗi để debug
    }
    
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
      description,
      recentJob,
    } = req.body;

    if (!doctorId || !fullName || !address || !doctorType) {
      return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin bắt buộc để đăng ký lại." });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });

    if (!['pending', 'rejected'].includes(doctor.doctorApplicationStatus)) {
      return res.status(400).json({
        message: `Chỉ những bác sĩ đang chờ duyệt hoặc bị từ chối mới có thể đăng ký lại. Trạng thái hiện tại: ${doctor.doctorApplicationStatus}`,
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

    // Parse education
    let parsedEducation = [];
    if (Array.isArray(education)) {
      parsedEducation = education;
    } else if (typeof education === "string") {
      try {
        parsedEducation = JSON.parse(education);
      } catch (e) {
        parsedEducation = [];
      }
    }
    // Parse workExperience
    let parsedWorkExperience = [];
    if (Array.isArray(workExperience)) {
      parsedWorkExperience = workExperience;
    } else if (typeof workExperience === "string") {
      try {
        parsedWorkExperience = JSON.parse(workExperience);
      } catch (e) {
        parsedWorkExperience = [];
      }
    }

    doctor.fullName = fullName;
    doctor.address = address;
    doctor.doctorType = doctorType;
    doctor.certifications = parsedCertifications;
    doctor.education = parsedEducation;
    doctor.workExperience = parsedWorkExperience;
    doctor.description = description || null;
    doctor.recentJob = recentJob || null;
    doctor.doctorApplicationStatus = "pending";
    doctor.rejectionMessage = null;
    doctor.isVerified = false;

    await doctor.save();
    
    try {
      await sendEmailDoctorApplication(doctor, "pending");
    } catch (emailError) {
      console.error('Doctor re-registration email error:', emailError.message);
      // Không throw error để doctor vẫn có thể đăng ký lại thành công
      // Chỉ log lỗi để debug
    }
    
    return res.status(200).json({ message: "Đăng ký lại bác sĩ thành công. Vui lòng chờ xét duyệt." });
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
    
    try {
      await sendEmailDoctorApplication(doctor, status, rejectionMessage);
    } catch (emailError) {
      console.error('Doctor application status email error:', emailError.message);
      // Không throw error để admin vẫn có thể xử lý đơn đăng ký thành công
      // Chỉ log lỗi để debug
    }

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
        workplace: null,
        token,
        balance: doctor.balance,
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
    if (!req.doctor || !req.doctor._id) {
      return res.status(401).json({ message: "Không tìm thấy thông tin bác sĩ" });
    }
    
    const doctor = await Doctor.findById(req.doctor._id).select("-password");
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });

    // Lấy thông tin subscription nếu có
    let subscription = null;
    try {
      if (doctor.subscriptionPackage) {
        const now = new Date();
        let isExpired = false;
        if (doctor.subscriptionEndDate && doctor.subscriptionEndDate < now) {
          isExpired = true;
        }
        subscription = {
          packageType: doctor.subscriptionPackage,
          startDate: doctor.subscriptionStartDate,
          endDate: doctor.subscriptionEndDate,
          isExpired,
          daysRemaining: doctor.subscriptionEndDate 
            ? Math.max(0, Math.ceil((doctor.subscriptionEndDate - now) / (1000 * 60 * 60 * 24)))
            : 0,
          scheduleLimits: doctor.scheduleLimits,
          isPriority: doctor.isPriority,
        };
      }
    } catch (error) {
      console.error('Error processing subscription:', error);
      subscription = null;
    }

    const responseData = {
      id: doctor._id || doctor.id,
      username: doctor.username || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      dateOfBirth: doctor.dateOfBirth || null,
      fullName: doctor.fullName || '',
      address: doctor.address || '',
      doctorType: doctor.doctorType || '',
      certifications: Array.isArray(doctor.certifications) ? doctor.certifications : [],
      education: Array.isArray(doctor.education) ? doctor.education : [],
      workExperience: Array.isArray(doctor.workExperience) ? doctor.workExperience : [],
      description: doctor.description || '',
      avatar: doctor.avatar || '',
      status: doctor.doctorApplicationStatus || 'pending',
      rejectionMessage: doctor.rejectionMessage || null,
      recentJob: doctor.recentJob || '',
      subscription,
    };

    // Safely format dates
    try {
      responseData.submittedAt = doctor.createdAt ? formatDate(doctor.createdAt) : null;
    } catch (error) {
      console.error('Error formatting createdAt:', error);
      responseData.submittedAt = null;
    }

    try {
      responseData.updatedAt = doctor.updatedAt ? formatDate(doctor.updatedAt) : null;
    } catch (error) {
      console.error('Error formatting updatedAt:', error);
      responseData.updatedAt = null;
    }

    res.status(200).json({
      message: "Lấy thông tin bác sĩ thành công",
      doctor: responseData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// update profile
export const updateProfile = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    const {
      fullName,
      address,
      phone,
      dateOfBirth,
      doctorType,
      description,
      certifications,
      education,
      workExperience,
      recentJob,
    } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });

    // Update avatar if provided
    if (req.files?.length > 0) {
      const avatarFile = req.files.find((file) => file.fieldname === "avatar");
      if (avatarFile) {
        doctor.avatar = await uploadImage(avatarFile.buffer, "doctor_avatars");
      }
    }

    // Handle certifications - preserve existing ones and add new ones
    let existingCertifications = doctor.certifications || [];
    
    // If new certification is being uploaded
    if (req.files?.length > 0) {
      const certFiles = req.files?.filter((f) => f.fieldname === "certification") || [];
      if (certFiles.length > 0) {
        try {
          const urls = await uploadMultipleImages(certFiles.map(f => f.buffer), "doctor_certifications");
          const newCertifications = certFiles.map((file, idx) => {
            // Get description for this specific certification
            let certDescription = `Chứng chỉ ${idx + 1}`;
            if (req.body.description && typeof req.body.description === 'string') {
              certDescription = req.body.description;
            } else if (req.body[`description_${idx}`] && typeof req.body[`description_${idx}`] === 'string') {
              certDescription = req.body[`description_${idx}`];
            }
            
            return {
              description: certDescription,
              url: urls[idx],
              uploadedAt: new Date(),
            };
          });
          existingCertifications = [...existingCertifications, ...newCertifications];
        } catch (uploadError) {
          return res.status(500).json({ message: "Lỗi khi tải lên chứng chỉ: " + uploadError.message });
        }
      }
    }

    // If certifications are being updated via JSON
    if (certifications) {
      try {
        let parsedCertifications;
        if (typeof certifications === 'string') {
          parsedCertifications = JSON.parse(certifications);
        } else if (Array.isArray(certifications)) {
          parsedCertifications = certifications;
        }
        
        if (Array.isArray(parsedCertifications)) {
          existingCertifications = parsedCertifications;
        }
      } catch (e) {
        console.error("Certification parse error", e);
      }
    }

    // Parse education and work experience
    let parsedEducation = [];
    let parsedWorkExperience = [];
    try { 
      if (education) {
        if (typeof education === 'string') {
          parsedEducation = JSON.parse(education);
        } else if (Array.isArray(education)) {
          parsedEducation = education;
        }
      }
    } catch (e) {
      parsedEducation = [];
    }
    try { 
      if (workExperience) {
        if (typeof workExperience === 'string') {
          parsedWorkExperience = JSON.parse(workExperience);
        } else if (Array.isArray(workExperience)) {
          parsedWorkExperience = workExperience;
        }
      }
    } catch (e) {
      parsedWorkExperience = [];
    }

    // Update fields - only if they are provided and not arrays
    if (fullName && typeof fullName === 'string') doctor.fullName = fullName;
    if (address && typeof address === 'string') doctor.address = address;
    if (phone && typeof phone === 'string') doctor.phone = phone;
    if (dateOfBirth) doctor.dateOfBirth = dateOfBirth;
    if (doctorType && typeof doctorType === 'string') doctor.doctorType = doctorType;
    if (description && typeof description === 'string' && !Array.isArray(description)) {
      doctor.description = description;
    }
    if (recentJob && typeof recentJob === 'string') doctor.recentJob = recentJob;
    
    // Update arrays only if they are provided
    if (Array.isArray(parsedEducation)) doctor.education = parsedEducation;
    if (Array.isArray(parsedWorkExperience)) doctor.workExperience = parsedWorkExperience;
    doctor.certifications = existingCertifications;

    try {
      await doctor.save();
    } catch (saveError) {
      return res.status(500).json({ message: "Lỗi khi lưu thông tin: " + saveError.message });
    }

    res.status(200).json({
      message: "Cập nhật thông tin cá nhân thành công",
      doctor: {
        ...doctor.toObject(),
        dateOfBirth: doctor.dateOfBirth ? formatDate(doctor.dateOfBirth) : null,
        updatedAt: formatDate(doctor.updatedAt),
      },
    });
  } catch (error) {
    console.error("Update doctor profile error:", error);
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
    // Lấy doctor theo _id của người đang đăng nhập
    const doctor = await Doctor.findById(req.doctor._id);
    if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ." });

    res.status(200).json({
      message: "Lấy thông tin thành công",
      doctor: {
        doctorId: doctor._id,
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
        description: doctor.description,
        avatar: doctor.avatar,
        status: doctor.doctorApplicationStatus,
        rejectionMessage: doctor.rejectionMessage || null,
        submittedAt: formatDate(doctor.createdAt),
        updatedAt: formatDate(doctor.updatedAt),
        recentJob: doctor.recentJob,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// delete doctor by register ID - DISABLED
// export const deleteDoctorByRegisterId = async (req, res) => {
//   try {
//     const { doctorRegisterId } = req.params;
//     const doctor = await Doctor.findOneAndDelete({ doctorRegisterId });

//     if (!doctor) return res.status(404).json({ message: "Không tìm thấy bác sĩ với ID đăng ký này." });

//     res.status(200).json({ message: "Đã xóa bác sĩ thành công." });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


// Get pending
export const getPendingDoctor = async (req, res) => {
  try {
    const doctors = await Doctor.find({ doctorApplicationStatus: "pending" });
    res.status(200).json({
      message: `Có tổng ${doctors.length} bác sĩ đang chờ xét duyệt`,
      pendingDoctors: doctors.map((doctor) => ({
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
        description: doctor.description,
        avatar: doctor.avatar,
        status: doctor.doctorApplicationStatus,
        rejectionMessage: doctor.rejectionMessage || null,
        submittedAt: formatDate(doctor.createdAt),
        updatedAt: formatDate(doctor.updatedAt),
        recentJob: doctor.recentJob,
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
        recentJob: doctor.recentJob,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get doctor's current subscription info
export const getMySubscription = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const doctor = await Doctor.findById(doctorId).select(
      "subscriptionPackage subscriptionStartDate subscriptionEndDate scheduleLimits isPriority"
    );
    
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại." });
    }

    // Check if subscription has expired
    const now = new Date();
    let isExpired = false;
    if (doctor.subscriptionEndDate && doctor.subscriptionEndDate < now) {
      isExpired = true;
      // Reset to free package if expired
      doctor.subscriptionPackage = "free";
      doctor.scheduleLimits.weekly = 0;
      doctor.scheduleLimits.used = 0;
      doctor.isPriority = false;
      await doctor.save();
    }

    // Check if weekly limit needs reset (every Monday)
    if (doctor.scheduleLimits.resetDate && doctor.scheduleLimits.resetDate < now) {
      doctor.scheduleLimits.used = 0;
      doctor.scheduleLimits.resetDate = getNextWeekReset();
      await doctor.save();
    }

    res.status(200).json({
      message: "Lấy thông tin gói đăng ký thành công",
      subscription: {
        packageType: doctor.subscriptionPackage,
        startDate: doctor.subscriptionStartDate,
        endDate: doctor.subscriptionEndDate,
        isExpired,
        daysRemaining: doctor.subscriptionEndDate 
          ? Math.max(0, Math.ceil((doctor.subscriptionEndDate - now) / (1000 * 60 * 60 * 24)))
          : 0,
        scheduleLimits: doctor.scheduleLimits,
        isPriority: doctor.isPriority,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if doctor can create a new schedule
export const checkScheduleAvailability = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const doctor = await Doctor.findById(doctorId).select(
      "subscriptionPackage scheduleLimits subscriptionEndDate"
    );
    
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại." });
    }

    // Check if subscription has expired
    const now = new Date();
    if (doctor.subscriptionEndDate && doctor.subscriptionEndDate < now) {
      return res.status(403).json({
        message: "Gói đăng ký đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.",
        canCreateSchedule: false,
      });
    }

    // Check if weekly limit needs reset
    if (doctor.scheduleLimits.resetDate && doctor.scheduleLimits.resetDate < now) {
      doctor.scheduleLimits.used = 0;
      doctor.scheduleLimits.resetDate = getNextWeekReset();
      await doctor.save();
    }

    const canCreate = doctor.scheduleLimits.used < doctor.scheduleLimits.weekly;
    const remainingSlots = doctor.scheduleLimits.weekly - doctor.scheduleLimits.used;

    res.status(200).json({
      message: "Kiểm tra khả năng tạo lịch thành công",
      canCreateSchedule: canCreate,
      scheduleLimits: {
        weekly: doctor.scheduleLimits.weekly,
        used: doctor.scheduleLimits.used,
        remaining: remainingSlots,
        resetDate: doctor.scheduleLimits.resetDate,
      },
      packageType: doctor.subscriptionPackage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Increment schedule usage (call this when a schedule is created)
export const incrementScheduleUsage = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const doctor = await Doctor.findById(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại." });
    }

    // Check if can create schedule
    const now = new Date();
    if (doctor.subscriptionEndDate && doctor.subscriptionEndDate < now) {
      return res.status(403).json({
        message: "Gói đăng ký đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.",
      });
    }

    // Check if weekly limit needs reset
    if (doctor.scheduleLimits.resetDate && doctor.scheduleLimits.resetDate < now) {
      doctor.scheduleLimits.used = 0;
      doctor.scheduleLimits.resetDate = getNextWeekReset();
    }

    if (doctor.scheduleLimits.used >= doctor.scheduleLimits.weekly) {
      return res.status(403).json({
        message: "Đã đạt giới hạn lịch hẹn trong tuần. Vui lòng nâng cấp gói hoặc chờ tuần sau.",
      });
    }

    doctor.scheduleLimits.used += 1;
    await doctor.save();

    res.status(200).json({
      message: "Cập nhật số lượng lịch hẹn thành công",
      scheduleLimits: doctor.scheduleLimits,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to get next week reset date (every Monday)
const getNextWeekReset = () => {
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
};

// Update getAllDoctors to prioritize diamond members
export const getAllDoctorsWithPriority = async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    
    // Get doctors with priority sorting (diamond first, then by creation date)
    const doctors = await Doctor.find()
      .select(
        "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail"
      )
      .sort({ 
        isPriority: -1,  // Diamond members first
        createdAt: -1 
      });
      
    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "Không có bác sĩ nào" });
    }
    
    res.status(200).json({
      message: `Có tổng ${doctors.length} bác sĩ`,
      doctors: doctors.map((doctor) => ({
        ...doctor.toObject(),
      })),
      totalDoctors,
    });
  } catch (error) {
    console.error("Get all doctors with priority error:", error);
    res.status(500).json({ message: error.message });
  }
};
