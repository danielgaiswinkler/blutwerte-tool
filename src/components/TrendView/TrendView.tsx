import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Activity,
  ClipboardPlus,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
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
  statusColor,
  rangeText,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData, RangeStatus } from '../../utils/bloodwork-utils';
import { useProfile } from '../../context/ProfileContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendDataPoint {
  date: string;
  dateLabel: string;
  value: number;
  status: RangeStatus;
}

interface ValueTrend {
  bv: BloodValue;
  points: TrendDataPoint[];
  currentStatus: RangeStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(status: RangeStatus): string {
  switch (status) {
    case 'optimal': return 'Optimal';
    case 'reference': return 'Suboptimal';
    case 'critical': return 'Kritisch';
    default: return '';
  }
}

function statusHex(status: RangeStatus): string {
  switch (status) {
    case 'optimal': return '#22c55e';
    case 'reference': return '#eab308';
    case 'critical': return '#ef4444';
    default: return '#475569';
  }
}

function trendDirection(points: TrendDataPoint[]): 'up' | 'down' | 'stable' {
  if (points.length < 2) return 'stable';
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const pctChange = ((last - first) / first) * 100;
  if (Math.abs(pctChange) < 2) return 'stable';
  return last > first ? 'up' : 'down';
}

function TrendIcon({ direction, size = 16 }: { direction: 'up' | 'down' | 'stable'; size?: number }) {
  switch (direction) {
    case 'up': return <TrendingUp size={size} />;
    case 'down': return <TrendingDown size={size} />;
    default: return <Minus size={size} />;
  }
}

// ---------------------------------------------------------------------------
// Custom Recharts Dot — color by status
// ---------------------------------------------------------------------------

function StatusDot(props: {
  cx?: number;
  cy?: number;
  payload?: TrendDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={statusHex(payload.status)}
      stroke="var(--color-bg-card)"
      strokeWidth={2}
    />
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: TrendDataPoint }>;
  unit: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg-secondary) px-4 py-3 shadow-lg">
      <p className="text-xs text-(--color-text-muted) mb-1">{data.dateLabel}</p>
      <p className="text-base font-mono font-semibold" style={{ color: statusHex(data.status) }}>
        {data.value} {unit}
      </p>
      <p className="text-xs mt-0.5" style={{ color: statusHex(data.status) }}>
        {statusLabel(data.status)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Sparkline (SVG, no Recharts overhead)
// ---------------------------------------------------------------------------

function Sparkline({ points, width = 80, height = 28 }: { points: TrendDataPoint[]; width?: number; height?: number }) {
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 3;

  const coords = points.map((p, i) => ({
    x: pad + ((width - 2 * pad) / (points.length - 1)) * i,
    y: pad + (1 - (p.value - min) / range) * (height - 2 * pad),
    status: p.status,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const lastPoint = coords[coords.length - 1];

  return (
    <svg width={width} height={height} className="shrink-0">
      <path d={pathD} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.5} opacity={0.5} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={2} fill={statusHex(c.status)} />
      ))}
      <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={statusHex(lastPoint.status)} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Summary Stats Card
// ---------------------------------------------------------------------------

function SummaryStats({ trend }: { trend: ValueTrend }) {
  const { points, bv } = trend;
  const values = points.map((p) => p.value);
  const first = points[0];
  const last = points[points.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const change = last.value - first.value;
  const pctChange = first.value !== 0 ? (change / first.value) * 100 : 0;
  const direction = trendDirection(points);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {/* Aktuell */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Aktuell</p>
        <p className="text-xl font-mono font-bold" style={{ color: statusHex(last.status) }}>
          {last.value}
        </p>
        <p className="text-xs" style={{ color: statusHex(last.status) }}>
          {statusLabel(last.status)}
        </p>
      </div>

      {/* Trend */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Veränderung</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-xl font-mono font-bold ${
            direction === 'stable' ? 'text-(--color-text-secondary)' :
            change > 0 ? 'text-(--color-accent)' : 'text-(--color-accent)'
          }`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}
          </span>
          <TrendIcon direction={direction} size={18} />
        </div>
        <p className="text-xs text-(--color-text-muted)">
          {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
        </p>
      </div>

      {/* Minimum */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Minimum</p>
        <p className="text-xl font-mono font-bold text-(--color-text-primary)">{min.toFixed(1)}</p>
        <p className="text-xs text-(--color-text-muted)">{bv.unit}</p>
      </div>

      {/* Maximum */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Maximum</p>
        <p className="text-xl font-mono font-bold text-(--color-text-primary)">{max.toFixed(1)}</p>
        <p className="text-xs text-(--color-text-muted)">{bv.unit}</p>
      </div>

      {/* Durchschnitt */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted) mb-1">Durchschnitt</p>
        <p className="text-xl font-mono font-bold text-(--color-text-primary)">{avg.toFixed(1)}</p>
        <p className="text-xs text-(--color-text-muted)">{points.length} Messungen</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LineChart for selected value
// ---------------------------------------------------------------------------

function TrendChart({ trend, gender }: { trend: ValueTrend; gender: 'male' | 'female' }) {
  const { bv, points } = trend;
  const opt = bv.optimal[gender];
  const ref = bv.reference[gender];

  // Calculate Y domain with padding
  const allValues = points.map((p) => p.value);
  const rangeValues = [
    ...allValues,
    ...(opt.min !== undefined ? [opt.min] : []),
    ...(opt.max !== undefined ? [opt.max] : []),
    ...(ref.min !== undefined ? [ref.min] : []),
    ...(ref.max !== undefined ? [ref.max] : []),
  ];
  const yMin = Math.min(...rangeValues);
  const yMax = Math.max(...rangeValues);
  const yPad = (yMax - yMin) * 0.15 || 1;

  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-(--color-text-primary)">{bv.name}</h3>
          <p className="text-xs text-(--color-text-muted)">{bv.categoryLabel} — {bv.unit}</p>
        </div>
        <Link
          to={`/wert/${bv.id}`}
          className="flex items-center gap-1.5 text-xs text-(--color-accent) hover:underline"
        >
          Details <ArrowRight size={12} />
        </Link>
      </div>

      {/* Range Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-(--color-text-muted)">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-(--color-success)/20 border border-(--color-success)/40" />
          Optimal: {rangeText(opt)} {bv.unit}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-dashed border-(--color-text-muted)/50" />
          Referenz: {rangeText(ref)} {bv.unit}
        </span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />

            {/* Optimal range as green zone */}
            {opt.min !== undefined && opt.max !== undefined && (
              <ReferenceArea
                y1={opt.min}
                y2={opt.max}
                fill="#22c55e"
                fillOpacity={0.08}
                stroke="none"
              />
            )}

            {/* Reference range lines (dashed) */}
            {ref.min !== undefined && (
              <ReferenceLine
                y={ref.min}
                stroke="var(--color-text-muted)"
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                label={{
                  value: `Ref. min: ${ref.min}`,
                  position: 'insideBottomLeft',
                  fill: 'var(--color-text-muted)',
                  fontSize: 10,
                }}
              />
            )}
            {ref.max !== undefined && (
              <ReferenceLine
                y={ref.max}
                stroke="var(--color-text-muted)"
                strokeDasharray="6 4"
                strokeOpacity={0.5}
                label={{
                  value: `Ref. max: ${ref.max}`,
                  position: 'insideTopLeft',
                  fill: 'var(--color-text-muted)',
                  fontSize: 10,
                }}
              />
            )}

            {/* Optimal range lines (solid green, subtle) */}
            {opt.min !== undefined && (
              <ReferenceLine
                y={opt.min}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
            )}
            {opt.max !== undefined && (
              <ReferenceLine
                y={opt.max}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
            )}

            <XAxis
              dataKey="dateLabel"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              domain={[Math.floor(yMin - yPad), Math.ceil(yMax + yPad)]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickLine={{ stroke: 'var(--color-border)' }}
              width={50}
            />
            <Tooltip content={<ChartTooltip unit={bv.unit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={<StatusDot />}
              activeDot={{ r: 8, stroke: 'var(--color-accent)', strokeWidth: 2, fill: 'var(--color-bg-card)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline Overview Card
// ---------------------------------------------------------------------------

function SparklineCard({
  trend,
  isSelected,
  onClick,
}: {
  trend: ValueTrend;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { bv, points, currentStatus } = trend;
  const last = points[points.length - 1];
  const direction = trendDirection(points);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-all hover:border-(--color-accent)/50 ${
        isSelected
          ? 'border-(--color-accent) bg-(--color-accent)/5'
          : 'border-(--color-border) bg-(--color-bg-card)'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium text-(--color-text-primary) truncate">{bv.name}</span>
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: statusHex(currentStatus) }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Sparkline points={points} />
        <div className="text-right shrink-0">
          <span className="text-sm font-mono font-bold" style={{ color: statusHex(last.status) }}>
            {last.value}
          </span>
          <div className="flex items-center gap-0.5 justify-end text-(--color-text-muted)">
            <TrendIcon direction={direction} size={10} />
            <span className="text-[10px]">{bv.unit}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mb-6">
        <TrendingUp size={40} className="text-(--color-accent)" />
      </div>
      <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
        Noch kein Verlauf verfügbar
      </h2>
      <p className="text-(--color-text-secondary) max-w-md mb-8 leading-relaxed">
        Um Trends zu sehen, benötigst du mindestens zwei Blutanalysen. Erfasse weitere Werte, um den
        Verlauf deiner Blutwerte über die Zeit zu verfolgen.
      </p>
      <Link
        to="/eingabe"
        className="flex items-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover) px-6 py-3 text-sm font-semibold text-white transition-colors"
      >
        <ClipboardPlus size={18} />
        Analyse erfassen
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TrendView
// ---------------------------------------------------------------------------

export default function TrendView() {
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedValueId, setSelectedValueId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Load entries sorted by date ascending (oldest first = left on chart)
  useEffect(() => {
    if (!activeProfile) return;
    const loaded = loadEntriesForProfile(activeProfile.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    setEntries(loaded);
  }, [activeProfile]);

  // Use the latest entry's gender
  const gender = useMemo(() => {
    if (entries.length === 0) return 'male' as const;
    return entries[entries.length - 1].gender;
  }, [entries]);

  // Build trend data for all values that appear in >= 2 entries
  const allTrends = useMemo(() => {
    if (entries.length < 2) return [];

    const trendMap = new Map<string, TrendDataPoint[]>();

    for (const entry of entries) {
      for (const [valueId, val] of Object.entries(entry.values)) {
        if (val === undefined || isNaN(val)) continue;
        const bv = bloodValues.find((b) => b.id === valueId);
        if (!bv) continue;

        const status = getRangeStatus(val, bv, entry.gender);
        const point: TrendDataPoint = {
          date: entry.date,
          dateLabel: formatDate(entry.date),
          value: val,
          status,
        };

        const existing = trendMap.get(valueId) ?? [];
        existing.push(point);
        trendMap.set(valueId, existing);
      }
    }

    // Only keep values with >= 2 data points
    const trends: ValueTrend[] = [];
    for (const [valueId, points] of trendMap) {
      if (points.length < 2) continue;
      const bv = bloodValues.find((b) => b.id === valueId);
      if (!bv) continue;
      const lastPoint = points[points.length - 1];
      trends.push({ bv, points, currentStatus: lastPoint.status });
    }

    return trends;
  }, [entries]);

  // Sort: critical first, then suboptimal, then optimal
  const sortedTrends = useMemo(() => {
    const statusPriority = (s: RangeStatus): number => {
      switch (s) {
        case 'critical': return 0;
        case 'reference': return 1;
        case 'optimal': return 2;
        default: return 3;
      }
    };
    return [...allTrends].sort(
      (a, b) => statusPriority(a.currentStatus) - statusPriority(b.currentStatus),
    );
  }, [allTrends]);

  // Quick-filter: critical/suboptimal values
  const criticalTrends = useMemo(
    () => sortedTrends.filter((t) => t.currentStatus === 'critical'),
    [sortedTrends],
  );
  const suboptimalTrends = useMemo(
    () => sortedTrends.filter((t) => t.currentStatus === 'reference'),
    [sortedTrends],
  );

  // Categories that have trend data
  const availableCategories = useMemo(() => {
    const catSet = new Set(sortedTrends.map((t) => t.bv.category));
    return categories.filter((c) => catSet.has(c));
  }, [sortedTrends]);

  // Filtered trends based on category
  const filteredTrends = useMemo(() => {
    if (!filterCategory) return sortedTrends;
    return sortedTrends.filter((t) => t.bv.category === filterCategory);
  }, [sortedTrends, filterCategory]);

  // Auto-select first value if none selected
  useEffect(() => {
    if (sortedTrends.length > 0 && !selectedValueId) {
      setSelectedValueId(sortedTrends[0].bv.id);
    }
  }, [sortedTrends, selectedValueId]);

  // Selected trend
  const selectedTrend = useMemo(
    () => sortedTrends.find((t) => t.bv.id === selectedValueId) ?? null,
    [sortedTrends, selectedValueId],
  );

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (entries.length < 2 || allTrends.length === 0) {
    return <EmptyState />;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-primary) mb-1">
            Werte-Verlauf
          </h2>
          <p className="text-sm text-(--color-text-secondary)">
            {entries.length} Analysen — {sortedTrends.length} Werte mit Verlaufsdaten
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-(--color-text-muted)">
          <Activity size={14} />
          {formatDate(entries[0].date)} — {formatDate(entries[entries.length - 1].date)}
        </div>
      </div>

      {/* Quick-Links for critical/suboptimal */}
      {(criticalTrends.length > 0 || suboptimalTrends.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {criticalTrends.map((t) => (
            <button
              key={t.bv.id}
              onClick={() => { setSelectedValueId(t.bv.id); setFilterCategory(null); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                selectedValueId === t.bv.id
                  ? 'border-(--color-danger) bg-(--color-danger)/10 text-(--color-danger)'
                  : 'border-(--color-danger)/30 bg-(--color-danger)/5 text-(--color-danger)/80 hover:border-(--color-danger)/60'
              }`}
            >
              <AlertTriangle size={11} />
              {t.bv.name}
            </button>
          ))}
          {suboptimalTrends.map((t) => (
            <button
              key={t.bv.id}
              onClick={() => { setSelectedValueId(t.bv.id); setFilterCategory(null); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                selectedValueId === t.bv.id
                  ? 'border-(--color-warning) bg-(--color-warning)/10 text-(--color-warning)'
                  : 'border-(--color-warning)/30 bg-(--color-warning)/5 text-(--color-warning)/80 hover:border-(--color-warning)/60'
              }`}
            >
              {t.bv.name}
            </button>
          ))}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setFilterCategory(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            filterCategory === null
              ? 'bg-(--color-accent) text-white'
              : 'border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-accent)/50'
          }`}
        >
          Alle ({sortedTrends.length})
        </button>
        {availableCategories.map((cat) => {
          const count = sortedTrends.filter((t) => t.bv.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-(--color-accent) text-white'
                  : 'border border-(--color-border) text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-accent)/50'
              }`}
            >
              {categoryLabels[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Sparkline Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-8">
        {filteredTrends.map((trend) => (
          <SparklineCard
            key={trend.bv.id}
            trend={trend}
            isSelected={selectedValueId === trend.bv.id}
            onClick={() => setSelectedValueId(trend.bv.id)}
          />
        ))}
      </div>

      {/* Main Chart + Stats */}
      {selectedTrend && (
        <>
          <SummaryStats trend={selectedTrend} />
          <TrendChart trend={selectedTrend} gender={gender} />

          {/* Value History Table */}
          <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
            <div className="px-5 py-3 border-b border-(--color-border)/50">
              <h4 className="text-sm font-semibold text-(--color-text-primary)">
                Messwerte — {selectedTrend.bv.name}
              </h4>
            </div>
            <div className="divide-y divide-(--color-border)/30">
              {[...selectedTrend.points].reverse().map((point, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3 hover:bg-(--color-bg-input)/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusHex(point.status) }}
                    />
                    <span className="text-sm text-(--color-text-primary)">{point.dateLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium" style={{ color: statusHex(point.status) }}>
                      {point.value}
                    </span>
                    <span className="text-xs text-(--color-text-muted)">{selectedTrend.bv.unit}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: statusHex(point.status) + '15',
                        color: statusHex(point.status),
                      }}
                    >
                      {statusLabel(point.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
