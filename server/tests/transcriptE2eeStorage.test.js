/**
 * Issue #1335 — encrypted transcript storage API authorization/shape tests.
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";

process.env.E2EE_ENABLED = "true";

const meetingFindById = jest.fn();
const transcriptFindOne = jest.fn();

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: {
    findById: (...args) => meetingFindById(...args),
  },
}));

jest.unstable_mockModule("../models/transcriptModel.js", () => ({
  default: Object.assign(
    function Transcript(doc) {
      Object.assign(this, doc);
      this.save = jest.fn().mockResolvedValue(this);
    },
    {
      findOne: (...args) => transcriptFindOne(...args),
    },
  ),
}));

jest.unstable_mockModule("../services/TranscriptionService.js", () => ({
  transcribeFileWithSegments: jest.fn(),
}));

jest.unstable_mockModule("../utils/embeddingUtils.js", () => ({
  indexTranscript: jest.fn(),
  searchVectorStore: jest.fn(),
  indexMeeting: jest.fn(),
}));

jest.unstable_mockModule("../utils/transcriptEmbeddingUtils.js", () => ({
  indexTranscriptChunks: jest.fn(),
}));

jest.unstable_mockModule("../services/queueService.js", () => ({
  sentimentAnalysisQueue: { add: jest.fn(), isActive: false },
}));

const { storeEncryptedTranscript } =
  await import("../controllers/transcriptController.js");

const ORG = new mongoose.Types.ObjectId();
const MEETING_ID = new mongoose.Types.ObjectId();
const USER_ID = new mongoose.Types.ObjectId();

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("storeEncryptedTranscript (#1335)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.E2EE_ENABLED = "true";
  });

  it("stores ciphertext and clears plaintext transcript", async () => {
    const meeting = {
      _id: MEETING_ID,
      organization: ORG,
      uploadedBy: USER_ID,
      transcript: "sensitive plaintext",
      save: jest.fn().mockResolvedValue(true),
    };
    meetingFindById.mockResolvedValue(meeting);
    transcriptFindOne.mockResolvedValue(null);

    const req = {
      params: { meetingId: MEETING_ID.toString() },
      user: { _id: USER_ID, organization: ORG },
      body: {
        ciphertext: "cipher-base64",
        iv: "iv-base64",
        encryptionVersion: 1,
        algorithm: "AES-GCM",
      },
    };
    const res = mockRes();

    await storeEncryptedTranscript(req, res);

    expect(meeting.transcript).toBe("");
    expect(meeting.isTranscriptEncrypted).toBe(true);
    expect(meeting.encryptedTranscript).toEqual(
      expect.objectContaining({
        ciphertext: "cipher-base64",
        iv: "iv-base64",
      }),
    );
    expect(meeting.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        isTranscriptEncrypted: true,
      }),
    );
  });

  it("rejects malformed payloads without saving", async () => {
    const meeting = {
      _id: MEETING_ID,
      organization: ORG,
      uploadedBy: USER_ID,
      transcript: "plaintext",
      save: jest.fn(),
    };
    meetingFindById.mockResolvedValue(meeting);

    const req = {
      params: { meetingId: MEETING_ID.toString() },
      user: { _id: USER_ID, organization: ORG },
      body: { ciphertext: "only-cipher" },
    };
    const res = mockRes();

    await storeEncryptedTranscript(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(meeting.save).not.toHaveBeenCalled();
  });

  it("rejects when E2EE feature flag is off", async () => {
    process.env.E2EE_ENABLED = "false";
    const req = {
      params: { meetingId: MEETING_ID.toString() },
      user: { _id: USER_ID, organization: ORG },
      body: { ciphertext: "c", iv: "i" },
    };
    const res = mockRes();

    await storeEncryptedTranscript(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(meetingFindById).not.toHaveBeenCalled();
  });

  it("denies cross-organization access", async () => {
    meetingFindById.mockResolvedValue({
      _id: MEETING_ID,
      organization: ORG,
      uploadedBy: USER_ID,
      save: jest.fn(),
    });

    const req = {
      params: { meetingId: MEETING_ID.toString() },
      user: {
        _id: new mongoose.Types.ObjectId(),
        organization: new mongoose.Types.ObjectId(),
      },
      body: { ciphertext: "c", iv: "i" },
    };
    const res = mockRes();

    await storeEncryptedTranscript(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
