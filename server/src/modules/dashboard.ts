import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, deriveEventStatus } from '../lib/utils';
import { generateOccurrences } from '../lib/recurrence';
import { authenticate } from '../middleware';

const router = Router();
router.use(authenticate);

/**
 * Fetch events that could have any occurrence in [from, to].
 * Non-recurring: their one occurrence must overlap the window.
 * Recurring:     the series must have started by windowEnd AND repeatUntil is at or after windowStart.
 */
function candidateWhere(userId: string, from: Date, to: Date) {
  return {
    status: 'active' as const,
    startDatetime: { lte: to },   // series starts before window ends
    AND: [
      {
        OR: [
          // Non-recurring: first (only) occurrence ends after window start
          { recurrenceType: 'none' as const,    endDatetime: { gte: from } },
          // Recurring: series is still running at window start
          { recurrenceType: 'daily' as const,   repeatUntil: { gte: from } },
          { recurrenceType: 'weekly' as const,  repeatUntil: { gte: from } },
          { recurrenceType: 'monthly' as const, repeatUntil: { gte: from } },
        ],
      },
      {
        OR: [
          { createdBy: userId },
          { invitations: { some: { invitedUserId: userId, invitationStatus: 'accepted' as const } } },
        ],
      },
    ],
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(),  0,  0,  0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const nextWeek   = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [todayCandidates, upcomingCandidates, recentInvitations] = await Promise.all([
      prisma.event.findMany({
        where: candidateWhere(req.userId, todayStart, todayEnd),
        include: { customType: { select: { name: true, color: true } } },
      }),
      prisma.event.findMany({
        where: candidateWhere(req.userId, todayEnd, nextWeek),
        include: { customType: { select: { name: true, color: true } } },
      }),
      prisma.invitation.findMany({
        where: { invitedUserId: req.userId },
        include: { event: { include: { owner: { select: { id: true, name: true, email: true } } } } },
        orderBy: { invitedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Expand recurring events into individual occurrences within the window
    function expand(candidates: typeof todayCandidates, from: Date, to: Date) {
      const expanded: object[] = [];
      for (const e of candidates) {
        const occs = generateOccurrences(e.recurrenceType, e.startDatetime, e.endDatetime, e.repeatUntil, from, to);
        for (const occ of occs) {
          expanded.push({
            id:                   e.id,
            title:                e.title,
            description:          e.description,
            location:             e.location,
            allDay:               e.allDay,
            visibility:           e.visibility,
            eventType:            e.eventType,
            customTypeId:         e.customTypeId,
            customType:           e.customType,
            reminderMinutesBefore: e.reminderMinutesBefore,
            reminderMethod:       e.reminderMethod,
            timezone:             e.timezone,
            recurrenceType:       e.recurrenceType,
            repeatUntil:          e.repeatUntil,
            createdBy:            e.createdBy,
            createdAt:            e.createdAt,
            updatedAt:            e.updatedAt,
            start:                occ.start.toISOString(),
            end:                  occ.end.toISOString(),
            status:               deriveEventStatus(e.status, occ.end),
          });
        }
      }
      return expanded.sort((a: any, b: any) => {
        // All-day first, then by start time
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    }

    successResponse(res, {
      todayEvents:       expand(todayCandidates,    todayStart, todayEnd),
      upcomingEvents:    expand(upcomingCandidates, todayEnd,   nextWeek),
      recentInvitations,
    });
  } catch (err) { next(err); }
});

export default router;
