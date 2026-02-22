import bloodworkData from './bloodwork-knowledge.json';

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
