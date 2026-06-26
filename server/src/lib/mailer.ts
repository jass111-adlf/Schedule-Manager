import nodemailer from 'nodemailer';
import { env } from '../config/env';

// In development without real SMTP, the transporter is created but sends will
// silently fail (caught in the reminder worker) rather than crashing the server.
export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export async function sendMail(options: { to: string; subject: string; html: string }): Promise<void> {
  if (!env.SMTP_USER) {
    console.log(`[Mailer] No SMTP_USER configured — skipping email to ${options.to}: ${options.subject}`);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, ...options });
}
