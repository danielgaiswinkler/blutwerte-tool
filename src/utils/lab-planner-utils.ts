import {
  bloodValues,
  labCostValues,
  labPackages,
  labFixedCosts,
} from '../data';
import type {
  BloodValue,
  LabCostValue,
  LabPackage,
} from '../data';
import type { BloodworkEntryData } from './bloodwork-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MissingValue {
  bloodValue: BloodValue;
  labCost: LabCostValue | undefined;
  priority: 1 | 2 | 3; // 1=Basis, 2=Erweitert, 3=Komplett/Spezial
}

export interface RetestValue {
  bloodValue: BloodValue;
  labCost: LabCostValue | undefined;
  lastMeasuredDate: string;
  retestIntervall: string;
  daysOverdue: number; // positive = overdue, negative = not yet due
}

export interface PackageRecommendation {
  package: LabPackage;
  missingCoveredCount: number;
  missingCoveredIds: string[];
  retestCoveredCount: number;
  retestCoveredIds: string[];
  totalCoveredCount: number;
  kassenleistungCount: number;
  estimatedSelfPayCost: number;
}

export interface CostBreakdown {
  laborkosten: number;
  arztkosten: number;
  gesamt: number;
  kassenleistungCount: number;
  igelCount: number;
  selectedCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse retestIntervall strings into approximate days. */
export function parseRetestIntervall(intervall: string): number {
  if (!intervall) return 365;
  const lower = intervall.toLowerCase();
  if (lower.includes('einmalig')) return Infinity;
  if (lower.includes('3-6 monate') || lower.includes('3–6 monate')) return 135;
  if (lower.includes('6-12 monate') || lower.includes('6–12 monate')) return 270;
  if (lower.includes('halbjähr') || lower.includes('6 monate')) return 180;
  if (lower.includes('vierteljähr') || lower.includes('3 monate')) return 90;
  if (lower.includes('jährlich') || lower.includes('jaehrlich') || lower.includes('1x jähr')) return 365;
  return 365;
}

/** Build a map of bloodValueId -> latest measurement date across ALL entries. */
function buildLatestMeasurementMap(entries: BloodworkEntryData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    for (const valueId of Object.keys(entry.values)) {
      const existing = map.get(valueId);
      if (!existing || entry.date > existing) {
        map.set(valueId, entry.date);
      }
    }
  }
  return map;
}

