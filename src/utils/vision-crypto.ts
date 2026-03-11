/**
 * AES-GCM Verschluesselung fuer den Anthropic API-Key.
 * Der Key wird mit einem vom User gewaehlten Passwort verschluesselt
 * und liegt nie im Klartext in localStorage.
 */

const STORAGE_KEY = 'blutwerte-vision-key';
const SALT_PREFIX = 'blutwerte-vision-salt-v1';

/** Derive an AES-GCM key from a password using PBKDF2 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt the API key with a password. Returns a base64 string (salt + iv + ciphertext). */
export async function encryptApiKey(apiKey: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(apiKey),
  );

  // Combine: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/** Decrypt the API key with a password. Throws on wrong password. */
export async function decryptApiKey(encrypted: string, password: string): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/** Store the encrypted key in localStorage */
export function storeEncryptedKey(encrypted: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, prefix: SALT_PREFIX, data: encrypted }));
}

/** Get the encrypted key from localStorage, or null */
export function getEncryptedKey(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: number; data: string };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

/** Check if an encrypted API key is stored */
export function hasStoredApiKey(): boolean {
  return getEncryptedKey() !== null;
}

/** Remove the stored API key */
export function removeApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
