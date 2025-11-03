'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const previousPathname = useRef(pathname)
  const isInitialMount = useRef(true)

  // Only trigger animation on pathname change (page navigation)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      previousPathname.current = pathname
      return
    }

    // Only animate if pathname actually changed (actual page navigation)
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname
      setShouldAnimate(true)
      
      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setShouldAnimate(false)
      }, 300)

      return () => clearTimeout(timer)
    }
    // If pathname didn't change, no animation (data refetch - children will update naturally)
  }, [pathname])

  return (
    <div className={shouldAnimate ? 'page-transition-enter' : ''}>
      {children}
    </div>
  )
}

