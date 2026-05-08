import type { Request, Response, NextFunction } from "express";

interface Window {
  count: number;
  resetAt: number;
}

function getClientIp(req: Request): string {
  // req.ip is set by Express using the trust proxy configuration in app.ts.
  // With trust proxy: 1, Express peels off one trusted hop (the Replit edge
  // proxy) from the right of X-Forwarded-For, so an attacker cannot forge
  // their rate-limit key by adding fake IPs to the XFF header.
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function makeStore() {
  return new Map<string, Window>();
}

let purgeTimer: ReturnType<typeof setInterval> | null = null;

function ensurePurge(store: Map<string, Window>) {
  if (!purgeTimer) {
    purgeTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, win] of store.entries()) {
        if (now >= win.resetAt) store.delete(key);
      }
    }, 120_000);
    if (purgeTimer.unref) purgeTimer.unref();
  }
}

function makeRateLimiter(windowMs: number, max: number) {
  const store = makeStore();
  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    ensurePurge(store);
    const ip = getClientIp(req);
    const now = Date.now();
    let win = store.get(ip);
    if (!win || now >= win.resetAt) {
      win = { count: 0, resetAt: now + windowMs };
      store.set(ip, win);
    }
    win.count += 1;
    if (win.count > max) {
      const retryAfter = Math.ceil((win.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error: "Too many requests. Please wait before trying again.",
        retryAfter,
      });
      return;
    }
    next();
  };
}

// 25 req/min — protects expensive AI endpoints (/api/quiz, /api/study)
export const aiRateLimiter = makeRateLimiter(60_000, 25);

// 30 req/min — throttles classroom code lookup/enumeration attempts
// Allows legitimate 5-second polling (≤12 req/min) with headroom, while
// blocking automated code guessing against /api/room and /api/assignment.
export const lookupRateLimiter = makeRateLimiter(60_000, 30);
