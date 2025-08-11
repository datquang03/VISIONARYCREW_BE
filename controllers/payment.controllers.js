import payOS from "../config/payos.js";
import Payment from "../models/payment.models.js";
import Doctor from "../models/User/doctor.models.js";
import mongoose from "mongoose";

// Cache for package configurations
const CACHE = {
  packages: null,
  lastUpdated: null,
  TTL: 5 * 60 * 1000 // 5 minutes
};

// Package pricing configuration
const PACKAGE_PRICES = {
  silver: {
    1: 3000,   // 1 month
  },
  gold: {
    1: 5000,   // 1 month
  },
  diamond: {
    1: 10000,   // 1 month
  }
};

// Package benefits configuration
const PACKAGE_BENEFITS = {
  free: {
    scheduleLimit: 5,
    isPriority: false,
    description: "Gói miễn phí - 5 lịch hẹn/tuần"
  },
  silver: {
    scheduleLimit: 10,
    isPriority: false,
    description: "Gói Bạc - 10 lịch hẹn/tuần"
  },
  gold: {
    scheduleLimit:20,
    isPriority: false,
    description: "Gói Vàng - 20 lịch hẹn/tuần"
  },
  diamond: {
    scheduleLimit: 100,
    isPriority: true,
    description: "Gói Kim Cương - 100 lịch hẹn/tuần + Ưu tiên hiển thị"
  }
};

// Package hierarchy for level comparison
const PACKAGE_HIERARCHY = {
  "free": 0,
  "silver": 1, 
  "gold": 2,
  "diamond": 3
};

// Validation constants
const VALID_PACKAGE_TYPES = ["silver", "gold", "diamond"];
const VALID_DURATIONS = [1, 3, 6, 12];
const PAYOS_DESCRIPTION_MAX_LENGTH = 25;

// Utility functions
const generateOrderCode = () => Math.floor(Date.now() / 1000);

const getPackageName = (packageType) => {
  const names = {
    silver: "Bạc",
    gold: "Vàng", 
    diamond: "Kim Cương"
  };
  return names[packageType] || packageType;
};

const getPackageShortName = (packageType) => {
  const shortNames = {
    silver: "Bac",
    gold: "Vang", 
    diamond: "KC"
  };
  return shortNames[packageType] || packageType;
};

const calculateRemainingDays = (endDate) => {
  return Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
};

// Optimized payment finder with multiple strategies
const findPaymentByOrderCode = async (orderCode, doctorId = null, status = null) => {
  const query = {};
  
  if (doctorId) query.doctorId = doctorId;
  if (status) query.status = status;
  
  // Try with parsed integer first
  let payment = await Payment.findOne({ 
    ...query,
    orderCode: parseInt(orderCode) 
  });
  
  // Fallback to string if not found
  if (!payment) {
    payment = await Payment.findOne({ 
      ...query,
      orderCode: orderCode 
    });
  }
  
  return payment;
};

// Validation helper functions
const validatePaymentInput = (packageType, duration) => {
  const errors = [];
  
  if (!packageType || !duration) {
    errors.push("Vui lòng chọn gói và thời hạn");
  }
  
  if (!VALID_PACKAGE_TYPES.includes(packageType)) {
    errors.push(`Gói không hợp lệ. Chọn: ${VALID_PACKAGE_TYPES.join(", ")}`);
  }
  
  if (!VALID_DURATIONS.includes(duration)) {
    errors.push(`Thời hạn không hợp lệ. Chọn: ${VALID_DURATIONS.join(", ")} tháng`);
  }
  
  return errors;
};

const validateDoctorEligibility = (doctor) => {
  if (!doctor) {
    return { valid: false, message: "Bác sĩ không tồn tại" };
  }
  
  if (doctor.doctorApplicationStatus !== "accepted") {
    return { 
      valid: false, 
      message: "Chỉ bác sĩ đã được duyệt mới có thể mua gói" 
    };
  }
  
  return { valid: true };
};

