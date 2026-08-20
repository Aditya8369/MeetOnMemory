import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import OrganizationHeader from "../OrganizationHeader";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("OrganizationHeader discovery navigation (#293)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("routes browse action to the canonical browse organizations page", () => {
    render(
      <MemoryRouter>
        <OrganizationHeader showActions />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Browse/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/browse-organizations");
  });
});
