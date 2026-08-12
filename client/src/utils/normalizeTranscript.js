/**
 * Normalizes meeting transcript data into a consistent array of segments:
 * Array of { speaker: string, text: string }
 *
 * It filters out any invalid, empty, or malformed entries defensively.
 * If no valid segments can be resolved, it returns an empty array [].
 */
export function normalizeTranscript(transcript) {
  if (!transcript) return [];

  const extract = (data) => {
    if (!data) return [];

    // Handle plain string or JSON string
    if (typeof data === "string") {
      const trimmed = data.trim();
      if (!trimmed) return [];

      // Attempt to parse as JSON if it looks like an array or object
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return extract(parsed);
        } catch {
          // Fall back to treating as plain string
        }
      }
      return [{ speaker: "Transcript", text: trimmed }];
    }

    // Handle array
    if (Array.isArray(data)) {
      return data
        .map((item) => {
          if (!item) return null;

          if (typeof item === "string") {
            const trimmedText = item.trim();
            return trimmedText
              ? { speaker: "Speaker", text: trimmedText }
              : null;
          }

          if (typeof item === "object") {
            const rawText =
              item.text ??
              item.content ??
              item.message ??
              item.transcript ??
              item.body;

            const rawSpeaker =
              item.speaker ??
              item.speakerName ??
              item.user ??
              item.name ??
              item.author;

            if (rawText === undefined || rawText === null) {
              return null;
            }

            const textStr = String(rawText).trim();
            if (!textStr) {
              return null;
            }

            const speakerStr =
              rawSpeaker !== undefined && rawSpeaker !== null
                ? String(rawSpeaker).trim()
                : "Speaker";

            return {
              speaker: speakerStr || "Speaker",
              text: textStr,
            };
          }

          return null;
        })
        .filter((seg) => seg !== null);
    }

    // Handle object
    if (typeof data === "object") {
      // Check for nested segments array
      if (data.segments && Array.isArray(data.segments)) {
        return extract(data.segments);
      }

      // Check if it's a single segment object itself
      const rawText =
        data.text ??
        data.content ??
        data.message ??
        data.transcript ??
        data.body;

      const rawSpeaker =
        data.speaker ??
        data.speakerName ??
        data.user ??
        data.name ??
        data.author;

      if (rawText !== undefined && rawText !== null) {
        const textStr = String(rawText).trim();
        if (textStr) {
          const speakerStr =
            rawSpeaker !== undefined && rawSpeaker !== null
              ? String(rawSpeaker).trim()
              : "Speaker";
          return [
            {
              speaker: speakerStr || "Speaker",
              text: textStr,
            },
          ];
        }
      }
    }

    return [];
  };

  try {
    return extract(transcript);
  } catch (e) {
    console.error("Error extracting/normalizing transcript", e);
    return [];
  }
}
