const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * Extract text from PDF file
 */
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX file
 */
async function extractFromDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from plain text file
 */
async function extractFromTXT(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf-8');
    return text.trim();
  } catch (error) {
    console.error('TXT extraction error:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Main function to extract text based on file extension
 */
async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return await extractFromPDF(filePath);
    case '.docx':
      return await extractFromDOCX(filePath);
    case '.doc':
      // For .doc files, we'll try mammoth (may not work for old .doc)
      try {
        return await extractFromDOCX(filePath);
      } catch {
        throw new Error('Old .doc format not supported. Please convert to .docx');
      }
    case '.txt':
      return await extractFromTXT(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/\n+/g, '\n')          // Multiple newlines to single
    .replace(/\r/g, '')             // Remove carriage returns
    .trim();
}

/**
 * Get word count
 */
function getWordCount(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Split text into chunks for processing
 */
function splitIntoChunks(text, maxChunkSize = 1000) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

module.exports = {
  extractText,
  cleanText,
  getWordCount,
  splitIntoChunks
};