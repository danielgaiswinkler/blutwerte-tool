import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TestTube2,
  ClipboardPlus,
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Lightbulb,
  MapPin,
  Home,
  Activity,
  ShieldCheck,
  CreditCard,
  BadgeEuro,
} from 'lucide-react';
import {
  bloodValues,
  labPackages,
  labSparTipps,
  labore,
  homeTestAnbieter,
  homeTestHinweis,
  categoryLabels,
} from '../../data';
import type { BloodValue, LabPackage, LabInfo, HomeTestProvider } from '../../data';
import {
  loadEntriesForProfile,
  formatDate,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData } from '../../utils/bloodwork-utils';
import { useProfile } from '../../context/ProfileContext';
import {
  getMissingValues,
  getRetestValues,
  getPackageRecommendations,
  calculateSelectedCost,
} from '../../utils/lab-planner-utils';
import type {
  MissingValue,
  RetestValue,
  PackageRecommendation,
  CostBreakdown,
} from '../../utils/lab-planner-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kassenBadge(labCost: MissingValue['labCost']) {
  if (!labCost) {
    return (
      <span className="rounded-full bg-(--color-bg-input) border border-(--color-border) px-2 py-0.5 text-[10px] text-(--color-text-muted)">
        Kosten unbekannt
      </span>
    );
  }
  if (labCost.kassenleistung === true) {
    return (
      <span className="rounded-full bg-[var(--color-success)]/15 border border-[var(--color-success)]/30 px-2 py-0.5 text-[10px] font-medium text-(--color-success)">
        Kassenleistung
      </span>
    );
  }
  if (labCost.kassenDetails?.toLowerCase().includes('indikation')) {
    return (
      <span className="rounded-full bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 px-2 py-0.5 text-[10px] font-medium text-(--color-warning)">
        Bei Indikation
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/30 px-2 py-0.5 text-[10px] font-medium text-(--color-danger)">
      IGeL / Selbstzahler
    </span>
  );
}

function priorityLabel(prio: 1 | 2 | 3) {
  switch (prio) {
    case 1: return 'Basis-Check';
    case 2: return 'Erweiterter Check';
    case 3: return 'Komplett / Spezial';
  }
}

function priorityColor(prio: 1 | 2 | 3) {
  switch (prio) {
    case 1: return 'var(--color-success)';
    case 2: return 'var(--color-warning)';
    case 3: return 'var(--color-text-muted)';
  }
}

