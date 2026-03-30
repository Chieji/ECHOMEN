/**
 * Secure Storage Library for ECHOMEN
 *
 * NOTE: This implementation provides OBFUSCATION, not absolute security.
 * The encryption key is stored in sessionStorage to prevent persistence
 * across browser restarts, but it is still vulnerable to XSS.
 * For production, derive the key from a user passphrase per session.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Retrieves or generates the session-bound encryption key.
 * Stored in sessionStorage to minimize persistence risk.
 */
async function getOrCreateKey(): Promise<CryptoKey> {
    const keyId = 'echomen_session_key';
    const storedKeyData = sessionStorage.getItem(keyId);

    if (storedKeyData) {
        return crypto.subtle.importKey(
            'jwk',
            JSON.parse(storedKeyData),
            { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );

    // Export and store in session memory
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    sessionStorage.setItem(keyId, JSON.stringify(exportedKey));

    return key;
}

async function encrypt(data: string): Promise<string> {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encryptedContent = await crypto.subtle.encrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        key,
        new TextEncoder().encode(data)
    );
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string): Promise<string> {
    const key = await getOrCreateKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedContent = combined.slice(IV_LENGTH);
    const decryptedContent = await crypto.subtle.decrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        key,
        encryptedContent
    );
    return new TextDecoder().decode(decryptedContent);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
    try {
        const encrypted = await encrypt(value);
        localStorage.setItem(`echomen_secure_${key}`, encrypted);
    } catch (error) {
        console.error('Failed to store secure item:', error);
        throw new Error('Failed to store secure data');
    }
}

export async function getSecureItem(key: string): Promise<string | null> {
    try {
        const encrypted = localStorage.getItem(`echomen_secure_${key}`);
        if (!encrypted) return null;
        return await decrypt(encrypted);
    } catch (error) {
        console.error('Failed to retrieve secure item:', error);
        return null;
    }
}

export function removeSecureItem(key: string): void {
    localStorage.removeItem(`echomen_secure_${key}`);
}

export function clearAllData(): void {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('echomen_') || key.startsWith('echo-')) {
            localStorage.removeItem(key);
        }
    });
    sessionStorage.removeItem('echomen_session_key');
}

export function isSecureContext(): boolean {
    return window.isSecureContext;
}

// Minimal migration from old naming if necessary
export async function migrateCredentials() {
    console.log("[Security] Migration initialized...");
}

/**
 * Migration helper: Move sensitive data from localStorage to secureStorage
 * Call this once on app initialization
 */
export async function migrateSensitiveData(): Promise<void> {
    const sensitiveKeys = ['echo-api-key', 'echo-services'];
    
    for (const key of sensitiveKeys) {
        const plainData = localStorage.getItem(key);
        if (plainData) {
            // Only migrate if not already in secure storage
            const secureData = await getSecureItem(key);
            if (!secureData) {
                await setSecureItem(key, plainData);
                console.log(`[SecureStorage] Migrated ${key} to secure storage`);
            }
            // Remove from plain localStorage after migration
            localStorage.removeItem(key);
        }
    }
}

/**
 * Get sensitive item - tries secure storage first, falls back to localStorage for migration
 */
export async function getSensitiveItem(key: string): Promise<string | null> {
    // Try secure storage first
    const secure = await getSecureItem(key);
    if (secure) return secure;
    
    // Fallback to localStorage for backward compatibility (will be removed in future)
    const plain = localStorage.getItem(key);
    if (plain) {
        // Migrate it
        await setSecureItem(key, plain);
        localStorage.removeItem(key);
        return plain;
    }
    
    return null;
}

/**
 * Set sensitive item - always uses secure storage
 */
export async function setSensitiveItem(key: string, value: string): Promise<void> {
    await setSecureItem(key, value);
}