const validateSubscriptionRules = (doctor, packageType) => {
  const now = new Date();
  const hasActiveSubscription = doctor.subscriptionEndDate && doctor.subscriptionEndDate > now;
  
  if (!hasActiveSubscription) {
    return { valid: true, isUpgrade: false };
  }
  
  const currentPackage = doctor.subscriptionPackage;
  const currentLevel = PACKAGE_HIERARCHY[currentPackage] || 0;
  const newLevel = PACKAGE_HIERARCHY[packageType];
  const remainingDays = calculateRemainingDays(doctor.subscriptionEndDate);
  
  // Rule 1: Can't buy the same package if still active
  if (currentPackage === packageType) {
    return {
      valid: false,
      message: `Bạn đã có gói ${getPackageName(packageType)} còn hiệu lực ${remainingDays} ngày. Vui lòng chờ hết hạn hoặc chọn gói khác.`,
      currentSubscription: {
        package: currentPackage,
        endDate: doctor.subscriptionEndDate,
        remainingDays: remainingDays
      }
    };
  }
  
  // Rule 2: Allow upgrade to higher package
  if (newLevel > currentLevel) {
    return { valid: true, isUpgrade: true };
  }
  
  // Rule 3: Prevent downgrade to lower package while active
  if (newLevel < currentLevel) {
    return {
      valid: false,
      message: `Không thể hạ cấp từ gói ${getPackageName(currentPackage)} xuống gói ${getPackageName(packageType)} khi còn ${remainingDays} ngày hiệu lực. Vui lòng chờ hết hạn.`,
      currentSubscription: {
        package: currentPackage,
        endDate: doctor.subscriptionEndDate,
        remainingDays: remainingDays
      }
    };
  }
  
  return { valid: true, isUpgrade: false };
};

// Create payment link for doctor subscription package
export const createPackagePayment = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const { packageType, duration } = req.body;

    // Validate input
    const validationErrors = validatePaymentInput(packageType, duration);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: validationErrors[0],
        errors: validationErrors
      });
    }

    // Get doctor with optimized query
    const doctor = await Doctor.findById(doctorId)
      .select('fullName doctorApplicationStatus subscriptionPackage subscriptionEndDate')
      .lean();

    // Validate doctor eligibility
    const doctorValidation = validateDoctorEligibility(doctor);
    if (!doctorValidation.valid) {
      return res.status(doctorValidation.message.includes("không tồn tại") ? 404 : 403)
        .json({ message: doctorValidation.message });
    }

    // Validate subscription rules
    const subscriptionValidation = validateSubscriptionRules(doctor, packageType);
    if (!subscriptionValidation.valid) {
      return res.status(400).json({
        message: subscriptionValidation.message,
        currentSubscription: subscriptionValidation.currentSubscription
      });
    }

    // Get package price
    const amount = PACKAGE_PRICES[packageType]?.[duration];
    if (!amount) {
      return res.status(400).json({
        message: "Không tìm thấy giá cho gói này",
      });
    }

    // Generate order code and descriptions
    const orderCode = generateOrderCode();
    const shortDescription = `Goi ${getPackageShortName(packageType)} ${duration}T`;
    const fullDescription = `Gói ${getPackageName(packageType)} - ${duration} tháng - Dr. ${doctor.fullName}`;

    // Create payment record with transaction
    const session = await mongoose.startSession();
    let payment;
    
    try {
      await session.withTransaction(async () => {
        payment = new Payment({
          doctorId,
          orderCode,
          amount,
          description: fullDescription,
          packageType,
          packageDuration: duration,
          status: "PENDING",
        });

        // PayOS payment data
        const paymentData = {
          orderCode: orderCode,
          amount: amount,
          description: shortDescription,
          returnUrl: `${process.env.API_URL || 'http://localhost:8080'}/api/payments/package/success`,
          cancelUrl: `${process.env.API_URL || 'http://localhost:8080'}/api/payments/package/cancel`,
        };

        // Create payment link with PayOS
        const paymentLinkResponse = await payOS.createPaymentLink(paymentData);
        payment.paymentUrl = paymentLinkResponse.checkoutUrl;
        
        await payment.save({ session });
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    // Prepare upgrade info if applicable
    let upgradeInfo = null;
    if (subscriptionValidation.isUpgrade) {
      const remainingDays = calculateRemainingDays(doctor.subscriptionEndDate);
      upgradeInfo = {
        isUpgrade: true,
        fromPackage: doctor.subscriptionPackage,
        toPackage: packageType,
        currentEndDate: doctor.subscriptionEndDate,
        remainingDays: remainingDays,
        note: "Gói mới sẽ có hiệu lực ngay lập tức sau khi thanh toán thành công"
      };
    }

    res.status(200).json({
      message: "Tạo liên kết thanh toán gói thành công",
      payment: {
        orderCode: payment.orderCode,
        amount: payment.amount,
        description: payment.description,
        packageType: payment.packageType,
        packageDuration: payment.packageDuration,
        paymentUrl: payment.paymentUrl,
        status: payment.status,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      },
      packageInfo: PACKAGE_BENEFITS[packageType],
      upgradeInfo: upgradeInfo,
    });
  } catch (error) {
    console.error("Create Package Payment Error:", error);
    
    // Handle specific PayOS errors
    if (error.message?.includes('PayOS')) {
      return res.status(502).json({ 
        message: "Lỗi kết nối với cổng thanh toán",
        error: "SERVICE_UNAVAILABLE",
        suggestion: "Vui lòng thử lại sau ít phút"
      });
    }
    
    res.status(500).json({ 
      message: "Lỗi tạo thanh toán",
      error: process.env.NODE_ENV === 'development' ? error.message : "INTERNAL_ERROR"
    });
  }
};

// Subscription update helper function
const updateDoctorSubscription = async (payment, session = null) => {
  const doctor = await Doctor.findById(payment.doctorId);
  if (!doctor) {
    throw new Error(`Doctor not found for payment ${payment.orderCode}`);
  }

  const now = new Date();
  const hasActiveSubscription = doctor.subscriptionEndDate && doctor.subscriptionEndDate > now;
  const isUpgrade = hasActiveSubscription && doctor.subscriptionPackage !== payment.packageType;
  
  let startDate, endDate;
  
  if (isUpgrade) {
    // Upgrade: Start immediately
    startDate = now;
    endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + payment.packageDuration);
    // Upgrade: Start immediately
    startDate = now;
    endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + payment.packageDuration);
  } else {
    // New subscription or renewal
    startDate = hasActiveSubscription ? doctor.subscriptionEndDate : now;
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + payment.packageDuration);
  }

  // Update doctor subscription
  const benefits = PACKAGE_BENEFITS[payment.packageType];
  doctor.subscriptionPackage = payment.packageType;
  doctor.subscriptionStartDate = startDate;
  doctor.subscriptionEndDate = endDate;
  doctor.scheduleLimits.weekly = benefits.scheduleLimit;
  doctor.scheduleLimits.used = 0;
  doctor.scheduleLimits.resetDate = getNextWeekReset();
  doctor.isPriority = benefits.isPriority;
  
  await doctor.save({ session });
  return doctor;
};

