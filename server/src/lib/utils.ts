import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { EventStatus } from '@prisma/client';
import { env } from '../config/env';

// ── JWT ───────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as JwtPayload;

// ── API responses ─────────────────────────────────────────────

export const successResponse = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ success: true, data });

export const errorResponse = (res: Response, message: string, status = 400, details?: unknown) =>
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });

// ── Derived event status ──────────────────────────────────────

export type DerivedStatus = 'upcoming' | 'completed' | 'cancelled';

export function deriveEventStatus(storedStatus: EventStatus, occurrenceEnd: Date): DerivedStatus {
  if (storedStatus === 'cancelled') return 'cancelled';
  return occurrenceEnd < new Date() ? 'completed' : 'upcoming';
}
