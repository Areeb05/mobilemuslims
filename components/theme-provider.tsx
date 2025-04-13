'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch by rendering the children only after component is mounted
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Configure next-themes to avoid conflicts with our color-scheme handling
  const customProps = {
    ...props,
    disableColorScheme: true, // Prevent next-themes from setting color-scheme
    enableSystem: false,      // We're using a fixed dark theme
    forcedTheme: "dark",      // Force dark theme
    disableTransitionOnChange: true, // No transitions needed for theme changes
  }
  
  return (
    <NextThemesProvider {...customProps}>
      {mounted ? children : null}
    </NextThemesProvider>
  )
}
