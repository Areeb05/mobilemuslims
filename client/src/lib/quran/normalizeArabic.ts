/**
 * Removes Arabic diacritics (tashkeel) and a few common letter variants for fuzzy matching.
 */
const DIACRITICS =
  /[\u064B-\u065F\u0670\u06D6-\u06ED\u0610-\u061A\u0640]/g

/**
 * Normalizes Arabic for substring / token search: strip tashkeel, unify alif/hamza, taa marbuta, alif maqsura.
 *
 * @param input - Raw Arabic string (may include diacritics)
 * @returns Normalized string (no diacritics, collapsed whitespace)
 */
export function normalizeArabic(input: string): string {
  let s = input.replace(DIACRITICS, '')
  s = s.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ -> ا
  s = s.replace(/\u0629/g, '\u0647') // ة -> ه
  s = s.replace(/\u0649/g, '\u064A') // ى -> ي
  s = s.replace(/\s+/g, ' ').trim()
  return s
}
