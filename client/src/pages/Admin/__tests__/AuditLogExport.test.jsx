import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AuditLogViewer from "../AuditLogViewer.jsx";
import AppContent from "../../../context/AppContent.js";
import { RBACProvider } from "../../../context/RBACContext.jsx";
import { ThemeProvider } from "../../../context/ThemeContext.jsx";
import { organizationApi } from "../../../services";

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("../../../components/Navbar.jsx", () => ({
  default: () => <nav>Navbar</nav>,
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../../../services", () => ({
  organizationApi: {
    getAuditLogs: vi.fn(),
    exportAuditLogs: vi.fn(),
    getAuditLogExport: vi.fn(),
    downloadAuditLogExport: vi.fn(),
  },
}));

const mockAdminUser = {
  role: "admin",
  organization: { _id: "org-123", name: "Engineering Org" },
};

const mockMemberUser = {
  role: "member",
  organization: { _id: "org-123", name: "Engineering Org" },
};

describe("AuditLogViewer Export Actions (#2034)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizationApi.getAuditLogs.mockResolvedValue({
      data: {
        success: true,
        logs: [
          {
            _id: "log-1",
            createdAt: "2026-08-01T10:00:00.000Z",
            action: "MEMBER_ROLE_CHANGED",
            actor: { name: "Admin Alice" },
            entity: "User Bob",
            details: { newRole: "admin" },
          },
        ],
        pagination: { page: 1, total: 1, pages: 1 },
      },
    });

    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  it("exports CSV synchronously for admin user with active filters", async () => {
    organizationApi.exportAuditLogs.mockResolvedValue({
      status: 200,
      headers: { "content-type": "text/csv; charset=utf-8" },
      data: "Timestamp,Actor Name,Action\n2026-08-01,Admin Alice,MEMBER_ROLE_CHANGED",
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppContent.Provider value={{ userData: mockAdminUser }}>
            <RBACProvider>
              <AuditLogViewer />
            </RBACProvider>
          </AppContent.Provider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Alice")).toBeInTheDocument();
    });

    const exportCsvBtn = screen.getByTestId("export-csv-btn");
    expect(exportCsvBtn).toBeInTheDocument();
    expect(exportCsvBtn).not.toBeDisabled();

    fireEvent.click(exportCsvBtn);

    await waitFor(() => {
      expect(organizationApi.exportAuditLogs).toHaveBeenCalledWith(
        "org-123",
        expect.objectContaining({ format: "csv" }),
      );
    });
  });

  it("exports XLSX synchronously for admin user", async () => {
    organizationApi.exportAuditLogs.mockResolvedValue({
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      data: new Blob(["dummy-xlsx-content"]),
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppContent.Provider value={{ userData: mockAdminUser }}>
            <RBACProvider>
              <AuditLogViewer />
            </RBACProvider>
          </AppContent.Provider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const exportXlsxBtn = screen.getByTestId("export-xlsx-btn");
    expect(exportXlsxBtn).toBeInTheDocument();

    fireEvent.click(exportXlsxBtn);

    await waitFor(() => {
      expect(organizationApi.exportAuditLogs).toHaveBeenCalledWith(
        "org-123",
        expect.objectContaining({ format: "xlsx" }),
      );
    });
  });

  it("tracks async large export and polls until completion", async () => {
    organizationApi.exportAuditLogs.mockResolvedValue({
      status: 202,
      headers: { "content-type": "application/json" },
      data: {
        success: true,
        data: {
          export: {
            id: "export-async-1",
            status: "pending",
          },
        },
      },
    });

    organizationApi.getAuditLogExport.mockResolvedValue({
      data: {
        success: true,
        export: {
          id: "export-async-1",
          status: "completed",
        },
      },
    });

    organizationApi.downloadAuditLogExport.mockResolvedValue({
      data: "Timestamp,Actor Name\n2026-08-01,Admin Alice",
    });

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppContent.Provider value={{ userData: mockAdminUser }}>
            <RBACProvider>
              <AuditLogViewer />
            </RBACProvider>
          </AppContent.Provider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const exportCsvBtn = screen.getByTestId("export-csv-btn");
    fireEvent.click(exportCsvBtn);

    await waitFor(() => {
      expect(screen.getByTestId("async-export-tracker")).toBeInTheDocument();
    });
  });

  it("disables export buttons for non-admin users", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppContent.Provider value={{ userData: mockMemberUser }}>
            <RBACProvider>
              <AuditLogViewer />
            </RBACProvider>
          </AppContent.Provider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Alice")).toBeInTheDocument();
    });

    const exportCsvBtn = screen.getByTestId("export-csv-btn");
    const exportXlsxBtn = screen.getByTestId("export-xlsx-btn");

    expect(exportCsvBtn).toBeDisabled();
    expect(exportXlsxBtn).toBeDisabled();
  });
});
