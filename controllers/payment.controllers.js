import payOS from "../config/payos.js";
import Payment from "../models/payment.models.js";
import User from "../models/User/user.models.js";
import mongoose from "mongoose";

// Generate unique order code
const generateOrderCode = () => {
  return Math.floor(Date.now() / 1000);
};

// Create payment link
export const createPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, description } = req.body;

    // Validate input
    if (!amount || !description) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ số tiền và mô tả",
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

    // Generate order code
    const orderCode = generateOrderCode();

    // Create payment record in database
    const payment = new Payment({
      userId,
      orderCode,
      amount,
      description,
      status: "PENDING",
    });

    // PayOS payment data
    const paymentData = {
      orderCode: orderCode,
      amount: amount,
      description: description,
      returnUrl: `${process.env.CLIENT_URL}/payment/success`,
      cancelUrl: `${process.env.CLIENT_URL}/payment/cancel`,
    };

    // Create payment link with PayOS
    const paymentLinkResponse = await payOS.createPaymentLink(paymentData);

    // Update payment record with payment URL
    payment.paymentUrl = paymentLinkResponse.checkoutUrl;
    await payment.save();

    res.status(200).json({
      message: "Tạo liên kết thanh toán thành công",
      payment: {
        orderCode: payment.orderCode,
        amount: payment.amount,
        description: payment.description,
        paymentUrl: payment.paymentUrl,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("PayOS Error:", error);
    res.status(500).json({ 
      message: "Lỗi tạo thanh toán",
      error: error.message 
    });
  }
};

// Handle PayOS webhook
export const handlePayOSWebhook = async (req, res) => {
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

      // Update user balance
      const user = await User.findById(payment.userId);
      if (user) {
        user.balance += payment.amount;
        await user.save();
      }

      console.log(`Payment successful for order ${orderCode}`);
    } else {
      // Payment failed or cancelled
      const orderCode = webhookData.data.orderCode;
      
      const payment = await Payment.findOne({ orderCode });
      if (payment) {
        payment.status = "CANCELLED";
        payment.cancelledAt = new Date();
        await payment.save();
      }

      console.log(`Payment failed for order ${orderCode}`);
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};

// Check payment status
export const checkPaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req.user._id;

    // Find payment record
    const payment = await Payment.findOne({ 
      orderCode: parseInt(orderCode),
      userId 
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

        // Update user balance
        const user = await User.findById(payment.userId);
        if (user) {
          user.balance += payment.amount;
          await user.save();
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
      message: "Lấy thông tin thanh toán thành công",
      payment: {
        orderCode: payment.orderCode,
        amount: payment.amount,
        description: payment.description,
        status: payment.status,
        paymentUrl: payment.paymentUrl,
        paidAt: payment.paidAt,
        cancelledAt: payment.cancelledAt,
        expiredAt: payment.expiredAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Check Payment Error:", error);
    res.status(500).json({ 
      message: "Lỗi kiểm tra trạng thái thanh toán",
      error: error.message 
    });
  }
};

// Get user's payment history
export const getPaymentHistory = async (req, res) => {
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
      .select("-paymentUrl");

    const totalPayments = await Payment.countDocuments(query);

    res.status(200).json({
      message: "Lấy lịch sử thanh toán thành công",
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
      message: "Lỗi lấy lịch sử thanh toán",
      error: error.message 
    });
  }
};

// Cancel payment (if still pending)
export const cancelPayment = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const userId = req.user._id;

    // Find payment record
    const payment = await Payment.findOne({ 
      orderCode: parseInt(orderCode),
      userId,
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
        message: "Hủy thanh toán thành công",
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
      message: "Lỗi hủy thanh toán",
      error: error.message 
    });
  }
};
