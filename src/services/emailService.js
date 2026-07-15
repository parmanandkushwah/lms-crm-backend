const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: parseInt(process.env.BREVO_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

const sendMail = async ({ to, subject, html, attachments = [] }) => {
  return transporter.sendMail({
    from: `"${process.env.APP_NAME}" <${process.env.BREVO_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
};

const sendPasswordReset = (to, name, resetUrl) =>
  sendMail({
    to,
    subject: 'Reset Your Password',
    html: `<p>Hi ${name},</p>
           <p>Click the link below to reset your password. It expires in 1 hour.</p>
           <a href="${resetUrl}" style="padding:10px 20px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a>
           <p>If you didn't request this, ignore this email.</p>`,
  });

const sendWelcome = (to, name, password) =>
  sendMail({
    to,
    subject: `Welcome to ${process.env.APP_NAME}`,
    html: `<p>Hi ${name},</p>
           <p>Your account has been created on <strong>${process.env.APP_NAME}</strong>.</p>
           <p>Email: <strong>${to}</strong><br/>Password: <strong>${password}</strong></p>
           <p>Please change your password after first login.</p>`,
  });

const sendQuotation = (to, name, quotationNumber, fileBuffer) =>
  sendMail({
    to,
    subject: `Quotation ${quotationNumber} from ${process.env.APP_NAME}`,
    html: `<p>Dear ${name},</p>
           <p>Please find your quotation <strong>${quotationNumber}</strong> attached.</p>
           <p>Thank you for your interest.</p>`,
    attachments: fileBuffer
      ? [{ filename: `${quotationNumber}.pdf`, content: fileBuffer }]
      : [],
  });

const sendInvoice = (to, name, invoiceNumber, fileBuffer) =>
  sendMail({
    to,
    subject: `Invoice ${invoiceNumber} from ${process.env.APP_NAME}`,
    html: `<p>Dear ${name},</p>
           <p>Please find your invoice <strong>${invoiceNumber}</strong> attached.</p>
           <p>Thank you for your business.</p>`,
    attachments: fileBuffer
      ? [{ filename: `${invoiceNumber}.pdf`, content: fileBuffer }]
      : [],
  });

module.exports = { sendMail, sendPasswordReset, sendWelcome, sendQuotation, sendInvoice };
