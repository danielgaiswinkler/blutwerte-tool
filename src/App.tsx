import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Activity, Upload, BarChart3, TrendingUp, Settings, FileText, Users, Plus, Check, X, Trash2, Sparkles, GitBranch } from 'lucide-react'
import Dashboard from './components/Dashboard/Dashboard'
import BloodworkEntry from './components/BloodworkEntry/BloodworkEntry'
import BloodValueDetail from './components/BloodValueDetail/BloodValueDetail'
import Recommendations from './components/Recommendations/Recommendations'
import CrossValueAnalysis from './components/CrossValueAnalysis/CrossValueAnalysis'
import TrendView from './components/TrendView/TrendView'
import Report from './components/Report/Report'
import SettingsPage from './components/SettingsPage/SettingsPage'
import { useProfile } from './context/ProfileContext'

function App() {
  const { profiles, activeProfile, setActiveProfile, addProfile, deleteProfile } = useProfile()
  const [showAddProfile, setShowAddProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileGender, setNewProfileGender] = useState<'male' | 'female'>('male')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleAddProfile = () => {
    const name = newProfileName.trim()
    if (!name) return
    const created = addProfile(name, newProfileGender)
    setActiveProfile(created.id)
    setNewProfileName('')
    setNewProfileGender('male')
    setShowAddProfile(false)
  }

  const handleDeleteProfile = (id: string) => {
    deleteProfile(id)
    setConfirmDelete(null)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-64 bg-(--color-bg-secondary) border-r border-(--color-border) p-4 flex flex-col">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-(--color-text-primary) flex items-center gap-2">
            <Activity className="w-6 h-6 text-(--color-accent)" />
            Blutwerte-Tool
          </h1>
          <p className="text-xs text-(--color-text-muted) mt-1">Persönliche Blutanalyse</p>
        </div>

        {/* Profile Selector */}
        <div className="mb-6 pb-4 border-b border-(--color-border)">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-(--color-text-muted) flex items-center gap-1.5">
              <Users size={12} />
              Profil
            </span>
            <button
              onClick={() => setShowAddProfile((v) => !v)}
              className="p-1 rounded hover:bg-(--color-bg-input) text-(--color-text-muted) hover:text-(--color-accent) transition-colors"
              title="Neues Profil"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Profile buttons */}
          <div className="space-y-1">
            {profiles.map((profile) => (
              <div key={profile.id} className="group flex items-center gap-1">
                <button
                  onClick={() => setActiveProfile(profile.id)}
                  className={`flex-1 text-left px-3 py-1.5 rounded-lg text-sm transition-colors truncate ${
                    activeProfile?.id === profile.id
                      ? 'bg-(--color-accent) text-white font-medium'
                      : 'text-(--color-text-secondary) hover:bg-(--color-bg-input) hover:text-(--color-text-primary)'
                  }`}
                >
                  {profile.name}
                  <span className="ml-1 text-[10px] opacity-60">
                    {profile.defaultGender === 'male' ? 'M' : 'W'}
                  </span>
                </button>
                {profiles.length > 1 && (
                  <>
                    {confirmDelete === profile.id ? (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="p-1 rounded text-danger hover:bg-danger/10 transition-colors"
                          title="Wirklich löschen"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-1 rounded text-(--color-text-muted) hover:bg-(--color-bg-input) transition-colors"
                          title="Abbrechen"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(profile.id)}
                        className="p-1 rounded text-(--color-text-muted) hover:text-danger opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Profil löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add profile form */}
          {showAddProfile && (
            <div className="mt-2 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3 space-y-2">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProfile()}
                placeholder="Name..."
                autoFocus
                className="w-full rounded-md border border-(--color-border) bg-(--color-bg-input) px-2.5 py-1.5 text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
              />
              <div className="flex rounded-md border border-(--color-border) overflow-hidden">
                <button
                  onClick={() => setNewProfileGender('male')}
                  className={`flex-1 px-2 py-1 text-xs transition-colors ${
                    newProfileGender === 'male'
                      ? 'bg-(--color-accent) text-white'
                      : 'bg-(--color-bg-input) text-(--color-text-secondary)'
                  }`}
                >
                  Männlich
                </button>
                <button
                  onClick={() => setNewProfileGender('female')}
                  className={`flex-1 px-2 py-1 text-xs transition-colors border-l border-(--color-border) ${
                    newProfileGender === 'female'
                      ? 'bg-(--color-accent) text-white'
                      : 'bg-(--color-bg-input) text-(--color-text-secondary)'
                  }`}
                >
                  Weiblich
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddProfile}
                  disabled={!newProfileName.trim()}
                  className="flex-1 rounded-md bg-(--color-accent) hover:bg-(--color-accent-hover) px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40"
                >
                  Anlegen
                </button>
                <button
                  onClick={() => { setShowAddProfile(false); setNewProfileName(''); }}
                  className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <SidebarLink to="/" icon={<BarChart3 className="w-5 h-5" />} label="Dashboard" />
          <SidebarLink to="/eingabe" icon={<Upload className="w-5 h-5" />} label="Werte eingeben" />
          <SidebarLink to="/empfehlungen" icon={<Sparkles className="w-5 h-5" />} label="Empfehlungen" />
          <SidebarLink to="/analyse" icon={<GitBranch className="w-5 h-5" />} label="Cross-Analyse" />
          <SidebarLink to="/trend" icon={<TrendingUp className="w-5 h-5" />} label="Verlauf" />
          <SidebarLink to="/bericht" icon={<FileText className="w-5 h-5" />} label="Bericht" />
          <SidebarLink to="/einstellungen" icon={<Settings className="w-5 h-5" />} label="Einstellungen" />
        </div>

        <div className="mt-auto pt-4 border-t border-(--color-border)">
          <p className="text-xs text-(--color-text-muted)">v1.0.0 — 78 Blutwerte</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wert/:id" element={<BloodValueDetail />} />
          <Route path="/eingabe" element={<BloodworkEntry />} />
          <Route path="/empfehlungen" element={<Recommendations />} />
          <Route path="/analyse" element={<CrossValueAnalysis />} />
          <Route path="/trend" element={<TrendView />} />
          <Route path="/bericht" element={<Report />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
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

export default App
