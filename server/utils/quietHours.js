import NotificationPreference from "../models/notificationPreferenceModel.js";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Checks if a date falls within quiet hours for a user
 * @param {string} userId - User's ID
 * @param {Date} [date] - Date to check (defaults to current time)
 * @returns {Promise<boolean>} True if quiet hours are active
 */
export const checkQuietHours = async (userId, date = new Date()) => {
  try {
    const preferences = await NotificationPreference.findOne({
      user: userId,
    }).lean();
    if (!preferences) return false;

    const { quietHoursStart, quietHoursEnd, timezone } = preferences;
    if (quietHoursStart == null || quietHoursEnd == null) return false;

    // Get current hour in user's timezone
    const tzDate = formatInTimeZone(
      date,
      timezone || "UTC",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
    );
    const currentHour = new Date(tzDate).getHours();

    if (quietHoursStart < quietHoursEnd) {
      return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
    } else {
      // Overnight range (e.g., 22 to 7)
      return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
    }
  } catch (err) {
    console.error("Error in checkQuietHours utility:", err);
    return false;
  }
};
