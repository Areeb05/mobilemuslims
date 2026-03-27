import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuranCorpus } from '@/hooks/useQuranCorpus'
import { searchAyahs } from '@/lib/quran/searchAyahs'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 280

/** Attribution for bundled text (risan/quran-json, MIT). */
const DATA_ATTRIBUTION =
  'Arabic and English (Sahih International) from the quran-json project (MIT). See github.com/risan/quran-json.'

export default function QuranVerseFinder() {
  const { loading, error, ayahs } = useQuranCorpus()
  const [input, setInput] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [input])

  const results = useMemo(() => searchAyahs(ayahs, debounced), [ayahs, debounced])

  return (
    <div className="min-h-screen bg-black text-white p-3 md:p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Quran verse finder</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            Type Arabic or English (or both). Matches all words you enter against the same ayah.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. الحمد or praise lord of the worlds"
            disabled={loading || !!error}
            className={cn(
              'flex h-11 w-full rounded-md border border-input bg-background/80 pl-10 pr-3 py-2 text-sm text-foreground',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-400 text-sm">Loading Quran text…</p>
        ) : null}

        {error ? (
          <p className="text-center text-destructive text-sm">{error}</p>
        ) : null}

        {!loading && !error && debounced.trim() && results.length === 0 ? (
          <p className="text-center text-gray-400 text-sm">No matching verses.</p>
        ) : null}

        {!loading && !error && !debounced.trim() ? (
          <p className="text-center text-gray-500 text-xs">Start typing to search all 114 surahs.</p>
        ) : null}

        <ul className="space-y-3">
          {results.map((row) => (
            <li key={`${row.surah}:${row.ayah}`}>
              <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm font-mono text-primary">
                    {row.surah}:{row.ayah}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 space-y-2">
                  <p className="text-lg leading-relaxed text-center font-arabic" dir="rtl">
                    {row.arabic}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{row.english}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>

        <p className="text-center text-[10px] text-gray-600 pt-4 max-w-xl mx-auto leading-relaxed">
          {DATA_ATTRIBUTION}
        </p>
      </div>
    </div>
  )
}
