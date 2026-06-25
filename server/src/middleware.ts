import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { verifyToken } from './lib/utils';
import { errorResponse } from './lib/utils';
import { env } from './config/env';

declare global {
  namespace Express {
    interface Request { userId: string; }
  }
}

// ── Auth ──────────────────────────────────────────────────────

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.token;
  if (!token) { errorResponse(res, 'Not authenticated', 401); return; }
  try {
    req.userId = verifyToken(token).userId;
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
}

// ── Validation ────────────────────────────────────────────────

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      errorResponse(res, 'Validation failed', 422, (result.error as ZodError).flatten().fieldErrors);
      return;
    }
    req.body = result.data;
    next();
  };
}

// ── Error handler ─────────────────────────────────────────────

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', err.message);
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  const message = env.NODE_ENV === 'production' && status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ success: false, message });
}
