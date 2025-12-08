# ForgeFetch
ForgeFetch is a TypeScript-first HTTP client designed to fix the limitations of native fetch() and make API communication reliable in real-world applications. While fetch is lightweight, it lacks essential production features like retries, timeouts, caching, rate limits, concurrency control, and middleware support. ForgeFetch layers these capabilities on top of the Fetch API with a clean, typed interface that behaves consistently in both Node and Browser environments.

The library provides automatic retry logic, AbortController-based timeouts, in-memory caching with TTL and LRU, a token-bucket rate limiter, a request queue for concurrency control, and a full middleware pipeline similar to Axios interceptors. With strong TypeScript typing, predictable behavior, and built-in resilience, ForgeFetch serves as a robust foundation for any application that relies heavily on HTTP requests—microservices, AI tools, dashboards, or modern full-stack apps.

---

## 📘 Documentation  
Full documentation (coming soon):  
👉 https://your-docs-link-here.com

---

## 📦 Install

```bash
npm install forgefetch
````

---

## ⚡ Quick Start

```ts
import { HttpClient } from "forgefetch";

const client = new HttpClient({
  maxRequestsPerSecond: 5,
  maxConcurrency: 2
});

const res = await client.sendRequest({
  url: "https://jsonplaceholder.typicode.com/todos/1",
  method: "GET",
  timeoutMs: 3000,
  retry: { retries: 2 }
});

console.log(res.data || res.body);
```

---

## 🗄️ Caching

```ts
await client.sendRequest({
  url: "https://example.com/data",
  method: "GET",
  cache: { enabled: true, durationMs: 5000 }
});
```

---

## 🔁 Retry

```ts
await client.sendRequest({
  url: "https://httpstat.us/500",
  method: "GET",
  retry: { retries: 3 }
});
```

---

## ⏱ Timeout

```ts
await client.sendRequest({
  url: "https://httpstat.us/200?sleep=6000",
  method: "GET",
  timeoutMs: 1000
});
```

---

## ⚡ Rate Limiting

```ts
const client = new HttpClient({ maxRequestsPerSecond: 1 });

await client.sendRequest({
  url: "https://api.example.com",
  method: "GET"
});
```

---

## 🧩 Middleware

**Before request:**

```ts
client.useBefore(req => {
  req.headers = { ...req.headers, Authorization: "Bearer token" };
  return req;
});
```

**After response:**

```ts
client.useAfter(res => {
  return { ...res, parsed: true };
});
```

---

## 🧠 Error Types

* `TimeoutError`
* `RateLimitError`
* `RetryLimitExceededError`
* `HTTPError`
* `NetworkError`

---

## 📜 License

MIT © 2025 Sahil Salunke


