import { useState, useCallback } from 'react';
import { Lock, ArrowRight, Activity } from 'lucide-react';

const HASH = '82cbfd954c2dd9b95466c086823ca263e9ee58c8c35675ec6f4acc4ccf95180b';
const AUTH_KEY = 'blutwerte-auth';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem(AUTH_KEY) === 'true',
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(false);
      setChecking(true);
      const hash = await sha256(password);
      if (hash === HASH) {
        localStorage.setItem(AUTH_KEY, 'true');
        setAuthenticated(true);
      } else {
        setError(true);
        setPassword('');
      }
      setChecking(false);
    },
    [password],
  );

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg, var(--color-bg-primary), var(--color-bg-secondary))' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-(--color-accent)/10 flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-(--color-accent)" />
          </div>
          <h1 className="text-2xl font-bold text-(--color-text-primary) mb-1">Blutwerte-Tool</h1>
          <p className="text-sm text-(--color-text-muted)">Persoenliche Blutanalyse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-(--color-border) bg-(--color-bg-card) p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={16} className="text-(--color-text-muted)" />
              <span className="text-sm font-medium text-(--color-text-secondary)">Zugang geschuetzt</span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Passwort eingeben"
              autoFocus
              className={`w-full rounded-lg border px-4 py-3 text-sm text-(--color-text-primary)
                         bg-(--color-bg-input) placeholder:text-(--color-text-muted)
                         focus:outline-none focus:ring-2 focus:ring-(--color-accent)
                         ${error ? 'border-(--color-danger) ring-1 ring-(--color-danger)' : 'border-(--color-border)'}`}
            />
            {error && (
              <p className="text-xs text-(--color-danger) mt-2">Falsches Passwort</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!password || checking}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-(--color-accent) hover:bg-(--color-accent-hover)
                       px-5 py-3 text-sm font-semibold text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? 'Prüfe...' : 'Einloggen'}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
