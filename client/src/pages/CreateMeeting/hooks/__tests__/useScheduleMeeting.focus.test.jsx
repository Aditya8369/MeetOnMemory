import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useScheduleMeeting } from "../useScheduleMeeting";
import { focusTimeApi } from "../../../../api/focusTimeApi";
import { meetingApi } from "../../../../services";

// Mock services/apis
vi.mock("../../../../api/focusTimeApi", () => ({
  focusTimeApi: {
    getBlocks: vi.fn(),
  },
}));

vi.mock("../../../../services", () => ({
  meetingApi: {
    scheduleMeeting: vi.fn(),
  },
  meetingSeriesApi: {
    createSeries: vi.fn(),
  },
  meetingTemplateApi: {
    getTemplates: vi.fn(),
  },
  aiSummaryTemplateApi: {
    getTemplates: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useScheduleMeeting Focus Conflict & Audit Note (#2067)", () => {
  const wrapper = ({ children }) => <div>{children}</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warns user and includes auditNote on conflict scheduling", async () => {
    // Mock focus block at 10:00 AM on 2026-08-23
    const focusBlock = {
      _id: "fb1",
      title: "Deep Work",
      startTime: "2026-08-23T10:00:00.000Z",
      endTime: "2026-08-23T12:00:00.000Z",
      isRecurring: false,
    };
    focusTimeApi.getBlocks.mockResolvedValue([focusBlock]);

    // Mock window prompt/confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValue("Important override reason");

    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    await waitFor(() => {
      expect(focusTimeApi.getBlocks).toHaveBeenCalled();
    });

    // Set meeting date and time that overlaps (10:30 AM, 60 min duration)
    act(() => {
      result.current.setScheduleData({
        title: "Team Sync",
        description: "Weekly sync",
        meetingType: "conference",
        date: "2026-08-23",
        time: "10:30:00",
        duration: 60,
      });
    });

    meetingApi.scheduleMeeting.mockResolvedValue({
      data: { success: true },
    });

    // Submit scheduling
    await act(async () => {
      await result.current.handleScheduleSubmit({ preventDefault: () => {} });
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(promptSpy).toHaveBeenCalled();
    expect(meetingApi.scheduleMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Team Sync",
        auditNote: "Important override reason",
      }),
    );
  });
});
