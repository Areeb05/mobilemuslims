'use client'

import { useEffect } from 'react'

/**
 * This component fixes hydration mismatches related to the color-scheme style
 * by ensuring the style attribute is consistent between server and client
 */
export function ThemeStyleFix() {
  useEffect(() => {
    // Remove any inline color-scheme style from the HTML element after hydration
    const htmlEl = document.documentElement
    if (htmlEl.style.colorScheme) {
      // Store the current value
      const currentColorScheme = htmlEl.style.colorScheme
      
      // Remove it to match our CSS declaration
      htmlEl.style.removeProperty('color-scheme')
      
      // Force a re-render to apply the CSS-based color-scheme
      document.body.style.display = 'none'
      document.body.offsetHeight // Force reflow
      document.body.style.display = ''
    }
  }, [])
  
  // This component doesn't render anything visible
  return null
} 