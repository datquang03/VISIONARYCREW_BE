  import mongoose from "mongoose";

  const doctorSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        trim: true,
        unique: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      dateOfBirth: {
        type: Date,
        required: true,
      },
      avatar: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      role: {
        type: String,
        enum: ["doctor"],
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifyToken: {
        type: String,
      },
      verifyTokenExpires: {
        type: Date,
      },
      resetPasswordCode: {
        type: String,
      },
      resetPasswordExpires: {
        type: Date,
      },
      emailVerificationCode: {
        type: String,
      },
      emailVerificationExpires: {
        type: Date,
      },
      tempEmail: {
        type: String,
      },
      likedBlogs: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Blog",
        },
      ],
      conversations: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
      ],
      // Doctor-specific fields
      doctorType: {
        type: String,
        enum: ["general", "cardiologist", "dermatologist", "pediatrician", "other"],
        default: null,
      },
      certifications: [
        {
          url: {
            type: String,
            trim: true,
          },
          description: {
            type: String,
            trim: true,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      doctorApplicationStatus: {
        type: String,
        enum: ["pending", "accepted", "rejected", null],
        default: null,
      },
      doctorRegisterId: {
        type: String,
        unique: true,
        required: true,
      },    
      rejectionMessage: {
        type: String,
        trim: true,
        default: null,
      },
      fullName: {
        type: String,
        trim: true,
        default: null,
      },
      address: {
        type: String,
        trim: true,
        default: null,
      },
      education: [
        {
          institution: {
            type: String,
            trim: true,
          },
          degree: {
            type: String,
            trim: true,
          },
          year: {
            type: Number,
          },
        },
      ],
      workExperience: [
        {
          workplace: {
            type: String,
            trim: true,
          },
          position: {
            type: String,
            trim: true,
          },
          startYear: {
            type: Number,
          },
          endYear: {
            type: Number,
            default: null,
          },
        },
      ],
      workplace: {
        type: String,
        trim: true,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

  const Doctor = mongoose.model("Doctor", doctorSchema);
  export default Doctor;