import bloodworkData from './bloodwork-knowledge.json';
import medicationsData from './medications.json';
import labCostsData from './lab-costs.json';

export interface BloodValueRange {
  min?: number;
  max?: number;
  target?: number;
}

export interface BloodValueInterpretation {
  possibleCauses: string[];
  symptoms: string[];
  relatedValues: string[];
  actions: string[];
}

export interface ContextRule {
  condition: string;
  interpretation: string;
  severity: 'warning' | 'attention' | 'info';
}

export interface Supplement {
  name: string;
  dosage: string;
  timing: string;
  notes: string;
}

export interface BloodValue {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  unit: string;
  alternativeUnits?: { unit: string; factor: number }[];
  measurementType: string;
  reference: {
    male: BloodValueRange;
    female: BloodValueRange;
  };
  optimal: {
    male: BloodValueRange;
    female: BloodValueRange;
  };
  interpretation: {
    tooLow: BloodValueInterpretation;
    tooHigh: BloodValueInterpretation;
    optimal: { meaning: string };
  };
  contextRules: ContextRule[];
  optimization: {
    lifestyle: string[];
    supplements: Supplement[];
    redFlags: string[];
  };
  sources: string[];
}

export const bloodValues: BloodValue[] = bloodworkData as BloodValue[];

export const getValueById = (id: string): BloodValue | undefined =>
  bloodValues.find(v => v.id === id);

export const getValuesByCategory = (category: string): BloodValue[] =>
  bloodValues.filter(v => v.category === category);

export const categories = [...new Set(bloodValues.map(v => v.category))];

export const categoryLabels = Object.fromEntries(
  bloodValues.map(v => [v.category, v.categoryLabel])
);

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------

export interface MedicationEffect {
  bloodValueId: string;
  direction: 'increase' | 'decrease' | 'neutral';
  magnitude: 'stark' | 'moderat' | 'leicht' | 'selten' | 'keine';
  description: string;
}

export interface Medication {
  id: string;
  genericName: string;
  tradeNames: string[];
  category: string;
  description: string;
  commonDosages: string[];
  bloodValueEffects: MedicationEffect[];
}

export interface MedicationCategory {
  id: string;
  label: string;
  icon: string;
}

export interface MedicationInteraction {
  id: string;
  medications: string[];
  severity: 'high' | 'moderate' | 'low';
  description: string;
  affectedValues: string[];
  recommendation: string;
}

export const medicationCategories: MedicationCategory[] = medicationsData.categories as MedicationCategory[];
export const medications: Medication[] = medicationsData.medications as Medication[];
export const medicationInteractions: MedicationInteraction[] = medicationsData.interactions as MedicationInteraction[];

export const getMedicationById = (id: string): Medication | undefined =>
  medications.find(m => m.id === id);

export const getMedicationsByCategory = (category: string): Medication[] =>
  medications.filter(m => m.category === category);

/** Find all active interactions for a set of medication IDs. */
export const findInteractions = (activeMedIds: string[]): MedicationInteraction[] => {
  if (activeMedIds.length < 2) return [];
  return medicationInteractions.filter(interaction => {
    // At least 2 medications from the interaction must be in the active set
    const matchCount = interaction.medications.filter(m => activeMedIds.includes(m)).length;
    return matchCount >= 2;
  });
};

/** Get all blood value effects from active medications, aggregated by blood value ID. */
export const getAggregatedEffects = (activeMedIds: string[]): Record<string, { medication: Medication; effect: MedicationEffect }[]> => {
  const result: Record<string, { medication: Medication; effect: MedicationEffect }[]> = {};
  for (const medId of activeMedIds) {
    const med = getMedicationById(medId);
    if (!med) continue;
    for (const effect of med.bloodValueEffects) {
      if (effect.direction === 'neutral') continue;
      if (!result[effect.bloodValueId]) result[effect.bloodValueId] = [];
      result[effect.bloodValueId].push({ medication: med, effect });
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Lab Costs
// ---------------------------------------------------------------------------

export interface LabCostValue {
  bloodValueId: string;
  name: string;
  goaeZiffer: string;
  cost_1_0x: number;
  cost_1_15x: number;
  cost_1_3x: number;
  kassenleistung: boolean;
  kassenDetails: string;
  igel: boolean;
  paket: string;
  h1Hoechstwert: boolean;
  einmalig: boolean;
  retestIntervall: string;
  retestHinweis: string;
  note?: string;
}

export interface LabPackage {
  id: string;
  name: string;
  frequency: string;
  laborkosten_1_15x: number;
  arztkosten: number;
  gesamtkosten: number;
  description: string;
  parameters: string[];
}

export interface LabFixedCosts {
  blutentnahme: { goaeZiffer: string; cost_1_0x: number; cost_2_3x: number; cost_max: number; description: string };
  beratung: { goaeZiffer: string; cost_2_3x: number; description: string };
  probenversand: { goaeZiffer: string; cost_range: string; cost_typical: number; description: string };
}

export interface LabInfo {
  name: string;
  preisbasis: string;
  besonderheiten: string;
}

export interface HomeTestProvider {
  name: string;
  preisbereich: string;
  vorteile: string;
  nachteile: string;
  geeignetFuer: string;
}

export const labCostValues: LabCostValue[] = labCostsData.values as LabCostValue[];
export const labPackages: LabPackage[] = labCostsData.packages as LabPackage[];
export const labFixedCosts = labCostsData.fixedCosts as LabFixedCosts;
export const labSparTipps: string[] = labCostsData.sparTipps;
export const labore: LabInfo[] = labCostsData.labore as LabInfo[];
export const homeTestAnbieter: HomeTestProvider[] = labCostsData.homeTestAnbieter as HomeTestProvider[];
export const homeTestHinweis: string = labCostsData.homeTestHinweis;

export const getLabCostByValueId = (id: string): LabCostValue | undefined =>
  labCostValues.find(v => v.bloodValueId === id);
