import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Send email for doctor application status
export const sendEmailDoctorApplication = async (doctor, status, rejectionMessage = null) => {
  try {
    // Kiểm tra doctor object và các thuộc tính cần thiết
    if (!doctor?.email || !doctor?.fullName) {
      throw new Error('Doctor email or fullName is missing');
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Define email content based on status
    let subject, text;
    if (status === "accepted") {
      subject = "Visionary Crew - Đơn đăng ký bác sĩ được chấp nhận";
      text = `Xin chào ${doctor.fullName},\n\nChúc mừng bạn! Đơn đăng ký bác sĩ của bạn đã được chấp nhận. Bạn có thể đăng nhập và bắt đầu sử dụng tài khoản bác sĩ của mình.\n\nCảm ơn bạn đã tham gia Visionary Crew!`;
    } else if (status === "rejected") {
      subject = "Visionary Crew - Đơn đăng ký bác sĩ bị từ chối";
      text = `Xin chào ${doctor.fullName},\n\nRất tiếc, đơn đăng ký bác sĩ của bạn đã bị từ chối. Lý do: ${rejectionMessage || "Không được cung cấp"}.\n\nVui lòng liên hệ với chúng tôi nếu bạn cần thêm thông tin. Cảm ơn bạn đã quan tâm đến Visionary Crew!`;
    } else {
      subject = "Visionary Crew - Đăng ký bác sĩ";
      text = `Xin chào ${doctor.fullName},\n\nĐơn đăng ký bác sĩ của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và thông báo kết quả (chấp nhận hoặc từ chối) qua email này trong thời gian sớm nhất.\n\nCảm ơn bạn đã tham gia!`;
    }

    const mailOptions = {
      from: `"Visionary Crew" <${process.env.EMAIL_USER}>`,
      to: doctor.email,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
    };

    // Send email
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending doctor application email (${status}):`, error.message);
    throw new Error(`Gửi email ${status} đăng ký bác sĩ thất bại`);
  }
};