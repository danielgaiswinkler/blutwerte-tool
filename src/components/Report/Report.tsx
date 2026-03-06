import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  CheckSquare,
  Square,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  bloodValues,
  categories,
  categoryLabels,
  getValuesByCategory,
} from '../../data';
import type { BloodValue } from '../../data';
import {
  loadEntriesForProfile,
  formatDate,
  getRangeStatus,
  rangeText,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData, RangeStatus } from '../../utils/bloodwork-utils';
import { useProfile } from '../../context/ProfileContext';
import {
  getRecommendations,
  getSupplementSummary,
} from '../../utils/recommendations';
import type { ValueRecommendation } from '../../utils/recommendations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusEmoji(status: RangeStatus): string {
  switch (status) {
    case 'optimal': return '\u{1F7E2}';
    case 'reference': return '\u{1F7E1}';
    case 'critical': return '\u{1F534}';
    default: return '';
  }
}

function statusLabel(status: RangeStatus): string {
  switch (status) {
    case 'optimal': return 'Optimal';
    case 'reference': return 'Suboptimal';
    case 'critical': return 'Kritisch';
    default: return '';
  }
}

function directionLabel(direction: 'tooLow' | 'tooHigh'): string {
  return direction === 'tooLow' ? 'zu niedrig' : 'zu hoch';
}

// ---------------------------------------------------------------------------
// Print-only content (rendered in a hidden div, shown only when printing)
// ---------------------------------------------------------------------------

