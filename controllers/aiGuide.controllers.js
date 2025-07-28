import asyncHandler from "express-async-handler";
import aiService from "../utils/mockAIService.js";
import AIGuide from "../models/aiGuide.models.js";

// Helper function to get current user info
const getCurrentUser = (req) => {
  const currentUser = req.user || req.doctor;
  return {
    userId: currentUser._id,
    userRole: currentUser.role || 'user'
  };
};

// @desc    Send message to AI and get response
// @route   POST /api/ai/chat
// @access  Private
export const chatWithAI = asyncHandler(async (req, res) => {
  const { message, currentPage, userAction } = req.body;
  const { userId, userRole } = getCurrentUser(req);

  if (!message || !message.trim()) {
    return res.status(400).json({
      message: "Vui lòng nhập tin nhắn"
    });
  }

  try {
    const context = {
      currentPage: currentPage || '/',
      userAction: userAction || 'chat',
      systemState: 'active'
    };

    const result = await aiService.generateResponse(userId, userRole, message, context);

    res.status(200).json({
      message: "Phản hồi AI thành công",
      data: {
        response: result.response,
        conversationId: result.conversationId,
        context: result.context,
        navigation: result.navigation || null,
        suggestNavigation: result.suggestNavigation || null, // Add suggestNavigation
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Lỗi khi tạo phản hồi AI",
      error: error.message
    });
  }
});

// @desc    Get quick help suggestions
// @route   GET /api/ai/quick-help
// @access  Private
export const getQuickHelp = asyncHandler(async (req, res) => {
  const { currentPage } = req.query;
  const { userId, userRole } = getCurrentUser(req);

  try {
    const suggestions = await aiService.getQuickHelp(userId, userRole, currentPage);

    res.status(200).json({
      message: "Lấy gợi ý trợ giúp thành công",
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy gợi ý trợ giúp",
      error: error.message
    });
  }
});

// @desc    Get user AI statistics
// @route   GET /api/ai/stats
// @access  Private
export const getUserAIStats = asyncHandler(async (req, res) => {
  const { userId } = getCurrentUser(req);

  try {
    const stats = await aiService.getUserStats(userId);

    res.status(200).json({
      message: "Lấy thống kê AI thành công",
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy thống kê AI",
      error: error.message
    });
  }
});

// @desc    Reset conversation history
// @route   POST /api/ai/reset
// @access  Private
export const resetConversation = asyncHandler(async (req, res) => {
  const { userId } = getCurrentUser(req);

  try {
    await aiService.resetConversation(userId);

    res.status(200).json({
      message: "Đặt lại cuộc trò chuyện thành công"
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi đặt lại cuộc trò chuyện",
      error: error.message
    });
  }
});

// @desc    Get conversation history
// @route   GET /api/ai/history
// @access  Private
export const getConversationHistory = asyncHandler(async (req, res) => {
  const { userId } = getCurrentUser(req);
  const { limit = 20 } = req.query;

  try {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    
    if (!aiGuide) {
      return res.status(200).json({
        message: "Không có lịch sử trò chuyện",
        data: []
      });
    }

    const history = aiGuide.conversationHistory
      .slice(-parseInt(limit))
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        context: msg.context
      }));

    res.status(200).json({
      message: "Lấy lịch sử trò chuyện thành công",
      data: history
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy lịch sử trò chuyện",
      error: error.message
    });
  }
});

// @desc    Update AI preferences
// @route   PUT /api/ai/preferences
// @access  Private
export const updateAIPreferences = asyncHandler(async (req, res) => {
  const { userId } = getCurrentUser(req);
  const { language, guideLevel, enableNotifications } = req.body;

  try {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    
    if (!aiGuide) {
      return res.status(404).json({
        message: "Không tìm thấy cài đặt AI"
      });
    }

    if (language) aiGuide.preferences.language = language;
    if (guideLevel) aiGuide.preferences.guideLevel = guideLevel;
    if (typeof enableNotifications === 'boolean') {
      aiGuide.preferences.enableNotifications = enableNotifications;
    }

    await aiGuide.save();

    res.status(200).json({
      message: "Cập nhật cài đặt AI thành công",
      data: aiGuide.preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi cập nhật cài đặt AI",
      error: error.message
    });
  }
});

// @desc    Get AI preferences
// @route   GET /api/ai/preferences
// @access  Private
export const getAIPreferences = asyncHandler(async (req, res) => {
  const { userId } = getCurrentUser(req);

  try {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    
    if (!aiGuide) {
      return res.status(200).json({
        message: "Không có cài đặt AI",
        data: {
          language: 'vi',
          guideLevel: 'beginner',
          enableNotifications: true
        }
      });
    }

    res.status(200).json({
      message: "Lấy cài đặt AI thành công",
      data: aiGuide.preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy cài đặt AI",
      error: error.message
    });
  }
});

// @desc    Toggle AI guide on/off
// @route   PUT /api/ai/toggle
// @access  Private
export const toggleAIGuide = asyncHandler(async (req, res) => {
  const { userId } = getCurrentUser(req);
  const { isActive } = req.body;

  try {
    const aiGuide = await AIGuide.findOne({ userId });
    
    if (!aiGuide) {
      return res.status(404).json({
        message: "Không tìm thấy cài đặt AI"
      });
    }

    aiGuide.isActive = typeof isActive === 'boolean' ? isActive : !aiGuide.isActive;
    await aiGuide.save();

    res.status(200).json({
      message: `${aiGuide.isActive ? 'Bật' : 'Tắt'} AI guide thành công`,
      data: { isActive: aiGuide.isActive }
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi thay đổi trạng thái AI guide",
      error: error.message
    });
  }
}); 

// @desc    Get database statistics and doctor information
// @route   GET /api/ai/database-stats
// @access  Private
export const getDatabaseStats = asyncHandler(async (req, res) => {
  try {
    // Import models
    const User = (await import('../models/User/user.models.js')).default;
    const Doctor = (await import('../models/User/doctor.models.js')).default;
    const Schedule = (await import('../models/Schedule/schedule.models.js')).default;

    // Get counts
    const totalUsers = await User.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    const totalSchedules = await Schedule.countDocuments();
    
    // Get doctor specialties
    const doctors = await Doctor.find({}, 'doctorType fullName email phone doctorApplicationStatus');
    const specialties = [...new Set(doctors.map(doc => doc.doctorType).filter(spec => spec))];
    
    // Get active doctors (accepted)
    const activeDoctors = doctors.filter(doc => doc.doctorApplicationStatus === 'accepted');
    
    // Group doctors by specialty
    const doctorsBySpecialty = {};
    activeDoctors.forEach(doctor => {
      if (!doctorsBySpecialty[doctor.doctorType]) {
        doctorsBySpecialty[doctor.doctorType] = [];
      }
      doctorsBySpecialty[doctor.doctorType].push({
        name: doctor.fullName,
        email: doctor.email,
        phone: doctor.phone
      });
    });

    res.status(200).json({
      message: "Thống kê database thành công",
      data: {
        totalUsers,
        totalDoctors,
        totalSchedules,
        specialties,
        activeDoctorsCount: activeDoctors.length,
        doctorsBySpecialty
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi khi lấy thống kê database",
      error: error.message
    });
  }
}); 