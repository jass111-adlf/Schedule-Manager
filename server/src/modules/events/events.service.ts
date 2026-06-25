import { prisma } from '../../lib/prisma';
import { generateOccurrences } from '../../lib/recurrence';
import { deriveEventStatus } from '../../lib/utils';
import { scheduleReminders } from '../reminders';
import type { CreateEventInput, UpdateEventInput } from './events';

function appError(message: string, statusCode: number) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

export interface EventOccurrence {
  id: string; title: string; description: string | null; location: string | null;
  allDay: boolean; visibility: string; eventType: string;
  reminderMinutesBefore: number | null; reminderMethod: string | null;
  timezone: string; recurrenceType: string; repeatUntil: Date | null;
  createdBy: string; createdAt: Date; updatedAt: Date;
  start: Date; end: Date; status: 'upcoming' | 'completed' | 'cancelled';
}

export async function listEvents(userId: string, windowStart?: Date, windowEnd?: Date): Promise<EventOccurrence[]> {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { createdBy: userId },
        { invitations: { some: { invitedUserId: userId, invitationStatus: 'accepted' } } },
      ],
    },
  });

  const occurrences: EventOccurrence[] = [];
  for (const event of events) {
    for (const occ of generateOccurrences(event.recurrenceType, event.startDatetime, event.endDatetime, event.repeatUntil, windowStart, windowEnd)) {
      occurrences.push({
        id: event.id, title: event.title, description: event.description, location: event.location,
        allDay: event.allDay, visibility: event.visibility, eventType: event.eventType,
        reminderMinutesBefore: event.reminderMinutesBefore, reminderMethod: event.reminderMethod,
        timezone: event.timezone, recurrenceType: event.recurrenceType, repeatUntil: event.repeatUntil,
        createdBy: event.createdBy, createdAt: event.createdAt, updatedAt: event.updatedAt,
        start: occ.start, end: occ.end, status: deriveEventStatus(event.status, occ.end),
      });
    }
  }
  return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function getEventById(eventId: string, userId: string) {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      OR: [
        { createdBy: userId },
        { invitations: { some: { invitedUserId: userId, invitationStatus: 'accepted' } } },
      ],
    },
    include: { invitations: { include: { invitedUser: { select: { id: true, name: true, email: true } } } } },
  });
  if (!event) throw appError('Event not found', 404);
  return { ...event, status: deriveEventStatus(event.status, event.endDatetime) };
}

export async function createEvent(userId: string, input: CreateEventInput) {
  const event = await prisma.event.create({
    data: {
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      startDatetime: new Date(input.startDatetime),
      endDatetime: new Date(input.endDatetime),
      allDay: input.allDay,
      visibility: input.visibility,
      eventType: input.eventType,
      reminderMinutesBefore: input.reminderMinutesBefore ?? null,
      reminderMethod: input.reminderMethod ?? null,
      timezone: input.timezone,
      recurrenceType: input.recurrenceType,
      repeatUntil: input.repeatUntil ? new Date(input.repeatUntil) : null,
    },
  });
  await scheduleReminders(event, [userId]);
  return event;
}

export async function updateEvent(eventId: string, userId: string, input: UpdateEventInput) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw appError('Event not found', 404);
  if (existing.createdBy !== userId) throw appError('Only the event owner can edit this event', 403);

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.startDatetime !== undefined && { startDatetime: new Date(input.startDatetime) }),
      ...(input.endDatetime !== undefined && { endDatetime: new Date(input.endDatetime) }),
      ...(input.allDay !== undefined && { allDay: input.allDay }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.eventType !== undefined && { eventType: input.eventType }),
      ...(input.reminderMinutesBefore !== undefined && { reminderMinutesBefore: input.reminderMinutesBefore }),
      ...(input.reminderMethod !== undefined && { reminderMethod: input.reminderMethod }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.recurrenceType !== undefined && { recurrenceType: input.recurrenceType }),
      ...(input.repeatUntil !== undefined && { repeatUntil: input.repeatUntil ? new Date(input.repeatUntil) : null }),
    },
  });

  // Re-schedule for all participants (owner + accepted invitees)
  const invitees = await prisma.invitation.findMany({
    where: { eventId, invitationStatus: 'accepted' },
    select: { invitedUserId: true },
  });
  await scheduleReminders(updated, [userId, ...invitees.map(i => i.invitedUserId)], true);
  return updated;
}

export async function cancelEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw appError('Event not found', 404);
  if (event.createdBy !== userId) throw appError('Only the event owner can cancel this event', 403);
  if (event.status === 'cancelled') throw appError('Event is already cancelled', 409);

  // Cancel all pending reminders
  await prisma.reminderLog.deleteMany({ where: { eventId, deliveryStatus: 'pending' } });
  return prisma.event.update({ where: { id: eventId }, data: { status: 'cancelled' } });
}

export async function deleteEvent(eventId: string, userId: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw appError('Event not found', 404);
  if (event.createdBy !== userId) throw appError('Only the event owner can delete this event', 403);
  await prisma.event.delete({ where: { id: eventId } }); // cascades reminder_logs
}
