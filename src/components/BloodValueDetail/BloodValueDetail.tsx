import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  Beaker,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pill,
  Dumbbell,
  ShieldAlert,
  BookOpen,
  Link2,
  Calendar,
  User,
} from 'lucide-react';
import { getValueById } from '../../data';
import type { BloodValue, BloodValueRange } from '../../data';
import {
  loadEntries,
  getRangeStatus,
  statusColor,
  statusBgClass,
  rangeText,
  formatDate,
  type RangeStatus,
  type BloodworkEntryData,
} from '../../utils/bloodwork-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(status: RangeStatus): string {
  switch (status) {
    case 'optimal':
      return 'Optimal';
    case 'reference':
      return 'Suboptimal';
    case 'critical':
      return 'Kritisch';
    default:
      return 'Nicht erfasst';
  }
}

function statusIcon(status: RangeStatus) {
  switch (status) {
    case 'optimal':
      return <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />;
    case 'reference':
      return <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />;
    case 'critical':
      return <ShieldAlert size={16} style={{ color: 'var(--color-danger)' }} />;
    default:
      return <Info size={16} style={{ color: 'var(--color-text-muted)' }} />;
  }
}

function severityColor(severity: 'warning' | 'attention' | 'info'): {
  bg: string;
  border: string;
  text: string;
  label: string;
} {
  switch (severity) {
    case 'warning':
      return {
        bg: 'bg-[var(--color-danger)]/10',
        border: 'border-[var(--color-danger)]/40',
        text: 'text-(--color-danger)',
        label: 'Warnung',
      };
    case 'attention':
      return {
        bg: 'bg-[var(--color-warning)]/10',
        border: 'border-[var(--color-warning)]/40',
        text: 'text-(--color-warning)',
        label: 'Achtung',
      };
    case 'info':
      return {
        bg: 'bg-[var(--color-accent)]/10',
        border: 'border-[var(--color-accent)]/40',
        text: 'text-(--color-accent)',
        label: 'Info',
      };
  }
}

/**
 * Determine interpretation direction based on value position relative to
 * optimal and reference ranges.
 */
function getInterpretationDirection(
  value: number | undefined,
  bv: BloodValue,
  gender: 'male' | 'female',
): 'optimal' | 'tooLow' | 'tooHigh' | null {
  if (value === undefined || isNaN(value)) return null;

  const status = getRangeStatus(value, bv, gender);
  if (status === 'optimal') return 'optimal';

  const opt = bv.optimal[gender];
  const ref = bv.reference[gender];

  // Value below optimal min
  if (opt.min !== undefined && value < opt.min) return 'tooLow';
  // Value above optimal max
  if (opt.max !== undefined && value > opt.max) return 'tooHigh';

  // Fallback: compare against reference midpoint
  if (ref.min !== undefined && ref.max !== undefined) {
    const mid = (ref.min + ref.max) / 2;
    return value < mid ? 'tooLow' : 'tooHigh';
  }

  // Only min defined (e.g., ">" style) — if below, it's low
  if (ref.min !== undefined && value < ref.min) return 'tooLow';
  if (ref.max !== undefined && value > ref.max) return 'tooHigh';

  return 'tooLow'; // fallback
}

// ---------------------------------------------------------------------------
// Range Bar SVG Visualization
// ---------------------------------------------------------------------------

interface RangeBarProps {
  value?: number;
  reference: BloodValueRange;
  optimal: BloodValueRange;
  unit: string;
  status: RangeStatus;
}

