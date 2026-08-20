import TranscriptAnalyzer from "../services/transcriptAnalyzer.js";
import EngagementScorer from "../services/engagementScorer.js";

describe("Analytics Engine Logic", () => {
  describe("TranscriptAnalyzer Edge Cases", () => {
    test("handles empty transcripts without throwing", () => {
      const result = TranscriptAnalyzer.analyze([]);
      expect(result.distribution).toEqual([]);
      expect(result.silencePeriods).toBe(0);
      expect(result.overlapRatio).toBe(0);
    });

    test("detects nested overlaps correctly using max end time", () => {
      const segments = [
        { speaker: "Alice", start: 0, end: 10000, text: "Long story..." },
        { speaker: "Bob", start: 2000, end: 4000, text: "Interrupting!" },
        { speaker: "Charlie", start: 3000, end: 5000, text: "Me too!" },
      ];
      const result = TranscriptAnalyzer.analyze(segments);

      const bobStats = result.distribution.find((d) => d.userName === "Bob");
      const charlieStats = result.distribution.find(
        (d) => d.userName === "Charlie",
      );

      expect(bobStats.interruptions).toBe(1);
      expect(charlieStats.interruptions).toBe(1);
      expect(result.overlapRatio).toBeGreaterThan(0);
    });

    test("calculates silence periods correctly across gaps", () => {
      const segments = [
        { speaker: "Alice", start: 0, end: 5000, text: "Hello" },
        { speaker: "Bob", start: 20000, end: 25000, text: "Hi" }, // 15s gap
      ];
      const result = TranscriptAnalyzer.analyze(segments);
      expect(result.silencePeriods).toBe(1);
    });
  });

  describe("EngagementScorer Logic", () => {
    test("does not award participation balance points for empty transcripts", () => {
      const analytics = {
        distribution: [],
        silencePeriods: 0,
        overlapRatio: 0,
      };
      const score = EngagementScorer.calculateEngagementScore(analytics, 0);
      // Base score is 50. With 0 participants, balance score should remain 0.
      expect(score).toBe(50);
    });
  });
});
