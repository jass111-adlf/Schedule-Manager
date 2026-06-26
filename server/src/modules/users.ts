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
    const q = (req.query.q as string | undefined)?.trim()
           ?? (req.query.email as string | undefined)?.trim();
    if (!q || q.length < 2) { errorResponse(res, 'Provide at least 2 characters', 400); return; }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name:  { contains: q, mode: 'insensitive' } },
        ],
        NOT: { id: req.userId },
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });

    // Attach friendship status for each result
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: { in: users.map(u => u.id) } },
          { addresseeId: req.userId, requesterId: { in: users.map(u => u.id) } },
        ],
      },
    });

    const withStatus = users.map(u => {
      const f = friendships.find(fr => fr.requesterId === u.id || fr.addresseeId === u.id);
      return { ...u, friendshipId: f?.id ?? null, friendshipStatus: f?.status ?? null, iRequested: f?.requesterId === req.userId };
    });

    successResponse(res, { users: withStatus });
  } catch (err) { next(err); }
});

// GET /api/users/:id/calendars — public + shared + friend calendars of another user
router.get('/:id/calendars', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.userId) { errorResponse(res, 'Use /api/calendars for your own', 400); return; }

    // Check friendship
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: req.userId, addresseeId: targetId },
          { requesterId: targetId,   addresseeId: req.userId },
        ],
      },
    });
    const isFriend = !!friendship;

    // Visible calendars: public always, share_only if shared with me, (friends) same as public when friends
    const sharedIds = (await prisma.calendarShare.findMany({
      where: { calendarId: { in: (await prisma.calendar.findMany({ where: { userId: targetId }, select: { id: true } })).map(c => c.id) }, sharedWithId: req.userId },
      select: { calendarId: true },
    })).map(s => s.calendarId);

    const visibilities: ('public' | 'private' | 'share_only')[] = isFriend ? ['public', 'share_only'] : ['public'];

    const calendars = await prisma.calendar.findMany({
      where: {
        userId: targetId,
        OR: [
          { visibility: { in: visibilities } },
          { id: { in: sharedIds } },
        ],
      },
      select: { id: true, name: true, color: true, visibility: true },
    });

    successResponse(res, { calendars, isFriend });
  } catch (err) { next(err); }
});

export default router;
