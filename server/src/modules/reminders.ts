import { Router, Request, Response, NextFunction } from 'express';
import cron from 'node-cron';
import { Event } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateOccurrences } from '../lib/recurrence';
import { sendMail } from '../lib/mailer';
import { successResponse } from '../lib/utils';
import { authenticate } from '../middleware';

// ── Scheduling ────────────────────────────────────────────────

/**
 * Creates reminder_log rows for every future occurrence of an event for each userId.
 * If clearExisting=true, wipes pending logs first (used on event update/cancel).
 */
export async function scheduleReminders(
  event: Event,
  userIds: string[],
  clearExisting = false,
): Promise<void> {
  if (!event.reminderMinutesBefore || !event.reminderMethod) return;

  if (clearExisting) {
    await prisma.reminderLog.deleteMany({
      where: { eventId: event.id, deliveryStatus: 'pending' },
    });
  }

  const now = new Date();
  const occurrences = generateOccurrences(
    event.recurrenceType,
    event.startDatetime,
    event.endDatetime,
    event.repeatUntil,
    now, // only future occurrences
  );

  for (const userId of userIds) {
    for (const occ of occurrences) {
      const scheduledFor = new Date(occ.start.getTime() - event.reminderMinutesBefore * 60_000);
      if (scheduledFor <= now) continue; // occurrence already past

      await prisma.reminderLog.upsert({
        where: {
          eventId_userId_occurrenceDatetime_method: {
            eventId: event.id,
            userId,
            occurrenceDatetime: occ.start,
            method: event.reminderMethod,
          },
        },
        create: {
          eventId: event.id,
          userId,
          occurrenceDatetime: occ.start,
          method: event.reminderMethod,
          scheduledFor,
        },
        update: { scheduledFor, deliveryStatus: 'pending' },
      });
    }
  }
}

// ── Cron worker ───────────────────────────────────────────────

export function startReminderWorker(): void {
  cron.schedule('* * * * *', async () => {
    const due = await prisma.reminderLog.findMany({
      where: {
        scheduledFor: { lte: new Date() },
        deliveryStatus: 'pending',
        method: { in: ['email', 'both'] },
      },
      include: {
        event: { select: { title: true } },
        user: { select: { email: true, name: true } },
      },
    });

    for (const log of due) {
      try {
        await sendMail({
          to: log.user.email,
          subject: `Reminder: ${log.event.title}`,
          html: `<p>Hi ${log.user.name},</p>
                 <p>Your event <strong>${log.event.title}</strong> starts at
                 <strong>${log.occurrenceDatetime.toUTCString()}</strong>.</p>`,
        });
        await prisma.reminderLog.update({
          where: { id: log.id },
          data: { deliveryStatus: 'sent', sentAt: new Date() },
        });
      } catch (err) {
        console.error(`[Reminder worker] Failed for log ${log.id}:`, err);
        await prisma.reminderLog.update({
          where: { id: log.id },
          data: { deliveryStatus: 'failed' },
        });
      }
    }
  });

  console.log('⏰  Reminder worker started (runs every minute)');
}

// ── Router ────────────────────────────────────────────────────

const router = Router();
router.use(authenticate);

// GET /api/reminders/due — browser reminders ready to fire
router.get('/due', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await prisma.reminderLog.findMany({
      where: {
        userId: req.userId,
        scheduledFor: { lte: new Date() },
        deliveryStatus: 'pending',
        method: { in: ['browser', 'both'] },
      },
      include: { event: { select: { id: true, title: true } } },
    });
    successResponse(res, { reminders });
  } catch (err) { next(err); }
});

// PATCH /api/reminders/:id/acknowledge — frontend marks notification shown
router.patch('/:id/acknowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await prisma.reminderLog.findUnique({ where: { id: req.params.id } });
    if (!log || log.userId !== req.userId) {
      successResponse(res, { message: 'Not found' });
      return;
    }
    const reminder = await prisma.reminderLog.update({
      where: { id: req.params.id },
      data: { deliveryStatus: 'sent', sentAt: new Date() },
    });
    successResponse(res, { reminder });
  } catch (err) { next(err); }
});

export default router;
