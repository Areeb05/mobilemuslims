'use client'

import { useState, useEffect } from 'react'

/**
 * A hook that returns true only after the component is mounted on the client
 * This helps prevent hydration mismatches when using animations
 * 
 * @returns boolean - true if the component is mounted on the client
 */
export function useSafeAnimation() {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  return isMounted
} 