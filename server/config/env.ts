import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// Configurações SMTP Diretas no Código
export const DIRECT_SMTP_USER = "admregionalvitoria@gmail.com";
export const DIRECT_SMTP_PASS = "otyxtqbjhwgkdvuq";
export const DIRECT_SMTP_HOST = "smtp.gmail.com";
export const DIRECT_SMTP_PORT = 587;
export const DIRECT_SMTP_FROM = '"SENAI Porto" <admregionalvitoria@gmail.com>';

export const SERVER_ROOT = path.resolve(__dirname, "../../");
