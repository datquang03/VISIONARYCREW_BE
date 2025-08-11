import bcrypt from "bcryptjs";
import User from "../models/User/user.models.js";
import Doctor from "../models/User/doctor.models.js";
import Payment from "../models/payment.models.js";
import { verifyEmail } from "../utils/sendEmail.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { uploadImage } from "../config/cloudinary.js";

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, phone, dateOfBirth, password } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !dateOfBirth || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Check if user already exists với timeout
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { username }],
    }).maxTimeMS(10000);
    if (existingUser) {
      return res.status(400).json({
        message: `Người dùng với ${
          existingUser.email === email
            ? "email"
            : existingUser.phone === phone
            ? "số điện thoại"
            : "tên đăng nhập"
        } đã tồn tại`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      phone,
      dateOfBirth,
      password: hashedPassword,
      isVerified: false,
    });

    // Save user and send verification email
    await user.save();
    
    try {
      await verifyEmail(user);
    } catch (emailError) {
      console.error('Email verification error:', emailError.message);
      // Không throw error để user vẫn có thể đăng ký thành công
      // Chỉ log lỗi để debug
    }

    res
      .status(200)
      .json({ message: "Đăng kí thành công. Xin vui lòng kiểm tra email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify email with code
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find user by email and verification code
    const user = await User.findOne({ email, emailVerificationCode: code });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Xin vui lòng kiểm tra lại mã hoặc email" });
    }

    // Check if code is expired
    if (user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({ message: "Mã đã hết hạn" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Xác minh email thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user (with verification check)
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy tên tài khoản người dùng" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Vui lòng xác minh email trước khi đăng nhập" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai mật khẩu" });
    }
    // Generate token
    const token = generateToken(user._id);
    res.status(200).json({
      message: "Đăng nhập thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token,
        balance: user.balance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get profile of the logged-in user
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Tìm người dùng
    const user = await User.findById(userId).select(
      " -password -isVerified -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
    );
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }

    res.status(200).json({
      message: "Lấy thông tin hồ sơ thành công.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        avatar: user.avatar,
        description: user.description,
        likedBlogs: user.likedBlogs,
        savedBlogs: user.savedBlogs,
        isVerified: user.isVerified,
        conversations: user.conversations,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get user by id
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user by ID
    const user = await User.findById(userId).select(
      "-password -isVerified -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires -balance"
    );
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get all users
export const getAllUsers = async (req, res) => {
  try {
    // count total users
    const totalUsers = await User.countDocuments();
    // Find all users
    const users = await User.find()
      .select(
        "-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
      )
      .sort({ createdAt: -1 });
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "Không có người dùng nào" });
    }
    res.status(200).json({
      message: `Có tổng ${users.length} người dùng`,
      users,
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Update user profile (Admin only)
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, email, phone, dateOfBirth, description } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !dateOfBirth) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Handle avatar upload if provided
    let avatarUrl = user.avatar; // Keep existing avatar by default
    if (req.files && req.files.length > 0) {
      try {
        const avatarFile = req.files.find(file => file.fieldname === 'avatar');
        if (avatarFile) {
          // Upload new avatar to Cloudinary
          avatarUrl = await uploadImage(avatarFile.buffer, 'user-avatars');
        }
      } catch (uploadError) {
        return res.status(400).json({ 
          message: `Lỗi tải ảnh lên: ${uploadError.message}` 
        });
      }
    }

    // Update user details
    user.username = username;
    user.email = email;
    user.phone = phone;
    user.dateOfBirth = dateOfBirth;
    user.description = description;
    user.avatar = avatarUrl;

    // Save updated user
    await user.save();

    res.status(200).json({
      message: "Cập nhật hồ sơ thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        description: user.description,
        role: user.role,
        balance: user.balance,
        avatar: user.avatar,
        isVerified: user.isVerified,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Delete user account (Admin only)
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user has admin role
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Chỉ admin mới có quyền xóa tài khoản người dùng" });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    // Find and delete user
    const user = await User.findByIdAndUpdate(
      userId, 
      { isDeleted: true }, 
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại." });
    }
    
    res.status(200).json({ message: "Tài khoản người dùng đã bị xóa thành công." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Recharge balance (Create payment)
export const rechargeBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, description = "Nạp tiền vào tài khoản" } = req.body;

    // Validate input
    if (!amount) {
      return res.status(400).json({
        message: "Vui lòng nhập số tiền cần nạp",
      });
    }

    // Validate amount (minimum 2000 VND for PayOS)
    if (amount < 2000) {
      return res.status(400).json({
        message: "Số tiền tối thiểu là 2,000 VND",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Redirect to payment creation with modified request
    req.body = { amount, description };
    
    // Forward to payment controller
    const { createPayment } = await import("./payment.controllers.js");
    return createPayment(req, res);
    
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi nạp tiền",
      error: error.message 
    });
  }
};

// Get user balance
export const getBalance = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId).select("username balance");
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.status(200).json({
      message: "Lấy số dư thành công",
      balance: user.balance,
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy số dư",
      error: error.message 
    });
  }
};

// Get user's payment transactions
export const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { userId };
    if (status) {
      query.status = status;
    }

    // Pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    };

    // Get payments
    const payments = await Payment.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .select("orderCode amount description status paidAt cancelledAt expiredAt createdAt");

    const totalPayments = await Payment.countDocuments(query);

    res.status(200).json({
      message: "Lấy lịch sử giao dịch thành công",
      transactions: payments,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(totalPayments / options.limit),
        totalTransactions: totalPayments,
        limit: options.limit,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy lịch sử giao dịch",
      error: error.message 
    });
  }
};

// Get user profile by ID (can be User or Doctor)
export const getUserProfileById = async (req, res) => {
  try {
    const userId = req.params.id;

    // First try to find in User model
    let user = await User.findById(userId).select(
      "-password -isVerified -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires -balance"
    );

    if (user) {
      return res.status(200).json({
        ...user.toObject(),
        userType: 'user'
      });
    }

    // If not found in User, try Doctor model
    let doctor = await Doctor.findById(userId).select(
      "-password -isVerified -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires"
    );

    if (doctor) {
      return res.status(200).json({
        ...doctor.toObject(),
        userType: 'doctor'
      });
    }

    // If not found in both models
    return res.status(404).json({ message: "Người dùng không tồn tại" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
