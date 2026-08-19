/**
 * Unified Scan storage interface
 * Uses MongoDB when available, falls back to in-memory storage
 */

let useMemory = false;
let MongooseScan = null;
let MemoryScan = null;

function init(mongodbConnected) {
  useMemory = !mongodbConnected;
  if (!useMemory) {
    try {
      MongooseScan = require('../models/Scan');
    } catch (e) {
      useMemory = true;
    }
  }

  if (useMemory) {
    MemoryScan = require('./memoryStore').MemoryScan;
    console.log('📝 Using in-memory storage (no MongoDB)');
  } else {
    console.log('💾 Using MongoDB storage');
  }
}

// Proxy methods to active store
const ScanStore = {
  init,

  get active() {
    return useMemory ? MemoryScan : MongooseScan;
  },

  async create(data) {
    if (useMemory) {
      const scan = new MemoryScan(data);
      return await scan.save();
    }
    return await MongooseScan.create(data);
  },

  async findByIdAndUpdate(id, update) {
    if (useMemory) {
      return await MemoryScan.findByIdAndUpdate(id, update);
    }
    return await MongooseScan.findByIdAndUpdate(id, update, { new: true });
  },

  async findById(id) {
    if (useMemory) {
      return await MemoryScan.findById(id);
    }
    return await MongooseScan.findById(id);
  },

  async findByIdAndDelete(id) {
    if (useMemory) {
      return await MemoryScan.findByIdAndDelete(id);
    }
    return await MongooseScan.findByIdAndDelete(id);
  },

  async find(query, options = {}) {
    if (useMemory) {
      return await MemoryScan.find(query);
    }

    let q = MongooseScan.find(query);

    if (options.sort) q = q.sort(options.sort);
    if (options.skip) q = q.skip(options.skip);
    if (options.limit) q = q.limit(options.limit);
    if (options.select) q = q.select(options.select);

    return await q.exec();
  },

  async countDocuments(query) {
    if (useMemory) {
      return await MemoryScan.countDocuments(query);
    }
    return await MongooseScan.countDocuments(query);
  },

  async deleteMany(query) {
    if (useMemory) {
      return await MemoryScan.deleteMany(query);
    }
    return await MongooseScan.deleteMany(query);
  }
};

module.exports = ScanStore;