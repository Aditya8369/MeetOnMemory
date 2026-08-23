import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PolicyCompliance from "../PolicyCompliance.jsx";
import { policyComplianceApi } from "../../services";

vi.mock("../../services", () => ({
  policyComplianceApi: {
    getFlags: vi.fn(),
    updateFlagStatus: vi.fn(),
    getDecisionCompliance: vi.fn(),
    getPolicyRelatedDecisions: vi.fn(),
    getPolicyVersion: vi.fn(),
    exportEvidence: vi.fn(),
    reEvaluate: vi.fn(),
  },
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div>Navbar</div>,
}));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("PolicyCompliance evidence and durable links", () => {
  beforeEach(() => vi.clearAllMocks());

  const flag = {
    _id: "flag-1",
    classification: "potential_conflict",
    status: "unresolved",
    similarityScore: 0.9,
    policyVersion: "2.1",
    decisionId: { _id: "decision-1", text: "Approve vendor" },
    policyId: { _id: "policy-1", name: "Procurement Policy", version: "2.1" },
    reasoning: "Vendor approval requires procurement review.",
  };

  it("exports a compliance item and exposes a durable version URL", async () => {
    policyComplianceApi.getFlags.mockResolvedValue({
      data: { success: true, flags: [flag] },
    });
    policyComplianceApi.exportEvidence.mockResolvedValue({
      data: new Blob(["zip"]),
      headers: { "content-disposition": 'attachment; filename="evidence.zip"' },
    });

    render(
      <MemoryRouter>
        <PolicyCompliance />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Approve vendor")).toBeInTheDocument();
    expect(screen.getByText(/Durable link:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Export ZIP/i }));
    await waitFor(() =>
      expect(policyComplianceApi.exportEvidence).toHaveBeenCalledWith(
        "flag-1",
        "zip",
      ),
    );
  });

  it("loads a policy version from a durable query-string link", async () => {
    policyComplianceApi.getFlags.mockResolvedValue({
      data: { success: true, flags: [] },
    });
    policyComplianceApi.getPolicyVersion.mockResolvedValue({
      data: {
        success: true,
        data: {
          policyId: "policy-1",
          version: {
            name: "Procurement Policy",
            version: "2.1",
            summary: "Approval rules",
          },
        },
      },
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/policy-compliance?policyId=policy-1&version=2.1&classification=potential_conflict",
        ]}
      >
        <PolicyCompliance />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(policyComplianceApi.getPolicyVersion).toHaveBeenCalledWith(
        "policy-1",
        "2.1",
      ),
    );
    expect(
      await screen.findByText(/Procurement Policy · v2.1/),
    ).toBeInTheDocument();
  });
});
