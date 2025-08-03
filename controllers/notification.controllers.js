import Notification from "../models/notification.models.js";

// Tạo thông báo mới
export const createNotification = async (req, res) => {
  try {
    // Lấy userId từ user, doctor hoặc admin đang đăng nhập
    const userId = req.user?._id || req.doctor?._id || req.admin?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const { type, message, scheduleId, cancelReason } = req.body;
    
    const notification = new Notification({
      userId,
      type,
      message,
      scheduleId,
      cancelReason,
      read: false
    });

    const savedNotification = await notification.save();
    res.status(201).json({ notification: savedNotification });
  } catch (error) {
    res.status(500).json({ message: "Lỗi tạo thông báo", error: error.message });
  }
};

// Lấy danh sách thông báo của user (mới nhất trước)
export const getNotifications = async (req, res) => {
  try {
    // Lấy userId từ user, doctor hoặc admin đang đăng nhập
    const userId = req.user?._id || req.doctor?._id || req.admin?._id;
    
    console.log('🔍 Debug getNotifications:', {
      user: req.user?._id,
      doctor: req.doctor?._id,
      admin: req.admin?._id,
      finalUserId: userId
    });
    
    if (!userId) {
      return res.status(401).json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 });
    
    console.log('🔍 Debug notifications found:', notifications.length);
    
    res.json({ notifications });
  } catch (error) {
    console.error('🔍 Debug getNotifications error:', error);
    res.status(500).json({ message: "Lỗi lấy thông báo", error: error.message });
  }
};

// Đánh dấu đã đọc
export const markNotificationRead = async (req, res) => {
  try {
    // Lấy userId từ user, doctor hoặc admin đang đăng nhập
    const userId = req.user?._id || req.doctor?._id || req.admin?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Không tìm thấy thông báo" });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật thông báo", error: error.message });
  }
};

// Xoá thông báo
export const deleteNotification = async (req, res) => {
  try {
    // Lấy userId từ user, doctor hoặc admin đang đăng nhập
    const userId = req.user?._id || req.doctor?._id || req.admin?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({ _id: id, userId });
    if (!notification) return res.status(404).json({ message: "Không tìm thấy thông báo" });
    res.json({ message: "Đã xoá thông báo" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xoá thông báo", error: error.message });
  }
};

// Xoá tất cả thông báo
export const deleteAllNotification = async (req, res) => {
  try {
    // Lấy userId từ user, doctor hoặc admin đang đăng nhập
    const userId = req.user?._id || req.doctor?._id || req.admin?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Không tìm thấy thông tin người dùng" });
    }

    await Notification.deleteMany({ userId });
    res.json({ message: "Đã xoá tất cả thông báo" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xoá tất cả thông báo", error: error.message });
  }
}; 