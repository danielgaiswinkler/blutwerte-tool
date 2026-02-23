import { bloodValues, getValueById } from '../data';
import type { BloodValue } from '../data';
import { getRangeStatus } from './bloodwork-utils';
import type { RangeStatus } from './bloodwork-utils';
import supplementsData from '../data/supplements.json';
import foodsData from '../data/foods.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupplementData {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  bloodValueIds: string[];
  dosierungPraevention?: string;
  dosierungMangel?: string;
  timing: string;
  synergien: string[];
  antagonisten: string[];
  empfohleneMarken: string[];
  preisProMonat: string;
  evidenzgrad: string;
  wirkstoffformGut: string;
  wirkstoffformSchlecht: string;
  besondereHinweise: string;
  mussStufe: number;
  medikamentenWechselwirkungen: string[];
}

export interface FoodCategory {
  bloodValueIds: string[];
  category: string;
  topFoods: Array<{
    name: string;
    nutrient: string;
    per100g: string;
    portion: string;
    bioavailability: string;
    notes: string;
  }>;
  avoidFoods: Array<{
    name: string;
    reason: string;
    mechanism: string;
  }>;
  tips: string[];
}

export interface ValueRecommendation {
  bloodValue: BloodValue;
  measuredValue: number;
  status: RangeStatus;
  direction: 'tooLow' | 'tooHigh';
  actions: string[];
  lifestyle: string[];
  redFlags: string[];
  supplements: SupplementData[];
  foods: FoodCategory[];
  inlineSupplements: Array<{
    name: string;
    dosage: string;
    timing: string;
    notes: string;
  }>;
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

const supplements: SupplementData[] = (supplementsData as { supplements: SupplementData[] }).supplements;
const foods: FoodCategory[] = foodsData as FoodCategory[];

/** Find supplements that target a specific blood value ID. */
function getSupplementsForValue(bvId: string): SupplementData[] {
  return supplements.filter((s) => s.bloodValueIds.includes(bvId));
}

/** Find food categories that target a specific blood value ID. */
function getFoodsForValue(bvId: string): FoodCategory[] {
  return foods.filter((f) => f.bloodValueIds.includes(bvId));
}

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

/** Determine if value is too low or too high relative to optimal range. */
function getDirection(
  value: number,
  bv: BloodValue,
  gender: 'male' | 'female',
): 'tooLow' | 'tooHigh' | null {
  const opt = bv.optimal[gender];

  if (opt.target !== undefined) {
    return value < opt.target ? 'tooLow' : 'tooHigh';
  }
  if (opt.min !== undefined && value < opt.min) return 'tooLow';
  if (opt.max !== undefined && value > opt.max) return 'tooHigh';
  return null;
}

/**
 * Generate personalized recommendations for all suboptimal/critical values.
 * Returns recommendations sorted by severity (critical first, then suboptimal).
 */
export function getRecommendations(
  values: Record<string, number>,
  gender: 'male' | 'female',
): ValueRecommendation[] {
  const recommendations: ValueRecommendation[] = [];

  for (const bv of bloodValues) {
    const val = values[bv.id];
    const status = getRangeStatus(val, bv, gender);

    if (status !== 'reference' && status !== 'critical') continue;

    const direction = getDirection(val, bv, gender);
    if (!direction) continue;

    const interp = bv.interpretation[direction];
    const matchedSupplements = getSupplementsForValue(bv.id);
    const matchedFoods = getFoodsForValue(bv.id);

    recommendations.push({
      bloodValue: bv,
      measuredValue: val,
      status,
      direction,
      actions: interp.actions,
      lifestyle: bv.optimization.lifestyle,
      redFlags: bv.optimization.redFlags,
      supplements: matchedSupplements,
      foods: matchedFoods,
      inlineSupplements: bv.optimization.supplements,
    });
  }

  // Sort: critical first, then by supplement priority (mussStufe)
  recommendations.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'critical' ? -1 : 1;
    }
    // Within same severity: those with more supplement matches first
    const aMaxStufe = Math.min(...a.supplements.map((s) => s.mussStufe), 99);
    const bMaxStufe = Math.min(...b.supplements.map((s) => s.mussStufe), 99);
    return aMaxStufe - bMaxStufe;
  });

  return recommendations;
}

/**
 * Get a summary of all recommended supplements across all suboptimal values,
 * deduplicated and sorted by priority.
 */
export function getSupplementSummary(
  recommendations: ValueRecommendation[],
): Array<{
  supplement: SupplementData;
  targetValues: Array<{ bv: BloodValue; status: RangeStatus; direction: 'tooLow' | 'tooHigh' }>;
}> {
  const map = new Map<
    string,
    {
      supplement: SupplementData;
      targetValues: Array<{ bv: BloodValue; status: RangeStatus; direction: 'tooLow' | 'tooHigh' }>;
    }
  >();

  for (const rec of recommendations) {
    for (const supp of rec.supplements) {
      const existing = map.get(supp.id);
      const target = { bv: rec.bloodValue, status: rec.status, direction: rec.direction };
      if (existing) {
        existing.targetValues.push(target);
      } else {
        map.set(supp.id, { supplement: supp, targetValues: [target] });
      }
    }
  }

  return [...map.values()].sort((a, b) => a.supplement.mussStufe - b.supplement.mussStufe);
}
