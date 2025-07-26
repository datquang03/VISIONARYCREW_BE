import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const updateScheduleStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the Schedule collection
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({
      status: {
        type: String,
        enum: ["available", "pending", "booked", "completed", "cancelled", "rejected"],
        default: "available",
      },
      rejectedReason: {
        type: String,
        trim: true,
        default: null,
      }
    }));

    // Update existing schedules that have status "booked" to "pending" if they have a patient
    const result = await Schedule.updateMany(
      { 
        status: "booked",
        patient: { $exists: true, $ne: null }
      },
      { 
        $set: { status: "pending" }
      }
    );

    console.log(`Updated ${result.modifiedCount} schedules from "booked" to "pending"`);

    // Update schedules that have status "booked" but no patient to "available"
    const result2 = await Schedule.updateMany(
      { 
        status: "booked",
        $or: [
          { patient: null },
          { patient: { $exists: false } }
        ]
      },
      { 
        $set: { 
          status: "available",
          isAvailable: true,
          patient: null
        }
      }
    );

    console.log(`Updated ${result2.modifiedCount} schedules from "booked" to "available"`);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the migration
updateScheduleStatus(); 