import { ApplicationSettings } from '@nativescript/core';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

export interface WebhookCache {
    url: string;
    response: any;
    timestamp: number;
    ttl: number;
}

export class CacheService {
    private readonly CACHE_PREFIX = 'cache_';
    private readonly DEFAULT_TTL = 300000; // 5 minutes in milliseconds
    private readonly MAX_CACHE_SIZE = 50;

    /**
     * Get cached value
     */
    public get<T>(key: string): T | null {
        const cacheKey = this.CACHE_PREFIX + key;
        const cached = ApplicationSettings.getString(cacheKey);
        
        if (cached) {
            try {
                const entry: CacheEntry<T> = JSON.parse(cached);
                
                // Check if cache has expired
                if (Date.now() - entry.timestamp > entry.ttl) {
                    this.remove(key);
                    return null;
                }
                
                return entry.data;
            } catch (e) {
                console.error('Error parsing cache entry:', e);
                return null;
            }
        }
        return null;
    }

    /**
     * Set cached value with optional TTL
     */
    public set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        const cacheKey = this.CACHE_PREFIX + key;
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl
        };
        
        ApplicationSettings.setString(cacheKey, JSON.stringify(entry));
        
        // Clean up old cache entries if we exceed max size
        this.cleanupCache();
    }

    /**
     * Remove cached value
     */
    public remove(key: string): void {
        const cacheKey = this.CACHE_PREFIX + key;
        ApplicationSettings.remove(cacheKey);
    }

    /**
     * Clear all cache
     */
    public clearAll(): void {
        const allKeys = ApplicationSettings.allKeys();
        allKeys.forEach(key => {
            if (key.startsWith(this.CACHE_PREFIX)) {
                ApplicationSettings.remove(key);
            }
        });
    }

    /**
     * Check if cache key exists and is valid
     */
    public has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Get cache statistics
     */
    public getStats(): { size: number; keys: string[] } {
        this.cleanupExpired();
        const allKeys = ApplicationSettings.allKeys();
        const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));
        return {
            size: cacheKeys.length,
            keys: cacheKeys.map(k => k.replace(this.CACHE_PREFIX, ''))
        };
    }

    /**
     * TTL-based cleanup – odstraní všechny expirované (a poškozené) záznamy z cache.
     * @returns Počet odstraněných záznamů.
     */
    public cleanupExpired(): number {
        let removed = 0;
        const allKeys = ApplicationSettings.allKeys();

        allKeys.forEach(key => {
            if (!key.startsWith(this.CACHE_PREFIX)) {
                return;
            }
            const cached = ApplicationSettings.getString(key);
            if (!cached) {
                return;
            }
            try {
                const entry: CacheEntry<any> = JSON.parse(cached);
                if (Date.now() - entry.timestamp > entry.ttl) {
                    ApplicationSettings.remove(key);
                    removed++;
                }
            } catch {
                // Poškozený záznam odstraníme, aby nezabíral místo
                ApplicationSettings.remove(key);
                removed++;
            }
        });

        return removed;
    }

    /**
     * Size-based eviction – pokud cache překročí maximální velikost,
     * odstraní nejstarší záznamy (podle timestamp) až do dosažení limitu.
     * @returns Počet odstraněných záznamů.
     */
    public evictBySize(): number {
        const entries = this.getEntriesWithTimestamps();
        let removed = 0;

        while (entries.length > this.MAX_CACHE_SIZE) {
            const oldest = entries.shift();
            if (!oldest) {
                break;
            }
            ApplicationSettings.remove(oldest.key);
            removed++;
        }

        return removed;
    }

    private getEntriesWithTimestamps(): Array<{ key: string; timestamp: number }> {
        const allKeys = ApplicationSettings.allKeys();
        const entries: Array<{ key: string; timestamp: number }> = [];

        allKeys.forEach(key => {
            if (!key.startsWith(this.CACHE_PREFIX)) {
                return;
            }
            const cached = ApplicationSettings.getString(key);
            if (cached) {
                try {
                    const entry: CacheEntry<any> = JSON.parse(cached);
                    entries.push({ key, timestamp: entry.timestamp });
                } catch {
                    entries.push({ key, timestamp: 0 });
                }
            } else {
                entries.push({ key, timestamp: 0 });
            }
        });

        // Nejstarší záznamy první (LRU-like evikce podle stáří záznamu)
        entries.sort((a, b) => a.timestamp - b.timestamp);
        return entries;
    }

    /**
     * Kompletní údržba cache – TTL cleanup + size-based eviction.
     * Volá se automaticky po každém zápisu do cache.
     */
    private cleanupCache(): void {
        this.cleanupExpired();
        this.evictBySize();
    }

    /**
     * Webhook specific caching
     */
    public getWebhookCache(url: string): WebhookCache | null {
        return this.get<WebhookCache>(`webhook_${url}`);
    }

    public setWebhookCache(url: string, response: any, ttl: number = this.DEFAULT_TTL): void {
        const cache: WebhookCache = {
            url,
            response,
            timestamp: Date.now(),
            ttl
        };
        this.set(`webhook_${url}`, cache, ttl);
    }

    public clearWebhookCache(url?: string): void {
        if (url) {
            this.remove(`webhook_${url}`);
        } else {
            const allKeys = ApplicationSettings.allKeys();
            allKeys.forEach(key => {
                if (key.startsWith(this.CACHE_PREFIX + 'webhook_')) {
                    ApplicationSettings.remove(key);
                }
            });
        }
    }

    /**
     * Cache with automatic invalidation on error
     */
    public async withCache<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = this.DEFAULT_TTL,
        cacheOnError: boolean = false
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached) {
            return cached;
        }

        try {
            const data = await fetcher();
            this.set(key, data, ttl);
            return data;
        } catch (error) {
            if (cacheOnError) {
                this.set(key, error as T, ttl);
            }
            throw error;
        }
    }

    /**
     * Prefetch and cache data
     */
    public async prefetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = this.DEFAULT_TTL
    ): Promise<void> {
        const cached = this.get<T>(key);
        if (!cached) {
            try {
                const data = await fetcher();
                this.set(key, data, ttl);
            } catch (error) {
                console.error('Prefetch failed:', error);
            }
        }
    }
}
