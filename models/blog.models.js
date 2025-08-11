import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người bình luận không được để trống"],
    },
    content: {
      type: String,
      required: [true, "Nội dung bình luận không được để trống"],
      trim: true,
      minlength: [1, "Nội dung bình luận quá ngắn"],
      maxlength: [500, "Nội dung bình luận quá dài"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề blog không được để trống"],
      trim: true,
      minlength: [5, "Tiêu đề quá ngắn"],
      maxlength: [200, "Tiêu đề quá dài"],
    },
    description: {
      type: String,
      required: [true, "Mô tả blog không được để trống"],
      trim: true,
      minlength: [10, "Mô tả quá ngắn"],
      maxlength: [500, "Mô tả quá dài"],
    },
    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 3;
        },
        message: "Chỉ được phép tải lên tối đa 3 ảnh",
      },
      default: [],
    },
    content: {
      type: String,
      required: [true, "Nội dung blog không được để trống"],
      trim: true,
      minlength: [100, "Nội dung quá ngắn"],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "ID bác sĩ không được để trống"],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
    status: {
      type: String,
      enum: {
        values: ["draft", "published", "archived"],
        message: "Trạng thái không hợp lệ",
      },
      default: "published",
    },
    views: {
      type: Number,
      default: 0,
      min: [0, "Số lượt xem không thể âm"],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
blogSchema.index({ title: "text", description: "text" });
blogSchema.index({ doctorId: 1, createdAt: -1 });
blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ tags: 1 });

// Virtuals
blogSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

blogSchema.virtual("commentCount").get(function () {
  return this.comments.length;
});

// Middleware
blogSchema.pre("save", function (next) {
  if (this.isModified("comments")) {
    this.comments.forEach((comment) => {
      if (comment.isModified("content")) {
        comment.updatedAt = Date.now();
      }
    });
  }
  next();
});

// Middleware to populate references
blogSchema.pre(/^find/, function (next) {
  this.populate({
    path: "doctorId",
    select: "fullName avatar specialty",
  });
  next();
});

const Blog = mongoose.model("Blog", blogSchema);

export default Blog; 