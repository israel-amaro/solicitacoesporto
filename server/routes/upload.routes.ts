import { Router } from "express";
import { put, del } from "@vercel/blob";
import { upload, inMemoryBlobs } from "../config/upload.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/files", authenticate, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") return res.status(400).json({ error: "No url provided" });
    
    if (inMemoryBlobs.has(url)) {
      const blob = inMemoryBlobs.get(url)!;
      res.setHeader("Content-Type", blob.mimeType);
      return res.send(blob.buffer);
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const response = await fetch(url, {
        headers: process.env.BLOB_READ_WRITE_TOKEN ? {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        } : {}
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch file" });
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    return res.status(404).json({ error: "File not found" });
  } catch (error: any) {
    console.error("File proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`tickets/${Date.now()}-${req.file.originalname}`, req.file.buffer, {
          access: "private"
        });
        return res.json({ url: blob.url, path: blob.pathname });
      } catch (blobErr) {
        console.warn("Vercel Blob put failed, falling back to in-memory store:", blobErr);
      }
    }
    
    const id = `tickets/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    inMemoryBlobs.set(id, {
      buffer: req.file.buffer,
      mimeType: req.file.mimetype || "application/octet-stream",
      originalname: req.file.originalname,
      pathname: id
    });
    res.json({ url: `/api/files?url=${encodeURIComponent(id)}`, path: id });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/upload", authenticate, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: "No path provided" });
    
    if (inMemoryBlobs.has(path)) {
      inMemoryBlobs.delete(path);
      return res.json({ success: true });
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(path);
      } catch (delErr) {
        console.warn("Vercel Blob del failed:", delErr);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
