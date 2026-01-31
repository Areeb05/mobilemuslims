/**
 * Client-side Quran verse matcher using fuzzy string matching.
 * Matches transcribed Arabic speech against Quran verses.
 */

import { loadArabicQuran, loadTranslation, getSurahMeta, getVersesInRange, getSurahAyahCount, type QuranVerse, type SurahMeta } from './quran-data'
import { normalizeArabic, calculateSimilarity } from './arabic-utils'

/**
 * Represents a matched Quran verse with translation.
 */
export interface QuranMatch {
  found: boolean
  surah: number
  surahName: string
  surahNameArabic: string
  ayah: number
  arabicText: string
  translation: string
  edition: string
  confidence: number
}

/**
 * Cached data for matching.
 */
let arabicVersesCache: QuranVerse[] | null = null
let translationCache: Map<string, QuranVerse[]> = new Map()
let surahMetaCache: SurahMeta[] | null = null
let normalizedVersesCache: Map<number, { verse: QuranVerse; normalized: string }[]> = new Map()

/**
 * Common surahs recited in Salah, ordered by frequency.
 * These are searched first for faster matching.
 */
const COMMON_SALAH_SURAHS = [
  1,   // Al-Fatiha (required in every rakat)
  112, // Al-Ikhlas
  113, // Al-Falaq
  114, // An-Nas
  110, // An-Nasr
  108, // Al-Kawthar
  107, // Al-Ma'un
  109, // Al-Kafirun
  111, // Al-Masad
  105, // Al-Fil
  106, // Quraysh
  102, // At-Takathur
  103, // Al-Asr
  104, // Al-Humazah
  101, // Al-Qari'ah
  99,  // Az-Zalzalah
  97,  // Al-Qadr
  96,  // Al-Alaq
  95,  // At-Tin
  94,  // Ash-Sharh
  93,  // Ad-Duhaa
  91,  // Ash-Shams
  92,  // Al-Lail
  90,  // Al-Balad
  87,  // Al-A'la
  88,  // Al-Ghashiyah
]

/**
 * Default confidence threshold for verse matching.
 */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7

/**
 * Ensures Arabic verses are loaded and normalized.
 */
async function ensureArabicLoaded(): Promise<void> {
  if (!arabicVersesCache) {
    arabicVersesCache = await loadArabicQuran()
    
    // Pre-normalize and organize by surah
    normalizedVersesCache.clear()
    for (const verse of arabicVersesCache) {
      const surahVerses = normalizedVersesCache.get(verse.surah) || []
      surahVerses.push({
        verse,
        normalized: normalizeArabic(verse.text)
      })
      normalizedVersesCache.set(verse.surah, surahVerses)
    }
  }
}

/**
 * Ensures translation is loaded.
 */
async function ensureTranslationLoaded(edition: string): Promise<QuranVerse[]> {
  let cached = translationCache.get(edition)
  if (!cached) {
    cached = await loadTranslation(edition)
    translationCache.set(edition, cached)
  }
  return cached
}

/**
 * Ensures surah metadata is loaded.
 */
async function ensureSurahMetaLoaded(): Promise<SurahMeta[]> {
  if (!surahMetaCache) {
    surahMetaCache = await getSurahMeta()
  }
  return surahMetaCache
}

/**
 * Searches for a matching verse in a specific surah.
 *
 * @param normalizedQuery - The normalized query text
 * @param surahNumber - The surah number to search in
 * @param confidenceThreshold - Minimum confidence for a match
 * @returns Best match in the surah or null
 */
function searchInSurah(
  normalizedQuery: string,
  surahNumber: number,
  confidenceThreshold: number
): { verse: QuranVerse; confidence: number } | null {
  const surahVerses = normalizedVersesCache.get(surahNumber)
  if (!surahVerses) return null

  let bestMatch: { verse: QuranVerse; confidence: number } | null = null

  for (const { verse, normalized } of surahVerses) {
    const similarity = calculateSimilarity(normalizedQuery, normalized)

    if (similarity >= confidenceThreshold && (!bestMatch || similarity > bestMatch.confidence)) {
      bestMatch = { verse, confidence: similarity }
    }
  }

  return bestMatch
}

/**
 * Searches for a matching verse across the Quran.
 * Searches common Salah surahs first, then expands to all surahs.
 *
 * @param arabicText - The transcribed Arabic text
 * @param translationEdition - The translation edition
 * @param confidenceThreshold - Minimum confidence for a match
 * @returns QuranMatch if found, null otherwise
 */
