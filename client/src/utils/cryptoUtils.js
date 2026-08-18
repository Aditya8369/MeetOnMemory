/**
 * cryptoUtils.js
 * Provides client-side End-to-End Encryption (E2EE) utilities for sensitive transcripts.
 * Implements AES-GCM encryption to ensure zero-knowledge data storage on the backend.
 */

const generateIv = () => window.crypto.getRandomValues(new Uint8Array(12));

function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function encryptText(text, key) {
  try {
    const iv = generateIv();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt sensitive data.");
  }
}

export async function decryptText(encryptedBase64, key) {
  try {
    const combinedBuffer = base64ToArrayBuffer(encryptedBase64);
    const combined = new Uint8Array(combinedBuffer);

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt sensitive data.");
  }
}
