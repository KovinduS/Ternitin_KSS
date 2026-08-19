const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  wordCount: {
    type: Number,
    default: 0
  },
  // Plagiarism results
  plagiarism: {
    score: { type: Number, default: 0 },
    matches: [{
      source: String,
      url: String,
      similarity: Number,
      matchedText: String
    }],
    checkedAt: Date
  },
  // AI Detection results
  aiDetection: {
    score: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    indicators: {
      perplexity: Number,
      burstiness: Number,
      repetitionScore: Number
    },
    checkedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
scanSchema.index({ createdAt: -1 });
scanSchema.index({ status: 1 });

module.exports = mongoose.model('Scan', scanSchema);