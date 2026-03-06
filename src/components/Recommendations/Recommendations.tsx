import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Pill,
  Apple,
  Dumbbell,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ShieldAlert,
  Activity,
  ClipboardPlus,
  Sparkles,
  Ban,
  Clock,
  Star,
} from 'lucide-react';
import {
  loadEntriesForProfile,
  formatDate,
  statusColor,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData, RangeStatus } from '../../utils/bloodwork-utils';
import { useProfile } from '../../context/ProfileContext';
import {
  getRecommendations,
  getSupplementSummary,
} from '../../utils/recommendations';
import type { ValueRecommendation, SupplementData, FoodCategory } from '../../utils/recommendations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: RangeStatus) {
  if (status === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/30 px-2.5 py-0.5 text-xs font-medium text-(--color-danger)">
        <ShieldAlert size={12} /> Kritisch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 px-2.5 py-0.5 text-xs font-medium text-(--color-warning)">
      <AlertTriangle size={12} /> Suboptimal
    </span>
  );
}

function directionLabel(direction: 'tooLow' | 'tooHigh') {
  return direction === 'tooLow' ? 'Zu niedrig' : 'Zu hoch';
}

function stufeBadge(mussStufe: number) {
  const labels: Record<number, { text: string; cls: string }> = {
    1: { text: 'Basis', cls: 'bg-[var(--color-success)]/15 border-[var(--color-success)]/30 text-(--color-success)' },
    2: { text: 'Bedingt', cls: 'bg-[var(--color-warning)]/15 border-[var(--color-warning)]/30 text-(--color-warning)' },
    3: { text: 'Optional', cls: 'bg-(--color-bg-input) border-(--color-border) text-(--color-text-muted)' },
  };
  const info = labels[mussStufe] ?? labels[3];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${info.cls}`}>
      Stufe {mussStufe}: {info.text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SupplementCard({ supplement, compact }: { supplement: SupplementData; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-(--color-bg-input)/30 transition-colors text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill size={14} className="text-(--color-accent) shrink-0" />
            <span className="text-sm font-semibold text-(--color-text-primary)">
              {supplement.name}
            </span>
            {stufeBadge(supplement.mussStufe)}
          </div>
          {!compact && (
            <p className="text-xs text-(--color-text-muted) mt-1 ml-[22px]">
              {supplement.dosierungPraevention ?? supplement.dosierungMangel}
            </p>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-(--color-text-muted) shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-(--color-border)/50 px-4 py-3 space-y-3 text-sm">
          {/* Dosierung */}
          <div>
            <h5 className="text-xs font-semibold text-(--color-text-secondary) mb-1">Dosierung</h5>
            {supplement.dosierungPraevention && (
              <p className="text-xs text-(--color-text-muted)">
                <span className="font-medium text-(--color-text-secondary)">Prävention:</span>{' '}
                {supplement.dosierungPraevention}
              </p>
            )}
            {supplement.dosierungMangel && (
              <p className="text-xs text-(--color-text-muted)">
                <span className="font-medium text-(--color-text-secondary)">Bei Mangel:</span>{' '}
                {supplement.dosierungMangel}
              </p>
            )}
          </div>

          {/* Timing */}
          <div className="flex items-start gap-2">
            <Clock size={12} className="text-(--color-text-muted) mt-0.5 shrink-0" />
            <p className="text-xs text-(--color-text-muted)">{supplement.timing}</p>
          </div>

          {/* Gute Wirkstoffform */}
          <div>
            <h5 className="text-xs font-semibold text-(--color-success) mb-1">Gute Form</h5>
            <p className="text-xs text-(--color-text-muted)">{supplement.wirkstoffformGut}</p>
          </div>

          {/* Schlechte Form */}
          <div>
            <h5 className="text-xs font-semibold text-(--color-danger) mb-1">Schlechte Form</h5>
            <p className="text-xs text-(--color-text-muted)">{supplement.wirkstoffformSchlecht}</p>
          </div>

          {/* Marken */}
          {supplement.empfohleneMarken.length > 0 && (
            <div className="flex items-start gap-2">
              <Star size={12} className="text-(--color-warning) mt-0.5 shrink-0" />
              <p className="text-xs text-(--color-text-muted)">
                {supplement.empfohleneMarken.join(', ')} — ca. {supplement.preisProMonat}/Monat
              </p>
            </div>
          )}

          {/* Synergien */}
          {supplement.synergien.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-(--color-text-secondary) mb-1">Kombiniert gut mit</h5>
              <div className="flex flex-wrap gap-1">
                {supplement.synergien.map((s) => (
                  <span key={s} className="rounded-full bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 px-2 py-0.5 text-[10px] text-(--color-text-muted)">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Antagonisten */}
          {supplement.antagonisten.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-(--color-danger) mb-1">Nicht kombinieren mit</h5>
              <div className="flex flex-wrap gap-1">
                {supplement.antagonisten.map((a) => (
                  <span key={a} className="rounded-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 px-2 py-0.5 text-[10px] text-(--color-text-muted)">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hinweise */}
          {supplement.besondereHinweise && (
            <div className="rounded-lg bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 px-3 py-2">
              <p className="text-[11px] text-(--color-text-muted)">{supplement.besondereHinweise}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FoodSection({ foods }: { foods: FoodCategory[] }) {
  const [showAll, setShowAll] = useState(false);

  if (foods.length === 0) return null;

  // Combine all top foods and dedup by name
  const allTopFoods = foods.flatMap((f) => f.topFoods);
  const uniqueFoods = allTopFoods.filter(
    (f, i) => allTopFoods.findIndex((x) => x.name === f.name) === i,
  );
  const visibleFoods = showAll ? uniqueFoods : uniqueFoods.slice(0, 5);

  const allAvoid = foods.flatMap((f) => f.avoidFoods);
  const uniqueAvoid = allAvoid.filter(
    (f, i) => allAvoid.findIndex((x) => x.name === f.name) === i,
  );

  const allTips = [...new Set(foods.flatMap((f) => f.tips))];

  return (
    <div className="space-y-3">
      {/* Top Foods */}
      <div>
        <h5 className="text-xs font-semibold text-(--color-text-secondary) mb-2 flex items-center gap-1.5">
          <Apple size={12} className="text-(--color-success)" />
          Empfohlene Lebensmittel
        </h5>
        <div className="space-y-1">
          {visibleFoods.map((food) => (
            <div
              key={food.name}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 bg-(--color-bg-input)/30"
            >
              <div className="min-w-0">
                <span className="text-sm text-(--color-text-primary)">{food.name}</span>
                <span className="text-xs text-(--color-text-muted) ml-2">
                  {food.per100g}/{food.portion ? `${food.portion}` : '100g'}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  food.bioavailability === 'hoch'
                    ? 'bg-[var(--color-success)]/10 text-(--color-success)'
                    : food.bioavailability === 'mittel'
                      ? 'bg-[var(--color-warning)]/10 text-(--color-warning)'
                      : 'bg-(--color-bg-input) text-(--color-text-muted)'
                }`}
              >
                {food.bioavailability}
              </span>
            </div>
          ))}
        </div>
        {uniqueFoods.length > 5 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-(--color-accent) hover:underline mt-1 ml-3"
          >
            {showAll ? 'Weniger anzeigen' : `Alle ${uniqueFoods.length} anzeigen`}
          </button>
        )}
      </div>

      {/* Avoid Foods */}
      {uniqueAvoid.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-(--color-danger) mb-2 flex items-center gap-1.5">
            <Ban size={12} />
            Besser vermeiden
          </h5>
          <div className="space-y-1">
            {uniqueAvoid.slice(0, 4).map((food) => (
              <div key={food.name} className="flex items-start gap-2 px-3 py-1 text-xs text-(--color-text-muted)">
                <span className="text-(--color-danger) shrink-0 mt-0.5">x</span>
                <span>
                  <span className="font-medium text-(--color-text-secondary)">{food.name}</span>
                  {' — '}{food.mechanism}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {allTips.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-(--color-text-secondary) mb-1">Tipps</h5>
          <ul className="space-y-0.5">
            {allTips.slice(0, 3).map((tip, i) => (
              <li key={i} className="text-xs text-(--color-text-muted) pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-(--color-text-muted)">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: ValueRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = rec.status === 'critical' ? 'border-[var(--color-danger)]/40' : 'border-[var(--color-warning)]/40';

  return (
    <div className={`rounded-xl border ${borderColor} bg-(--color-bg-card) overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-(--color-bg-input)/20 transition-colors"
      >
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              to={`/wert/${rec.bloodValue.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-(--color-text-primary) hover:text-(--color-accent) transition-colors"
            >
              {rec.bloodValue.name}
            </Link>
            {statusBadge(rec.status)}
          </div>
          <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
            <span className="font-mono font-medium" style={{ color: statusColor(rec.status) }}>
              {rec.measuredValue} {rec.bloodValue.unit}
            </span>
            <span>{directionLabel(rec.direction)}</span>
            <span className="text-(--color-text-muted)/50">|</span>
            <span>{rec.bloodValue.categoryLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rec.supplements.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-(--color-accent)">
              <Pill size={10} /> {rec.supplements.length}
            </span>
          )}
          {rec.foods.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-(--color-success)">
              <Apple size={10} /> {rec.foods.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-(--color-text-muted) transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-(--color-border)/50 px-5 py-4 space-y-5">
          {/* Actions */}
          {rec.actions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-(--color-accent)" />
                Empfohlene Maßnahmen
              </h4>
              <ul className="space-y-1">
                {rec.actions.map((a, i) => (
                  <li key={i} className="text-xs text-(--color-text-muted) pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-(--color-accent)">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supplements */}
          {rec.supplements.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) mb-2 flex items-center gap-1.5">
                <Pill size={12} className="text-(--color-accent)" />
                Supplement-Empfehlungen
              </h4>
              <div className="space-y-2">
                {rec.supplements.map((s) => (
                  <SupplementCard key={s.id} supplement={s} />
                ))}
              </div>
            </div>
          )}

          {/* Inline supplements from knowledge base (if no external supplement match) */}
          {rec.supplements.length === 0 && rec.inlineSupplements.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) mb-2 flex items-center gap-1.5">
                <Pill size={12} className="text-(--color-accent)" />
                Supplement-Hinweise
              </h4>
              <div className="space-y-1">
                {rec.inlineSupplements.map((s, i) => (
                  <div key={i} className="rounded-lg border border-(--color-border) px-3 py-2">
                    <span className="text-sm font-medium text-(--color-text-primary)">{s.name}</span>
                    <p className="text-xs text-(--color-text-muted) mt-0.5">
                      {s.dosage} — {s.timing}
                    </p>
                    {s.notes && (
                      <p className="text-[11px] text-(--color-text-muted) mt-0.5">{s.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Foods */}
          {rec.foods.length > 0 && (
            <FoodSection foods={rec.foods} />
          )}

          {/* Lifestyle */}
          {rec.lifestyle.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-(--color-text-secondary) mb-2 flex items-center gap-1.5">
                <Dumbbell size={12} className="text-(--color-accent)" />
                Lifestyle-Tipps
              </h4>
              <ul className="space-y-1">
                {rec.lifestyle.map((tip, i) => (
                  <li key={i} className="text-xs text-(--color-text-muted) pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-(--color-text-muted)">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red Flags */}
          {rec.redFlags.length > 0 && (
            <div className="rounded-lg bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 px-4 py-3">
              <h4 className="text-xs font-semibold text-(--color-danger) mb-1.5 flex items-center gap-1.5">
                <ShieldAlert size={12} />
                Warnsignale — Arzt aufsuchen bei:
              </h4>
              <ul className="space-y-0.5">
                {rec.redFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-(--color-text-muted) pl-3 relative before:content-['!'] before:absolute before:left-0 before:text-(--color-danger) before:font-bold">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplement Summary Panel
// ---------------------------------------------------------------------------

function SupplementSummaryPanel({ recommendations }: { recommendations: ValueRecommendation[] }) {
  const summary = useMemo(() => getSupplementSummary(recommendations), [recommendations]);

  if (summary.length === 0) return null;

  return (
    <div className="rounded-xl border border-(--color-accent)/30 bg-(--color-accent)/5 p-5 mb-8">
      <h3 className="text-base font-semibold text-(--color-text-primary) mb-1 flex items-center gap-2">
        <Pill size={18} className="text-(--color-accent)" />
        Supplement-Übersicht
      </h3>
      <p className="text-xs text-(--color-text-muted) mb-4">
        Basierend auf deinen Blutwerten empfohlene Supplements, priorisiert nach Wichtigkeit.
      </p>
      <div className="space-y-2">
        {summary.map(({ supplement, targetValues }) => (
          <div
            key={supplement.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-(--color-border) bg-(--color-bg-card) px-4 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-(--color-text-primary)">
                  {supplement.name}
                </span>
                {stufeBadge(supplement.mussStufe)}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] text-(--color-text-muted)">Für:</span>
                {targetValues.map((tv) => (
                  <span
                    key={tv.bv.id}
                    className="rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${statusColor(tv.status)} 15%, transparent)`,
                      color: statusColor(tv.status),
                    }}
                  >
                    {tv.bv.name}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-xs text-(--color-text-muted) shrink-0">
              {supplement.preisProMonat}/Mo
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ hasEntries }: { hasEntries: boolean }) {
  if (!hasEntries) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mb-6">
          <Sparkles size={40} className="text-(--color-accent)" />
        </div>
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
          Personalisierte Empfehlungen
        </h2>
        <p className="text-(--color-text-secondary) max-w-md mb-8 leading-relaxed">
          Erfasse zuerst deine Blutwerte, um personalisierte Supplement-, Ernährungs- und
          Lifestyle-Empfehlungen zu erhalten.
        </p>
        <Link
          to="/eingabe"
          className="flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover) px-6 py-3 text-sm font-semibold text-white transition-colors"
        >
          <ClipboardPlus size={18} />
          Blutwerte erfassen
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[var(--color-success)]/10 flex items-center justify-center mb-6">
        <Activity size={40} className="text-(--color-success)" />
      </div>
      <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
        Alles im grünen Bereich!
      </h2>
      <p className="text-(--color-text-secondary) max-w-md leading-relaxed">
        Alle erfassten Blutwerte liegen im optimalen Bereich. Keine spezifischen Empfehlungen nötig.
        Weiter so!
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Recommendations() {
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Load entries for active profile
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

  const recommendations = useMemo(() => {
    if (!activeEntry) return [];
    return getRecommendations(activeEntry.values, activeEntry.gender);
  }, [activeEntry]);

  // Count totals for summary
  const filledCount = activeEntry ? Object.keys(activeEntry.values).length : 0;
  const criticalCount = recommendations.filter((r) => r.status === 'critical').length;
  const suboptimalCount = recommendations.filter((r) => r.status === 'reference').length;

  if (entries.length === 0) return <EmptyState hasEntries={false} />;
  if (!activeEntry) return <EmptyState hasEntries={false} />;
  if (recommendations.length === 0) return <EmptyState hasEntries={true} />;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-primary) mb-1 flex items-center gap-2">
            <Sparkles size={24} className="text-(--color-accent)" />
            Empfehlungen
          </h2>
          <p className="text-sm text-(--color-text-secondary)">
            Personalisierte Optimierung basierend auf{' '}
            <span className="font-medium">{filledCount} Blutwerten</span> vom{' '}
            <span className="font-medium">{formatDate(activeEntry.date)}</span>
          </p>
        </div>

        {/* Entry selector */}
        {entries.length > 1 && (
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
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold text-(--color-text-primary)">{recommendations.length}</p>
          <p className="text-xs text-(--color-text-muted)">Optimierbare Werte</p>
        </div>
        {criticalCount > 0 && (
          <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 text-center">
            <p className="text-2xl font-bold text-(--color-danger)">{criticalCount}</p>
            <p className="text-xs text-(--color-text-muted)">Kritisch</p>
          </div>
        )}
        {suboptimalCount > 0 && (
          <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4 text-center">
            <p className="text-2xl font-bold text-(--color-warning)">{suboptimalCount}</p>
            <p className="text-xs text-(--color-text-muted)">Suboptimal</p>
          </div>
        )}
      </div>

      {/* Supplement Summary */}
      <SupplementSummaryPanel recommendations={recommendations} />

      {/* Individual recommendations */}
      <h3 className="text-lg font-semibold text-(--color-text-primary) mb-4">
        Detailempfehlungen pro Wert
      </h3>
      <div className="space-y-3 mb-8">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.bloodValue.id} rec={rec} />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-(--color-border)/50 bg-(--color-bg-card)/40 p-4 text-center">
        <p className="text-[11px] text-(--color-text-muted) leading-relaxed">
          Diese Empfehlungen basieren auf funktioneller Medizin und ersetzen keine ärztliche Beratung.
          Besprich Supplement-Einnahmen und Ernährungsumstellungen mit deinem Arzt, besonders bei Medikamenteneinnahme.
        </p>
      </div>
    </div>
  );
}
