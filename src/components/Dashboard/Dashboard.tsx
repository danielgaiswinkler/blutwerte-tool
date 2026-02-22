import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  ClipboardPlus,
  User,
  Calendar,
  Shield,
} from 'lucide-react';
import {
  bloodValues,
  categories,
  categoryLabels,
  getValuesByCategory,
} from '../../data';
import type { BloodValue } from '../../data';

// ---------------------------------------------------------------------------
// Types (inline – wird spaeter in shared utils refactored)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'blutwerte-entries';

interface BloodworkEntryData {
  id: string;
  date: string;
  gender: 'male' | 'female';
  values: Record<string, number>;
  notes?: string;
}

type RangeStatus = 'optimal' | 'reference' | 'critical' | 'empty';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEntries(): BloodworkEntryData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sort by date descending
    return parsed.sort((a: BloodworkEntryData, b: BloodworkEntryData) =>
      b.date.localeCompare(a.date),
    );
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getRangeStatus(
  value: number | undefined,
  bv: BloodValue,
  gender: 'male' | 'female',
): RangeStatus {
  if (value === undefined || isNaN(value)) return 'empty';

  const opt = bv.optimal[gender];
  const inOptimal =
    (opt.min === undefined || value >= opt.min) &&
    (opt.max === undefined || value <= opt.max);
  if (inOptimal) return 'optimal';

  const ref = bv.reference[gender];
  const inRef =
    (ref.min === undefined || value >= ref.min) &&
    (ref.max === undefined || value <= ref.max);
  if (inRef) return 'reference';

  return 'critical';
}

function statusColor(status: RangeStatus): string {
  switch (status) {
    case 'optimal':
      return 'var(--color-success)';
    case 'reference':
      return 'var(--color-warning)';
    case 'critical':
      return 'var(--color-danger)';
    default:
      return 'var(--color-border)';
  }
}

function statusLabel(status: RangeStatus): string {
  switch (status) {
    case 'optimal':
      return 'Optimal';
    case 'reference':
      return 'Suboptimal';
    case 'critical':
      return 'Kritisch';
    default:
      return '';
  }
}

function rangeText(range: { min?: number; max?: number; target?: number }): string {
  const parts: string[] = [];
  if (range.min !== undefined && range.max !== undefined) {
    parts.push(`${range.min}\u2013${range.max}`);
  } else if (range.min !== undefined) {
    parts.push(`> ${range.min}`);
  } else if (range.max !== undefined) {
    parts.push(`< ${range.max}`);
  }
  if (range.target !== undefined) {
    parts.push(`Ziel: ${range.target}`);
  }
  return parts.join(' | ');
}

/** Calculate how far a value is outside the reference range */
function deviationText(
  value: number,
  bv: BloodValue,
  gender: 'male' | 'female',
): string {
  const ref = bv.reference[gender];

  if (ref.min !== undefined && value < ref.min) {
    const diff = ref.min - value;
    const pct = ((diff / ref.min) * 100).toFixed(1);
    return `${diff.toFixed(2)} unter Minimum (${pct}%)`;
  }
  if (ref.max !== undefined && value > ref.max) {
    const diff = value - ref.max;
    const pct = ((diff / ref.max) * 100).toFixed(1);
    return `${diff.toFixed(2)} ueber Maximum (${pct}%)`;
  }
  return '';
}

// Status sort priority: critical=0, reference=1, optimal=2
function statusSortPriority(status: RangeStatus): number {
  switch (status) {
    case 'critical':
      return 0;
    case 'reference':
      return 1;
    case 'optimal':
      return 2;
    default:
      return 3;
  }
}

// ---------------------------------------------------------------------------
// Analyzed value type for reuse
// ---------------------------------------------------------------------------

