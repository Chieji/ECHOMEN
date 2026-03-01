/**
 * ECHOMEN Memory Manager
 * 
 * Implements structured memory with scopes, lifecycle management,
 * and garbage collection.
 */

export type MemoryScope = 'working' | 'shortterm' | 'longterm' | 'episodic';

export interface MemoryMatch {
  key: string;
  value: any;
  score: number;
  timestamp: number;
}

export interface MemoryConfig {
  shortTermTTL: number;        // 1 hour
  episodicCompression: number; // 1 day
  longTermArchive: number;     // 7 days
  maxWorkingMemory: number;    // 100 items
  maxShortTerm: number;        // 1000 items
}

const DEFAULT_CONFIG: MemoryConfig = {
  shortTermTTL: 3600000,           // 1 hour
  episodicCompression: 86400000,   // 1 day
  longTermArchive: 604800000,      // 7 days
  maxWorkingMemory: 100,
  maxShortTerm: 1000
};

export class MemoryManager {
  private config: MemoryConfig;
  private storage: Map<string, Map<string, MemoryEntry>>;
  private indexes: Map<string, Map<string, string[]>>;
  
  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = new Map();
    this.indexes = new Map();
    
    // Initialize storage for each scope
    for (const scope of ['working', 'shortterm', 'longterm', 'episodic']) {
      this.storage.set(scope, new Map());
      this.indexes.set(scope, new Map());
    }
    
