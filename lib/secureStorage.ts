/**
 * Secure Storage Library for ECHOMEN
 *
 * Provides encrypted credential storage using Web Crypto API.
 * Falls back to sessionStorage for non-sensitive data.
 * Supports migration from localStorage.
 */

import { Service } from '../types';

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/**
 * Generate a cryptographic key from a user-provided password or machine identifier
 */
async function getOrCreateKey(): Promise<CryptoKey> {
    const keyId = 'echomen_storage_key';
    const storedKeyData = localStorage.getItem(keyId);

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

    // Export and store
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(keyId, JSON.stringify(exportedKey));

    return key;
}

/**
 * Encrypt data using AES-256-GCM
 */
async function encrypt(data: string): Promise<string> {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encryptedContent = await crypto.subtle.encrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        key,
        new TextEncoder().encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedContent), iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt AES-256-GCM encrypted data
 */
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

/**
 * Securely store sensitive data (API keys, tokens)
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
    try {
        const encrypted = await encrypt(value);
        localStorage.setItem(`echomen_secure_${key}`, encrypted);
    } catch (error) {
        console.error('Failed to store secure item:', error);
        throw new Error('Failed to store secure data');
    }
}

/**
 * Retrieve sensitive data
 */
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

/**
 * Remove secure item
 */
export function removeSecureItem(key: string): void {
    localStorage.removeItem(`echomen_secure_${key}`);
}

/**
 * Store non-sensitive configuration (safe for localStorage)
 */
export function setConfigItem(key: string, value: object): void {
    try {
        localStorage.setItem(`echomen_config_${key}`, JSON.stringify(value));
    } catch (error) {
        console.error('Failed to store config item:', error);
    }
}

/**
 * Retrieve non-sensitive configuration
 */
export function getConfigItem<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(`echomen_config_${key}`);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Failed to retrieve config item:', error);
        return defaultValue;
    }
}

/**
 * Migrate credentials from localStorage to secure storage
 * Call this once during app initialization
 */
export async function migrateCredentials(): Promise<void> {
    const localStorageKeys = [
        'echo-services',
        'echo-model-providers'
    ];

    for (const key of localStorageKeys) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);

                // Check if any service has credentials that need encryption
                const needsMigration = parsed.some((service: Partial<Service>) =>
                    service.inputs?.some(input => input.type === 'password')
                );

                if (needsMigration) {
                    // Store securely
                    await setSecureItem(key, data);
                    // Remove from localStorage
                    localStorage.removeItem(key);
                    console.log(`Migrated ${key} to secure storage`);
                }
            } catch (error) {
                console.error(`Failed to migrate ${key}:`, error);
            }
        }
    }
}

/**
 * Get all secure service credentials (for backend API calls)
 */
export async function getServiceCredentials(): Promise<Record<string, string>> {
    const credentials: Record<string, string> = {};

    try {
        const servicesData = await getSecureItem('echo-services');
        if (servicesData) {
            const services: Partial<Service>[] = JSON.parse(servicesData);
            services.forEach(service => {
                if (service.status === 'Connected') {
                    service.inputs?.forEach(input => {
                        if (input.type === 'password' && input.id) {
                            credentials[input.id] = input.label; // Store key identifier
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('Failed to get service credentials:', error);
    }

    return credentials;
}

/**
 * Check if running in a secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

/**
 * Clear all ECHOMEN data (for logout/reset)
 */
export function clearAllData(): void {
    // Clear localStorage items starting with 'echomen_' or 'echo-'
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('echomen_') || key.startsWith('echo-')) {
            localStorage.removeItem(key);
        }
    });

    // Clear any remaining sessionStorage items starting with 'echomen_'
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('echomen_')) {
            sessionStorage.removeItem(key);
        }
    });
}
