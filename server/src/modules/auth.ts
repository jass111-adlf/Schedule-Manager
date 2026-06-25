import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken, successResponse } from '../lib/utils';
import { authenticate, validateRequest } from '../middleware';
import { env } from '../config/env';

// ── Validation ────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Service ───────────────────────────────────────────────────

function appError(message: string, statusCode: number) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

async function registerUser(input: z.infer<typeof registerSchema>) {
  if (await prisma.user.findUnique({ where: { email: input.email } }))
    throw appError('An account with this email already exists', 409);

  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });
}

async function loginUser(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const dummy = '$2a$12$invalidhashfortimingprotectionAAAAAAAAAAAAAAAAAAAAAAAAA';
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? dummy);
  if (!user || !valid) throw appError('Invalid email or password', 401);
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

// ── Controller helpers ────────────────────────────────────────

const cookieOpts = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// ── Router ────────────────────────────────────────────────────

const router = Router();

router.post('/register', validateRequest(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await registerUser(req.body);
    res.cookie('token', signToken({ userId: user.id }), cookieOpts());
    successResponse(res, { user }, 201);
  } catch (err) { next(err); }
});

router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await loginUser(req.body);
    res.cookie('token', signToken({ userId: user.id }), cookieOpts());
    successResponse(res, { user });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE });
  successResponse(res, { message: 'Logged out successfully' });
});

export default router;
