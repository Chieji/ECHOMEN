/**
 * Semantic Memory with Vector Embeddings
 * Fixes Priority 2.4: Replaces keyword-only search with semantic understanding
 */

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  timestamp: number;
  score?: number;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  timestamp: number;
}

export interface EmbeddingConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

class SemanticMemory {
  private entries: Map<string, MemoryEntry> = new Map();
  private config: EmbeddingConfig;
  private embeddingCache: Map<string, number[]> = new Map();
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(config: EmbeddingConfig) {
    this.config = {
      model: 'text-embedding-3-small',
      ...config,
    };

    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  /**
   * Add content to semantic memory
   */
  async add(content: string, metadata: Record<string, any> = {}): Promise<string> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Get embedding for content
    const embedding = await this.getEmbedding(content);

    const entry: MemoryEntry = {
      id,
      content,
      embedding,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.entries.set(id, entry);

    console.log(`✓ Memory added: ${id}`);

    return id;
  }

  /**
   * Search memory semantically
   */
  async search(query: string, k: number = 5, threshold: number = 0.7): Promise<MemorySearchResult[]> {
    const queryEmbedding = await this.getEmbedding(query);

    // Calculate similarity scores for all entries
    const results: MemorySearchResult[] = [];

    for (const [id, entry] of this.entries) {
      if (!entry.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      // Fix Priority 2.4: Proper similarity scoring with threshold
      if (similarity >= threshold) {
        results.push({
          id,
          content: entry.content,
          metadata: entry.metadata,
          similarity,
          timestamp: entry.timestamp,
        });
      }
    }

    // Sort by similarity and return top k
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  /**
   * Hybrid search: combine semantic + keyword
   */
  async hybridSearch(
    query: string,
    k: number = 5,
    keywordWeight: number = 0.3
  ): Promise<MemorySearchResult[]> {
    // Get semantic results
    const semanticResults = await this.search(query, k * 2);

    // Get keyword results
    const keywordResults = this.keywordSearch(query, k * 2);

    // Merge results with weighted scoring
    const merged = new Map<string, MemorySearchResult>();

    for (const result of semanticResults) {
      merged.set(result.id, {
        ...result,
        similarity: result.similarity * (1 - keywordWeight),
      });
    }

    for (const result of keywordResults) {
      const existing = merged.get(result.id);
      if (existing) {
        existing.similarity += result.similarity * keywordWeight;
      } else {
        merged.set(result.id, {
          ...result,
          similarity: result.similarity * keywordWeight,
        });
      }
    }

    // Sort and return top k
    return Array.from(merged.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  /**
   * Keyword search (fallback)
   */
  private keywordSearch(query: string, k: number = 5): MemorySearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: Array<MemorySearchResult & { matchCount: number }> = [];

    for (const [id, entry] of this.entries) {
      const contentLower = entry.content.toLowerCase();
      const matchCount = queryTerms.filter((term) =>
        contentLower.includes(term)
      ).length;

      if (matchCount > 0) {
        results.push({
          id,
          content: entry.content,
          metadata: entry.metadata,
          similarity: matchCount / queryTerms.length,
          timestamp: entry.timestamp,
          matchCount,
        });
      }
    }

    return results
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, k)
      .map(({ matchCount, ...rest }) => rest);
  }

  /**
   * Get or compute embedding
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(text, embedding);

      return embedding;
    } catch (error: any) {
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get memory entry by ID
   */
  get(id: string): MemoryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Delete memory entry
   */
  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Get all entries
   */
  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.entries.clear();
    this.embeddingCache.clear();
    console.log('✓ Memory cleared');
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      totalEntries: this.entries.size,
      cachedEmbeddings: this.embeddingCache.size,
      memorySize: this.entries.size * 1024, // Rough estimate
    };
  }

  /**
   * Export memory for backup
   */
  export(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Import memory from backup
   */
  async import(entries: MemoryEntry[]): Promise<void> {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);

      if (entry.embedding) {
        this.embeddingCache.set(entry.content, entry.embedding);
      }
    }

    console.log(`✓ Imported ${entries.length} memory entries`);
  }
}

export const createSemanticMemory = (config: EmbeddingConfig) => {
  return new SemanticMemory(config);
};
