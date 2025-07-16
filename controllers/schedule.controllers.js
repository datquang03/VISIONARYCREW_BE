import Schedule from "../models/Schedule/schedule.models.js";
import Doctor from "../models/User/doctor.models.js";

// Create a new schedule slot
export const createSchedule = async (req, res) => {
  try {
    const { date, timeSlot, appointmentType } = req.body;
    const doctorId = req.user._id; // Get doctor ID from authenticated user

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if a schedule already exists for this time slot
    const existingSchedule = await Schedule.findOne({
      doctor: doctorId,
      date: new Date(date),
      'timeSlot.startTime': timeSlot.startTime,
      'timeSlot.endTime': timeSlot.endTime,
    });

    if (existingSchedule) {
      return res.status(400).json({ 
        message: "A schedule already exists for this time slot" 
      });
    }

    // Create new schedule
    const schedule = new Schedule({
      doctor: doctorId,
      date,
      timeSlot,
      appointmentType,
    });

    await schedule.save();

    res.status(201).json({
      message: "Schedule created successfully",
      schedule
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error creating schedule", 
      error: error.message 
    });
  }
};

// Get logged-in doctor's schedules
export const getMySchedules = async (req, res) => {
  try {
    const doctorId = req.user._id; // Get logged-in doctor's ID from auth token
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
      message: "Error fetching your schedules", 
      error: error.message 
    });
  }
};

// Get specific doctor's schedules by ID
export const getDoctorSchedules = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required" });
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
      message: "Error fetching schedules", 
      error: error.message 
    });
  }
};

// Update schedule
export const updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const doctorId = req.user._id;
    const updates = req.body;

    // Find schedule and check ownership
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      doctor: doctorId
    });

    if (!schedule) {
      return res.status(404).json({ 
        message: "Schedule not found or unauthorized" 
      });
    }

    if (schedule.status !== "available") {
      return res.status(400).json({ 
        message: "Cannot update a booked or completed schedule" 
      });
    }

    // Update schedule with allowed fields only
    const allowedUpdates = ['date', 'timeSlot', 'appointmentType', 'notes'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        schedule[key] = updates[key];
      }
    });

    await schedule.save();

    res.status(200).json({
      message: "Schedule updated successfully",
      schedule
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error updating schedule", 
      error: error.message 
    });
  }
};

// Delete schedule
export const deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const doctorId = req.user._id;

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      doctor: doctorId
    });

    if (!schedule) {
      return res.status(404).json({ 
        message: "Schedule not found or unauthorized" 
      });
    }

    if (schedule.status !== "available") {
      return res.status(400).json({ 
        message: "Cannot delete a booked or completed schedule" 
      });
    }

    await schedule.deleteOne();

    res.status(200).json({ 
      message: "Schedule deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error deleting schedule", 
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
      message: "Error fetching available schedules", 
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
      message: "Error fetching schedules", 
      error: error.message 
    });
  }
};

// Register for a schedule (for users only)
export const registerSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const userId = req.user._id; // Get user ID from auth token
    
    // Check if the authenticated user is a regular user (not a doctor)
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only patients can register for appointments"
      });
    }

    // Find the schedule and ensure it's available
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      status: "available",
      isAvailable: true,
      date: { $gte: new Date() }
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Schedule not found or not available for booking"
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
        message: "You already have a booking at this time"
      });
    }

    // Update the schedule
    schedule.patient = userId;
    schedule.status = "booked";
    schedule.isAvailable = false;

    await schedule.save();

    // Populate doctor details before sending response
    await schedule.populate('doctor', 'username fullName doctorType workplace');

    res.status(200).json({
      message: "Schedule booked successfully",
      schedule
    });
  } catch (error) {
    res.status(500).json({
      message: "Error booking schedule",
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

    // Check if the authenticated user is a regular user (not a doctor)
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only patients can cancel their appointments"
      });
    }

    if (!cancelReason) {
      return res.status(400).json({
        message: "Cancellation reason is required"
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
        message: "Booked schedule not found or unauthorized"
      });
    }

    // Check if the schedule is in the past
    if (new Date(schedule.date) < new Date()) {
      return res.status(400).json({
        message: "Cannot cancel past schedules"
      });
    }

    // Update the schedule
    schedule.status = "cancelled";
    schedule.isAvailable = false;
    schedule.cancelReason = cancelReason;

    await schedule.save();

    res.status(200).json({
      message: "Schedule cancelled successfully",
      schedule
    });
  } catch (error) {
    res.status(500).json({
      message: "Error cancelling schedule",
      error: error.message
    });
  }
};

// Get user's registered schedules (for users only)
export const getMyRegisteredSchedules = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    // Check if the authenticated user is a regular user (not a doctor)
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only patients can view their appointments"
      });
    }

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
      message: "Error fetching your registered schedules",
      error: error.message
    });
  }
};
