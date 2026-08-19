import { transformMeetingToNotionBlocks } from "../utils/notionBlockTransformer.js";

describe("Notion Block Transformer — Issue #1602", () => {
  describe("transformMeetingToNotionBlocks", () => {
    it("should produce title property and at least one child block", () => {
      const { properties, children } = transformMeetingToNotionBlocks({
        title: "Sprint Review",
      });

      expect(properties.title.title[0].text.content).toBe("Sprint Review");
      expect(children.length).toBeGreaterThan(0);
    });

    it("should include metadata callout when meeting has date/type/participants", () => {
      const { children } = transformMeetingToNotionBlocks({
        title: "Sync",
        date: new Date("2026-06-15"),
        meetingType: "internal",
        duration: 30,
        participants: [{ name: "Alice" }, { name: "Bob" }],
      });

      const callout = children.find((b) => b.type === "callout");
      expect(callout).toBeDefined();
      expect(callout.callout.rich_text[0].text.content).toContain("Alice");
      expect(callout.callout.rich_text[0].text.content).toContain("internal");
    });

    it("should add summary paragraphs split by double newlines", () => {
      const { children } = transformMeetingToNotionBlocks({
        title: "Sync",
        summary: "First paragraph.\n\nSecond paragraph.",
      });

      const heading = children.find(
        (b) =>
          b.type === "heading_2" &&
          b.heading_2.rich_text[0].text.content === "Summary",
      );
      expect(heading).toBeDefined();

      const paragraphs = children.filter((b) => b.type === "paragraph");
      expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    });

    it("should convert structuredMoM action items to to_do blocks", () => {
      const { children } = transformMeetingToNotionBlocks({
        title: "Sync",
        structuredMoM: {
          actionItems: [
            { task: "Update docs", assignee: "Alice", dueDate: "Friday" },
          ],
        },
      });

      const toDo = children.find((b) => b.type === "to_do");
      expect(toDo).toBeDefined();
      expect(toDo.to_do.rich_text[0].text.content).toContain("Update docs");
      expect(toDo.to_do.rich_text[0].text.content).toContain("Alice");
    });

    it("should merge DB action items with structuredMoM and deduplicate", () => {
      const actionItems = [
        { text: "Update docs", owner: "Alice", status: "open" },
        { text: "Fix tests", owner: "Bob", status: "completed" },
      ];

      const { children } = transformMeetingToNotionBlocks(
        {
          title: "Sync",
          structuredMoM: {
            actionItems: [{ task: "Update docs", assignee: "Alice" }],
          },
        },
        actionItems,
      );

      const todos = children.filter((b) => b.type === "to_do");
      expect(todos.length).toBe(2);

      const fixTests = todos.find((t) =>
        t.to_do.rich_text[0].text.content.includes("Fix tests"),
      );
      expect(fixTests.to_do.checked).toBe(true);
    });

    it("should handle empty meeting gracefully", () => {
      const { properties, children } = transformMeetingToNotionBlocks({});
      expect(properties.title.title[0].text.content).toBe("Untitled Meeting");
      expect(children.length).toBeGreaterThan(0);
    });

    it("should truncate text exceeding 2000 characters", () => {
      const longText = "A".repeat(3000);
      const { children } = transformMeetingToNotionBlocks({
        title: "Sync",
        summary: longText,
      });

      const summaryParagraph = children.find(
        (b) =>
          b.type === "paragraph" &&
          b.paragraph.rich_text[0]?.text.content.length > 100,
      );
      expect(
        summaryParagraph.paragraph.rich_text[0].text.content.length,
      ).toBeLessThanOrEqual(2000);
    });

    it("should include decisions from structuredMoM", () => {
      const { children } = transformMeetingToNotionBlocks({
        title: "Board Meeting",
        structuredMoM: {
          decisions: ["Use React", "Deploy on AWS"],
        },
      });

      const decisionHeading = children.find(
        (b) =>
          b.type === "heading_2" &&
          b.heading_2.rich_text[0].text.content === "Decisions",
      );
      expect(decisionHeading).toBeDefined();
    });
  });
});
