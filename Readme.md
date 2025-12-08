Escanor — understood.
Here is your **short professional README**, with a **clean placeholder section** for your upcoming documentation site.

This is the ideal balance: compact, usable, and ready for production.

---

# 🚀 **FINAL README.md (Short + Docs Link Placeholder)**

````md
# ForgeFetch
A TypeScript-first HTTP client with **retries, timeouts, caching, rate-limits, queueing, and middleware**, built on top of native `fetch`.

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

```


