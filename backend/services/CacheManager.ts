/**
 * Cache Manager
 * Multi-tier caching system (in-memory + distributed)
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Max entries per cache
  strategy?: 'LRU' | 'LFU' | 'FIFO'; // Eviction strategy
}

class Cache<T = any> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      strategy: 'LRU',
      ...config,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Check size limit
    if (this.store.size >= this.config.maxSize!) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl || this.config.ttl!),
      hits: 0,
      createdAt: Date.now(),
    };

    this.store.set(key, entry);
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get or compute value
   */
  async getOrCompute(key: string, compute: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);

    if (cached !== null) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.store.delete(key);
    }
  }

  /**
   * Evict entries based on strategy
   */
  private evict(): void {
    const strategy = this.config.strategy!;

    let keyToEvict: string | null = null;

    if (strategy === 'LRU') {
      // Least Recently Used
      let oldestAccess = Infinity;

      for (const [key, entry] of this.store.entries()) {
        const lastAccess = entry.createdAt + entry.hits * 1000;

        if (lastAccess < oldestAccess) {
          oldestAccess = lastAccess;
          keyToEvict = key;
        }
      }
    } else if (strategy === 'LFU') {
      // Least Frequently Used
      let lowestHits = Infinity;

      for (const [key, entry] of this.store.entries()) {
        if (entry.hits < lowestHits) {
          lowestHits = entry.hits;
          keyToEvict = key;
        }
      }
    } else if (strategy === 'FIFO') {
      // First In First Out
      let oldestCreation = Infinity;

      for (const [key, entry] of this.store.entries()) {
        if (entry.createdAt < oldestCreation) {
          oldestCreation = entry.createdAt;
          keyToEvict = key;
        }
      }
    }

    if (keyToEvict) {
      this.store.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate.toFixed(2) + '%',
      evictions: this.stats.evictions,
    };
  }
}

/**
 * Cache Manager - manages multiple caches
 */
class CacheManager {
  private caches: Map<string, Cache> = new Map();

  /**
   * Create or get cache
   */
  getCache<T = any>(name: string, config?: CacheConfig): Cache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Cache(config));
    }

    return this.caches.get(name)! as Cache<T>;
  }

  /**
   * Delete cache
   */
  deleteCache(name: string): void {
    const cache = this.caches.get(name);

    if (cache) {
      cache.clear();
      this.caches.delete(name);
    }
  }

  /**
   * Get all cache statistics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }

    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}

export const cacheManager = new CacheManager();

/**
 * Preset caches
 */
export const CACHES = {
  TOOLS: cacheManager.getCache('tools', { ttl: 10 * 60 * 1000, maxSize: 100 }),
  SESSIONS: cacheManager.getCache('sessions', { ttl: 30 * 60 * 1000, maxSize: 1000 }),
  USERS: cacheManager.getCache('users', { ttl: 15 * 60 * 1000, maxSize: 500 }),
  API_RESPONSES: cacheManager.getCache('api-responses', { ttl: 5 * 60 * 1000, maxSize: 500 }),
  PLAYBOOKS: cacheManager.getCache('playbooks', { ttl: 60 * 60 * 1000, maxSize: 100 }),
};
