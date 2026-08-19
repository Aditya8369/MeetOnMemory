import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../i18n";
import Footer from "../Footer";

describe("Footer Localization (#1662)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders english footer navigation labels correctly", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Footer />
      </MemoryRouter>,
    );

    // Verify key localized strings in English
    expect(screen.getAllByText("Cookies").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Developer Docs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contact Support").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GitHub Repository").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Report Issues").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contributing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Code of Conduct").length).toBeGreaterThan(0);
    expect(screen.getByText("Built with")).toBeInTheDocument();
  });

  it("renders hindi footer navigation labels when language switched to hi", async () => {
    await i18n.changeLanguage("hi");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("कुकीज़").length).toBeGreaterThan(0);
    expect(screen.getAllByText("डेवलपर दस्तावेज़").length).toBeGreaterThan(0);
    expect(screen.getAllByText("सहायता से संपर्क करें").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("GitHub रिपॉजिटरी").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("समस्याओं की रिपोर्ट करें").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("योगदान").length).toBeGreaterThan(0);
    expect(screen.getAllByText("आचार संहिता").length).toBeGreaterThan(0);
    expect(screen.getByText("इसके साथ निर्मित")).toBeInTheDocument();
  });
});
