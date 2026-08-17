import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import UploadMeeting from "../UploadMeeting.jsx";
import AppContent from "../../context/AppContent";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("../../hooks/useMeetingUpload", () => ({
  default: () => ({
    file: null,
    setFile: vi.fn(),
    uploadProgress: 0,
    isUploading: false,
    isDragging: false,
    transcript: "",
    meetingId: null,
    setMeetingId: vi.fn(),
    fileInputRef: { current: null },
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handleFileChange: vi.fn(),
    resetUpload: vi.fn(),
    handleUpload: vi.fn(),
    formatFileSize: vi.fn(),
  }),
}));

vi.mock("../../hooks/useExport.js", () => ({
  default: () => ({ exportMeeting: vi.fn(), isExporting: false }),
}));

vi.mock("../../components/meetings/Dropzone.jsx", () => ({
  default: () => <div data-testid="dropzone">Dropzone</div>,
}));

vi.mock("../../components/meetings/MeetingRecorder.jsx", () => ({
  default: () => <div data-testid="recorder">Recorder</div>,
}));

vi.mock("../../components/meetings/TagAutocomplete.jsx", () => ({
  default: () => <div data-testid="tags">Tags</div>,
}));

describe("UploadMeeting RBAC Permission Gate (#1638)", () => {
  it("allows access for users with meetings.create permission (e.g. member)", () => {
    render(
      <AppContent.Provider
        value={{
          userData: { role: "member", organization: "org_1" },
          backendUrl: "http://localhost:4000",
        }}
      >
        <BrowserRouter>
          <UploadMeeting />
        </BrowserRouter>
      </AppContent.Provider>,
    );

    expect(screen.getByText(/upload or record meeting/i)).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("allows access for admin and owner roles", () => {
    render(
      <AppContent.Provider
        value={{
          userData: { role: "admin", organization: "org_1" },
          backendUrl: "http://localhost:4000",
        }}
      >
        <BrowserRouter>
          <UploadMeeting />
        </BrowserRouter>
      </AppContent.Provider>,
    );

    expect(screen.getByText(/upload or record meeting/i)).toBeInTheDocument();
  });

  it("renders Access Denied for roles without meetings.create permission (e.g. guest, viewer)", () => {
    render(
      <AppContent.Provider
        value={{
          userData: { role: "guest", organization: "org_1" },
          backendUrl: "http://localhost:4000",
        }}
      >
        <BrowserRouter>
          <UploadMeeting />
        </BrowserRouter>
      </AppContent.Provider>,
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /you do not have permission to upload or record meetings/i,
      ),
    ).toBeInTheDocument();
  });
});
