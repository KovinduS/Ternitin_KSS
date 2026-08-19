/**
 * Free AI Content Detection using Statistical Analysis
 *
 * Based on:
 * - Perplexity: How "surprised" a language model is by the text
 * - Burstiness: Variation in sentence length and structure
 * - Repetition patterns: AI tends to repeat certain phrases
 * - N-gram diversity: Human writing has more diverse n-grams
 *
 * No external API required - runs completely locally
 */

/**
 * Tokenize text into words
 */
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Tokenize into sentences
 */
function tokenizeSentences(text) {
  return text.split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

/**
 * Calculate word frequency distribution
 */
function getWordFrequencies(tokens) {
  const freq = {};
  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }
  return freq;
}

/**
 * Calculate Perplexity approximation
 * Lower perplexity = more predictable = more likely AI
 * Higher perplexity = more surprising = more likely human
 */
function calculatePerplexity(tokens) {
  if (tokens.length < 10) return 50; // Default for very short text

  const freq = getWordFrequencies(tokens);
  const totalTokens = tokens.length;
  const uniqueTokens = Object.keys(freq).length;

  // Type-token ratio (vocabulary richness)
  const ttr = uniqueTokens / totalTokens;

  // Hapax legomena (words appearing once)
  const hapaxCount = Object.values(freq).filter(count => count === 1).length;
  const hapaxRatio = hapaxCount / uniqueTokens;

  // Estimate perplexity based on vocabulary richness
  // Human text typically has higher perplexity (more diverse vocabulary)
  // AI text tends to be more repetitive (lower perplexity)
  let perplexity = 10 + (ttr * 80) + (hapaxRatio * 100);

  // Normalize to 0-100 scale
  return Math.min(100, Math.max(0, perplexity));
}

/**
 * Calculate Burstiness
 * Measures variation in sentence length
 * Human writing has high burstiness (varied sentence lengths)
 * AI writing tends to have more uniform sentence lengths
 */
function calculateBurstiness(sentences) {
  if (sentences.length < 3) return 50;

  const lengths = sentences.map(s => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  if (mean === 0) return 50;

  // Coefficient of variation
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  // Convert to 0-100 scale (higher = more human-like)
  // Typical human CV: 0.4-0.8, AI CV: 0.2-0.4
  let burstiness = cv * 125;

  return Math.min(100, Math.max(0, burstiness));
}

/**
 * Calculate Repetition Score
 * Checks for repeated phrases and n-grams
 * AI tends to repeat certain transitions and phrases
 */
function calculateRepetitionScore(tokens) {
  if (tokens.length < 20) return 50;

  // Check bigrams (2-grams)
  const bigrams = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    bigrams[bigram] = (bigrams[bigram] || 0) + 1;
  }

  // Check trigrams (3-grams)
  const trigrams = {};
  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    trigrams[trigram] = (trigrams[trigram] || 0) + 1;
  }

  // Calculate repetition ratios
  const totalBigrams = tokens.length - 1;
  const repeatedBigrams = Object.values(bigrams).filter(count => count > 1).length;
  const bigramRepetition = repeatedBigrams / Math.max(1, Object.keys(bigrams).length);

  const totalTrigrams = tokens.length - 2;
  const repeatedTrigrams = Object.values(trigrams).filter(count => count > 1).length;
  const trigramRepetition = repeatedTrigrams / Math.max(1, Object.keys(trigrams).length);

  // Combined repetition score (lower = more human)
  const repetitionScore = (bigramRepetition * 0.4 + trigramRepetition * 0.6) * 100;

  // Invert: higher score = more likely AI
  return Math.min(100, Math.max(0, repetitionScore));
}

/**
 * Calculate Transition/Connective word usage
 * AI overuses certain transitions ("furthermore", "moreover", "additionally")
 */