export async function searchVerse(
  arabicText: string,
  translationEdition: string = 'en.sahih',
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): Promise<QuranMatch | null> {
  if (!arabicText || arabicText.trim().length < 3) {
    return null
  }

  // Ensure all data is loaded
  await ensureArabicLoaded()
  const translations = await ensureTranslationLoaded(translationEdition)
  const surahMeta = await ensureSurahMetaLoaded()

  const normalizedQuery = normalizeArabic(arabicText)
  let bestMatch: { verse: QuranVerse; confidence: number } | null = null

  // First pass: Search common Salah surahs (fast path)
  for (const surahNumber of COMMON_SALAH_SURAHS) {
    const match = searchInSurah(normalizedQuery, surahNumber, confidenceThreshold)

    if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = match

      // If we have a very high confidence match, return early
      if (match.confidence >= 0.95) {
        break
      }
    }
  }

  // If we found a decent match in common surahs, skip full search
  if (bestMatch && bestMatch.confidence >= 0.85) {
    // Build the result
    const meta = surahMeta.find(s => s.number === bestMatch!.verse.surah)
    const translation = translations.find(
      v => v.surah === bestMatch!.verse.surah && v.ayah === bestMatch!.verse.ayah
    )

    return {
      found: true,
      surah: bestMatch.verse.surah,
      surahName: meta?.name || `Surah ${bestMatch.verse.surah}`,
      surahNameArabic: meta?.nameArabic || '',
      ayah: bestMatch.verse.ayah,
      arabicText: bestMatch.verse.text,
      translation: translation?.text || '',
      edition: translationEdition,
      confidence: bestMatch.confidence
    }
  }

  // Second pass: Search remaining surahs
  const remainingSurahs = Array.from({ length: 114 }, (_, i) => i + 1)
    .filter(n => !COMMON_SALAH_SURAHS.includes(n))

  for (const surahNumber of remainingSurahs) {
    const match = searchInSurah(normalizedQuery, surahNumber, confidenceThreshold)

    if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = match

      // If we have a very high confidence match, return early
      if (match.confidence >= 0.95) {
        break
      }
    }
  }

  if (!bestMatch) {
    return null
  }

  // Build the result
  const meta = surahMeta.find(s => s.number === bestMatch!.verse.surah)
  const translation = translations.find(
    v => v.surah === bestMatch!.verse.surah && v.ayah === bestMatch!.verse.ayah
  )

  return {
    found: true,
    surah: bestMatch.verse.surah,
    surahName: meta?.name || `Surah ${bestMatch.verse.surah}`,
    surahNameArabic: meta?.nameArabic || '',
    ayah: bestMatch.verse.ayah,
    arabicText: bestMatch.verse.text,
    translation: translation?.text || '',
    edition: translationEdition,
    confidence: bestMatch.confidence
  }
}

/**
 * Preloads Quran data for faster matching.
 * Call this on component mount for better UX.
 *
 * @param translationEdition - The translation edition to preload
 */
export async function preloadQuranMatcher(translationEdition: string = 'en.sahih'): Promise<void> {
  await Promise.all([
    ensureArabicLoaded(),
    ensureTranslationLoaded(translationEdition),
    ensureSurahMetaLoaded()
  ])
}

/**
 * Clears all cached data.
 */
export function clearMatcherCache(): void {
  arabicVersesCache = null
  translationCache.clear()
  surahMetaCache = null
  normalizedVersesCache.clear()
}

// ============================================================================
// VERSE FOLLOWING FEATURE
// ============================================================================

/**
 * Confidence threshold to lock onto a verse and start following.
 */
export const LOCK_CONFIDENCE_THRESHOLD = 0.90

/**
 * Number of verses to display ahead of current position.
 */
export const VERSES_AHEAD_COUNT = 4

/**
 * Lower confidence threshold when matching against expected verses.
 * We can be more lenient since we know which verses to expect.
 */
export const FOLLOW_MATCH_THRESHOLD = 0.75

/**
 * Represents a position in the Quran (surah and ayah).
 */
export interface VersePosition {
  surah: number
  ayah: number
}

/**
 * Represents a verse for display with status indicators.
 */
export interface DisplayVerse {
  surah: number
  ayah: number
  surahName: string
  surahNameArabic: string
  arabicText: string
  translation: string
  isCurrent: boolean
  isPast: boolean
}

/**
 * State for verse following mode.
 */
export interface FollowingState {
  lockedPosition: VersePosition
  verses: DisplayVerse[]
  currentIndex: number
  /** Total ayahs in the current surah for accurate end detection */
  surahAyahCount: number
}

