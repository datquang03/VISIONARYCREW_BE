import Schedule from "../models/Schedule/schedule.models.js";
import Doctor from "../models/User/doctor.models.js";
import sendEmail from "../utils/sendEmail.js";
import { sendRegisterEmail, sendCancelEmail, sendRejectEmail } from "../utils/sendEmail.js";
import Notification from "../models/notification.models.js";
import { io } from "../server.js";
import User from '../models/User/user.models.js';

// Create a new schedule slot
export const createSchedule = async (req, res) => {
  try {
    const { date, timeSlot, appointmentType, notes, meetingLink } = req.body;
    const doctorId = req.doctor._id; // Get doctor ID from authenticated doctor

    // Validate time slot format and duration
    if (!timeSlot || !timeSlot.startTime || !timeSlot.endTime) {
      return res.status(400).json({
        message: "Thời gian bắt đầu và kết thúc là bắt buộc"
      });
    }

    // Convert time strings to Date objects for comparison
    const [startHour, startMinute] = timeSlot.startTime.split(':').map(Number);
    const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);

    // Calculate duration in minutes
    const durationInMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

    // Validate time format and logical sequence
    if (durationInMinutes <= 0) {
      return res.status(400).json({
        message: "Thời gian kết thúc phải sau thời gian bắt đầu"
      });
    }

    // Validate minimum duration (1 hour = 60 minutes)
    if (durationInMinutes < 60) {
      return res.status(400).json({
        message: "Thời gian hẹn phải ít nhất 1 giờ"
      });
    }

    // Check for overlapping schedules
    const [newStartHour, newStartMin] = timeSlot.startTime.split(':').map(Number);
    const [newEndHour, newEndMin] = timeSlot.endTime.split(':').map(Number);
    const newStartMinutes = newStartHour * 60 + newStartMin;
    const newEndMinutes = newEndHour * 60 + newEndMin;

    const existingSchedule = await Schedule.findOne({
      doctor: doctorId,
      date: new Date(date),
      $or: [
        // Case 1: New slot starts during an existing slot
        {
          $expr: {
            $and: [
              {
                $lte: [
                  { $sum: [
                    { $multiply: [{ $toInt: { $substr: ['$timeSlot.startTime', 0, 2] } }, 60] },
                    { $toInt: { $substr: ['$timeSlot.startTime', 3, 2] } }
                  ]},
                  newStartMinutes
                ]
              },
              {
                $gt: [
                  { $sum: [
                    { $multiply: [{ $toInt: { $substr: ['$timeSlot.endTime', 0, 2] } }, 60] },
                    { $toInt: { $substr: ['$timeSlot.endTime', 3, 2] } }
                  ]},
                  newStartMinutes
                ]
              }
            ]
          }
        },
        // Case 2: New slot ends during an existing slot
        {
          $expr: {
            $and: [
              {
                $lt: [
                  { $sum: [
                    { $multiply: [{ $toInt: { $substr: ['$timeSlot.startTime', 0, 2] } }, 60] },
                    { $toInt: { $substr: ['$timeSlot.startTime', 3, 2] } }
                  ]},
                  newEndMinutes
                ]
              },
              {
                $gte: [
                  { $sum: [
                    { $multiply: [{ $toInt: { $substr: ['$timeSlot.endTime', 0, 2] } }, 60] },
                    { $toInt: { $substr: ['$timeSlot.endTime', 3, 2] } }
                  ]},
                  newEndMinutes
                ]
              }
            ]
          }
        },
        // Case 3: New slot completely contains an existing slot
        {
          $expr: {
            $and: [
              {
                $gte: [
                  { $sum: [
                    { $multiply: [{ $toInt: { $substr: ['$timeSlot.startTime', 0, 2] } }, 60] },
                    { $toInt: { $substr: ['$timeSlot.startTime', 3, 2] } }
                  ]},
                  newStartMinutes
                ]
              },
              {
                $lte: [
                  { $sum: [
                    { $multiply: [{ $toInt: { $substr: ['$timeSlot.endTime', 0, 2] } }, 60] },
                    { $toInt: { $substr: ['$timeSlot.endTime', 3, 2] } }
                  ]},
                  newEndMinutes
                ]
              }
            ]
          }
        }
      ]
    });

    if (existingSchedule) {
      return res.status(400).json({ 
        message: "Thời gian này đã chồng chéo với một lịch hẹn khác của bạn" 
      });
    }

    // Create new schedule
    const schedule = new Schedule({
      doctor: doctorId,
      date,
      timeSlot,
      appointmentType,
      notes,
      meetingLink
    });

    await schedule.save();

    res.status(201).json({
      message: "Tạo lịch hẹn thành công",
      schedule
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi tạo lịch hẹn", 
      error: error.message 
    });
  }
};

