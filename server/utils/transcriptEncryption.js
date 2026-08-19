/**
 * Issue #1335 — Transcript E2EE helpers (server).
 *
 * Incremental architecture:
 * - Legacy meetings: plaintext `Meeting.transcript` / `Transcript.fullText`.
 * - Encrypted meetings: server stores only ciphertext envelopes and MUST NOT
 *   decrypt. AI/search/recap pipelines should call `meetingSupportsServerAi`
 *   and skip encrypted content.
 * - Feature flag: E2EE_ENABLED (server) / VITE_E2EE_ENABLED (client).
 */

export const TRANSCRIPT_ENCRYPTION_VERSION = 1;
export const TRANSCRIPT_ENCRYPTION_ALG = "AES-GCM";

export const isE2eeEnabled = () => {
  const value = process.env.E2EE_ENABLED;
  return value === "true" || value === "1" || value === "yes";
};

/**
 * Valid ciphertext envelope from the client.
 */
export const isEncryptedTranscriptPayload = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    typeof value.ciphertext === "string" &&
    value.ciphertext.length > 0 &&
    typeof value.iv === "string" &&
    value.iv.length > 0
  );
};

/**
 * Normalize and validate a client-supplied encrypted transcript payload.
 * @returns {{ ok: true, payload: object } | { ok: false, message: string }}
 */
export const normalizeEncryptedTranscriptPayload = (body) => {
  if (!isEncryptedTranscriptPayload(body)) {
    return {
      ok: false,
      message:
        "Invalid encrypted transcript payload (ciphertext and iv required)",
    };
  }

  return {
    ok: true,
    payload: {
      ciphertext: body.ciphertext,
      iv: body.iv,
      encryptionVersion:
        Number(body.encryptionVersion) || TRANSCRIPT_ENCRYPTION_VERSION,
      algorithm: body.algorithm || TRANSCRIPT_ENCRYPTION_ALG,
    },
  };
};

/**
 * True when the meeting has client-side E2EE content (no server-readable transcript).
 */
export const isMeetingTranscriptEncrypted = (meeting) =>
  Boolean(
    meeting?.isTranscriptEncrypted ||
    isEncryptedTranscriptPayload(meeting?.encryptedTranscript),
  );

/**
 * AI / search / recap pipelines must only run on plaintext meetings.
 */
export const meetingSupportsServerAi = (meeting) =>
  !isMeetingTranscriptEncrypted(meeting);
