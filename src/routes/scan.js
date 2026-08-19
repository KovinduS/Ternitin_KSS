const express = require('express');
const router = express.Router();
const ScanStore = require('../utils/scanStore');

/**
 * GET /api/scan/:id
 * Get full scan results
 */
router.get('/:id', async (req, res) => {
  try {
    const scan = await ScanStore.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({
      scanId: scan._id,
      fileName: scan.originalName,
      fileSize: scan.fileSize,
      wordCount: scan.wordCount,
      status: scan.status,
      plagiarism: scan.plagiarism,
      aiDetection: scan.aiDetection,
      createdAt: scan.createdAt,
      updatedAt: scan.updatedAt,
      error: scan.error
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get scan results' });
  }
});

/**
 * GET /api/scan/:id/report
 * Get formatted report
 */
router.get('/:id/report', async (req, res) => {
  try {
    const scan = await ScanStore.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    if (scan.status !== 'completed') {
      return res.status(400).json({ error: 'Scan not completed yet' });
    }

    const report = {
      summary: {
        fileName: scan.originalName,
        wordCount: scan.wordCount,
        scannedAt: scan.updatedAt || scan.createdAt,
        plagiarismScore: scan.plagiarism?.score || 0,
        aiScore: scan.aiDetection?.score || 0,
        verdict: getOverallVerdict(scan.plagiarism?.score, scan.aiDetection?.score)
      },
      plagiarism: {
        score: scan.plagiarism?.score || 0,
        matches: scan.plagiarism?.matches || [],
        totalMatches: scan.plagiarism?.matches?.length || 0
      },
      aiDetection: {
        score: scan.aiDetection?.score || 0,
        confidence: scan.aiDetection?.confidence || 0,
        verdict: scan.aiDetection?.verdict || 'Unknown',
        indicators: scan.aiDetection?.indicators || {},
        details: scan.aiDetection
      }
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

function getOverallVerdict(plagiarismScore, aiScore) {
  if (plagiarismScore > 50 && aiScore > 50) return 'High Risk - Both Plagiarism & AI Detected';
  if (plagiarismScore > 50) return 'High Risk - Plagiarism Detected';
  if (aiScore > 50) return 'High Risk - AI Content Detected';
  if (plagiarismScore > 20 || aiScore > 40) return 'Moderate Risk - Review Recommended';
  return 'Low Risk - Content Appears Original';
}

module.exports = router;