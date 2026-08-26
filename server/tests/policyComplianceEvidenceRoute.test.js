import fs from "node:fs";
import path from "node:path";

describe("policy compliance evidence routes", () => {
  const routePath = path.resolve(
    process.cwd(),
    "routes/policyComplianceRoutes.js",
  );
  const source = fs.readFileSync(routePath, "utf8");

  test("registers the evidence export endpoint behind policy view permission", () => {
    expect(source).toContain('"/flags/:id/export"');
    expect(source).toContain('requirePermission("policies", "view")');
    expect(source).toContain("exportComplianceEvidence");
  });

  test("registers a version-specific policy deep-link endpoint", () => {
    expect(source).toContain('"/policies/:policyId/versions/:version"');
    expect(source).toContain("getPolicyVersionDeepLink");
  });
});
