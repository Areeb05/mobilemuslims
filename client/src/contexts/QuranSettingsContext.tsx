/**
 * Context for managing Quran mode settings with cookie persistence.
 * Provides settings state and update functions to child components.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

/**
 * Available translation editions from alquran.cloud API.
 */
export const TRANSLATION_EDITIONS = [
  { code: 'en.sahih', name: 'Sahih International' },
  { code: 'en.pickthall', name: 'Pickthall' },
  { code: 'en.yusufali', name: 'Yusuf Ali' },
  { code: 'en.asad', name: 'Muhammad Asad' },
  { code: 'en.hilali', name: 'Muhsin Khan' },
] as const

/**
 * Settings schema for Quran mode.
 */
export interface QuranSettings {
  mode: 'quran' | 'dua'
  edition: string
  showVerseRef: boolean
}

/**
 * Default settings for first-time users.
 */
const DEFAULT_SETTINGS: QuranSettings = {
  mode: 'quran',
  edition: 'en.sahih',
  showVerseRef: true,
}

/**
 * Cookie configuration.
 */
const COOKIE_NAME = 'mm_quran_settings'
const COOKIE_MAX_AGE_DAYS = 30

/**
 * Reads settings from cookie.
 *
 * @returns Parsed settings or null if not found/invalid
 */
function readSettingsFromCookie(): QuranSettings | null {
  try {
    const cookies = document.cookie.split(';')
    const settingsCookie = cookies.find((c) =>
      c.trim().startsWith(`${COOKIE_NAME}=`)
    )

    if (!settingsCookie) return null

    const value = settingsCookie.split('=')[1]
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(decoded)

    // Validate parsed data
    if (
      parsed &&
      (parsed.mode === 'quran' || parsed.mode === 'dua') &&
      typeof parsed.edition === 'string' &&
      typeof parsed.showVerseRef === 'boolean'
    ) {
      return parsed as QuranSettings
    }

    return null
  } catch {
    return null
  }
}

/**
 * Writes settings to cookie.
 *
 * @param settings - The settings to persist
 */
function writeSettingsToCookie(settings: QuranSettings): void {
  try {
    const encoded = encodeURIComponent(JSON.stringify(settings))
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
    document.cookie = `${COOKIE_NAME}=${encoded}; max-age=${maxAge}; path=/; SameSite=Strict`
  } catch (error) {
    console.error('Failed to save settings to cookie:', error)
  }
}

/**
 * Context value type.
 */
interface QuranSettingsContextValue {
  settings: QuranSettings
  setMode: (mode: 'quran' | 'dua') => void
  setEdition: (edition: string) => void
  setShowVerseRef: (show: boolean) => void
  updateSettings: (updates: Partial<QuranSettings>) => void
  resetToDefaults: () => void
}

/**
 * React context for Quran settings.
 */
const QuranSettingsContext = createContext<QuranSettingsContextValue | null>(
  null
)

/**
 * Provider component for Quran settings.
 */
export function QuranSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<QuranSettings>(() => {
    // Initialize from cookie or defaults
    const saved = readSettingsFromCookie()
    return saved ?? DEFAULT_SETTINGS
  })

  // Persist settings to cookie whenever they change
  useEffect(() => {
    writeSettingsToCookie(settings)
  }, [settings])

  const setMode = useCallback((mode: 'quran' | 'dua') => {
    setSettings((prev) => ({ ...prev, mode }))
  }, [])

  const setEdition = useCallback((edition: string) => {
    setSettings((prev) => ({ ...prev, edition }))
  }, [])

  const setShowVerseRef = useCallback((showVerseRef: boolean) => {
    setSettings((prev) => ({ ...prev, showVerseRef }))
  }, [])

  const updateSettings = useCallback((updates: Partial<QuranSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return (
    <QuranSettingsContext.Provider
      value={{
        settings,
        setMode,
        setEdition,
        setShowVerseRef,
        updateSettings,
        resetToDefaults,
      }}
    >
      {children}
    </QuranSettingsContext.Provider>
  )
}

/**
 * Hook to access Quran settings context.
 *
 * @returns The context value
 * @throws Error if used outside of QuranSettingsProvider
 */
export function useQuranSettings(): QuranSettingsContextValue {
  const context = useContext(QuranSettingsContext)
  if (!context) {
    throw new Error(
      'useQuranSettings must be used within a QuranSettingsProvider'
    )
  }
  return context
}
