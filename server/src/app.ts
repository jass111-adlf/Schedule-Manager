import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware';
import authRouter       from './modules/auth';
import usersRouter      from './modules/users';
import eventsRouter     from './modules/events/events';
import invitationsRouter from './modules/invitations';
import remindersRouter  from './modules/reminders';
import dashboardRouter  from './modules/dashboard';
import friendsRouter    from './modules/friends';
import eventTypesRouter from './modules/eventTypes';
import path from 'path';

const app = express();

if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth',        authRouter);
app.use('/api/users',       usersRouter);
app.use('/api/events',      eventsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/reminders',   remindersRouter);
app.use('/api/dashboard',   dashboardRouter);
app.use('/api/friends',     friendsRouter);
app.use('/api/event-types', eventTypesRouter);

app.use(errorHandler);

export default app;
