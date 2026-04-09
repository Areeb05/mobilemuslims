import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Volume2, Maximize2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'

export interface UnderstandSalahPanelsProps {
  /** Label before the status badge, e.g. "Server" or "Offline" */
  statusPrefix: string
  statusText: string
  /** Maps to Badge variant: default = active/ready, secondary = inactive */
  statusActive: boolean
  isRecording: boolean
  canRecord: boolean
  transcription: string
  translation: string
  error: string
  /** If empty, Surah/Ayat row is hidden */
  quranReferences?: readonly string[]
  onToggleRecord: () => void
  /** Optional action when error is shown (e.g. offline model reload); online flow omits */
  errorActionLabel?: string
  onErrorAction?: () => void
}

/**
 * Shared Understand Salah UI: status, record control, Arabic / English cards, fullscreen.
 * Used by online AudioStreamer and offline OfflineAudioStreamer.
 */
export default function UnderstandSalahPanels({
  statusPrefix,
  statusText,
  statusActive,
  isRecording,
  canRecord,
  transcription,
  translation,
  error,
  quranReferences = [],
  onToggleRecord,
  errorActionLabel,
  onErrorAction,
}: UnderstandSalahPanelsProps) {
  const [fullscreenMode, setFullscreenMode] = useState<'arabic' | 'english' | null>(null)
  const arabicScrollRef = useRef<HTMLDivElement | null>(null)
  const englishScrollRef = useRef<HTMLDivElement | null>(null)
  const fullscreenScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (arabicScrollRef.current) {
      arabicScrollRef.current.scrollTop = arabicScrollRef.current.scrollHeight
    }
  }, [transcription])

  useEffect(() => {
    if (englishScrollRef.current) {
      englishScrollRef.current.scrollTop = englishScrollRef.current.scrollHeight
    }
  }, [translation])

  useEffect(() => {
    if (fullscreenScrollRef.current && fullscreenMode) {
      fullscreenScrollRef.current.scrollTop = fullscreenScrollRef.current.scrollHeight
    }
  }, [transcription, translation, fullscreenMode])

  const enterFullscreen = (mode: 'arabic' | 'english') => {
    setFullscreenMode(mode)
    document.body.style.overflow = 'hidden'
  }

  const exitFullscreen = () => {
    setFullscreenMode(null)
    document.body.style.overflow = 'auto'
  }

  const fullscreenContent =
    fullscreenMode === 'arabic'
      ? {
          text: transcription || 'Waiting for speech...',
          dir: 'rtl' as const,
          arabic: true,
          label: 'Arabic Transcription',
        }
      : fullscreenMode === 'english'
        ? {
            text: translation || 'Translation will appear here...',
            dir: 'ltr' as const,
            arabic: false,
            label: 'English Translation',
          }
        : null

  return (
    <>
      {fullscreenMode && fullscreenContent && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-white/60 text-sm">{fullscreenContent.label}</span>
            <button
              type="button"
              onClick={exitFullscreen}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Exit fullscreen"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
          <div
            ref={fullscreenScrollRef}
            className="flex-1 overflow-y-auto p-6 flex flex-col justify-start"
          >
            <p
              className={`text-white text-2xl md:text-3xl lg:text-4xl leading-relaxed text-center whitespace-pre-wrap ${
                fullscreenContent.arabic ? 'font-arabic' : ''
              }`}
              dir={fullscreenContent.dir}
            >
              {fullscreenContent.text}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:gap-4 w-full max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{statusPrefix}:</span>
            <Badge variant={statusActive ? 'default' : 'secondary'} className="text-xs">
              {statusText}
            </Badge>
          </div>

          <Button
            type="button"
            onClick={onToggleRecord}
            variant={isRecording ? 'destructive' : 'default'}
            size="sm"
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 touch-manipulation active:scale-95 ${
              !canRecord ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
            disabled={!canRecord}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                <span>Record</span>
              </>
            )}
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertDescription className="text-sm space-y-2">
              <p>{error}</p>
              {onErrorAction && errorActionLabel ? (
                <Button type="button" variant="outline" size="sm" className="mt-1" onClick={onErrorAction}>
                  {errorActionLabel}
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/10">
                      <Mic className="h-3.5 w-3.5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">Arabic</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => enterFullscreen('arabic')}
                  className="p-1.5 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation"
                  aria-label="Fullscreen Arabic text"
                >
                  <Maximize2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div
                ref={arabicScrollRef}
                className="h-32 md:h-40 lg:h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex flex-col justify-start"
              >
                <p
                  className="text-foreground text-lg md:text-xl leading-relaxed text-center font-arabic whitespace-pre-wrap max-w-full"
                  dir="rtl"
                >
                  {transcription || 'Waiting for speech...'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/10">
                      <Volume2 className="h-3.5 w-3.5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-base">English</CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => enterFullscreen('english')}
                  className="p-1.5 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation"
                  aria-label="Fullscreen English text"
                >
                  <Maximize2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-2">
              <div
                ref={englishScrollRef}
                className="h-32 md:h-40 lg:h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex flex-col justify-start"
              >
                <p className="text-foreground text-lg md:text-xl leading-relaxed text-center whitespace-pre-wrap max-w-full">
                  {translation || 'Translation will appear here...'}
                </p>
              </div>
              {quranReferences.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-border/40">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Surah/Ayat</span>
                  {quranReferences.map((ref) => (
                    <Badge key={ref} variant="secondary" className="text-xs font-mono tabular-nums">
                      {ref}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-white/50 text-xs">
          <p>Tap record and speak in Arabic</p>
        </div>
      </div>
    </>
  )
}
