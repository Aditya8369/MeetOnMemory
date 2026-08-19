import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import EmptyState from "../EmptyState";

vi.mock("../../../hooks/useRBAC.js", () => ({
  useRBAC: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("../../RoleGate.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

describe("EmptyState Component SPA Navigation (#1660)", () => {
  it("renders internal links as SPA Link elements and navigates without full reload", () => {
    render(
      <MemoryRouter initialEntries={["/meetings"]}>
        <Routes>
          <Route path="/meetings" element={<EmptyState type="noMeetings" />} />
          <Route path="/upload-meeting" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", {
      name: /Upload Your First Meeting/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/upload-meeting");
    expect(link).not.toHaveAttribute("target", "_blank");

    // Click the link and verify SPA navigation
    fireEvent.click(link);
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/upload-meeting",
    );
  });

  it("renders another internal state correctly", () => {
    render(
      <MemoryRouter initialEntries={["/meetings"]}>
        <Routes>
          <Route path="/meetings" element={<EmptyState type="noScheduled" />} />
          <Route path="/create-meeting" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /Schedule a Meeting/i });
    expect(link).toBeInTheDocument();

    // Click the link and verify SPA navigation
    fireEvent.click(link);
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/create-meeting",
    );
  });
});
