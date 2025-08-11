import Feedback from "../models/feedback.models.js";
import Schedule from "../models/Schedule/schedule.models.js";
import Notification from "../models/notification.models.js";
import { io } from "../server.js";

export const createFeedback = async (req, res) => {
  try {

    
    const { scheduleId, rating, comment, isAnonymous } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: "Người dùng chưa đăng nhập" });
    }
    
    const patientId = req.user._id;

    // Check if schedule exists and belongs to the patient
    const schedule = await Schedule.findById(scheduleId).populate('doctor');
    if (!schedule) {
      return res.status(404).json({ message: "Lịch hẹn không tồn tại" });
    }


    
    if (String(schedule.patient) !== String(patientId)) {
      return res.status(403).json({ message: "Bạn không có quyền đánh giá lịch hẹn này" });
    }

    if (schedule.status !== 'completed') {
      return res.status(400).json({ message: "Chỉ có thể đánh giá lịch hẹn đã hoàn thành" });
    }

    // Check if feedback already exists for this schedule
    const existingFeedback = await Feedback.findOne({ schedule: scheduleId });
    if (existingFeedback) {
      return res.status(400).json({ message: "Bạn đã đánh giá lịch hẹn này rồi" });
    }

    const feedback = new Feedback({
      schedule: scheduleId,
      doctor: schedule.doctor._id,
      patient: patientId,
      rating,
      comment: comment?.trim() || '',
      isAnonymous: isAnonymous || false
    });

    await feedback.save();

    // Create notification for doctor
    const doctorNotification = new Notification({
      userId: schedule.doctor._id,
      type: "feedback_received",
      message: `Bạn có đánh giá mới từ bệnh nhân với ${rating} sao`,
      data: { feedbackId: feedback._id, rating: rating }
    });
    await doctorNotification.save();

    // Emit socket notification to doctor
    io && io.to(schedule.doctor._id.toString()).emit("notification", { type: "feedback_received" });

    res.status(201).json({ 
      message: "Đánh giá đã được gửi thành công", 
      feedback 
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ 
      message: "Có lỗi xảy ra khi tạo đánh giá",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getFeedbackBySchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const feedback = await Feedback.findOne({ schedule: scheduleId })
      .populate('patient', 'username')
      .populate('doctor', 'username')
      .populate('schedule', 'date timeSlot');

    if (!feedback) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá cho lịch hẹn này" });
    }

    res.status(200).json({ feedback });
  } catch (error) {
    console.error('Error getting feedback by schedule:', error);
    res.status(500).json({ message: "Có lỗi xảy ra khi lấy đánh giá" });
  }
};

export const getDoctorFeedback = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const feedback = await Feedback.find({ doctor: doctorId })
      .populate('patient', 'username')
      .populate('schedule', 'date timeSlot')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments({ doctor: doctorId });

    res.status(200).json({
      feedback,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error getting doctor feedback:', error);
    res.status(500).json({ message: "Có lỗi xảy ra khi lấy đánh giá" });
  }
};

export const getDoctorFeedbackStats = async (req, res) => {
  try {
    const doctorId = req.doctor._id;

    const stats = await Feedback.aggregate([
      { $match: { doctor: doctorId } },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] }
          },
          lowRatingCount: {
            $sum: { $cond: [{ $lte: ["$rating", 2] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalFeedback: 0,
      averageRating: 0,
      fiveStarCount: 0,
      lowRatingCount: 0
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting doctor feedback stats:', error);
    res.status(500).json({ message: "Có lỗi xảy ra khi lấy thống kê đánh giá" });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, doctorId } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (rating) {
      filter.rating = parseInt(rating);
    }
    if (doctorId) {
      filter.doctor = doctorId;
    }

    const feedback = await Feedback.find(filter)
      .populate('patient', 'username')
      .populate('doctor', 'username')
      .populate('schedule', 'date timeSlot')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(filter);

    // Get stats for all feedback
    const stats = await Feedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] }
          },
          lowRatingCount: {
            $sum: { $cond: [{ $lte: ["$rating", 2] }, 1, 0] }
          }
        }
      }
    ]);

    const resultStats = stats[0] || {
      totalFeedback: 0,
      averageRating: 0,
      fiveStarCount: 0,
      lowRatingCount: 0
    };

    res.status(200).json({
      feedback,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      ...resultStats
    });
  } catch (error) {
    console.error('Error getting all feedback:', error);
    res.status(500).json({ message: "Có lỗi xảy ra khi lấy đánh giá" });
  }
}; 