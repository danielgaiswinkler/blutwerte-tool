import { useState, useEffect, useMemo } from 'react';
import { HeartPulse, Plus, Trash2, Activity, Lock, Upload } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useProfile } from '../../context/ProfileContext';
import { todayISO, formatDate, generateId } from '../../utils/bloodwork-utils';
import {
  loadBloodPressure,
  saveBloodPressure,
  bpStatus,
  bpStatusLabel,
  bpStatusHex,
  bpStatusBgClass,
  bpMean,
} from '../../utils/vitals-utils';
import type { BloodPressureReading } from '../../utils/vitals-utils';

export default function Vitaldaten() {
  const { activeProfile } = useProfile();
  const profileId = activeProfile?.id;

  const [readings, setReadings] = useState<BloodPressureReading[]>([]);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    if (profileId) setReadings(loadBloodPressure(profileId));
  }, [profileId]);

  const addReading = () => {
    if (!profileId) return;
    const sysN = parseInt(sys, 10);
    const diaN = parseInt(dia, 10);
    if (!sysN || !diaN || sysN < 60 || sysN > 260 || diaN < 30 || diaN > 160) {
      setError('Bitte plausible Werte eingeben (z. B. 124 / 79).');
      return;
    }
    const entry: BloodPressureReading = {
      id: generateId(),
      date: date || todayISO(),
      sys: sysN,
      dia: diaN,
    };
    if (time) entry.time = time;
    const pulseN = parseInt(pulse, 10);
    if (pulseN) entry.pulse = pulseN;
    if (context.trim()) entry.context = context.trim();

    const next = [...readings, entry].sort((a, b) =>
      (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')),
    );
    setReadings(next);
    saveBloodPressure(profileId, next);
    setSys(''); setDia(''); setPulse(''); setContext(''); setTime('');
    setError('');
  };

  const deleteReading = (id: string) => {
    if (!profileId) return;
    const next = readings.filter((r) => r.id !== id);
    setReadings(next);
    saveBloodPressure(profileId, next);
  };

  const importReadings = () => {
    if (!profileId) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportMsg('Konnte das nicht lesen — bitte gültiges JSON einfügen.');
      return;
    }
    if (!Array.isArray(parsed)) {
      setImportMsg('Erwarte eine Liste [ … ] von Messungen.');
      return;
    }
    const seen = new Set(readings.map((r) => `${r.date}|${r.time ?? ''}|${r.sys}|${r.dia}`));
    const added: BloodPressureReading[] = [];
    for (const item of parsed as Record<string, unknown>[]) {
      const sysN = Number(item.sys);
      const diaN = Number(item.dia);
      const dateStr = String(item.date ?? '');
      if (!sysN || !diaN || !dateStr) continue;
      const key = `${dateStr}|${item.time ?? ''}|${sysN}|${diaN}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const entry: BloodPressureReading = { id: generateId(), date: dateStr, sys: sysN, dia: diaN };
      if (item.time) entry.time = String(item.time);
      if (item.pulse) entry.pulse = Number(item.pulse);
      if (item.context) entry.context = String(item.context);
      added.push(entry);
    }
    if (added.length === 0) {
      setImportMsg('Keine neuen Messungen gefunden (evtl. schon vorhanden).');
      return;
    }
    const next = [...readings, ...added].sort((a, b) =>
      (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')),
    );
    setReadings(next);
    saveBloodPressure(profileId, next);
    setImportText('');
    setShowImport(false);
    setImportMsg('');
  };

  const latest = readings.length ? readings[readings.length - 1] : null;
  const mean7 = useMemo(() => bpMean(readings, 7), [readings]);
  const mean30 = useMemo(() => bpMean(readings, 30), [readings]);

  const chartData = useMemo(
    () =>
      readings.map((r) => ({
        label: formatDate(r.date).slice(0, 6) + (r.time ? `\n${r.time}` : ''),
        sys: r.sys,
        dia: r.dia,
      })),
    [readings],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--color-text-primary) flex items-center gap-2">
          <HeartPulse className="w-7 h-7 text-(--color-accent)" />
          Vitaldaten
        </h1>
        <p className="text-sm text-(--color-text-secondary) mt-1">
          Blutdruck ist der wichtigste beeinflussbare Schlaganfall-Faktor. Ziel (Heimmessung,
          ESH 2023): <strong className="text-(--color-text-primary)">&lt; 130/80</strong>. Maßgeblich ist
          der 7-Tage-Mittelwert, nicht der einzelne Ausreißer.
        </p>
      </div>

      {/* Kacheln */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile title="Letzte Messung" reading={latest} />
        <MeanTile title="7-Tage-Mittel" mean={mean7} />
        <MeanTile title="30-Tage-Mittel" mean={mean30} />
      </div>

      {/* Eingabe */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <h2 className="text-sm font-semibold text-(--color-text-primary) mb-3 flex items-center gap-2">
          <Plus size={16} /> Messung eintragen
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <Field label="Datum">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Uhrzeit">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Systolisch">
            <input type="number" inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="124" className={inputCls} />
          </Field>
          <Field label="Diastolisch">
            <input type="number" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="79" className={inputCls} />
          </Field>
          <Field label="Puls">
            <input type="number" inputMode="numeric" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="58" className={inputCls} />
          </Field>
          <Field label="Kontext">
            <input type="text" value={context} onChange={(e) => setContext(e.target.value)} placeholder="morgens" className={inputCls} />
          </Field>
        </div>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={addReading}
            className="rounded-md bg-(--color-accent) hover:bg-(--color-accent-hover) px-4 py-1.5 text-sm font-medium text-white transition-colors"
          >
            Hinzufügen
          </button>
          <button
            onClick={() => { setShowImport((v) => !v); setImportMsg(''); }}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors flex items-center gap-1.5"
          >
            <Upload size={14} /> Mehrere importieren
          </button>
        </div>

        {showImport && (
          <div className="mt-3 rounded-lg border border-(--color-border) bg-(--color-bg-input) p-3">
            <p className="text-xs text-(--color-text-muted) mb-2">
              Liste von Messungen als JSON einfügen (bekommst du von Claude, z. B. nach einem Foto
              deines Geräts). Schon vorhandene werden übersprungen.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={5}
              placeholder={'[{"date":"2026-06-24","time":"07:30","sys":124,"dia":79,"pulse":58,"context":"morgens"}]'}
              className="w-full rounded-md border border-(--color-border) bg-(--color-bg-card) px-2.5 py-1.5 text-xs font-mono text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
            />
            {importMsg && <p className="text-xs text-warning mt-1">{importMsg}</p>}
            <button
              onClick={importReadings}
              className="mt-2 rounded-md bg-(--color-accent) hover:bg-(--color-accent-hover) px-4 py-1.5 text-sm font-medium text-white transition-colors"
            >
              Importieren
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
          <h2 className="text-sm font-semibold text-(--color-text-primary) mb-3">Verlauf</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis domain={[40, 180]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <ReferenceLine y={135} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Hyperton (sys)', fontSize: 10, fill: '#ef4444', position: 'insideTopRight' }} />
              <ReferenceLine y={85} stroke="#eab308" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="sys" name="Systolisch" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="dia" name="Diastolisch" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabelle */}
      {readings.length > 0 ? (
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
          <h2 className="text-sm font-semibold text-(--color-text-primary) mb-3">Messungen</h2>
          <div className="space-y-1">
            {[...readings].reverse().map((r) => {
              const st = bpStatus(r.sys, r.dia);
              return (
                <div key={r.id} className={`group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${bpStatusBgClass(st)}`}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: bpStatusHex(st) }} />
                  <span className="text-(--color-text-secondary) w-28 shrink-0">
                    {formatDate(r.date)}{r.time ? ` ${r.time}` : ''}
                  </span>
                  <span className="font-semibold text-(--color-text-primary) w-20">{r.sys}/{r.dia}</span>
                  <span className="text-(--color-text-muted) w-16">{r.pulse ? `${r.pulse} bpm` : ''}</span>
                  <span className="text-(--color-text-muted) flex-1 truncate">{r.context ?? ''}</span>
                  <button
                    onClick={() => deleteReading(r.id)}
                    className="p-1 rounded text-(--color-text-muted) hover:text-danger opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-bg-card) p-6 text-center">
          <p className="text-sm text-(--color-text-secondary)">
            Noch keine Messungen. Trag oben deine ersten Gerätewerte ein (morgens und abends, ein
            paar Tage). Bewertet wird dann der 7-Tage-Mittelwert.
          </p>
        </div>
      )}

      {/* Platzhalter: kommende Vitaldaten */}
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card)/50 p-4 opacity-70">
        <h2 className="text-sm font-semibold text-(--color-text-muted) mb-2 flex items-center gap-2">
          <Lock size={14} /> In Vorbereitung
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-(--color-text-muted)">
          <div className="flex items-center gap-2"><Activity size={14} /> HRV-Trend (Apple Watch / Polar) aus dem Health Hub</div>
          <div className="flex items-center gap-2"><HeartPulse size={14} /> EKG-/AFib-Status (Apple-Watch-EKGs)</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-md border border-(--color-border) bg-(--color-bg-input) px-2.5 py-1.5 text-sm text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-(--color-accent)';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-(--color-text-muted)">{label}</span>
      {children}
    </label>
  );
}

function StatTile({ title, reading }: { title: string; reading: BloodPressureReading | null }) {
  if (!reading) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted)">{title}</p>
        <p className="text-2xl font-bold text-(--color-text-muted) mt-1">—</p>
      </div>
    );
  }
  const st = bpStatus(reading.sys, reading.dia);
  return (
    <div className={`rounded-xl border p-4 ${bpStatusBgClass(st)}`}>
      <p className="text-xs text-(--color-text-muted)">{title}</p>
      <p className="text-2xl font-bold text-(--color-text-primary) mt-1">{reading.sys}/{reading.dia}</p>
      <p className="text-xs mt-1" style={{ color: bpStatusHex(st) }}>{bpStatusLabel(st)}</p>
    </div>
  );
}

function MeanTile({ title, mean }: { title: string; mean: ReturnType<typeof bpMean> }) {
  if (!mean) {
    return (
      <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-4">
        <p className="text-xs text-(--color-text-muted)">{title}</p>
        <p className="text-2xl font-bold text-(--color-text-muted) mt-1">—</p>
      </div>
    );
  }
  const st = bpStatus(mean.sys, mean.dia);
  return (
    <div className={`rounded-xl border p-4 ${bpStatusBgClass(st)}`}>
      <p className="text-xs text-(--color-text-muted)">{title} · {mean.n} Messungen</p>
      <p className="text-2xl font-bold text-(--color-text-primary) mt-1">{mean.sys}/{mean.dia}</p>
      <p className="text-xs mt-1" style={{ color: bpStatusHex(st) }}>{bpStatusLabel(st)}</p>
    </div>
  );
}
