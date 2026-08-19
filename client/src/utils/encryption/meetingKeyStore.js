/**
 * Browser-local meeting encryption key store (Issue #1335).
 * Keys never leave the client; they are scoped per meeting id.
 */

const STORAGE_PREFIX = "meetonmemory:e2ee:meeting:";

const storageAvailable = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

export const meetingKeyStorageKey = (meetingId) =>
  `${STORAGE_PREFIX}${String(meetingId)}`;

export const saveMeetingKey = (meetingId, base64Key) => {
  if (!meetingId || !base64Key || !storageAvailable()) return false;
  localStorage.setItem(meetingKeyStorageKey(meetingId), base64Key);
  return true;
};

export const loadMeetingKey = (meetingId) => {
  if (!meetingId || !storageAvailable()) return null;
  return localStorage.getItem(meetingKeyStorageKey(meetingId));
};

export const clearMeetingKey = (meetingId) => {
  if (!meetingId || !storageAvailable()) return;
  localStorage.removeItem(meetingKeyStorageKey(meetingId));
};
