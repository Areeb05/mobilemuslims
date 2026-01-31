/**
 * Settings modal for Quran mode configuration.
 * Provides minimalist controls for translation edition and display preferences.
 */

import { Settings, RotateCcw, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import {
  useQuranSettings,
  TRANSLATION_EDITIONS,
} from '@/contexts/QuranSettingsContext'
import { cn } from '@/lib/utils'

interface QuranSettingsProps {
  className?: string
}

/**
 * Settings modal with translation edition selection and display options.
 */
export function QuranSettings({ className }: QuranSettingsProps) {
  const { settings, setEdition, setShowVerseRef, resetToDefaults } =
    useQuranSettings()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'p-1.5 rounded-full hover:bg-accent active:bg-accent/80 transition-all duration-200 touch-manipulation',
            className
          )}
          aria-label="Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Translation Settings</DialogTitle>
          <DialogDescription>
            Configure your Quran translation preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Translation Edition */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Translation Edition
            </label>
            <div className="grid gap-2">
              {TRANSLATION_EDITIONS.map((edition) => (
                <button
                  key={edition.code}
                  type="button"
                  onClick={() => setEdition(edition.code)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-200 text-left',
                    settings.edition === edition.code
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="text-sm">{edition.name}</span>
                  {settings.edition === edition.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Show Verse Reference */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium text-foreground">
                Show Verse Reference
              </label>
              <p className="text-xs text-muted-foreground">
                Display surah and ayah numbers
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showVerseRef}
              onClick={() => setShowVerseRef(!settings.showVerseRef)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                settings.showVerseRef ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
                  settings.showVerseRef ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* Reset to Defaults */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
