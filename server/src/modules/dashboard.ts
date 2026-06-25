import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, deriveEventStatus } from '../lib/utils';
import { authenticate } from '../middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const nextWeek   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const eventWhere = (from: Date, to: Date) => ({
      status: 'active' as const,
      startDatetime: { gte: from, lte: to },
      OR: [
        { createdBy: req.userId },
        { invitations: { some: { invitedUserId: req.userId, invitationStatus: 'accepted' } } },
      ],
    });

    const [todayRaw, upcomingRaw, recentInvitations] = await Promise.all([
      prisma.event.findMany({ where: eventWhere(todayStart, todayEnd), orderBy: { startDatetime: 'asc' } }),
      prisma.event.findMany({ where: eventWhere(todayEnd, nextWeek),   orderBy: { startDatetime: 'asc' }, take: 10 }),
      prisma.invitation.findMany({
        where: { invitedUserId: req.userId },
        include: { event: { include: { owner: { select: { id: true, name: true, email: true } } } } },
        orderBy: { invitedAt: 'desc' },
        take: 5,
      }),
    ]);

    const withStatus = (events: typeof todayRaw) =>
      events.map(e => ({ ...e, status: deriveEventStatus(e.status, e.endDatetime) }));

    successResponse(res, {
      todayEvents: withStatus(todayRaw),
      upcomingEvents: withStatus(upcomingRaw),
      recentInvitations,
    });
  } catch (err) { next(err); }
});

export default router;
