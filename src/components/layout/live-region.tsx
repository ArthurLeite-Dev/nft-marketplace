import { useEffect, useState } from 'react'
import { ANNOUNCE_EVENT, type AnnounceDetail } from '@/lib/announce'

export function LiveRegion() {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  useEffect(() => {
    function handleAnnounce(event: Event) {
      const customEvent = event as CustomEvent<AnnounceDetail>
      const { message, priority } = customEvent.detail

      if (priority === 'assertive') {
        setAssertiveMessage(message)
        // Clear after 5 seconds
        setTimeout(() => setAssertiveMessage(''), 5000)
      } else {
        setPoliteMessage(message)
        setTimeout(() => setPoliteMessage(''), 5000)
      }
    }

    window.addEventListener(ANNOUNCE_EVENT, handleAnnounce)
    return () => window.removeEventListener(ANNOUNCE_EVENT, handleAnnounce)
  }, [])

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="live-region-polite"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="live-region-assertive"
      >
        {assertiveMessage}
      </div>
    </>
  )
}
