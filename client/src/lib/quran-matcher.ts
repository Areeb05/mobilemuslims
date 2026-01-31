/**
 * Client-side Quran verse matcher using fuzzy string matching.
 * Matches transcribed Arabic speech against Quran verses.
 */

import { loadArabicQuran, loadTranslation, getSurahMeta, type QuranVerse, type SurahMeta } from './quran-data'
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
