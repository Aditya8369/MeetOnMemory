import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import MeetingHeader from "../../components/meeting-details/MeetingHeader.jsx";
import MeetingSummary from "../../components/meeting-details/MeetingSummary.jsx";
import MeetingTranscript from "../../components/meeting-details/MeetingTranscript.jsx";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../api/bookmarkApi.js", () => ({
  getBookmarkStatusAPI: vi.fn().mockResolvedValue({ bookmarked: false }),
  toggleBookmarkAPI: vi.fn(),
}));

vi.mock("../../hooks/useMeetingTranscriptText.js", () => ({
  useMeetingTranscriptText: (meeting) => ({
    plaintext: meeting?.transcript || "",
    isEncrypted: Boolean(meeting?.isTranscriptEncrypted),
    error: null,
    loading: false,
    e2eeEnabled: false,
    encryptAndStore: vi.fn(),
  }),
}));

describe("Meeting Details Dark Mode Shell and Panels (#1642)", () => {
  const sampleMeeting = {
    _id: "meeting-123",
    title: "Engineering Sync",
    date: "2026-08-18T10:00:00.000Z",
    duration: 30,
    meetingType: "standup",
    status: "completed",
    description: "Daily engineering sync meeting",
    transcript: "Alex: We deployed the latest release.\nSam: Tests look great.",
    summary: {
      summary: "Team reviewed deployment and test status.",
      decisions: ["Release v2 is approved"],
      action_items: [
        { task: "Monitor latency", owner: "Alex", status: "completed" },
      ],
      agenda: ["Status check", "Deployment rollout"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders MeetingHeader with dark-mode surfaces, text, and badge classes", () => {
    const { container } = render(
      <MemoryRouter>
        <MeetingHeader meeting={sampleMeeting} />
      </MemoryRouter>,
    );

    const rootCard = container.firstChild;
    expect(rootCard.className).toContain("dark:bg-gray-800");
    expect(rootCard.className).toContain("dark:border-gray-700");

    const title = screen.getByRole("heading", { name: "Engineering Sync" });
    expect(title.className).toContain("dark:text-white");

    const statusBadge = screen.getByText("completed");
    expect(statusBadge.className).toContain("dark:bg-green-900/40");
    expect(statusBadge.className).toContain("dark:text-green-300");
  });

  it("renders MeetingSummary panels and cards with dark-mode classes", () => {
    const { container } = render(<MeetingSummary meeting={sampleMeeting} />);

    const card = container.querySelector(".dark\\:bg-gray-800");
    expect(card).toBeInTheDocument();

    const decisionItem = screen.getByText("Release v2 is approved");
    const decisionCard = decisionItem.closest("div.rounded-lg");
    expect(decisionCard.className).toContain("dark:bg-gray-700/50");
    expect(decisionCard.className).toContain("dark:border-gray-700");
  });

  it("renders MeetingTranscript with dark-mode scrollable container and text", () => {
    const { container } = render(
      <MemoryRouter>
        <MeetingTranscript meeting={sampleMeeting} />
      </MemoryRouter>,
    );

    const rootCard = container.firstChild;
    expect(rootCard.className).toContain("dark:bg-gray-800");
    expect(rootCard.className).toContain("dark:border-gray-700");

    const transcriptHeading = screen.getByRole("heading", {
      name: /full transcript/i,
    });
    expect(transcriptHeading.className).toContain("dark:text-white");
  });

  it("renders empty states with dark-mode surfaces when no summary or transcript is present", () => {
    const emptyMeeting = { _id: "empty-1" };

    const { container: sumContainer } = render(
      <MeetingSummary meeting={emptyMeeting} />,
    );
    expect(
      sumContainer.querySelector(".dark\\:bg-gray-900\\/50"),
    ).toBeInTheDocument();

    const { container: trContainer } = render(
      <MemoryRouter>
        <MeetingTranscript meeting={emptyMeeting} />
      </MemoryRouter>,
    );
    expect(
      trContainer.querySelector(".dark\\:bg-gray-900\\/50"),
    ).toBeInTheDocument();
  });
});