    // Start garbage collection
    this.startGarbageCollection();
  }
  
  // ============================================================================
  // Basic Operations
  // ============================================================================
  
  async write(
    scope: MemoryScope,
    key: string,
    value: any,
    ttl?: number
  ): Promise<void> {
    const scopeStorage = this.storage.get(scope)!;
    
    // Check size limits
    if (scope === 'working' && scopeStorage.size >= this.config.maxWorkingMemory) {
      await this.evictOldest('working');
    }
    
    if (scope === 'shortterm' && scopeStorage.size >= this.config.maxShortTerm) {
      await this.evictOldest('shortterm');
    }
    
    // Write entry
    scopeStorage.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.getDefaultTTL(scope),
      accesses: 0
    });
    
    // Update index
    await this.updateIndex(scope, key, value);
  }
  
  async read(scope: MemoryScope, key: string): Promise<any> {
    const scopeStorage = this.storage.get(scope)!;
    const entry = scopeStorage.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check TTL
    if (this.isExpired(entry)) {
      await this.delete(scope, key);
      return null;
    }
    
    // Update access count
    entry.accesses++;
    
    return entry.value;
  }
  
  async delete(scope: MemoryScope, key: string): Promise<void> {
    const scopeStorage = this.storage.get(scope)!;
    scopeStorage.delete(key);
    
    // Remove from indexes
    const scopeIndex = this.indexes.get(scope)!;
    for (const [indexKey, keys] of scopeIndex.entries()) {
      const idx = keys.indexOf(key);
      if (idx !== -1) {
        keys.splice(idx, 1);
      }
    }
  }
  
  async clear(scope: MemoryScope): Promise<void> {
    const scopeStorage = this.storage.get(scope)!;
    scopeStorage.clear();
    
    const scopeIndex = this.indexes.get(scope)!;
    scopeIndex.clear();
  }
  
  // ============================================================================
  // Search Operations
  // ============================================================================
  
  async search(
    scope: MemoryScope,
    query: string,
    limit: number = 10
  ): Promise<MemoryMatch[]> {
    const scopeStorage = this.storage.get(scope)!;
    const matches: MemoryMatch[] = [];
    
    // Simple text search - can be enhanced with embeddings
    for (const [key, entry] of scopeStorage.entries()) {
      if (this.isExpired(entry)) {
        continue;
      }
      
      const score = this.calculateMatchScore(entry.value, query);
      
      if (score > 0) {
        matches.push({
          key,
          value: entry.value,
          score,
          timestamp: entry.timestamp
        });
      }
    }
    
    // Sort by score and limit
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  // ============================================================================
  // Lifecycle Management
  // ============================================================================
  
  async cleanup(scope?: MemoryScope): Promise<void> {
    const scopes = scope ? [scope] : ['working', 'shortterm', 'longterm', 'episodic'];
    
    for (const scope of scopes) {
      const scopeStorage = this.storage.get(scope)!;
      
      for (const [key, entry] of scopeStorage.entries()) {
        if (this.isExpired(entry)) {
          await this.delete(scope, key);
        }
      }
    }
  }
  
  async consolidate(from: MemoryScope, to: MemoryScope): Promise<void> {
    const fromStorage = this.storage.get(from)!;
    
    for (const [key, entry] of fromStorage.entries()) {
      if (!this.isExpired(entry) && entry.accesses > 0) {
        // Consolidate to long-term memory
        await this.write(to, key, entry.value);
      }
    }
  }
  
  async compress(scope: MemoryScope, olderThan: number): Promise<void> {
    const scopeStorage = this.storage.get(scope)!;
    const cutoff = Date.now() - olderThan;
    
    // Group old entries by type
    const groups: Map<string, any[]> = new Map();
    
    for (const [key, entry] of scopeStorage.entries()) {
      if (entry.timestamp < cutoff) {
        const type = this.extractType(entry.value);
        if (!groups.has(type)) {
          groups.set(type, []);
        }
        groups.get(type)!.push(entry.value);
      }
    }
    
    // Create compressed summaries
    for (const [type, entries] of groups.entries()) {
      await this.write(scope, `compressed_${type}_${cutoff}`, {
        type,
        count: entries.length,
        summary: this.generateSummary(entries),
        compressedAt: Date.now()
      });
    }
    
    // Remove old individual entries
    for (const [key, entry] of scopeStorage.entries()) {
      if (entry.timestamp < cutoff) {
        await this.delete(scope, key);
      }
    }
  }
  
  // ============================================================================
  // Utilities
  // ============================================================================
  
  private getDefaultTTL(scope: MemoryScope): number | undefined {
    if (scope === 'shortterm') {
      return this.config.shortTermTTL;
    }
    return undefined; // No TTL for longterm and episodic
  }
  
  private isExpired(entry: MemoryEntry): boolean {
    if (entry.ttl === undefined) {
      return false;
    }
    return Date.now() > entry.timestamp + entry.ttl;
  }
  
  private async evictOldest(scope: MemoryScope): Promise<void> {
    const scopeStorage = this.storage.get(scope)!;
    
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of scopeStorage.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      await this.delete(scope, oldestKey);
    }
  }
  
  private async updateIndex(scope: MemoryScope, key: string, value: any): Promise<void> {
    const scopeIndex = this.indexes.get(scope)!;
    const type = this.extractType(value);
    
    if (!scopeIndex.has(type)) {
      scopeIndex.set(type, []);
    }
    
    const keys = scopeIndex.get(type)!;
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  
  private extractType(value: any): string {
    if (typeof value === 'object' && value.type) {
      return value.type;
    }
    return 'unknown';
  }
  
  private calculateMatchScore(value: any, query: string): number {
    const queryLower = query.toLowerCase();
    const valueStr = JSON.stringify(value).toLowerCase();
    
    // Simple substring match
    if (valueStr.includes(queryLower)) {
      return 1.0;
    }
    
    // Word overlap
    const queryWords = queryLower.split(/\s+/);
    const valueWords = valueStr.split(/\s+/);
    
    const overlap = queryWords.filter(w => valueWords.includes(w)).length;
    return overlap / queryWords.length;
  }
  
  private generateSummary(entries: any[]): any {
    // Simple summary - can be enhanced
    return {
      count: entries.length,
      firstTimestamp: Math.min(...entries.map(e => e.timestamp)),
      lastTimestamp: Math.max(...entries.map(e => e.timestamp))
    };
  }
  
  private startGarbageCollection(): void {
    // Run GC every 5 minutes
    setInterval(async () => {
      await this.cleanup();
    }, 300000);
  }
  
  getUsage(): { scope: string; count: number; size: number }[] {
    const usage: { scope: string; count: number; size: number }[] = [];
    
    for (const [scope, storage] of this.storage.entries()) {
      const size = JSON.stringify(Array.from(storage.values())).length;
      usage.push({
        scope,
        count: storage.size,
        size
      });
    }
    
    return usage;
  }
}

// ============================================================================
// Types
// ============================================================================

interface MemoryEntry {
  value: any;
  timestamp: number;
  ttl?: number;
  accesses: number;
}

// ============================================================================
// Working Memory Helper
// ============================================================================

export class WorkingMemory {
  constructor(private memory: MemoryManager) {}
  
  async set(key: string, value: any): Promise<void> {
    await this.memory.write('working', key, value);
  }
  
  async get(key: string): Promise<any> {
    return await this.memory.read('working', key);
  }
  
  async clear(): Promise<void> {
    await this.memory.clear('working');
  }
  
  async getAll(): Promise<Map<string, any>> {
    return this.memory.storage.get('working')!;
  }
}