interface AnalyzedValue {
  bv: BloodValue;
  value: number;
  status: RangeStatus;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Circular progress ring (SVG) */
function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
        opacity={0.3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

/** Summary stat card */
function StatCard({
  icon,
  label,
  count,
  total,
  color,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
  bgClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      className={`rounded-xl border p-5 flex items-center gap-4 transition-all ${bgClass}`}
    >
      <div className="relative shrink-0">
        <ProgressRing percentage={pct} size={64} strokeWidth={5} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {count}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {icon}
          <span className="text-sm font-semibold text-(--color-text-primary)">
            {label}
          </span>
        </div>
        <span className="text-xs text-(--color-text-muted)">
          {pct}% der erfassten Werte
        </span>
      </div>
    </div>
  );
}

/** Category card with traffic light dots */
function CategoryCard({
  category,
  analyzedValues,
  allCategoryValues,
}: {
  category: string;
  analyzedValues: AnalyzedValue[];
  allCategoryValues: BloodValue[];
}) {
  const [expanded, setExpanded] = useState(false);
  const filledCount = analyzedValues.length;
  const totalCount = allCategoryValues.length;

  // Sort: critical first, then suboptimal, then optimal
  const sorted = [...analyzedValues].sort(
    (a, b) => statusSortPriority(a.status) - statusSortPriority(b.status),
  );

  const criticalCount = analyzedValues.filter(
    (v) => v.status === 'critical',
  ).length;
  const suboptimalCount = analyzedValues.filter(
    (v) => v.status === 'reference',
  ).length;
  const optimalCount = analyzedValues.filter(
    (v) => v.status === 'optimal',
  ).length;

  // Border highlight based on worst status
  const borderClass =
    criticalCount > 0
      ? 'border-[var(--color-danger)]/40'
      : suboptimalCount > 0
        ? 'border-[var(--color-warning)]/40'
        : 'border-[var(--color-success)]/40';

  return (
    <div
      className={`rounded-xl border bg-(--color-bg-card) overflow-hidden transition-all ${borderClass}`}
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-(--color-bg-input)/30 transition-colors"
      >
        <div className="min-w-0 text-left">
          <h3 className="text-sm font-semibold text-(--color-text-primary) mb-1">
            {categoryLabels[category]}
          </h3>
          <div className="flex items-center gap-3 text-xs text-(--color-text-muted)">
            <span>
              {filledCount}/{totalCount} Werte
            </span>
            {/* Mini traffic light dots */}
            <div className="flex items-center gap-1">
              {analyzedValues.map((av) => (
                <div
                  key={av.bv.id}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor(av.status) }}
                  title={`${av.bv.name}: ${statusLabel(av.status)}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Mini counts */}
          <div className="flex items-center gap-2 text-xs">
            {optimalCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-(--color-success)" />
                {optimalCount}
              </span>
            )}
            {suboptimalCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-(--color-warning)" />
                {suboptimalCount}
              </span>
            )}
            {criticalCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-(--color-danger)" />
                {criticalCount}
              </span>
            )}
          </div>

          <ChevronDown
            size={16}
            className={`text-(--color-text-muted) transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Expanded value list */}
      {expanded && (
        <div className="border-t border-(--color-border)/50 px-5 py-3">
          <div className="space-y-2">
            {sorted.map((av) => (
              <Link
                key={av.bv.id}
                to={`/wert/${av.bv.id}`}
                className="flex items-center justify-between gap-3 py-1.5 rounded-lg px-2 -mx-2 hover:bg-(--color-bg-input)/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: statusColor(av.status) }}
                  />
                  <span className="text-sm text-(--color-text-primary) truncate group-hover:text-(--color-accent) transition-colors">
                    {av.bv.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-right">
                  <span className="text-sm font-mono font-medium text-(--color-text-primary)">
                    {av.value}
                  </span>
                  <span className="text-xs text-(--color-text-muted)">
                    {av.bv.unit}
                  </span>
                  <ArrowRight size={14} className="text-(--color-text-muted) opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
            {/* Show unfilled values grayed out */}
            {allCategoryValues
              .filter((bv) => !analyzedValues.find((av) => av.bv.id === bv.id))
              .map((bv) => (
                <div
                  key={bv.id}
                  className="flex items-center justify-between gap-3 py-1.5 opacity-40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-(--color-border)" />
                    <span className="text-sm text-(--color-text-muted) truncate">
                      {bv.name}
                    </span>
                  </div>
                  <span className="text-xs text-(--color-text-muted)">&mdash;</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Critical values alert section */
function CriticalAlert({
  criticalValues,
  gender,
}: {
  criticalValues: AnalyzedValue[];
  gender: 'male' | 'female';
}) {
  if (criticalValues.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-[var(--color-danger)]/50 bg-[var(--color-danger)]/5 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
        <h3 className="text-base font-semibold text-(--color-danger)">
          {criticalValues.length} kritische{' '}
          {criticalValues.length === 1 ? 'Wert' : 'Werte'} ausserhalb des
          Referenzbereichs
        </h3>
      </div>
      <div className="space-y-3">
        {criticalValues.map((av) => {
          const ref = av.bv.reference[gender];
          const deviation = deviationText(av.value, av.bv, gender);

          return (
            <Link
              key={av.bv.id}
              to={`/wert/${av.bv.id}`}
              className="flex flex-wrap items-start justify-between gap-2 bg-(--color-bg-card)/60 rounded-lg px-4 py-3 border border-[var(--color-danger)]/20 hover:bg-(--color-bg-input)/40 transition-colors group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--color-danger)' }}
                  />
                  <span className="text-sm font-medium text-(--color-text-primary) group-hover:text-(--color-accent) transition-colors">
                    {av.bv.name}
                  </span>
                  <span className="text-xs text-(--color-text-muted)">
                    ({av.bv.categoryLabel})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--color-text-muted) ml-[18px]">
                  <span>
                    Referenz: {rangeText(ref)} {av.bv.unit}
                  </span>
                  {deviation && (
                    <span className="text-(--color-danger)">{deviation}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-right shrink-0">
                <div>
                  <span className="text-lg font-mono font-bold text-(--color-danger)">
                    {av.value}
                  </span>
                  <span className="text-xs text-(--color-text-muted) ml-1">
                    {av.bv.unit}
                  </span>
                </div>
                <ArrowRight size={16} className="text-(--color-text-muted) opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state component
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mb-6">
        <Activity size={40} className="text-(--color-accent)" />
      </div>
      <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
        Willkommen beim Blutwerte-Dashboard
      </h2>
      <p className="text-(--color-text-secondary) max-w-md mb-8 leading-relaxed">
        Noch keine Blutanalyse vorhanden. Erfasse deine Laborwerte, um eine
        detaillierte Auswertung mit Ampelsystem zu erhalten.
      </p>
      <Link
        to="/eingabe"
        className="flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover) px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        <ClipboardPlus size={18} />
        Erste Analyse erfassen
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Load entries on mount
  useEffect(() => {
    const loaded = loadEntries();
    setEntries(loaded);
    if (loaded.length > 0) {
      setSelectedEntryId(loaded[0].id);
    }
  }, []);

  // Active entry
  const activeEntry = useMemo(() => {
    if (!selectedEntryId) return entries[0] ?? null;
    return entries.find((e) => e.id === selectedEntryId) ?? entries[0] ?? null;
  }, [entries, selectedEntryId]);

  // ---------------------------------------------------------------------------
  // Analyze all values for active entry
  // ---------------------------------------------------------------------------
  const analysis = useMemo(() => {
    if (!activeEntry) {
      return {
        filledCount: 0,
        totalCount: bloodValues.length,
        optimal: [] as AnalyzedValue[],
        suboptimal: [] as AnalyzedValue[],
        critical: [] as AnalyzedValue[],
        byCategory: new Map<string, AnalyzedValue[]>(),
      };
    }

    const { gender, values } = activeEntry;
    const optimal: AnalyzedValue[] = [];
    const suboptimal: AnalyzedValue[] = [];
    const critical: AnalyzedValue[] = [];
    const byCategory = new Map<string, AnalyzedValue[]>();

    for (const bv of bloodValues) {
      const val = values[bv.id];
      const status = getRangeStatus(val, bv, gender);

      if (status === 'empty') continue;

      const av: AnalyzedValue = { bv, value: val, status };

      switch (status) {
        case 'optimal':
          optimal.push(av);
          break;
        case 'reference':
          suboptimal.push(av);
          break;
        case 'critical':
          critical.push(av);
          break;
      }

      const catList = byCategory.get(bv.category) ?? [];
      catList.push(av);
      byCategory.set(bv.category, catList);
    }

    return {
      filledCount: optimal.length + suboptimal.length + critical.length,
      totalCount: bloodValues.length,
      optimal,
      suboptimal,
      critical,
      byCategory,
    };
  }, [activeEntry]);

  // Sort categories: those with critical values first, then suboptimal, then optimal-only
  const sortedCategories = useMemo(() => {
    const catsWithValues = categories.filter(
      (cat) => (analysis.byCategory.get(cat)?.length ?? 0) > 0,
    );

    return catsWithValues.sort((a, b) => {
      const aVals = analysis.byCategory.get(a) ?? [];
      const bVals = analysis.byCategory.get(b) ?? [];

      const aCrit = aVals.filter((v) => v.status === 'critical').length;
      const bCrit = bVals.filter((v) => v.status === 'critical').length;
      if (aCrit !== bCrit) return bCrit - aCrit;

      const aSub = aVals.filter((v) => v.status === 'reference').length;
      const bSub = bVals.filter((v) => v.status === 'reference').length;
      return bSub - aSub;
    });
  }, [analysis]);

  // Categories without filled values (show as "empty" section)
  const emptyCategories = useMemo(() => {
    return categories.filter(
      (cat) => (analysis.byCategory.get(cat)?.length ?? 0) === 0,
    );
  }, [analysis]);

  // ---------------------------------------------------------------------------
  // No entries: empty state
  // ---------------------------------------------------------------------------
  if (entries.length === 0) {
    return <EmptyState />;
  }

  if (!activeEntry) {
    return <EmptyState />;
  }

  const { gender } = activeEntry;
  const filledPct =
    analysis.filledCount > 0
      ? Math.round((analysis.filledCount / analysis.totalCount) * 100)
      : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* ================================================================== */}
      {/* HEADER SECTION                                                     */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-primary) mb-1">
            Blutanalyse-Dashboard
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-(--color-text-secondary)">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-(--color-text-muted)" />
              {formatDate(activeEntry.date)}
            </span>
            <span className="text-(--color-text-muted)">|</span>
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-(--color-text-muted)" />
              {gender === 'male' ? 'Maennlich' : 'Weiblich'}
            </span>
            <span className="text-(--color-text-muted)">|</span>
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-(--color-text-muted)" />
              {analysis.filledCount}/{analysis.totalCount} Werte erfasst
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Entry selector dropdown */}
          {entries.length > 1 && (
            <div className="relative">
              <select
                value={selectedEntryId ?? ''}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                className="appearance-none rounded-lg border border-(--color-border) bg-(--color-bg-card) pl-3 pr-8 py-2 text-sm text-(--color-text-primary) focus:outline-none focus:ring-2 focus:ring-(--color-accent) cursor-pointer [color-scheme:dark]"
              >
                {entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {formatDate(entry.date)} ({Object.keys(entry.values).length}{' '}
                    Werte)
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--color-text-muted) pointer-events-none"
              />
            </div>
          )}

          {/* Entry count badge */}
          <span className="flex items-center gap-1.5 rounded-full bg-(--color-bg-card) border border-(--color-border) px-3 py-1.5 text-xs text-(--color-text-muted)">
            <Shield size={12} />
            {entries.length} {entries.length === 1 ? 'Analyse' : 'Analysen'}
          </span>
        </div>
      </div>

      {/* Notes (if any) */}
      {activeEntry.notes && (
        <div className="rounded-lg border border-(--color-border)/50 bg-(--color-bg-card)/60 px-4 py-2.5 mb-6 text-sm text-(--color-text-secondary)">
          <span className="font-medium text-(--color-text-muted) mr-2">Notiz:</span>
          {activeEntry.notes}
        </div>
      )}

      {/* ================================================================== */}
      {/* CRITICAL VALUES ALERT                                              */}
      {/* ================================================================== */}
      <CriticalAlert criticalValues={analysis.critical} gender={gender} />

      {/* ================================================================== */}
      {/* SUMMARY BAR (Ampel-Uebersicht)                                    */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<CheckCircle size={16} style={{ color: 'var(--color-success)' }} />}
          label="Optimal"
          count={analysis.optimal.length}
          total={analysis.filledCount}
          color="var(--color-success)"
          bgClass="border-[var(--color-success)]/20 bg-[var(--color-success)]/5"
        />
        <StatCard
          icon={<TrendingUp size={16} style={{ color: 'var(--color-warning)' }} />}
          label="Suboptimal"
          count={analysis.suboptimal.length}
          total={analysis.filledCount}
          color="var(--color-warning)"
          bgClass="border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5"
        />
        <StatCard
          icon={
            <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
          }
          label="Kritisch"
          count={analysis.critical.length}
          total={analysis.filledCount}
          color="var(--color-danger)"
          bgClass="border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5"
        />
      </div>

      {/* Overall progress bar */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-(--color-text-secondary)">
            Erfassungsgrad
          </span>
          <span className="text-sm font-mono text-(--color-text-primary)">
            {filledPct}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-(--color-bg-input) overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${filledPct}%`,
              background:
                filledPct >= 80
                  ? 'var(--color-success)'
                  : filledPct >= 50
                    ? 'var(--color-accent)'
                    : 'var(--color-warning)',
            }}
          />
        </div>
        <p className="text-xs text-(--color-text-muted) mt-2">
          {analysis.filledCount} von {analysis.totalCount} Blutwerten erfasst.
          {analysis.totalCount - analysis.filledCount > 0 && (
            <> Noch {analysis.totalCount - analysis.filledCount} Werte offen.</>
          )}
        </p>
      </div>

      {/* ================================================================== */}
      {/* CATEGORY CARDS GRID                                                */}
      {/* ================================================================== */}
      {sortedCategories.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-(--color-text-primary) mb-4">
            Ergebnisse nach Kategorie
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedCategories.map((cat) => (
              <CategoryCard
                key={cat}
                category={cat}
                analyzedValues={analysis.byCategory.get(cat) ?? []}
                allCategoryValues={getValuesByCategory(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty categories hint */}
      {emptyCategories.length > 0 && (
        <div className="rounded-xl border border-(--color-border)/50 bg-(--color-bg-card)/40 p-5 mb-8">
          <h4 className="text-sm font-medium text-(--color-text-muted) mb-3">
            Noch nicht erfasste Kategorien ({emptyCategories.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {emptyCategories.map((cat) => {
              const catCount = getValuesByCategory(cat).length;
              return (
                <span
                  key={cat}
                  className="rounded-lg border border-(--color-border)/40 bg-(--color-bg-input)/30 px-3 py-1.5 text-xs text-(--color-text-muted)"
                >
                  {categoryLabels[cat]}{' '}
                  <span className="opacity-60">({catCount})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* QUICK ACTIONS                                                      */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/eingabe"
          className="flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover) px-5 py-3 text-sm font-semibold text-white transition-colors"
        >
          <ClipboardPlus size={18} />
          Neue Analyse erfassen
          <ArrowRight size={16} />
        </Link>

        {entries.length > 1 && (
          <Link
            to="/trend"
            className="flex items-center gap-2 rounded-xl border border-(--color-border) bg-(--color-bg-card) hover:border-(--color-accent)/50 px-5 py-3 text-sm font-medium text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
          >
            <TrendingUp size={18} />
            Verlauf anzeigen
          </Link>
        )}
      </div>
    </div>
  );
}