function calculateTransitionScore(tokens) {
  const transitionWords = [
    'furthermore', 'moreover', 'additionally', 'consequently',
    'therefore', 'however', 'nevertheless', 'nonetheless',
    'meanwhile', 'subsequently', 'accordingly', 'hence',
    'thus', 'in conclusion', 'to summarize', 'in summary',
    'it is important to note', 'it should be noted',
    'crucial', 'essential', 'vital', 'paramount',
    'delve', 'tapestry', 'landscape', 'realm',
    'embark', 'unleash', 'unlock', 'harness',
    'elevate', 'transform', 'revolutionize', 'paradigm'
  ];

  const text = tokens.join(' ').toLowerCase();
  let transitionCount = 0;

  for (const word of transitionWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = text.match(regex);
    if (matches) transitionCount += matches.length;
  }

  // Normalize per 1000 words
  const per1000Words = (transitionCount / tokens.length) * 1000;

  // AI tends to use 3-8 transitions per 1000 words, humans 1-4
  let score = Math.min(100, per1000Words * 15);

  return score;
}

/**
 * Calculate Sentence Structure Complexity
 * AI tends to use more uniform, grammatically perfect sentences
 * Humans use more fragments, varied structures
 */
function calculateStructureScore(sentences) {
  if (sentences.length < 3) return 50;

  let complexityScore = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    const commas = (sentence.match(/,/g) || []).length;
    const semicolons = (sentence.match(/;/g) || []).length;
    const conjunctions = (sentence.match(/\b(and|but|or|so|yet|for|nor|because|although|while|since|unless|until|when|where|if|then)\b/gi) || []).length;

    // Complex sentences have more clauses
    const clauseIndicators = commas + semicolons + conjunctions;

    if (words > 15 && clauseIndicators > 2) {
      complexityScore += 1; // Complex sentence
    } else if (words < 8 && clauseIndicators === 0) {
      complexityScore -= 0.5; // Simple/fragment
    }
  }

  // Normalize
  const avgComplexity = complexityScore / sentences.length;
  let score = 50 + (avgComplexity * 20);

  return Math.min(100, Math.max(0, score));
}

/**
 * Main AI Detection Function
 */
function detectAIContent(text) {
  const tokens = tokenize(text);
  const sentences = tokenizeSentences(text);

  if (tokens.length < 50) {
    return {
      score: 50,
      confidence: 30,
      indicators: {
        perplexity: 50,
        burstiness: 50,
        repetitionScore: 50,
        transitionScore: 50,
        structureScore: 50
      },
      checkedAt: new Date(),
      note: 'Text too short for reliable detection (minimum 50 words recommended)'
    };
  }

  // Calculate all indicators
  const perplexity = calculatePerplexity(tokens);
  const burstiness = calculateBurstiness(sentences);
  const repetitionScore = calculateRepetitionScore(tokens);
  const transitionScore = calculateTransitionScore(tokens);
  const structureScore = calculateStructureScore(sentences);

  // Weighted scoring
  // High perplexity = human, Low = AI
  // High burstiness = human, Low = AI
  // High repetition = AI, Low = human
  // High transitions = AI, Low = human
  // High structure uniformity = AI

  const aiScore = (
    (100 - perplexity) * 0.25 +      // Low perplexity -> AI
    (100 - burstiness) * 0.25 +      // Low burstiness -> AI
    repetitionScore * 0.20 +          // High repetition -> AI
    transitionScore * 0.15 +          // High transitions -> AI
    structureScore * 0.15             // High uniformity -> AI
  );

  const finalScore = Math.round(Math.min(100, Math.max(0, aiScore)));
  const confidence = Math.min(95, 40 + (tokens.length / 20)); // More text = higher confidence

  let verdict;
  if (finalScore >= 70) verdict = 'Likely AI-Generated';
  else if (finalScore >= 40) verdict = 'Possibly AI-Generated';
  else verdict = 'Likely Human-Written';

  return {
    score: finalScore,
    confidence: Math.round(confidence),
    verdict,
    indicators: {
      perplexity: Math.round(perplexity),
      burstiness: Math.round(burstiness),
      repetitionScore: Math.round(repetitionScore),
      transitionScore: Math.round(transitionScore),
      structureScore: Math.round(structureScore)
    },
    checkedAt: new Date(),
    wordCount: tokens.length,
    sentenceCount: sentences.length
  };
}

module.exports = { detectAIContent };