import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("LanguagePreferences uses Clerk-aware apiClient (#1407)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url) => {
      if (url === "/api/translation/preferences") {
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
      if (url === "/api/translation/languages") {
        return Promise.resolve({
          data: { languages: [{ code: "en", name: "English" }] },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("loads preferences and languages through apiClient instead of raw fetch", async () => {
    render(<LanguagePreferences />);

    await waitFor(() => {
      expect(screen.getByText("Language Preferences")).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledWith("/api/translation/preferences");
    expect(mockGet).toHaveBeenCalledWith("/api/translation/languages");
  });
});