function PrintReport({
  entry,
  profileName,
  selectedIds,
  showRecommendations,
  showSupplements,
  recommendations,
}: {
  entry: BloodworkEntryData;
  profileName: string;
  selectedIds: Set<string>;
  showRecommendations: boolean;
  showSupplements: boolean;
  recommendations: ValueRecommendation[];
}) {
  const { gender, values, date } = entry;

  // Analyze selected values
  const analyzedValues = useMemo(() => {
    const result: Array<{
      bv: BloodValue;
      value: number;
      status: RangeStatus;
    }> = [];
    for (const bv of bloodValues) {
      if (!selectedIds.has(bv.id)) continue;
      const val = values[bv.id];
      if (val === undefined) continue;
      const status = getRangeStatus(val, bv, gender);
      if (status === 'empty') continue;
      result.push({ bv, value: val, status });
    }
    return result;
  }, [selectedIds, values, gender]);

  const counts = useMemo(() => {
    const c = { optimal: 0, reference: 0, critical: 0 };
    for (const av of analyzedValues) {
      c[av.status as keyof typeof c]++;
    }
    return c;
  }, [analyzedValues]);

  // Group by category
  const byCategory = useMemo(() => {
    const map = new Map<string, typeof analyzedValues>();
    for (const av of analyzedValues) {
      const list = map.get(av.bv.category) ?? [];
      list.push(av);
      map.set(av.bv.category, list);
    }
    return map;
  }, [analyzedValues]);

  // Filter recommendations to selected values only
  const filteredRecs = useMemo(() => {
    return recommendations.filter((r) => selectedIds.has(r.bloodValue.id));
  }, [recommendations, selectedIds]);

  const supplementSummary = useMemo(() => {
    return getSupplementSummary(filteredRecs);
  }, [filteredRecs]);

  return (
    <div className="print-report">
      {/* Header */}
      <div className="print-header">
        <h1>Blutanalyse-Bericht</h1>
        <div className="print-meta">
          <span>{profileName}</span>
          <span>Datum: {formatDate(date)}</span>
          <span>{gender === 'male' ? 'Maennlich' : 'Weiblich'}</span>
          <span>{analyzedValues.length} Werte</span>
        </div>
      </div>

      {/* Summary */}
      <div className="print-summary">
        <div className="print-summary-item print-summary-optimal">
          {'\u{1F7E2}'} {counts.optimal} Optimal
        </div>
        <div className="print-summary-item print-summary-suboptimal">
          {'\u{1F7E1}'} {counts.reference} Suboptimal
        </div>
        <div className="print-summary-item print-summary-critical">
          {'\u{1F534}'} {counts.critical} Kritisch
        </div>
      </div>

      {/* Values table by category */}
      {categories.filter((cat) => byCategory.has(cat)).map((cat) => {
        const catValues = byCategory.get(cat)!;
        return (
          <div key={cat} className="print-category">
            <h2 className="print-category-title">{categoryLabels[cat]}</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Wert</th>
                  <th>Ergebnis</th>
                  <th>Einheit</th>
                  <th>Optimal</th>
                  <th>Referenz</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {catValues.map((av) => (
                  <tr key={av.bv.id} className={`print-row-${av.status}`}>
                    <td>{av.bv.name}</td>
                    <td className="print-value">{av.value}</td>
                    <td>{av.bv.unit}</td>
                    <td>{rangeText(av.bv.optimal[gender])}</td>
                    <td>{rangeText(av.bv.reference[gender])}</td>
                    <td>{statusEmoji(av.status)} {statusLabel(av.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Recommendations */}
      {showRecommendations && filteredRecs.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Empfehlungen</h2>
          {filteredRecs.map((rec) => (
            <div key={rec.bloodValue.id} className="print-rec">
              <h3>
                {statusEmoji(rec.status)} {rec.bloodValue.name} — {rec.measuredValue} {rec.bloodValue.unit} ({directionLabel(rec.direction)})
              </h3>
              {rec.actions.length > 0 && (
                <div className="print-rec-actions">
                  <strong>Massnahmen:</strong>
                  <ul>
                    {rec.actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {rec.lifestyle.length > 0 && (
                <div className="print-rec-lifestyle">
                  <strong>Lifestyle:</strong>
                  <ul>
                    {rec.lifestyle.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              )}
              {rec.foods.length > 0 && (
                <div className="print-rec-foods">
                  <strong>Ernaehrung:</strong>
                  <ul>
                    {rec.foods.flatMap((f) => f.topFoods.slice(0, 3)).map((food, i) => (
                      <li key={i}>{food.name} ({food.per100g})</li>
                    ))}
                  </ul>
                </div>
              )}
              {rec.redFlags.length > 0 && (
                <div className="print-rec-redflags">
                  <strong>Arzt aufsuchen bei:</strong>
                  <ul>
                    {rec.redFlags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Supplement Plan */}
      {showSupplements && supplementSummary.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Supplement-Plan</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Supplement</th>
                <th>Stufe</th>
                <th>Dosierung</th>
                <th>Timing</th>
                <th>Fuer Werte</th>
              </tr>
            </thead>
            <tbody>
              {supplementSummary.map(({ supplement, targetValues }) => (
                <tr key={supplement.id}>
                  <td className="print-value">{supplement.name}</td>
                  <td>Stufe {supplement.mussStufe}</td>
                  <td>{supplement.dosierungMangel ?? supplement.dosierungPraevention ?? '-'}</td>
                  <td>{supplement.timing}</td>
                  <td>{targetValues.map((tv) => tv.bv.name).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="print-footer">
        <p>
          Erstellt mit Blutwerte-Tool | Referenzbereiche nach funktioneller Medizin (Thiemo Osterhaus u.a.)
        </p>
        <p>
          Diese Auswertung ersetzt keine aerztliche Beratung. Besprich Aenderungen mit deinem Arzt.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Report component (screen UI)
// ---------------------------------------------------------------------------

export default function Report() {
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showSupplements, setShowSupplements] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load entries
  useEffect(() => {
    if (!activeProfile) return;
    const loaded = loadEntriesForProfile(activeProfile.id).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    setEntries(loaded);
    if (loaded.length > 0) setSelectedEntryId(loaded[0].id);
    else setSelectedEntryId(null);
  }, [activeProfile]);

  const activeEntry = useMemo(() => {
    if (!selectedEntryId) return entries[0] ?? null;
    return entries.find((e) => e.id === selectedEntryId) ?? entries[0] ?? null;
  }, [entries, selectedEntryId]);

  // Pre-select all filled values when entry changes
  useEffect(() => {
    if (!activeEntry) return;
    const filled = new Set<string>();
    for (const bv of bloodValues) {
      if (activeEntry.values[bv.id] !== undefined) {
        filled.add(bv.id);
      }
    }
    setSelectedIds(filled);
  }, [activeEntry]);

  const recommendations = useMemo(() => {
    if (!activeEntry) return [];
    return getRecommendations(activeEntry.values, activeEntry.gender);
  }, [activeEntry]);

  // Analyze values for the screen preview
  const analyzedValues = useMemo(() => {
    if (!activeEntry) return [];
    const result: Array<{ bv: BloodValue; value: number; status: RangeStatus }> = [];
    for (const bv of bloodValues) {
      const val = activeEntry.values[bv.id];
      if (val === undefined) continue;
      const status = getRangeStatus(val, bv, activeEntry.gender);
      if (status === 'empty') continue;
      result.push({ bv, value: val, status });
    }
    return result;
  }, [activeEntry]);

  // Category toggle helpers
  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleValue = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllInCategory = useCallback((cat: string, select: boolean) => {
    const catValues = getValuesByCategory(cat);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const bv of catValues) {
        if (activeEntry?.values[bv.id] !== undefined) {
          if (select) next.add(bv.id);
          else next.delete(bv.id);
        }
      }
      return next;
    });
  }, [activeEntry]);

  const selectAll = useCallback(() => {
    const all = new Set<string>();
    for (const av of analyzedValues) all.add(av.bv.id);
    setSelectedIds(all);
  }, [analyzedValues]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectProblematic = useCallback(() => {
    const problematic = new Set<string>();
    for (const av of analyzedValues) {
      if (av.status === 'critical' || av.status === 'reference') {
        problematic.add(av.bv.id);
      }
    }
    setSelectedIds(problematic);
  }, [analyzedValues]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Counts
  const selectedCount = selectedIds.size;
  const selectedCritical = analyzedValues.filter(
    (av) => selectedIds.has(av.bv.id) && av.status === 'critical',
  ).length;
  const selectedSuboptimal = analyzedValues.filter(
    (av) => selectedIds.has(av.bv.id) && av.status === 'reference',
  ).length;
  const selectedOptimal = analyzedValues.filter(
    (av) => selectedIds.has(av.bv.id) && av.status === 'optimal',
  ).length;

  // Group filled values by category
  const filledByCategory = useMemo(() => {
    const map = new Map<string, typeof analyzedValues>();
    for (const av of analyzedValues) {
      const list = map.get(av.bv.category) ?? [];
      list.push(av);
      map.set(av.bv.category, list);
    }
    return map;
  }, [analyzedValues]);

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (entries.length === 0 || !activeEntry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mb-6">
          <FileText size={40} className="text-(--color-accent)" />
        </div>
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
          Arzt-Bericht erstellen
        </h2>
        <p className="text-(--color-text-secondary) max-w-md leading-relaxed">
          Erfasse zuerst deine Blutwerte, um einen druckbaren Bericht zu erstellen.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Screen UI - hidden when printing */}
      <div className="w-full max-w-5xl mx-auto print:hidden">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-(--color-text-primary) mb-1 flex items-center gap-2">
              <FileText size={24} className="text-(--color-accent)" />
              Arzt-Bericht
            </h2>
            <p className="text-sm text-(--color-text-secondary)">
              Waehle die Werte aus, die du drucken moechtest. Ideal zum Arzttermin mitnehmen.
            </p>
          </div>

          {/* Entry selector */}
          {entries.length > 1 && (
            <div className="relative">
              <select
                value={selectedEntryId ?? ''}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                className="appearance-none rounded-lg border border-(--color-border) bg-(--color-bg-card) pl-3 pr-8 py-2 text-sm text-(--color-text-primary) focus:outline-none focus:ring-2 focus:ring-(--color-accent) cursor-pointer [color-scheme:dark]"
              >
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {formatDate(entry.date)} ({Object.keys(entry.values).length} Werte)
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted) pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* Quick select buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-(--color-text-muted) mr-1">Auswahl:</span>
          <button
            onClick={selectAll}
            className="rounded-lg border border-(--color-border) bg-(--color-bg-card) px-3 py-1.5 text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-accent)/50 transition-colors"
          >
            Alle
          </button>
          <button
            onClick={selectProblematic}
            className="rounded-lg border border-(--color-border) bg-(--color-bg-card) px-3 py-1.5 text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-warning)/50 transition-colors"
          >
            Nur Auffaellige
          </button>
          <button
            onClick={selectNone}
            className="rounded-lg border border-(--color-border) bg-(--color-bg-card) px-3 py-1.5 text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            Keine
          </button>

          <div className="w-px h-5 bg-(--color-border) mx-1" />

          {/* Toggle sections */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors">
            <input
              type="checkbox"
              checked={showRecommendations}
              onChange={(e) => setShowRecommendations(e.target.checked)}
              className="rounded border-(--color-border) accent-(--color-accent)"
            />
            Empfehlungen
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors">
            <input
              type="checkbox"
              checked={showSupplements}
              onChange={(e) => setShowSupplements(e.target.checked)}
              className="rounded border-(--color-border) accent-(--color-accent)"
            />
            Supplement-Plan
          </label>
        </div>

        {/* Selection summary + Print button */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 mb-6">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-(--color-text-primary) font-medium">
              {selectedCount} Werte ausgewaehlt
            </span>
            <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
              {selectedOptimal > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-(--color-success)" />
                  {selectedOptimal}
                </span>
              )}
              {selectedSuboptimal > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp size={12} className="text-(--color-warning)" />
                  {selectedSuboptimal}
                </span>
              )}
              {selectedCritical > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-(--color-danger)" />
                  {selectedCritical}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handlePrint}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover) px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            Bericht drucken
          </button>
        </div>

        {/* Category cards with checkboxes */}
        <div className="space-y-3 mb-8">
          {categories.filter((cat) => filledByCategory.has(cat)).map((cat) => {
            const catValues = filledByCategory.get(cat)!;
            const allSelected = catValues.every((av) => selectedIds.has(av.bv.id));
            const someSelected = catValues.some((av) => selectedIds.has(av.bv.id));
            const isExpanded = expandedCategories.has(cat);

            return (
              <div
                key={cat}
                className="rounded-xl border border-(--color-border) bg-(--color-bg-card) overflow-hidden"
              >
                {/* Category header */}
                <div className="flex items-center gap-3 px-5 py-3">
                  <button
                    onClick={() => toggleAllInCategory(cat, !allSelected)}
                    className="shrink-0 text-(--color-text-muted) hover:text-(--color-accent) transition-colors"
                    title={allSelected ? 'Alle abwaehlen' : 'Alle auswaehlen'}
                  >
                    {allSelected ? (
                      <CheckSquare size={18} className="text-(--color-accent)" />
                    ) : someSelected ? (
                      <CheckSquare size={18} className="text-(--color-text-muted) opacity-50" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex-1 flex items-center justify-between gap-3 hover:text-(--color-text-primary) transition-colors"
                  >
                    <div className="text-left">
                      <span className="text-sm font-semibold text-(--color-text-primary)">
                        {categoryLabels[cat]}
                      </span>
                      <span className="text-xs text-(--color-text-muted) ml-2">
                        {catValues.filter((av) => selectedIds.has(av.bv.id)).length}/{catValues.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Mini status dots */}
                      <div className="flex items-center gap-0.5">
                        {catValues.map((av) => (
                          <div
                            key={av.bv.id}
                            className={`w-2 h-2 rounded-full transition-opacity ${
                              selectedIds.has(av.bv.id) ? 'opacity-100' : 'opacity-20'
                            }`}
                            style={{
                              backgroundColor:
                                av.status === 'optimal'
                                  ? 'var(--color-success)'
                                  : av.status === 'reference'
                                    ? 'var(--color-warning)'
                                    : 'var(--color-danger)',
                            }}
                          />
                        ))}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-(--color-text-muted) transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                </div>

                {/* Expanded value list */}
                {isExpanded && (
                  <div className="border-t border-(--color-border)/50 px-5 py-3 space-y-1">
                    {catValues.map((av) => {
                      const isSelected = selectedIds.has(av.bv.id);
                      return (
                        <button
                          key={av.bv.id}
                          onClick={() => toggleValue(av.bv.id)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-(--color-bg-input)/40'
                              : 'opacity-50 hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isSelected ? (
                              <CheckSquare size={14} className="text-(--color-accent) shrink-0" />
                            ) : (
                              <Square size={14} className="text-(--color-text-muted) shrink-0" />
                            )}
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  av.status === 'optimal'
                                    ? 'var(--color-success)'
                                    : av.status === 'reference'
                                      ? 'var(--color-warning)'
                                      : 'var(--color-danger)',
                              }}
                            />
                            <span className="text-sm text-(--color-text-primary) truncate">
                              {av.bv.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono font-medium text-(--color-text-primary)">
                              {av.value}
                            </span>
                            <span className="text-xs text-(--color-text-muted)">
                              {av.bv.unit}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Preview hint */}
        <div className="rounded-xl border border-(--color-border)/50 bg-(--color-bg-card)/40 p-4 text-center mb-8">
          <p className="text-xs text-(--color-text-muted)">
            Der Bericht wird im hellen Druckformat ausgegeben — optimiert fuer Papier und PDF-Export.
          </p>
        </div>
      </div>

      {/* Print content - hidden on screen, shown when printing */}
      <div className="hidden print:block">
        <PrintReport
          entry={activeEntry}
          profileName={activeProfile?.name ?? 'Unbekannt'}
          selectedIds={selectedIds}
          showRecommendations={showRecommendations}
          showSupplements={showSupplements}
          recommendations={recommendations}
        />
      </div>
    </>
  );
}
