import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignUpPage from "../SignUp";
import AppContent from "../../context/AppContent";

const mockSignUp = {
  create: vi.fn(),
  prepareEmailAddressVerification: vi.fn(),
  attemptEmailAddressVerification: vi.fn(),
};

const mockSetActive = vi.fn().mockResolvedValue(true);

vi.mock("@clerk/clerk-react", () => ({
  useSignUp: () => ({
    isLoaded: true,
    signUp: mockSignUp,
    setActive: mockSetActive,
  }),
  useAuth: () => ({
    isSignedIn: false,
    isLoaded: true,
    getToken: vi.fn(),
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper component to capture navigation
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderSignUpWithRedirect = (
  redirectUrl,
  userData = { hasCompletedOnboarding: true },
) => {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/signup", state: { redirect: redirectUrl } },
      ]}
    >
      <AppContent.Provider
        value={{ isLoggedin: false, loading: false, userData }}
      >
        <Routes>
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </AppContent.Provider>
    </MemoryRouter>,
  );
};

describe("SignUp Redirect Validation (#1656)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const simulateSuccessfulSignUpAndOTP = async () => {
    // Fill sign up
    fireEvent.change(screen.getByPlaceholderText(/John Doe/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "Password123!" },
    });

    mockSignUp.create.mockResolvedValue({});
    mockSignUp.prepareEmailAddressVerification.mockResolvedValue({});

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Wait for OTP view
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/123456/i)).toBeInTheDocument();
    });

    // Fill OTP
    fireEvent.change(screen.getByPlaceholderText(/123456/i), {
      target: { value: "111111" },
    });

    mockSignUp.attemptEmailAddressVerification.mockResolvedValue({
      status: "complete",
      createdSessionId: "sess_123",
    });

    fireEvent.click(screen.getByRole("button", { name: /Verify Email/i }));
  };

  it("allows valid internal redirect and completes normal sign-up", async () => {
    renderSignUpWithRedirect("/settings/profile");
    await simulateSuccessfulSignUpAndOTP();

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/settings/profile",
      );
    });
  });

  it("rejects external absolute URLs and falls back to dashboard", async () => {
    renderSignUpWithRedirect("https://evil.com/phishing");
    await simulateSuccessfulSignUpAndOTP();

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/dashboard",
      );
    });
  });

  it("rejects protocol-relative URLs and falls back to dashboard", async () => {
    renderSignUpWithRedirect("//evil.com");
    await simulateSuccessfulSignUpAndOTP();

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/dashboard",
      );
    });
  });

  it("uses /organizations fallback if user has not completed onboarding for invalid redirect", async () => {
    renderSignUpWithRedirect("https://evil.com", {
      hasCompletedOnboarding: false,
    });
    await simulateSuccessfulSignUpAndOTP();

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent(
        "/organizations",
      );
    });
  });
});
