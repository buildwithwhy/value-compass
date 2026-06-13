import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CapitalLensProvider } from './lib/lensContext'
import { Header } from './components/Header'

// Route-level code splitting: the force-graph (Graph) and Recharts (Browse,
// Compare, Maker) bundles load only when their route is first visited, keeping
// the initial payload small.
const GraphView = lazy(() => import('./pages/GraphView').then((m) => ({ default: m.GraphView })))
const BrowseView = lazy(() => import('./pages/BrowseView').then((m) => ({ default: m.BrowseView })))
const MakerPage = lazy(() => import('./pages/MakerPage').then((m) => ({ default: m.MakerPage })))
const CompareView = lazy(() => import('./pages/CompareView').then((m) => ({ default: m.CompareView })))
const AboutView = lazy(() => import('./pages/AboutView').then((m) => ({ default: m.AboutView })))

function RouteFallback() {
  return (
    <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-16 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <CapitalLensProvider>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<GraphView />} />
              <Route path="/browse" element={<BrowseView />} />
              <Route path="/maker/:id" element={<MakerPage />} />
              <Route path="/compare" element={<CompareView />} />
              <Route path="/about" element={<AboutView />} />
              <Route path="*" element={<GraphView />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400">
          Value Compass — a values & money-flow lens on AI makers. Funders are context, not scored.
          Tension hooks are open questions, not verdicts. The Capital Lens is your personal filter,
          not a score.
        </footer>
      </div>
    </CapitalLensProvider>
  )
}
