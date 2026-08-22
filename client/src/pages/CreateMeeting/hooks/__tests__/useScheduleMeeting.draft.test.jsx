import { act, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppContent from "../../../../context/AppContent";
import { useScheduleMeeting } from "../useScheduleMeeting";

vi.mock("../../../services", () => ({
  meetingApi: {},
  meetingTemplateApi: {
    getTemplates: vi
      .fn()
      .mockResolvedValue({ data: { success: true, templates: [] } }),
  },
  aiSummaryTemplateApi: {
    getTemplates: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock("../../../../api/focusTimeApi", () => ({
  focusTimeApi: {
    getBlocks: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useScheduleMeeting Draft Restoration (#1645)", () => {
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
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes agendaItems in draft serialization", () => {
    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    act(() => {
      // Simulate adding an agenda item
      result.current.setNewAgenda("Review Action Items");
    });

    act(() => {
      result.current.addAgendaItem();
    });

    // Advance timer so draft recovery auto-saves (debounce is 700ms)
    act(() => {
      vi.advanceTimersByTime(800);
    });

    const draftKey =
      "meet-on-memory:meeting-draft:v1:user-123:org-456:create:new";
    const savedDraftRaw = window.localStorage.getItem(draftKey);
    expect(savedDraftRaw).not.toBeNull();

    const savedDraft = JSON.parse(savedDraftRaw);
    expect(savedDraft.values.agendaItems).toBeDefined();
    expect(savedDraft.values.agendaItems).toHaveLength(1);
    expect(savedDraft.values.agendaItems[0].text).toBe("Review Action Items");
  });

  it("restores agenda items correctly on restoreDraft", () => {
    const draftKey =
      "meet-on-memory:meeting-draft:v1:user-123:org-456:create:new";
    const preSavedDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      values: {
        scheduleData: { title: "Draft Meeting" },
        participants: [],
        agendaItems: [{ id: "agenda-1", text: "Pre-saved Item" }],
      },
    };
    window.localStorage.setItem(draftKey, JSON.stringify(preSavedDraft));

    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    // Initial state before restoration
    expect(result.current.agendaItems).toHaveLength(0);

    // Trigger restoration
    act(() => {
      result.current.restoreDraft();
    });

    expect(result.current.scheduleData.title).toBe("Draft Meeting");
    expect(result.current.agendaItems).toHaveLength(1);
    expect(result.current.agendaItems[0].text).toBe("Pre-saved Item");
  });

  it("remains valid with empty agenda items list", () => {
    const draftKey =
      "meet-on-memory:meeting-draft:v1:user-123:org-456:create:new";
    const preSavedDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      values: {
        scheduleData: { title: "Draft Meeting" },
        participants: [],
        agendaItems: [],
      },
    };
    window.localStorage.setItem(draftKey, JSON.stringify(preSavedDraft));

    const { result } = renderHook(() => useScheduleMeeting(), { wrapper });

    act(() => {
      result.current.restoreDraft();
    });

    expect(result.current.agendaItems).toEqual([]);
  });
});
