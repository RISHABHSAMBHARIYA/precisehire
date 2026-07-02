import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parseExcel } from '../services/excelParser.js';
import { s3Client } from '../config/awsConfig.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { saveCandidates } from '../services/dynamoService.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const candidates = parseExcel(req.file.buffer);
    
    // If no valid candidates found, return error (handles malformed/empty Excel)
    if (!candidates || candidates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No valid candidates found in the uploaded file. Ensure the Excel file has Name and Email columns.',
        count: 0,
        candidates: []
      });
    }

    const jobId = uuidv4();
    const timestamp = Date.now();
    const key = `uploads/${timestamp}_${req.file.originalname}`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    // Save to DynamoDB
    await saveCandidates(candidates, jobId);

    res.json({
      success: true,
      jobId,
      count: candidates.length,
      candidates: candidates.slice(0, 5) // Preview
    });
  } catch (error) {
    console.error('Upload route error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Multer error handler (e.g. file too large, wrong mime type)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only Excel files are allowed!') {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

export default router;
