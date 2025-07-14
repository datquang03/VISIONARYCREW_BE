import bcrypt from "bcryptjs";
import User from "../models/User/user.models.js";
import Payment from "../models/payment.models.js";
import { verifyEmail } from "../utils/sendEmail.js";
import { generateToken } from "../middlewares/auth.js";
import mongoose from "mongoose";
import { createPayment } from "./payment.controllers.js"; // Static import

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, phone, dateOfBirth, password } = req.body;

    // Validate required fields
    if (!username || !email || !phone || !dateOfBirth || !password) {
      return res.status(400).json({
        error: { message: "Vui lòng nhập đầy đủ thông tin", code: "MISSING_FIELDS" },
      });
    }

    // Validate dateOfBirth
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const minAgeDate = new Date(today.setFullYear(today.getFullYear() - 13));
    if (isNaN(dob.getTime()) || dob > minAgeDate) {
      return res.status(400).json({
        error: { message: "Ngày sinh không hợp lệ hoặc người dùng dưới 13 tuổi", code: "INVALID_DOB" },
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { username }],
    });
    if (existingUser) {
      const field = existingUser.email === email ? "email" : existingUser.phone === phone ? "số điện thoại" : "tên đăng nhập";
      return res.status(400).json({
        error: { message: `Người dùng với ${field} đã tồn tại`, code: "DUPLICATE_USER" },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      email,
      phone,
      dateOfBirth: dob,
      password: hashedPassword,
      isVerified: false,
    });

    // Save user and send verification email
    await user.save();
    try {
      await verifyEmail(user);
    } catch (emailError) {
      // Log email error but don't fail registration
      console.error("Email verification failed:", emailError.message);
    }

    res.status(200).json({
      message: "Đăng kí thành công. Vui lòng kiểm tra email để xác minh.",
    });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi đăng ký: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Verify email with code
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate input
    if (!email || !code) {
      return res.status(400).json({
        error: { message: "Vui lòng cung cấp email và mã xác minh", code: "MISSING_FIELDS" },
      });
    }

    // Find user by email and verification code
    const user = await User.findOne({ email, emailVerificationCode: code });
    if (!user) {
      return res.status(400).json({
        error: { message: "Mã xác minh hoặc email không đúng", code: "INVALID_CODE" },
      });
    }

    // Check if code is expired (corrected to use Date.now())
    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        error: { message: "Mã xác minh đã hết hạn", code: "EXPIRED_CODE" },
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Xác minh email thành công" });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi xác minh email: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Login user (with verification check)
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: { message: "Vui lòng cung cấp tên đăng nhập và mật khẩu", code: "MISSING_FIELDS" },
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        error: { message: "Không tìm thấy tên tài khoản người dùng", code: "USER_NOT_FOUND" },
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        error: { message: "Vui lòng xác minh email trước khi đăng nhập", code: "UNVERIFIED_EMAIL" },
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        error: { message: "Sai mật khẩu", code: "INVALID_PASSWORD" },
      });
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
        balance: user.balance || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi đăng nhập: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Get profile of the logged-in user
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user and populate references
    const user = await User.findById(userId)
      .select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires")
      .populate("likedBlogs savedBlogs conversations");
    if (!user) {
      return res.status(404).json({
        error: { message: "Người dùng không tồn tại", code: "USER_NOT_FOUND" },
      });
    }

    res.status(200).json({
      message: "Lấy thông tin hồ sơ thành công",
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
    res.status(500).json({
      error: { message: "Lỗi lấy hồ sơ: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: { message: "ID người dùng không hợp lệ", code: "INVALID_ID" },
      });
    }

    // Find user
    const user = await User.findById(userId)
      .select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires -balance")
      .populate("likedBlogs savedBlogs");
    if (!user) {
      return res.status(404).json({
        error: { message: "Người dùng không tồn tại", code: "USER_NOT_FOUND" },
      });
    }

    res.status(200).json({ message: "Lấy thông tin người dùng thành công", user });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi lấy thông tin người dùng: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Get all users (with pagination)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    };

    // Find users with pagination
    const users = await User.find()
      .select("-password -emailVerificationCode -emailVerificationExpires -resetPasswordCode -resetPasswordExpires -verifyToken -verifyTokenExpires -tempEmail -tempEmailExpires")
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const totalUsers = await User.countDocuments();

    if (!users || users.length === 0) {
      return res.status(404).json({
        error: { message: "Không có người dùng nào", code: "NO_USERS_FOUND" },
      });
    }

    res.status(200).json({
      message: `Có tổng ${totalUsers} người dùng`,
      users,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(totalUsers / options.limit),
        totalUsers,
        limit: options.limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi lấy danh sách người dùng: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Update user profile (Admin only)
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params; // Update any user by ID
    const { username, email, phone, dateOfBirth, description } = req.body;

    // Check if user has admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: { message: "Chỉ admin mới có quyền cập nhật hồ sơ người dùng", code: "UNAUTHORIZED" },
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: { message: "ID người dùng không hợp lệ", code: "INVALID_ID" },
      });
    }

    // Validate required fields
    if (!username || !email || !phone || !dateOfBirth) {
      return res.status(400).json({
        error: { message: "Vui lòng nhập đầy đủ thông tin", code: "MISSING_FIELDS" },
      });
    }

    // Validate dateOfBirth
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const minAgeDate = new Date(today.setFullYear(today.getFullYear() - 13));
    if (isNaN(dob.getTime()) || dob > minAgeDate) {
      return res.status(400).json({
        error: { message: "Ngày sinh không hợp lệ hoặc người dùng dưới 13 tuổi", code: "INVALID_DOB" },
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: { message: "Người dùng không tồn tại", code: "USER_NOT_FOUND" },
      });
    }

    // Check for duplicate username, email, or phone
    const duplicateCheck = await User.findOne({
      $or: [{ username }, { email }, { phone }],
      _id: { $ne: userId },
    });
    if (duplicateCheck) {
      const field = duplicateCheck.email === email ? "email" : duplicateCheck.phone === phone ? "số điện thoại" : "tên đăng nhập";
      return res.status(400).json({
        error: { message: `${field} đã được sử dụng`, code: "DUPLICATE_FIELD" },
      });
    }

    // Update user details
    user.username = username;
    user.email = email;
    user.phone = phone;
    user.dateOfBirth = dob;
    user.description = description || user.description;

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
      },
    });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi cập nhật hồ sơ: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Delete user account (Admin only)
