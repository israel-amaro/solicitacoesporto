import app, { startServer } from "./server/index.js";

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

export default app;
