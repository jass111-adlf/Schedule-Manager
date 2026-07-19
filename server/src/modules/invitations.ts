import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { successResponse } from '../lib/utils';
import { authenticate, validateRequest } from '../middleware';
// ── Validation ────────────────────────────────────────────────

export const inviteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// ── Helpers ───────────────────────────────────────────────────

function appError(message: string, statusCode: number) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

// ── Service functions (used here + exported for events router) ─

export async function inviteUser(eventId: string, ownerId: string, inviteeId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw appError('Event not found', 404);
  if (event.createdBy !== ownerId) throw appError('Invit people to your own event brev', 403);
  if (event.status === 'cancelled') throw appError('the event no more brev', 409);
  if (inviteeId === ownerId) throw appError('It is your event brev', 400);
  if (!await prisma.user.findUnique({ where: { id: inviteeId } })) throw appError('User not found, should not happen acc to me', 404);
  const existing = await prisma.invitation.findUnique({
    where: { eventId_invitedUserId: { eventId, invitedUserId: inviteeId } },
  });
  if (existing) throw appError('Your doing to much brev', 409);
  return prisma.invitation.create({
    data: { eventId, invitedUserId: inviteeId },
    include: {
      invitedUser: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, title: true } },
    },
  });
}

// ── Router ────────────────────────────────────────────────────

const router = Router();
router.use(authenticate);

router.get('/received', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: { invitedUserId: req.userId },
      include: { event: { include: { owner: { select: { id: true, name: true, email: true } } } } },
      orderBy: { invitedAt: 'desc' },
    });
    successResponse(res, { invitations });
  } catch (err) { next(err); }
});

router.patch('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.invitation.findUnique({ where: { id: req.params.id } });
    if (!inv) throw appError('Invitation not found', 404);
    if (inv.invitedUserId !== req.userId) throw appError('This invitation is not for you', 403);
    if (inv.invitationStatus !== 'pending') throw appError(`Invitation already ${inv.invitationStatus}`, 409);
    const invitation = await prisma.invitation.update({
      where: { id: req.params.id },
      data: { invitationStatus: 'accepted' },
      include: { event: true },
    });
    successResponse(res, { invitation: { ...invitation, event: { id: invitation.event.id, title: invitation.event.title } } });
  } catch (err) { next(err); }
});

router.patch('/:id/decline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inv = await prisma.invitation.findUnique({ where: { id: req.params.id } });
    if (!inv) throw appError('Invitation not found', 404);
    if (inv.invitedUserId !== req.userId) throw appError('This invitation is not for you', 403);
    if (inv.invitationStatus !== 'pending') throw appError(`Invitation already ${inv.invitationStatus}`, 409);
    const invitation = await prisma.invitation.update({
      where: { id: req.params.id },
      data: { invitationStatus: 'declined' },
      include: { event: { select: { id: true, title: true } } },
    });
    successResponse(res, { invitation });
  } catch (err) { next(err); }
});

export default router;
