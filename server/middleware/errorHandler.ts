export const globalErrorHandler = (err: any, req: any, res: any, next: any) => {
  console.error("Global Error:", err);
  res.status(500).json({
    error: "Erro interno do servidor",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};
