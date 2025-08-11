// Migration script to update existing doctors with subscription fields
import mongoose from "mongoose";
import Doctor from "../models/User/doctor.models.js";

const updateDoctorSubscriptions = async () => {
  try {
    
    
    // Connect to database if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DB_URI || 'your_connection_string', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // Update all existing doctors to have default subscription values
    const result = await Doctor.updateMany(
      {
        // Only update documents that don't have the new fields
        $or: [
          { subscriptionPackage: { $exists: false } },
          { scheduleLimits: { $exists: false } },
          { isPriority: { $exists: false } },
          { balance: { $exists: false } }
        ]
      },
      {
        $set: {
          subscriptionPackage: "free",
          subscriptionStartDate: null,
          subscriptionEndDate: null,
          scheduleLimits: {
            weekly: 0,
            used: 0,
            resetDate: null
          },
          isPriority: false,
          balance: 0
        }
      }
    );

    
    
    // List all doctors with their new subscription info
    const doctors = await Doctor.find({}, 'username subscriptionPackage scheduleLimits isPriority balance');
    

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    // Close connection if we opened it
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateDoctorSubscriptions();
}

export default updateDoctorSubscriptions;
