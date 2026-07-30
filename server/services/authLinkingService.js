import userModel from "../models/userModel.js";
import crypto from "crypto";

/**
 * Finds a MongoDB user by their Clerk ID.
 * @param {string} clerkUserId - The Clerk user ID
 * @returns {Promise<Object|null>} The user object or null
 */
export const findUserByClerkId = async (clerkUserId) => {
  if (!clerkUserId) return null;
  return await userModel.findOne({ clerkUserId }).select("-password");
};

/**
 * Links an existing MongoDB user to a Clerk ID.
 * @param {string} mongoUserId - The MongoDB user ID
 * @param {string} clerkUserId - The Clerk user ID
 * @returns {Promise<Object>} The updated user object
 */
export const linkUserToClerkId = async (mongoUserId, clerkUserId) => {
  if (!mongoUserId || !clerkUserId) {
    throw new Error("Missing required IDs for linking");
  }
  return await userModel
    .findByIdAndUpdate(mongoUserId, { $set: { clerkUserId } }, { new: true })
    .select("-password");
};

/**
 * Finds a user by their email address.
 * Helpful for initial linking if the user logs in via Clerk but already has a Mongo account.
 * @param {string} email - The user's email address
 * @returns {Promise<Object|null>}
 */
export const findUserByEmail = async (email) => {
  if (!email) return null;
  return await userModel.findOne({ email }).select("-password");
};

/**
 * Provisions a new MongoDB user for a Clerk identity, or links an existing account matching by email.
 * Idempotent: multiple calls for the same Clerk user ID or email will return the same user without creating duplicates.
 * @param {Object} params
 * @param {string} params.clerkUserId - The Clerk user ID
 * @param {string} [params.email] - Primary email from Clerk identity
 * @param {string} [params.name] - User name from Clerk identity
 * @param {string} [params.profilePic] - Avatar image URL from Clerk identity
 * @returns {Promise<Object>} The MongoDB user document
 */
export const provisionOrLinkClerkUser = async ({
  clerkUserId,
  email,
  name,
  profilePic,
}) => {
  if (!clerkUserId) {
    throw new Error("clerkUserId is required for Clerk user provisioning");
  }

  // 1. Try finding existing user by clerkUserId
  let user = await userModel.findOne({ clerkUserId }).select("-password");
  if (user) {
    let needsSave = false;
    if (profilePic && !user.profilePic) {
      user.profilePic = profilePic;
      needsSave = true;
    }
    if (name && (!user.name || user.name === "User")) {
      user.name = name;
      needsSave = true;
    }
    if (needsSave) {
      await user.save();
    }
    return user;
  }

  // 2. Try finding existing user by email (Legacy migration case)
  if (email) {
    user = await userModel.findOne({ email }).select("-password");
    if (user) {
      user.clerkUserId = clerkUserId;
      if (profilePic && !user.profilePic) {
        user.profilePic = profilePic;
      }
      if (name && (!user.name || user.name === "User")) {
        user.name = name;
      }
      await user.save();
      return user;
    }
  }

  // 3. Create a new provisioned user if no existing user matches
  const dummyPassword = `CLERK_AUTH_${crypto.randomBytes(16).toString("hex")}`;
  const userName = name || (email ? email.split("@")[0] : "Clerk User");

  const newUser = await userModel.create({
    clerkUserId,
    email: email || `${clerkUserId}@clerk.placeholder`,
    name: userName,
    password: dummyPassword,
    isAccountVerified: true,
    hasCompletedOnboarding: false,
    profilePic: profilePic || "",
    role: null,
    organization: null,
  });

  const createdObj = newUser.toObject();
  delete createdObj.password;
  return createdObj;
};
