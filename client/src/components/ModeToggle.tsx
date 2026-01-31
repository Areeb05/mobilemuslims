/**
 * Toggle component for switching between Quran and Dua modes.
 * Matches the existing dark theme of the AudioStreamer component.
 */

import { Book, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModeToggleProps {
  mode: 'quran' | 'dua'
  onChange: (mode: 'quran' | 'dua') => void
  disabled?: boolean
  className?: string
}

/**
 * A minimal toggle switch for Quran/Dua mode selection.
 * Uses a segmented control pattern for clear visual feedback.
 */
export function ModeToggle({
  mode,
  onChange,
  disabled = false,
  className,
}: ModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-muted/50 p-0.5 border border-border/50',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      role="radiogroup"
      aria-label="Translation mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'quran'}
        onClick={() => onChange('quran')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 touch-manipulation',
          mode === 'quran'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Book className="h-3 w-3" />
        <span>Quran</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'dua'}
        onClick={() => onChange('dua')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 touch-manipulation',
          mode === 'dua'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <MessageCircle className="h-3 w-3" />
        <span>Dua</span>
      </button>
    </div>
  )
}
