import { describe, expect, it } from "vitest";
import { validateLifecyclePolicyPatch } from "../services/memoryLifecycleRetentionService.js";

describe("memory lifecycle retention policy validation", () => {
  it("accepts increasing lifecycle thresholds", () => {
    expect(
      validateLifecyclePolicyPatch({
        dormantAfterDays: 14,
        archivedAfterDays: 45,
        expiredAfterDays: 180,
        minImportanceScoreToProtect: 80,
        hardDeleteExpired: false,
      }),
    ).toEqual({
      dormantAfterDays: 14,
      archivedAfterDays: 45,
      expiredAfterDays: 180,
      minImportanceScoreToProtect: 80,
      hardDeleteExpired: false,
    });
  });

  it("rejects thresholds that can never be reached in order", () => {
    expect(() =>
      validateLifecyclePolicyPatch({
        dormantAfterDays: 90,
        archivedAfterDays: 30,
      }),
    ).toThrow("dormant < archived < expired");
  });

  it("allows null to clear an organization override", () => {
    expect(
      validateLifecyclePolicyPatch({
        archivedAfterDays: null,
        hardDeleteExpired: null,
      }),
    ).toEqual({
      archivedAfterDays: null,
      hardDeleteExpired: null,
    });
  });
});