// Get logged-in doctor's schedules
export const getMySchedules = async (req, res) => {
  try {
    const doctorId = req.doctor._id;
    const schedules = await Schedule.find({ doctor: doctorId })
      .populate({ path: 'patient', select: 'username' });

    res.status(200).json({
      message: `Có tổng ${schedules.length} lịch hẹn của bạn`,
      schedules: schedules.map(sch => ({
        ...sch.toObject(),
        patientUsername: sch.patient ? sch.patient.username : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get specific doctor's schedules by ID
export const getDoctorSchedules = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!doctorId) {
      return res.status(400).json({ message: "Cần Id bác sĩ" });
    }

    const { date, status } = req.query;

    let query = { doctor: doctorId };

    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const schedules = await Schedule.find(query)
      .sort({ date: 1, 'timeSlot.startTime': 1 });

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy lịch hẹn", 
      error: error.message 
    });
  }
};

// Update schedule
export const updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const doctorId = req.doctor._id;
    const updates = req.body;

    // Find schedule and check ownership
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      doctor: doctorId
    });

    if (!schedule) {
      return res.status(404).json({ 
        message: "Không tìm thấy lịch hẹn hoặc không có quyền truy cập" 
      });
    }

    if (schedule.status !== "available") {
      return res.status(400).json({ 
        message: "Không thể cập nhật lịch đã được đặt hoặc hoàn thành" 
      });
    }

    // Update schedule with allowed fields only
    const allowedUpdates = ['date', 'timeSlot', 'appointmentType', 'notes', 'meetingLink'];

    // Validate time slot if it's being updated
    if (updates.timeSlot) {
      const { startTime, endTime } = updates.timeSlot;
      
      if (!startTime || !endTime) {
        return res.status(400).json({
          message: "Thời gian bắt đầu và kết thúc là bắt buộc"
        });
      }

      // Convert time strings to Date objects for comparison
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      // Calculate duration in minutes
      const durationInMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);

      // Validate time format and logical sequence
      if (durationInMinutes <= 0) {
        return res.status(400).json({
          message: "Thời gian kết thúc phải sau thời gian bắt đầu"
        });
      }

      // Validate minimum duration (1 hour = 60 minutes)
      if (durationInMinutes < 60) {
        return res.status(400).json({
          message: "Thời gian hẹn phải ít nhất 1 giờ"
        });
      }

      // Check for overlapping schedules when updating time
      const [newStartHour, newStartMin] = startTime.split(':').map(Number);
      const [newEndHour, newEndMin] = endTime.split(':').map(Number);
      const newStartMinutes = newStartHour * 60 + newStartMin;
      const newEndMinutes = newEndHour * 60 + newEndMin;

      const existingOverlap = await Schedule.findOne({
        doctor: doctorId,
        _id: { $ne: scheduleId }, // Exclude current schedule
        date: updates.date || schedule.date,
        $or: [
          // Case 1: New slot starts during an existing slot
          {
            $expr: {
              $and: [
                {
                  $lte: [
                    { $sum: [
                      { $multiply: [{ $toInt: { $substr: ['$timeSlot.startTime', 0, 2] } }, 60] },
                      { $toInt: { $substr: ['$timeSlot.startTime', 3, 2] } }
                    ]},
                    newStartMinutes
                  ]
                },
                {
                  $gt: [
                    { $sum: [
                      { $multiply: [{ $toInt: { $substr: ['$timeSlot.endTime', 0, 2] } }, 60] },
                      { $toInt: { $substr: ['$timeSlot.endTime', 3, 2] } }
                    ]},
                    newStartMinutes
                  ]
                }
              ]
            }
          },
          // Case 2: New slot ends during an existing slot
          {
            $expr: {
              $and: [
                {
                  $lt: [
                    { $sum: [
                      { $multiply: [{ $toInt: { $substr: ['$timeSlot.startTime', 0, 2] } }, 60] },
                      { $toInt: { $substr: ['$timeSlot.startTime', 3, 2] } }
                    ]},
                    newEndMinutes
                  ]
                },
                {
                  $gte: [
                    { $sum: [
                      { $multiply: [{ $toInt: { $substr: ['$timeSlot.endTime', 0, 2] } }, 60] },
                      { $toInt: { $substr: ['$timeSlot.endTime', 3, 2] } }
                    ]},
                    newEndMinutes
                  ]
                }
              ]
            }
          },
          // Case 3: New slot completely contains an existing slot
          {
            $expr: {
              $and: [
                {
                  $gte: [
                    { $sum: [
                      { $multiply: [{ $toInt: { $substr: ['$timeSlot.startTime', 0, 2] } }, 60] },
                      { $toInt: { $substr: ['$timeSlot.startTime', 3, 2] } }
                    ]},
                    newStartMinutes
                  ]
                },
                {
                  $lte: [
                    { $sum: [
                      { $multiply: [{ $toInt: { $substr: ['$timeSlot.endTime', 0, 2] } }, 60] },
                      { $toInt: { $substr: ['$timeSlot.endTime', 3, 2] } }
                    ]},
                    newEndMinutes
                  ]
                }
              ]
            }
          }
        ]
      });

      if (existingOverlap) {
        return res.status(400).json({
          message: "Thời gian này đã chồng chéo với một lịch hẹn khác của bạn"
        });
      }
    }
    
    // Check if trying to update meeting link for offline appointment
    if (updates.appointmentType === 'offline' && updates.meetingLink) {
      return res.status(400).json({
        message: "Không thể thêm meeting link cho lịch hẹn offline"
      });
    }

    // If changing from online to offline, clear meeting link
    if (updates.appointmentType === 'offline' && schedule.appointmentType === 'online') {
      updates.meetingLink = null;
    }

    // If changing from offline to online, require meeting link
    if (updates.appointmentType === 'online' && schedule.appointmentType === 'offline' && !updates.meetingLink) {
      return res.status(400).json({
        message: "Meeting link là bắt buộc cho lịch hẹn online"
      });
    }

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        schedule[key] = updates[key];
      }
    });

    await schedule.save();

    res.status(200).json({
      message: "Lịch hẹn đã được cập nhật thành công",
      schedule
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi cập nhật lịch hẹn", 
      error: error.message 
    });
  }
};