/**
 * Result of matching against expected verses.
 */
export interface ExpectedVerseMatch {
  matched: boolean
  verseIndex: number  // Index in the expected verses array (-1 if not found)
  confidence: number
  isCurrentVerse: boolean
  isNextVerse: boolean
  isSkipAhead: boolean
  position: VersePosition | null
}

/**
 * Gets sequential verses starting from a position for display.
 * Returns verses with isCurrent and isPast flags based on currentIndex.
 *
 * @param surah - Starting surah number
 * @param ayah - Starting ayah number
 * @param count - Number of verses to fetch (including current)
 * @param currentIndex - Index of the currently recited verse (0-based)
 * @param translationEdition - Translation edition
 * @returns Array of DisplayVerse objects
 */
export async function getSequentialVerses(
  surah: number,
  ayah: number,
  count: number,
  currentIndex: number,
  translationEdition: string = 'en.sahih'
): Promise<DisplayVerse[]> {
  const verses = await getVersesInRange(surah, ayah, count, translationEdition)
  
  return verses.map((v, index) => ({
    surah: v.surah,
    ayah: v.ayah,
    surahName: v.surahName,
    surahNameArabic: v.surahNameArabic,
    arabicText: v.arabicText,
    translation: v.translation,
    isCurrent: index === currentIndex,
    isPast: index < currentIndex
  }))
}

/**
 * Matches transcript against a set of expected verses.
 * Used in following mode for efficient matching against known positions.
 *
 * @param arabicText - The transcribed Arabic text
 * @param expectedVerses - Array of verses to match against
 * @param currentIndex - Current verse index in the expected array
 * @returns Match result with position info
 */
export function matchAgainstExpected(
  arabicText: string,
  expectedVerses: DisplayVerse[],
  currentIndex: number
): ExpectedVerseMatch {
  if (!arabicText || arabicText.trim().length < 3 || expectedVerses.length === 0) {
    return {
      matched: false,
      verseIndex: -1,
      confidence: 0,
      isCurrentVerse: false,
      isNextVerse: false,
      isSkipAhead: false,
      position: null
    }
  }

  const normalizedQuery = normalizeArabic(arabicText)
  let bestMatch: { index: number; confidence: number } | null = null

  // Check each expected verse
  for (let i = 0; i < expectedVerses.length; i++) {
    const verse = expectedVerses[i]
    const normalizedVerse = normalizeArabic(verse.arabicText)
    const similarity = calculateSimilarity(normalizedQuery, normalizedVerse)

    if (similarity >= FOLLOW_MATCH_THRESHOLD) {
      if (!bestMatch || similarity > bestMatch.confidence) {
        bestMatch = { index: i, confidence: similarity }
      }
    }
  }

  if (!bestMatch) {
    return {
      matched: false,
      verseIndex: -1,
      confidence: 0,
      isCurrentVerse: false,
      isNextVerse: false,
      isSkipAhead: false,
      position: null
    }
  }

  const matchedVerse = expectedVerses[bestMatch.index]
  
  return {
    matched: true,
    verseIndex: bestMatch.index,
    confidence: bestMatch.confidence,
    isCurrentVerse: bestMatch.index === currentIndex,
    isNextVerse: bestMatch.index === currentIndex + 1,
    isSkipAhead: bestMatch.index > currentIndex + 1,
    position: {
      surah: matchedVerse.surah,
      ayah: matchedVerse.ayah
    }
  }
}

/**
 * Detects if the transcript matches a different surah than expected.
 * Used to detect surah transitions (e.g., Al-Fatiha -> another surah).
 *
 * @param arabicText - The transcribed Arabic text
 * @param currentSurah - The current surah being recited
 * @param translationEdition - Translation edition
 * @returns QuranMatch if a different surah is detected, null otherwise
 */
export async function detectSurahChange(
  arabicText: string,
  currentSurah: number,
  translationEdition: string = 'en.sahih'
): Promise<QuranMatch | null> {
  // Use full search but look for high confidence match in different surah
  const match = await searchVerse(arabicText, translationEdition, FOLLOW_MATCH_THRESHOLD)
  
  if (match && match.surah !== currentSurah && match.confidence >= LOCK_CONFIDENCE_THRESHOLD) {
    return match
  }
  
  return null
}

/**
 * Creates a FollowingState from a locked QuranMatch.
 *
 * @param match - The verse match to lock onto
 * @param translationEdition - Translation edition
 * @returns FollowingState ready for verse following
 */
