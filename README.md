# Caching via Service Worker

## Usage

```typescript
import { Caching } from "cache-sw";

const caching = new Caching({
  routeMatcher: (request) => {
    const url = new URL(request.url);
    if (url.port === "3001") return { strategy: "CacheFirst", options: { maxAge: 30 } };
    if (url.pathname === "/") return { strategy: "NetworkFirst" };
    if (request.destination === "script") return { strategy: "StaleWhileRevalidate" };
  }
});

self.addEventListener("fetch", (event) => {
  caching.applyCache(event);
});
```

## Caching strategies

There are 3 different cache strategies:
* NetworkFirst
* CacheFirst
* StaleWhileRevalidate

### NetworkFirst
- Try to fetch the response from the network
  - if the request succeeds the response will be cached and returned 
  - if the request fails due to network errors, fall back to a cached response if available (status 4xx/5xx are not considered)
  - otherwise rethrow the network error

### CacheFirst
- Return a cached response for the request
  - if no cached response is available reach out to the network
  - if the call to the network succeeds the response will be cached

### StaleWhileRevalidate
- Return a cached response for the request immediately (stale)
  - fetch and cache a fresh response from the network in the background (revalidate)

## Cacheable requests / cache key

By default both GET and POST requests are cacheable:
* for GET requests only the url is considered for the cache key (including query parameters)
* for POST requests the url and the request body is considered for the cache key

You can provide a custom cache key function via the ```generateCacheKey``` option.

```typescript
import { Caching } from "cache-sw";

const caching = new Caching({
  routeMatcher: (request) => ...
  /* Cache based on header value */
  generateCacheKey: async (request) => request.url + ":" + request.headers.get("x-my-header")
});
```

You can extend the default cache key generator by importing ```generateCacheKey```.
```typescript
import { Caching, generateCacheKey } from "cache-sw";

const caching = new Caching({
  routeMatcher: (request) => ...
  generateCacheKey: async (request) => {
    const cacheKey = await generateCacheKey(request);
    return cacheKey + ":" + request.headers.get("x-my-header");
  }
});
```
