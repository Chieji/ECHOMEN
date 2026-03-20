/**
 * Request Validation Middleware
 * Validates CSRF tokens, API keys, and request structure
 */

import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './logger';

interface ValidationOptions {
  requireApiKey?: boolean;
  requireCsrfToken?: boolean;
  requireSessionId?: boolean;
}

/**
 * CSRF Token Validation
 */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Skip for GET requests (idempotent)
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionId = req.headers['x-session-id'] as string;

  if (!csrfToken || !sessionId) {
    logSecurityEvent('CSRF_VALIDATION_FAILED', 'high', 'Missing CSRF token or session ID', {
      ipAddress: req.ip,
      path: req.path,
    });

    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Missing CSRF token or session ID',
    });
  }

  // Verify CSRF token format (should be UUID-like)
  if (!/^[a-f0-9\-]{36}$/.test(csrfToken)) {
    logSecurityEvent('CSRF_VALIDATION_FAILED', 'high', 'Invalid CSRF token format', {
      ipAddress: req.ip,
      path: req.path,
    });

    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Invalid CSRF token format',
    });
  }

  // In production, verify token against session store
  // For now, we accept valid format tokens
  (req as any).csrfToken = csrfToken;
  (req as any).sessionId = sessionId;

  next();
}

/**
 * API Key Validation
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    logSecurityEvent('API_KEY_VALIDATION_FAILED', 'high', 'Missing API key', {
      ipAddress: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Missing API key',
    });
  }

  // Verify API key (in production, check against database)
  const validKeys = [
    'echomen-secret-token-2026', // Development key
    process.env.ECHO_API_KEY,
  ].filter(Boolean);

  if (!validKeys.includes(apiKey)) {
    logSecurityEvent('API_KEY_VALIDATION_FAILED', 'high', 'Invalid API key', {
      ipAddress: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid API key',
    });
  }

  (req as any).apiKey = apiKey;
  next();
}

/**
 * Session ID Validation
 */
export function validateSessionId(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string;

  if (!sessionId) {
    logSecurityEvent('SESSION_VALIDATION_FAILED', 'medium', 'Missing session ID', {
      ipAddress: req.ip,
      path: req.path,
    });

    return res.status(400).json({
      error: 'Session validation failed',
      message: 'Missing session ID',
    });
  }

  // Verify session ID format
  if (!/^[a-zA-Z0-9\-_]{10,}$/.test(sessionId)) {
    logSecurityEvent('SESSION_VALIDATION_FAILED', 'medium', 'Invalid session ID format', {
      ipAddress: req.ip,
      path: req.path,
    });

    return res.status(400).json({
      error: 'Session validation failed',
      message: 'Invalid session ID format',
    });
  }

  (req as any).sessionId = sessionId;
  next();
}

/**
 * Request Body Validation
 */
export function validateRequestBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Basic validation - check required fields exist
      const body = req.body;

      if (!body || typeof body !== 'object') {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Request body must be a JSON object',
        });
      }

      // Validate against schema if provided
      if (schema && schema.validate) {
        const { error, value } = schema.validate(body);

        if (error) {
          logSecurityEvent('REQUEST_VALIDATION_FAILED', 'low', 'Invalid request body', {
            ipAddress: req.ip,
            path: req.path,
            error: error.message,
          });

          return res.status(400).json({
            error: 'Validation failed',
            message: error.message,
          });
        }

        req.body = value;
      }

      next();
    } catch (error: any) {
      logSecurityEvent('REQUEST_VALIDATION_ERROR', 'medium', error.message, {
        ipAddress: req.ip,
        path: req.path,
      });

      res.status(400).json({
        error: 'Request validation error',
        message: error.message,
      });
    }
  };
}

/**
 * Composite validation middleware
 */
export function validateRequest(options: ValidationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    if (options.requireCsrfToken !== false) {
      middlewares.push(validateCsrfToken);
    }

    if (options.requireApiKey !== false) {
      middlewares.push(validateApiKey);
    }

    if (options.requireSessionId !== false) {
      middlewares.push(validateSessionId);
    }

    // Execute middlewares in sequence
    let index = 0;

    const executeNext = () => {
      if (index < middlewares.length) {
        middlewares[index++](req, res, executeNext);
      } else {
        next();
      }
    };

    executeNext();
  };
}

/**
 * Input Sanitization
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"'`]/g, '') // Remove HTML/script characters
      .trim();
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = Array.isArray(input) ? [] : {};

    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }

    return sanitized;
  }

  return input;
}

/**
 * Content Security Headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  next();
}