function RangeBar({ value, reference, optimal, unit, status }: RangeBarProps) {
  // Calculate bar extent
  const refMin = reference.min;
  const refMax = reference.max;
  const optMin = optimal.min;
  const optMax = optimal.max;

  // Collect all defined numbers to find the overall range
  const definedNumbers: number[] = [];
  if (refMin !== undefined) definedNumbers.push(refMin);
  if (refMax !== undefined) definedNumbers.push(refMax);
  if (optMin !== undefined) definedNumbers.push(optMin);
  if (optMax !== undefined) definedNumbers.push(optMax);
  if (value !== undefined) definedNumbers.push(value);

  if (definedNumbers.length === 0) return null;

  const dataMin = Math.min(...definedNumbers);
  const dataMax = Math.max(...definedNumbers);
  const dataRange = dataMax - dataMin || dataMax * 0.5 || 1;

  // Extend bar +-30% beyond the data range
  const barMin = dataMin - dataRange * 0.3;
  const barMax = dataMax + dataRange * 0.3;
  const barRange = barMax - barMin;

  const toPercent = (v: number) =>
    Math.max(0, Math.min(100, ((v - barMin) / barRange) * 100));

  // Zone positions (percentage)
  const refMinPct = refMin !== undefined ? toPercent(refMin) : 0;
  const refMaxPct = refMax !== undefined ? toPercent(refMax) : 100;
  const optMinPct = optMin !== undefined ? toPercent(optMin) : refMinPct;
  const optMaxPct = optMax !== undefined ? toPercent(optMax) : refMaxPct;
  const valuePct = value !== undefined ? toPercent(value) : null;

  const svgWidth = 600;
  const svgHeight = 80;
  const barY = 32;
  const barHeight = 16;
  const labelY = barY + barHeight + 16;

  const pctToX = (pct: number) => (pct / 100) * svgWidth;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="criticalLowGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="criticalHighGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="suboptimalGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="optimalGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <rect
          x={0}
          y={barY}
          width={svgWidth}
          height={barHeight}
          rx={barHeight / 2}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth={0.5}
        />

        {/* Critical Low Zone (0 -> refMin) */}
        {refMin !== undefined && refMinPct > 0 && (
          <rect
            x={0}
            y={barY}
            width={pctToX(refMinPct)}
            height={barHeight}
            rx={barHeight / 2}
            fill="url(#criticalLowGrad)"
          />
        )}

        {/* Suboptimal Low Zone (refMin -> optMin) */}
        {refMin !== undefined && optMin !== undefined && optMinPct > refMinPct && (
          <rect
            x={pctToX(refMinPct)}
            y={barY}
            width={pctToX(optMinPct) - pctToX(refMinPct)}
            height={barHeight}
            fill="url(#suboptimalGrad)"
          />
        )}
        {/* If no optMin, the suboptimal zone before optimal doesn't exist */}
        {refMin !== undefined && optMin === undefined && (
          <rect
            x={pctToX(refMinPct)}
            y={barY}
            width={pctToX(optMaxPct) - pctToX(refMinPct)}
            height={barHeight}
            fill="url(#suboptimalGrad)"
          />
        )}

        {/* Optimal Zone */}
        <rect
          x={pctToX(optMinPct)}
          y={barY}
          width={Math.max(0, pctToX(optMaxPct) - pctToX(optMinPct))}
          height={barHeight}
          fill="url(#optimalGrad)"
        />

        {/* Suboptimal High Zone (optMax -> refMax) */}
        {refMax !== undefined && optMax !== undefined && refMaxPct > optMaxPct && (
          <rect
            x={pctToX(optMaxPct)}
            y={barY}
            width={pctToX(refMaxPct) - pctToX(optMaxPct)}
            height={barHeight}
            fill="url(#suboptimalGrad)"
          />
        )}
        {refMax !== undefined && optMax === undefined && (
          <rect
            x={pctToX(optMinPct)}
            y={barY}
            width={pctToX(refMaxPct) - pctToX(optMinPct)}
            height={barHeight}
            fill="url(#suboptimalGrad)"
          />
        )}

        {/* Critical High Zone (refMax -> end) */}
        {refMax !== undefined && refMaxPct < 100 && (
          <rect
            x={pctToX(refMaxPct)}
            y={barY}
            width={svgWidth - pctToX(refMaxPct)}
            height={barHeight}
            rx={barHeight / 2}
            fill="url(#criticalHighGrad)"
          />
        )}

        {/* Clean up rounded corners by overlaying the proper bar ends */}
        {/* Left round cap cover (only if critical zone exists) */}
        {refMin !== undefined && refMinPct > 0 && (
          <rect
            x={pctToX(refMinPct) - 1}
            y={barY}
            width={2}
            height={barHeight}
            fill="url(#suboptimalGrad)"
          />
        )}
        {/* Right round cap cover */}
        {refMax !== undefined && refMaxPct < 100 && (
          <rect
            x={pctToX(refMaxPct) - 1}
            y={barY}
            width={2}
            height={barHeight}
            fill="url(#suboptimalGrad)"
          />
        )}

        {/* Zone boundary markers */}
        {refMin !== undefined && (
          <>
            <line
              x1={pctToX(refMinPct)}
              y1={barY - 2}
              x2={pctToX(refMinPct)}
              y2={barY + barHeight + 2}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={pctToX(refMinPct)}
              y={labelY}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="monospace"
            >
              {refMin}
            </text>
          </>
        )}
        {refMax !== undefined && (
          <>
            <line
              x1={pctToX(refMaxPct)}
              y1={barY - 2}
              x2={pctToX(refMaxPct)}
              y2={barY + barHeight + 2}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={pctToX(refMaxPct)}
              y={labelY}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={10}
              fontFamily="monospace"
            >
              {refMax}
            </text>
          </>
        )}

        {/* Optimal range labels (smaller, above the bar) */}
        {optMin !== undefined && optMin !== refMin && (
          <text
            x={pctToX(optMinPct)}
            y={barY - 6}
            textAnchor="middle"
            fill="#22c55e"
            fontSize={9}
            fontFamily="monospace"
            opacity={0.8}
          >
            {optMin}
          </text>
        )}
        {optMax !== undefined && optMax !== refMax && (
          <text
            x={pctToX(optMaxPct)}
            y={barY - 6}
            textAnchor="middle"
            fill="#22c55e"
            fontSize={9}
            fontFamily="monospace"
            opacity={0.8}
          >
            {optMax}
          </text>
        )}

        {/* Value marker */}
        {valuePct !== null && (
          <>
            {/* Glow effect */}
            <circle
              cx={pctToX(valuePct)}
              cy={barY + barHeight / 2}
              r={12}
              fill={
                status === 'optimal'
                  ? '#22c55e'
                  : status === 'reference'
                    ? '#eab308'
                    : '#ef4444'
              }
              opacity={0.2}
            />
            {/* Diamond marker */}
            <polygon
              points={`
                ${pctToX(valuePct)},${barY - 6}
                ${pctToX(valuePct) + 7},${barY + barHeight / 2}
                ${pctToX(valuePct)},${barY + barHeight + 6}
                ${pctToX(valuePct) - 7},${barY + barHeight / 2}
              `}
              fill={
                status === 'optimal'
                  ? '#22c55e'
                  : status === 'reference'
                    ? '#eab308'
                    : '#ef4444'
              }
              stroke="#0f172a"
              strokeWidth={1.5}
            />
            {/* Value label above marker */}
            <rect
              x={pctToX(valuePct) - 28}
              y={barY - 24}
              width={56}
              height={16}
              rx={4}
              fill="#0f172a"
              stroke={
                status === 'optimal'
                  ? '#22c55e'
                  : status === 'reference'
                    ? '#eab308'
                    : '#ef4444'
              }
              strokeWidth={1}
            />
            <text
              x={pctToX(valuePct)}
              y={barY - 13}
              textAnchor="middle"
              fill="#f1f5f9"
              fontSize={10}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {value} {unit}
            </text>
          </>
        )}

        {/* Zone legend text at bottom */}
        {refMin !== undefined && (
          <text
            x={pctToX(refMinPct / 2)}
            y={labelY + 12}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={8}
            opacity={0.7}
          >
            Kritisch
          </text>
        )}
        <text
          x={pctToX((optMinPct + optMaxPct) / 2)}
          y={labelY + 12}
          textAnchor="middle"
          fill="#22c55e"
          fontSize={8}
          opacity={0.7}
        >
          Optimal
        </text>
        {refMax !== undefined && (
          <text
            x={pctToX(refMaxPct + (100 - refMaxPct) / 2)}
            y={labelY + 12}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={8}
            opacity={0.7}
          >
            Kritisch
          </text>
        )}
      </svg>

      {/* Text legend below */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-(--color-text-muted)">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: '#ef4444', opacity: 0.7 }} />
          Kritisch
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: '#eab308', opacity: 0.8 }} />
          Suboptimal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: '#22c55e', opacity: 0.9 }} />
          Optimal
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-(--color-border) bg-(--color-bg-card) overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-border)/50">
        {icon}
        <h3 className="text-base font-semibold text-(--color-text-primary)">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible wrapper
