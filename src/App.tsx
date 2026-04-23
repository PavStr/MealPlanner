import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import RecipeLibrary from './pages/RecipeLibrary'
import PlanBuilder from './pages/PlanBuilder'
import PlanSummary from './pages/PlanSummary'
import Ingestion from './pages/Ingestion'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/recipes" replace />} />
          <Route path="recipes" element={<RecipeLibrary />} />
          <Route path="plan" element={<PlanBuilder />} />
          <Route path="summary/:planId?" element={<PlanSummary />} />
          <Route path="import" element={<Ingestion />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
