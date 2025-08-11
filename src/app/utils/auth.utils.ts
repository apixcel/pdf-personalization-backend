import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import config from "../config";
import AppError from "../errors/AppError";
import { IUserJWTPayload } from "../interface/auth.interface";
import User from "../models/user.model";
const generateAccessToken = (payload: IUserJWTPayload) => {
  const { EXPIRY, SECRET = "" } = config.ACCESS_TOKEN;

  const token = jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
  return token;
};

const generateRefreshToken = (id: string) => {
  const { EXPIRY, SECRET = "" } = config.REFRESH_TOKEN;
  const token = jwt.sign({ _id: id }, SECRET, { expiresIn: EXPIRY });
  return token;
};
const generateForgotPasswordToken = (id: string) => {
  const { EXPIRY, SECRET = "" } = config.RECOVERY_TOKEN;
  const token = jwt.sign({ userId: id }, SECRET, { expiresIn: EXPIRY });
  return token;
};

const generateOTP = (length = 6) => {
  const otp = crypto.randomInt(0, Math.pow(10, length)).toString().padStart(length, "0");
  return otp;
};

const verifyAccessToken = (token: string) => {
  const { SECRET = "" } = config.ACCESS_TOKEN;
  const payload = jwt.verify(token, SECRET);
  return payload;
};
const hashPassword = (password: string) => {
  const hash = bcrypt.hash(password, 10);
  return hash;
};
const sendMessage = async (data: { html: string; receiverMail: string; subject: string }) => {
  // under construction
  return data;
};
const sendEmail = async (data: { html: string; receiverMail: string; subject: string }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: config.MAIL_ADDRESS as string,
      pass: config.MAILPASS as string,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  const mailOptions = {
    from: config.MAIL_ADDRESS,
    to: data.receiverMail,
    subject: data.subject,
    html: data.html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

const sendVerificationEmail = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  if (user.isVerified) {
    throw new AppError(400, "User already verified");
  }
  const now = Date.now();
  const isCooldownActive = user.otp?.coolDown && user.otp.coolDown > now;

  if (isCooldownActive && user.otp?.coolDown) {
    const waitTime = Math.ceil((user.otp.coolDown - now) / 1000);

    return {
      cooldownEnd: user.otp?.coolDown,
      remainingSeconds: waitTime,
    };
  }
  const otp = Math.floor(100000 + Math.random() * 900000);
  const newCoolDown = now + 5 * 60 * 1000;
  const waitTime = Math.ceil((newCoolDown - now) / 1000);
  await User.findByIdAndUpdate(user._id, {
    otp: {
      code: otp,
      coolDown: newCoolDown,
    },
  });

  await sendMessage({
    html: `<p style="text-align: center;">Hey ${user.firstName} , your verification code is ${otp}</p>`,
    receiverMail: email,
    subject: "Account Verification",
  });

  return {
    cooldownEnd: newCoolDown,
    remainingSeconds: waitTime,
  };
};
const authUtils = {
  generateAccessToken,
  generateRefreshToken,
  generateOTP,
  verifyAccessToken,
  generateForgotPasswordToken,
  hashPassword,
  sendMessage,
  sendEmail,
  sendVerificationEmail,
};

export default authUtils;
