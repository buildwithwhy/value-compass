import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePriorities } from './prioritiesContext'
import { parsePrioritiesParams, prioritiesMatch, serializePrioritiesParams } from './prioritiesUrl'

// ---------------------------------------------------------------------------
// Two-way sync between the global priorities state and the page URL, so the
// tool finder's axis selection is shareable.
//
//   - URL → context: a shared link, a refresh, or back/forward is authoritative
//     for what it states. Applied only when it actually differs from what is
//     held, so panel edits are never second-guessed.
//   - context → URL: every change is mirrored with a history REPLACE — an edit
//     is a revision of the current view, not a new page, so the back button
//     keeps meaning "previous page" rather than "last click".
//
// Both effects are guarded by the same canonical comparison (the serialized
// form), which makes the pair idempotent: neither can loop off the other.
//
// Direction is decided by which side MOVED. The URL→context effect only acts
// when location.search changed since its last run; a context-only change (the
// user clearing in the panel) keeps the stale URL intact for that commit, and
// the mirror effect strips it. Without that guard the two effects would
// resurrect each other's state: clear would read as "URL still says X".
// ---------------------------------------------------------------------------

export function usePrioritiesUrlSync(): void {
  const { priorities, applyShared } = usePriorities()
  const location = useLocation()
  const navigate = useNavigate()
  const lastSearchRef = useRef<string | null>(null)

  // Incoming link wins when it says something different — and when the URL is
  // the side that moved.
  useEffect(() => {
    const searchChanged = lastSearchRef.current !== location.search
    lastSearchRef.current = location.search
    if (!searchChanged) return

    const incoming = parsePrioritiesParams(location.search)
    if (!incoming) return
    if (prioritiesMatch(incoming, priorities)) return
    applyShared(incoming)
  }, [location.search, priorities, applyShared])

  // Context changes mirror out, so the address bar can be copied at any time.
  useEffect(() => {
    const canonical = serializePrioritiesParams(priorities)
    const incoming = parsePrioritiesParams(location.search)
    const inUrl = incoming ? serializePrioritiesParams(incoming) : null
    if (inUrl === canonical) return
    navigate({ search: canonical ?? '' }, { replace: true })
  }, [priorities, location.search, navigate])
}
