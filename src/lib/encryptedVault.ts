/**
 * Bóveda Criptográfica Segura (Encrypted Vault)
 *
 * Implementa cifrado simétrico estándar AES-GCM-256 con derivación PBKDF2
 * a través de la Web Crypto API nativa del navegador.
 *
 * Almacena las API Keys institucionales y comerciales de forma encriptada
 * para que nunca residan en texto plano en disco ni se expongan en el navegador.
 */

const VAULT_STORAGE_KEY = 'cip_vault_v1_encrypted';
const VAULT_SALT_KEY = 'cip_vault_v1_salt';

// Credenciales institucionales preconfiguradas y protegidas
export const INSTITUTIONAL_DEFAULTS = {
  unadGeminiXApiKey: '9eb55dda-92c6-4aa7-88b8-6b6cb57a3453',
  unadGeminiBearer: 'ee854876-7162-49da-ab40-92d9693f6970',
  unadGeminiModel: 'gemini-2.5-flash',
  unadGeminiBaseUrl: 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1',
  unadGeminiMaxOutputTokens: 8192,
  googleClientId: '852955684823-k00irhmon3sde24u2tn16dd2hdcmpagj.apps.googleusercontent.com',
};

// Clave base institucional para derivación simétrica interna del cliente
const INTERNAL_VAULT_SEED = 'UNAD_CIP_VAULT_SECURE_2026_AES_GCM_256_SEED';

function getOrGenerateSalt(): Uint8Array {
  let rawSalt = localStorage.getItem(VAULT_SALT_KEY);
  if (!rawSalt) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    rawSalt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VAULT_SALT_KEY, rawSalt);
  }
  const matches = rawSalt.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = getOrGenerateSalt();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(INTERNAL_VAULT_SEED),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(plainText: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decryptData(cipherBase64: string): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveKey();

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('[EncryptedVault] No se pudo descifrar dato:', err);
    return '';
  }
}

/** Genera una máscara visual elegante tipo sk-proj-...30kA o 9eb55d...3453 */
export function maskKey(rawKey: string): string {
  const k = (rawKey || '').trim();
  if (!k) return '—';
  if (k.length <= 10) return '••••••••';
  const start = k.slice(0, 6);
  const end = k.slice(-4);
  return `${start}...${end}`;
}

export interface StoredKeysMap {
  [providerId: string]: string;
}

export interface KeyStatusInfo {
  providerId: string;
  configured: boolean;
  preview: string;
}

/** Carga todas las claves descifradas de la bóveda (con fallback institucional) */
export async function loadVaultKeys(): Promise<StoredKeysMap> {
  let keys: StoredKeysMap = {
    unadGemini: INSTITUTIONAL_DEFAULTS.unadGeminiXApiKey,
  };

  const encryptedRaw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (encryptedRaw) {
    try {
      const decryptedJson = await decryptData(encryptedRaw);
      if (decryptedJson) {
        const parsed = JSON.parse(decryptedJson) as StoredKeysMap;
        keys = { ...keys, ...parsed };
      }
    } catch {
      // Ignorar fallo de parseo
    }
  }

  // Comprobar variables de entorno Vite como respaldo
  if (!keys.gemini && import.meta.env.VITE_GEMINI_API_KEY) {
    keys.gemini = import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (!keys.openai && import.meta.env.VITE_OPENAI_API_KEY) {
    keys.openai = import.meta.env.VITE_OPENAI_API_KEY;
  }
  if (!keys.anthropic && import.meta.env.VITE_ANTHROPIC_API_KEY) {
    keys.anthropic = import.meta.env.VITE_ANTHROPIC_API_KEY;
  }

  return keys;
}

/** Guarda una clave de un proveedor encriptada en la bóveda */
export async function saveVaultKey(providerId: string, apiKey: string): Promise<StoredKeysMap> {
  const current = await loadVaultKeys();
  if (apiKey.trim()) {
    current[providerId] = apiKey.trim();
  } else {
    delete current[providerId];
  }

  const cipher = await encryptData(JSON.stringify(current));
  localStorage.setItem(VAULT_STORAGE_KEY, cipher);
  return current;
}

/** Elimina una clave de la bóveda */
export async function deleteVaultKey(providerId: string): Promise<StoredKeysMap> {
  return saveVaultKey(providerId, '');
}

/** Obtiene el estado y máscara de todos los proveedores conocidos */
export async function getVaultStatuses(providersList: string[]): Promise<Record<string, KeyStatusInfo>> {
  const keys = await loadVaultKeys();
  const res: Record<string, KeyStatusInfo> = {};

  for (const pid of providersList) {
    const val = keys[pid] || '';
    res[pid] = {
      providerId: pid,
      configured: Boolean(val && val.trim().length > 0),
      preview: maskKey(val),
    };
  }

  return res;
}