function formatEuro(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mb-6">
        <TestTube2 size={40} className="text-(--color-accent)" />
      </div>
      <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
        Labor-Planer
      </h2>
      <p className="text-(--color-text-secondary) max-w-md mb-8 leading-relaxed">
        Erfasse zuerst deine Blutwerte, um personalisierte Empfehlungen fuer deinen
        naechsten Bluttest zu erhalten — inklusive Kosten und Labore.
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

function AllGoodState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[var(--color-success)]/10 flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-(--color-success)" />
      </div>
      <h2 className="text-2xl font-bold text-(--color-text-primary) mb-3">
        Alles aktuell!
      </h2>
      <p className="text-(--color-text-secondary) max-w-md leading-relaxed">
        Alle wichtigen Werte sind erfasst und kein Retest steht an.
        Schau in ein paar Monaten wieder vorbei.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Retest Section
// ---------------------------------------------------------------------------

function RetestSection({
  retestValues,
  selectedIds,
  onToggle,
}: {
  retestValues: RetestValue[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (retestValues.length === 0) return null;

  const overdue = retestValues.filter(rv => rv.daysOverdue > 0);
  const soonDue = retestValues.filter(rv => rv.daysOverdue <= 0);

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
        <Clock size={20} className="text-(--color-warning)" />
        Retest fällig
      </h3>

      {overdue.length > 0 && (
        <div className="rounded-xl border-2 border-[var(--color-warning)]/50 bg-[var(--color-warning)]/5 p-4 mb-4">
          <p className="text-sm font-semibold text-(--color-warning) mb-3">
            {overdue.length} {overdue.length === 1 ? 'Wert' : 'Werte'} überfällig
          </p>
          <div className="space-y-2">
            {overdue.map(rv => (
              <RetestRow key={rv.bloodValue.id} rv={rv} selected={selectedIds.has(rv.bloodValue.id)} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {soonDue.length > 0 && (
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
          <p className="text-sm font-medium text-(--color-text-secondary) mb-3">
            Bald fällig (nächste 30 Tage)
          </p>
          <div className="space-y-2">
            {soonDue.map(rv => (
              <RetestRow key={rv.bloodValue.id} rv={rv} selected={selectedIds.has(rv.bloodValue.id)} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RetestRow({ rv, selected, onToggle }: { rv: RetestValue; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <label className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-(--color-bg-input)/30 transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(rv.bloodValue.id)}
        className="rounded border-(--color-border) text-(--color-accent) focus:ring-(--color-accent) w-4 h-4 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-(--color-text-primary)">{rv.bloodValue.name}</span>
          <span className="text-[10px] text-(--color-text-muted)">({rv.bloodValue.categoryLabel})</span>
          {kassenBadge(rv.labCost)}
        </div>
        <div className="flex items-center gap-3 text-xs text-(--color-text-muted) mt-0.5">
          <span>Letzte Messung: {formatDate(rv.lastMeasuredDate)}</span>
          <span>Intervall: {rv.retestIntervall}</span>
          {rv.daysOverdue > 0 && (
            <span className="text-(--color-warning) font-medium">{rv.daysOverdue} Tage überfällig</span>
          )}
        </div>
      </div>
      {rv.labCost && rv.labCost.cost_1_15x > 0 && (
        <span className="text-xs font-mono text-(--color-text-muted) shrink-0">{formatEuro(rv.labCost.cost_1_15x)}</span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Package Recommendations
// ---------------------------------------------------------------------------

function PackageSection({
  recommendations,
  onSelectPackage,
}: {
  recommendations: PackageRecommendation[];
  onSelectPackage: (paramIds: string[]) => void;
}) {
  if (recommendations.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
        <Package size={20} className="text-(--color-accent)" />
        Empfohlene Pakete
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {recommendations.slice(0, 6).map((rec, idx) => (
          <PackageCard key={rec.package.id} rec={rec} isBest={idx === 0} onSelect={onSelectPackage} />
        ))}
      </div>
    </div>
  );
}

function PackageCard({
  rec,
  isBest,
  onSelect,
}: {
  rec: PackageRecommendation;
  isBest: boolean;
  onSelect: (paramIds: string[]) => void;
}) {
  const coveragePct = Math.round((rec.totalCoveredCount / rec.package.parameters.length) * 100);

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isBest
        ? 'border-(--color-accent)/60 bg-(--color-accent)/5'
        : 'border-(--color-border) bg-(--color-bg-card)'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-(--color-text-primary)">{rec.package.name}</h4>
          <p className="text-xs text-(--color-text-muted) mt-0.5">{rec.package.frequency}</p>
        </div>
        {isBest && (
          <span className="rounded-full bg-(--color-accent)/20 border border-(--color-accent)/40 px-2 py-0.5 text-[10px] font-medium text-(--color-accent) shrink-0">
            Empfohlen
          </span>
        )}
      </div>

      <p className="text-xs text-(--color-text-muted) mb-3">{rec.package.description}</p>

      {/* Coverage bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-(--color-text-muted)">
            {rec.totalCoveredCount} von {rec.package.parameters.length} Werten benötigt
          </span>
          <span className="font-mono text-(--color-text-secondary)">{coveragePct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-(--color-bg-input) overflow-hidden">
          <div
            className="h-full rounded-full bg-(--color-accent) transition-all"
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
        {rec.missingCoveredCount > 0 && (
          <span className="rounded-full bg-(--color-bg-input) px-2 py-0.5 text-(--color-text-muted)">
            {rec.missingCoveredCount} fehlend
          </span>
        )}
        {rec.retestCoveredCount > 0 && (
          <span className="rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-(--color-warning)">
            {rec.retestCoveredCount} Retest
          </span>
        )}
        {rec.kassenleistungCount > 0 && (
          <span className="rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-(--color-success)">
            {rec.kassenleistungCount} Kasse
          </span>
        )}
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-(--color-border)/50">
        <div>
          <span className="text-lg font-bold text-(--color-text-primary)">{formatEuro(rec.package.gesamtkosten)}</span>
          <span className="text-[10px] text-(--color-text-muted) ml-1">Paket komplett</span>
        </div>
        <button
          onClick={() => onSelect(rec.package.parameters)}
          className="text-xs font-medium text-(--color-accent) hover:text-(--color-accent-hover) transition-colors"
        >
          Auswählen →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Missing Values Section
// ---------------------------------------------------------------------------

function MissingSection({
  missingValues,
  selectedIds,
  onToggle,
}: {
  missingValues: MissingValue[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [expandedPrio, setExpandedPrio] = useState<Set<number>>(new Set([1]));

  if (missingValues.length === 0) return null;

  const grouped = new Map<1 | 2 | 3, MissingValue[]>();
  for (const mv of missingValues) {
    const list = grouped.get(mv.priority) ?? [];
    list.push(mv);
    grouped.set(mv.priority, list);
  }

  const togglePrio = (prio: number) => {
    setExpandedPrio(prev => {
      const next = new Set(prev);
      if (next.has(prio)) next.delete(prio);
      else next.add(prio);
      return next;
    });
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
        <AlertTriangle size={20} className="text-(--color-text-muted)" />
        Noch nie gemessen ({missingValues.length})
      </h3>

      <div className="space-y-3">
        {([1, 2, 3] as const).map(prio => {
          const values = grouped.get(prio);
          if (!values || values.length === 0) return null;
          const isOpen = expandedPrio.has(prio);

          return (
            <div key={prio} className="rounded-xl border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
              <button
                onClick={() => togglePrio(prio)}
                className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-(--color-bg-input)/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: priorityColor(prio) }}
                  />
                  <div className="text-left">
                    <span className="text-sm font-semibold text-(--color-text-primary)">
                      Priorität {prio}: {priorityLabel(prio)}
                    </span>
                    <span className="text-xs text-(--color-text-muted) ml-2">
                      ({values.length} Werte)
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-(--color-text-muted) transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-(--color-border)/50 px-5 py-3 space-y-1">
                  {values.map(mv => (
                    <label
                      key={mv.bloodValue.id}
                      className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-(--color-bg-input)/30 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(mv.bloodValue.id)}
                        onChange={() => onToggle(mv.bloodValue.id)}
                        className="rounded border-(--color-border) text-(--color-accent) focus:ring-(--color-accent) w-4 h-4 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-(--color-text-primary)">{mv.bloodValue.name}</span>
                          <span className="text-[10px] text-(--color-text-muted)">({mv.bloodValue.categoryLabel})</span>
                          {kassenBadge(mv.labCost)}
                        </div>
                      </div>
                      {mv.labCost && mv.labCost.cost_1_15x > 0 && (
                        <span className="text-xs font-mono text-(--color-text-muted) shrink-0">{formatEuro(mv.labCost.cost_1_15x)}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cost Calculator
// ---------------------------------------------------------------------------

function CostCalculatorPanel({
  costBreakdown,
  pricingTier,
  onPricingChange,
  onClearSelection,
}: {
  costBreakdown: CostBreakdown;
  pricingTier: '1_0x' | '1_15x';
  onPricingChange: (tier: '1_0x' | '1_15x') => void;
  onClearSelection: () => void;
}) {
  if (costBreakdown.selectedCount === 0) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BadgeEuro size={20} className="text-(--color-accent)" />
          <h3 className="text-lg font-semibold text-(--color-text-primary)">Kostenrechner</h3>
        </div>
        <p className="text-sm text-(--color-text-muted)">
          Wähle oben Werte oder ein Paket aus, um die geschätzten Kosten zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-(--color-accent)/40 bg-(--color-accent)/5 p-5 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BadgeEuro size={20} className="text-(--color-accent)" />
            <h3 className="text-lg font-semibold text-(--color-text-primary)">Kostenrechner</h3>
          </div>
          <p className="text-xs text-(--color-text-muted)">
            {costBreakdown.selectedCount} {costBreakdown.selectedCount === 1 ? 'Wert' : 'Werte'} ausgewählt
          </p>
        </div>
        <button
          onClick={onClearSelection}
          className="text-xs text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
        >
          Auswahl zurücksetzen
        </button>
      </div>

      {/* Pricing tier toggle */}
      <div className="flex rounded-lg border border-(--color-border) overflow-hidden mb-4 w-fit">
        <button
          onClick={() => onPricingChange('1_0x')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            pricingTier === '1_0x'
              ? 'bg-(--color-accent) text-white'
              : 'bg-(--color-bg-card) text-(--color-text-secondary) hover:bg-(--color-bg-input)'
          }`}
        >
          GOÄ 1.0x (Direktlabor)
        </button>
        <button
          onClick={() => onPricingChange('1_15x')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-(--color-border) ${
            pricingTier === '1_15x'
              ? 'bg-(--color-accent) text-white'
              : 'bg-(--color-bg-card) text-(--color-text-secondary) hover:bg-(--color-bg-input)'
          }`}
        >
          GOÄ 1.15x (Standard)
        </button>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-(--color-text-secondary)">Laborkosten</span>
          <span className="font-mono text-(--color-text-primary)">{formatEuro(costBreakdown.laborkosten)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-(--color-text-secondary)">Arztkosten (Beratung + Blutentnahme)</span>
          <span className="font-mono text-(--color-text-primary)">{formatEuro(costBreakdown.arztkosten)}</span>
        </div>
        <div className="border-t border-(--color-border)/50 pt-2 flex justify-between">
          <span className="text-sm font-semibold text-(--color-text-primary)">Geschätzte Gesamtkosten</span>
          <span className="text-xl font-bold text-(--color-accent)">{formatEuro(costBreakdown.gesamt)}</span>
        </div>
      </div>

      {/* Kasse vs IGeL */}
      <div className="flex gap-4 text-xs">
        {costBreakdown.kassenleistungCount > 0 && (
          <span className="flex items-center gap-1 text-(--color-success)">
            <ShieldCheck size={12} />
            {costBreakdown.kassenleistungCount} Kassenleistung
          </span>
        )}
        {costBreakdown.igelCount > 0 && (
          <span className="flex items-center gap-1 text-(--color-text-muted)">
            <CreditCard size={12} />
            {costBreakdown.igelCount} Selbstzahler
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Labs Section
// ---------------------------------------------------------------------------

function LabsSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full rounded-xl border border-(--color-border) bg-(--color-bg-card) px-5 py-4 flex items-center justify-between hover:bg-(--color-bg-input)/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-(--color-accent)" />
          <h3 className="text-base font-semibold text-(--color-text-primary)">Wo testen lassen?</h3>
          <span className="text-xs text-(--color-text-muted)">({labore.length} Labore + {homeTestAnbieter.length} Home-Tests)</span>
        </div>
        <ChevronDown size={16} className={`text-(--color-text-muted) transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Labore */}
          <div>
            <h4 className="text-sm font-semibold text-(--color-text-secondary) mb-3 flex items-center gap-1.5">
              <MapPin size={14} className="text-(--color-accent)" />
              Labore & Ambulanzen
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {labore.map((lab: LabInfo) => (
                <div key={lab.name} className="rounded-lg border border-(--color-border) bg-(--color-bg-card) px-4 py-3">
                  <h5 className="text-sm font-medium text-(--color-text-primary)">{lab.name}</h5>
                  <p className="text-xs text-(--color-accent) mt-0.5">{lab.preisbasis}</p>
                  <p className="text-xs text-(--color-text-muted) mt-1">{lab.besonderheiten}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Home Tests */}
          <div>
            <h4 className="text-sm font-semibold text-(--color-text-secondary) mb-3 flex items-center gap-1.5">
              <Home size={14} className="text-(--color-accent)" />
              Home-Test-Anbieter
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {homeTestAnbieter.map((provider: HomeTestProvider) => (
                <div key={provider.name} className="rounded-lg border border-(--color-border) bg-(--color-bg-card) px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-sm font-medium text-(--color-text-primary)">{provider.name}</h5>
                    <span className="text-xs font-mono text-(--color-text-muted)">{provider.preisbereich}</span>
                  </div>
                  <p className="text-xs text-(--color-success) mt-1">+ {provider.vorteile}</p>
                  <p className="text-xs text-(--color-danger) mt-0.5">- {provider.nachteile}</p>
                  <p className="text-xs text-(--color-text-muted) mt-1">Geeignet für: {provider.geeignetFuer}</p>
                </div>
              ))}
            </div>

            {/* Home Test Hinweis */}
            <div className="mt-3 rounded-lg bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 px-4 py-3">
              <p className="text-[11px] text-(--color-text-muted) leading-relaxed">{homeTestHinweis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spartipps Section
// ---------------------------------------------------------------------------

function SparTippsSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-8">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full rounded-xl border border-(--color-border) bg-(--color-bg-card) px-5 py-4 flex items-center justify-between hover:bg-(--color-bg-input)/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-(--color-warning)" />
          <h3 className="text-base font-semibold text-(--color-text-primary)">Spartipps</h3>
          <span className="text-xs text-(--color-text-muted)">({labSparTipps.length} Tipps)</span>
        </div>
        <ChevronDown size={16} className={`text-(--color-text-muted) transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 rounded-xl border border-(--color-border) bg-(--color-bg-card) p-5">
          <div className="space-y-3">
            {labSparTipps.map((tip, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-xs font-bold text-(--color-warning) shrink-0 mt-0.5 w-5 text-right">
                  {idx + 1}.
                </span>
                <p className="text-xs text-(--color-text-muted) leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LabPlanner() {
  const { activeProfile } = useProfile();
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pricingTier, setPricingTier] = useState<'1_0x' | '1_15x'>('1_15x');

  // Load all entries for active profile
  useEffect(() => {
    if (!activeProfile) return;
    const loaded = loadEntriesForProfile(activeProfile.id).sort((a, b) => b.date.localeCompare(a.date));
    setEntries(loaded);
    setSelectedIds(new Set());
  }, [activeProfile]);

  // Compute analysis
  const missingValues = useMemo(() => getMissingValues(entries), [entries]);
  const retestValues = useMemo(() => getRetestValues(entries), [entries]);
  const packageRecs = useMemo(
    () => getPackageRecommendations(missingValues, retestValues),
    [missingValues, retestValues],
  );
  const costBreakdown = useMemo(
    () => calculateSelectedCost([...selectedIds], pricingTier),
    [selectedIds, pricingTier],
  );

  // Total measured across all entries
  const measuredCount = useMemo(() => {
    const measured = new Set<string>();
    for (const entry of entries) {
      for (const id of Object.keys(entry.values)) measured.add(id);
    }
    return measured.size;
  }, [entries]);

  const latestEntryDate = entries.length > 0 ? entries[0].date : null;

  // Handlers
  const toggleValue = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectPackage = useCallback((paramIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      // Add all package params that are actually needed (missing or retest)
      for (const id of paramIds) next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Empty state
  if (entries.length === 0) return <EmptyState />;

  // All good state
  if (missingValues.length === 0 && retestValues.length === 0) return <AllGoodState />;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-1 flex items-center gap-2">
          <TestTube2 size={24} className="text-(--color-accent)" />
          Labor-Planer
        </h2>
        <p className="text-sm text-(--color-text-secondary)">
          Empfehlungen für deinen nächsten Bluttest
          {latestEntryDate && (
            <> — letzte Analyse vom <span className="font-medium">{formatDate(latestEntryDate)}</span></>
          )}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold text-(--color-text-primary)">{measuredCount}</p>
          <p className="text-xs text-(--color-text-muted)">Werte erfasst</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold text-(--color-text-primary)">{missingValues.length}</p>
          <p className="text-xs text-(--color-text-muted)">Noch nie gemessen</p>
        </div>
        {retestValues.length > 0 && (
          <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4 text-center">
            <p className="text-2xl font-bold text-(--color-warning)">{retestValues.filter(r => r.daysOverdue > 0).length}</p>
            <p className="text-xs text-(--color-text-muted)">Retest überfällig</p>
          </div>
        )}
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4 text-center">
          <p className="text-2xl font-bold text-(--color-text-primary)">{bloodValues.length}</p>
          <p className="text-xs text-(--color-text-muted)">Werte gesamt</p>
        </div>
      </div>

      {/* Retest section */}
      <RetestSection retestValues={retestValues} selectedIds={selectedIds} onToggle={toggleValue} />

      {/* Package recommendations */}
      <PackageSection recommendations={packageRecs} onSelectPackage={selectPackage} />

      {/* Cost calculator */}
      <CostCalculatorPanel
        costBreakdown={costBreakdown}
        pricingTier={pricingTier}
        onPricingChange={setPricingTier}
        onClearSelection={clearSelection}
      />

      {/* Missing values */}
      <MissingSection missingValues={missingValues} selectedIds={selectedIds} onToggle={toggleValue} />

      {/* Labs */}
      <LabsSection />

      {/* Spartipps */}
      <SparTippsSection />

      {/* Disclaimer */}
      <div className="rounded-xl border border-(--color-border)/50 bg-(--color-bg-card)/40 p-4 text-center">
        <p className="text-[11px] text-(--color-text-muted) leading-relaxed">
          Kostenangaben basierend auf GOÄ 2024/2025 (Regelhöchstsatz). Tatsächliche Kosten können je nach Arzt und Labor variieren.
          Quelle: "Der Blutwerte-Code" (Thiemo Osterhaus) + eigene GOÄ-Recherche.
        </p>
      </div>
    </div>
  );
}
