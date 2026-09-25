import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  next();
};

export function userHasModuleAccess(user: any, module: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  if (Array.isArray(user.allowed_modules) && user.allowed_modules.length > 0) {
    if (user.allowed_modules.includes(module)) return true;
    if (user.allowed_modules.includes("compras")) {
      if (module === "compras_solicitar" && (user.role === "supervisor" || user.role === "docente")) return true;
      if (module === "compras_atender" && (user.role === "comprador" || user.role === "gestor")) return true;
    }
    return false;
  }

  if (module === "compras_solicitar") {
    return user.role === "supervisor" || user.role === "docente";
  }
  if (module === "compras_atender") {
    return user.role === "comprador" || user.role === "gestor";
  }
  if (module === "compras") {
    return user.role === "supervisor" || user.role === "comprador" || user.role === "gestor";
  }
  return false;
}