/** Determine priority from package membership. */
function getPriority(valueId: string): 1 | 2 | 3 {
  const basisPkg = labPackages.find(p => p.id === 'basis');
  const erweitertPkg = labPackages.find(p => p.id === 'erweitert');
  if (basisPkg?.parameters.includes(valueId)) return 1;
  if (erweitertPkg?.parameters.includes(valueId)) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/** Get all blood values that have NEVER been measured in any entry. */
export function getMissingValues(entries: BloodworkEntryData[]): MissingValue[] {
  const measured = buildLatestMeasurementMap(entries);

  return bloodValues
    .filter(bv => !measured.has(bv.id))
    .map(bv => ({
      bloodValue: bv,
      labCost: labCostValues.find(lc => lc.bloodValueId === bv.id),
      priority: getPriority(bv.id),
    }))
    .sort((a, b) => a.priority - b.priority || a.bloodValue.category.localeCompare(b.bloodValue.category));
}

/** Get values that are due or overdue for retesting. */
export function getRetestValues(entries: BloodworkEntryData[]): RetestValue[] {
  if (entries.length === 0) return [];

  const measured = buildLatestMeasurementMap(entries);
  const today = new Date();
  const results: RetestValue[] = [];

  for (const [valueId, lastDate] of measured.entries()) {
    const bv = bloodValues.find(v => v.id === valueId);
    if (!bv) continue;

    const labCost = labCostValues.find(lc => lc.bloodValueId === valueId);
    if (!labCost) continue;

    // Skip einmalig values that are already measured
    if (labCost.einmalig) continue;

    const intervallDays = parseRetestIntervall(labCost.retestIntervall);
    if (intervallDays === Infinity) continue;

    const lastMeasured = new Date(lastDate);
    const daysSince = Math.floor((today.getTime() - lastMeasured.getTime()) / (1000 * 60 * 60 * 24));
    const daysOverdue = daysSince - intervallDays;

    // Show if overdue or due within 30 days
    if (daysOverdue > -30) {
      results.push({
        bloodValue: bv,
        labCost,
        lastMeasuredDate: lastDate,
        retestIntervall: labCost.retestIntervall,
        daysOverdue,
      });
    }
  }

  return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/** Recommend packages based on missing and retest values. */
export function getPackageRecommendations(
  missingValues: MissingValue[],
  retestValues: RetestValue[],
): PackageRecommendation[] {
  const missingIds = new Set(missingValues.map(mv => mv.bloodValue.id));
  const retestIds = new Set(retestValues.map(rv => rv.bloodValue.id));
  const neededIds = new Set([...missingIds, ...retestIds]);

  if (neededIds.size === 0) return [];

  return labPackages
    .map(pkg => {
      const missingCoveredIds = pkg.parameters.filter(id => missingIds.has(id));
      const retestCoveredIds = pkg.parameters.filter(id => retestIds.has(id));
      const totalCoveredIds = pkg.parameters.filter(id => neededIds.has(id));

      // Count kassenleistung values
      const kassenleistungCount = totalCoveredIds.filter(id => {
        const lc = labCostValues.find(v => v.bloodValueId === id);
        return lc?.kassenleistung === true;
      }).length;

      // Estimate self-pay cost: sum of IGeL values that are needed
      const igelCosts = totalCoveredIds.reduce((sum, id) => {
        const lc = labCostValues.find(v => v.bloodValueId === id);
        if (!lc || lc.kassenleistung === true) return sum;
        return sum + (lc.cost_1_15x || 0);
      }, 0);
      const estimatedSelfPayCost = igelCosts > 0 ? igelCosts + labFixedCosts.blutentnahme.cost_2_3x + labFixedCosts.beratung.cost_2_3x : 0;

      return {
        package: pkg,
        missingCoveredCount: missingCoveredIds.length,
        missingCoveredIds,
        retestCoveredCount: retestCoveredIds.length,
        retestCoveredIds,
        totalCoveredCount: totalCoveredIds.length,
        kassenleistungCount,
        estimatedSelfPayCost,
      };
    })
    .filter(r => r.totalCoveredCount > 0)
    .sort((a, b) => {
      // Sort by coverage/cost ratio (higher is better)
      const ratioA = a.totalCoveredCount / Math.max(a.package.gesamtkosten, 1);
      const ratioB = b.totalCoveredCount / Math.max(b.package.gesamtkosten, 1);
      return ratioB - ratioA;
    });
}

/** Calculate costs for a set of selected blood value IDs. */
export function calculateSelectedCost(
  selectedIds: string[],
  pricingTier: '1_0x' | '1_15x' = '1_15x',
): CostBreakdown {
  if (selectedIds.length === 0) {
    return { laborkosten: 0, arztkosten: 0, gesamt: 0, kassenleistungCount: 0, igelCount: 0, selectedCount: 0 };
  }

  // Deduplicate by GOÄ-Ziffer (many blood values share the same test)
  const seenZiffern = new Set<string>();
  let laborkosten = 0;
  let kassenleistungCount = 0;
  let igelCount = 0;

  for (const id of selectedIds) {
    const lc = labCostValues.find(v => v.bloodValueId === id);
    if (!lc) continue;

    if (lc.kassenleistung === true) {
      kassenleistungCount++;
    } else {
      igelCount++;
    }

    // Only count cost once per GOÄ-Ziffer
    if (!seenZiffern.has(lc.goaeZiffer)) {
      seenZiffern.add(lc.goaeZiffer);
      const cost = pricingTier === '1_0x' ? lc.cost_1_0x : lc.cost_1_15x;
      laborkosten += cost;
    }
  }

  const arztkosten = labFixedCosts.blutentnahme.cost_2_3x + labFixedCosts.beratung.cost_2_3x;

  return {
    laborkosten: Math.round(laborkosten * 100) / 100,
    arztkosten,
    gesamt: Math.round((laborkosten + arztkosten) * 100) / 100,
    kassenleistungCount,
    igelCount,
    selectedCount: selectedIds.length,
  };
}
