import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Bookmarks from "../Bookmarks.jsx";
import * as bookmarkApi from "../../api/bookmarkApi.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="mock-navbar">Navbar</div>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../api/bookmarkApi.js", () => ({
  getBookmarksAPI: vi.fn(),
  getCollectionsAPI: vi.fn(),
  deleteCollectionAPI: vi.fn(),
  toggleBookmarkAPI: vi.fn(),
}));

describe("Bookmarks Mobile Responsive Sidebar & Drawer (#1650)", () => {
  const mockCollections = [
    { name: "Engineering", color: "#3B82F6", count: 3 },
    { name: "Design", color: "#10B981", count: 1 },
  ];

  const mockBookmarks = [
    {
      _id: "bm1",
      collectionName: "Engineering",
      color: "#3B82F6",
      notes: "Important sprint notes",
      meeting: {
        _id: "m1",
        title: "Sprint Planning Q3",
        date: "2026-08-15T10:00:00.000Z",
        duration: 45,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    bookmarkApi.getCollectionsAPI.mockResolvedValue(mockCollections);
    bookmarkApi.getBookmarksAPI.mockResolvedValue(mockBookmarks);
  });

  it("renders mobile drawer button with accessible label and aria attributes", async () => {
    render(
      <MemoryRouter>
        <Bookmarks />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning Q3")).toBeInTheDocument();
    });

    const openButton = screen.getByRole("button", {
      name: /open collections drawer/i,
    });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(openButton).toHaveAttribute("aria-controls", "bookmarks-sidebar");

    const sidebar = screen.getByLabelText("Collections Sidebar");
    expect(sidebar.className).toContain("-translate-x-full");
    expect(sidebar.className).toContain("md:translate-x-0");
  });

  it("opens and closes mobile drawer on button toggle and escape key", async () => {
    render(
      <MemoryRouter>
        <Bookmarks />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Sprint Planning Q3")).toBeInTheDocument();
    });

    const openButton = screen.getByRole("button", {
      name: /open collections drawer/i,
    });

    // Open drawer
    fireEvent.click(openButton);
    const sidebar = screen.getByLabelText("Collections Sidebar");
    expect(sidebar.className).toContain("translate-x-0");

    // Close via close button in drawer
    const closeButton = screen.getByRole("button", {
      name: /close collections drawer/i,
    });
    fireEvent.click(closeButton);
    expect(sidebar.className).toContain("-translate-x-full");

    // Reopen and close with Escape key
    fireEvent.click(openButton);
    expect(sidebar.className).toContain("translate-x-0");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(sidebar.className).toContain("-translate-x-full");
  });
});
