import { useState, useRef, useCallback } from 'react';
import { Download, Upload, Trash2, AlertTriangle, Check, Info } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import {
  loadEntries,
  loadEntriesForProfile,
  saveEntries,
  STORAGE_KEY,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData } from '../../utils/bloodwork-utils';

export default function SettingsPage() {
  const { activeProfile, profiles } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ---- Export ----
  const handleExport = useCallback(() => {
    if (!activeProfile) return;
    const entries = loadEntriesForProfile(activeProfile.id);
    if (entries.length === 0) {
      showFeedback('error', 'Keine Daten zum Exportieren vorhanden.');
      return;
    }

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      profileName: activeProfile.name,
      gender: activeProfile.defaultGender,
      entries: entries.map(({ profileId: _, ...rest }) => rest),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const datePart = new Date().toISOString().slice(0, 10);
    a.download = `blutwerte-${activeProfile.name.toLowerCase().replace(/\s+/g, '-')}-${datePart}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('success', `${entries.length} Eintraege exportiert.`);
  }, [activeProfile]);

  // ---- Import ----
  const handleImport = useCallback(
    (file: File) => {
      if (!activeProfile) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string);

          let importEntries: BloodworkEntryData[];

          if (raw.version && Array.isArray(raw.entries)) {
            // Structured export format
            importEntries = raw.entries.map((entry: BloodworkEntryData) => ({
              ...entry,
              profileId: activeProfile.id,
            }));
          } else if (Array.isArray(raw)) {
            // Plain array format
            importEntries = raw.map((entry: BloodworkEntryData) => ({
              ...entry,
              profileId: activeProfile.id,
            }));
          } else {
            showFeedback('error', 'Unbekanntes Dateiformat. Erwartet: Blutwerte-Export-JSON.');
            return;
          }

          if (importEntries.length === 0) {
            showFeedback('error', 'Die Datei enthaelt keine Eintraege.');
            return;
          }

          // Validate entries have required fields
          const valid = importEntries.every(
            (e) => e.id && e.date && e.gender && e.values && typeof e.values === 'object',
          );
          if (!valid) {
            showFeedback('error', 'Ungueltige Daten: Eintraege muessen id, date, gender und values enthalten.');
            return;
          }

          // Merge with existing entries (skip duplicates by id)
          const allEntries = loadEntries();
          const existingIds = new Set(allEntries.map((e) => e.id));
          let added = 0;
          for (const entry of importEntries) {
            if (!existingIds.has(entry.id)) {
              allEntries.push(entry);
              added++;
            }
          }

          if (added === 0) {
            showFeedback('error', 'Alle Eintraege sind bereits vorhanden (gleiche IDs).');
            return;
          }

          allEntries.sort((a, b) => b.date.localeCompare(a.date));
          const ok = saveEntries(allEntries);
          if (!ok) {
            showFeedback('error', 'Speichern fehlgeschlagen! Browser-Speicher voll?');
            return;
          }

          showFeedback('success', `${added} Eintraege importiert. Seite wird neu geladen...`);
          setTimeout(() => window.location.reload(), 1500);
        } catch {
          showFeedback('error', 'Datei konnte nicht gelesen werden. Ist es eine gueltige JSON-Datei?');
        }
      };
      reader.readAsText(file);
    },
    [activeProfile],
  );

  // ---- Reset ----
  const handleReset = useCallback(() => {
    if (!activeProfile) return;
    const allEntries = loadEntries();
    const filtered = allEntries.filter((e) => e.profileId !== activeProfile.id);
    saveEntries(filtered);
    setConfirmReset(false);
    showFeedback('success', 'Alle Daten fuer dieses Profil geloescht. Seite wird neu geladen...');
    setTimeout(() => window.location.reload(), 1500);
  }, [activeProfile]);

  const profileEntryCount = activeProfile
    ? loadEntriesForProfile(activeProfile.id).length
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-text-primary">Einstellungen</h2>

      {/* Info Box */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
        <div className="flex gap-3">
          <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary space-y-1">
            <p className="font-medium text-text-primary">Deine Daten bleiben lokal</p>
            <p>
              Alle Blutwerte werden ausschliesslich in deinem Browser gespeichert (localStorage).
              Niemand anderes kann deine Daten sehen — auch nicht andere Benutzer dieser App.
            </p>
            <p>
              Erstelle regelmaessig ein <strong>Backup</strong> per Export, damit du bei einem Browser-Reset
              nichts verlierst.
            </p>
          </div>
        </div>
      </div>

      {/* Active Profile Info */}
      <div className="rounded-xl border border-border bg-bg-card p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Aktuelles Profil: {activeProfile?.name ?? '–'}
        </h3>
        <p className="text-sm text-text-muted">
          {profileEntryCount} {profileEntryCount === 1 ? 'Eintrag' : 'Eintraege'} gespeichert
          {profiles.length > 1 && ` · ${profiles.length} Profile insgesamt`}
        </p>
      </div>

      {/* Export */}
      <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Download size={18} className="text-accent" />
          Daten exportieren (Backup)
        </h3>
        <p className="text-sm text-text-muted">
          Laedt eine JSON-Datei mit allen Eintraegen des aktuellen Profils herunter.
          Speichere diese Datei sicher ab — damit kannst du jederzeit alles wiederherstellen.
        </p>
        <button
          onClick={handleExport}
          disabled={profileEntryCount === 0}
          className="flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-hover px-4 py-2
                     text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Export herunterladen
        </button>
      </div>

      {/* Import */}
      <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Upload size={18} className="text-green-400" />
          Daten importieren (Wiederherstellen)
        </h3>
        <p className="text-sm text-text-muted">
          Lade eine zuvor exportierte JSON-Datei hoch. Die Daten werden dem aktuellen Profil zugeordnet.
          Bereits vorhandene Eintraege (gleiche ID) werden nicht doppelt importiert.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2
                     text-sm font-medium text-green-400 hover:bg-green-500/20 transition-colors"
        >
          <Upload size={16} />
          JSON-Datei hochladen
        </button>
      </div>

      {/* Reset */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-3">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Trash2 size={18} className="text-red-400" />
          Daten zuruecksetzen
        </h3>
        <p className="text-sm text-text-muted">
          Loescht alle gespeicherten Eintraege fuer das aktuelle Profil ({activeProfile?.name}).
          Andere Profile bleiben davon unberuehrt. Diese Aktion kann nicht rueckgaengig gemacht werden!
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            disabled={profileEntryCount === 0}
            className="flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2
                       text-sm text-red-400 hover:bg-red-500/10 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Alle Daten loeschen
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2
                         text-sm font-medium text-white transition-colors"
            >
              <AlertTriangle size={16} />
              Ja, wirklich loeschen
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary
                         hover:text-text-primary transition-colors"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            feedback.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            {feedback.msg}
          </div>
        </div>
      )}

      {/* Storage Info */}
      <div className="text-xs text-text-muted text-center pt-4">
        Speicherort: localStorage · Schluessel: {STORAGE_KEY}
      </div>
    </div>
  );
}
