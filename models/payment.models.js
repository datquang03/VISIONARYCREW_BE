import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderCode: {
      type: Number,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 2000, // Minimum amount for PayOS
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "CANCELLED", "EXPIRED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      default: "PayOS",
    },
    paymentUrl: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    expiredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
