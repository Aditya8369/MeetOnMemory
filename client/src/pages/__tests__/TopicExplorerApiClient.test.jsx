import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import TopicExplorer from "../TopicExplorer.jsx";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <nav data-testid="shared-navbar">Shared Navbar</nav>,
}));

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import apiClient from "../../services/apiClient.js";

vi.mock("recharts", () => ({
  ScatterChart: ({ children }) => <div>{children}</div>,
  Scatter: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ZAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Cell: () => null,
}));

vi.mock("../../context/AppContent.js", () => ({
  default: React.createContext({
    userData: { organization: { _id: "507f1f77bcf86cd799439011" } },
  }),
}));

describe("TopicExplorer uses Clerk-aware apiClient (#1407)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: { data: [] } });
  });

  it("fetches topic clusters through apiClient without manual getToken headers", async () => {
    render(
      <BrowserRouter>
        <TopicExplorer />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/topics/clusters/org/507f1f77bcf86cd799439011",
      );
    });
  });
});