// Handle PayOS webhook for package payments
export const handlePackagePaymentWebhook = async (req, res) => {
  const startTime = Date.now();
  let orderCode = null;
  
  try {
    const webhookData = req.body;
    orderCode = webhookData.data?.orderCode || webhookData.orderCode;
    
    // Verify webhook signature (recommended for production)
    const signature = req.headers["x-payos-signature"];
    
    // Rate limiting check (basic implementation)
    if (process.env.WEBHOOK_RATE_LIMIT && startTime - (global.lastWebhookTime || 0) < 1000) {
      console.warn(`Webhook rate limit hit for orderCode: ${orderCode}`);
      return res.status(429).json({ message: "Rate limit exceeded" });
    }
    global.lastWebhookTime = startTime;
    

    
    if (webhookData.code === "00") {
      // Payment successful
      const payment = await findPaymentByOrderCode(orderCode);
      if (!payment) {
        console.error(`Payment not found for orderCode: ${orderCode}`);
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Prevent duplicate processing with atomic update
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: "PENDING" },
        { 
          status: "PAID",
          transactionId: webhookData.data.transactionDateTime,
          paidAt: new Date()
        },
        { new: true }
      );

      if (!updatedPayment) {
        return res.status(200).json({ message: "Payment already processed" });
      }

      // Update doctor subscription with transaction
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await updateDoctorSubscription(updatedPayment, session);
        });
      } catch (error) {
        console.error(`Failed to update doctor subscription for payment ${orderCode}:`, error);
        // Payment is already marked as PAID, log error but don't fail webhook
      } finally {
        await session.endSession();
      }
    } else {
      // Payment failed or cancelled
      const payment = await findPaymentByOrderCode(orderCode, null, "PENDING");
      if (!payment) {
        return res.status(200).json({ message: "No pending payment found" });
      }

      const failureReason = webhookData.desc || webhookData.message || "Unknown failure reason";
      
      let updateData = {};
      
      // Determine specific failure type based on PayOS codes
      if (webhookData.code === "02" || webhookData.code === "10" || failureReason.toLowerCase().includes("cancel")) {
        updateData = {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: failureReason
        };
      } else if (webhookData.code === "03" || failureReason.toLowerCase().includes("expire")) {
        updateData = {
          status: "EXPIRED",
          expiredAt: new Date()
        };
      } else {
        updateData = {
          status: "FAILED",
          failedAt: new Date(),
          failureReason: failureReason
        };
      }
      
      await Payment.findByIdAndUpdate(payment._id, updateData);
    }

    const processingTime = Date.now() - startTime;
    
    res.status(200).json({ 
      message: "Webhook processed successfully",
      processingTime: processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Webhook Error for orderCode: ${orderCode}, processing time: ${processingTime}ms`, error);
    
    // Don't expose internal errors to external webhook calls
    res.status(500).json({ 
      message: "Webhook processing failed",
      timestamp: new Date().toISOString()
    });
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

// Check package payment status
export const checkPackagePaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const doctorId = req.doctor._id;

    // Find payment with optimized query
    const payment = await findPaymentByOrderCode(orderCode, doctorId);
    
    if (!payment) {
      return res.status(404).json({ 
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Skip PayOS API call if payment is already in final state
    const finalStates = ["PAID", "CANCELLED", "EXPIRED", "FAILED"];
    let shouldCheckPayOS = !finalStates.includes(payment.status);
    
    // Also check PayOS if payment is recent (within 30 minutes) to ensure accuracy
    const isRecent = (Date.now() - payment.createdAt.getTime()) < 30 * 60 * 1000;
    if (payment.status === "PENDING" || isRecent) {
      shouldCheckPayOS = true;
    }

    if (shouldCheckPayOS) {
      try {
        const paymentInfo = await payOS.getPaymentLinkInformation(parseInt(orderCode));
        
        // Update payment status based on PayOS response if different
        if (paymentInfo.status !== payment.status) {
          const updateData = {};
          
          if (paymentInfo.status === "PAID" && payment.status === "PENDING") {
            updateData.status = "PAID";
            updateData.paidAt = new Date();
            updateData.transactionId = paymentInfo.id;

            // Update doctor subscription
            const session = await mongoose.startSession();
            try {
              await session.withTransaction(async () => {
                await Payment.findByIdAndUpdate(payment._id, updateData, { session });
                await updateDoctorSubscription(payment, session);
              });
            } finally {
              await session.endSession();
            }
          } else if (paymentInfo.status === "CANCELLED") {
            updateData.status = "CANCELLED";
            updateData.cancelledAt = new Date();
            updateData.cancelReason = "Cancelled via PayOS API check";
            await Payment.findByIdAndUpdate(payment._id, updateData);
          } else if (paymentInfo.status === "EXPIRED") {
            updateData.status = "EXPIRED";
            updateData.expiredAt = new Date();
            await Payment.findByIdAndUpdate(payment._id, updateData);
          } else if (paymentInfo.status === "FAILED") {
            updateData.status = "FAILED";
            updateData.failedAt = new Date();
            updateData.failureReason = "Failed via PayOS API check";
            await Payment.findByIdAndUpdate(payment._id, updateData);
          }
          
          // Update local payment object for response
          Object.assign(payment, updateData);
        }
      } catch (payOSError) {
        console.warn(`PayOS API error for orderCode ${orderCode}:`, payOSError.message);
        // Continue with local payment info if PayOS API fails
      }
    }

    // Calculate expiry time for pending payments
    let expiryInfo = null;
    if (payment.status === "PENDING") {
      const expiryTime = new Date(payment.createdAt.getTime() + 15 * 60 * 1000); // 15 minutes
      const timeLeft = Math.max(0, expiryTime.getTime() - Date.now());
      expiryInfo = {
        expiresAt: expiryTime,
        timeLeftSeconds: Math.floor(timeLeft / 1000),
        isExpired: timeLeft <= 0
      };
    }

    res.status(200).json({
      message: "Lấy thông tin thanh toán gói thành công",
      payment: {
        orderCode: payment.orderCode,
        amount: payment.amount,
        description: payment.description,
        packageType: payment.packageType,
        packageDuration: payment.packageDuration,
        status: payment.status,
        paymentUrl: payment.paymentUrl,
        paidAt: payment.paidAt,
        cancelledAt: payment.cancelledAt,
        cancelReason: payment.cancelReason,
        expiredAt: payment.expiredAt,
        failedAt: payment.failedAt,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
      },
      statusInfo: {
        isPending: payment.status === "PENDING",
        isPaid: payment.status === "PAID",
        isCancelled: payment.status === "CANCELLED",
        isExpired: payment.status === "EXPIRED",
        isFailed: payment.status === "FAILED"
      },
      expiryInfo: expiryInfo
    });
  } catch (error) {
    console.error("Check Package Payment Error:", error);
    res.status(500).json({ 
      message: "Lỗi kiểm tra trạng thái thanh toán gói",
      error: process.env.NODE_ENV === 'development' ? error.message : "INTERNAL_ERROR"
    });
  }
};

// Get doctor's package payment history
export const getDoctorPaymentHistory = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      packageType, 
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query with filters
    const query = { doctorId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (packageType && packageType !== 'all') {
      query.packageType = packageType;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination options
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 records per page
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries in parallel
    const [payments, totalPayments] = await Promise.all([
      Payment.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .select('-paymentUrl -transactionId') // Exclude sensitive data
        .lean(), // Use lean() for better performance
      Payment.countDocuments(query)
    ]);

    // Add calculated fields
    const enrichedPayments = payments.map(payment => ({
      ...payment,
      isExpired: payment.status === 'PENDING' && 
                 (Date.now() - payment.createdAt.getTime()) > 15 * 60 * 1000,
      ageInDays: Math.floor((Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    }));

    // Calculate statistics
    const stats = {
      total: totalPayments,
      byStatus: {},
      totalAmount: 0
    };

    // Get aggregated stats for current filter
    const aggregateStats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    aggregateStats.forEach(stat => {
      stats.byStatus[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      };
      stats.totalAmount += stat.totalAmount;
    });

    res.status(200).json({
      message: "Lấy lịch sử thanh toán gói thành công",
      payments: enrichedPayments,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPayments / limitNum),
        totalPayments,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(totalPayments / limitNum),
        hasPrevPage: pageNum > 1
      },
      filters: {
        status,
        packageType,
        startDate,
        endDate,
        sortBy,
        sortOrder
      },
      statistics: stats
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ 
      message: "Lỗi lấy lịch sử thanh toán gói",
      error: process.env.NODE_ENV === 'development' ? error.message : "INTERNAL_ERROR"
    });
  }
};

// Cancel package payment (if still pending)
export const cancelPackagePayment = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const doctorId = req.doctor._id;

    // Find payment record
    let payment = await Payment.findOne({ 
      orderCode: parseInt(orderCode),
      doctorId,
      status: "PENDING"
    });

    // Try with string orderCode if not found
    if (!payment) {
      payment = await Payment.findOne({ 
        orderCode: orderCode,
        doctorId,
        status: "PENDING"
      });
    }

    if (!payment) {
      return res.status(404).json({ 
        message: "Không tìm thấy đơn hàng hoặc đơn hàng không thể hủy" 
      });
    }

    try {
      // Cancel payment on PayOS
      await payOS.cancelPaymentLink(parseInt(orderCode));
      
      // Update payment status
      payment.status = "CANCELLED";
      payment.cancelledAt = new Date();
      payment.cancelReason = "Cancelled by doctor via API";
      await payment.save();

      res.status(200).json({
        message: "Hủy thanh toán gói thành công",
        payment: {
          orderCode: payment.orderCode,
          status: payment.status,
          cancelledAt: payment.cancelledAt,
          cancelReason: payment.cancelReason,
        },
      });
    } catch (payOSError) {
      console.error("PayOS Cancel Error:", payOSError);
      
      // Nếu PayOS báo lỗi nhưng payment vẫn có thể đã bị hủy, cập nhật local status
      if (payOSError.message && payOSError.message.includes("cancelled")) {
        payment.status = "CANCELLED";
        payment.cancelledAt = new Date();
        payment.cancelReason = "Already cancelled on PayOS";
        await payment.save();
        
        return res.status(200).json({
          message: "Thanh toán đã được hủy trước đó",
          payment: {
            orderCode: payment.orderCode,
            status: payment.status,
            cancelledAt: payment.cancelledAt,
            cancelReason: payment.cancelReason,
          },
        });
      }
      
      res.status(400).json({ 
        message: "Không thể hủy thanh toán trên PayOS",
        error: payOSError.message,
        suggestion: "Thanh toán có thể đã được xử lý hoặc hết hạn"
      });
    }
  } catch (error) {
    console.error("Cancel package payment error:", error);
    res.status(500).json({ 
      message: "Lỗi hủy thanh toán gói",
      error: error.message 
    });
  }
};

// Handle payment cancel redirect from PayOS
export const handlePaymentCancel = async (req, res) => {
  try {
    const { orderCode, cancel } = req.query; // PayOS thường gửi orderCode và cancel=true qua query params
    
    let cancelResult = {
      success: false,
      orderCode: orderCode,
      message: "Thanh toán đã bị hủy",
      packageType: null,
      amount: null
    };

    if (orderCode) {
      // Tìm và cập nhật payment nếu cần
      let payment = await Payment.findOne({ 
        orderCode: parseInt(orderCode),
        status: "PENDING" 
      });

      // Nếu không tìm thấy với parseInt, thử với string
      if (!payment) {
        payment = await Payment.findOne({ 
          orderCode: orderCode,
          status: "PENDING" 
        });
      }
      
      if (payment) {
        payment.status = "CANCELLED";
        payment.cancelledAt = new Date();
        payment.cancelReason = "User cancelled on PayOS gateway";
        await payment.save();

        cancelResult.success = true;
        cancelResult.packageType = payment.packageType;
        cancelResult.amount = payment.amount;
        cancelResult.description = payment.description;
      }
    }
    
    // Redirect về frontend cancel page với thông tin
    const queryParams = new URLSearchParams({
      orderCode: orderCode || '',
      success: cancelResult.success.toString(),
      packageType: cancelResult.packageType || '',
      amount: cancelResult.amount || '',
      message: cancelResult.message
    });
    
    const frontendCancelUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/doctor/payment/cancelled?${queryParams.toString()}`;
    
    res.redirect(frontendCancelUrl);
    
  } catch (error) {
    console.error("Cancel handler error:", error);
    // Redirect về frontend với error
    const errorParams = new URLSearchParams({
      error: 'true',
      message: error.message,
      orderCode: req.query.orderCode || ''
    });
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/doctor/payment/cancelled?${errorParams.toString()}`);
  }
};

// Handle payment success redirect from PayOS
export const handlePaymentSuccess = async (req, res) => {
  try {
    const { orderCode, code, id, status } = req.query;
    
    let successResult = {
      success: false,
      orderCode: orderCode,
      paymentVerified: false
    };

    if (orderCode) {
      // Tìm payment record
      let payment = await Payment.findOne({ 
        orderCode: parseInt(orderCode)
      });

      if (!payment) {
        payment = await Payment.findOne({ 
          orderCode: orderCode
        });
      }
      
      if (payment && payment.status === "PENDING") {
        // Kiểm tra trạng thái từ PayOS để xác nhận
        try {
          const paymentInfo = await payOS.getPaymentLinkInformation(parseInt(orderCode));
          
          if (paymentInfo.status === "PAID") {
            payment.status = "PAID";
            payment.paidAt = new Date();
            payment.transactionId = paymentInfo.id || id;
            await payment.save();

            // Update doctor subscription (tương tự logic trong webhook)
            const doctor = await Doctor.findById(payment.doctorId);
            if (doctor) {
              const now = new Date();
              
              let startDate;
              let endDate;
              
              const hasActiveSubscription = doctor.subscriptionEndDate && doctor.subscriptionEndDate > now;
              const isUpgrade = hasActiveSubscription && doctor.subscriptionPackage !== payment.packageType;
              
              if (isUpgrade) {
                startDate = now;
                endDate = new Date(now);
                endDate.setMonth(endDate.getMonth() + payment.packageDuration);
              } else {
                startDate = hasActiveSubscription ? doctor.subscriptionEndDate : now;
                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + payment.packageDuration);
              }

              doctor.subscriptionPackage = payment.packageType;
              doctor.subscriptionStartDate = startDate;
              doctor.subscriptionEndDate = endDate;
              
              const benefits = PACKAGE_BENEFITS[payment.packageType];
              doctor.scheduleLimits.weekly = benefits.scheduleLimit;
              doctor.scheduleLimits.used = 0;
              doctor.scheduleLimits.resetDate = getNextWeekReset();
              doctor.isPriority = benefits.isPriority;
              
              await doctor.save();
            }

            successResult.success = true;
            successResult.paymentVerified = true;
          }
        } catch (payOSError) {
          console.error("PayOS verification error in success handler:", payOSError);
          // Vẫn redirect về success page, webhook sẽ xử lý sau
        }
      }
    }
    
    // Redirect về frontend success page
    const queryParams = new URLSearchParams({
      orderCode: orderCode || '',
      success: successResult.success.toString(),
      verified: successResult.paymentVerified.toString(),
      code: code || '',
      status: status || ''
    });
    
    const frontendSuccessUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/doctor/payment/success?${queryParams.toString()}`;
    
    res.redirect(frontendSuccessUrl);
    
  } catch (error) {
    console.error("Success handler error:", error);
    const errorParams = new URLSearchParams({
      error: 'true',
      message: error.message,
      orderCode: req.query.orderCode || ''
    });
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/doctor/payment/success?${errorParams.toString()}`);
  }
};

// Get available packages and pricing
export const getPackages = async (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (CACHE.packages && CACHE.lastUpdated && (now - CACHE.lastUpdated) < CACHE.TTL) {
      return res.status(200).json({
        message: "Lấy danh sách gói thành công",
        packages: CACHE.packages,
        cached: true
      });
    }

    // Generate packages data
    const packages = Object.keys(PACKAGE_PRICES).map(packageType => {
      const pricing = PACKAGE_PRICES[packageType];
      const benefits = PACKAGE_BENEFITS[packageType];
      
      // Calculate discount percentages
      const basePrice = pricing[1];
      const discounts = {};
      Object.keys(pricing).forEach(duration => {
        if (duration !== '1') {
          const expectedPrice = basePrice * parseInt(duration);
          const actualPrice = pricing[duration];
          const discount = Math.round(((expectedPrice - actualPrice) / expectedPrice) * 100);
          discounts[duration] = discount;
        }
      });

      return {
        type: packageType,
        name: getPackageName(packageType),
        level: PACKAGE_HIERARCHY[packageType],
        benefits: {
          ...benefits,
          features: [
            `${benefits.scheduleLimit} lịch hẹn/tuần`,
            benefits.isPriority ? 'Ưu tiên hiển thị' : 'Hiển thị thông thường',
            'Hỗ trợ khách hàng 24/7',
            'Báo cáo thống kê chi tiết'
          ]
        },
        pricing: pricing,
        discounts: discounts,
        popular: packageType === 'gold', // Mark gold as popular
        recommended: packageType === 'diamond' // Mark diamond as recommended
      };
    });

    // Update cache
    CACHE.packages = packages;
    CACHE.lastUpdated = now;

    res.status(200).json({
      message: "Lấy danh sách gói thành công",
      packages,
      metadata: {
        totalPackages: packages.length,
        validDurations: VALID_DURATIONS,
        currency: 'VND',
        lastUpdated: new Date(now).toISOString()
      }
    });
  } catch (error) {
    console.error("Get packages error:", error);
    res.status(500).json({ 
      message: "Lỗi lấy danh sách gói",
      error: process.env.NODE_ENV === 'development' ? error.message : "INTERNAL_ERROR"
    });
  }
};

// Get payment statistics for doctor
export const getPaymentStatistics = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    // Get payment statistics with optimized aggregation
    const [stats, recentPayments, monthlyStats] = await Promise.all([
      Payment.aggregate([
        { $match: { doctorId: new mongoose.Types.ObjectId(doctorId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" }
          }
        }
      ]),
      Payment.find({ doctorId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderCode amount packageType status createdAt paidAt cancelledAt")
        .lean(),
      Payment.aggregate([
        { 
          $match: { 
            doctorId: new mongoose.Types.ObjectId(doctorId),
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          } 
        },
        {
          $group: {
            _id: { 
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" }
            },
            count: { $sum: 1 },
            amount: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
      ])
    ]);

    // Calculate metrics
    const totalPayments = stats.reduce((sum, stat) => sum + stat.count, 0);
    const successfulPayments = stats.find(stat => stat._id === "PAID")?.count || 0;
    const totalRevenue = stats.find(stat => stat._id === "PAID")?.totalAmount || 0;
    const successRate = totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(2) : 0;

    // Calculate conversion rate (paid vs total)
    const conversionRate = totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(2) : 0;

    res.status(200).json({
      message: "Lấy thống kê thanh toán thành công",
      statistics: {
        overview: {
          totalPayments,
          successfulPayments,
          totalRevenue,
          successRate: parseFloat(successRate),
          conversionRate: parseFloat(conversionRate)
        },
        byStatus: stats,
        recentPayments,
        monthlyTrend: monthlyStats,
        period: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error("Get payment statistics error:", error);
    res.status(500).json({ 
      message: "Lỗi lấy thống kê thanh toán",
      error: process.env.NODE_ENV === 'development' ? error.message : "INTERNAL_ERROR"
    });
  }
};

// Health check for payment system
export const getPaymentSystemHealth = async (req, res) => {
  try {
    const healthChecks = {
      database: false,
      payOS: false,
      cache: false
    };

    // Check database connectivity
    try {
      await Payment.findOne().limit(1);
      healthChecks.database = true;
    } catch (dbError) {
      console.error("Database health check failed:", dbError);
    }

    // Check PayOS connectivity (if API allows)
    try {
      // This is a placeholder - implement based on PayOS API capabilities
      healthChecks.payOS = true;
    } catch (payOSError) {
      console.error("PayOS health check failed:", payOSError);
    }

    // Check cache status
    healthChecks.cache = CACHE.packages !== null;

    const isHealthy = Object.values(healthChecks).every(check => check === true);

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: healthChecks,
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown"
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

// Get all payments for admin
export const getAllPayment = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      packageType, 
      doctorId,
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build query with filters
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (packageType && packageType !== 'all') {
      query.packageType = packageType;
    }
    
    if (doctorId) {
      query.doctorId = doctorId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { orderCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination options
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 records per page
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries in parallel with population
    const [payments, totalPayments] = await Promise.all([
      Payment.find(query)
        .populate('doctorId', 'fullName email phone username')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .select('-paymentUrl') // Exclude sensitive payment URL
        .lean(),
      Payment.countDocuments(query)
    ]);

    // Add calculated fields
    const enrichedPayments = payments.map(payment => ({
      ...payment,
      isExpired: payment.status === 'PENDING' && 
                 (Date.now() - payment.createdAt.getTime()) > 15 * 60 * 1000,
      ageInDays: Math.floor((Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      doctorName: payment.doctorId?.fullName || 'Unknown Doctor',
      doctorEmail: payment.doctorId?.email || 'No email',
      doctorPhone: payment.doctorId?.phone || 'No phone'
    }));

    // Calculate statistics
    const stats = {
      total: totalPayments,
      byStatus: {},
      byPackageType: {},
      totalAmount: 0,
      successfulAmount: 0
    };

    // Get aggregated stats for current filter
    const aggregateStats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const packageStats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$packageType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    aggregateStats.forEach(stat => {
      stats.byStatus[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      };
      stats.totalAmount += stat.totalAmount;
      if (stat._id === 'PAID') {
        stats.successfulAmount = stat.totalAmount;
      }
    });

    packageStats.forEach(stat => {
      stats.byPackageType[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount
      };
    });

    // Calculate success rate
    const successfulPayments = stats.byStatus['PAID']?.count || 0;
    stats.successRate = totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(2) : 0;

    res.status(200).json({
      message: "Lấy danh sách thanh toán thành công",
      payments: enrichedPayments,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPayments / limitNum),
        totalPayments,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(totalPayments / limitNum),
        hasPrevPage: pageNum > 1
      },
      filters: {
        status,
        packageType,
        doctorId,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        search
      },
      statistics: stats
    });
  } catch (error) {
    console.error("Get all payments error:", error);
    res.status(500).json({ 
      message: "Lỗi lấy danh sách thanh toán",
      error: process.env.NODE_ENV === 'development' ? error.message : "INTERNAL_ERROR"
    });
  }
};
