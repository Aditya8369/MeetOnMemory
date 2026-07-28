import { describe, it, expect } from "vitest";
import { validateImageUrl } from "../imageUrl.js";

describe("validateImageUrl", () => {
  it("allows empty values for placeholder fallback", () => {
    expect(validateImageUrl("")).toBe("");
    expect(validateImageUrl("   ")).toBe("");
  });

  it("accepts http(s) URLs", () => {
    expect(
      validateImageUrl("https://cdn.example.com/logo.png", "Logo URL"),
    ).toBe("");
    expect(
      validateImageUrl("http://cdn.example.com/banner.jpg", "Banner URL"),
    ).toBe("");
  });

  it("rejects non-http protocols", () => {
    expect(validateImageUrl("ftp://cdn.example.com/a.png", "Logo URL")).toBe(
      "Logo URL must use http or https.",
    );
  });

  it("rejects invalid URLs", () => {
    expect(validateImageUrl("not-a-url", "Banner URL")).toBe(
      "Banner URL must be a valid URL starting with http:// or https://.",
    );
  });
});
