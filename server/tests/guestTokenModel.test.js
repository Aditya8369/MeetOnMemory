const { default: GuestToken } = await import("../models/GuestToken.js");

describe("GuestToken Model Schema Definition Tests (#1900)", () => {
  it("compiles and exports GuestToken successfully", () => {
    expect(GuestToken).toBeDefined();
    expect(GuestToken.modelName).toBe("GuestAccessToken");
  });
});
