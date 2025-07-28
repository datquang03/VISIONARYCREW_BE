import OpenAI from 'openai';
import AIGuide from '../models/aiGuide.models.js';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Website knowledge base
const WEBSITE_KNOWLEDGE = {
  user: {
    features: [
      "Đặt lịch hẹn với bác sĩ",
      "Xem lịch sử đặt lịch",
      "Quản lý thông tin cá nhân",
      "Thanh toán online",
      "Nhận thông báo qua email",
      "Xem chi tiết lịch hẹn",
      "Huỷ lịch hẹn"
    ],
    pages: [
      "Trang chủ - Giới thiệu dịch vụ",
      "Đặt lịch - Chọn bác sĩ và thời gian",
      "Hồ sơ - Quản lý thông tin cá nhân",
      "Lịch sử - Xem các lịch hẹn đã đặt"
    ]
  },
  doctor: {
    features: [
      "Tạo lịch rảnh",
      "Xem lịch đã đặt",
      "Quản lý hồ sơ bác sĩ",
      "Xem yêu cầu đăng ký",
      "Thanh toán gói dịch vụ",
      "Nhận thông báo từ bệnh nhân"
    ],
    pages: [
      "Dashboard - Tổng quan",
      "Tạo lịch - Đăng ký thời gian rảnh",
      "Hồ sơ - Cập nhật thông tin",
      "Thanh toán - Mua gói dịch vụ"
    ]
  },
  admin: {
    features: [
      "Quản lý bác sĩ",
      "Quản lý người dùng",
      "Xét duyệt đăng ký bác sĩ",
      "Xem thống kê hệ thống",
      "Quản lý thanh toán"
    ],
    pages: [
      "Dashboard - Tổng quan hệ thống",
      "Bác sĩ - Quản lý danh sách bác sĩ",
      "Người dùng - Quản lý người dùng",
      "Đăng ký - Xét duyệt đơn đăng ký"
    ]
  }
};

// System prompts for different roles
const SYSTEM_PROMPTS = {
  user: `Bạn là trợ lý AI hướng dẫn sử dụng website đặt lịch khám bệnh. 
  
  Website này cho phép người dùng:
  - Đặt lịch hẹn với bác sĩ
  - Xem lịch sử đặt lịch
  - Quản lý thông tin cá nhân
  - Thanh toán online
  - Nhận thông báo qua email
  
  Hãy trả lời bằng tiếng Việt, ngắn gọn và hữu ích. 
  Nếu người dùng gặp khó khăn, hãy hướng dẫn từng bước cụ thể.`,
  
  doctor: `Bạn là trợ lý AI hướng dẫn bác sĩ sử dụng website quản lý lịch khám. 
  
  Website này cho phép bác sĩ:
  - Tạo lịch rảnh để bệnh nhân đặt
  - Xem lịch đã được đặt
  - Quản lý hồ sơ bác sĩ
  - Xem yêu cầu đăng ký
  - Thanh toán gói dịch vụ
  
  Hãy trả lời bằng tiếng Việt, ngắn gọn và hữu ích. 
  Hướng dẫn bác sĩ cách sử dụng các tính năng một cách chi tiết.`,
  
  admin: `Bạn là trợ lý AI hướng dẫn admin quản lý hệ thống đặt lịch khám. 
  
  Website này cho phép admin:
  - Quản lý danh sách bác sĩ
  - Quản lý người dùng
  - Xét duyệt đăng ký bác sĩ
  - Xem thống kê hệ thống
  - Quản lý thanh toán
  
  Hãy trả lời bằng tiếng Việt, ngắn gọn và hữu ích. 
  Hướng dẫn admin cách quản lý hệ thống hiệu quả.`
};

class AIService {
  constructor() {
    this.openai = openai;
  }

  // Get or create AI guide for user
  async getOrCreateAIGuide(userId, userRole) {
    let aiGuide = await AIGuide.findOne({ userId, isActive: true });
    
    if (!aiGuide) {
      aiGuide = new AIGuide({
        userId,
        userRole,
        currentContext: {
          sessionStartTime: new Date(),
        },
      });
      await aiGuide.save();
    }
    
    return aiGuide;
  }

  // Generate AI response
  async generateResponse(userId, userRole, userMessage, context = {}) {
    try {
      const aiGuide = await this.getOrCreateAIGuide(userId, userRole);
      
      // Add user message to conversation history
      await aiGuide.addMessage('user', userMessage, context);
      
      // Get recent conversation for context
      const recentConversation = aiGuide.getRecentConversation(10);
      
      // Prepare conversation for OpenAI
      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPTS[userRole] || SYSTEM_PROMPTS.user
        },
        ...recentConversation.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Generate response from OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;
      
      // Add AI response to conversation history
      await aiGuide.addMessage('assistant', aiResponse, context);
      
      // Update current context
      await aiGuide.updateContext({
        lastAction: userMessage,
        currentPage: context.currentPage || aiGuide.currentContext.currentPage,
      });

      return {
        response: aiResponse,
        conversationId: aiGuide._id,
        context: aiGuide.currentContext,
      };
      
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Không thể tạo phản hồi AI. Vui lòng thử lại sau.');
    }
  }

  // Get quick help suggestions based on current page
  async getQuickHelp(userId, userRole, currentPage) {
    const pageHelp = {
      '/booking': 'Hướng dẫn đặt lịch hẹn với bác sĩ',
      '/profile': 'Hướng dẫn quản lý thông tin cá nhân',
      '/doctor/booking': 'Hướng dẫn tạo lịch rảnh cho bác sĩ',
      '/doctor/pending': 'Hướng dẫn xem yêu cầu đăng ký',
      '/admin/doctors': 'Hướng dẫn quản lý bác sĩ',
      '/admin/users': 'Hướng dẫn quản lý người dùng',
    };

    const suggestions = [
      'Làm thế nào để đặt lịch hẹn?',
      'Cách huỷ lịch hẹn?',
      'Làm sao để cập nhật thông tin?',
      'Cách xem lịch sử đặt lịch?',
    ];

    if (pageHelp[currentPage]) {
      suggestions.unshift(pageHelp[currentPage]);
    }

    return suggestions;
  }

  // Get user statistics
  async getUserStats(userId) {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    return aiGuide ? aiGuide.statistics : null;
  }

  // Reset conversation history
  async resetConversation(userId) {
    const aiGuide = await AIGuide.findOne({ userId, isActive: true });
    if (aiGuide) {
      aiGuide.conversationHistory = [];
      aiGuide.currentContext = {
        sessionStartTime: new Date(),
      };
      await aiGuide.save();
    }
    return true;
  }
}

export default new AIService(); 