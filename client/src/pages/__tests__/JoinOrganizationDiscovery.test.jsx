import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import JoinOrganizationPage from "../JoinOrganizationPage";
import AppContent from "../../context/AppContent";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("../../services", () => ({
  invitationApi: {
    getInvitationByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    rejectInvitation: vi.fn(),
  },
}));

const renderJoinPage = (initialRoute) =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AppContent.Provider
        value={{
          getUserData: vi.fn(),
          setUserData: vi.fn(),
        }}
      >
        <Routes>
          <Route path="/join-organization" element={<JoinOrganizationPage />} />
          <Route
            path="/browse-organizations"
            element={<div>Browse Organizations Page</div>}
          />
        </Routes>
      </AppContent.Provider>
    </MemoryRouter>,
  );

describe("JoinOrganizationPage discovery redirect (#293)", () => {
  it("redirects non-token visits to the browse organizations flow", () => {
    renderJoinPage("/join-organization");

    expect(screen.getByText("Browse Organizations Page")).toBeInTheDocument();
  });
});
