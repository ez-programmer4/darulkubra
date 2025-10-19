/**
 * Duration Tracking Cache Service
 *
 * This service provides caching functionality for duration tracking data
 * to improve performance and reduce database queries. Uses Redis-like
 * in-memory caching with fallback to database caching.
 */

import { prisma } from "@/lib/prisma";
import {
  DurationReportResponse,
  CachedDurationData,
  CacheConfig,
} from "@/types/duration-tracking";

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

class MemoryCache {
  private cache: Map<string, CachedDurationData> = new Map();
  private maxSize: number = 100; // Maximum number of cached items

  /**
   * Get cached data
   */
  get(key: string): CachedDurationData | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Set cached data
   */
  set(key: string, data: DurationReportResponse, ttl: number): void {
    const now = new Date();
    const cached: CachedDurationData = {
      data,
      generatedAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      cacheKey: key,
    };

    this.cache.set(key, cached);

    // Implement LRU eviction if cache is too large
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global memory cache instance
const memoryCache = new MemoryCache();

// ============================================================================
// DATABASE CACHE
// ============================================================================

class DatabaseCache {
  /**
   * Get cached data from database
   */
  async get(key: string): Promise<CachedDurationData | null> {
    try {
      const cached = await prisma.salaryCalculationCache.findUnique({
        where: {
          id: key,
        },
      });

      if (!cached) {
        return null;
      }

      // Check if expired
      if (new Date() > cached.expiresAt) {
        await this.delete(key);
        return null;
      }

      return {
        data: cached.calculationData as any,
        generatedAt: cached.createdAt,
        expiresAt: cached.expiresAt,
        cacheKey: key,
      };
    } catch (error) {
      console.error("Database cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached data in database
   */
  async set(
    key: string,
    data: DurationReportResponse,
    ttl: number
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      await prisma.salaryCalculationCache.upsert({
        where: {
          id: key,
        },
        create: {
          id: key,
          teacherId: "system",
          period: data.month,
          calculationData: data as any,
          expiresAt,
        },
        update: {
          calculationData: data as any,
          expiresAt,
          updatedAt: now,
        },
      });
    } catch (error) {
      console.error("Database cache set error:", error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    try {
      await prisma.salaryCalculationCache.delete({
        where: {
          id: key,
        },
      });
    } catch (error) {
      console.error("Database cache delete error:", error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<number> {
    try {
      const result = await prisma.salaryCalculationCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error("Database cache clear expired error:", error);
      return 0;
    }
  }
}

// Global database cache instance
const databaseCache = new DatabaseCache();

// ============================================================================
// CACHE SERVICE
// ============================================================================

export class DurationCacheService {
  private static defaultConfig: CacheConfig = {
    ttl: 3600, // 1 hour
    refreshOnAccess: true,
    autoRefresh: false,
  };

  /**
   * Generate cache key
   */
  static generateKey(params: {
    month?: string;
    teacherId?: string;
    studentId?: number;
    filters?: string;
  }): string {
    const parts = ["duration"];

    if (params.month) parts.push(`m:${params.month}`);
    if (params.teacherId) parts.push(`t:${params.teacherId}`);
    if (params.studentId) parts.push(`s:${params.studentId}`);
    if (params.filters) parts.push(`f:${params.filters}`);

    return parts.join(":");
  }

  /**
   * Get cached data (checks memory first, then database)
   */
  static async get(
    key: string,
    config?: Partial<CacheConfig>
  ): Promise<CachedDurationData | null> {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Try memory cache first
    const memCached = memoryCache.get(key);
    if (memCached) {
      console.log(`✅ Cache HIT (memory): ${key}`);
      return memCached;
    }

    // Try database cache
    const dbCached = await databaseCache.get(key);
    if (dbCached) {
      console.log(`✅ Cache HIT (database): ${key}`);

      // Populate memory cache
      memoryCache.set(key, dbCached.data, finalConfig.ttl);

      return dbCached;
    }

    console.log(`❌ Cache MISS: ${key}`);
    return null;
  }

  /**
   * Set cached data (stores in both memory and database)
   */
  static async set(
    key: string,
    data: DurationReportResponse,
    config?: Partial<CacheConfig>
  ): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Store in memory cache
    memoryCache.set(key, data, finalConfig.ttl);

    // Store in database cache
    await databaseCache.set(key, data, finalConfig.ttl);

    console.log(`💾 Cached: ${key} (TTL: ${finalConfig.ttl}s)`);
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    memoryCache.delete(key);
    await databaseCache.delete(key);
    console.log(`🗑️ Cache deleted: ${key}`);
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    const stats = memoryCache.getStats();
    const matchingKeys = stats.keys.filter((key) => key.includes(pattern));

    let count = 0;
    for (const key of matchingKeys) {
      memoryCache.delete(key);
      await databaseCache.delete(key);
      count++;
    }

    console.log(`🗑️ Invalidated ${count} cache entries matching: ${pattern}`);
    return count;
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<void> {
    memoryCache.clear();
    console.log("🗑️ All memory cache cleared");
  }

  /**
   * Clear expired cache entries
   */
  static async clearExpired(): Promise<number> {
    const count = await databaseCache.clearExpired();
    console.log(`🗑️ Cleared ${count} expired cache entries`);
    return count;
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    memoryCache: {
      size: number;
      keys: string[];
    };
  } {
    return {
      memoryCache: memoryCache.getStats(),
    };
  }

  /**
   * Warm up cache for specific month
   */
  static async warmUp(month: string): Promise<void> {
    console.log(`🔥 Warming up cache for ${month}...`);

    const key = this.generateKey({ month });

    // Check if already cached
    const existing = await this.get(key);
    if (existing) {
      console.log(`✅ Cache already warm for ${month}`);
      return;
    }

    // This would be called with actual data from DurationService
    console.log(`⏳ Cache warmup scheduled for ${month}`);
  }

  /**
   * Get or compute (cache-aside pattern)
   */
  static async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get(key, config);
    if (cached) {
      return cached.data as any;
    }

    // Compute the value
    console.log(`⏳ Computing value for ${key}...`);
    const value = await computeFn();

    // Store in cache
    if (value) {
      await this.set(key, value as any, config);
    }

    return value;
  }
}

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

export class CacheInvalidation {
  /**
   * Invalidate cache when meeting is updated
   */
  static async onMeetingUpdate(
    teacherId: string,
    meetingDate: Date
  ): Promise<void> {
    const month = `${meetingDate.getFullYear()}-${String(
      meetingDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // Invalidate teacher-specific cache
    await DurationCacheService.invalidatePattern(`t:${teacherId}`);

    // Invalidate month cache
    await DurationCacheService.invalidatePattern(`m:${month}`);

    console.log(`🔄 Cache invalidated for teacher ${teacherId} in ${month}`);
  }

  /**
   * Invalidate cache for entire month
   */
  static async onMonthComplete(month: string): Promise<void> {
    await DurationCacheService.invalidatePattern(`m:${month}`);
    console.log(`🔄 Cache invalidated for month ${month}`);
  }

  /**
   * Schedule automatic cache cleanup
   */
  static scheduleCleanup(intervalMinutes: number = 60): NodeJS.Timeout {
    return setInterval(async () => {
      const count = await DurationCacheService.clearExpired();
      if (count > 0) {
        console.log(`🧹 Automatic cleanup: removed ${count} expired entries`);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export { memoryCache, databaseCache };
