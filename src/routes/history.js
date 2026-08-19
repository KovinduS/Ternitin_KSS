const express = require('express');
const router = express.Router();
const ScanStore = require('../utils/scanStore');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/history
 * Get scan history with pagination
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const query = {};
    if (status) query.status = status;

    // Use ScanStore which handles both MongoDB and memory
    let allScans = await ScanStore.find(query);

    // Sort
    allScans.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal < bVal) return -1 * sortOrder;
      if (aVal > bVal) return 1 * sortOrder;
      return 0;
    });

    // Paginate
    const total = allScans.length;
    const scans = allScans.slice((page - 1) * limit, page * limit);

    // Select only needed fields
    const selectedScans = scans.map(scan => ({
      _id: scan._id,
      fileName: scan.fileName,
      originalName: scan.originalName,
      fileSize: scan.fileSize,
      wordCount: scan.wordCount,
      status: scan.status,
      plagiarism: scan.plagiarism,
      aiDetection: scan.aiDetection,
      createdAt: scan.createdAt,
      updatedAt: scan.updatedAt
    }));

    res.json({
      scans: selectedScans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * GET /api/history/stats
 * Get statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const allScans = await ScanStore.find({});
    const totalScans = allScans.length;
    const completedScans = allScans.filter(s => s.status === 'completed').length;
    const failedScans = allScans.filter(s => s.status === 'failed').length;

    const completed = allScans.filter(s => s.status === 'completed');

    let avgPlagiarism = 0;
    let avgAI = 0;
    let totalWords = 0;

    if (completed.length > 0) {
      avgPlagiarism = completed.reduce((sum, s) => sum + (s.plagiarism?.score || 0), 0) / completed.length;
      avgAI = completed.reduce((sum, s) => sum + (s.aiDetection?.score || 0), 0) / completed.length;
      totalWords = completed.reduce((sum, s) => sum + (s.wordCount || 0), 0);
    }

    // Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentScans = allScans.filter(s => s.createdAt >= weekAgo).length;

    res.json({
      totalScans,
      completedScans,
      failedScans,
      successRate: totalScans > 0 ? Math.round((completedScans / totalScans) * 100) : 0,
      avgPlagiarismScore: Math.round(avgPlagiarism * 100) / 100,
      avgAIScore: Math.round(avgAI * 100) / 100,
      totalWordsScanned: totalWords,
      recentScans
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * DELETE /api/history/:id
 * Delete a scan record
 */
router.delete('/:id', async (req, res) => {
  try {
    const scan = await ScanStore.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Delete associated file
    try {
      await fs.unlink(path.join(__dirname, '../../', scan.filePath));
    } catch (e) {
      // File might not exist, ignore
    }

    await ScanStore.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Scan deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete scan' });
  }
});

/**
 * DELETE /api/history
 * Clear all history
 */
router.delete('/', async (req, res) => {
  try {
    const allScans = await ScanStore.find({});

    // Delete associated files
    for (const scan of allScans) {
      try {
        await fs.unlink(path.join(__dirname, '../../', scan.filePath));
      } catch (e) {
        // Ignore file errors
      }
    }

    await ScanStore.deleteMany({});
    res.json({ success: true, message: 'All history cleared' });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;