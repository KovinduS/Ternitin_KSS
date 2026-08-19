/**
 * In-memory storage fallback for when MongoDB is not available
 * Provides the same interface as the Mongoose Scan model
 */

const scans = new Map();
let scanCounter = 0;

function generateId() {
  return `mem_${Date.now()}_${++scanCounter}`;
}

class MemoryScan {
  constructor(data) {
    this._id = data._id || generateId();
    this.fileName = data.fileName;
    this.originalName = data.originalName;
    this.fileSize = data.fileSize;
    this.mimeType = data.mimeType;
    this.filePath = data.filePath;
    this.extractedText = data.extractedText || '';
    this.wordCount = data.wordCount || 0;
    this.plagiarism = data.plagiarism || { score: 0, matches: [], checkedAt: null };
    this.aiDetection = data.aiDetection || { score: 0, confidence: 0, indicators: {}, checkedAt: null, verdict: 'Unknown' };
    this.status = data.status || 'pending';
    this.error = data.error;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async findById(id) {
    return scans.get(id) || null;
  }

  static async findByIdAndUpdate(id, update) {
    const scan = scans.get(id);
    if (!scan) return null;

    Object.assign(scan, update);
    scan.updatedAt = new Date();
    scans.set(id, scan);
    return scan;
  }

  static async findByIdAndDelete(id) {
    return scans.delete(id);
  }

  static async find(query = {}) {
    let results = Array.from(scans.values());

    // Apply status filter
    if (query.status) {
      results = results.filter(s => s.status === query.status);
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal < bVal) return -1 * sortOrder;
      if (aVal > bVal) return 1 * sortOrder;
      return 0;
    });

    return results;
  }

  static async countDocuments(query = {}) {
    let count = scans.size;
    if (query.status) {
      count = Array.from(scans.values()).filter(s => s.status === query.status).length;
    }
    return count;
  }

  static async deleteMany(query = {}) {
    if (Object.keys(query).length === 0) {
      scans.clear();
    } else {
      for (const [id, scan] of scans) {
        let match = true;
        for (const [key, value] of Object.entries(query)) {
          if (scan[key] !== value) {
            match = false;
            break;
          }
        }
        if (match) scans.delete(id);
      }
    }
  }

  async save() {
    this._id = this._id || generateId();
    this.createdAt = this.createdAt || new Date();
    this.updatedAt = new Date();
    scans.set(this._id, this);
    return this;
  }
}

// Make it look like a Mongoose model
MemoryScan.schema = {};
MemoryScan.modelName = 'Scan';

module.exports = { MemoryScan, scans };