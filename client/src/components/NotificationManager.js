import { useEffect } from 'react';
import { remindersApi } from '../api';
import { useAuth } from '../auth';
// Polls /api/reminders/due every 30 s and fires browser notifications.
// Renders nothing — pure side-effect component.
export default function NotificationManager() {
    const { user } = useAuth();
    useEffect(() => {
        if (!user)
            return;
        // Request permission on first mount
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        async function poll() {
            if (Notification.permission !== 'granted')
                return;
            try {
                const r = await remindersApi.due();
                for (const reminder of r.data.data.reminders) {
                    new Notification(`Reminder: ${reminder.event.title}`, {
                        body: 'Your event is coming up soon.',
                        icon: '/favicon.ico',
                    });
                    await remindersApi.acknowledge(reminder.id);
                }
            }
            catch { /* silently ignore network errors */ }
        }
        poll();
        const interval = setInterval(poll, 30000);
        return () => clearInterval(interval);
    }, [user]);
    return null;
}
