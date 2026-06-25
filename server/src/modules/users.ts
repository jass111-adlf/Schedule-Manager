import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../lib/utils';
import { authenticate } from '../middleware';

const router = Router();
router.use(authenticate);

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!user) { errorResponse(res, 'User not found', 404); return; }
    successResponse(res, { user });
  } catch (err) { next(err); }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req.query.email as string | undefined)?.trim();
    if (!email || email.length < 2) { errorResponse(res, 'Provide at least 2 characters to search', 400); return; }
    const users = await prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' }, NOT: { id: req.userId } },
      select: { id: true, name: true, email: true },
      take: 10,
    });
    successResponse(res, { users });
  } catch (err) { next(err); }
});

export default router;
