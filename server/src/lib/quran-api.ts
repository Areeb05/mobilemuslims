/**
 * Quran API client with lazy caching for efficient verse lookup.
 * Uses alquran.cloud API with gzip compression for optimal latency.
 */

import { normalizeArabic, calculateSimilarity } from './arabic-utils.js'

/**
 * Base URL for the Al-Quran Cloud API.
 */
const QURAN_API_BASE_URL =
  process.env.QURAN_API_BASE_URL || 'https://api.alquran.cloud/v1'

/**
 * Default translation edition.
 */
const DEFAULT_EDITION = process.env.QURAN_DEFAULT_EDITION || 'en.sahih'

/**
 * Minimum confidence threshold for verse matching.
 */
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7

/**
 * Represents a single Quran verse (ayah).
 */
export interface Ayah {
  number: number
  numberInSurah: number
  text: string
  normalizedText?: string
}

/**
 * Represents a Quran surah with its verses.
 */
export interface SurahData {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  ayahs: Ayah[]
}

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
 * API response structure for surah endpoint.
 */
interface SurahApiResponse {
  code: number
  status: string
  data: {
    number: number
    name: string
    englishName: string
    englishNameTranslation: string
    numberOfAyahs: number
    ayahs: Array<{
      number: number
      numberInSurah: number
      text: string
    }>
  }
}

/**
 * In-memory cache for lazy-loaded surahs.
 * Key format: "surah:edition" (e.g., "1:quran-uthmani")
 */
const surahCache = new Map<string, SurahData>()

/**
 * Cache for normalized Arabic text to avoid repeated normalization.
 */
const normalizedTextCache = new Map<string, string>()

/**
 * Fetches a surah from the API with gzip compression.
 *
 * @param surahNumber - The surah number (1-114)
 * @param edition - The edition/translation code
 * @returns The surah data
 */
