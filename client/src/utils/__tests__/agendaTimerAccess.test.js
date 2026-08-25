import { describe, expect, it } from "vitest";
import { canManageAgendaTimer } from "../agendaTimerAccess";

const ORG_A = "org-a";
const ORG_B = "org-b";
const HOST_ID = "host-1";

const meeting = {
  uploadedBy: HOST_ID,
  organization: ORG_A,
};

describe("canManageAgendaTimer (#1985)", () => {
  it("allows the meeting uploader", () => {
    expect(
      canManageAgendaTimer(meeting, {
        _id: HOST_ID,
        organization: ORG_A,
        role: "member",
      }),
    ).toBe(true);
  });

  it("allows a same-organization admin or owner", () => {
    expect(
      canManageAgendaTimer(meeting, {
        _id: "admin-1",
        organization: { _id: ORG_A },
        role: "admin",
      }),
    ).toBe(true);
    expect(
      canManageAgendaTimer(meeting, {
        _id: "owner-1",
        organization: ORG_A,
        role: "owner",
      }),
    ).toBe(true);
  });

  it("rejects same-org members who are not the uploader", () => {
    expect(
      canManageAgendaTimer(meeting, {
        _id: "member-1",
        organization: ORG_A,
        role: "member",
      }),
    ).toBe(false);
  });

  it("rejects admins from another organization", () => {
    expect(
      canManageAgendaTimer(meeting, {
        _id: "admin-b",
        organization: ORG_B,
        role: "admin",
      }),
    ).toBe(false);
  });
});
