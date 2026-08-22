import { act, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppContent from "../../../../context/AppContent";
import { useScheduleMeeting } from "../useScheduleMeeting";
import { meetingApi, meetingSeriesApi } from "../../../../services";
import { toast } from "react-toastify";

vi.mock("../../../../services", () => ({
  meetingApi: {
    scheduleMeeting: vi.fn(),
  },
  meetingSeriesApi: {
    createSeries: vi.fn(),
  },
  meetingTemplateApi: {
    getTemplates: vi
      .fn()
      .mockResolvedValue({ data: { success: true, templates: [] } }),
  },
  aiSummaryTemplateApi: {
    getTemplates: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useScheduleMeeting Series Wiring (#2004)", () => {
  const mockUserData = {
    _id: "user-123",
    organization: { _id: "org-456" },
  };

  const wrapper = ({ children }) => (
    <AppContent.Provider value={{ userData: mockUserData }}>
      {children}
    </AppContent.Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits single non-recurring meeting to meetingApi.scheduleMeeting", async () => {
    meetingApi.scheduleMeeting.mockResolvedValue({
      data: { success: true, meeting: { _id: "m-1" } },
    });

    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    act(() => {
      result.current.setScheduleData((prev) => ({
        ...prev,
        title: "Single Sync",
        date: "2026-09-01",
        time: "10:00",
        recurrencePattern: "none",
      }));
    });

    await act(async () => {
      await result.current.handleScheduleSubmit({ preventDefault: vi.fn() });
    });

    expect(meetingApi.scheduleMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Single Sync",
        date: "2026-09-01",
        time: "10:00",
        recurrencePattern: "none",
      }),
    );
    expect(meetingSeriesApi.createSeries).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Meeting scheduled"),
    );
  });

  it("submits recurring schedule to meetingSeriesApi.createSeries when recurrencePattern is set", async () => {
    meetingSeriesApi.createSeries.mockResolvedValue({
      data: {
        success: true,
        meetingsCreated: 4,
        series: { _id: "series-101" },
      },
    });

    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    act(() => {
      result.current.setScheduleData((prev) => ({
        ...prev,
        title: "Weekly Standup",
        date: "2026-09-01",
        endDate: "2026-09-30",
        time: "09:30",
        recurrencePattern: "weekly",
      }));
    });

    await act(async () => {
      await result.current.handleScheduleSubmit({ preventDefault: vi.fn() });
    });

    expect(meetingSeriesApi.createSeries).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Weekly Standup",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        recurrencePattern: "weekly",
      }),
    );
    expect(meetingApi.scheduleMeeting).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining(
        "Meeting series created successfully with 4 occurrence(s)!",
      ),
    );
  });

  it("blocks recurring schedule if endDate is missing", async () => {
    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    act(() => {
      result.current.setScheduleData((prev) => ({
        ...prev,
        title: "Weekly Standup",
        date: "2026-09-01",
        time: "09:30",
        recurrencePattern: "weekly",
        endDate: "",
      }));
    });

    await act(async () => {
      await result.current.handleScheduleSubmit({ preventDefault: vi.fn() });
    });

    expect(meetingSeriesApi.createSeries).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "End date is required for recurring meetings",
    );
  });

  it("blocks recurring schedule if startDate is after endDate", async () => {
    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    act(() => {
      result.current.setScheduleData((prev) => ({
        ...prev,
        title: "Weekly Standup",
        date: "2026-10-01",
        endDate: "2026-09-01",
        time: "09:30",
        recurrencePattern: "weekly",
      }));
    });

    await act(async () => {
      await result.current.handleScheduleSubmit({ preventDefault: vi.fn() });
    });

    expect(meetingSeriesApi.createSeries).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Start date must be before or equal to end date",
    );
  });
});
