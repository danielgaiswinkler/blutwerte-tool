import type { BloodValue } from '../data';
import { bloodValues } from '../data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RangeStatus = 'optimal' | 'reference' | 'critical' | 'empty';

export interface BloodworkEntryData {
  id: string;
  date: string;
  gender: 'male' | 'female';
  values: Record<string, number>;
  notes?: string;
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'blutwerte-entries';

/** Load all saved entries from localStorage. Returns [] on error. */
export function loadEntries(): BloodworkEntryData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist entries array to localStorage. */
export function saveEntries(entries: BloodworkEntryData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ---------------------------------------------------------------------------
// Status calculation
// ---------------------------------------------------------------------------

/**
 * Determine where a measured value falls relative to the optimal and
 * reference ranges for the given blood value definition and gender.
 *
 * - undefined / NaN  -> 'empty'
 * - within optimal   -> 'optimal'
 * - within reference  -> 'reference' (suboptimal)
 * - outside both     -> 'critical'
 */
export function getRangeStatus(
  value: number | undefined,
  bv: BloodValue,
  gender: 'male' | 'female',
): RangeStatus {
  if (value === undefined || isNaN(value)) return 'empty';

  const ref = bv.reference[gender];
  const opt = bv.optimal[gender];

  // Check optimal range first
  const inOptimal =
    (opt.min === undefined || value >= opt.min) &&
    (opt.max === undefined || value <= opt.max);
  if (inOptimal) return 'optimal';

  // Check reference range
  const inRef =
    (ref.min === undefined || value >= ref.min) &&
    (ref.max === undefined || value <= ref.max);
  if (inRef) return 'reference';

  return 'critical';
}

// ---------------------------------------------------------------------------
// Status -> visual mapping
// ---------------------------------------------------------------------------

/** Return the CSS custom-property color string for a given status. */
export function statusColor(status: RangeStatus): string {
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

/** Return Tailwind utility classes for background + border tinting. */
export function statusBgClass(status: RangeStatus): string {
  switch (status) {
    case 'optimal':
      return 'bg-success/10 border-success/40';
    case 'reference':
      return 'bg-warning/10 border-warning/40';
    case 'critical':
      return 'bg-danger/10 border-danger/40';
    default:
      return 'bg-bg-input border-border';
  }
}

// ---------------------------------------------------------------------------
// Range formatting
// ---------------------------------------------------------------------------

/** Human-readable text for a min/max/target range object. */
export function rangeText(range: {
  min?: number;
  max?: number;
  target?: number;
}): string {
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

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Today as ISO date string (YYYY-MM-DD). */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format an ISO date string to German locale (DD.MM.YYYY). */
export function formatDate(iso: string): string {
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

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/** Generate a unique entry ID based on timestamp + random suffix. */
export function generateId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Count how many of the known blood values fall into each status bucket
 * for a given set of measured values and gender.
 */
export function getStatusCounts(
  values: Record<string, number>,
  gender: 'male' | 'female',
): { optimal: number; reference: number; critical: number; empty: number } {
  const counts = { optimal: 0, reference: 0, critical: 0, empty: 0 };
  for (const bv of bloodValues) {
    const val = values[bv.id];
    const status = getRangeStatus(val, bv, gender);
    counts[status]++;
  }
  return counts;
}