export async function createFollowingState(
  match: QuranMatch,
  translationEdition: string = 'en.sahih'
): Promise<FollowingState> {
  const [verses, surahMeta] = await Promise.all([
    getSequentialVerses(
      match.surah,
      match.ayah,
      VERSES_AHEAD_COUNT + 1, // Current + ahead
      0, // Current is at index 0
      translationEdition
    ),
    getSurahAyahCount(match.surah)
  ])

  return {
    lockedPosition: {
      surah: match.surah,
      ayah: match.ayah
    },
    verses,
    currentIndex: 0,
    surahAyahCount: surahMeta ?? 0
  }
}

/**
 * Advances the following state to the next verse position.
 *
 * @param state - Current following state
 * @param newIndex - New current index
 * @param translationEdition - Translation edition
 * @returns Updated FollowingState
 */
export async function advanceFollowingState(
  state: FollowingState,
  newIndex: number,
  translationEdition: string = 'en.sahih'
): Promise<FollowingState> {
  // If we're past midpoint, reload verses starting from new position
  if (newIndex >= Math.floor(state.verses.length / 2)) {
    const currentVerse = state.verses[newIndex]
    if (!currentVerse) {
      return state
    }

    // Check if surah changed
    const surahChanged = currentVerse.surah !== state.lockedPosition.surah

    const [verses, surahAyahCount] = await Promise.all([
      getSequentialVerses(
        currentVerse.surah,
        currentVerse.ayah,
        VERSES_AHEAD_COUNT + 1,
        0, // Reset to 0 since we're reloading
        translationEdition
      ),
      // Only fetch new ayah count if surah changed
      surahChanged ? getSurahAyahCount(currentVerse.surah) : Promise.resolve(state.surahAyahCount)
    ])

    return {
      lockedPosition: {
        surah: currentVerse.surah,
        ayah: currentVerse.ayah
      },
      verses,
      currentIndex: 0,
      surahAyahCount: surahAyahCount ?? state.surahAyahCount
    }
  }

  // Just update the current index and flags
  const updatedVerses = state.verses.map((v, i) => ({
    ...v,
    isCurrent: i === newIndex,
    isPast: i < newIndex
  }))

  return {
    ...state,
    verses: updatedVerses,
    currentIndex: newIndex
  }
}

// ============================================================================
// EDGE CASE HANDLING
// ============================================================================

/**
 * Al-Fatiha (Surah 1) - recited in every rakat of prayer.
 */
export const AL_FATIHA_SURAH = 1

/**
 * Checks if the current position is at the end of a surah.
 *
 * @param state - Current following state
 * @returns True if at last verse of surah
 */
export function isAtEndOfSurah(state: FollowingState): boolean {
  const currentVerse = state.verses[state.currentIndex]
  if (!currentVerse) return false
  
  // Use the actual surah ayah count for accurate detection
  if (state.surahAyahCount > 0) {
    // Check if current ayah is the last ayah of the surah
    return currentVerse.ayah >= state.surahAyahCount
  }
  
  // Fallback: Check if no more verses ahead in the loaded verses
  // This can happen if surahAyahCount wasn't properly loaded
  const remainingVerses = state.verses.length - state.currentIndex - 1
  return remainingVerses === 0
}

/**
 * Checks if the transcript might be starting Al-Fatiha.
 * Al-Fatiha starts with Bismillah (verse 1:1), which is common.
 * We use additional heuristics for better detection.
 *
 * @param arabicText - The transcribed Arabic text
 * @returns Confidence score (0-1) that this is Al-Fatiha starting
 */
export function detectAlFatihaStart(arabicText: string): number {
  if (!arabicText || arabicText.length < 5) return 0
  
  const normalizedText = normalizeArabic(arabicText)
  
  // Common phrases that strongly indicate Al-Fatiha
  const alFatihaIndicators = [
    'الحمد لله رب العالمين',  // Alhamdulillahi Rabbil Alameen (1:2)
    'الرحمن الرحيم',           // Ar-Rahman Ar-Raheem (1:3)
    'مالك يوم الدين',          // Maliki Yawmid-Deen (1:4)
    'اياك نعبد',               // Iyyaka na'budu (1:5)
    'اهدنا الصراط',            // Ihdinas-Sirat (1:6)
  ]
  
  for (const indicator of alFatihaIndicators) {
    const normalizedIndicator = normalizeArabic(indicator)
    const similarity = calculateSimilarity(normalizedText, normalizedIndicator)
    if (similarity >= 0.7) {
      return similarity
    }
  }
  
  return 0
}

