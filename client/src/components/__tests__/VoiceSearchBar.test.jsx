// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import VoiceSearchBar from "../VoiceSearchBar.jsx";
import searchApi from "../../services/searchApi";

vi.mock("../../services/searchApi", () => ({
  default: {
    voiceSearch: vi.fn(),
  },
}));

describe("VoiceSearchBar Component (#2010)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input, search icon, and microphone toggle button", () => {
    render(<VoiceSearchBar />);

    expect(screen.getByTestId("voice-search-bar")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Speak or type your search query..."),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Start voice search")).toBeInTheDocument();
  });

  it("triggers voice search on Enter keypress with query >= 3 chars", async () => {
    searchApi.voiceSearch.mockResolvedValue({
      success: true,
      results: [{ title: "Sprint Planning", score: 0.95 }],
    });

    const onResults = vi.fn();
    render(<VoiceSearchBar onResults={onResults} />);

    const input = screen.getByPlaceholderText(
      "Speak or type your search query...",
    );
    fireEvent.change(input, { target: { value: "Sprint Planning" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(searchApi.voiceSearch).toHaveBeenCalledWith("Sprint Planning");
      expect(onResults).toHaveBeenCalledWith([
        { title: "Sprint Planning", score: 0.95 },
      ]);
    });
  });

  it("clears search input and results when clear button is clicked", async () => {
    searchApi.voiceSearch.mockResolvedValue({
      success: true,
      results: [{ title: "Sprint Planning" }],
    });

    render(<VoiceSearchBar />);

    const input = screen.getByPlaceholderText(
      "Speak or type your search query...",
    );
    fireEvent.change(input, { target: { value: "Sprint Planning" } });

    const clearBtn = screen.getByTitle("Clear search");
    fireEvent.click(clearBtn);

    expect(input.value).toBe("");
  });
});