// Delete schedule
export const deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const doctorId = req.doctor._id;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      doctor: doctorId
    });

    if (!schedule) {
      return res.status(404).json({ 
        message: "Không tìm thấy lịch hẹn hoặc không có quyền truy cập" 
      });
    }

    if (schedule.status !== "available") {
      return res.status(400).json({ 
        message: "Không thể xóa lịch đã được đặt hoặc hoàn thành" 
      });
    }

    await schedule.deleteOne();

    res.status(200).json({ 
      message: "Lịch hẹn đã được xóa thành công" 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi xóa lịch hẹn", 
      error: error.message 
    });
  }
};

// Get available schedules for patients
export const getAvailableSchedules = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    let query = {
      status: "available",
      isAvailable: true,
      date: { $gte: new Date() }
    };

    if (doctorId) {
      query.doctor = doctorId;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const schedules = await Schedule.find(query)
      .populate('doctor', 'username fullName doctorType workplace')
      .sort({ date: 1, 'timeSlot.startTime': 1 });

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy lịch hẹn", 
      error: error.message 
    });
  }
};

// Get all schedules with filtering and pagination
export const getAllSchedules = async (req, res) => {
  try {
    const { date, status, page = 1, limit = 10 } = req.query;
    
    let query = {};

    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Schedule.countDocuments(query);

    // Get schedules with doctor information
    const schedules = await Schedule.find(query)
      .populate('doctor', 'username fullName doctorType workplace')
      .sort({ date: 1, 'timeSlot.startTime': 1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      schedules,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi lấy lịch hẹn", 
      error: error.message 
    });
  }
};

// Register for a schedule (for users only)
export const registerSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user._id; // Get user ID from auth token

    // Find the schedule and ensure it's available
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      status: "available",
      isAvailable: true,
      date: { $gte: new Date() }
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Lịch hẹn không tồn tại hoặc không còn khả dụng"
      });
    }

    // Check if user already has a booking at this time
    const existingBooking = await Schedule.findOne({
      patient: userId,
      date: schedule.date,
      status: "booked",
      'timeSlot.startTime': schedule.timeSlot.startTime,
      'timeSlot.endTime': schedule.timeSlot.endTime
    });

    if (existingBooking) {
      return res.status(400).json({
        message: "Bạn đã có lịch hẹn vào thời gian này"
      });
    }

    // Update the schedule
    schedule.patient = userId;
    schedule.status = "booked";
    schedule.isAvailable = false;

    await schedule.save();

    // Populate doctor details before sending response
    await schedule.populate('doctor', 'username fullName doctorType workplace');

    try {
      await sendRegisterEmail({ doctor: schedule.doctor, patient: schedule.patient, schedule });
      await Notification.create({
        userId: schedule.doctor._id,
        type: "schedule_register",
        message: `Bạn có lịch hẹn mới từ ${req.user.username} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}`,
        data: { scheduleId: schedule._id, patient: req.user._id },
      });
      await Notification.create({
        userId: req.user._id,
        type: "schedule_register",
        message: `Bạn đã đặt lịch thành công với bác sĩ ${schedule.doctor.fullName} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}`,
        data: { scheduleId: schedule._id, doctor: schedule.doctor._id },
      });
    } catch (e) { console.error("Email error:", e.message); }

    // Emit notification for doctor (register)
    io && io.to(schedule.doctor._id.toString()).emit("notification", { type: "schedule_register" });
    // Emit notification for user (register)
    io && io.to(req.user._id.toString()).emit("notification", { type: "schedule_register" });

    res.status(200).json({
      message: "Đăng ký lịch hẹn thành công",
      schedule
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi đăng ký lịch hẹn",
      error: error.message
    });
  }
};

