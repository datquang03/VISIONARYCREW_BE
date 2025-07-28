import express from "express";
import {
  chatWithAI,
  getQuickHelp,
  getUserAIStats,
  resetConversation,
  getConversationHistory,
  updateAIPreferences,
  getAIPreferences,
  toggleAIGuide,
  getDatabaseStats,
} from "../controllers/aiGuide.controllers.js";
import { protectAnyUser } from "../middlewares/auth.js";

const router = express.Router();

// All routes require authentication (user or doctor)
router.use(protectAnyUser);

// AI Chat routes
router.post("/chat", chatWithAI);
router.get("/quick-help", getQuickHelp);
router.get("/stats", getUserAIStats);
router.post("/reset", resetConversation);
router.get("/history", getConversationHistory);

// AI Preferences routes
router.get("/preferences", getAIPreferences);
router.put("/preferences", updateAIPreferences);
router.put("/toggle", toggleAIGuide);

// Database stats route
router.get('/database-stats', getDatabaseStats);

export default router; 