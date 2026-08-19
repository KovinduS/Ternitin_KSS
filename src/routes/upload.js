const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const ScanStore = require('../utils/scanStore');
const { extractText, cleanText, getWordCount } = require('../utils/textExtractor');
const { checkPlagiarism } = require('../utils/plagiarismChecker');
const { detectAIContent } = require('../utils/aiDetector');
const fs = require('fs').promises;
const path = require('path');

/**
 * POST /api/upload
 * Upload a file and process it for plagiarism and AI detection
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const filePath = file.path;

    // Create initial scan record
    const scan = await ScanStore.create({
      fileName: file.filename,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath: filePath,
      status: 'processing'
    });

    // Process asynchronously
    processScan(scan._id, filePath, file.mimetype).catch(err => {
      console.error('Processing error:', err);
    });

    res.json({
      success: true,
      scanId: scan._id,
      message: 'File uploaded successfully. Processing started.'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

/**
 * Process the scan: extract text, check plagiarism, detect AI
 */
async function processScan(scanId, filePath, mimeType) {
  try {
    // Extract text
    let extractedText = await extractText(filePath, mimeType);
    extractedText = cleanText(extractedText);
    const wordCount = getWordCount(extractedText);

    // Update scan with extracted text
    await ScanStore.findByIdAndUpdate(scanId, {
      extractedText,
      wordCount,
      status: 'processing'
    });

    if (wordCount < 20) {
      await ScanStore.findByIdAndUpdate(scanId, {
        status: 'failed',
        error: 'Document too short for analysis (minimum 20 words)'
      });
      return;
    }

    // Run plagiarism check and AI detection in parallel
    const [plagiarismResult, aiResult] = await Promise.all([
      checkPlagiarism(extractedText),
      detectAIContent(extractedText)
    ]);

    // Update with results
    await ScanStore.findByIdAndUpdate(scanId, {
      plagiarism: plagiarismResult,
      aiDetection: aiResult,
      status: 'completed'
    });

    console.log(`✅ Scan ${scanId} completed`);
  } catch (error) {
    console.error(`❌ Scan ${scanId} failed:`, error);
    await ScanStore.findByIdAndUpdate(scanId, {
      status: 'failed',
      error: error.message
    });
  }
}

/**
 * GET /api/upload/:id/status
 * Get scan status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({
      scanId: scan._id,
      status: scan.status,
      progress: scan.status === 'completed' ? 100 : scan.status === 'processing' ? 50 : 0,
      error: scan.error
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

module.exports = router;