// Cancel registered schedule (for users only)
export const cancelRegisteredSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user._id;

    if (!cancelReason) {
      return res.status(400).json({
        message: "Lý do hủy lịch là bắt buộc"
      });
    }

    // Find the schedule and ensure it belongs to the user
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      patient: userId,
      status: "booked"
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Lịch hẹn không tồn tại hoặc không phải của bạn"
      });
    }

    // Check if the schedule is in the past
    if (new Date(schedule.date) < new Date()) {
      return res.status(400).json({
        message: "Không thể hủy lịch đã qua"
      });
    }

    // Update the schedule
    schedule.status = "available";
    schedule.isAvailable = true;
    schedule.patient = null;
    schedule.cancelReason = undefined;

    await schedule.save();

    try {
      const admins = await User.find({ role: 'admin' });
      await sendCancelEmail({ doctor: schedule.doctor, patient: req.user, schedule, cancelReason, admins });
      await Notification.create({
        userId: schedule.doctor._id,
        type: "schedule_cancel",
        message: `Lịch hẹn vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''} đã bị hủy bởi bệnh nhân ${req.user.username}`,
        data: { scheduleId: schedule._id, patient: req.user._id, reason: cancelReason },
      });
    } catch (e) { console.error("Email error:", e.message); }

    // Emit notification for doctor (cancel)
    io && io.to(schedule.doctor._id.toString()).emit("notification", { type: "schedule_cancel" });

    res.status(200).json({
      message: "Hủy lịch hẹn thành công",
      schedule
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi hủy lịch hẹn",
      error: error.message
    });
  }
};

// Get user's registered schedules (for users only)
export const getMyRegisteredSchedules = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    let query = {
      patient: userId
    };

    if (status) {
      query.status = status;
    }

    const schedules = await Schedule.find(query)
      .populate('doctor', 'username fullName doctorType workplace')
      .sort({ date: -1, 'timeSlot.startTime': 1 });

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy lịch hẹn đã đăng ký",
      error: error.message
    });
  }
};

// Make cancelled schedule available again
export const makeScheduleAvailable = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const doctorId = req.doctor._id;

    // Find schedule and check ownership
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      doctor: doctorId
    });

    if (!schedule) {
      return res.status(404).json({ 
        message: "Không tìm thấy lịch hẹn hoặc không có quyền truy cập" 
      });
    }

    if (schedule.status !== "cancelled") {
      return res.status(400).json({ 
        message: "Chỉ có thể kích hoạt lại lịch hẹn đã bị hủy" 
      });
    }

    // Check if the schedule date is in the past
    if (new Date(schedule.date) < new Date()) {
      return res.status(400).json({
        message: "Không thể kích hoạt lại lịch hẹn đã qua"
      });
    }

    // Reset schedule data
    schedule.status = "available";
    schedule.isAvailable = true;
    schedule.patient = null;
    schedule.cancelReason = null;

    await schedule.save();

    res.status(200).json({
      message: "Kích hoạt lại lịch hẹn thành công",
      schedule
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Lỗi kích hoạt lại lịch hẹn", 
      error: error.message 
    });
  }
};

export const rejectRegisterSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { rejectedReason } = req.body;
    const doctorId = req.doctor._id;

    if (!rejectedReason) {
      return res.status(400).json({ message: "Lý do từ chối là bắt buộc" });
    }

    // Find the schedule and ensure it belongs to the doctor
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      doctor: doctorId,
      status: "booked"
    });

    if (!schedule) {
      return res.status(404).json({ message: "Lịch hẹn không tồn tại hoặc không thuộc về bạn" });
    }

    // Update the schedule
    schedule.status = "available";
    schedule.isAvailable = true;
    schedule.patient = null;
    schedule.rejectedReason = rejectedReason;

    await schedule.save();

    try {
      const admins = await User.find({ role: 'admin' });
      await sendRejectEmail({ doctor: schedule.doctor, patient: schedule.patient, schedule, rejectedReason, admins });
      await Notification.create({
        userId: schedule.patient, // bệnh nhân bị từ chối
        type: "schedule_reject",
        message: `Lịch hẹn của bạn với bác sĩ đã bị từ chối vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}`,
        data: { scheduleId: schedule._id, doctor: req.doctor._id, reason: rejectedReason },
      });
    } catch (e) { console.error("Email error:", e.message); }

    // Emit notification for patient (reject)
    io && io.to(schedule.patient?.toString()).emit("notification", { type: "schedule_reject" });

    res.status(200).json({
      message: "Từ chối lịch hẹn thành công",
      schedule
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
