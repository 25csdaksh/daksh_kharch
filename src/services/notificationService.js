/**
 * HisabSetu Local Notification Service
 * Integrates @capacitor/local-notifications for native Android bill reminders
 * with graceful web/desktop fallback.
 */

import { formatCurrencyINR } from '../utils/dateUtils.js';

let LocalNotifications = null;

// Dynamically load @capacitor/local-notifications safely
async function getPlugin() {
  if (LocalNotifications !== null) return LocalNotifications;
  try {
    const mod = await import('@capacitor/local-notifications');
    LocalNotifications = mod.LocalNotifications;
    return LocalNotifications;
  } catch (err) {
    console.warn('LocalNotifications plugin not available in this environment:', err);
    LocalNotifications = false;
    return null;
  }
}

/**
 * Checks if local notifications are enabled by user settings.
 */
export function areNotificationsEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('hisabsetu_bill_notifications') !== 'false';
}

/**
 * Toggles notification setting.
 */
export function setNotificationsEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('hisabsetu_bill_notifications', String(enabled));
}

/**
 * Requests permission for local notifications on Android / mobile.
 */
export async function requestNotificationPermission() {
  const plugin = await getPlugin();
  if (!plugin) return { granted: false, reason: 'plugin_unavailable' };

  try {
    const check = await plugin.checkPermissions();
    if (check.display === 'granted') {
      return { granted: true };
    }
    const request = await plugin.requestPermissions();
    return { granted: request.display === 'granted' };
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return { granted: false, error: err.message };
  }
}

/**
 * Hashes a string (like a UUID) to a positive 32-bit integer for notification ID.
 */
function hashStringToId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Schedules a local reminder notification for an upcoming bill occurrence.
 */
export async function scheduleBillNotification({ schedule, occurrence }) {
  if (!areNotificationsEnabled()) return false;
  const plugin = await getPlugin();
  if (!plugin) return false;

  const dueDateStr = occurrence.scheduled_due_date || schedule.next_due_date;
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const reminderDays = schedule.reminder_days_before !== undefined ? schedule.reminder_days_before : 1;

  // Reminder trigger date (e.g. 1 day before at 9:00 AM)
  const targetDate = new Date(y, m - 1, d, 9, 0, 0);
  targetDate.setDate(targetDate.getDate() - reminderDays);

  const now = new Date();
  // If reminder timestamp has already passed, schedule for 1 minute from now if due today or upcoming
  const scheduleAt = targetDate > now ? targetDate : new Date(now.getTime() + 60000);

  const notifId = hashStringToId(`bill-${occurrence.id || schedule.id}`);

  try {
    const hasPerm = await requestNotificationPermission();
    if (!hasPerm.granted) return false;

    await plugin.schedule({
      notifications: [
        {
          id: notifId,
          title: `Bill Due Reminder: ${schedule.title}`,
          body: `${formatCurrencyINR(schedule.amount, false)} is due ${
            reminderDays === 0 ? 'today' : `in ${reminderDays} day(s)`
          } for ${schedule.title} (${schedule.category}).`,
          schedule: { at: scheduleAt },
          sound: 'default',
          extra: {
            scheduleId: schedule.id,
            occurrenceId: occurrence.id
          }
        }
      ]
    });
    return true;
  } catch (err) {
    console.warn('Failed to schedule bill notification:', err);
    return false;
  }
}

/**
 * Cancels a scheduled bill notification.
 */
export async function cancelBillNotification(scheduleId) {
  const plugin = await getPlugin();
  if (!plugin) return false;

  try {
    const notifId = hashStringToId(`bill-${scheduleId}`);
    await plugin.cancel({
      notifications: [{ id: notifId }]
    });
    return true;
  } catch (err) {
    console.warn('Failed to cancel bill notification:', err);
    return false;
  }
}
