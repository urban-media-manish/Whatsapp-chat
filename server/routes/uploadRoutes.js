import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${basename}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter(req, file, cb) {
    cb(null, true);
  }
});

const router = express.Router();

// @route POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  let type = 'file';
  const mime = req.file.mimetype;

  if (mime.startsWith('image/')) type = 'image';
  else if (mime.startsWith('audio/')) type = 'audio';
  else if (mime.startsWith('video/')) type = 'video';
  else if (mime === 'application/pdf') type = 'pdf';
  else if (mime.includes('word') || mime.includes('document')) type = 'document';
  else if (mime.includes('excel') || mime.includes('sheet')) type = 'document';

  res.json({
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    type
  });
});

export default router;
