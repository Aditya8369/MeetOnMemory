import { jest } from "@jest/globals";

// Mock the dependencies of processAudioJob
const mockGenerateMoMDetailed = jest.fn();
jest.unstable_mockModule("../services/GenerativeAIService.js", () => ({
  generateMoMDetailed: (...args) => mockGenerateMoMDetailed(...args),
}));

// Mock the queueService to get a spy-able aiResultsQueue
const mockResultsQueueAdd = jest.fn();
jest.unstable_mockModule("../services/queueService.js", () => ({
  aiResultsQueue: {
    add: (...args) => mockResultsQueueAdd(...args),
    isActive: true,
  },
}));

// Now import the job processor
const processAudioJob = (await import("../jobs/processAudioJob.js")).default;

describe("AI MoM queue and worker compatibility regression tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should verify that processAudioJob processes generate-mom jobs and enqueues results to ai-mom-results queue", async () => {
    const jobData = {
      meetingId: "meeting_123",
      transcript:
        "This is a meeting transcript talking about project timeline.",
      date: "2026-08-15",
      title: "Project Sync",
      userId: "user_456",
      customInstructions: "Highlight timeline details",
    };

    mockGenerateMoMDetailed.mockResolvedValueOnce({
      mom: {
        title: "Project Sync",
        date: "2026-08-15",
        summary: "Timeline details highlighted.",
        agenda: ["Timeline"],
        key_discussions: ["We agreed on timeline"],
        decisions: ["Timeline finalized"],
        action_items: [
          { task: "Update timeline", owner: "User", due_date: "TBD" },
        ],
        attendees: ["User"],
        questions_raised: [],
        keywords: ["Timeline"],
        notes: "",
      },
      generation: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        degraded: false,
        durationMs: 120,
      },
    });

    mockResultsQueueAdd.mockResolvedValueOnce({ id: "result_job_999" });

    const result = await processAudioJob({ data: jobData });

    // Assert generateMoMDetailed was called with the correct arguments
    expect(mockGenerateMoMDetailed).toHaveBeenCalledWith(
      "This is a meeting transcript talking about project timeline.",
      "2026-08-15",
      "Project Sync",
      "Highlight timeline details",
    );

    // Assert results were published to ai-mom-results queue
    expect(mockResultsQueueAdd).toHaveBeenCalledWith(
      "ai-mom-result-job",
      expect.objectContaining({
        meetingId: "meeting_123",
        userId: "user_456",
        transcript:
          "This is a meeting transcript talking about project timeline.",
        date: "2026-08-15",
        title: "Project Sync",
        structuredMoM: expect.any(Object),
        generation: expect.any(Object),
      }),
    );

    expect(result).toEqual({ success: true, meetingId: "meeting_123" });
  });

  it("should throw an error if no transcript is provided in job data", async () => {
    const jobData = {
      meetingId: "meeting_123",
      transcript: "", // Empty transcript
    };

    await expect(processAudioJob({ data: jobData })).rejects.toThrow(
      "No transcript provided.",
    );
    expect(mockGenerateMoMDetailed).not.toHaveBeenCalled();
    expect(mockResultsQueueAdd).not.toHaveBeenCalled();
  });
});
