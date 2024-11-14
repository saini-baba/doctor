require("dotenv").config();
const nodemailer = require("nodemailer");

exports.sendEmail = async (email, subject, verifyUrl) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
          <div style="text-align: center; padding-bottom: 20px; background-color: white; display: inline-block;">
    <img src="https://w7.pngwing.com/pngs/362/503/png-transparent-hands-cross-medical-medical-care-health-care-logo.png" alt="logo" style="display: block;">
</div>

          <h2 style="text-align: center; color: #333;">Welcome to Health Care!</h2>
          <p>Hi there,</p>
          <p>Thank you for registering with us. Please verify your email address to complete your registration. Simply click the button below:</p>
          <div style="text-align: center; margin: 20px;">
            <a href="${verifyUrl}" style="background-color: #007bff; color: #fff; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 4px;">
              Verify Email
            </a>
          </div>
          <p>If the button above doesn’t work, copy and paste the following link into your browser:</p>
          <p style="word-break: break-all;">${verifyUrl}</p>
          <p>Thank you,<br>Health Care Team</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; text-align: center; color: #999;">
            © 2024 Health Care. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("email sent");
  } catch (error) {
    console.error("error in sending", error);
  }
};

exports.sendEmailWithopt = async (email, subject, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === "465",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333;">
          <div style="text-align: center; padding-bottom: 20px;">
            <img src="https://w7.pngwing.com/pngs/362/503/png-transparent-hands-cross-medical-medical-care-health-care-logo.png" alt="logo" style="width: 100px; height: auto; background-color: white; padding: 10px; border-radius: 8px;">
          </div>
          <h2 style="text-align: center; color: #333;">Welcome to Health Care!</h2>
          <p>Hi there,</p>
          <p>Thank you for registering with us. Please verify your email address to complete your registration. Use the OTP code below to verify your email:</p>
          <div style="text-align: center; margin: 20px;">
            <p style="display: inline-block; padding: 10px 20px; background-color: #f0f8ff; border: 1px solid #333; border-radius: 5px; font-size: 20px; font-weight: bold; color: #333;">
              ${otp}
            </p>
          </div>
          <p>Thank you,<br>The Health Care Team</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; text-align: center; color: #999;">
            © 2024 Health Care. All rights reserved.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("email sent");
  } catch (error) {
    console.error("error in sending", error);
  }
};
