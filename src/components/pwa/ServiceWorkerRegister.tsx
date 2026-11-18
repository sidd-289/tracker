'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    function registerSW() {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker successfully registered:', registration.scope)

          // Immediately check for updates
          registration.update().catch(() => {})

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New service worker installed and active.')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] ServiceWorker registration failed:', error)
        })
    }

    // Crucial: In Next.js client components, 'load' may have already fired by the time useEffect runs.
    if (document.readyState === 'complete') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
      return () => window.removeEventListener('load', registerSW)
    }
  }, [])

  return null
}
