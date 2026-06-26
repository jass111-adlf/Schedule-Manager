import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../lib/utils';
import { authenticate, validateRequest } from '../middleware';

const router = Router();
router.use(authenticate);

const calSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
  visibility: z.enum(['public', 'private', 'share_only']).default('private'),
});

// GET /api/calendars — own calendars
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const calendars = await prisma.calendar.findMany({
      where: { userId: req.userId },
      include: { shares: { include: { sharedWith: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    successResponse(res, { calendars });
  } catch (err) { next(err); }
});

// GET /api/calendars/shared-with-me — calendars other users shared with me
router.get('/shared-with-me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shares = await prisma.calendarShare.findMany({
      where: { sharedWithId: req.userId },
      include: { calendar: { include: { owner: { select: { id: true, name: true, email: true } } } } },
    });
    successResponse(res, { calendars: shares.map(s => ({ ...s.calendar, sharedAt: s.createdAt })) });
  } catch (err) { next(err); }
});

// POST /api/calendars
router.post('/', validateRequest(calSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cal = await prisma.calendar.create({
      data: { userId: req.userId, name: req.body.name, color: req.body.color, visibility: req.body.visibility },
    });
    successResponse(res, { calendar: cal }, 201);
  } catch (err) { next(err); }
});

// PUT /api/calendars/:id
router.put('/:id', validateRequest(calSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cal = await prisma.calendar.findUnique({ where: { id: req.params.id } });
    if (!cal || cal.userId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    const updated = await prisma.calendar.update({ where: { id: req.params.id }, data: req.body });
    successResponse(res, { calendar: updated });
  } catch (err) { next(err); }
});

// DELETE /api/calendars/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cal = await prisma.calendar.findUnique({ where: { id: req.params.id } });
    if (!cal || cal.userId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    await prisma.calendar.delete({ where: { id: req.params.id } });
    successResponse(res, { message: 'Deleted' });
  } catch (err) { next(err); }
});

// POST /api/calendars/:id/shares — share with a user
router.post('/:id/shares', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId) { errorResponse(res, 'userId required', 400); return; }
    const cal = await prisma.calendar.findUnique({ where: { id: req.params.id } });
    if (!cal || cal.userId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    if (userId === req.userId) { errorResponse(res, 'Cannot share with yourself', 400); return; }
    const share = await prisma.calendarShare.upsert({
      where: { calendarId_sharedWithId: { calendarId: req.params.id, sharedWithId: userId } },
      create: { calendarId: req.params.id, sharedWithId: userId },
      update: {},
      include: { sharedWith: { select: { id: true, name: true, email: true } } },
    });
    successResponse(res, { share }, 201);
  } catch (err) { next(err); }
});

// DELETE /api/calendars/:id/shares/:userId — revoke share
router.delete('/:id/shares/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cal = await prisma.calendar.findUnique({ where: { id: req.params.id } });
    if (!cal || cal.userId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    await prisma.calendarShare.deleteMany({
      where: { calendarId: req.params.id, sharedWithId: req.params.userId },
    });
    successResponse(res, { message: 'Share revoked' });
  } catch (err) { next(err); }
});

export default router;
