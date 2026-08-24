import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TranscriptViewer from "../TranscriptViewer.jsx";
import api from "../../services/apiClient.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("../../components/MeetingSentimentChart", () => ({
  default: () => <div data-testid="mock-sentiment-chart">Sentiment Chart</div>,
}));

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ meetingId: "meeting-789" }),
  useNavigate: () => mockNavigate,
}));

describe("TranscriptViewer Page (#1805)", () => {
  const sampleTranscriptData = {
    duration: 120,
    meeting: {
      _id: "meeting-789",
      title: "Design Review",
      date: "2026-08-20T10:00:00.000Z",
      participants: [{ name: "Alice" }, { name: "Bob" }],
    },
    segments: [
      {
        startTime: 0,
        endTime: 10,
        speaker: "Alice",
        text: "Welcome everyone to the meeting.",
      },
      {
        startTime: 11,
        endTime: 25,
        speaker: "Bob",
        text: "Thanks Alice, glad to be here.",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("renders Navbar during loading state", () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(<TranscriptViewer />);

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
    expect(screen.getByText("Loading transcript...")).toBeInTheDocument();
  });

  it("renders Navbar and not found message when transcript is not found", async () => {
    api.get.mockResolvedValueOnce({ data: null });
    render(<TranscriptViewer />);

    await waitFor(() => {
      expect(screen.getByText("Transcript Not Found")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
  });

  it("fetches transcript using /api/transcripts/meeting/:meetingId route prefix", async () => {
    api.get.mockResolvedValueOnce({ data: sampleTranscriptData });
    render(<TranscriptViewer />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/api/transcripts/meeting/meeting-789",
      );
    });

    expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
    expect(screen.getByText("Design Review")).toBeInTheDocument();
    expect(
      screen.getAllByText("Welcome everyone to the meeting.")[0],
    ).toBeInTheDocument();
  });

  it("searches transcript using /api/transcripts/meeting/:meetingId/search route prefix", async () => {
    api.get.mockResolvedValueOnce({ data: sampleTranscriptData });
    api.post.mockResolvedValueOnce({
      data: {
        matches: [
          {
            startTime: 0,
            speaker: "Alice",
            text: "Welcome everyone to the meeting.",
          },
        ],
      },
    });

    render(<TranscriptViewer />);

    await waitFor(() => {
      expect(screen.getByText("Design Review")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search transcript...");
    fireEvent.change(searchInput, { target: { value: "Welcome" } });

    const searchButton = screen.getByRole("button", { name: /^search$/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/api/transcripts/meeting/meeting-789/search",
        { query: "Welcome" },
      );
    });

    expect(await screen.findByText("Search Results")).toBeInTheDocument();
  });

  it("exports transcript text using /api/transcripts/meeting/:meetingId/export/text route prefix", async () => {
    api.get.mockResolvedValueOnce({ data: sampleTranscriptData });
    api.get.mockResolvedValueOnce({ data: "sample transcript text" });

    render(<TranscriptViewer />);

    await waitFor(() => {
      expect(screen.getByText("Design Review")).toBeInTheDocument();
    });

    const exportTxtBtn = screen.getByTitle("Export as text");
    fireEvent.click(exportTxtBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/api/transcripts/meeting/meeting-789/export/text",
        { responseType: "blob" },
      );
    });
  });

  it("exports transcript PDF using /api/transcripts/meeting/:meetingId/export/pdf route prefix", async () => {
    api.get.mockResolvedValueOnce({ data: sampleTranscriptData });
    api.get.mockResolvedValueOnce({ data: new Blob(["pdf content"]) });

    render(<TranscriptViewer />);

    await waitFor(() => {
      expect(screen.getByText("Design Review")).toBeInTheDocument();
    });

    const exportPdfBtn = screen.getByTitle("Export as PDF");
    fireEvent.click(exportPdfBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/api/transcripts/meeting/meeting-789/export/pdf",
        { responseType: "blob" },
      );
    });
  });
});
