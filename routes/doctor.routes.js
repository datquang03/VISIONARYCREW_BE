
   import express from "express";
   import {
     registerDoctor,
     login,
     getAllDoctors,
     getMyProfile,
     getDoctorById,
     getPendingDoctor,
     handleDoctorApplication,
     reRegisterDoctor,
     getDoctorByRegisterId,
   } from "../controllers/doctor.controllers.js";
   import { admin, allowOnlyAcceptedDoctor, allowOnlyPendingOrRejectedDoctor, protectRouter } from "../middlewares/auth.js";
   import multer from "multer";
   import path from "path";

   const storage = multer.memoryStorage();

   const fileFilter = (req, file, cb) => {
     const allowedExtensions = [".svg", ".png", ".jpg", ".jpeg"];
     const extname = path.extname(file.originalname).toLowerCase();
     if (allowedExtensions.includes(extname)) {
       cb(null, true);
     } else {
       cb(new Error("Ảnh phải có định dạng SVG, PNG, JPG hoặc JPEG"), false);
     }
   };

   const upload = multer({
     storage,
     fileFilter,
     limits: {
       fileSize: 5 * 1024 * 1024, // 5MB
     },
   });

   const handleMulterError = (err, req, res, next) => {
     if (err instanceof multer.MulterError) {
       if (err.code === "LIMIT_FILE_SIZE") {
         return res.status(400).json({ message: "Kích thước file vượt quá 5MB" });
       }
       return res.status(400).json({ message: `Lỗi tải file: ${err.message}` });
     } else if (err) {
       return res.status(400).json({ message: err.message });
     }
     next();
   };

   const uploadAny = upload.any();

   const router = express.Router();

   router.post("/register",allowOnlyPendingOrRejectedDoctor, uploadAny, handleMulterError, registerDoctor);
   router.post("/reregister",allowOnlyPendingOrRejectedDoctor, uploadAny, handleMulterError, reRegisterDoctor);

   router.post("/login", login);

   router.get("/profile", allowOnlyAcceptedDoctor, getMyProfile);

   router.get("/pending", getPendingDoctor);
   router.get("/:id", getDoctorById);
   router.get("/register/:doctorRegisterId",getDoctorByRegisterId);

   router.get("/", getAllDoctors);

   // Sửa từ POST thành PATCH
   router.patch("/handle", handleDoctorApplication);

   export default router;
  