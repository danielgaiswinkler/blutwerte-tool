import { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Upload, Trash2, AlertTriangle, Check, Info, Pill, Camera, Eye, EyeOff } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import {
  loadEntries,
  loadEntriesForProfile,
  saveEntries,
  loadUserSupplements,
  saveUserSupplements,
  STORAGE_KEY,
} from '../../utils/bloodwork-utils';
import type { BloodworkEntryData } from '../../utils/bloodwork-utils';
import {
  encryptApiKey,
  hasStoredApiKey,
  storeEncryptedKey,
  removeApiKey,
} from '../../utils/vision-crypto';
import supplementsData from '../../data/supplements.json';

const allSupplements = (supplementsData as { supplements: Array<{ id: string; name: string; categoryLabel: string }> }).supplements;

export default function SettingsPage() {
  const { activeProfile, profiles } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [userSupplements, setUserSupplements] = useState<string[]>([]);

  // Load user supplement stack
  useEffect(() => {
    if (activeProfile) {
      setUserSupplements(loadUserSupplements(activeProfile.id));
    }
  }, [activeProfile]);

  const toggleSupplement = useCallback((id: string) => {
    if (!activeProfile) return;
    setUserSupplements((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      saveUserSupplements(activeProfile.id, next);
      return next;
    });
  }, [activeProfile]);

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
        <p className="text-xs text-text-muted mt-2">
          Tipp: Die Export-Datei ist auch kompatibel mit dem Health Hub Sync
          (sync_blutwerte.py).
        </p>
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

      {/* Supplement Stack */}
      <div className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
        <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <Pill size={18} className="text-purple-400" />
          Mein Supplement-Stack
        </h3>
        <p className="text-sm text-text-muted">
          Markiere die Supplements, die du bereits nimmst. Die Empfehlungen-Seite zeigt dann an,
          welche du schon abgedeckt hast.
        </p>
        <div className="space-y-1">
          {(() => {
            const groups = new Map<string, typeof allSupplements>();
            for (const s of allSupplements) {
              const arr = groups.get(s.categoryLabel) ?? [];
              arr.push(s);
              groups.set(s.categoryLabel, arr);
            }
            return [...groups.entries()].map(([label, supps]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-text-secondary mt-3 mb-1.5">{label}</p>
                {supps.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-bg-input/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={userSupplements.includes(s.id)}
                      onChange={() => toggleSupplement(s.id)}
                      className="w-4 h-4 rounded border-border accent-purple-500"
                    />
                    <span className="text-sm text-text-primary">{s.name}</span>
                  </label>
                ))}
              </div>
            ));
          })()}
        </div>
        {userSupplements.length > 0 && (
          <p className="text-xs text-purple-400 mt-2">
            {userSupplements.length} Supplement{userSupplements.length !== 1 ? 's' : ''} markiert
          </p>
        )}
      </div>

      {/* Vision API Key */}
      <VisionApiKeySection />

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

// ---------------------------------------------------------------------------
// Vision API Key Management
// ---------------------------------------------------------------------------

function VisionApiKeySection() {
  const [hasKey, setHasKey] = useState(hasStoredApiKey());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) {
      showMsg('error', 'Bitte API-Key eingeben.');
      return;
    }
    if (!apiKeyInput.trim().startsWith('sk-ant-')) {
      showMsg('error', 'Ungueltiger API-Key. Muss mit "sk-ant-" beginnen.');
      return;
    }
    if (password.length < 4) {
      showMsg('error', 'Passwort muss mindestens 4 Zeichen haben.');
      return;
    }
    if (password !== passwordConfirm) {
      showMsg('error', 'Passwoerter stimmen nicht ueberein.');
      return;
    }

    setSaving(true);
    try {
      const encrypted = await encryptApiKey(apiKeyInput.trim(), password);
      storeEncryptedKey(encrypted);
      setHasKey(true);
      setApiKeyInput('');
      setPassword('');
      setPasswordConfirm('');
      showMsg('success', 'API-Key verschluesselt gespeichert! Bild-Import ist jetzt verfuegbar.');
    } catch {
      showMsg('error', 'Fehler beim Verschluesseln. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = () => {
    removeApiKey();
    setHasKey(false);
    setConfirmDelete(false);
    showMsg('success', 'API-Key geloescht.');
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
      <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
        <Camera size={18} className="text-emerald-400" />
        KI Bild-Import (Claude Vision)
      </h3>

      {hasKey ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-medium">API-Key konfiguriert</span>
            <span className="text-text-muted">— verschluesselt gespeichert</span>
          </div>
          <p className="text-sm text-text-muted">
            Du kannst jetzt Laborberichte per Foto importieren. Beim Import wirst du nach deinem
            Passwort gefragt, um den Key zu entschluesseln.
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-1.5
                         text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
              API-Key entfernen
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteKey}
                className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                Ja, entfernen
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Abbrechen
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted">
            Mit einem Anthropic API-Key kannst du Laborberichte per Foto hochladen.
            Die KI (Claude) erkennt automatisch alle Blutwerte im Bild.
          </p>
          <div className="rounded-lg border border-border bg-bg-input/50 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Anthropic API-Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 pr-10 text-sm text-text-primary
                             placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                Erstelle einen Key auf{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  console.anthropic.com
                </a>
                {' '}(kostet ca. 0,01-0,03 EUR pro Analyse)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 4 Zeichen"
                  className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary
                             placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">Passwort wiederholen</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Nochmal eingeben"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
                  className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary
                             placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
            <p className="text-[11px] text-text-muted">
              Der API-Key wird mit deinem Passwort AES-256 verschluesselt. Er liegt nie im Klartext im Browser.
              Bei jedem Bild-Import gibst du das Passwort einmal ein.
            </p>
            <button
              onClick={handleSaveKey}
              disabled={saving || !apiKeyInput || !password || !passwordConfirm}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2
                         text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              {saving ? 'Verschluessele...' : 'Key speichern'}
            </button>
          </div>
        </>
      )}

      {feedback && (
        <div className={`rounded-lg px-3 py-2 text-sm ${
          feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
