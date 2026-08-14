/**
 * Issue #1335 — Web Crypto AES-GCM transcript encryption tests.
 *
 * Uses Node's webcrypto when available so tests run without a browser.
 */

import { webcrypto } from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { Buffer } from "buffer";

beforeAll(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
  }
  if (typeof globalThis.btoa !== "function") {
    globalThis.btoa = (str) => Buffer.from(str, "binary").toString("base64");
  }
  if (typeof globalThis.atob !== "function") {
    globalThis.atob = (str) => Buffer.from(str, "base64").toString("binary");
  }
});

const {
  generateKey,
  exportKey,
  importKey,
  encryptTranscript,
  decryptTranscript,
  isEncryptedTranscriptPayload,
} = await import("../transcriptCrypto.js");

describe("transcriptCrypto (Issue #1335)", () => {
  it("generates an AES-GCM key and round-trips export/import", async () => {
    const key = await generateKey();
    const exported = await exportKey(key);
    expect(typeof exported).toBe("string");
    expect(exported.length).toBeGreaterThan(10);

    const imported = await importKey(exported);
    expect(imported.type).toBe("secret");
  });

  it("encrypts and decrypts transcript plaintext", async () => {
    const key = await generateKey();
    const plaintext =
      "Alice: We should ship the encryption feature.\nBob: Agreed.";

    const payload = await encryptTranscript(plaintext, key);

    expect(payload.ciphertext).toBeTruthy();
    expect(payload.iv).toBeTruthy();
    expect(payload.algorithm).toBe("AES-GCM");
    expect(payload.encryptionVersion).toBe(1);
    expect(isEncryptedTranscriptPayload(payload)).toBe(true);

    const decrypted = await decryptTranscript(payload, key);
    expect(decrypted).toBe(plaintext);
  });

  it("uses a unique IV per encryption", async () => {
    const key = await generateKey();
    const a = await encryptTranscript("same text", key);
    const b = await encryptTranscript("same text", key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("rejects decryption with the wrong key", async () => {
    const keyA = await generateKey();
    const keyB = await generateKey();
    const payload = await encryptTranscript("secret meeting notes", keyA);

    await expect(decryptTranscript(payload, keyB)).rejects.toThrow(
      /wrong key|tampered/i,
    );
  });

  it("rejects tampered ciphertext", async () => {
    const key = await generateKey();
    const payload = await encryptTranscript("sensitive content", key);
    const tampered = {
      ...payload,
      ciphertext: `${payload.ciphertext.slice(0, -4)}AAAA`,
    };

    await expect(decryptTranscript(tampered, key)).rejects.toThrow();
  });

  it("rejects a modified IV", async () => {
    const key = await generateKey();
    const payload = await encryptTranscript("sensitive content", key);
    const badIv = btoa("xxxxxxxxxxxx"); // 12 bytes of 'x'
    const tampered = { ...payload, iv: badIv };

    await expect(decryptTranscript(tampered, key)).rejects.toThrow();
  });

  it("rejects malformed payloads", async () => {
    const key = await generateKey();
    await expect(decryptTranscript(null, key)).rejects.toThrow(/Invalid/);
    await expect(decryptTranscript({ ciphertext: "x" }, key)).rejects.toThrow(
      /missing/i,
    );
    await expect(encryptTranscript(123, key)).rejects.toThrow(/string/i);
  });

  it("detects encrypted vs legacy shapes", () => {
    expect(
      isEncryptedTranscriptPayload({
        ciphertext: "abc",
        iv: "def",
      }),
    ).toBe(true);
    expect(isEncryptedTranscriptPayload("plain text transcript")).toBe(false);
    expect(isEncryptedTranscriptPayload(null)).toBe(false);
    expect(isEncryptedTranscriptPayload({})).toBe(false);
  });
});
