type AnnouncePriority = 'polite' | 'assertive'

export interface AnnounceDetail {
  message: string
  priority: AnnouncePriority
}

export const ANNOUNCE_EVENT = 'antigravity:announce'

export function announce(message: string, priority: AnnouncePriority = 'polite') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<AnnounceDetail>(ANNOUNCE_EVENT, {
      detail: { message, priority },
    }),
  )
}