export const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params; // Delete any user by ID

    // Check if user has admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: { message: "Chỉ admin mới có quyền xóa tài khoản người dùng", code: "UNAUTHORIZED" },
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: { message: "ID người dùng không hợp lệ", code: "INVALID_ID" },
      });
    }

    // Find and soft-delete user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: { message: "Người dùng không tồn tại", code: "USER_NOT_FOUND" },
      });
    }

    if (user.isDeleted) {
      return res.status(400).json({
        error: { message: "Tài khoản người dùng đã bị xóa", code: "ALREADY_DELETED" },
      });
    }

    user.isDeleted = true;
    await user.save();

    // Optionally, mark related payments as inactive (example)
    await Payment.updateMany({ userId }, { status: "inactive" });

    res.status(200).json({ message: "Tài khoản người dùng đã bị xóa thành công" });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi xóa tài khoản: " + error.message, code: "SERVER_ERROR" },
    });
  }
};

// Recharge balance (Create payment)
export const rechargeBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, description = "Nạp tiền vào tài khoản" } = req.body;

    // Validate input
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: { message: "Số tiền không hợp lệ", code: "INVALID_AMOUNT" },
      });
    }

    // Validate minimum amount for PayOS
    if (amount < 2000) {
      return res.status(400).json({
        error: { message: "Số tiền tối thiểu là 2,000 VND", code: "MIN_AMOUNT" },
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: { message: "Người dùng không tồn tại", code: "USER_NOT_FOUND" },
      });
    }

    // Forward to payment controller
    req.body = { amount, description, userId }; // Pass userId for payment tracking
    return createPayment(req, res);
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi nạp tiền: " + error.message, code: "SERVER_ERROR" },
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
      return res.status(404).json({
        error: { message: "Người dùng không tồn tại", code: "USER_NOT_FOUND" },
      });
    }

    res.status(200).json({
      message: "Lấy số dư thành công",
      balance: user.balance || 0,
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({
      error: { message: "Lỗi lấy số dư: " + error.message, code: "SERVER_ERROR" },
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
      error: { message: "Lỗi lấy lịch sử giao dịch: " + error.message, code: "SERVER_ERROR" },
    });
  }
};