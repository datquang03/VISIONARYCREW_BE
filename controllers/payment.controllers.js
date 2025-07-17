import payOS from "../config/payos.js";
import Payment from "../models/payment.models.js";
import Doctor from "../models/User/doctor.models.js";
import mongoose from "mongoose";

// Package pricing configuration
const PACKAGE_PRICES = {
  silver: {
    1: 3000,   // 1 month
    3: 279000,  // 3 months (5% discount)
    6: 534000,  // 6 months (10% discount)
    12: 1009000 // 12 months (15% discount)
  },
  gold: {
    1: 199000,   // 1 month
    3: 567000,   // 3 months (5% discount)
    6: 1074000,  // 6 months (10% discount)
    12: 2029000  // 12 months (15% discount)
  },
  diamond: {
    1: 299000,   // 1 month
    3: 854000,   // 3 months (5% discount)
    6: 1614000,  // 6 months (10% discount)
    12: 3050000  // 12 months (15% discount)
  }
};

// Package benefits configuration
const PACKAGE_BENEFITS = {
  free: {
    scheduleLimit: 0,
    isPriority: false,
    description: "Gói miễn phí - Không thể đặt lịch"
  },
  silver: {
    scheduleLimit: 5,
    isPriority: false,
    description: "Gói Bạc - 5 lịch hẹn/tuần"
  },
  gold: {
    scheduleLimit: 10,
    isPriority: false,
    description: "Gói Vàng - 10 lịch hẹn/tuần"
  },
  diamond: {
    scheduleLimit: 20,
    isPriority: true,
    description: "Gói Kim Cương - 20 lịch hẹn/tuần + Ưu tiên hiển thị"
  }
};

// Generate unique order code
const generateOrderCode = () => {
  return Math.floor(Date.now() / 1000);
};

// Create payment link for doctor subscription package
export const createPackagePayment = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const { packageType, duration } = req.body;

    // Validate input
    if (!packageType || !duration) {
      return res.status(400).json({
        message: "Vui lòng chọn gói và thời hạn",
      });
    }

    // Validate package type
    if (!["silver", "gold", "diamond"].includes(packageType)) {
      return res.status(400).json({
        message: "Gói không hợp lệ. Chọn: silver, gold, hoặc diamond",
      });
    }

    // Validate duration
    if (![1, 3, 6, 12].includes(duration)) {
      return res.status(400).json({
        message: "Thời hạn không hợp lệ. Chọn: 1, 3, 6, hoặc 12 tháng",
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Bác sĩ không tồn tại" });
    }

    // Check if doctor is verified
    if (doctor.doctorApplicationStatus !== "accepted") {
      return res.status(403).json({
        message: "Chỉ bác sĩ đã được duyệt mới có thể mua gói",
      });
    }

    // Get package price
    const amount = PACKAGE_PRICES[packageType][duration];
    if (!amount) {
      return res.status(400).json({
        message: "Không tìm thấy giá cho gói này",
      });
    }

    // Generate order code
    const orderCode = generateOrderCode();

    // Create short description (max 25 characters for PayOS)
    const packageNames = {
      silver: "Bac",
      gold: "Vang", 
      diamond: "KC"
    };
    
    // Short description for PayOS (max 25 chars)
    const shortDescription = `Goi ${packageNames[packageType]} ${duration}T`;
    
    // Full description for database
    const fullDescription = `Gói ${packageType === 'silver' ? 'Bạc' : packageType === 'gold' ? 'Vàng' : 'Kim Cương'} - ${duration} tháng - Dr. ${doctor.fullName}`;

    // Create payment record in database
    const payment = new Payment({
      doctorId,
      orderCode,
      amount,
      description: fullDescription, // Store full description in DB
      packageType,
      packageDuration: duration,
      status: "PENDING",
    });

    // PayOS payment data with short description
    const paymentData = {
      orderCode: orderCode,
      amount: amount,
      description: shortDescription, // Use short description for PayOS
      returnUrl: `${process.env.CLIENT_URL}/doctor/payment/success`,
      cancelUrl: `${process.env.CLIENT_URL}/doctor/payment/cancel`,
    };

    // Create payment link with PayOS
    const paymentLinkResponse = await payOS.createPaymentLink(paymentData);

    // Update payment record with payment URL
    payment.paymentUrl = paymentLinkResponse.checkoutUrl;
    await payment.save();

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
      },
      packageInfo: PACKAGE_BENEFITS[packageType],
    });
  } catch (error) {
    console.error("PayOS Error:", error);
    res.status(500).json({ 
      message: "Lỗi tạo thanh toán",
      error: error.message 
    });
  }
};

