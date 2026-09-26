import { Suspense, lazy } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { PrioritiesProvider } from './lib/prioritiesContext'
import { alternativeById } from './lib/recommend'
import { Header } from './components/Header'

// Route-level code splitting: the force-graph (Graph) and Recharts (Browse,
// Compare, Maker) bundles load only when their route is first visited, keeping
// the initial payload small. The landing page now carries neither.
const HomeView = lazy(() => import('./pages/HomeView').then((m) => ({ default: m.HomeView })))
const GraphView = lazy(() => import('./pages/GraphView').then((m) => ({ default: m.GraphView })))
const BrowseView = lazy(() => import('./pages/BrowseView').then((m) => ({ default: m.BrowseView })))
const MakerPage = lazy(() => import('./pages/MakerPage').then((m) => ({ default: m.MakerPage })))
const CompareView = lazy(() => import('./pages/CompareView').then((m) => ({ default: m.CompareView })))
const RecommendView = lazy(() =>
  import('./pages/RecommendView').then((m) => ({ default: m.RecommendView })),
)
const AboutView = lazy(() => import('./pages/AboutView').then((m) => ({ default: m.AboutView })))

/** /switch/:from[/:to] becomes a comparison with :from marked as current. */
function SwitchRedirect() {
  const { from, to } = useParams()
  const alt = from ? alternativeById.get(from) : undefined
  if (!alt) return <Navigate to="/compare" replace />
  const products = [from, to].filter(Boolean).join(',')
  return (
    <Navigate
      to={`/compare?category=${alt.category}&from=${from}&products=${products}`}
      replace
    />
  )
}

function RouteFallback() {
  return (
    <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-16 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-500" />
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <PrioritiesProvider>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/graph" element={<GraphView />} />
              <Route path="/browse" element={<BrowseView />} />
              <Route path="/maker/:id" element={<MakerPage />} />
              <Route path="/compare" element={<CompareView />} />
              {/* Retired: the axis-weighting journey could not separate makers.
                  Its entry points now lead to the concrete questions. */}
              <Route path="/priorities" element={<Navigate to="/recommend" replace />} />
              <Route path="/recommend" element={<RecommendView />} />
              <Route path="/recommend/:category" element={<RecommendView />} />
              {/* Switching is a comparison with your current tool named, not a
                  separate engine. Old links keep working. */}
              <Route path="/switch" element={<Navigate to="/compare" replace />} />
              <Route path="/switch/:from" element={<SwitchRedirect />} />
              <Route path="/switch/:from/:to" element={<SwitchRedirect />} />
              <Route path="/about" element={<AboutView />} />
              <Route path="/about/working-draft" element={<AboutView draft />} />
              <Route path="*" element={<HomeView />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs leading-relaxed text-slate-500">
          <span className="mb-1 block">
            Value Compass — what the companies behind AI tools own, take money from, and have put
            on the record. We publish documented findings with their scope and sources; where our
            research has established nothing, we say so rather than guess.
          </span>
          <Link to="/about" className="underline underline-offset-2 hover:text-slate-700">
            How we decide what counts
          </Link>
          {' · '}
          <Link to="/graph" className="underline underline-offset-2 hover:text-slate-700">
            Ownership graph
          </Link>
        </footer>
      </div>
    </PrioritiesProvider>
  )
}
