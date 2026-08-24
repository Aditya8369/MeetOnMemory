import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Bookmarks from "../Bookmarks.jsx";
import * as bookmarkApi from "../../api/bookmarkApi.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../api/bookmarkApi.js", () => ({
  getBookmarksAPI: vi.fn().mockResolvedValue([
    {
      _id: "bm_1",
      meeting: {
        _id: "m_1",
        title: "Alpha Standup",
        date: "2026-08-20T10:00:00.000Z",
        duration: 30,
      },
      collectionName: "Project Alpha",
      notes: "Follow up on QA",
      color: "#3b82f6",
    },
  ]),
  getCollectionsAPI: vi
    .fn()
    .mockResolvedValue([{ name: "Project Alpha", count: 3, color: "#3b82f6" }]),
  deleteCollectionAPI: vi.fn().mockResolvedValue({ success: true }),
  updateCollectionAPI: vi.fn().mockResolvedValue({ success: true }),
  toggleBookmarkAPI: vi.fn().mockResolvedValue({ success: true }),
  updateBookmarkAPI: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Bookmarks Page Collections CRUD (#2015)", () => {
  const mockCollections = [
    { name: "Project Alpha", count: 3, color: "#3b82f6" },
  ];

  const mockBookmarks = [
    {
      _id: "bm_1",
      meeting: {
        _id: "m_1",
        title: "Alpha Standup",
        date: "2026-08-20T10:00:00.000Z",
        duration: 30,
      },
      collectionName: "Project Alpha",
      notes: "Follow up on QA",
      color: "#3b82f6",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    bookmarkApi.getCollectionsAPI.mockResolvedValue(mockCollections);
    bookmarkApi.getBookmarksAPI.mockResolvedValue(mockBookmarks);
    bookmarkApi.updateCollectionAPI.mockResolvedValue({ success: true });
    bookmarkApi.updateBookmarkAPI.mockResolvedValue({ success: true });
  });

  it("renders collections, opens collection create modal and allows creating", async () => {
    render(
      <MemoryRouter>
        <Bookmarks />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Project Alpha").length).toBeGreaterThan(0);
      expect(screen.getByText("Alpha Standup")).toBeInTheDocument();
      expect(screen.getByText(/Follow up on QA/i)).toBeInTheDocument();
    });

    // Click on Add new collection
    fireEvent.click(screen.getByRole("button", { name: "Add new collection" }));

    expect(
      screen.getByRole("dialog", { name: "Collection Settings Dialog" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Create New Collection")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("collection-name-input"), {
      target: { value: "Executive Board" },
    });
    fireEvent.click(screen.getByTestId("save-collection-submit-button"));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Collection Settings Dialog" }),
      ).not.toBeInTheDocument();
    });
  });

  it("allows inline editing of bookmark notes", async () => {
    render(
      <MemoryRouter>
        <Bookmarks />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha Standup")).toBeInTheDocument();
    });

    // Click edit bookmark notes
    fireEvent.click(
      screen.getByRole("button", { name: "Edit bookmark notes" }),
    );

    expect(screen.getByTestId("bookmark-notes-edit-input")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("bookmark-notes-edit-input"), {
      target: { value: "Updated critical design notes" },
    });
    fireEvent.click(screen.getByTestId("save-bookmark-edit-button"));

    await waitFor(() => {
      expect(bookmarkApi.updateBookmarkAPI).toHaveBeenCalledWith("bm_1", {
        notes: "Updated critical design notes",
        color: "#3b82f6",
      });
    });
  });
});
