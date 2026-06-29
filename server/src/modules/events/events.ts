import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, validateRequest } from '../../middleware';
import { successResponse } from '../../lib/utils';
import { inviteUser, inviteUserSchema } from '../invitations';
import * as svc from './events.service';

// ── Validation ────────────────────────────────────────────────

const base = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  location: z.string().max(255).optional(),
  startDatetime: z.string().datetime({ offset: true }),
  endDatetime: z.string().datetime({ offset: true }),
  allDay: z.boolean().default(false),
  visibility: z.enum(['private', 'invited_only', 'friends', 'public']).default('private'),
  eventType: z.enum(['work', 'personal', 'family', 'health', 'social', 'other']),
  timezone: z.string().min(1),
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  repeatUntil: z.string().date().optional(),
  customTypeId: z.string().uuid().optional(),
});

export const createEventSchema = base
  .refine(d => new Date(d.endDatetime) > new Date(d.startDatetime), { message: 'End must be after start', path: ['endDatetime'] })
  .refine(d => d.recurrenceType === 'none' || !!d.repeatUntil, { message: 'repeatUntil required for recurring events', path: ['repeatUntil'] });

export const updateEventSchema = base.partial()
  .refine(d => !(d.startDatetime && d.endDatetime) || new Date(d.endDatetime!) > new Date(d.startDatetime!), { message: 'End must be after start', path: ['endDatetime'] });

const rangeQuery = z.object({
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ── Router ────────────────────────────────────────────────────

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = rangeQuery.safeParse(req.query);
    const windowStart = q.success && q.data.start ? new Date(q.data.start) : undefined;
    const windowEnd   = q.success && q.data.end   ? new Date(q.data.end)   : undefined;
    const events = await svc.listEvents(req.userId, windowStart, windowEnd);
    successResponse(res, { events });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    successResponse(res, { event: await svc.getEventById(req.params.id, req.userId) });
  } catch (err) { next(err); }
});

router.post('/', validateRequest(createEventSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    successResponse(res, { event: await svc.createEvent(req.userId, req.body) }, 201);
  } catch (err) { next(err); }
});

router.put('/:id', validateRequest(updateEventSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    successResponse(res, { event: await svc.updateEvent(req.params.id, req.userId, req.body) });
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    successResponse(res, { event: await svc.cancelEvent(req.params.id, req.userId) });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteEvent(req.params.id, req.userId);
    successResponse(res, { message: 'Event deleted' });
  } catch (err) { next(err); }
});

router.post('/:eventId/invitations', validateRequest(inviteUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitation = await inviteUser(req.params.eventId, req.userId, req.body.userId);
    successResponse(res, { invitation }, 201);
  } catch (err) { next(err); }
});

export default router;
