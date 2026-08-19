/**
 * Feature flag for client-side transcript E2EE (Issue #1335).
 * Set VITE_E2EE_ENABLED=true to enable encrypt/decrypt UI paths.
 */
export const isE2eeEnabled = () => {
  try {
    const value =
      typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_E2EE_ENABLED
        : undefined;
    return value === true || value === "true" || value === "1";
  } catch {
    return false;
  }
};

export {
  generateKey,
  exportKey,
  importKey,
  encryptTranscript,
  decryptTranscript,
  isEncryptedTranscriptPayload,
  TRANSCRIPT_ENCRYPTION_VERSION,
  TRANSCRIPT_ENCRYPTION_ALG,
} from "./transcriptCrypto.js";

export {
  saveMeetingKey,
  loadMeetingKey,
  clearMeetingKey,
  meetingKeyStorageKey,
} from "./meetingKeyStore.js";
