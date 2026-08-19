/**
 * Issue #1538 — Meeting Feedback participant authorization.
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import {
  isMeetingFeedbackParticipant,
  resolveMeetingFeedbackAccess,
  resolveOwnedFeedbackForMutation,
} from "../utils/meetingFeedbackAccess.js";
import Meeting from "../models/meetingModel.js";
import MeetingFeedback from "../models/meetingFeedbackModel.js";

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const MEETING_ID = new mongoose.Types.ObjectId();
const OWNER_ID = new mongoose.Types.ObjectId();
const PARTICIPANT_ID = new mongoose.Types.ObjectId();
const OUTSIDER_ID = new mongoose.Types.ObjectId();
const FEEDBACK_ID = new mongoose.Types.ObjectId();

const owner = {
  _id: OWNER_ID,
  organization: ORG_A,
  email: "owner@example.com",
};

const participant = {
  _id: PARTICIPANT_ID,
  organization: ORG_A,
  email: "participant@example.com",
};

const orgMemberOutsider = {
  _id: OUTSIDER_ID,
  organization: ORG_A,
  email: "outsider@example.com",
};

const meetingDoc = (overrides = {}) => ({
  _id: MEETING_ID,
  uploadedBy: OWNER_ID,
  organization: ORG_A,
  participants: [{ user: PARTICIPANT_ID, email: "participant@example.com" }],
  ...overrides,
});

describe("meetingFeedbackAccess (#1538)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isMeetingFeedbackParticipant", () => {
    it("allows the meeting uploader", () => {
      expect(isMeetingFeedbackParticipant(meetingDoc(), owner)).toBe(true);
    });

    it("allows a listed participant by user id", () => {
      expect(isMeetingFeedbackParticipant(meetingDoc(), participant)).toBe(
        true,
      );
    });

    it("allows a listed participant matched by email when user id differs", () => {
      const invitee = {
        _id: new mongoose.Types.ObjectId(),
        email: "participant@example.com",
      };
      expect(isMeetingFeedbackParticipant(meetingDoc(), invitee)).toBe(true);
    });

    it("denies org members who are not participants", () => {
      expect(
        isMeetingFeedbackParticipant(meetingDoc(), orgMemberOutsider),
      ).toBe(false);
    });
  });

  describe("resolveMeetingFeedbackAccess", () => {
    it("returns 400 for invalid meeting ids", async () => {
      const result = await resolveMeetingFeedbackAccess("bad-id", participant);
      expect(result.error).toEqual({
        status: 400,
        message: "Invalid meeting ID",
      });
    });

    it("returns 404 when the meeting does not exist", async () => {
      jest.spyOn(Meeting, "findById").mockResolvedValue(null);

      const result = await resolveMeetingFeedbackAccess(
        MEETING_ID.toString(),
        participant,
      );

      expect(result.error).toEqual({
        status: 404,
        message: "Meeting not found",
      });
    });

    it("returns 403 for cross-organization meetings", async () => {
      jest
        .spyOn(Meeting, "findById")
        .mockResolvedValue(meetingDoc({ organization: ORG_B }));

      const result = await resolveMeetingFeedbackAccess(
        MEETING_ID.toString(),
        participant,
      );

      expect(result.error?.status).toBe(403);
      expect(result.error?.message).toContain("another organization");
    });

    it("returns 403 for org members who are not participants", async () => {
      jest.spyOn(Meeting, "findById").mockResolvedValue(meetingDoc());

      const result = await resolveMeetingFeedbackAccess(
        MEETING_ID.toString(),
        orgMemberOutsider,
      );

      expect(result.error).toEqual({
        status: 403,
        message: "Not authorized to access feedback for this meeting",
      });
    });

    it("returns the meeting for authorized participants", async () => {
      const meeting = meetingDoc();
      jest.spyOn(Meeting, "findById").mockResolvedValue(meeting);

      const result = await resolveMeetingFeedbackAccess(
        MEETING_ID.toString(),
        participant,
      );

      expect(result.meeting).toBe(meeting);
    });
  });

  describe("resolveOwnedFeedbackForMutation", () => {
    it("denies delete when the caller is not the feedback owner", async () => {
      jest.spyOn(MeetingFeedback, "findById").mockResolvedValue({
        _id: FEEDBACK_ID,
        meetingId: MEETING_ID,
        userId: OWNER_ID,
      });
      jest.spyOn(Meeting, "findById").mockResolvedValue(meetingDoc());

      const result = await resolveOwnedFeedbackForMutation(
        FEEDBACK_ID.toString(),
        participant,
      );

      expect(result.error).toEqual({
        status: 403,
        message: "Not authorized to modify this feedback",
      });
    });

    it("denies delete when the caller owns feedback but lost meeting access", async () => {
      jest.spyOn(MeetingFeedback, "findById").mockResolvedValue({
        _id: FEEDBACK_ID,
        meetingId: MEETING_ID,
        userId: OUTSIDER_ID,
      });
      jest.spyOn(Meeting, "findById").mockResolvedValue(meetingDoc());

      const result = await resolveOwnedFeedbackForMutation(
        FEEDBACK_ID.toString(),
        orgMemberOutsider,
      );

      expect(result.error?.status).toBe(403);
      expect(result.error?.message).toBe(
        "Not authorized to access feedback for this meeting",
      );
    });

    it("denies delete when the associated meeting no longer exists", async () => {
      jest.spyOn(MeetingFeedback, "findById").mockResolvedValue({
        _id: FEEDBACK_ID,
        meetingId: MEETING_ID,
        userId: PARTICIPANT_ID,
      });
      jest.spyOn(Meeting, "findById").mockResolvedValue(null);

      const result = await resolveOwnedFeedbackForMutation(
        FEEDBACK_ID.toString(),
        participant,
      );

      expect(result.error).toEqual({
        status: 404,
        message: "Meeting not found",
      });
    });

    it("returns feedback when the owner still has meeting access", async () => {
      const feedback = {
        _id: FEEDBACK_ID,
        meetingId: MEETING_ID,
        userId: PARTICIPANT_ID,
      };
      const meeting = meetingDoc();

      jest.spyOn(MeetingFeedback, "findById").mockResolvedValue(feedback);
      jest.spyOn(Meeting, "findById").mockResolvedValue(meeting);

      const result = await resolveOwnedFeedbackForMutation(
        FEEDBACK_ID.toString(),
        participant,
      );

      expect(result.feedback).toBe(feedback);
      expect(result.meeting).toBe(meeting);
    });
  });
});
