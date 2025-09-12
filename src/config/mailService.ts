// src/config/mailService.ts
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "./env";

export const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: false,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
} as SMTPTransport.Options);

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  return transporter.sendMail({
    from: `"${env.mailFromName}" <${env.mailFromEmail}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: env.mailReplyTo || env.mailFromEmail,
  });
}
