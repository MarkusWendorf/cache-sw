import { MetadataStorage } from "./MetadataStorage";
import { hash } from "./util";

type CacheStrategy = "StaleWhileRevalidate" | "CacheFirst" | "NetworkFirst";
type CacheOptions = { maxAge?: number };
type RouteMatcher = (
  request: Request
) => { strategy: CacheStrategy; options?: CacheOptions } | undefined;

interface Options {
  routeMatcher: RouteMatcher;
  generateCacheKey?: (request: Request) => Promise<string>;
  cacheName?: string;
  /** IndexedDB database name */
  metadataStorageName?: string;
}

export class Caching {
  private metadataStorage: MetadataStorage;

  constructor(public options: Options) {
    this.metadataStorage = new MetadataStorage(
      options.metadataStorageName || "ServiceWorkerCache"
    );
  }

  applyCache(event: FetchEvent) {
    const request = event.request;
    if (request.method !== "POST" && request.method !== "GET") return;

    const route = this.options.routeMatcher(request);
    if (!route) return;

    const { strategy, options } = route;

    switch (strategy) {
      case "CacheFirst":
        return event.respondWith(this.cacheFirst(request, options));
      case "StaleWhileRevalidate":
        return event.respondWith(this.staleWhileRevalidate(request, options));
      case "NetworkFirst":
        return event.respondWith(this.networkFirst(request, options));
    }
  }

  private async staleWhileRevalidate(
    request: Request,
    options?: CacheOptions
  ): Promise<Response> {
    const cache = await caches.open(this.cacheName);
    const cacheKey = await this.getCacheKey(request);
    const cachedResponse = await this.getCachedResponse(
      cache,
      cacheKey,
      options
    );

    // Do not await here, to allow early return with cached response
    const response = this.fetchAndCache(request, cache, cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    return response;
  }

  private async cacheFirst(
    request: Request,
    options?: CacheOptions
  ): Promise<Response> {
    const cache = await caches.open(this.cacheName);
    const cacheKey = await this.getCacheKey(request);
    const cachedResponse = await this.getCachedResponse(
      cache,
      cacheKey,
      options
    );

    if (cachedResponse) {
      return cachedResponse;
    }

    return this.fetchAndCache(request, cache, cacheKey);
  }

  private async networkFirst(
    request: Request,
    options?: CacheOptions
  ): Promise<Response> {
    const cache = await caches.open(this.cacheName);
    const cacheKey = await this.getCacheKey(request);

    try {
      // The await is required here to catch the error
      return await this.fetchAndCache(request, cache, cacheKey);
    } catch (err) {
      // Network error (status 4xx/5xx do not throw)
      const cachedResponse = await this.getCachedResponse(
        cache,
        cacheKey,
        options
      );

      if (cachedResponse) {
        return cachedResponse;
      }

      // Rethrow if no cached response is available
      throw err;
    }
  }

  private async getCacheKey(request: Request) {
    // Clone request, so that the cacheKey generator can safely consume the request body
    const req = request.clone();
    const cacheKey = this.options.generateCacheKey || generateCacheKey;

    return cacheKey(req);
  }

  private get cacheName() {
    return this.options.cacheName || "Cache";
  }

  private async isExpired(cacheKey: string, maxAge = 600) {
    const metadata = await this.metadataStorage.getMetadata(cacheKey);
    if (!metadata) return true;

    return Date.now() > metadata.timestamp + maxAge * 1000;
  }

  private async getCachedResponse(
    cache: Cache,
    cacheKey: string,
    options?: CacheOptions
  ) {
    const cachedResponse = await cache.match(cacheKey);
    if (!cachedResponse) return undefined;

    const expired = await this.isExpired(cacheKey, options?.maxAge);
    return expired ? undefined : cachedResponse;
  }

  private async cacheResponse(
    cache: Cache,
    cacheKey: string,
    response: Response
  ) {
    this.metadataStorage.saveMetadata({ cacheKey, timestamp: Date.now() });
    return cache.put(cacheKey, response);
  }

  async fetchAndCache(request: Request, cache: Cache, cacheKey: string) {
    const response = await fetch(request);

    // Do not cache error responses
    if (response.ok) {
      this.cacheResponse(cache, cacheKey, response.clone());
    }

    return response;
  }
}

export async function generateCacheKey(request: Request): Promise<string> {
  if (request.method !== "POST") return request.url + ":" + request.method;

  const requestBody = await request.arrayBuffer();
  const bodyHash = await hash(requestBody);
  const cacheKey = request.url + ":" + request.method + ":" + bodyHash;

  return cacheKey;
}
