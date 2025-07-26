import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: `"Visionary Crew" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error('Failed to send email');
  }
};

export const sendRegisterEmail = async ({ doctor, patient, schedule }) => {
  // Gửi cho doctor
  if (doctor?.email) {
    const subject = 'Visionary Crew - Có lịch hẹn mới';
    const text = `Xin chào Dr. ${doctor.fullName},\n\nBạn có lịch hẹn mới từ ${patient.username} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}.`;
    await sendEmail(doctor.email, subject, text);
  }
  // Gửi cho patient
  if (patient?.email) {
    const subject = 'Visionary Crew - Đặt lịch thành công';
    const text = `Xin chào ${patient.username},\n\nBạn đã đặt lịch thành công với bác sĩ ${doctor.fullName} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}.`;
    await sendEmail(patient.email, subject, text);
  }
};

export const sendCancelEmail = async ({ doctor, patient, schedule, cancelReason, admins }) => {
  if (doctor?.email) {
    const subject = 'Visionary Crew - Lịch hẹn bị hủy';
    const text = `Xin chào Dr. ${doctor.fullName},\n\nLịch hẹn vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''} đã bị hủy bởi bệnh nhân ${patient.username}.\nLý do: ${cancelReason}`;
    await sendEmail(doctor.email, subject, text);
  }
  if (patient?.email) {
    const subject = 'Visionary Crew - Hủy lịch thành công';
    const text = `Xin chào ${patient.username},\n\nBạn đã hủy lịch hẹn với bác sĩ ${doctor.fullName} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}.\nLý do: ${cancelReason}`;
    await sendEmail(patient.email, subject, text);
  }
  if (admins && Array.isArray(admins)) {
    for (const admin of admins) {
      if (admin.email) {
        const subject = 'Visionary Crew - Lịch hẹn bị hủy';
        const text = `Admin thân mến,\n\nLịch hẹn giữa bác sĩ ${doctor.fullName} và bệnh nhân ${patient.username} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''} đã bị hủy.\nLý do: ${cancelReason}`;
        await sendEmail(admin.email, subject, text);
      }
    }
  }
};

export const sendRejectEmail = async ({ doctor, patient, schedule, rejectedReason, admins }) => {
  if (patient?.email) {
    const subject = 'Visionary Crew - Lịch hẹn bị từ chối';
    const text = `Xin chào ${patient.username},\n\nLịch hẹn của bạn với bác sĩ ${doctor.fullName} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''} đã bị từ chối.\nLý do: ${rejectedReason}`;
    await sendEmail(patient.email, subject, text);
  }
  if (doctor?.email) {
    const subject = 'Visionary Crew - Đã từ chối lịch hẹn';
    const text = `Xin chào Dr. ${doctor.fullName},\n\nBạn đã từ chối lịch hẹn với bệnh nhân vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}.\nLý do: ${rejectedReason}`;
    await sendEmail(doctor.email, subject, text);
  }
  if (admins && Array.isArray(admins)) {
    for (const admin of admins) {
      if (admin.email) {
        const subject = 'Visionary Crew - Lịch hẹn bị từ chối';
        const text = `Admin thân mến,\n\nBác sĩ ${doctor.fullName} đã từ chối lịch hẹn với bệnh nhân ${patient.username} vào ngày ${schedule.date} lúc ${schedule.timeSlot?.startTime || ''}.\nLý do: ${rejectedReason}`;
        await sendEmail(admin.email, subject, text);
      }
    }
  }
};

export const verifyEmail = async (user) => {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  user.emailVerificationCode = verificationCode;
  user.emailVerificationExpires = expires;
  await user.save();
  const subject = 'Visionary Crew - Xác minh email';
  const text = `Xin chào ${user.username},\n\nXin hãy nhập đoạn code này để xác minh email: ${verificationCode}\n\nNó sẽ hết hạn sau 30 phút.`;
  await sendEmail(user.email, subject, text);
};

export default sendEmail;