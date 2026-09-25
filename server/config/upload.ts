import multer from "multer";

export const upload = multer({ storage: multer.memoryStorage() });

export interface InMemoryBlobItem {
  buffer: Buffer;
  mimeType: string;
  originalname: string;
  pathname: string;
}

export const inMemoryBlobs = new Map<string, InMemoryBlobItem>();
