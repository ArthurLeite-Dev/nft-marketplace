import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'

export function useRouteFocus() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    // Focus the main content container on route transitions
    const mainEl = document.getElementById('main-content')
    if (mainEl) {
      mainEl.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])
}
