"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCacheKey = exports.Caching = void 0;
const MetadataStorage_1 = require("./MetadataStorage");
const util_1 = require("./util");
class Caching {
    constructor(options) {
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: options
        });
        Object.defineProperty(this, "metadataStorage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.metadataStorage = new MetadataStorage_1.MetadataStorage(options.metadataStorageName || "ServiceWorkerCache");
    }
    applyCache(event) {
        const request = event.request;
        if (request.method !== "POST" && request.method !== "GET")
            return;
        const route = this.options.routeMatcher(request);
        if (!route)
            return;
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
    staleWhileRevalidate(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = yield caches.open(this.cacheName);
            const cacheKey = yield this.getCacheKey(request);
            const cachedResponse = yield this.getCachedResponse(cache, cacheKey, options);
            // Do not await here, to allow early return with cached response
            const response = this.fetchAndCache(request, cache, cacheKey);
            if (cachedResponse) {
                return cachedResponse;
            }
            return response;
        });
    }
    cacheFirst(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = yield caches.open(this.cacheName);
            const cacheKey = yield this.getCacheKey(request);
            const cachedResponse = yield this.getCachedResponse(cache, cacheKey, options);
            if (cachedResponse) {
                return cachedResponse;
            }
            return this.fetchAndCache(request, cache, cacheKey);
        });
    }
    networkFirst(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cache = yield caches.open(this.cacheName);
            const cacheKey = yield this.getCacheKey(request);
            try {
                // The await is required here to catch the error
                return yield this.fetchAndCache(request, cache, cacheKey);
            }
            catch (err) {
                // Network error (status 4xx/5xx do not throw)
                const cachedResponse = yield this.getCachedResponse(cache, cacheKey, options);
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Rethrow if no cached response is available
                throw err;
            }
        });
    }
    getCacheKey(request) {
        return __awaiter(this, void 0, void 0, function* () {
            // Clone request, so that the cacheKey generator can safely consume the request body
            const req = request.clone();
            const cacheKey = this.options.generateCacheKey || generateCacheKey;
            return cacheKey(req);
        });
    }
    get cacheName() {
        return this.options.cacheName || "Cache";
    }
    isExpired(cacheKey, maxAge = 600) {
        return __awaiter(this, void 0, void 0, function* () {
            const metadata = yield this.metadataStorage.getMetadata(cacheKey);
            if (!metadata)
                return true;
            return Date.now() > metadata.timestamp + maxAge * 1000;
        });
    }
    getCachedResponse(cache, cacheKey, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedResponse = yield cache.match(cacheKey);
            if (!cachedResponse)
                return undefined;
            const expired = yield this.isExpired(cacheKey, options === null || options === void 0 ? void 0 : options.maxAge);
            return expired ? undefined : cachedResponse;
        });
    }
    cacheResponse(cache, cacheKey, response) {
        return __awaiter(this, void 0, void 0, function* () {
            this.metadataStorage.saveMetadata({ cacheKey, timestamp: Date.now() });
            return cache.put(cacheKey, response);
        });
    }
    fetchAndCache(request, cache, cacheKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(request);
            // Do not cache error responses
            if (response.ok) {
                this.cacheResponse(cache, cacheKey, response.clone());
            }
            return response;
        });
    }
}
exports.Caching = Caching;
function generateCacheKey(request) {
    return __awaiter(this, void 0, void 0, function* () {
        if (request.method !== "POST")
            return request.url + ":" + request.method;
        const requestBody = yield request.arrayBuffer();
        const bodyHash = yield (0, util_1.hash)(requestBody);
        const cacheKey = request.url + ":" + request.method + ":" + bodyHash;
        return cacheKey;
    });
}
exports.generateCacheKey = generateCacheKey;
