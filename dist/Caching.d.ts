declare type CacheStrategy = "StaleWhileRevalidate" | "CacheFirst" | "NetworkFirst";
declare type CacheOptions = {
    maxAge?: number;
};
declare type RouteMatcher = (request: Request) => {
    strategy: CacheStrategy;
    options?: CacheOptions;
} | undefined;
interface Options {
    routeMatcher: RouteMatcher;
    generateCacheKey?: (request: Request) => Promise<string>;
    cacheName?: string;
    /** IndexedDB database name */
    metadataStorageName?: string;
}
export declare class Caching {
    options: Options;
    private metadataStorage;
    constructor(options: Options);
    applyCache(event: FetchEvent): void;
    private staleWhileRevalidate;
    private cacheFirst;
    private networkFirst;
    private getCacheKey;
    private get cacheName();
    private isExpired;
    private getCachedResponse;
    private cacheResponse;
    fetchAndCache(request: Request, cache: Cache, cacheKey: string): Promise<Response>;
}
export declare function generateCacheKey(request: Request): Promise<string>;
export {};
