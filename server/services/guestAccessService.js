import crypto from "crypto";
import GuestAccessToken from "../models/guestAccessTokenModel.js";
import AuditService from "./AuditService.js";

class GuestAccessService {
  /**
   * Generates a new guest access token for a meeting.
   * @param {Object} params
   * @param {String} params.meetingId
   * @param {String} params.guestEmail
   * @param {Array<String>} params.permissions
   * @param {Date} params.expiresAt
   * @param {Number} params.maxViews
   * @param {String} params.createdBy - User ID of the creator
   * @param {String} params.organizationId - For audit logging
   * @returns {Promise<Object>} The raw token and the created record
   */
  static async generateToken({
    meetingId,
    guestEmail,
    permissions = [],
    expiresAt,
    maxViews = 0,
    createdBy,
    organizationId,
  }) {
    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash it for storage
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const guestToken = await GuestAccessToken.create({
      meetingId,
      guestEmail,
      tokenHash,
      permissions,
      expiresAt,
      maxViews,
      createdBy,
    });

    if (organizationId) {
      await AuditService.logAction({
        actorId: createdBy,
        action: "GUEST_TOKEN_CREATED",
        entity: "GuestAccessToken",
        entityId: guestToken._id,
        organizationId,
        details: {
          meetingId,
          guestEmail,
          permissions,
        },
      });
    }

    return {
      rawToken, // Only returned once!
      guestToken,
    };
  }

  /**
   * Validates a guest access token and records a view.
   * @param {String} rawToken
   * @returns {Promise<Object>} The valid token document
   * @throws {Error} if token is invalid, expired, revoked, or max views exceeded.
   */
  static async validateAndRecordView(rawToken) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const token = await GuestAccessToken.findOne({ tokenHash }).populate(
      "meetingId",
    );

    if (!token) {
      throw new Error("Invalid guest access token.");
    }

    if (token.revoked) {
      throw new Error("This guest access token has been revoked.");
    }

    if (new Date() > new Date(token.expiresAt)) {
      throw new Error("This guest access token has expired.");
    }

    if (token.maxViews > 0 && token.currentViews >= token.maxViews) {
      throw new Error(
        "This guest access token has exceeded its maximum allowed views.",
      );
    }

    // Record the view
    token.currentViews += 1;
    await token.save();

    return token;
  }

  /**
   * Revokes a guest access token.
   * @param {String} tokenId
   * @param {String} revokedBy - User ID who revoked it
   * @param {String} organizationId - For audit logging
   */
  static async revokeToken(tokenId, revokedBy, organizationId) {
    const token = await GuestAccessToken.findById(tokenId);

    if (!token) {
      throw new Error("Token not found.");
    }

    token.revoked = true;
    await token.save();

    if (organizationId) {
      await AuditService.logAction({
        actorId: revokedBy,
        action: "GUEST_TOKEN_REVOKED",
        entity: "GuestAccessToken",
        entityId: token._id,
        organizationId,
      });
    }

    return token;
  }

  /**
   * Gets all tokens (active and revoked) for a specific meeting.
   * @param {String} meetingId
   */
  static async getMeetingTokens(meetingId) {
    return await GuestAccessToken.find({ meetingId }).sort({ createdAt: -1 });
  }
}

export default GuestAccessService;
