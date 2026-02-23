import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardPlus,
  Info,
  ShieldAlert,
  GitBranch,
} from 'lucide-react';
import {
  loadEntriesForProfile,
  formatDate,
  statusColor,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData, RangeStatus } from '../../utils/bloodwork-utils';
import { useProfile } from '../../context/ProfileContext';
import { analyzeCrossValues } from '../../utils/cross-value-rules';
import type { CrossValuePanel, CrossValueInsight } from '../../utils/cross-value-rules';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityIcon(severity: CrossValueInsight['severity']) {
  switch (severity) {
    case 'warning':
      return <ShieldAlert size={14} style={{ color: 'var(--color-danger)' }} />;
    case 'attention':
      return <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />;
    default:
      return <Info size={14} style={{ color: 'var(--color-accent)' }} />;
  }
}

function severityBorder(severity: CrossValueInsight['severity']) {
  switch (severity) {
    case 'warning':
      return 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5';
    case 'attention':
      return 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5';
    default:
      return 'border-(--color-accent)/30 bg-(--color-accent)/5';
  }
}

function worstSeverity(insights: CrossValueInsight[]): CrossValueInsight['severity'] {
  if (insights.some((i) => i.severity === 'warning')) return 'warning';
  if (insights.some((i) => i.severity === 'attention')) return 'attention';
  return 'info';
}

function panelBorder(insights: CrossValueInsight[]) {
  const worst = worstSeverity(insights);
  switch (worst) {
    case 'warning':
      return 'border-[var(--color-danger)]/40';
    case 'attention':
      return 'border-[var(--color-warning)]/40';
    default:
      return 'border-(--color-border)';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PanelCard({ panel }: { panel: CrossValuePanel }) {
  return (
    <div className={`rounded-xl border bg-(--color-bg-card) overflow-hidden ${panelBorder(panel.insights)}`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch size={16} className="text-(--color-accent)" />
          <h3 className="text-sm font-semibold text-(--color-text-primary)">{panel.name}</h3>
        </div>
        <p className="text-xs text-(--color-text-muted) ml-[24px]">{panel.description}</p>
      </div>

      {/* Values grid */}
      <div className="px-5 pb-3">
        <div className="flex flex-wrap gap-2">
          {panel.presentValues.map((pv) => (
            <Link
              key={pv.bv.id}
              to={`/wert/${pv.bv.id}`}
              className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-(--color-bg-input)/30 px-3 py-1.5 hover:border-(--color-accent)/50 transition-colors group"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusColor(pv.status) }}
              />
              <span className="text-xs text-(--color-text-secondary) group-hover:text-(--color-accent) transition-colors">
                {pv.bv.name}
              </span>
              <span className="text-xs font-mono font-medium text-(--color-text-primary)">
                {pv.value}
              </span>
              <span className="text-[10px] text-(--color-text-muted)">{pv.bv.unit}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Insights */}
      {panel.insights.length > 0 && (
        <div className="border-t border-(--color-border)/50 px-5 py-3 space-y-2">
          {panel.insights.map((insight, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-3 ${severityBorder(insight.severity)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {severityIcon(insight.severity)}
                <span className="text-sm font-medium text-(--color-text-primary)">
                  {insight.title}
                </span>
              </div>
              <p className="text-xs text-(--color-text-muted) leading-relaxed ml-[22px]">
                {insight.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No insights */}
      {panel.insights.length === 0 && (
        <div className="border-t border-(--color-border)/50 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-(--color-text-muted)">
            <Activity size={12} className="text-(--color-success)" />
            Keine Auffälligkeiten in diesem Panel.
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mb-6">
        <GitBranch size={40} className="text-(--color-accent)" />
      </div>
      <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
        Cross-Value-Analyse
      </h2>
      <p className="text-(--color-text-secondary) max-w-md mb-8 leading-relaxed">
        Erfasse mindestens 2 zusammenhängende Blutwerte (z.B. Ferritin + CRP, oder TSH + fT3 + fT4),
        um Zusammenhänge und Muster zu erkennen.
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CrossValueAnalysis() {
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

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

  const panels = useMemo(() => {
    if (!activeEntry) return [];
    return analyzeCrossValues(activeEntry.values, activeEntry.gender);
  }, [activeEntry]);

  if (!activeEntry || panels.length === 0) return <EmptyState />;

  const totalInsights = panels.reduce((sum, p) => sum + p.insights.length, 0);
  const warningCount = panels.reduce(
    (sum, p) => sum + p.insights.filter((i) => i.severity === 'warning').length,
    0,
  );
  const attentionCount = panels.reduce(
    (sum, p) => sum + p.insights.filter((i) => i.severity === 'attention').length,
    0,
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-primary) mb-1 flex items-center gap-2">
            <GitBranch size={24} className="text-(--color-accent)" />
            Cross-Value-Analyse
          </h2>
          <p className="text-sm text-(--color-text-secondary)">
            Zusammenhänge zwischen Blutwerten vom{' '}
            <span className="font-medium">{formatDate(activeEntry.date)}</span>
          </p>
        </div>

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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold text-(--color-text-primary)">{panels.length}</p>
          <p className="text-xs text-(--color-text-muted)">Panels analysiert</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold text-(--color-accent)">{totalInsights}</p>
          <p className="text-xs text-(--color-text-muted)">Erkenntnisse</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: warningCount > 0 ? 'var(--color-danger)' : attentionCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {warningCount + attentionCount}
          </p>
          <p className="text-xs text-(--color-text-muted)">Handlungsbedarf</p>
        </div>
      </div>

      {/* Panel cards */}
      <div className="space-y-4 mb-8">
        {panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-(--color-border)/50 bg-(--color-bg-card)/40 p-4 text-center">
        <p className="text-[11px] text-(--color-text-muted) leading-relaxed">
          Die Cross-Value-Analyse zeigt Muster und Zusammenhänge basierend auf funktioneller Medizin.
          Für eine definitive Diagnose ist ärztliche Beratung erforderlich.
        </p>
      </div>
    </div>
  );
}