// Handle PayOS webhook for package payments
export const handlePackagePaymentWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature (recommended for production)
    const signature = req.headers["x-payos-signature"];
    
    if (webhookData.code === "00") {
      // Payment successful
      const orderCode = webhookData.data.orderCode;
      
      // Find payment record
      const payment = await Payment.findOne({ orderCode });
      if (!payment) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      // Update payment status
      payment.status = "PAID";
      payment.transactionId = webhookData.data.transactionDateTime;
      payment.paidAt = new Date();
      await payment.save();

      // Update doctor subscription
      const doctor = await Doctor.findById(payment.doctorId);
      if (doctor) {
        const now = new Date();
        const startDate = doctor.subscriptionEndDate && doctor.subscriptionEndDate > now 
          ? doctor.subscriptionEndDate 
          : now;
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + payment.packageDuration);

        // Update doctor subscription
        doctor.subscriptionPackage = payment.packageType;
        doctor.subscriptionStartDate = startDate;
        doctor.subscriptionEndDate = endDate;
        
        // Update benefits based on package
        const benefits = PACKAGE_BENEFITS[payment.packageType];
        doctor.scheduleLimits.weekly = benefits.scheduleLimit;
        doctor.scheduleLimits.used = 0; // Reset weekly usage
        doctor.scheduleLimits.resetDate = getNextWeekReset();
        doctor.isPriority = benefits.isPriority;
        
        await doctor.save();
      }

      console.log(`Package payment successful for order ${orderCode}`);
    } else {
      // Payment failed or cancelled
      const orderCode = webhookData.data.orderCode;
      
      const payment = await Payment.findOne({ orderCode });
      if (payment) {
        payment.status = "CANCELLED";
        payment.cancelledAt = new Date();
        await payment.save();
      }

      console.log(`Package payment failed for order ${orderCode}`);
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
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

    // Find payment record
    const payment = await Payment.findOne({ 
      orderCode: parseInt(orderCode),
      doctorId 
    });

    if (!payment) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Get payment info from PayOS
    try {
      const paymentInfo = await payOS.getPaymentLinkInformation(parseInt(orderCode));
      
      // Update payment status based on PayOS response
      if (paymentInfo.status === "PAID" && payment.status !== "PAID") {
        payment.status = "PAID";
        payment.paidAt = new Date();
        await payment.save();

        // Update doctor subscription
        const doctor = await Doctor.findById(payment.doctorId);
        if (doctor) {
          const now = new Date();
          const startDate = doctor.subscriptionEndDate && doctor.subscriptionEndDate > now 
            ? doctor.subscriptionEndDate 
            : now;
          
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + payment.packageDuration);

          // Update doctor subscription
          doctor.subscriptionPackage = payment.packageType;
          doctor.subscriptionStartDate = startDate;
          doctor.subscriptionEndDate = endDate;
          
          // Update benefits based on package
          const benefits = PACKAGE_BENEFITS[payment.packageType];
          doctor.scheduleLimits.weekly = benefits.scheduleLimit;
          doctor.scheduleLimits.used = 0; // Reset weekly usage
          doctor.scheduleLimits.resetDate = getNextWeekReset();
          doctor.isPriority = benefits.isPriority;
          
          await doctor.save();
        }
      } else if (paymentInfo.status === "CANCELLED") {
        payment.status = "CANCELLED";
        payment.cancelledAt = new Date();
        await payment.save();
      } else if (paymentInfo.status === "EXPIRED") {
        payment.status = "EXPIRED";
        payment.expiredAt = new Date();
        await payment.save();
      }
    } catch (payOSError) {
      console.log("PayOS API Error:", payOSError.message);
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
        expiredAt: payment.expiredAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Check Package Payment Error:", error);
    res.status(500).json({ 
      message: "Lỗi kiểm tra trạng thái thanh toán gói",
      error: error.message 
    });
  }
};

// Get doctor's package payment history
export const getDoctorPaymentHistory = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { doctorId };
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
      .select("-paymentUrl");

    const totalPayments = await Payment.countDocuments(query);

    res.status(200).json({
      message: "Lấy lịch sử thanh toán gói thành công",
      payments,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(totalPayments / options.limit),
        totalPayments,
        limit: options.limit,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy lịch sử thanh toán gói",
      error: error.message 
    });
  }
};

// Cancel package payment (if still pending)
export const cancelPackagePayment = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const doctorId = req.doctor._id;

    // Find payment record
    const payment = await Payment.findOne({ 
      orderCode: parseInt(orderCode),
      doctorId,
      status: "PENDING"
    });

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
      await payment.save();

      res.status(200).json({
        message: "Hủy thanh toán gói thành công",
        payment: {
          orderCode: payment.orderCode,
          status: payment.status,
          cancelledAt: payment.cancelledAt,
        },
      });
    } catch (payOSError) {
      console.error("PayOS Cancel Error:", payOSError);
      res.status(400).json({ 
        message: "Không thể hủy thanh toán trên PayOS",
        error: payOSError.message 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi hủy thanh toán gói",
      error: error.message 
    });
  }
};

// Get available packages and pricing
export const getPackages = async (req, res) => {
  try {
    const packages = Object.keys(PACKAGE_PRICES).map(packageType => ({
      type: packageType,
      name: packageType === 'silver' ? 'Gói Bạc' : 
            packageType === 'gold' ? 'Gói Vàng' : 'Gói Kim Cương',
      benefits: PACKAGE_BENEFITS[packageType],
      pricing: PACKAGE_PRICES[packageType],
    }));

    res.status(200).json({
      message: "Lấy danh sách gói thành công",
      packages,
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy danh sách gói",
      error: error.message 
    });
  }
};
