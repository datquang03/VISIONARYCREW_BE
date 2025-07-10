import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Send email for doctor application
export const sendEmailDoctorApplication = async (doctor) => {
  try {
    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const subject = "Visionary Crew - Đăng ký bác sĩ";
    const text = `Xin chào ${doctor.fullName},\n\nĐơn đăng ký bác sĩ của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và thông báo kết quả (chấp nhận hoặc từ chối) qua email này trong thời gian sớm nhất.\n\nCảm ơn bạn đã tham gia!`;
    const mailOptions = {
      from: `"Visionary Crew" <${process.env.EMAIL_USER}>`,
      to: doctor.email,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${doctor.email}`);
  } catch (error) {
    console.error("Error sending doctor application email:", error.message);
    throw new Error("Gửi email đăng ký bác sĩ thất bại");
  }
};