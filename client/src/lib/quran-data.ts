/**
 * Quran data loader for client-side verse matching.
 * Lazy-loads Quran data from static JSON files with caching.
 */

/**
 * Compact verse representation from JSON files.
 */
interface CompactVerse {
  s: number  // surah number
  a: number  // ayah number in surah
  t: string  // text
}

/**
 * Surah metadata.
 */
export interface SurahMeta {
  number: number
  name: string
  nameArabic: string
  englishNameTranslation: string
  ayahCount: number
}

/**
 * Quran data structure from JSON file.
 */
interface QuranData {
  meta?: SurahMeta[]
  verses: CompactVerse[]
}

/**
 * Expanded verse with full data.
 */
export interface QuranVerse {
  surah: number
  ayah: number
  text: string
}

/**
 * Cache for loaded Quran editions.
 */
const editionCache = new Map<string, QuranData>()

/**
 * Verse lookup Maps for O(1) access by surah:ayah key.
 */
const verseMaps = new Map<string, Map<string, QuranVerse>>()

/**
 * Creates a lookup key for verse access.
 */
function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`
}

/**
 * Gets or creates a verse lookup Map for an edition.
 */
function getVerseMap(edition: string, verses: QuranVerse[]): Map<string, QuranVerse> {
  let map = verseMaps.get(edition)
  if (!map) {
    map = new Map()
    for (const verse of verses) {
      map.set(verseKey(verse.surah, verse.ayah), verse)
    }
    verseMaps.set(edition, map)
  }
  return map
}

/**
 * Surah metadata cache (loaded from Arabic edition).
 */
let surahMetaCache: SurahMeta[] | null = null

/**
 * Surah metadata Map for O(1) lookup by surah number.
 */
let surahMetaMap: Map<number, SurahMeta> | null = null

/**
 * Fetches a Quran edition JSON file.
 *
 * @param edition - The edition identifier (e.g., 'quran-uthmani', 'en.sahih')
 * @returns The Quran data
 */
async function fetchEdition(edition: string): Promise<QuranData> {
  // Check cache first
  const cached = editionCache.get(edition)
  if (cached) {
    return cached
  }

  const response = await fetch(`/quran/${edition}.json`)
  if (!response.ok) {
    throw new Error(`Failed to load Quran edition ${edition}: ${response.status}`)
  }

  const data = await response.json() as QuranData
  editionCache.set(edition, data)

  // Cache surah metadata if available
  if (data.meta && !surahMetaCache) {
    surahMetaCache = data.meta
  }

  return data
}

/**
 * Loads the Arabic Quran text.
 *
 * @returns Array of Arabic verses
 */
export async function loadArabicQuran(): Promise<QuranVerse[]> {
  const data = await fetchEdition('quran-uthmani')
  return data.verses.map(v => ({
    surah: v.s,
    ayah: v.a,
    text: v.t
  }))
}

/**
 * Loads a translation edition.
 *
 * @param edition - The translation edition (e.g., 'en.sahih', 'en.yusufali')
 * @returns Array of translated verses
 */
export async function loadTranslation(edition: string): Promise<QuranVerse[]> {
  const data = await fetchEdition(edition)
  return data.verses.map(v => ({
    surah: v.s,
    ayah: v.a,
    text: v.t
  }))
}

/**
 * Builds the surah metadata Map for O(1) lookup.
 */
function buildSurahMetaMap(meta: SurahMeta[]): void {
  if (!surahMetaMap) {
    surahMetaMap = new Map()
    for (const surah of meta) {
      surahMetaMap.set(surah.number, surah)
    }
  }
}

/**
 * Gets surah metadata.
 *
 * @returns Array of surah metadata
 */
export async function getSurahMeta(): Promise<SurahMeta[]> {
  if (surahMetaCache) {
    buildSurahMetaMap(surahMetaCache)
    return surahMetaCache
  }

  // Load Arabic edition to get metadata
  const data = await fetchEdition('quran-uthmani')
  
  // Use the data directly from fetchEdition return value
  if (data.meta) {
    surahMetaCache = data.meta
    buildSurahMetaMap(data.meta)
    return data.meta
  }
  
  // Fallback to cached value if it was set by a parallel call
  if (surahMetaCache) {
    buildSurahMetaMap(surahMetaCache)
    return surahMetaCache
  }

  throw new Error('Failed to load surah metadata')
}

/**
 * Gets surah info by number with O(1) lookup.
 * Returns cached metadata Map entry.
 *
 * @param surahNumber - Surah number (1-114)
 * @returns Surah metadata or undefined if not found
 */
async function getSurahInfo(surahNumber: number): Promise<SurahMeta | undefined> {
  await getSurahMeta() // Ensure metadata is loaded
  return surahMetaMap?.get(surahNumber)
}

/**
 * Gets a specific verse's translation with O(1) lookup.
 *
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number within the surah
 * @param edition - Translation edition
 * @returns The translated verse text or null if not found
 */
export async function getTranslation(
  surah: number,
  ayah: number,
  edition: string
): Promise<string | null> {
  const verses = await loadTranslation(edition)
  const map = getVerseMap(edition, verses)
  const verse = map.get(verseKey(surah, ayah))
  return verse?.text || null
}

/**
 * Gets a specific verse's Arabic text with O(1) lookup.
 *
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number within the surah
 * @returns The Arabic verse text or null if not found
 */
export async function getArabicVerse(
  surah: number,
  ayah: number
): Promise<string | null> {
  const verses = await loadArabicQuran()
  const map = getVerseMap('quran-uthmani', verses)
  const verse = map.get(verseKey(surah, ayah))
  return verse?.text || null
}

/**
 * Gets surah name by number with O(1) lookup.
 *
 * @param surahNumber - Surah number (1-114)
 * @returns Surah name or null if not found
 */
export async function getSurahName(surahNumber: number): Promise<string | null> {
  const surah = await getSurahInfo(surahNumber)
  return surah?.name || null
}

/**
 * Gets surah Arabic name by number with O(1) lookup.
 *
 * @param surahNumber - Surah number (1-114)
 * @returns Surah Arabic name or null if not found
 */
export async function getSurahNameArabic(surahNumber: number): Promise<string | null> {
  const surah = await getSurahInfo(surahNumber)
  return surah?.nameArabic || null
}

/**
 * Preloads Quran data for faster matching.
 * Call this on component mount for better UX.
 *
 * @param translationEdition - The translation edition to preload
 */
export async function preloadQuranData(translationEdition: string = 'en.sahih'): Promise<void> {
  await Promise.all([
    fetchEdition('quran-uthmani'),
    fetchEdition(translationEdition)
  ])
}

/**
 * Clears all caches.
 * Useful for testing or memory management.
 */
export function clearCache(): void {
  editionCache.clear()
  verseMaps.clear()
  surahMetaCache = null
  surahMetaMap = null
}

/**
 * Gets the total number of ayahs in a surah with O(1) lookup.
 *
 * @param surahNumber - Surah number (1-114)
 * @returns The ayah count or null if surah not found
 */
export async function getSurahAyahCount(surahNumber: number): Promise<number | null> {
  const surah = await getSurahInfo(surahNumber)
  return surah?.ayahCount || null
}

/**
 * Represents a verse with both Arabic text and translation.
 */
export interface VerseWithTranslation {
  surah: number
  ayah: number
  arabicText: string
  translation: string
  surahName: string
  surahNameArabic: string
}

/**
 * Gets a range of verses starting from a specific position.
 * Handles surah boundaries - if the range extends past the end of the surah,
 * it stops at the last ayah of that surah.
 * Uses O(1) Map lookups for efficient verse access.
 *
 * @param surah - Starting surah number (1-114)
 * @param startAyah - Starting ayah number within the surah
 * @param count - Number of verses to fetch
 * @param translationEdition - Translation edition to use
 * @returns Array of verses with Arabic text and translation
 */
export async function getVersesInRange(
  surah: number,
  startAyah: number,
  count: number,
  translationEdition: string = 'en.sahih'
): Promise<VerseWithTranslation[]> {
  const [arabicVerses, translationVerses, surahInfo] = await Promise.all([
    loadArabicQuran(),
    loadTranslation(translationEdition),
    getSurahInfo(surah)
  ])

  if (!surahInfo) {
    return []
  }

  // Build verse lookup Maps for O(1) access
  const arabicMap = getVerseMap('quran-uthmani', arabicVerses)
  const translationMap = getVerseMap(translationEdition, translationVerses)

  const result: VerseWithTranslation[] = []
  
  // Fetch verses within the same surah, respecting ayah count
  for (let i = 0; i < count; i++) {
    const ayahNum = startAyah + i
    
    // Stop if we've exceeded the surah's ayah count
    if (ayahNum > surahInfo.ayahCount) {
      break
    }

    const key = verseKey(surah, ayahNum)
    const arabicVerse = arabicMap.get(key)
    const translationVerse = translationMap.get(key)

    if (arabicVerse) {
      result.push({
        surah,
        ayah: ayahNum,
        arabicText: arabicVerse.text,
        translation: translationVerse?.text || '',
        surahName: surahInfo.name,
        surahNameArabic: surahInfo.nameArabic
      })
    }
  }

  return result
}

/**
 * Gets multiple verses across surah boundaries.
 * Continues to next surah if current surah ends.
 * Uses O(1) Map lookups for efficient verse access.
 *
 * @param surah - Starting surah number (1-114)
 * @param startAyah - Starting ayah number within the surah
 * @param count - Total number of verses to fetch
 * @param translationEdition - Translation edition to use
 * @returns Array of verses with Arabic text and translation
 */
export async function getVersesAcrossSurahs(
  surah: number,
  startAyah: number,
  count: number,
  translationEdition: string = 'en.sahih'
): Promise<VerseWithTranslation[]> {
  const [arabicVerses, translationVerses] = await Promise.all([
    loadArabicQuran(),
    loadTranslation(translationEdition),
    getSurahMeta() // Ensure metadata is loaded
  ])

  // Build verse lookup Maps for O(1) access
  const arabicMap = getVerseMap('quran-uthmani', arabicVerses)
  const translationMap = getVerseMap(translationEdition, translationVerses)

  const result: VerseWithTranslation[] = []
  let currentSurah = surah
  let currentAyah = startAyah
  let remaining = count

  while (remaining > 0 && currentSurah <= 114) {
    const surahInfo = surahMetaMap?.get(currentSurah)
    if (!surahInfo) break

    // Fetch verses from current position to end of surah or until count is reached
    while (currentAyah <= surahInfo.ayahCount && remaining > 0) {
      const key = verseKey(currentSurah, currentAyah)
      const arabicVerse = arabicMap.get(key)
      const translationVerse = translationMap.get(key)

      if (arabicVerse) {
        result.push({
          surah: currentSurah,
          ayah: currentAyah,
          arabicText: arabicVerse.text,
          translation: translationVerse?.text || '',
          surahName: surahInfo.name,
          surahNameArabic: surahInfo.nameArabic
        })
        remaining--
      }
      currentAyah++
    }

    // Move to next surah
    currentSurah++
    currentAyah = 1
  }

  return result
}
