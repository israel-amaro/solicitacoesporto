import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import requestsRoutes from "./routes/requests.routes.js";
import loansRoutes from "./routes/loans.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { startBackgroundRoutines } from "./services/cronService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../");

export const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API Routes
app.use("/api", authRoutes);
app.use("/api", requestsRoutes);
app.use("/api", loansRoutes);
app.use("/api", catalogRoutes);
app.use("/api", uploadRoutes);

// Error Handler Middleware
app.use(globalErrorHandler);

// Setup Vite Development Server or Static Dist Output
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.status(404).send("Frontend build not found.");
        }
      });
    });
  }
}

export async function startServer() {
  await setupVite();
  startBackgroundRoutines();

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
