import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LanguagePreferences from "../LanguagePreferences.jsx";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar" />,
}));

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: (...args) => mockGet(...args),
    put: (...args) => mockPut(...args),
  },
}));

describe("LanguagePreferences (#1407, #1802)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url) => {
      if (url === "/api/translations/preferences") {
        return Promise.resolve({
          data: {
            autoTranslate: true,
            showConfidenceScores: true,
            preferredProvider: "auto",
            defaultSourceLanguage: "en",
            defaultTargetLanguages: ["es"],
            customGlossary: [],
          },
        });
      }
      if (url === "/api/translations/languages") {
        return Promise.resolve({
          data: { languages: [{ code: "en", name: "English" }] },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("loads preferences and languages through plural /api/translations endpoints", async () => {
    render(<LanguagePreferences />);

    await waitFor(() => {
      expect(screen.getByText("Language Preferences")).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledWith("/api/translations/preferences");
    expect(mockGet).toHaveBeenCalledWith("/api/translations/languages");
  });

  it("decouples error state from loading and renders error UI on fetch failure (#1802)", async () => {
    mockGet.mockImplementation((url) => {
      if (url === "/api/translations/preferences") {
        return Promise.reject(new Error("Network Error"));
      }
      return Promise.resolve({ data: { languages: [] } });
    });

    render(<LanguagePreferences />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.getByText("Unable to Load Preferences"),
      ).toBeInTheDocument();
    });

    // Make sure it doesn't get stuck in "Loading preferences..."
    expect(
      screen.queryByText("Loading preferences..."),
    ).not.toBeInTheDocument();

    // Verify retry recovers successfully
    mockGet.mockImplementation((url) => {
      if (url === "/api/translations/preferences") {
        return Promise.resolve({
          data: {
            autoTranslate: false,
            showConfidenceScores: false,
            preferredProvider: "auto",
            defaultSourceLanguage: "en",
            defaultTargetLanguages: [],
            customGlossary: [],
          },
        });
      }
      return Promise.resolve({ data: { languages: [] } });
    });

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Language Preferences")).toBeInTheDocument();
    });
  });
});
