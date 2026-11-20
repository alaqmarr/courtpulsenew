import Redis from "ioredis";

const MAX_CACHE_BYTES = 100 * 1024 * 1024; // 100 MB
const DEFAULT_TTL_SECONDS = 60;

interface MemoryCacheEntry {
  value: string;
  bytes: number;
  expiresAt: number;
}

class MemoryLruCache {
  private entries = new Map<string, MemoryCacheEntry>();
  private totalBytes = 0;

  get(key: string): string | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Refresh LRU position
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    const bytes = Buffer.byteLength(key, "utf8") + Buffer.byteLength(value, "utf8");
    if (bytes > MAX_CACHE_BYTES) return;

    this.delete(key);

    while (this.totalBytes + bytes > MAX_CACHE_BYTES && this.entries.size > 0) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }

    this.entries.set(key, {
      value,
      bytes,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.totalBytes += bytes;
  }

  delete(key: string): void {
    const existing = this.entries.get(key);
    if (!existing) return;
    this.totalBytes -= existing.bytes;
    this.entries.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
  }

  stats() {
    return {
      backend: "memory-lru" as const,
      keys: this.entries.size,
      usedBytes: this.totalBytes,
      maxBytes: MAX_CACHE_BYTES,
    };
  }
}

const globalForCache = globalThis as unknown as {
  __cpMemoryCache?: MemoryLruCache;
  __cpRedis?: Redis | null;
  __cpRedisFailed?: boolean;
};

function getMemoryCache(): MemoryLruCache {
  if (!globalForCache.__cpMemoryCache) {
    globalForCache.__cpMemoryCache = new MemoryLruCache();
  }
  return globalForCache.__cpMemoryCache;
}

async function getRedisClient(): Promise<Redis | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url || globalForCache.__cpRedisFailed) return null;

  if (!globalForCache.__cpRedis) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 800,
      lazyConnect: true,
    });

    client.on("error", () => {
      globalForCache.__cpRedisFailed = true;
    });

    try {
      await client.connect();
      await client.config("SET", "maxmemory", String(MAX_CACHE_BYTES)).catch(() => {});
      await client.config("SET", "maxmemory-policy", "allkeys-lru").catch(() => {});
      globalForCache.__cpRedis = client;
    } catch {
      globalForCache.__cpRedisFailed = true;
      client.disconnect();
      return null;
    }
  }

  return globalForCache.__cpRedis;
}

export async function withCache<T>(
  key: string,
  loader: () => Promise<T> | T,
  ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<T> {
  const memory = getMemoryCache();
  const redis = await getRedisClient();

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit !== null) {
        return JSON.parse(hit) as T;
      }
    } catch {
      // Fall back cleanly to memory cache
    }
  }

  const memHit = memory.get(key);
  if (memHit !== null) {
    return JSON.parse(memHit) as T;
  }

  const fresh = await loader();
  const serialized = JSON.stringify(fresh);

  memory.set(key, serialized, ttlSeconds);

  if (redis) {
    redis.set(key, serialized, "EX", ttlSeconds).catch(() => {});
  }

  return fresh;
}

export async function invalidateCachePrefix(prefix: string): Promise<void> {
  const memory = getMemoryCache();
  memory.deleteByPrefix(prefix);

  const redis = await getRedisClient();
  if (redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore transient Redis errors
    }
  }
}

export async function invalidateAllAppCaches(): Promise<void> {
  await Promise.all([
    invalidateCachePrefix("nav:"),
    invalidateCachePrefix("dashboard:"),
    invalidateCachePrefix("team:"),
    invalidateCachePrefix("session:"),
    invalidateCachePrefix("tournament:"),
    invalidateCachePrefix("profile:"),
  ]);
}

export function getCacheStats() {
  return getMemoryCache().stats();
}