/**
 * Detects if the transcript is the Bismillah (بسم الله الرحمن الرحيم).
 * Bismillah appears at the start of most surahs (except 9 and 1).
 *
 * @param arabicText - The transcribed Arabic text
 * @returns True if this appears to be Bismillah
 */
export function isBismillah(arabicText: string): boolean {
  if (!arabicText || arabicText.length < 5) return false
  
  const normalizedText = normalizeArabic(arabicText)
  const bismillah = normalizeArabic('بسم الله الرحمن الرحيم')
  
  const similarity = calculateSimilarity(normalizedText, bismillah)
  return similarity >= 0.75
}

/**
 * Result of end-of-surah analysis.
 */
export interface EndOfSurahResult {
  isAtEnd: boolean
  currentSurah: number
  currentAyah: number
  likelyNextSurah: number | null
  isAlFatihaLikely: boolean
  isBismillahDetected: boolean
}

/**
 * Analyzes the current state to determine if we're at the end of a surah
 * and what the likely next surah might be.
 *
 * @param state - Current following state
 * @param arabicText - Latest transcribed text (for detecting new surah start)
 * @returns Analysis result
 */
export function analyzeEndOfSurah(
  state: FollowingState,
  arabicText: string
): EndOfSurahResult {
  const currentVerse = state.verses[state.currentIndex]
  const atEnd = isAtEndOfSurah(state)
  
  // Check if new text might be Al-Fatiha (common in Salah after any surah)
  const alFatihaConfidence = detectAlFatihaStart(arabicText)
  
  // Check if new text is Bismillah (indicates new surah)
  const isBismillahStart = isBismillah(arabicText)
  
  // In Salah, after any surah, Al-Fatiha is next (new rakat)
  // Or after Al-Fatiha, a short surah is recited
  let likelyNextSurah: number | null = null
  
  if (currentVerse) {
    if (currentVerse.surah === AL_FATIHA_SURAH) {
      // After Al-Fatiha, usually a short surah (112, 113, 114, etc.)
      likelyNextSurah = null // Could be any short surah
    } else if (atEnd) {
      // After any other surah, Al-Fatiha is likely (new rakat)
      likelyNextSurah = AL_FATIHA_SURAH
    }
  }
  
  return {
    isAtEnd: atEnd,
    currentSurah: currentVerse?.surah || 0,
    currentAyah: currentVerse?.ayah || 0,
    likelyNextSurah,
    isAlFatihaLikely: alFatihaConfidence >= 0.7 || (atEnd && likelyNextSurah === AL_FATIHA_SURAH),
    isBismillahDetected: isBismillahStart
  }
}

/**
 * Performs an optimized search when we expect Al-Fatiha.
 * Searches Al-Fatiha first before falling back to full search.
 *
 * @param arabicText - The transcribed Arabic text
 * @param translationEdition - Translation edition
 * @returns QuranMatch if found, null otherwise
 */
export async function searchWithAlFatihaPriority(
  arabicText: string,
  translationEdition: string = 'en.sahih'
): Promise<QuranMatch | null> {
  if (!arabicText || arabicText.trim().length < 3) {
    return null
  }

  // Ensure all data is loaded
  await ensureArabicLoaded()
  const translations = await ensureTranslationLoaded(translationEdition)
  const surahMeta = await ensureSurahMetaLoaded()

  const normalizedQuery = normalizeArabic(arabicText)
  
  // First, search Al-Fatiha specifically
  const alFatihaMatch = searchInSurah(normalizedQuery, AL_FATIHA_SURAH, FOLLOW_MATCH_THRESHOLD)
  
  if (alFatihaMatch && alFatihaMatch.confidence >= LOCK_CONFIDENCE_THRESHOLD) {
    const meta = surahMeta.find(s => s.number === AL_FATIHA_SURAH)
    const translation = translations.find(
      v => v.surah === alFatihaMatch.verse.surah && v.ayah === alFatihaMatch.verse.ayah
    )

    return {
      found: true,
      surah: alFatihaMatch.verse.surah,
      surahName: meta?.name || 'Al-Fatiha',
      surahNameArabic: meta?.nameArabic || 'الفاتحة',
      ayah: alFatihaMatch.verse.ayah,
      arabicText: alFatihaMatch.verse.text,
      translation: translation?.text || '',
      edition: translationEdition,
      confidence: alFatihaMatch.confidence
    }
  }

  // Fall back to regular search
  return await searchVerse(arabicText, translationEdition, FOLLOW_MATCH_THRESHOLD)
}
