import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { EMPTY_LENS, EXAMPLE_LENS, type LensConfig, type LensMode } from './lens'

// v2: the stored value now records WHETHER a lens was chosen, not just what it
// contains. v1 wrote itself to storage on first mount, so a v1 value is no
// evidence that anyone picked anything — it is ignored and cleared.
const STORAGE_KEY = 'value-compass.capital-lens.v2'
const LEGACY_KEY = 'value-compass.capital-lens.v1'

interface StoredLens {
  mode: LensMode
  lens: LensConfig
}

interface LensContextValue {
  lens: LensConfig
  mode: LensMode
  /** True once the visitor has actually chosen something to care about. */
  chosen: boolean
  setKey: (key: keyof LensConfig, value: boolean) => void
  useExampleLens: () => void
  clear: () => void
}

const LensContext = createContext<LensContextValue | null>(null)

function load(): StoredLens {
  try {
    localStorage.removeItem(LEGACY_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredLens>
      if (parsed && (parsed.mode === 'example' || parsed.mode === 'custom')) {
        return { mode: parsed.mode, lens: { ...EMPTY_LENS, ...parsed.lens } }
      }
    }
  } catch {
    /* ignore */
  }
  return { mode: 'unset', lens: EMPTY_LENS }
}

export function CapitalLensProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredLens>(() => load())

  useEffect(() => {
    try {
      if (state.mode === 'unset') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  // Any manual toggle makes the lens the visitor's own, including a toggle that
  // starts from the example — it is no longer ValueCompass's selection.
  const setKey = useCallback((key: keyof LensConfig, value: boolean) => {
    setState((prev) => ({ mode: 'custom', lens: { ...prev.lens, [key]: value } }))
  }, [])

  const useExampleLens = useCallback(() => setState({ mode: 'example', lens: EXAMPLE_LENS }), [])
  const clear = useCallback(() => setState({ mode: 'unset', lens: EMPTY_LENS }), [])

  const value = useMemo(
    () => ({
      lens: state.lens,
      mode: state.mode,
      chosen: state.mode !== 'unset',
      setKey,
      useExampleLens,
      clear,
    }),
    [state, setKey, useExampleLens, clear],
  )
  return <LensContext.Provider value={value}>{children}</LensContext.Provider>
}

export function useCapitalLens(): LensContextValue {
  const ctx = useContext(LensContext)
  if (!ctx) throw new Error('useCapitalLens must be used within CapitalLensProvider')
  return ctx
}
