import { useEffect, useState } from 'react'
import { ayahsFileSchema } from '@/data/quran/schema'
import { normalizeArabic } from '@/lib/quran/normalizeArabic'
import type { AyahSearchRecord } from '@/lib/quran/searchAyahs'

export interface UseQuranCorpusResult {
  loading: boolean
  error: string | null
  ayahs: AyahSearchRecord[]
}

/**
 * Lazy-loads bundled ayahs JSON, validates with Zod, and attaches normalized search fields once.
 */
export function useQuranCorpus(): UseQuranCorpusResult {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ayahs, setAyahs] = useState<AyahSearchRecord[]>([])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const mod = await import('../data/quran/ayahs.json')
        const raw = (mod as { default?: unknown }).default ?? mod
        const parsed = ayahsFileSchema.parse(raw)
        if (cancelled) return
        const enriched: AyahSearchRecord[] = parsed.map((a) => ({
          ...a,
          arabicNorm: normalizeArabic(a.arabic),
          englishLower: a.english.toLowerCase(),
        }))
        setAyahs(enriched)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load Quran data')
        setAyahs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { loading, error, ayahs }
}
