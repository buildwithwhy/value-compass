import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { EMPTY_LENS, EXAMPLE_LENS, type LensConfig } from './lens'
import {
  anyCapitalPrioritised,
  EMPTY_WEIGHTS,
  EXAMPLE_WEIGHTS,
  hasPriorities,
  type AxisWeight,
  type Priorities,
} from './priorities'
import type { AxisKey } from './types'

const STORAGE_KEY = 'value-compass.priorities.v1'
// Milestone 1's capital-only lens. Read once so an existing choice carries
// forward, then retired.
const LENS_KEY_V2 = 'value-compass.capital-lens.v2'
const LENS_KEY_V1 = 'value-compass.capital-lens.v1'

const EMPTY: Priorities = { weights: EMPTY_WEIGHTS, capital: EMPTY_LENS, mode: 'unset' }

interface PrioritiesContextValue {
  priorities: Priorities
  /** True once the visitor has actually said something matters to them. */
  chosen: boolean
  setAxisWeight: (axis: AxisKey, weight: AxisWeight) => void
  setCapitalKey: (key: keyof LensConfig, value: boolean) => void
  useExample: () => void
  clear: () => void
}

const Ctx = createContext<PrioritiesContextValue | null>(null)

function load(): Priorities {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Priorities>
      if (p && (p.mode === 'example' || p.mode === 'custom')) {
        return {
          mode: p.mode,
          weights: { ...EMPTY_WEIGHTS, ...p.weights },
          capital: { ...EMPTY_LENS, ...p.capital },
        }
      }
    }

    // Carry a milestone-1 capital lens forward rather than silently dropping it.
    const legacy = localStorage.getItem(LENS_KEY_V2)
    if (legacy) {
      const l = JSON.parse(legacy) as { mode?: string; lens?: LensConfig }
      if (l && (l.mode === 'example' || l.mode === 'custom')) {
        return {
          mode: l.mode as 'example' | 'custom',
          weights: EMPTY_WEIGHTS,
          capital: { ...EMPTY_LENS, ...l.lens },
        }
      }
    }
  } catch {
    /* ignore */
  }
  return EMPTY
}

export function PrioritiesProvider({ children }: { children: ReactNode }) {
  const [priorities, setPriorities] = useState<Priorities>(() => load())

  useEffect(() => {
    try {
      // v1 wrote itself to storage on mount, so it never evidenced a choice.
      localStorage.removeItem(LENS_KEY_V1)
      localStorage.removeItem(LENS_KEY_V2)
      if (priorities.mode === 'unset') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(priorities))
    } catch {
      /* ignore */
    }
  }, [priorities])

  // Any manual change makes the selection the visitor's own, including one that
  // starts from the example — it is no longer ValueCompass's.
  const setAxisWeight = useCallback((axis: AxisKey, weight: AxisWeight) => {
    setPriorities((prev) => ({
      ...prev,
      mode: 'custom',
      weights: { ...prev.weights, [axis]: weight },
    }))
  }, [])

  const setCapitalKey = useCallback((key: keyof LensConfig, value: boolean) => {
    setPriorities((prev) => ({
      ...prev,
      mode: 'custom',
      capital: { ...prev.capital, [key]: value },
    }))
  }, [])

  const useExample = useCallback(
    () => setPriorities({ mode: 'example', weights: EXAMPLE_WEIGHTS, capital: EXAMPLE_LENS }),
    [],
  )
  const clear = useCallback(() => setPriorities(EMPTY), [])

  const value = useMemo(
    () => ({
      priorities,
      chosen: hasPriorities(priorities),
      setAxisWeight,
      setCapitalKey,
      useExample,
      clear,
    }),
    [priorities, setAxisWeight, setCapitalKey, useExample, clear],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePriorities(): PrioritiesContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePriorities must be used within PrioritiesProvider')
  return ctx
}

/**
 * Capital-only view of the same state, so the milestone-1 capital UI keeps
 * working unchanged. `chosen` is deliberately narrower here: setting an axis
 * priority does not switch on a capital-fit number the visitor never asked for.
 */
export function useCapitalLens() {
  const { priorities, setCapitalKey, useExample, clear } = usePriorities()
  return {
    lens: priorities.capital,
    mode: priorities.mode,
    chosen: priorities.mode !== 'unset' && anyCapitalPrioritised(priorities.capital),
    setKey: setCapitalKey,
    useExampleLens: useExample,
    clear,
  }
}
