import { Routes, Route, NavLink } from 'react-router-dom'
import { Activity, Upload, BarChart3, TrendingUp, Settings, FileText } from 'lucide-react'
import Dashboard from './components/Dashboard/Dashboard'
import BloodworkEntry from './components/BloodworkEntry/BloodworkEntry'

function App() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-64 bg-(--color-bg-secondary) border-r border-(--color-border) p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-(--color-text-primary) flex items-center gap-2">
            <Activity className="w-6 h-6 text-(--color-accent)" />
            Blutwerte-Tool
          </h1>
          <p className="text-xs text-(--color-text-muted) mt-1">Persönliche Blutanalyse</p>
        </div>

        <div className="flex flex-col gap-1">
          <SidebarLink to="/" icon={<BarChart3 className="w-5 h-5" />} label="Dashboard" />
          <SidebarLink to="/eingabe" icon={<Upload className="w-5 h-5" />} label="Werte eingeben" />
          <SidebarLink to="/trend" icon={<TrendingUp className="w-5 h-5" />} label="Verlauf" />
          <SidebarLink to="/bericht" icon={<FileText className="w-5 h-5" />} label="Bericht" />
          <SidebarLink to="/einstellungen" icon={<Settings className="w-5 h-5" />} label="Einstellungen" />
        </div>

        <div className="mt-auto pt-4 border-t border-(--color-border)">
          <p className="text-xs text-(--color-text-muted)">v0.1.0 — 63 Blutwerte</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/eingabe" element={<BloodworkEntry />} />
          <Route path="/trend" element={<PlaceholderPage title="Verlauf" />} />
          <Route path="/bericht" element={<PlaceholderPage title="Bericht" />} />
          <Route path="/einstellungen" element={<PlaceholderPage title="Einstellungen" />} />
        </Routes>
      </main>
    </div>
  )
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-(--color-accent) text-white'
            : 'text-(--color-text-secondary) hover:bg-(--color-bg-input) hover:text-(--color-text-primary)'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2">{title}</h2>
        <p className="text-(--color-text-muted)">Kommt bald...</p>
      </div>
    </div>
  )
}

export default App
