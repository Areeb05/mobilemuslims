import type { AyahRecord } from '@/data/quran/schema'
import { normalizeArabic } from '@/lib/quran/normalizeArabic'

const MAX_RESULTS = 50

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/** Ayah plus precomputed search fields (built once when corpus loads). */
export type AyahSearchRecord = AyahRecord & {
  readonly arabicNorm: string
  readonly englishLower: string
}

/**
 * Split query into Arabic-looking tokens vs Latin/digit tokens so mixed queries work
 * (e.g. "الحمد praise" matches ayahs that satisfy both parts).
 */
function partitionQueryTokens(query: string): { arabicTokens: string[]; englishTokens: string[] } {
  const arabicTokens: string[] = []
  const englishTokens: string[] = []
  const raw = query.trim().split(/\s+/).filter(Boolean)
  for (const p of raw) {
    if (ARABIC_SCRIPT.test(p)) {
      arabicTokens.push(p)
    } else {
      const cleaned = p
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
      if (cleaned) englishTokens.push(cleaned)
    }
  }
  return { arabicTokens, englishTokens }
}

/**
 * English: every token must appear as a substring of `englishLower`.
 */
function englishTokensMatch(englishLower: string, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every((t) => englishLower.includes(t))
}

/**
 * Arabic: normalize each token; every normalized token must appear in `arabicNorm`.
 */
function arabicTokensMatch(arabicNorm: string, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every((t) => {
    const n = normalizeArabic(t)
    return n.length > 0 && arabicNorm.includes(n)
  })
}

export type AyahMatch = AyahSearchRecord & {
  /** Lower is better: position of first token hit in primary matched field. */
  score: number
}

/**
 * Returns up to {@link MAX_RESULTS} ayahs where all Arabic tokens match the Arabic text and
 * all English tokens match the English text (either group may be empty if the query has only one script).
 *
 * @param ayahs - Pre-enriched corpus rows
 * @param query - Raw user input
 */
export function searchAyahs(ayahs: readonly AyahSearchRecord[], query: string): AyahMatch[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { arabicTokens, englishTokens } = partitionQueryTokens(trimmed)
  if (arabicTokens.length === 0 && englishTokens.length === 0) return []

  const out: AyahMatch[] = []

  for (const row of ayahs) {
    if (!englishTokensMatch(row.englishLower, englishTokens)) continue
    if (!arabicTokensMatch(row.arabicNorm, arabicTokens)) continue

    let score = 1_000_000
    if (englishTokens.length > 0) {
      const pos = row.englishLower.indexOf(englishTokens[0])
      if (pos >= 0) score = Math.min(score, pos)
    }
    if (arabicTokens.length > 0) {
      const nt = normalizeArabic(arabicTokens[0])
      if (nt) {
        const pos = row.arabicNorm.indexOf(nt)
        if (pos >= 0) score = Math.min(score, pos)
      }
    }
    if (englishTokens.length > 0 && arabicTokens.length > 0) score -= 10_000

    out.push({ ...row, score })
  }

  out.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.surah !== b.surah) return a.surah - b.surah
    return a.ayah - b.ayah
  })

  return out.slice(0, MAX_RESULTS)
}
