/**
 * Arabic text utilities for Quran verse matching.
 * Provides normalization and similarity scoring for fuzzy matching.
 */

/**
 * Unicode ranges for Arabic diacritical marks (tashkeel/harakat).
 * These are removed for text comparison since speech recognition
 * often produces text without proper diacritics.
 */
const TASHKEEL_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g

/**
 * Common Arabic letter variations that should be normalized for comparison.
 */
const LETTER_NORMALIZATIONS: Record<string, string> = {
  // Alef variations -> plain alef
  '\u0622': '\u0627', // Alef with madda
  '\u0623': '\u0627', // Alef with hamza above
  '\u0625': '\u0627', // Alef with hamza below
  '\u0671': '\u0627', // Alef wasla
  // Teh marbuta -> heh
  '\u0629': '\u0647', // Teh marbuta
  // Alef maksura -> yeh
  '\u0649': '\u064A', // Alef maksura
}

/**
 * Normalizes Arabic text for comparison by:
 * 1. Removing tashkeel (diacritical marks)
 * 2. Normalizing letter variations
 * 3. Trimming whitespace
 *
 * @param text - The Arabic text to normalize
 * @returns Normalized text suitable for comparison
 */
export function normalizeArabic(text: string): string {
  if (!text) return ''

  let normalized = text
    // Remove tashkeel
    .replace(TASHKEEL_REGEX, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Apply letter normalizations
  for (const [from, to] of Object.entries(LETTER_NORMALIZATIONS)) {
    normalized = normalized.replace(new RegExp(from, 'g'), to)
  }

  return normalized
}

/**
 * Calculates the Levenshtein distance between two strings.
 * Used as a basis for similarity scoring.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance between the strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculates similarity between two Arabic texts.
 * Returns a score from 0 to 1, where 1 is an exact match.
 *
 * @param text1 - First text (typically transcribed speech)
 * @param text2 - Second text (typically Quran verse)
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeArabic(text1)
  const normalized2 = normalizeArabic(text2)

  if (normalized1 === normalized2) return 1
  if (normalized1.length === 0 || normalized2.length === 0) return 0

  const distance = levenshteinDistance(normalized1, normalized2)
  const maxLength = Math.max(normalized1.length, normalized2.length)

  return 1 - distance / maxLength
}

/**
 * Checks if text1 is a substring match within text2.
 * Useful for matching partial verse recitations.
 *
 * @param partial - The partial text (transcription)
 * @param full - The full text (verse)
 * @returns True if partial is found within full after normalization
 */
export function isSubstringMatch(partial: string, full: string): boolean {
  const normalizedPartial = normalizeArabic(partial)
  const normalizedFull = normalizeArabic(full)

  return normalizedFull.includes(normalizedPartial)
}

/**
 * Finds the best matching segment in a longer text.
 * Useful when transcription captures only part of a verse.
 *
 * @param query - The query text (transcription)
 * @param target - The target text to search within (verse)
 * @param windowSize - Size of sliding window (defaults to query length)
 * @returns Object with best match info or null if no good match
 */
export function findBestSegmentMatch(
  query: string,
  target: string,
  windowSize?: number
): { startIndex: number; endIndex: number; similarity: number } | null {
  const normalizedQuery = normalizeArabic(query)
  const normalizedTarget = normalizeArabic(target)

  if (normalizedQuery.length === 0 || normalizedTarget.length === 0) {
    return null
  }

  // If query is longer than target, compare full texts
  if (normalizedQuery.length >= normalizedTarget.length) {
    return {
      startIndex: 0,
      endIndex: normalizedTarget.length,
      similarity: calculateSimilarity(normalizedQuery, normalizedTarget),
    }
  }

  const window = windowSize || normalizedQuery.length
  let bestMatch = { startIndex: 0, endIndex: window, similarity: 0 }

  // Slide window across target
  for (let i = 0; i <= normalizedTarget.length - window; i++) {
    const segment = normalizedTarget.substring(i, i + window)
    const similarity = calculateSimilarity(normalizedQuery, segment)

    if (similarity > bestMatch.similarity) {
      bestMatch = { startIndex: i, endIndex: i + window, similarity }
    }
  }

  return bestMatch.similarity > 0 ? bestMatch : null
}
