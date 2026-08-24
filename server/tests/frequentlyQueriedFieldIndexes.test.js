import userModel from "../models/userModel.js";
import Transcript from "../models/transcriptModel.js";
import Comment from "../models/commentModel.js";
import Attachment from "../models/attachmentModel.js";
import SharedLink from "../models/sharedLinkModel.js";
import Poll from "../models/pollModel.js";

const indexSpecs = (model) => model.schema.indexes().map(([keys]) => keys);

const hasExactIndex = (model, expected) =>
  indexSpecs(model).some((keys) => {
    const expectedFields = Object.keys(expected);
    const actualFields = Object.keys(keys);
    return (
      expectedFields.length === actualFields.length &&
      expectedFields.every((field) => keys[field] === expected[field])
    );
  });

describe("frequently queried organization/user indexes (#1772)", () => {
  it("declares user organization and organization+role indexes", () => {
    expect(hasExactIndex(userModel, { organization: 1 })).toBe(true);
    expect(hasExactIndex(userModel, { organization: 1, role: 1 })).toBe(true);
    expect(hasExactIndex(userModel, { email: 1 })).toBe(true);
    expect(hasExactIndex(userModel, { clerkUserId: 1 })).toBe(true);
  });

  it("declares a transcript organizationId index without dropping existing ones", () => {
    expect(hasExactIndex(Transcript, { organizationId: 1 })).toBe(true);
    expect(hasExactIndex(Transcript, { meeting: 1 })).toBe(true);
    expect(hasExactIndex(Transcript, { status: 1 })).toBe(true);
    expect(hasExactIndex(Transcript, { createdAt: -1 })).toBe(true);
  });

  it("declares a comment organization index without dropping existing ones", () => {
    expect(hasExactIndex(Comment, { organization: 1 })).toBe(true);
    expect(hasExactIndex(Comment, { meeting: 1, createdAt: 1 })).toBe(true);
    expect(hasExactIndex(Comment, { parentComment: 1 })).toBe(true);
  });

  it("declares an attachment uploadedBy index without dropping existing ones", () => {
    expect(hasExactIndex(Attachment, { uploadedBy: 1 })).toBe(true);
    expect(hasExactIndex(Attachment, { meeting: 1, createdAt: -1 })).toBe(true);
  });

  it("declares shared-link organization, resource, and creator indexes", () => {
    expect(hasExactIndex(SharedLink, { organizationId: 1 })).toBe(true);
    expect(hasExactIndex(SharedLink, { resourceId: 1 })).toBe(true);
    expect(hasExactIndex(SharedLink, { createdBy: 1 })).toBe(true);
    expect(hasExactIndex(SharedLink, { hash: 1 })).toBe(true);
  });

  it("declares a poll organization index without dropping existing ones", () => {
    expect(hasExactIndex(Poll, { organization: 1 })).toBe(true);
    expect(hasExactIndex(Poll, { meeting: 1, createdAt: -1 })).toBe(true);
    expect(hasExactIndex(Poll, { isClosed: 1, expiresAt: 1 })).toBe(true);
  });
});
