require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const uploadRoutes = require('./routes/upload');
const scanRoutes = require('./routes/scan');
const historyRoutes = require('./routes/history');
const ScanStore = require('./utils/scanStore');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/history', historyRoutes);

// Main page
app.get('/', (req, res) => {
  res.render('index');
});

// History page
app.get('/history', (req, res) => {
  res.render('history');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize storage (will use MongoDB if available, memory fallback otherwise)
let dbConnected = false;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ternitin')
.then(() => {
  console.log('✅ Connected to MongoDB');
  dbConnected = true;
  ScanStore.init(true);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.log('⚠️  Running without database - using in-memory storage');
  ScanStore.init(false);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});