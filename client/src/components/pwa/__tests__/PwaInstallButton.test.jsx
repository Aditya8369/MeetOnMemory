import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PwaInstallButton from "../PwaInstallButton.jsx";
import PwaContext from "../../../context/PwaContext.jsx";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("PwaInstallButton (#2029)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when app is not installable and not installed", () => {
    const { container } = render(
      <PwaContext.Provider
        value={{
          isInstallable: false,
          isInstalled: false,
          promptInstall: vi.fn(),
        }}
      >
        <PwaInstallButton />
      </PwaContext.Provider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders install button when app is installable", async () => {
    const mockPrompt = vi.fn().mockResolvedValue(true);

    render(
      <PwaContext.Provider
        value={{
          isInstallable: true,
          isInstalled: false,
          promptInstall: mockPrompt,
        }}
      >
        <PwaInstallButton />
      </PwaContext.Provider>,
    );

    const installBtn = screen.getByTestId("pwa-install-btn");
    expect(installBtn).toBeInTheDocument();
    expect(installBtn).toHaveTextContent("Install App");

    fireEvent.click(installBtn);
    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  it("renders banner variant correctly", async () => {
    const mockPrompt = vi.fn().mockResolvedValue(true);

    render(
      <PwaContext.Provider
        value={{
          isInstallable: true,
          isInstalled: false,
          promptInstall: mockPrompt,
        }}
      >
        <PwaInstallButton variant="banner" />
      </PwaContext.Provider>,
    );

    expect(screen.getByTestId("pwa-install-banner")).toBeInTheDocument();
    expect(screen.getByText("Install MeetOnMemory App")).toBeInTheDocument();

    const bannerBtn = screen.getByTestId("pwa-banner-install-btn");
    fireEvent.click(bannerBtn);

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalled();
    });
  });

  it("renders installed badge when showWhenInstalled is true and app is installed", () => {
    render(
      <PwaContext.Provider
        value={{
          isInstallable: false,
          isInstalled: true,
          promptInstall: vi.fn(),
        }}
      >
        <PwaInstallButton showWhenInstalled={true} />
      </PwaContext.Provider>,
    );

    expect(screen.getByTestId("pwa-installed-badge")).toBeInTheDocument();
    expect(screen.getByText("Installed")).toBeInTheDocument();
  });
});
