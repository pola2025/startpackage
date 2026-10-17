import nodemailer from "nodemailer";

/**
 * 폴라애드 명의 메일 발송 (NAVER WORKS SMTP, From mkt@polarad.co.kr)
 * 기준 구현: F:\master_polarad\src\lib\mailer.ts
 * 규칙: F:\agents-rules\global\pola-codex\POLARAD_EMAIL_POLICY.md
 *   - From·Reply-To 는 mkt@polarad.co.kr, Gmail 등 다른 발신자로 바꾸지 않는다
 *   - 자격 증명이 없거나 인증에 실패하면 보내지 않고 오류를 돌려준다
 * Resend 는 쓰지 않는다 (사용자 지시 2026-10-17).
 */

const POLARAD_MAIL = "mkt@polarad.co.kr";

export interface PolaradMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function mailerConfig() {
  const host = process.env.SMTP_HOST || "smtp.worksmobile.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || POLARAD_MAIL;
  const pass = process.env.SMTP_PASS;
  if (!pass) throw new Error("SMTP 환경변수 누락: SMTP_PASS");
  if (user !== POLARAD_MAIL)
    throw new Error("발신 계정이 mkt@polarad.co.kr 이 아닙니다");
  return { host, port, user, pass };
}

export async function sendPolaradMail(input: PolaradMailInput): Promise<void> {
  const { host, port, user, pass } = mailerConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  const fromName = process.env.SMTP_FROM_NAME || "폴라애드";
  await transporter.sendMail({
    from: `${fromName} <${user}>`,
    replyTo: POLARAD_MAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
