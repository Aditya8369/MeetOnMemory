import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import meetingClipApi from "../../../services/meetingClipApi";
import ClipManager from "../ClipManager.jsx";

vi.mock("../../../services/meetingClipApi", () => ({
  default: {
    getMeetingClips: vi.fn(),
    createClip: vi.fn(),
    updateClip: vi.fn(),
    deleteClip: vi.fn(),
    addClipAnnotation: vi.fn(),
  },
}));

const MEETING_ID = "meeting-123";

const SAMPLE_CLIP = {
  _id: "clip-1",
  title: "Decision moment",
  description: "Budget call",
  startTime: 10,
  endTime: 25,
  transcriptSegments: [{ speaker: "Ada", text: "We should ship Friday." }],
  annotations: [{ _id: "ann-1", text: "Key decision", timestamp: 12 }],
};

const renderManager = (props = {}) =>
  render(
    <ClipManager
      meetingId={MEETING_ID}
      meeting={{ _id: MEETING_ID, audioFilePath: "recordings/meet.mp3" }}
      canManage
      {...props}
    />,
  );

describe("ClipManager (#1987)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    meetingClipApi.getMeetingClips.mockResolvedValue([]);
  });

  it("shows a loading state while clips are fetched for the meeting", () => {
    meetingClipApi.getMeetingClips.mockImplementation(
      () => new Promise(() => {}),
    );

    renderManager();

    expect(screen.getByLabelText(/loading meeting clips/i)).toBeInTheDocument();
    expect(screen.getByTestId("clip-manager")).toHaveAttribute(
      "data-meeting-id",
      MEETING_ID,
    );
    expect(meetingClipApi.getMeetingClips).toHaveBeenCalledWith(MEETING_ID);
  });

  it("shows an empty state when the meeting has no clips", async () => {
    renderManager();

    expect(await screen.findByTestId("clip-manager-empty")).toHaveTextContent(
      /no clips have been created/i,
    );
  });

  it("renders saved clips, transcript segments, and annotations", async () => {
    meetingClipApi.getMeetingClips.mockResolvedValue([SAMPLE_CLIP]);

    renderManager();

    expect(await screen.findByText("Decision moment")).toBeInTheDocument();
    expect(screen.getByText("We should ship Friday.")).toBeInTheDocument();
    expect(screen.getByText("Key decision")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /play clip decision moment/i }),
    ).toBeInTheDocument();
  });

  it("creates a clip through meetingClipApi.createClip", async () => {
    meetingClipApi.createClip.mockResolvedValue({
      ...SAMPLE_CLIP,
      _id: "clip-2",
      title: "New clip",
    });

    renderManager();
    await screen.findByTestId("clip-manager-empty");

    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "New clip" },
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create clip/i }));

    await waitFor(() => {
      expect(meetingClipApi.createClip).toHaveBeenCalledWith({
        meetingId: MEETING_ID,
        title: "New clip",
        description: "",
        startTime: 5,
        endTime: 15,
      });
    });
    expect(await screen.findByText("New clip")).toBeInTheDocument();
  });

  it("updates a clip through meetingClipApi.updateClip", async () => {
    meetingClipApi.getMeetingClips.mockResolvedValue([SAMPLE_CLIP]);
    meetingClipApi.updateClip.mockResolvedValue({
      ...SAMPLE_CLIP,
      title: "Renamed clip",
    });

    renderManager();
    await screen.findByText("Decision moment");

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByDisplayValue("Decision moment"), {
      target: { value: "Renamed clip" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(meetingClipApi.updateClip).toHaveBeenCalledWith("clip-1", {
        title: "Renamed clip",
        description: "Budget call",
      });
    });
    expect(await screen.findByText("Renamed clip")).toBeInTheDocument();
  });

  it("deletes a clip after confirmation", async () => {
    meetingClipApi.getMeetingClips.mockResolvedValue([SAMPLE_CLIP]);
    meetingClipApi.deleteClip.mockResolvedValue({ message: "ok" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderManager();
    await screen.findByText("Decision moment");

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(meetingClipApi.deleteClip).toHaveBeenCalledWith("clip-1");
    });
    expect(screen.queryByText("Decision moment")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("adds an annotation and reloads it onto the clip", async () => {
    meetingClipApi.getMeetingClips.mockResolvedValue([SAMPLE_CLIP]);
    meetingClipApi.addClipAnnotation.mockResolvedValue({
      _id: "ann-2",
      text: "Follow up",
      timestamp: 14,
    });

    renderManager();
    await screen.findByText("Decision moment");

    fireEvent.click(screen.getByRole("button", { name: /add annotation/i }));
    fireEvent.change(screen.getByLabelText(/annotation time/i), {
      target: { value: "14" },
    });
    fireEvent.change(screen.getByLabelText(/annotation note/i), {
      target: { value: "Follow up" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(meetingClipApi.addClipAnnotation).toHaveBeenCalledWith("clip-1", {
        text: "Follow up",
        timestamp: 14,
      });
    });
    expect(await screen.findByText("Follow up")).toBeInTheDocument();
  });

  it("plays the meeting recording from the clip start time", async () => {
    meetingClipApi.getMeetingClips.mockResolvedValue([SAMPLE_CLIP]);

    renderManager();
    await screen.findByText("Decision moment");

    const audio = screen.getByTestId("clip-manager-audio");
    const play = vi.fn().mockResolvedValue();
    Object.defineProperty(audio, "play", { value: play });
    Object.defineProperty(audio, "pause", { value: vi.fn() });
    Object.defineProperty(audio, "paused", { value: true, configurable: true });

    fireEvent.click(
      screen.getByRole("button", { name: /play clip decision moment/i }),
    );

    await waitFor(() => {
      expect(play).toHaveBeenCalled();
    });
    expect(audio.currentTime).toBe(10);
  });

  it("shows an error state when listing clips fails", async () => {
    meetingClipApi.getMeetingClips.mockRejectedValue({
      response: { data: { message: "Server Error" } },
    });

    renderManager();

    expect(await screen.findByRole("alert")).toHaveTextContent("Server Error");
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows a forbidden state when the API denies access", async () => {
    meetingClipApi.getMeetingClips.mockRejectedValue({
      response: {
        status: 403,
        data: { message: "Forbidden: You don't have access to this resource" },
      },
    });

    renderManager();

    expect(
      await screen.findByTestId("clip-manager-forbidden"),
    ).toHaveTextContent(/don't have access/i);
    expect(
      screen.queryByRole("button", { name: /create clip/i }),
    ).not.toBeInTheDocument();
  });

  it("hides create, edit, and delete controls when the user cannot manage clips", async () => {
    meetingClipApi.getMeetingClips.mockResolvedValue([SAMPLE_CLIP]);

    renderManager({ canManage: false });

    await screen.findByText("Decision moment");
    expect(
      screen.queryByRole("button", { name: /create clip/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^edit$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add annotation/i }),
    ).not.toBeInTheDocument();
  });
});
