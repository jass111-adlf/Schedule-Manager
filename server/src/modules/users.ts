import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse, deriveEventStatus } from '../lib/utils';
import { generateOccurrences } from '../lib/recurrence';
import { authenticate } from '../middleware';

const router = Router();
router.use(authenticate);

// GET /api/users/me
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

// GET /api/users/search?q= — search by name or email, includes friendship status
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = ((req.query.q ?? req.query.email) as string | undefined)?.trim();
    if (!q || q.length < 2) { errorResponse(res, 'Provide at least 2 characters', 400); return; }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name:  { contains: q, mode: 'insensitive' } },
        ],
        NOT: { id: req.userId },
      },
      select: { id: true, name: true, email: true, createdAt: true },
      take: 10,
    });

    const ids = users.map(u => u.id);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: { in: ids } },
          { addresseeId: req.userId, requesterId: { in: ids } },
        ],
      },
    });

    const withStatus = users.map(u => {
      const f = friendships.find(fr => fr.requesterId === u.id || fr.addresseeId === u.id);
      return {
        ...u,
        friendshipId:     f?.id ?? null,
        friendshipStatus: f?.status ?? null,
        iRequested:       f?.requesterId === req.userId,
      };
    });

    successResponse(res, { users: withStatus });
  } catch (err) { next(err); }
});

// GET /api/users/:id/events
// Returns the target user's upcoming events.
// Events the viewer qualifies to see get full details.
// Events they don't qualify for return as grey blocks { visible: false, start, end }.
// Qualification rules:
//   public      → always visible
//   friends     → visible if accepted friend
//   invited_only → visible if viewer has an invitation for this event
//   private     → never visible to others (grey block)
router.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.userId) { errorResponse(res, 'Use /api/events for your own events', 400); return; }

    // Check friendship once
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

    const startParam = req.query.start as string | undefined;
    const endParam   = req.query.end   as string | undefined;
    const now        = new Date();
    const windowStart = startParam ? new Date(startParam) : now;
    const windowEnd   = endParam   ? new Date(endParam)   : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Fetch candidates: events that could have any occurrence in [windowStart, windowEnd]
    const candidates = await prisma.event.findMany({
      where: {
        createdBy: targetId,
        status: 'active',
        startDatetime: { lte: windowEnd },
        OR: [
          { recurrenceType: 'none',    endDatetime:  { gte: windowStart } },
          { recurrenceType: 'daily',   repeatUntil:  { gte: windowStart } },
          { recurrenceType: 'weekly',  repeatUntil:  { gte: windowStart } },
          { recurrenceType: 'monthly', repeatUntil:  { gte: windowStart } },
        ],
      },
      include: {
        customType: { select: { name: true, color: true } },
        invitations: {
          where: { invitedUserId: req.userId },
          select: { invitationStatus: true },
        },
      },
      orderBy: { startDatetime: 'asc' },
    });

    // Expand recurring events and apply visibility rules per occurrence
    const mapped: object[] = [];
    for (const e of candidates) {
      const isInvited = e.invitations.length > 0;
      const canSee =
        e.visibility === 'public' ||
        (e.visibility === 'friends' && isFriend) ||
        (e.visibility === 'invited_only' && isInvited);

      const occs = generateOccurrences(
        e.recurrenceType, e.startDatetime, e.endDatetime, e.repeatUntil,
        windowStart, windowEnd,
      );

      for (const occ of occs) {
        if (canSee) {
          mapped.push({
            id: e.id,
            visible: true,
            title: e.title,
            description: e.description,
            location: e.location,
            start: occ.start.toISOString(),
            end: occ.end.toISOString(),
            allDay: e.allDay,
            eventType: e.eventType,
            customType: e.customType,
            visibility: e.visibility,
            status: deriveEventStatus(e.status, occ.end),
            timezone: e.timezone,
          });
        } else {
          mapped.push({
            id: e.id,
            visible: false,
            start: occ.start.toISOString(),
            end: occ.end.toISOString(),
            allDay: e.allDay,
            timezone: e.timezone,
          });
        }
      }
    }

    // Sort: all-day first, then by start time
    mapped.sort((a: any, b: any) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

    const ownerTimezone = candidates[0]?.timezone ?? 'UTC';
    successResponse(res, { events: mapped, isFriend, ownerTimezone });
  } catch (err) { next(err); }
});

export default router;
