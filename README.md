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
