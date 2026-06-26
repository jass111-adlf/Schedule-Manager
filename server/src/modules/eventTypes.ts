import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../lib/utils';
import { authenticate, validateRequest } from '../middleware';

const router = Router();
router.use(authenticate);

const typeSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6b7280'),
});

// GET /api/event-types
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await prisma.customEventType.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    successResponse(res, { types });
  } catch (err) { next(err); }
});

// POST /api/event-types
router.post('/', validateRequest(typeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = await prisma.customEventType.create({
      data: { userId: req.userId, name: req.body.name, color: req.body.color },
    });
    successResponse(res, { type }, 201);
  } catch (err) { next(err); }
});

// PUT /api/event-types/:id
router.put('/:id', validateRequest(typeSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.customEventType.findUnique({ where: { id: req.params.id } });
    if (!t || t.userId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    const updated = await prisma.customEventType.update({ where: { id: req.params.id }, data: req.body });
    successResponse(res, { type: updated });
  } catch (err) { next(err); }
});

// DELETE /api/event-types/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.customEventType.findUnique({ where: { id: req.params.id } });
    if (!t || t.userId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    await prisma.customEventType.delete({ where: { id: req.params.id } });
    successResponse(res, { message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
