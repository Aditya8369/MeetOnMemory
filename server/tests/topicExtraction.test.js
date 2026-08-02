import { jest } from "@jest/globals";

jest.unstable_mockModule("../services/GenerativeAIService.js", () => ({
  generateText: jest.fn(),
  parseJsonOutput: jest.fn(),
}));

jest.unstable_mockModule("../utils/embeddingUtils.js", () => ({
  embedText: jest.fn(),
}));

const GenerativeAIService = await import("../services/GenerativeAIService.js");
const embeddingUtils = await import("../utils/embeddingUtils.js");
const Meeting = (await import("../models/meetingModel.js")).default;
const Transcript = (await import("../models/transcriptModel.js")).default;
const MeetingTopic = (await import("../models/meetingTopicModel.js")).default;
const TopicCluster = (await import("../models/topicClusterModel.js")).default;
const { extractTopics, clusterTopics } =
  await import("../services/topicExtractionService.js");

describe("Topic Extraction Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractTopics", () => {
    it("throws error if meeting not found", async () => {
      jest.spyOn(Meeting, "findById").mockResolvedValue(null);
      await expect(extractTopics("mockId")).rejects.toThrow(
        "Meeting not found",
      );
    });

    it("throws error if transcript not found or empty", async () => {
      jest
        .spyOn(Meeting, "findById")
        .mockResolvedValue({ _id: "mockId", organization: "org1" });
      jest.spyOn(Transcript, "findOne").mockResolvedValue(null);
      await expect(extractTopics("mockId")).rejects.toThrow(
        "No transcript found for meeting",
      );
    });

    it("extracts topics successfully and saves them", async () => {
      const mockMeeting = { _id: "meeting1", organization: "org1" };
      const mockTranscript = {
        meeting: "meeting1",
        segments: [
          { startTime: 0, endTime: 10, speaker: "A", text: "Hello world" },
        ],
      };

      const mockAiOutput = [
        {
          name: "Topic1",
          confidence: 90,
          keywords: ["a", "b"],
          timeRanges: [{ start: 0, end: 10 }],
        },
      ];

      jest.spyOn(Meeting, "findById").mockResolvedValue(mockMeeting);
      jest.spyOn(Transcript, "findOne").mockResolvedValue(mockTranscript);
      GenerativeAIService.generateText.mockResolvedValue(
        JSON.stringify(mockAiOutput),
      );
      GenerativeAIService.parseJsonOutput.mockReturnValue(mockAiOutput);
      embeddingUtils.embedText.mockResolvedValue([0.1, 0.2, 0.3]);

      jest.spyOn(MeetingTopic, "deleteMany").mockResolvedValue({});
      jest.spyOn(MeetingTopic.prototype, "save").mockResolvedValue({});

      await extractTopics("meeting1");

      expect(MeetingTopic.deleteMany).toHaveBeenCalledWith({
        meeting: "meeting1",
      });
      expect(embeddingUtils.embedText).toHaveBeenCalledTimes(1);
      expect(MeetingTopic.prototype.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("clusterTopics", () => {
    it("groups topics properly based on embeddings", async () => {
      const mockTopics = [
        {
          _id: "mt1",
          save: jest.fn().mockResolvedValue({}),
          topics: [
            {
              _id: "t1",
              name: "AI Topic",
              embedding: [0.9, 0.1],
              clusterId: null,
            },
            {
              _id: "t2",
              name: "Sales Topic",
              embedding: [0.1, 0.9],
              clusterId: null,
            },
          ],
        },
        {
          _id: "mt2",
          save: jest.fn().mockResolvedValue({}),
          topics: [
            {
              _id: "t3",
              name: "Machine Learning",
              embedding: [0.85, 0.15],
              clusterId: null,
            },
          ],
        },
      ];

      jest.spyOn(MeetingTopic, "find").mockResolvedValue(mockTopics);
      jest.spyOn(TopicCluster, "find").mockResolvedValue([]);
      jest.spyOn(TopicCluster, "insertMany").mockResolvedValue([]);
      jest
        .spyOn(TopicCluster.prototype, "save")
        .mockImplementation(function () {
          return Promise.resolve(this);
        });

      await clusterTopics("org1");
      expect(MeetingTopic.find).toHaveBeenCalled();
      expect(TopicCluster.insertMany).toHaveBeenCalled();
    });
  });
});
