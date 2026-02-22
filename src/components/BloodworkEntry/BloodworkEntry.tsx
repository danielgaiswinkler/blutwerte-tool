import { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import type { BloodValue } from '../../data';
import {
  bloodValues,
  categories,
  categoryLabels,
  getValuesByCategory,
} from '../../data';
import {
  Calendar,
  Upload,
  Save,
  Plus,
  Trash2,
  FileText,
  ChevronDown,
  FileUp,
} from 'lucide-react';
import { parsePdf } from '../../utils/pdf-parser';
import type { ParsedLabValue } from '../../utils/pdf-parser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BloodworkEntryData {
  id: string;
  date: string;
  gender: 'male' | 'female';
  values: Record<string, number>;
  notes?: string;
}

type RangeStatus = 'optimal' | 'reference' | 'critical' | 'empty';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'blutwerte-entries';

function loadEntries(): BloodworkEntryData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: BloodworkEntryData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function generateId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso: string): string {
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

function getRangeStatus(
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

function statusColor(status: RangeStatus): string {
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

function statusBgClass(status: RangeStatus): string {
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

function rangeText(range: { min?: number; max?: number; target?: number }): string {
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

/**
 * Try to match a CSV column header to a BloodValue.
 * Matches against id and name (case-insensitive, trimmed).
 */
function matchBloodValue(header: string): BloodValue | undefined {
  const h = header.trim().toLowerCase();
  // Exact id match
  const byId = bloodValues.find((bv) => bv.id.toLowerCase() === h);
  if (byId) return byId;
  // Exact name match
  const byName = bloodValues.find((bv) => bv.name.toLowerCase() === h);
  if (byName) return byName;
  // Partial match: header is contained in name or vice versa
  const partial = bloodValues.find(
    (bv) =>
      bv.name.toLowerCase().includes(h) || h.includes(bv.name.toLowerCase()),
  );
  return partial;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ValueInputProps {
  bv: BloodValue;
  value: number | undefined;
  gender: 'male' | 'female';
  onChange: (id: string, val: number | undefined) => void;
}

function ValueInput({ bv, value, gender, onChange }: ValueInputProps) {
  const status = getRangeStatus(value, bv, gender);
  const ref = bv.reference[gender];
  const opt = bv.optimal[gender];

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-200 ${statusBgClass(status)}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`input-${bv.id}`}
            className="block text-sm font-medium text-text-primary truncate"
          >
            {bv.name}
          </label>
          <span className="text-xs text-text-muted">{bv.unit}</span>
        </div>

        {/* Color indicator dot + input */}
        <div className="flex items-center gap-2 shrink-0">
          {status !== 'empty' && (
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: statusColor(status) }}
              title={
                status === 'optimal'
                  ? 'Optimal'
                  : status === 'reference'
                    ? 'Im Referenzbereich, nicht optimal'
                    : 'Außerhalb Referenzbereich'
              }
            />
          )}
          <input
            id={`input-${bv.id}`}
            type="number"
            step="any"
            value={value !== undefined ? value : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange(bv.id, undefined);
              } else {
                const num = parseFloat(raw);
                if (!isNaN(num)) onChange(bv.id, num);
              }
            }}
            placeholder="\u2014"
            className="w-28 rounded-md border border-border bg-bg-input px-3 py-1.5 text-sm text-text-primary
                       placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent
                       text-right tabular-nums [appearance:textfield]
                       [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Range info */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-text-muted leading-relaxed">
        <span>Referenz: {rangeText(ref)}</span>
        <span>Optimal: {rangeText(opt)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BloodworkEntry() {
  // ---- State ----
  const [entries, setEntries] = useState<BloodworkEntryData[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [showEntryList, setShowEntryList] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<ParsedLabValue[] | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ---- Load entries on mount ----
  useEffect(() => {
    const loaded = loadEntries();
    setEntries(loaded);
  }, []);

  // ---- Populate form when selecting an entry ----
  const selectEntry = useCallback(
    (id: string | null) => {
      setActiveEntryId(id);
      setCsvFeedback(null);
      if (id === null) {
        setDate(todayISO());
        setGender('male');
        setValues({});
        setNotes('');
        return;
      }
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      setDate(entry.date);
      setGender(entry.gender);
      setValues({ ...entry.values });
      setNotes(entry.notes ?? '');
    },
    [entries],
  );

  // ---- Value change handler ----
  const handleValueChange = useCallback(
    (id: string, val: number | undefined) => {
      setValues((prev) => {
        const next = { ...prev };
        if (val === undefined) {
          delete next[id];
        } else {
          next[id] = val;
        }
        return next;
      });
    },
    [],
  );

  // ---- Save handler ----
  const handleSave = useCallback(() => {
    const filledCount = Object.keys(values).length;
    if (filledCount === 0) return;

    const updatedEntries = [...entries];

    if (activeEntryId) {
      // Update existing entry
      const idx = updatedEntries.findIndex((e) => e.id === activeEntryId);
      if (idx !== -1) {
        updatedEntries[idx] = {
          ...updatedEntries[idx],
          date,
          gender,
          values: { ...values },
          notes: notes || undefined,
        };
      }
    } else {
      // Create new entry
      const newEntry: BloodworkEntryData = {
        id: generateId(),
        date,
        gender,
        values: { ...values },
        notes: notes || undefined,
      };
      updatedEntries.unshift(newEntry);
      setActiveEntryId(newEntry.id);
    }

    // Sort by date descending
    updatedEntries.sort((a, b) => b.date.localeCompare(a.date));

    setEntries(updatedEntries);
    saveEntries(updatedEntries);

    // Brief save confirmation flash
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, [entries, activeEntryId, date, gender, values, notes]);

  // ---- Delete handler ----
  const handleDelete = useCallback(
    (id: string) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      saveEntries(updated);
      if (activeEntryId === id) {
        setActiveEntryId(null);
        setDate(todayISO());
        setGender('male');
        setValues({});
        setNotes('');
      }
    },
    [entries, activeEntryId],
  );

  // ---- CSV Upload handler ----
  const handleCsvUpload = useCallback(
    (file: File) => {
      setCsvFeedback(null);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete(results) {
          if (!results.data || results.data.length === 0) {
            setCsvFeedback('CSV enthält keine Daten.');
            return;
          }

          const headers = results.meta.fields ?? [];
          const firstRow = results.data[0] as Record<string, unknown>;

          let matchedCount = 0;
          const newValues: Record<string, number> = { ...values };

          for (const header of headers) {
            const bv = matchBloodValue(header);
            if (!bv) continue;

            const raw = firstRow[header];
            if (raw === null || raw === undefined || raw === '') continue;

            const num =
              typeof raw === 'number'
                ? raw
                : parseFloat(String(raw).replace(',', '.'));
            if (!isNaN(num)) {
              newValues[bv.id] = num;
              matchedCount++;
            }
          }

          setValues(newValues);

          // Try to extract date from CSV
          const dateCols = [
            'datum',
            'date',
            'abnahmedatum',
            'entnahmedatum',
          ];
          for (const col of dateCols) {
            const matchCol = headers.find(
              (h) => h.toLowerCase().trim() === col,
            );
            if (matchCol && firstRow[matchCol]) {
              const dateStr = String(firstRow[matchCol]);
              const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
              const deMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
              if (isoMatch) {
                setDate(dateStr.slice(0, 10));
                break;
              } else if (deMatch) {
                setDate(`${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`);
                break;
              }
            }
          }

          // Try to extract gender from CSV
          const genderCols = ['geschlecht', 'gender', 'sex'];
          for (const col of genderCols) {
            const matchCol = headers.find(
              (h) => h.toLowerCase().trim() === col,
            );
            if (matchCol && firstRow[matchCol]) {
              const g = String(firstRow[matchCol]).toLowerCase().trim();
              if (['m', 'male', 'männlich', 'mann'].includes(g)) {
                setGender('male');
                break;
              } else if (
                ['f', 'w', 'female', 'weiblich', 'frau'].includes(g)
              ) {
                setGender('female');
                break;
              }
            }
          }

          setCsvFeedback(
            matchedCount > 0
              ? `${matchedCount} von ${headers.length} Spalten erfolgreich zugeordnet.`
              : 'Keine Spalten konnten zugeordnet werden. Spaltenüberschriften müssen den Blutwert-Namen oder IDs entsprechen.',
          );
        },
        error(err) {
          setCsvFeedback(`Fehler beim Lesen der CSV: ${err.message}`);
        },
      });
    },
    [values],
  );

  // ---- PDF Upload handler ----
  const handlePdfUpload = useCallback(
    async (file: File) => {
      setCsvFeedback(null);
      setPdfParsing(true);
      setPdfPreview(null);
      try {
        const result = await parsePdf(file);
        if (result.warnings.length > 0) {
          setCsvFeedback(result.warnings.join(' '));
        }
        if (result.date) setDate(result.date);
        if (result.gender) setGender(result.gender);

        if (result.values.length > 0) {
          setPdfPreview(result.values);
          const labInfo = result.lab ? ` (${result.lab})` : '';
          const dateInfo = result.date
            ? ` vom ${result.date.split('-').reverse().join('.')}`
            : '';
          setCsvFeedback(
            `PDF erkannt${labInfo}${dateInfo}: ${result.values.length} Blutwerte gefunden. Bitte prüfen und übernehmen.`,
          );
        } else {
          setCsvFeedback(
            'Keine Blutwerte in der PDF erkannt. Ist dies ein Laborbefund?',
          );
        }
      } catch (err) {
        setCsvFeedback(
          `Fehler beim Lesen der PDF: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
        );
      } finally {
        setPdfParsing(false);
      }
    },
    [],
  );

  const applyPdfValues = useCallback(() => {
    if (!pdfPreview) return;
    const newValues: Record<string, number> = { ...values };
    for (const pv of pdfPreview) {
      newValues[pv.id] = pv.value;
    }
    setValues(newValues);
    setCsvFeedback(`${pdfPreview.length} Werte erfolgreich übernommen!`);
    setPdfPreview(null);
  }, [pdfPreview, values]);

  // ---- Derived ----
  const categoryValues = getValuesByCategory(activeCategory);
  const filledCount = Object.keys(values).length;
  const totalCount = bloodValues.length;

  // Aggregate status counts across all values currently entered
  const statusCounts = { optimal: 0, reference: 0, critical: 0, empty: 0 };
  for (const bv of bloodValues) {
    const val = values[bv.id];
    const status = getRangeStatus(val, bv, gender);
    statusCounts[status]++;
  }

  // ---- Render ----
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* ================================================================ */}
      {/* TOP BAR: Previous entries + New entry button                     */}
      {/* ================================================================ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Blutwerte-Einträge
          </h2>
          <button
            onClick={() => {
              setActiveEntryId(null);
              setDate(todayISO());
              setGender('male');
              setValues({});
              setNotes('');
              setCsvFeedback(null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white
                       hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} />
            Neuer Eintrag
          </button>
        </div>

        {/* Entry list toggle for small screens */}
        <button
          onClick={() => setShowEntryList((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary
                     transition-colors md:hidden mb-2"
        >
          <FileText size={14} />
          {entries.length} gespeicherte{' '}
          {entries.length === 1 ? 'Eintrag' : 'Einträge'}
          <ChevronDown
            size={14}
            className={`transition-transform ${showEntryList ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Entry cards grid */}
        <div
          className={`grid gap-2 ${showEntryList ? '' : 'hidden md:grid'}`}
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}
        >
          {entries.length === 0 && (
            <p className="text-sm text-text-muted col-span-full">
              Noch keine Einträge vorhanden.
            </p>
          )}
          {entries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const entryFilledCount = Object.keys(entry.values).length;
            return (
              <div
                key={entry.id}
                className={`group flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer
                           transition-all duration-150
                           ${
                             isActive
                               ? 'border-accent bg-accent/10'
                               : 'border-border bg-bg-card hover:border-accent/50'
                           }`}
                onClick={() => selectEntry(entry.id)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {formatDate(entry.date)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {entry.gender === 'male' ? 'M' : 'W'} &middot;{' '}
                    {entryFilledCount} Werte
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.id);
                  }}
                  className="p-1 rounded text-text-muted hover:text-danger opacity-0 group-hover:opacity-100
                             transition-opacity"
                  title="Eintrag löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* FORM HEADER: Date, Gender, CSV Upload, Save                     */}
      {/* ================================================================ */}
      <div className="rounded-xl border border-border bg-bg-card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          {/* Date picker */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="entry-date"
              className="text-xs font-medium text-text-secondary"
            >
              Abnahmedatum
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                id="entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-border bg-bg-input pl-9 pr-3 py-2 text-sm text-text-primary
                           focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Gender toggle */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-secondary">
              Geschlecht
            </span>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setGender('male')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  gender === 'male'
                    ? 'bg-accent text-white'
                    : 'bg-bg-input text-text-secondary hover:text-text-primary'
                }`}
              >
                Männlich
              </button>
              <button
                onClick={() => setGender('female')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
                  gender === 'female'
                    ? 'bg-accent text-white'
                    : 'bg-bg-input text-text-secondary hover:text-text-primary'
                }`}
              >
                Weiblich
              </button>
            </div>
          </div>

          {/* Import Buttons */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-secondary">
              Import
            </span>
            <div className="flex gap-2">
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={pdfParsing}
                className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2
                           text-sm text-accent hover:bg-accent/20 hover:border-accent/60
                           transition-colors disabled:opacity-50"
              >
                <FileUp size={16} />
                {pdfParsing ? 'Lese PDF...' : 'PDF Import'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-input px-4 py-2
                           text-sm text-text-secondary hover:text-text-primary hover:border-accent/50
                           transition-colors"
              >
                <Upload size={16} />
                CSV
              </button>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={filledCount === 0}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto
                       ${saveFlash ? 'bg-success' : 'bg-accent hover:bg-accent-hover'}`}
          >
            <Save size={16} />
            {saveFlash ? 'Gespeichert!' : 'Speichern'}
          </button>
        </div>

        {/* Import Feedback message */}
        {csvFeedback && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-text-secondary mb-4">
            {csvFeedback}
          </div>
        )}

        {/* PDF Preview & Confirm */}
        {pdfPreview && (
          <div className="rounded-xl border border-accent/30 bg-bg-card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-text-primary">
                {pdfPreview.length} Werte aus PDF erkannt
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setPdfPreview(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary
                             hover:text-text-primary transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={applyPdfValues}
                  className="rounded-lg bg-accent hover:bg-accent-hover px-4 py-1.5 text-xs font-medium
                             text-white transition-colors"
                >
                  Alle übernehmen
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {pdfPreview.map((pv) => {
                const bv = bloodValues.find((b) => b.id === pv.id);
                return (
                  <div
                    key={pv.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5
                               hover:bg-bg-input/40 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-text-primary truncate">
                        {bv?.name ?? pv.name}
                      </span>
                      {pv.converted && (
                        <span className="shrink-0 rounded bg-warning/10 border border-warning/30 px-1.5 py-0.5 text-[10px] text-warning">
                          umgerechnet
                        </span>
                      )}
                      {pv.note && (
                        <span className="shrink-0 text-[10px] text-text-muted" title={pv.note}>
                          *
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-medium text-text-primary">
                        {pv.value}
                      </span>
                      <span className="text-xs text-text-muted">{pv.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {pdfPreview.some((pv) => pv.note) && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-[10px] text-text-muted">
                  * Hinweise: {pdfPreview.filter((pv) => pv.note).map((pv) => pv.note).join(' | ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes textarea */}
        <div>
          <label
            htmlFor="entry-notes"
            className="text-xs font-medium text-text-secondary"
          >
            Notizen (optional)
          </label>
          <textarea
            id="entry-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. nüchtern, nach Sport, Medikamente ..."
            className="mt-1 w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary
                       placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-y"
          />
        </div>

        {/* Summary badges */}
        {filledCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
            <span className="text-xs text-text-muted">
              {filledCount}/{totalCount} Werte eingetragen
            </span>
            {statusCounts.optimal > 0 && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-success" />
                {statusCounts.optimal} optimal
              </span>
            )}
            {statusCounts.reference > 0 && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-warning" />
                {statusCounts.reference} suboptimal
              </span>
            )}
            {statusCounts.critical > 0 && (
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-danger" />
                {statusCounts.critical} kritisch
              </span>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* CATEGORY TABS                                                    */}
      {/* ================================================================ */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max border-b border-border pb-px">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            const catValues = getValuesByCategory(cat);
            const catFilledCount = catValues.filter(
              (bv) => values[bv.id] !== undefined,
            ).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'text-accent bg-bg-card border border-border border-b-transparent -mb-px'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
                  }`}
              >
                {categoryLabels[cat]}
                {catFilledCount > 0 && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center text-[10px] min-w-[18px] h-[18px] px-1
                                rounded-full font-medium
                                ${
                                  isActive
                                    ? 'bg-accent/20 text-accent'
                                    : 'bg-bg-input text-text-muted'
                                }`}
                  >
                    {catFilledCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* VALUE INPUTS for active category                                 */}
      {/* ================================================================ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categoryValues.map((bv) => (
          <ValueInput
            key={bv.id}
            bv={bv}
            value={values[bv.id]}
            gender={gender}
            onChange={handleValueChange}
          />
        ))}
      </div>
    </div>
  );
}
