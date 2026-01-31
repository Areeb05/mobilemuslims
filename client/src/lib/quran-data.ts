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
 * Surah metadata cache (loaded from Arabic edition).
 */
let surahMetaCache: SurahMeta[] | null = null

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
 * Gets surah metadata.
 *
 * @returns Array of surah metadata
 */
export async function getSurahMeta(): Promise<SurahMeta[]> {
  if (surahMetaCache) {
    return surahMetaCache
  }

  // Load Arabic edition to get metadata
  await fetchEdition('quran-uthmani')
  
  if (!surahMetaCache) {
    throw new Error('Failed to load surah metadata')
  }

  return surahMetaCache
}

/**
 * Gets a specific verse's translation.
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
  const verse = verses.find(v => v.surah === surah && v.ayah === ayah)
  return verse?.text || null
}

/**
 * Gets a specific verse's Arabic text.
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
  const verse = verses.find(v => v.surah === surah && v.ayah === ayah)
  return verse?.text || null
}

/**
 * Gets surah name by number.
 *
 * @param surahNumber - Surah number (1-114)
 * @returns Surah name or null if not found
 */
export async function getSurahName(surahNumber: number): Promise<string | null> {
  const meta = await getSurahMeta()
  const surah = meta.find(s => s.number === surahNumber)
  return surah?.name || null
}

/**
 * Gets surah Arabic name by number.
 *
 * @param surahNumber - Surah number (1-114)
 * @returns Surah Arabic name or null if not found
 */
export async function getSurahNameArabic(surahNumber: number): Promise<string | null> {
  const meta = await getSurahMeta()
  const surah = meta.find(s => s.number === surahNumber)
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
 * Clears the edition cache.
 * Useful for testing or memory management.
 */
export function clearCache(): void {
  editionCache.clear()
  surahMetaCache = null
}
