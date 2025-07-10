import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (to, subject, text) => {
  try {
    // Create a transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: `<p>${text}</p>`,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error('Failed to send email');
  }
};

export const verifyEmail = async (user) => {
  // Generate a 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiration time (30 minutes from now)
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  // Update user with verification code and expiration
  user.emailVerificationCode = verificationCode;
  user.emailVerificationExpires = expires;
  await user.save();

  // Send verification email
  const subject = 'Visionary Crew - Xác minh email';
  const text = `Xin chào ${user.username},\n\nXin hãy nhập đoạn code này để xác minh email: ${verificationCode}\n\nNó sẽ hết hạn sau 30 phút.`;
  
  await sendEmail(user.email, subject, text);
};

export default sendEmail;