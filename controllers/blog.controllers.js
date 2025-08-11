import Blog from "../models/blog.models.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import mongoose from "mongoose";

// @desc    Create a new blog
// @route   POST /api/blogs
// @access  Private (Doctor only)
export const createBlog = async (req, res) => {
  try {
    const { title, description, content, tags } = req.body;
    const doctorId = req.user._id;

    // Handle image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path);
        images.push(result.secure_url);
      }
    }

    const blog = await Blog.create({
      title,
      description,
      content,
      images,
      doctorId,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
    });

    res.status(201).json({
      success: true,
      message: "Blog đã được tạo thành công",
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi tạo blog",
    });
  }
};

// @desc    Get all blogs with pagination and filters
// @route   GET /api/blogs
// @access  Public
export const getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const tag = req.query.tag;
    const status = req.query.status || "published";
    const doctorId = req.query.doctorId;

    const query = { status };

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by tag
    if (tag) {
      query.tags = tag;
    }

    // Filter by doctor
    if (doctorId) {
      if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({
          success: false,
          message: "ID bác sĩ không hợp lệ",
        });
      }
      query.doctorId = doctorId;
    }

    const blogs = await Blog.find(query)
      .populate("likes", "fullName avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          limit,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi lấy danh sách blog",
    });
  }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
export const getBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("likes", "fullName avatar")
      .populate("comments.userId", "fullName avatar");

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    // Increment view count
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi lấy thông tin blog",
    });
  }
};

// @desc    Update blog
// @route   PATCH /api/blogs/:id
// @access  Private (Doctor only)
export const updateBlog = async (req, res) => {
  try {
    const { title, description, content, tags, status } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    // Check ownership
    if (blog.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa blog này",
      });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path);
        newImages.push(result.secure_url);
      }
      // Delete old images if they exist
      if (blog.images.length > 0) {
        for (const imageUrl of blog.images) {
          await deleteFromCloudinary(imageUrl);
        }
      }
      blog.images = newImages;
    }

    // Update fields
    blog.title = title || blog.title;
    blog.description = description || blog.description;
    blog.content = content || blog.content;
    blog.status = status || blog.status;
    if (tags) {
      blog.tags = tags.split(",").map((tag) => tag.trim());
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog đã được cập nhật thành công",
      data: blog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi cập nhật blog",
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (Doctor only)
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    // Check ownership
    if (blog.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa blog này",
      });
    }

    // Delete images from cloudinary
    if (blog.images.length > 0) {
      for (const imageUrl of blog.images) {
        await deleteFromCloudinary(imageUrl);
      }
    }

    await blog.remove();

    res.status(200).json({
      success: true,
      message: "Blog đã được xóa thành công",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi xóa blog",
    });
  }
};

// @desc    Toggle like blog
// @route   POST /api/blogs/:id/like
// @access  Private
export const toggleLike = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    const userId = req.user._id;
    const likeIndex = blog.likes.indexOf(userId);

    if (likeIndex === -1) {
      blog.likes.push(userId);
    } else {
      blog.likes.splice(likeIndex, 1);
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: likeIndex === -1 ? "Đã thích blog" : "Đã bỏ thích blog",
      data: blog.likes,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi thích/bỏ thích blog",
    });
  }
};

// @desc    Add comment to blog
// @route   POST /api/blogs/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    const comment = {
      userId: req.user._id,
      content,
    };

    blog.comments.push(comment);
    await blog.save();

    // Populate the new comment's user info
    const populatedBlog = await Blog.findById(blog._id).populate(
      "comments.userId",
      "fullName avatar"
    );
    const newComment =
      populatedBlog.comments[populatedBlog.comments.length - 1];

    res.status(200).json({
      success: true,
      message: "Đã thêm bình luận",
      data: newComment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi thêm bình luận",
    });
  }
};

// @desc    Update comment
// @route   PATCH /api/blogs/:blogId/comments/:commentId
// @access  Private
export const updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const blog = await Blog.findById(req.params.blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    const comment = blog.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bình luận",
      });
    }

    // Check ownership
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa bình luận này",
      });
    }

    comment.content = content;
    comment.updatedAt = Date.now();
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Đã cập nhật bình luận",
      data: comment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi cập nhật bình luận",
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/blogs/:blogId/comments/:commentId
// @access  Private
export const deleteComment = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy blog",
      });
    }

    const comment = blog.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bình luận",
      });
    }

    // Check ownership
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bình luận này",
      });
    }

    comment.remove();
    await blog.save();

    res.status(200).json({
      success: true,
      message: "Đã xóa bình luận",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Có lỗi xảy ra khi xóa bình luận",
    });
  }
}; 