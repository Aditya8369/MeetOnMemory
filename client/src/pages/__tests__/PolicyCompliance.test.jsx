import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PolicyCompliance from "../PolicyCompliance.jsx";
import { policyComplianceApi } from "../../services";

vi.mock("../../services", () => ({
  policyComplianceApi: {
    getFlags: vi.fn(),
    updateFlagStatus: vi.fn(),
    getDecisionCompliance: vi.fn(),
    getPolicyRelatedDecisions: vi.fn(),
  },

  savedFilterApi: {
    getSavedFilters: vi.fn().mockResolvedValue({ data: [] }),
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  },
}));

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

describe("PolicyCompliance Component (Issue #1891 Integration)", () => {
  const mockFlags = [
    {
      _id: "flag-1",
      classification: "potential_conflict",
      status: "unresolved",
      similarityScore: 0.85,
      decisionId: { _id: "dec-1", text: "Use third-party encryption key" },
      policyId: { _id: "pol-1", name: "Data Security Policy", version: "1.2" },
      reasoning: "Conflicts with section 4: Internal Key Management",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches compliance flags and integrates getDecisionCompliance modal", async () => {
    policyComplianceApi.getFlags.mockResolvedValue({
      data: { success: true, flags: mockFlags },
    });
    policyComplianceApi.getDecisionCompliance.mockResolvedValue({
      data: {
        success: true,
        data: {
          decision: { id: "dec-1", text: "Use third-party encryption key" },
          compliance: [
            {
              _id: "comp-1",
              classification: "potential_conflict",
              similarityScore: 0.85,
              policyId: { name: "Data Security Policy", version: "1.2" },
              reasoning: "Detailed conflict explanation",
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <PolicyCompliance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(policyComplianceApi.getFlags).toHaveBeenCalledWith(
        "unresolved",
        "all",
      );
    });

    expect(
      await screen.findByText("Use third-party encryption key"),
    ).toBeInTheDocument();

    const detailsBtn = screen.getByText("Details");
    fireEvent.click(detailsBtn);

    await waitFor(() => {
      expect(policyComplianceApi.getDecisionCompliance).toHaveBeenCalledWith(
        "dec-1",
      );
    });

    expect(
      await screen.findByText("Decision Compliance Breakdown"),
    ).toBeInTheDocument();
  });

  it("integrates getPolicyRelatedDecisions reverse-lookup modal", async () => {
    policyComplianceApi.getFlags.mockResolvedValue({
      data: { success: true, flags: mockFlags },
    });
    policyComplianceApi.getPolicyRelatedDecisions.mockResolvedValue({
      data: {
        success: true,
        data: {
          policy: { id: "pol-1", name: "Data Security Policy", version: "1.2" },
          relatedDecisions: [
            {
              _id: "rel-1",
              classification: "potential_conflict",
              decisionId: { text: "Store keys on external cloud" },
              sourceMeetingId: {
                _id: "meet-1",
                title: "Security Review Meeting",
              },
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <PolicyCompliance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(policyComplianceApi.getFlags).toHaveBeenCalledWith(
        "unresolved",
        "all",
      );
    });

    const relatedBtn = screen.getByText("Related Decisions");
    fireEvent.click(relatedBtn);

    await waitFor(() => {
      expect(
        policyComplianceApi.getPolicyRelatedDecisions,
      ).toHaveBeenCalledWith("pol-1");
    });

    expect(
      await screen.findByText("Policy Reverse-Lookup"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Store keys on external cloud"),
    ).toBeInTheDocument();
  });
});
