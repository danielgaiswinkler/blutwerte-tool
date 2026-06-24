// ---------------------------------------------------------------------------
// Vitaldaten (Blutdruck, perspektivisch HRV/EKG) — lokal pro Profil
//
// Speicherung wie im Rest des Tools: localStorage, NIE als Datei ins Repo
// (das Tool ist oeffentlich deployed). Bewertung nach ESH-2023 Heimmessung.
// ---------------------------------------------------------------------------

export interface BloodPressureReading {
  id: string;
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:MM
  sys: number;         // systolisch mmHg
  dia: number;         // diastolisch mmHg
  pulse?: number;      // bpm
  context?: string;
}

const BP_PREFIX = 'vitals-bloodpressure-';

/** Blutdruck-Messungen eines Profils laden (sortiert nach Datum/Zeit aufsteigend). */
export function loadBloodPressure(profileId: string): BloodPressureReading[] {
  try {
    const raw = localStorage.getItem(BP_PREFIX + profileId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) =>
      (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')),
    );
  } catch {
    return [];
  }
}

/** Blutdruck-Messungen eines Profils speichern. true bei Erfolg. */
export function saveBloodPressure(profileId: string, readings: BloodPressureReading[]): boolean {
  try {
    localStorage.setItem(BP_PREFIX + profileId, JSON.stringify(readings));
    return true;
  } catch (err) {
    console.error('[saveBloodPressure] localStorage write failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Bewertung (ESH 2023, Heim-/Selbstmessung)
// ---------------------------------------------------------------------------

export type BpStatus = 'optimal' | 'hochnormal' | 'hyperton' | 'hoch' | 'krise';

/** Kategorie nach dem schlechteren der beiden Werte (sys/dia). */
export function bpStatus(sys: number, dia: number): BpStatus {
  if (sys >= 180 || dia >= 110) return 'krise';
  if (sys >= 160 || dia >= 100) return 'hoch';
  if (sys >= 135 || dia >= 85) return 'hyperton';
  if (sys >= 130 || dia >= 80) return 'hochnormal';
  return 'optimal';
}

export function bpStatusLabel(s: BpStatus): string {
  switch (s) {
    case 'optimal': return 'Im Ziel (< 130/80)';
    case 'hochnormal': return 'Hochnormal — beobachten';
    case 'hyperton': return 'Heim-Hypertonie — aerztlich besprechen';
    case 'hoch': return 'Deutlich erhoeht — zeitnah aerztlich';
    case 'krise': return 'Krise — sofort aerztlich/Notdienst';
  }
}

/** Hex-Farbe fuer Recharts (3-Ampel-Schema des Tools). */
export function bpStatusHex(s: BpStatus): string {
  switch (s) {
    case 'optimal': return '#22c55e';      // gruen
    case 'hochnormal': return '#eab308';   // gelb
    default: return '#ef4444';             // rot (hyperton/hoch/krise)
  }
}

/** Tailwind-Klassen fuer Hintergrund/Rahmen-Toenung (wie statusBgClass im Tool). */
export function bpStatusBgClass(s: BpStatus): string {
  switch (s) {
    case 'optimal': return 'bg-success/10 border-success/40';
    case 'hochnormal': return 'bg-warning/10 border-warning/40';
    default: return 'bg-danger/10 border-danger/40';
  }
}

// ---------------------------------------------------------------------------
// Mittelwerte
// ---------------------------------------------------------------------------

/** Mittelwert der letzten `days` Tage. null, wenn keine Messung im Zeitfenster. */
export function bpMean(
  readings: BloodPressureReading[],
  days: number,
): { sys: number; dia: number; pulse: number | null; n: number } | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const rel = readings.filter((r) => r.date >= cutoffStr);
  if (rel.length === 0) return null;
  const sys = Math.round(rel.reduce((s, r) => s + r.sys, 0) / rel.length);
  const dia = Math.round(rel.reduce((s, r) => s + r.dia, 0) / rel.length);
  const pulses = rel.filter((r) => typeof r.pulse === 'number').map((r) => r.pulse as number);
  const pulse = pulses.length ? Math.round(pulses.reduce((s, p) => s + p, 0) / pulses.length) : null;
  return { sys, dia, pulse, n: rel.length };
}
