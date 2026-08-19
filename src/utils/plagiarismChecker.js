const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Free plagiarism checker using search engines
 * Uses DuckDuckGo HTML scraping (no API key needed)
 * Also supports Google Custom Search if API key provided
 */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Search using DuckDuckGo (free, no API key)
 */
async function searchDuckDuckGo(query, maxResults = 5) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result__url').each((i, el) => {
      if (i >= maxResults) return false;
      const link = $(el).closest('.result').find('.result__title a').first();
      const snippet = $(el).closest('.result').find('.result__snippet').text();

      if (link.length) {
        results.push({
          title: link.text().trim(),
          url: link.attr('href'),
          snippet: snippet.trim()
        });
      }
    });

    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error.message);
    return [];
  }
}

/**
 * Search using Google Custom Search API (requires API key)
 */
async function searchGoogle(query, maxResults = 5) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    return [];
  }

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: cx,
        q: query,
        num: Math.min(maxResults, 10)
      },
      timeout: 10000
    });

    return (response.data.items || []).map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet
    }));
  } catch (error) {
    console.error('Google search error:', error.message);
    return [];
  }
}

/**
 * Calculate similarity between two texts using cosine similarity
 */
function calculateSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const allWords = new Set([...words1, ...words2]);
  const vector1 = [];
  const vector2 = [];

  for (const word of allWords) {
    vector1.push(words1.filter(w => w === word).length);
    vector2.push(words2.filter(w => w === word).length);
  }

  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return (dotProduct / (magnitude1 * magnitude2)) * 100;
}

/**
 * Check plagiarism for a text chunk
 */
async function checkChunk(chunk, chunkIndex) {
  // Use first 200 chars as search query
  const searchQuery = chunk.substring(0, 200).trim();

  // Try Google first if API key available, then DuckDuckGo
  let results = await searchGoogle(searchQuery, 3);

  if (results.length === 0) {
    results = await searchDuckDuckGo(searchQuery, 3);
  }

  const matches = [];

  for (const result of results) {
    // Fetch page content for better comparison
    try {
      const pageResponse = await axios.get(result.url, {
        headers: { 'User-Agent': getRandomUserAgent() },
        timeout: 8000,
        maxContentLength: 50000
      });

      const $ = cheerio.load(pageResponse.data);
      // Remove scripts, styles, etc.
      $('script, style, nav, footer, header, aside').remove();
      const pageText = $('body').text().substring(0, 5000);

      const similarity = calculateSimilarity(chunk, pageText);

      if (similarity > 15) { // Only consider matches above 15%
        matches.push({
          source: result.title,
          url: result.url,
          similarity: Math.round(similarity * 100) / 100,
          matchedText: chunk.substring(0, 200) + '...'
        });
      }
    } catch (e) {
      // If can't fetch page, use snippet similarity
      const similarity = calculateSimilarity(chunk, result.snippet);
      if (similarity > 20) {
        matches.push({
          source: result.title,
          url: result.url,
          similarity: Math.round(similarity * 100) / 100,
          matchedText: result.snippet
        });
      }
    }
  }

  return matches;
}

/**
 * Main plagiarism check function
 */
async function checkPlagiarism(text) {
  const { splitIntoChunks } = require('./textExtractor');
  const chunks = splitIntoChunks(text, 800);

  // Limit chunks to avoid too many requests
  const chunksToCheck = chunks.slice(0, 10);

  let allMatches = [];
  let totalSimilarity = 0;

  for (let i = 0; i < chunksToCheck.length; i++) {
    const chunk = chunksToCheck[i];
    if (chunk.length < 50) continue; // Skip very short chunks

    try {
      const matches = await checkChunk(chunk, i);
      allMatches.push(...matches);

      // Add delay to avoid rate limiting
      if (i < chunksToCheck.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error checking chunk ${i}:`, error.message);
    }
  }

  // Deduplicate matches by URL
  const uniqueMatches = [];
  const seenUrls = new Set();

  for (const match of allMatches) {
    if (!seenUrls.has(match.url)) {
      seenUrls.add(match.url);
      uniqueMatches.push(match);
    }
  }

  // Calculate overall plagiarism score
  if (uniqueMatches.length > 0) {
    totalSimilarity = uniqueMatches.reduce((sum, m) => sum + m.similarity, 0) / uniqueMatches.length;
  }

  // Sort by similarity descending
  uniqueMatches.sort((a, b) => b.similarity - a.similarity);

  return {
    score: Math.round(totalSimilarity * 100) / 100,
    matches: uniqueMatches.slice(0, 10), // Top 10 matches
    checkedAt: new Date()
  };
}

module.exports = { checkPlagiarism };