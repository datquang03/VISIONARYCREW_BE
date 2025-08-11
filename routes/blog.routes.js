import express from "express";
import { protectAnyUser, protectRouterForDoctor} from "../middlewares/auth.js";
import { upload } from "../config/cloudinary.js";
import {
  createBlog,
  getBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  toggleLike,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/blog.controllers.js";

const router = express.Router();

// Public routes
router.get("/", getBlogs);
router.get("/:id", getBlog);

// user routes
router.post("/:id/like", protectAnyUser, toggleLike);
router.post("/:id/comments", protectAnyUser, addComment);
router.patch("/:blogId/comments/:commentId", protectAnyUser, updateComment);
router.delete("/:blogId/comments/:commentId", protectAnyUser, deleteComment);

// Protected routes with image upload
router.post("/", protectRouterForDoctor, upload.array("images", 3), createBlog);
router.put("/:id", protectRouterForDoctor, upload.array("images", 3), updateBlog);
router.delete("/:id", protectRouterForDoctor, deleteBlog);

export default router; 