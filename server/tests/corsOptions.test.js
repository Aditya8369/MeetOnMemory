import { describe, it, expect } from "vitest";
import { corsOptions, allowedOrigins } from "../config/corsOptions.js";

describe("corsOptions", () => {
  it("allows approved origins", () => {
    const testOrigin = allowedOrigins[0];
    corsOptions.origin(testOrigin, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });
  });

  it("allows the production Vercel frontend origin", () => {
    corsOptions.origin("https://meetonmemory.vercel.app", (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });
  });

  it("rejects untrusted origins", () => {
    corsOptions.origin("http://untrusted.com", (err, _allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("Not allowed by CORS");
    });
  });

  it("explicitly rejects null origin", () => {
    corsOptions.origin("null", (err, _allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe("Not allowed by CORS");
    });
  });

  it("allows requests with missing origin (server-to-server / CLI)", () => {
    corsOptions.origin(undefined, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
    });
  });

  it("enables credentials for axios withCredentials cross-origin requests", () => {
    expect(corsOptions.credentials).toBe(true);
  });
});
