/**
 * Utility for securely storing and retrieving Gemini API keys in localStorage.
 * Uses reversible obfuscation/encryption to prevent plaintext exposure.
 */

const STORAGE_KEY = 'custom_gemini_key';
const MODEL_STORAGE_KEY = 'custom_gemini_model';
const SALT = 'AI_EXAM_SCHEDULE_SECURE_2026';

function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Encrypts and saves the Gemini API Key to localStorage.
 */
export function saveGeminiApiKey(rawKey: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = (rawKey || '').trim();
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    const ciphered = xorCipher(trimmed, SALT);
    const encoded = btoa(encodeURIComponent(ciphered));
    localStorage.setItem(STORAGE_KEY, `enc_${encoded}`);
  } catch (err) {
    console.error('Failed to encrypt Gemini API key:', err);
    // Fallback simple base64
    localStorage.setItem(STORAGE_KEY, `b64_${btoa(trimmed)}`);
  }
}

/**
 * Retrieves and decrypts the Gemini API Key from localStorage.
 */
export function getGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return '';

    // If stored with new salted encryption prefix
    if (stored.startsWith('enc_')) {
      const b64 = stored.slice(4);
      const ciphered = decodeURIComponent(atob(b64));
      return xorCipher(ciphered, SALT);
    }

    // If stored with legacy simple base64 prefix
    if (stored.startsWith('b64_')) {
      return atob(stored.slice(4));
    }

    // Legacy fallback: check if it looks like a base64 string or plain key
    if (stored.startsWith('AIzaSy')) {
      // It was stored in plain text previously
      saveGeminiApiKey(stored); // re-save encrypted
      return stored;
    }

    try {
      const decoded = atob(stored);
      if (decoded.startsWith('AIzaSy')) {
        saveGeminiApiKey(decoded); // re-save with current format
        return decoded;
      }
    } catch {}

    return stored;
  } catch (err) {
    console.warn('Could not decrypt Gemini API key:', err);
    return '';
  }
}

/**
 * Removes the stored Gemini API Key.
 */
export function clearGeminiApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Saves preferred Gemini Model
 */
export function saveGeminiModel(model: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

/**
 * Retrieves preferred Gemini Model with a safe default
 */
export function getGeminiModel(): string {
  if (typeof window === 'undefined') return 'gemini-2.5-flash';
  return localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-2.5-flash';
}
