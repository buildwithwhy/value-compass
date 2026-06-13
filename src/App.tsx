import { Route, Routes } from 'react-router-dom'
import { CapitalLensProvider } from './lib/lensContext'
import { Header } from './components/Header'
import { GraphView } from './pages/GraphView'
import { BrowseView } from './pages/BrowseView'
import { MakerPage } from './pages/MakerPage'
import { CompareView } from './pages/CompareView'
import { AboutView } from './pages/AboutView'

export default function App() {
  return (
    <CapitalLensProvider>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<GraphView />} />
            <Route path="/browse" element={<BrowseView />} />
            <Route path="/maker/:id" element={<MakerPage />} />
            <Route path="/compare" element={<CompareView />} />
            <Route path="/about" element={<AboutView />} />
            <Route path="*" element={<GraphView />} />
          </Routes>
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
