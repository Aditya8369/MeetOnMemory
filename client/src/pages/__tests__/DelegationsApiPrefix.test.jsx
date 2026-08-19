import { render, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyDelegations from "../MyDelegations.jsx";
import DelegationPanel from "../../components/meetings/DelegationPanel.jsx";
import api from "../../services/apiClient.js";

vi.mock("../../services/apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Delegations client endpoints /api prefix (#1801)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MyDelegations Page", () => {
    it("makes fetch requests with the /api prefix", async () => {
      api.get.mockResolvedValue({
        data: {
          delegatedByMe: [],
          delegatedToMe: [],
        },
      });

      render(<MyDelegations />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith("/api/delegations/my-delegations");
      });
    });
  });

  describe("DelegationPanel Component", () => {
    it("makes fetch requests with the /api prefix", async () => {
      api.get.mockResolvedValue({
        data: {
          delegation: null,
        },
      });

      render(<DelegationPanel meetingId="meeting-123" participants={[]} />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          "/api/delegations/meeting/meeting-123",
        );
      });
    });
  });
});
