import nodemailer from "nodemailer";

export const DIRECT_SMTP_USER = "admregionalvitoria@gmail.com";
export const DIRECT_SMTP_PASS = "otyxtqbjhwgkdvuq";
export const DIRECT_SMTP_HOST = "smtp.gmail.com";
export const DIRECT_SMTP_PORT = 587;
export const DIRECT_SMTP_FROM = '"SENAI Porto" <admregionalvitoria@gmail.com>';

export function createTransporter() {
  const smtpUser = (process.env.SMTP_USER || DIRECT_SMTP_USER).trim();
  const smtpPass = (process.env.SMTP_PASS || DIRECT_SMTP_PASS).replace(/\s+/g, "");
  const smtpHost = (process.env.SMTP_HOST || DIRECT_SMTP_HOST).trim();
  const smtpPort = Number(process.env.SMTP_PORT) || DIRECT_SMTP_PORT;
  const isGmail = smtpHost.toLowerCase().includes("gmail") || smtpUser.toLowerCase().includes("@gmail.com");

  const config: any = isGmail ? {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 25000,
    tls: { rejectUnauthorized: false, minVersion: "TLSv1.2" }
  } : {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort === 587,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 25000,
    tls: { rejectUnauthorized: false, minVersion: "TLSv1.2" }
  };

  return nodemailer.createTransport(config);
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!to || typeof to !== "string" || !to.includes("@")) {
    console.warn("⚠️ [E-mail] Destinatário inválido ou não informado:", to);
    return { success: false, error: "Destinatário inválido" };
  }

  const smtpUser = (process.env.SMTP_USER || DIRECT_SMTP_USER).trim();

  try {
    const transporter = createTransporter();
    const fromAddress = process.env.SMTP_FROM || DIRECT_SMTP_FROM;
    const plainText = text || html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const cleanSubject = subject
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const mailOptions = {
      from: fromAddress,
      to: to.trim(),
      replyTo: smtpUser,
      subject: cleanSubject || subject,
      text: plainText,
      html,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "SENAI-Solicitacoes-Porto/2.0"
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [E-mail] Enviado com sucesso para ${to}: "${cleanSubject}" (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ [E-mail] Erro ao enviar para ${to}:`, error);
    return { success: false, error: error.message || String(error) };
  }
}
