/**
 * Rate Limiting Middleware
 * Prevents abuse and DoS attacks with token bucket algorithm
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => req.ip || 'unknown',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.config.keyGenerator!(req);
      const now = Date.now();

      let record = this.store.get(key);

      // Initialize or reset if window expired
      if (!record || record.resetTime < now) {
        record = {
          count: 0,
          resetTime: now + this.config.windowMs,
        };
        this.store.set(key, record);
      }

      // Increment counter
      record.count++;

      // Set rate limit headers
      const remaining = Math.max(0, this.config.maxRequests - record.count);
      const resetTime = Math.ceil(record.resetTime / 1000);

      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      // Check if limit exceeded
      if (record.count > this.config.maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }

      // Store original send for response tracking
      const originalSend = res.send;
      const skipSuccessfulRequests = this.config.skipSuccessfulRequests;
      const skipFailedRequests = this.config.skipFailedRequests;
      
      res.send = function (data: any) {
        const statusCode = res.statusCode;

        // Skip counting based on response status
        if (
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)
        ) {
          record!.count--;
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  return new RateLimiter(config).middleware();
}

/**
 * Preset configurations
 */
export const rateLimitPresets = {
  // Strict: 10 requests per minute per IP
  strict: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),

  // Standard: 100 requests per minute per IP
  standard: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),

  // Relaxed: 1000 requests per minute per IP
  relaxed: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,
  }),

  // API: 60 requests per minute per API key
  api: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip || 'unknown',
  }),

  // Auth: 5 login attempts per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    skipSuccessfulRequests: true, // Only count failed attempts
  }),
};