// ---------------------------------------------------------------------------

function Collapsible({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-(--color-bg-input)/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-base font-semibold text-(--color-text-primary)">{title}</h3>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-(--color-text-muted)" />
        ) : (
          <ChevronDown size={16} className="text-(--color-text-muted)" />
        )}
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-(--color-border)/50">{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BloodValueDetail() {
  const { id } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Load entries on mount
  useEffect(() => {
    const loaded = loadEntries();
    // Sort by date descending
    loaded.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(loaded);
    if (loaded.length > 0) {
      setSelectedEntryId(loaded[0].id);
    }
  }, []);

  // Blood value definition
  const bloodValue = useMemo(() => (id ? getValueById(id) : undefined), [id]);

  // Active entry
  const activeEntry = useMemo(() => {
    if (!selectedEntryId) return entries[0] ?? null;
    return entries.find((e) => e.id === selectedEntryId) ?? entries[0] ?? null;
  }, [entries, selectedEntryId]);

  // Derived data
  const analysis = useMemo(() => {
    if (!bloodValue || !activeEntry) {
      return {
        value: undefined as number | undefined,
        gender: 'male' as const,
        status: 'empty' as RangeStatus,
        direction: null as ReturnType<typeof getInterpretationDirection>,
        reference: undefined as BloodValueRange | undefined,
        optimal: undefined as BloodValueRange | undefined,
      };
    }

    const { gender, values } = activeEntry;
    const rawValue = values[bloodValue.id];
    const value = rawValue !== undefined && !isNaN(rawValue) ? rawValue : undefined;
    const status = getRangeStatus(value, bloodValue, gender);
    const direction = getInterpretationDirection(value, bloodValue, gender);
    const reference = bloodValue.reference[gender];
    const optimal = bloodValue.optimal[gender];

    return { value, gender, status, direction, reference, optimal };
  }, [bloodValue, activeEntry]);

  const hasValue = analysis.value !== undefined;
  const hasEntries = entries.length > 0;

  // -------------------------------------------------------------------------
  // Not found state
  // -------------------------------------------------------------------------

  if (!bloodValue) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger)]/10 flex items-center justify-center mb-6">
            <AlertTriangle size={32} className="text-(--color-danger)" />
          </div>
          <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
            Blutwert nicht gefunden
          </h2>
          <p className="text-(--color-text-secondary) mb-6">
            Der Blutwert mit der ID &quot;{id}&quot; existiert nicht in der Datenbank.
          </p>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover) px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Zurueck zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Interpretation data
  // -------------------------------------------------------------------------

  const interpretation = analysis.direction
    ? analysis.direction === 'optimal'
      ? null // handled separately
      : bloodValue.interpretation[analysis.direction]
    : null;

  const optimalMeaning = bloodValue.interpretation.optimal.meaning;

  // Related values from current interpretation direction
  const relatedValueIds =
    analysis.direction && analysis.direction !== 'optimal'
      ? bloodValue.interpretation[analysis.direction].relatedValues
      : [];

  // Build related values data
  const relatedValuesData = relatedValueIds
    .map((relId) => {
      const bv = getValueById(relId);
      if (!bv) return null;
      const val = activeEntry?.values[relId];
      const relStatus = val !== undefined ? getRangeStatus(val, bv, activeEntry?.gender ?? 'male') : 'empty';
      return { bv, value: val, status: relStatus };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Also collect unique related values from both tooLow and tooHigh for the related section
  // when we don't have a measured value
  const allRelatedIds = !hasValue
    ? [
        ...new Set([
          ...bloodValue.interpretation.tooLow.relatedValues,
          ...bloodValue.interpretation.tooHigh.relatedValues,
        ]),
      ]
    : relatedValueIds;

  const allRelatedData = allRelatedIds
    .map((relId) => {
      const bv = getValueById(relId);
      if (!bv) return null;
      const val = activeEntry?.values[relId];
      const relStatus =
        val !== undefined
          ? getRangeStatus(val, bv, activeEntry?.gender ?? 'male')
          : 'empty';
      return { bv, value: val, status: relStatus };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <div className="mb-8">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-accent) transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Zurueck zum Dashboard
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: Name, category, status */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-(--color-text-primary)">
                {bloodValue.name}
              </h1>
              {/* Category badge */}
              <span className="rounded-full bg-(--color-accent)/15 text-(--color-accent) px-3 py-1 text-xs font-medium">
                {bloodValue.categoryLabel}
              </span>
            </div>

            {/* Status badge */}
            {hasValue && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusBgClass(analysis.status)}`}
                >
                  {statusIcon(analysis.status)}
                  {statusLabel(analysis.status)}
                </span>
              </div>
            )}

            {!hasEntries && (
              <p className="text-sm text-(--color-text-muted) mt-2">
                Noch keine Werte erfasst.{' '}
                <Link to="/eingabe" className="text-(--color-accent) hover:underline">
                  Erfasse deine Werte unter Eingabe
                </Link>
              </p>
            )}

            {hasEntries && !hasValue && (
              <p className="text-sm text-(--color-text-muted) mt-2">
                Dieser Wert wurde in der aktuellen Analyse nicht erfasst.
              </p>
            )}
          </div>

          {/* Right: Current value display */}
          <div className="text-right">
            {hasValue && (
              <div>
                <span
                  className="text-4xl font-mono font-bold"
                  style={{ color: statusColor(analysis.status) }}
                >
                  {analysis.value}
                </span>
                <span className="text-lg text-(--color-text-muted) ml-2">
                  {bloodValue.unit}
                </span>
              </div>
            )}

            {/* Entry selector */}
            {entries.length > 1 && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <Calendar size={14} className="text-(--color-text-muted)" />
                <select
                  value={selectedEntryId ?? ''}
                  onChange={(e) => setSelectedEntryId(e.target.value)}
                  className="appearance-none rounded-lg border border-(--color-border) bg-(--color-bg-card) pl-3 pr-8 py-1.5 text-xs text-(--color-text-primary) focus:outline-none focus:ring-2 focus:ring-(--color-accent) cursor-pointer [color-scheme:dark]"
                >
                  {entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {formatDate(entry.date)} ({Object.keys(entry.values).length} Werte)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeEntry && (
              <div className="flex items-center justify-end gap-3 mt-1 text-xs text-(--color-text-muted)">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(activeEntry.date)}
                </span>
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {activeEntry.gender === 'male' ? 'Maennlich' : 'Weiblich'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RANGE VISUALIZATION                                              */}
      {/* ================================================================ */}
      {analysis.reference && analysis.optimal && (
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-5 mb-6">
          <h3 className="text-sm font-semibold text-(--color-text-secondary) mb-4">
            Bereichsvisualisierung
          </h3>
          <RangeBar
            value={analysis.value}
            reference={analysis.reference}
            optimal={analysis.optimal}
            unit={bloodValue.unit}
            status={analysis.status}
          />
          {/* Range text details */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-xs">
            <div>
              <span className="text-(--color-text-muted)">Referenzbereich: </span>
              <span className="font-mono text-(--color-text-secondary)">
                {rangeText(analysis.reference)} {bloodValue.unit}
              </span>
            </div>
            <div>
              <span className="text-(--color-text-muted)">Optimalbereich: </span>
              <span className="font-mono" style={{ color: 'var(--color-success)' }}>
                {rangeText(analysis.optimal)} {bloodValue.unit}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DESCRIPTION                                                      */}
      {/* ================================================================ */}
      <SectionCard
        title="Beschreibung"
        icon={<Info size={18} className="text-(--color-accent)" />}
        className="mb-6"
      >
        <p className="text-sm text-(--color-text-secondary) leading-relaxed mb-4">
          {bloodValue.description}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Beaker size={14} className="text-(--color-text-muted)" />
            <span className="text-(--color-text-muted)">Messmethode:</span>
            <span className="text-(--color-text-secondary) font-medium">
              {bloodValue.measurementType}
            </span>
          </div>
          {bloodValue.alternativeUnits && bloodValue.alternativeUnits.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Activity size={14} className="text-(--color-text-muted)" />
              <span className="text-(--color-text-muted)">Alternative Einheiten:</span>
              <span className="text-(--color-text-secondary) font-medium">
                {bloodValue.alternativeUnits.map((u) => `${u.unit} (x${u.factor})`).join(', ')}
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ================================================================ */}
      {/* INTERPRETATION                                                   */}
      {/* ================================================================ */}
      {hasValue && analysis.direction === 'optimal' && (
        <div className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-success)' }}>
              Optimaler Bereich
            </h3>
          </div>
          <p className="text-sm text-(--color-text-secondary) leading-relaxed">
            {optimalMeaning}
          </p>
        </div>
      )}

      {hasValue && interpretation && (
        <div
          className={`rounded-xl border p-5 mb-6 ${
            analysis.status === 'critical'
              ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5'
              : 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5'
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            {statusIcon(analysis.status)}
            <h3
              className="text-base font-semibold"
              style={{ color: statusColor(analysis.status) }}
            >
              {analysis.direction === 'tooLow' ? 'Wert zu niedrig' : 'Wert zu hoch'} —{' '}
              {statusLabel(analysis.status)}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Possible Causes */}
            {interpretation.possibleCauses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-(--color-text-primary) mb-2">
                  Moegliche Ursachen
                </h4>
                <ul className="space-y-1.5">
                  {interpretation.possibleCauses.map((cause, i) => (
                    <li
                      key={i}
                      className="text-sm text-(--color-text-secondary) flex items-start gap-2"
                    >
                      <span className="text-(--color-text-muted) mt-0.5 shrink-0">&#8226;</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Symptoms */}
            {interpretation.symptoms.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-(--color-text-primary) mb-2">
                  Moegliche Symptome
                </h4>
                <ul className="space-y-1.5">
                  {interpretation.symptoms.map((symptom, i) => (
                    <li
                      key={i}
                      className="text-sm text-(--color-text-secondary) flex items-start gap-2"
                    >
                      <span className="text-(--color-text-muted) mt-0.5 shrink-0">&#8226;</span>
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {interpretation.actions.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-semibold text-(--color-text-primary) mb-2">
                  Empfohlene Massnahmen
                </h4>
                <ul className="space-y-1.5">
                  {interpretation.actions.map((action, i) => (
                    <li
                      key={i}
                      className="text-sm text-(--color-text-secondary) flex items-start gap-2"
                    >
                      <span className="text-(--color-accent) mt-0.5 shrink-0">&#10148;</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related values links */}
            {relatedValuesData.length > 0 && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-semibold text-(--color-text-primary) mb-2">
                  Zusammenhaengende Werte
                </h4>
                <div className="flex flex-wrap gap-2">
                  {relatedValuesData.map(({ bv, value: relVal, status: relStatus }) => (
                    <Link
                      key={bv.id}
                      to={`/wert/${bv.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-bg-input)/50 px-3 py-1.5 text-xs hover:border-(--color-accent)/50 hover:bg-(--color-bg-input) transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: statusColor(relStatus) }}
                      />
                      <span className="text-(--color-text-primary)">{bv.name}</span>
                      {relVal !== undefined && (
                        <span className="font-mono text-(--color-text-muted)">
                          {relVal} {bv.unit}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* CONTEXT RULES                                                    */}
      {/* ================================================================ */}
      {bloodValue.contextRules.length > 0 && (
        <SectionCard
          title="Kontextregeln"
          icon={<ShieldAlert size={18} className="text-(--color-warning)" />}
          className="mb-6"
        >
          <div className="space-y-3">
            {bloodValue.contextRules.map((rule, i) => {
              const sev = severityColor(rule.severity);
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${sev.bg} ${sev.border}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sev.text} ${sev.bg} ${sev.border} border`}
                    >
                      {sev.label}
                    </span>
                    <span className="text-sm font-medium text-(--color-text-primary)">
                      {rule.condition}
                    </span>
                  </div>
                  <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                    {rule.interpretation}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ================================================================ */}
      {/* OPTIMIZATION                                                     */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Lifestyle */}
        {bloodValue.optimization.lifestyle.length > 0 && (
          <SectionCard
            title="Lebensstil"
            icon={<Dumbbell size={18} className="text-(--color-success)" />}
            className="lg:col-span-1"
          >
            <ul className="space-y-2">
              {bloodValue.optimization.lifestyle.map((tip, i) => (
                <li
                  key={i}
                  className="text-sm text-(--color-text-secondary) flex items-start gap-2"
                >
                  <span className="text-(--color-success) mt-0.5 shrink-0">&#10003;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* Supplements */}
        {bloodValue.optimization.supplements.length > 0 && (
          <SectionCard
            title="Supplements"
            icon={<Pill size={18} className="text-(--color-accent)" />}
            className="lg:col-span-1"
          >
            <div className="space-y-3">
              {bloodValue.optimization.supplements.map((supp, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-(--color-border)/50 bg-(--color-bg-input)/30 p-3"
                >
                  <div className="text-sm font-semibold text-(--color-text-primary) mb-1">
                    {supp.name}
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div>
                      <span className="text-(--color-text-muted)">Dosierung: </span>
                      <span className="text-(--color-text-secondary)">{supp.dosage}</span>
                    </div>
                    <div>
                      <span className="text-(--color-text-muted)">Timing: </span>
                      <span className="text-(--color-text-secondary)">{supp.timing}</span>
                    </div>
                    {supp.notes && (
                      <div>
                        <span className="text-(--color-text-muted)">Hinweis: </span>
                        <span className="text-(--color-text-secondary)">{supp.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Red Flags */}
        {bloodValue.optimization.redFlags.length > 0 && (
          <SectionCard
            title="Red Flags"
            icon={<AlertTriangle size={18} className="text-(--color-danger)" />}
            className="lg:col-span-1"
          >
            <div className="space-y-2">
              {bloodValue.optimization.redFlags.map((flag, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2"
                >
                  <ShieldAlert
                    size={14}
                    className="text-(--color-danger) mt-0.5 shrink-0"
                  />
                  <span className="text-sm text-(--color-text-secondary)">{flag}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* ================================================================ */}
      {/* RELATED VALUES (full section)                                    */}
      {/* ================================================================ */}
      {allRelatedData.length > 0 && (
        <SectionCard
          title="Verwandte Blutwerte"
          icon={<Link2 size={18} className="text-(--color-accent)" />}
          className="mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allRelatedData.map(({ bv, value: relVal, status: relStatus }) => {
              const isMeasured = relVal !== undefined;
              return (
                <Link
                  key={bv.id}
                  to={`/wert/${bv.id}`}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    isMeasured
                      ? 'border-(--color-border) bg-(--color-bg-input)/30 hover:border-(--color-accent)/50 hover:bg-(--color-bg-input)/60'
                      : 'border-(--color-border)/40 bg-(--color-bg-input)/10 opacity-50 hover:opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor(relStatus) }}
                    />
                    <div className="min-w-0">
                      <span className="text-sm text-(--color-text-primary) block truncate">
                        {bv.name}
                      </span>
                      <span className="text-xs text-(--color-text-muted)">
                        {bv.categoryLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    {isMeasured ? (
                      <>
                        <span
                          className="text-sm font-mono font-medium"
                          style={{ color: statusColor(relStatus) }}
                        >
                          {relVal}
                        </span>
                        <span className="text-xs text-(--color-text-muted)">{bv.unit}</span>
                      </>
                    ) : (
                      <span className="text-xs text-(--color-text-muted)">nicht erfasst</span>
                    )}
                    <ExternalLink size={12} className="text-(--color-text-muted)" />
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ================================================================ */}
      {/* SOURCES                                                          */}
      {/* ================================================================ */}
      {bloodValue.sources.length > 0 && (
        <Collapsible
          title={`Quellen (${bloodValue.sources.length})`}
          icon={<BookOpen size={18} className="text-(--color-text-muted)" />}
        >
          <ol className="space-y-2 list-decimal list-inside">
            {bloodValue.sources.map((source, i) => (
              <li key={i} className="text-sm text-(--color-text-secondary) leading-relaxed">
                {source}
              </li>
            ))}
          </ol>
        </Collapsible>
      )}

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
