const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',  // or your email service
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendVerificationEmail = async (email, verificationToken) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Email Verification',
    html: `
      <h1>Verify Your Email</h1>
      <p>Click the link below to verify your email address:</p>
      <a href="${process.env.FRONTEND_URL}/verify-email/${verificationToken}">Verify Email</a>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};