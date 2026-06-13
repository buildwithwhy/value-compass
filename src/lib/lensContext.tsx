import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LENS, type LensConfig } from './lens'

const STORAGE_KEY = 'value-compass.capital-lens.v1'

interface LensContextValue {
  lens: LensConfig
  setKey: (key: keyof LensConfig, value: boolean) => void
  reset: () => void
  isDefault: boolean
}

const LensContext = createContext<LensContextValue | null>(null)

function loadLens(): LensConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_LENS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_LENS
}

export function CapitalLensProvider({ children }: { children: ReactNode }) {
  const [lens, setLens] = useState<LensConfig>(() => loadLens())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lens))
    } catch {
      /* ignore */
    }
  }, [lens])

  const setKey = useCallback((key: keyof LensConfig, value: boolean) => {
    setLens((prev) => {
      const next = { ...prev, [key]: value }
      // Turning the sovereign parent off/on is independent of sub-buckets, but
      // if all sub-buckets are off, the sovereign concern is effectively idle —
      // that's handled in evaluateMaker, so no extra coupling needed here.
      return next
    })
  }, [])

  const reset = useCallback(() => setLens(DEFAULT_LENS), [])

  const isDefault = useMemo(
    () => (Object.keys(DEFAULT_LENS) as (keyof LensConfig)[]).every((k) => lens[k] === DEFAULT_LENS[k]),
    [lens],
  )

  const value = useMemo(() => ({ lens, setKey, reset, isDefault }), [lens, setKey, reset, isDefault])
  return <LensContext.Provider value={value}>{children}</LensContext.Provider>
}

export function useCapitalLens(): LensContextValue {
  const ctx = useContext(LensContext)
  if (!ctx) throw new Error('useCapitalLens must be used within CapitalLensProvider')
  return ctx
}
