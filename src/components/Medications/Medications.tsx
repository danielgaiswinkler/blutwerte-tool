import { useState, useMemo } from 'react'
import { Search, AlertTriangle, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Pill, Info, Shield, Heart, Activity, Wind, Droplets, X } from 'lucide-react'
import { useProfile } from '../../context/ProfileContext'
import { loadUserMedications, saveUserMedications } from '../../utils/bloodwork-utils'
import {
  medications,
  medicationCategories,
  findInteractions,
  getAggregatedEffects,
  getValueById,
  type Medication,
  type MedicationInteraction,
  type MedicationEffect,
} from '../../data'

const categoryIcons: Record<string, React.ReactNode> = {
  heart: <Heart size={16} />,
  activity: <Activity size={16} />,
  droplets: <Droplets size={16} />,
  shield: <Shield size={16} />,
  wind: <Wind size={16} />,
  pill: <Pill size={16} />,
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'high': return 'text-danger border-danger/40 bg-danger/10'
    case 'moderate': return 'text-warning border-warning/40 bg-warning/10'
    case 'low': return 'text-blue-400 border-blue-400/40 bg-blue-400/10'
    default: return 'text-(--color-text-secondary) border-(--color-border) bg-(--color-bg-input)'
  }
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'high': return 'HOCH'
    case 'moderate': return 'MITTEL'
    case 'low': return 'NIEDRIG'
    default: return ''
  }
}

function magnitudeLabel(magnitude: string): string {
  switch (magnitude) {
    case 'stark': return 'stark'
    case 'moderat': return 'moderat'
    case 'leicht': return 'leicht'
    case 'selten': return 'selten'
    default: return ''
  }
}

function DirectionIcon({ effect }: { effect: MedicationEffect }) {
  if (effect.direction === 'increase') {
    return <ArrowUp size={14} className="text-danger shrink-0" />
  }
  if (effect.direction === 'decrease') {
    return <ArrowDown size={14} className="text-blue-400 shrink-0" />
  }
  return <Info size={14} className="text-(--color-text-muted) shrink-0" />
}

