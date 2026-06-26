import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../lib/utils';
import { authenticate } from '../middleware';

const router = Router();
router.use(authenticate);

// Helper: find a friendship record in either direction
async function findFriendship(userA: string, userB: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
}

// GET /api/friends — accepted friends
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: req.userId }, { addresseeId: req.userId }],
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        addressee: { select: { id: true, name: true, email: true } },
      },
    });
    const friends = rows.map(r => r.requesterId === req.userId ? r.addressee : r.requester);
    successResponse(res, { friends });
  } catch (err) { next(err); }
});

// GET /api/friends/requests — incoming pending requests
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await prisma.friendship.findMany({
      where: { addresseeId: req.userId, status: 'pending' },
      include: { requester: { select: { id: true, name: true, email: true } } },
    });
    successResponse(res, { requests: rows });
  } catch (err) { next(err); }
});

// POST /api/friends/request — send a friend request
router.post('/request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId) { errorResponse(res, 'userId required', 400); return; }
    if (userId === req.userId) { errorResponse(res, 'Cannot friend yourself', 400); return; }
    const existing = await findFriendship(req.userId, userId);
    if (existing) { errorResponse(res, 'Request already exists', 409); return; }
    const row = await prisma.friendship.create({
      data: { requesterId: req.userId, addresseeId: userId },
    });
    successResponse(res, { friendship: row }, 201);
  } catch (err) { next(err); }
});

// PATCH /api/friends/:id/accept
router.patch('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.friendship.findUnique({ where: { id: req.params.id } });
    if (!row || row.addresseeId !== req.userId) { errorResponse(res, 'Not found', 404); return; }
    const updated = await prisma.friendship.update({
      where: { id: req.params.id },
      data: { status: 'accepted' },
    });
    successResponse(res, { friendship: updated });
  } catch (err) { next(err); }
});

// DELETE /api/friends/:id — decline or unfriend
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await prisma.friendship.findUnique({ where: { id: req.params.id } });
    if (!row || (row.requesterId !== req.userId && row.addresseeId !== req.userId)) {
      errorResponse(res, 'Not found', 404); return;
    }
    await prisma.friendship.delete({ where: { id: req.params.id } });
    successResponse(res, { message: 'Removed' });
  } catch (err) { next(err); }
});

export default router;