async function fetchSurahFromApi(
  surahNumber: number,
  edition: string
): Promise<SurahData> {
  const url = `${QURAN_API_BASE_URL}/surah/${surahNumber}/${edition}`

  console.log(`📖 Fetching surah ${surahNumber} (${edition}) from API...`)

  const response = await fetch(url, {
    headers: {
      'Accept-Encoding': 'gzip, deflate',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch surah ${surahNumber}: ${response.status} ${response.statusText}`
    )
  }

  const json = (await response.json()) as SurahApiResponse

  if (json.code !== 200 || !json.data) {
    throw new Error(`API error for surah ${surahNumber}: ${json.status}`)
  }

  const surahData: SurahData = {
    number: json.data.number,
    name: json.data.name,
    englishName: json.data.englishName,
    englishNameTranslation: json.data.englishNameTranslation,
    numberOfAyahs: json.data.numberOfAyahs,
    ayahs: json.data.ayahs.map((ayah) => ({
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      text: ayah.text,
      normalizedText: normalizeArabic(ayah.text),
    })),
  }

  console.log(
    `✅ Fetched surah ${surahNumber} (${surahData.englishName}) - ${surahData.numberOfAyahs} ayahs`
  )

  return surahData
}

/**
 * Gets cached normalized text or normalizes and caches it.
 *
 * @param text - The text to normalize
 * @returns Normalized text
 */
function getCachedNormalizedText(text: string): string {
  let normalized = normalizedTextCache.get(text)
  if (!normalized) {
    normalized = normalizeArabic(text)
    normalizedTextCache.set(text, normalized)
  }
  return normalized
}

/**
 * Loads a surah, using cache if available.
 *
 * @param surahNumber - The surah number (1-114)
 * @param edition - The edition code (default: quran-uthmani for Arabic)
 * @returns The surah data
 */
export async function loadSurah(
  surahNumber: number,
  edition: string = 'quran-uthmani'
): Promise<SurahData> {
  const cacheKey = `${surahNumber}:${edition}`

  // Check cache first
  const cached = surahCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from API and cache
  const surahData = await fetchSurahFromApi(surahNumber, edition)
  surahCache.set(cacheKey, surahData)

  return surahData
}

/**
 * Loads both Arabic and translation editions for a surah.
 *
 * @param surahNumber - The surah number (1-114)
 * @param translationEdition - The translation edition code
 * @returns Object with Arabic and translation data
 */
export async function loadSurahWithTranslation(
  surahNumber: number,
  translationEdition: string = DEFAULT_EDITION
): Promise<{ arabic: SurahData; translation: SurahData }> {
  const [arabic, translation] = await Promise.all([
    loadSurah(surahNumber, 'quran-uthmani'),
    loadSurah(surahNumber, translationEdition),
  ])

  return { arabic, translation }
}

/**
 * Searches for a matching verse in a specific surah.
 *
 * @param arabicText - The transcribed Arabic text
 * @param surahNumber - The surah number to search in
 * @param translationEdition - The translation edition
 * @param confidenceThreshold - Minimum confidence for a match
 * @returns QuranMatch if found, null otherwise
 */
async function searchInSurah(
  arabicText: string,
  surahNumber: number,
  translationEdition: string,
  confidenceThreshold: number
): Promise<QuranMatch | null> {
  try {
    const { arabic, translation } = await loadSurahWithTranslation(
      surahNumber,
      translationEdition
    )

    const normalizedQuery = getCachedNormalizedText(arabicText)

    let bestMatch: QuranMatch | null = null
    let bestConfidence = 0

    for (let i = 0; i < arabic.ayahs.length; i++) {
      const ayah = arabic.ayahs[i]
      const normalizedVerse = ayah.normalizedText || normalizeArabic(ayah.text)

      // Calculate similarity
      const similarity = calculateSimilarity(normalizedQuery, normalizedVerse)

      if (similarity > bestConfidence && similarity >= confidenceThreshold) {
        bestConfidence = similarity
        bestMatch = {
          found: true,
          surah: surahNumber,
          surahName: arabic.englishName,
          surahNameArabic: arabic.name,
          ayah: ayah.numberInSurah,
          arabicText: ayah.text,
          translation: translation.ayahs[i]?.text || '',
          edition: translationEdition,
          confidence: similarity,
        }
      }
    }

    return bestMatch
  } catch (error) {
    console.error(`Error searching surah ${surahNumber}:`, error)
    return null
  }
}

/**
 * Common surahs recited in Salah, ordered by frequency.
 * These are searched first for faster matching.
 */
const COMMON_SALAH_SURAHS = [
  1, // Al-Fatiha (required in every rakat)
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
  99, // Az-Zalzalah
  97, // Al-Qadr
  96, // Al-Alaq
  95, // At-Tin
  94, // Ash-Sharh
  93, // Ad-Duhaa
  91, // Ash-Shams
  92, // Al-Lail
  90, // Al-Balad
  87, // Al-A'la
  88, // Al-Ghashiyah
]

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
  translationEdition: string = DEFAULT_EDITION,
  confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): Promise<QuranMatch | null> {
  if (!arabicText || arabicText.trim().length < 3) {
    return null
  }

  let bestMatch: QuranMatch | null = null

  // First pass: Search common Salah surahs (fast path)
  for (const surahNumber of COMMON_SALAH_SURAHS) {
    const match = await searchInSurah(
      arabicText,
      surahNumber,
      translationEdition,
      confidenceThreshold
    )

    if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = match

      // If we have a very high confidence match, return early
      if (match.confidence >= 0.95) {
        return match
      }
    }
  }

  // If we found a decent match in common surahs, return it
  if (bestMatch && bestMatch.confidence >= 0.85) {
    return bestMatch
  }

  // Second pass: Search remaining surahs (slower, but comprehensive)
  const remainingSurahs = Array.from({ length: 114 }, (_, i) => i + 1).filter(
    (n) => !COMMON_SALAH_SURAHS.includes(n)
  )

  for (const surahNumber of remainingSurahs) {
    const match = await searchInSurah(
      arabicText,
      surahNumber,
      translationEdition,
      confidenceThreshold
    )

    if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = match

      // If we have a very high confidence match, return early
      if (match.confidence >= 0.95) {
        return match
      }
    }
  }

  return bestMatch
}

/**
 * Gets cache statistics for monitoring.
 *
 * @returns Object with cache stats
 */
export function getCacheStats(): {
  surahsCached: number
  normalizedTextsCached: number
} {
  return {
    surahsCached: surahCache.size,
    normalizedTextsCached: normalizedTextCache.size,
  }
}

/**
 * Clears all caches. Useful for testing or memory management.
 */
export function clearCache(): void {
  surahCache.clear()
  normalizedTextCache.clear()
  console.log('🗑️ Quran cache cleared')
}

/**
 * Preloads common Salah surahs for faster first-time matching.
 * Call this during server startup for better UX.
 *
 * @param translationEdition - The translation edition to preload
 */
export async function preloadCommonSurahs(
  translationEdition: string = DEFAULT_EDITION
): Promise<void> {
  console.log('📚 Preloading common Salah surahs...')

  // Preload Al-Fatiha first (most important)
  await loadSurahWithTranslation(1, translationEdition)

  // Preload remaining common surahs in parallel (batched)
  const batchSize = 5
  for (let i = 1; i < COMMON_SALAH_SURAHS.length; i += batchSize) {
    const batch = COMMON_SALAH_SURAHS.slice(i, i + batchSize)
    await Promise.all(
      batch.map((surahNumber) =>
        loadSurahWithTranslation(surahNumber, translationEdition)
      )
    )
  }

  console.log(`✅ Preloaded ${COMMON_SALAH_SURAHS.length} common surahs`)
}
