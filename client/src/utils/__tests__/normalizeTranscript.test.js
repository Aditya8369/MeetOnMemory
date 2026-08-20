import { describe, it, expect } from "vitest";
import { normalizeTranscript } from "../normalizeTranscript.js";

describe("normalizeTranscript utility", () => {
  it("should return empty array for null, undefined, empty string, and whitespace-only string", () => {
    expect(normalizeTranscript(null)).toEqual([]);
    expect(normalizeTranscript(undefined)).toEqual([]);
    expect(normalizeTranscript("")).toEqual([]);
    expect(normalizeTranscript("   ")).toEqual([]);
  });

  it("should return empty array for empty array or array with nulls", () => {
    expect(normalizeTranscript([])).toEqual([]);
    expect(normalizeTranscript([null])).toEqual([]);
    expect(normalizeTranscript([undefined, null])).toEqual([]);
  });

  it("should return empty array for malformed JSON and valid JSON with no usable segments", () => {
    // Malformed JSON string should fall back to plain text, but if it's empty after fallback or has no segments:
    // "{" is treated as plain string -> [{ speaker: "Transcript", text: "{" }]
    expect(normalizeTranscript("{")).toEqual([
      { speaker: "Transcript", text: "{" },
    ]);

    // Valid JSON representing empty array/objects or containing no usable segments
    expect(normalizeTranscript("[]")).toEqual([]);
    expect(normalizeTranscript("{}")).toEqual([]);
    expect(normalizeTranscript('[{"unknownField": "val"}]')).toEqual([]);
  });

  it("should return empty array for objects with empty text or containing unsupported fields only", () => {
    const objWithEmptyText = { speaker: "Alice", text: "" };
    expect(normalizeTranscript(objWithEmptyText)).toEqual([]);

    const objWithWhitespaceText = { speaker: "Alice", text: "   " };
    expect(normalizeTranscript(objWithWhitespaceText)).toEqual([]);

    const objWithUnsupportedFields = { foo: "bar", baz: 123 };
    expect(normalizeTranscript(objWithUnsupportedFields)).toEqual([]);

    const arrayWithInvalidObjs = [
      { speaker: "Alice", text: "" },
      { unknownField: "ignored" },
    ];
    expect(normalizeTranscript(arrayWithInvalidObjs)).toEqual([]);
  });

  it("should handle valid plain text strings correctly", () => {
    expect(normalizeTranscript("Hello world")).toEqual([
      { speaker: "Transcript", text: "Hello world" },
    ]);
  });

  it("should handle valid JSON strings containing segments correctly", () => {
    const jsonStr = JSON.stringify([
      { speaker: "Alice", text: "Hello from JSON" },
      { name: "Bob", content: "Hi from JSON" },
    ]);
    expect(normalizeTranscript(jsonStr)).toEqual([
      { speaker: "Alice", text: "Hello from JSON" },
      { speaker: "Bob", text: "Hi from JSON" },
    ]);
  });

  it("should handle array of plain strings correctly, discarding empty strings", () => {
    expect(normalizeTranscript(["First line", "   ", "Second line"])).toEqual([
      { speaker: "Speaker", text: "First line" },
      { speaker: "Speaker", text: "Second line" },
    ]);
  });

  it("should handle structured segments object correctly", () => {
    const nestedObj = {
      segments: [
        { speaker: "Grace", text: "Hello there" },
        { speakerName: "Heidi", message: "Hi Grace" },
      ],
    };
    expect(normalizeTranscript(nestedObj)).toEqual([
      { speaker: "Grace", text: "Hello there" },
      { speaker: "Heidi", text: "Hi Grace" },
    ]);
  });

  it("should support multiple field mappings for speaker and text", () => {
    const testArray = [
      { speaker: "User1", text: "text1" },
      { speakerName: "User2", content: "text2" },
      { user: "User3", message: "text3" },
      { name: "User4", transcript: "text4" },
      { author: "User5", body: "text5" },
    ];
    expect(normalizeTranscript(testArray)).toEqual([
      { speaker: "User1", text: "text1" },
      { speaker: "User2", text: "text2" },
      { speaker: "User3", text: "text3" },
      { speaker: "User4", text: "text4" },
      { speaker: "User5", text: "text5" },
    ]);
  });
});
