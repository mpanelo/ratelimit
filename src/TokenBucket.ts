interface TokenBucketConfig {
  /**
   * Tokens per second to add to the bucket
   */
  rate: number;
  /**
   * Maximum number of tokens the bucket can hold
   */
  capacity: number;

  /**
   * Caching strategy for storing bucket data for each user
   */
  cache: Cache;
}

export type BucketData = { tokens: number; updatedAt: number };

export class TokenBucket {
  constructor(private config: TokenBucketConfig) {
    if (config.rate <= 0) {
      throw new Error('rate must be greater than zero');
    }

    if (config.capacity < 1) {
      throw new Error('capacity must be greater than 1');
    }
  }

  take(key: string): boolean {
    const { cache } = this.config;
    cache.replenish(key, this.config.rate, this.config.capacity);
    return cache.take(key);
  }
}

export abstract class Cache {
  abstract replenish(key: string, rate: number, capacity: number): void;
  abstract take(key: string): boolean;
}

export class InMemoryCache extends Cache {
  private buckets: Map<string, BucketData>;

  constructor() {
    super();
    this.buckets = new Map();
  }

  replenish(key: string, rate: number, capacity: number): void {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { tokens: capacity, updatedAt: nowInSeconds() });
      return;
    }

    const { tokens, updatedAt } = this.buckets.get(key)!;
    const now = nowInSeconds();

    if (now < updatedAt) {
      return;
    }

    this.buckets.set(key, {
      tokens: tokens + rate * (now - updatedAt),
      updatedAt: now,
    });
  }

  take(key: string): boolean {
    if (!this.buckets.has(key)) {
      throw new Error(`Key ${key} does not exist in the cache`);
    }

    const { tokens, updatedAt } = this.buckets.get(key)!;
    if (tokens === 0) {
      return false;
    }

    this.buckets.set(key, { tokens: tokens - 1, updatedAt });
    return true;
  }
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
