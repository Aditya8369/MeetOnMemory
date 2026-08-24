import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import CookiePolicy from "../CookiePolicy.jsx";
import * as cookieManager from "../../utils/cookieManager.js";

vi.mock("../../components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

describe("CookiePolicy Cookie Console (#1795)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  it("loads and applies preferences when user clicks Save Preferences", async () => {
    const applySpy = vi.spyOn(cookieManager, "applyCookiePreferences");

    render(
      <BrowserRouter>
        <CookiePolicy />
      </BrowserRouter>,
    );

    const saveButton = screen.getByRole("button", {
      name: /save preferences/i,
    });
    fireEvent.click(saveButton);

    expect(applySpy).toHaveBeenCalled();
    expect(
      localStorage.getItem(cookieManager.COOKIE_PREFERENCES_KEY),
    ).toBeDefined();
    expect(document.cookie).toContain("mom_consent_essential=true");
  });

  it("clears non-essential cookies and resets preferences when user clicks Reset to Essential Only", async () => {
    const clearSpy = vi.spyOn(cookieManager, "clearNonEssentialCookies");

    // Set a dummy cookie to verify deletion
    document.cookie = "_ga=GA1.2.123456789.1234567890; path=/";

    render(
      <BrowserRouter>
        <CookiePolicy />
      </BrowserRouter>,
    );

    const resetButton = screen.getByRole("button", {
      name: /reset to essential only/i,
    });
    fireEvent.click(resetButton);

    expect(clearSpy).toHaveBeenCalled();
    const stored = JSON.parse(
      localStorage.getItem(cookieManager.COOKIE_PREFERENCES_KEY),
    );
    expect(stored.analytics).toBe(false);
    expect(stored.functional).toBe(false);
    expect(stored.targeting).toBe(false);
  });
});