export default function Medications() {
  const { activeProfile } = useProfile()
  const profileId = activeProfile?.id ?? ''

  const [activeMeds, setActiveMeds] = useState<string[]>(() => loadUserMedications(profileId))
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState<string | null>(null)

  // Sync when profile changes
  const [lastProfileId, setLastProfileId] = useState(profileId)
  if (profileId !== lastProfileId) {
    setLastProfileId(profileId)
    setActiveMeds(loadUserMedications(profileId))
  }

  const toggleMed = (medId: string) => {
    const next = activeMeds.includes(medId)
      ? activeMeds.filter(id => id !== medId)
      : [...activeMeds, medId]
    setActiveMeds(next)
    saveUserMedications(profileId, next)
  }

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  // Filter medications by search
  const filteredMedications = useMemo(() => {
    if (!search.trim()) return medications
    const q = search.toLowerCase()
    return medications.filter(m =>
      m.genericName.toLowerCase().includes(q) ||
      m.tradeNames.some(t => t.toLowerCase().includes(q)) ||
      m.description.toLowerCase().includes(q)
    )
  }, [search])

  // Grouped by category (only categories with matches)
  const groupedMedications = useMemo(() => {
    const groups: { category: typeof medicationCategories[0]; meds: Medication[] }[] = []
    for (const cat of medicationCategories) {
      const meds = filteredMedications.filter(m => m.category === cat.id)
      if (meds.length > 0) {
        groups.push({ category: cat, meds })
      }
    }
    return groups
  }, [filteredMedications])

  // Active medication analysis
  const interactions = useMemo(() => findInteractions(activeMeds), [activeMeds])
  const aggregatedEffects = useMemo(() => getAggregatedEffects(activeMeds), [activeMeds])
  const activeMedObjects = useMemo(
    () => activeMeds.map(id => medications.find(m => m.id === id)).filter(Boolean) as Medication[],
    [activeMeds]
  )

  // Auto-expand categories that have active medications
  const categoriesWithActive = useMemo(() => {
    const cats = new Set<string>()
    for (const medId of activeMeds) {
      const med = medications.find(m => m.id === medId)
      if (med) cats.add(med.category)
    }
    return cats
  }, [activeMeds])

  const isCategoryExpanded = (catId: string) =>
    expandedCategories.has(catId) || categoriesWithActive.has(catId)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-(--color-text-primary) flex items-center gap-2">
          <Pill className="w-7 h-7 text-(--color-accent)" />
          Medikamente
        </h2>
        <p className="text-sm text-(--color-text-muted) mt-1">
          Wähle deine Medikamente aus und sieh, wie sie deine Blutwerte beeinflussen
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Medication List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Medikament suchen (Name oder Handelsname)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-(--color-border) bg-(--color-bg-input) text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-accent) text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) hover:text-(--color-text-primary)"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Active count */}
          {activeMeds.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-(--color-accent)/10 border border-(--color-accent)/30 text-sm text-(--color-accent)">
              <Pill size={14} className="inline mr-1.5" />
              {activeMeds.length} Medikament{activeMeds.length !== 1 ? 'e' : ''} ausgewählt
            </div>
          )}

          {/* Category groups */}
          {groupedMedications.map(({ category, meds }) => {
            const expanded = isCategoryExpanded(category.id)
            const activeInCategory = meds.filter(m => activeMeds.includes(m.id)).length

            return (
              <div key={category.id} className="rounded-xl border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-(--color-bg-input) transition-colors text-left"
                >
                  <span className="text-(--color-accent)">
                    {categoryIcons[category.icon] ?? <Pill size={16} />}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-(--color-text-primary)">
                    {category.label}
                  </span>
                  {activeInCategory > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-(--color-accent) text-white text-xs font-medium">
                      {activeInCategory}
                    </span>
                  )}
                  <span className="text-(--color-text-muted)">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-(--color-border) divide-y divide-(--color-border)">
                    {meds.map(med => {
                      const isActive = activeMeds.includes(med.id)
                      const isDetailed = showDetails === med.id

                      return (
                        <div key={med.id} className={`${isActive ? 'bg-(--color-accent)/5' : ''}`}>
                          <div className="flex items-start gap-3 px-4 py-3">
                            {/* Checkbox */}
                            <label className="flex items-center mt-0.5 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => toggleMed(med.id)}
                                className="w-4 h-4 rounded border-2 border-(--color-border) text-(--color-accent) bg-(--color-bg-input) focus:ring-(--color-accent) focus:ring-offset-0 cursor-pointer"
                              />
                            </label>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-medium ${isActive ? 'text-(--color-accent)' : 'text-(--color-text-primary)'}`}>
                                  {med.genericName}
                                </span>
                                <span className="text-xs text-(--color-text-muted)">
                                  ({med.tradeNames.slice(0, 2).join(', ')})
                                </span>
                              </div>

                              {/* Dosages */}
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {med.commonDosages.map(d => (
                                  <span key={d} className="px-1.5 py-0.5 rounded text-[10px] bg-(--color-bg-input) text-(--color-text-muted) border border-(--color-border)">
                                    {d}
                                  </span>
                                ))}
                              </div>

                              {/* Effects preview (when active) */}
                              {isActive && med.bloodValueEffects.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {med.bloodValueEffects.filter(e => e.direction !== 'neutral').slice(0, 4).map(effect => {
                                    const bv = getValueById(effect.bloodValueId)
                                    return (
                                      <span key={effect.bloodValueId} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-(--color-bg-secondary) border border-(--color-border) text-(--color-text-secondary)">
                                        <DirectionIcon effect={effect} />
                                        {bv?.name?.split('(')[0]?.trim() ?? effect.bloodValueId}
                                      </span>
                                    )
                                  })}
                                  {med.bloodValueEffects.filter(e => e.direction !== 'neutral').length > 4 && (
                                    <span className="text-[10px] text-(--color-text-muted) self-center">
                                      +{med.bloodValueEffects.filter(e => e.direction !== 'neutral').length - 4} weitere
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Detail toggle */}
                            <button
                              onClick={() => setShowDetails(isDetailed ? null : med.id)}
                              className={`p-1 rounded shrink-0 transition-colors ${isDetailed ? 'text-(--color-accent) bg-(--color-accent)/10' : 'text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-input)'}`}
                              title="Details anzeigen"
                            >
                              <Info size={16} />
                            </button>
                          </div>

                          {/* Detail panel */}
                          {isDetailed && (
                            <div className="px-4 pb-4 pt-0 ml-7 space-y-3">
                              <p className="text-xs text-(--color-text-secondary) leading-relaxed">
                                {med.description}
                              </p>

                              <div className="text-xs text-(--color-text-muted)">
                                <span className="font-medium text-(--color-text-secondary)">Handelsnamen:</span>{' '}
                                {med.tradeNames.join(', ')}
                              </div>

                              {med.bloodValueEffects.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-(--color-text-secondary) mb-1.5">Wirkung auf Blutwerte:</p>
                                  <div className="space-y-1.5">
                                    {med.bloodValueEffects.map(effect => {
                                      const bv = getValueById(effect.bloodValueId)
                                      return (
                                        <div key={effect.bloodValueId} className="flex items-start gap-2 text-xs">
                                          <DirectionIcon effect={effect} />
                                          <div>
                                            <span className="font-medium text-(--color-text-primary)">
                                              {bv?.name ?? effect.bloodValueId}
                                            </span>
                                            {effect.magnitude !== 'keine' && (
                                              <span className="text-(--color-text-muted) ml-1">({magnitudeLabel(effect.magnitude)})</span>
                                            )}
                                            <p className="text-(--color-text-muted) mt-0.5">{effect.description}</p>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Analysis Panel */}
        <div className="space-y-4">
          {/* Interactions Warning */}
          {interactions.length > 0 && (
            <div className="rounded-xl border border-danger/40 bg-danger/5 p-4 space-y-3">
              <h3 className="text-sm font-bold text-danger flex items-center gap-2">
                <AlertTriangle size={18} />
                Wechselwirkungen ({interactions.length})
              </h3>
              {interactions.map(interaction => (
                <InteractionCard key={interaction.id} interaction={interaction} activeMeds={activeMeds} />
              ))}
            </div>
          )}

          {/* Aggregated Effects */}
          {Object.keys(aggregatedEffects).length > 0 && (
            <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 space-y-3">
              <h3 className="text-sm font-bold text-(--color-text-primary) flex items-center gap-2">
                <Activity size={18} className="text-(--color-accent)" />
                Blutwert-Einflüsse
              </h3>
              <p className="text-xs text-(--color-text-muted)">
                So beeinflussen deine Medikamente die Blutwerte:
              </p>

              <div className="space-y-2">
                {Object.entries(aggregatedEffects)
                  .sort(([,a], [,b]) => b.length - a.length)
                  .map(([bloodValueId, effects]) => {
                    const bv = getValueById(bloodValueId)
                    const hasConflict = effects.some(e => e.effect.direction === 'increase') &&
                                       effects.some(e => e.effect.direction === 'decrease')

                    return (
                      <div key={bloodValueId} className={`rounded-lg border p-2.5 ${hasConflict ? 'border-warning/40 bg-warning/5' : 'border-(--color-border) bg-(--color-bg-secondary)'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-(--color-text-primary)">
                            {bv?.name?.split('(')[0]?.trim() ?? bloodValueId}
                          </span>
                          {hasConflict && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-warning/20 text-warning font-medium">
                              Gegenläufig
                            </span>
                          )}
                        </div>
                        {effects.map(({ medication, effect }) => (
                          <div key={medication.id} className="flex items-center gap-1.5 text-[11px] text-(--color-text-muted) ml-1">
                            <DirectionIcon effect={effect} />
                            <span>{medication.genericName}</span>
                            {effect.magnitude !== 'keine' && (
                              <span className="opacity-60">({magnitudeLabel(effect.magnitude)})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Active medications summary */}
          {activeMedObjects.length > 0 && (
            <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 space-y-3">
              <h3 className="text-sm font-bold text-(--color-text-primary) flex items-center gap-2">
                <Pill size={18} className="text-(--color-accent)" />
                Aktive Medikamente
              </h3>
              <div className="space-y-1">
                {activeMedObjects.map(med => (
                  <div key={med.id} className="flex items-center justify-between text-xs">
                    <span className="text-(--color-text-secondary)">{med.genericName}</span>
                    <button
                      onClick={() => toggleMed(med.id)}
                      className="text-(--color-text-muted) hover:text-danger transition-colors"
                      title="Entfernen"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {activeMeds.length === 0 && (
            <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-bg-card) p-6 text-center">
              <Pill size={32} className="mx-auto text-(--color-text-muted) mb-3" />
              <p className="text-sm text-(--color-text-secondary) font-medium">
                Keine Medikamente ausgewählt
              </p>
              <p className="text-xs text-(--color-text-muted) mt-1">
                Wähle links deine Medikamente aus, um Einflüsse auf Blutwerte und Wechselwirkungen zu sehen.
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-xl border border-(--color-border) bg-(--color-bg-secondary) p-3">
            <p className="text-[10px] text-(--color-text-muted) leading-relaxed">
              <strong>Hinweis:</strong> Diese Informationen ersetzen keine ärztliche Beratung.
              Die Auswirkungen auf Blutwerte sind Durchschnittswerte und können individuell abweichen.
              Medikamente niemals eigenständig absetzen oder die Dosierung ändern!
              Bespreche Wechselwirkungen immer mit deinem Arzt oder Apotheker.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InteractionCard({ interaction, activeMeds }: { interaction: MedicationInteraction; activeMeds: string[] }) {
  const involvedMeds = interaction.medications
    .filter(id => activeMeds.includes(id))
    .map(id => medications.find(m => m.id === id))
    .filter(Boolean) as Medication[]

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${severityColor(interaction.severity)}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="shrink-0" />
        <span className="text-xs font-bold">
          Risiko: {severityLabel(interaction.severity)}
        </span>
      </div>
      <p className="text-xs leading-relaxed">
        {interaction.description}
      </p>
      <div className="flex gap-1 flex-wrap">
        {involvedMeds.map(med => (
          <span key={med.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 border border-current/20">
            {med.genericName}
          </span>
        ))}
      </div>
      <div className="pt-1 border-t border-current/20">
        <p className="text-[10px] leading-relaxed">
          <strong>Empfehlung:</strong> {interaction.recommendation}
        </p>
      </div>
    </div>
  )
}
