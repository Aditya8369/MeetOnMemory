import mongoose from "mongoose";
import Organization from "../models/organizationModel.js";
import {
  DEFAULT_LIFECYCLE_POLICY,
  getLifecyclePolicy,
} from "../config/lifecyclePolicy.js";

const POLICY_KEY = "memoryLifecyclePolicy";

const INTEGER_FIELDS = new Set([
  "dormantAfterDays",
  "archivedAfterDays",
  "expiredAfterDays",
  "minImportanceScoreToProtect",
]);

export function getOrganizationLifecyclePolicy(organization) {
  const stored =
    organization?.metadata?.[POLICY_KEY] &&
    typeof organization.metadata[POLICY_KEY] === "object"
      ? organization.metadata[POLICY_KEY]
      : {};

  return getLifecyclePolicy(stored);
}

export function validateLifecyclePolicyPatch(patch = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error("Retention policy must be an object");
  }

  const allowed = new Set([...INTEGER_FIELDS, "hardDeleteExpired"]);

  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) {
      throw new Error(`Unsupported retention policy field: ${key}`);
    }

    const value = patch[key];

    if (INTEGER_FIELDS.has(key)) {
      if (
        value !== null &&
        (!Number.isInteger(value) ||
          value <= 0 ||
          (key === "minImportanceScoreToProtect" && value > 100) ||
          (key !== "minImportanceScoreToProtect" && value > 3650))
      ) {
        throw new Error(
          key === "minImportanceScoreToProtect"
            ? "Importance protection score must be an integer from 1 to 100"
            : `${key} must be an integer from 1 to 3650 days`,
        );
      }
    }

    if (
      key === "hardDeleteExpired" &&
      typeof value !== "boolean" &&
      value !== null
    ) {
      throw new Error("hardDeleteExpired must be a boolean or null");
    }
  }

  const effective = {
    ...DEFAULT_LIFECYCLE_POLICY,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== null),
    ),
  };

  if (
    effective.dormantAfterDays >= effective.archivedAfterDays ||
    effective.archivedAfterDays >= effective.expiredAfterDays
  ) {
    throw new Error(
      "Retention thresholds must increase in order: dormant < archived < expired",
    );
  }

  return patch;
}

export async function getOrganizationLifecyclePolicyById(organizationId) {
  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new Error("Invalid organization id");
  }

  const organization = await Organization.findById(organizationId)
    .select("name metadata")
    .lean();

  if (!organization) return null;

  return {
    organizationId: organization._id,
    organizationName: organization.name,
    policy: getOrganizationLifecyclePolicy(organization),
  };
}

export async function updateOrganizationLifecyclePolicy(organizationId, patch) {
  validateLifecyclePolicyPatch(patch);

  const current = await getOrganizationLifecyclePolicyById(organizationId);
  if (!current) return null;

  const stored = await Organization.findById(organizationId).select("metadata");

  const existing =
    stored?.metadata?.[POLICY_KEY] &&
    typeof stored.metadata[POLICY_KEY] === "object"
      ? { ...stored.metadata[POLICY_KEY] }
      : {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete existing[key];
    } else {
      existing[key] = value;
    }
  }

  if (!stored.metadata || typeof stored.metadata !== "object") {
    stored.metadata = {};
  }

  stored.metadata[POLICY_KEY] = existing;
  stored.markModified("metadata");
  await stored.save();

  return getOrganizationLifecyclePolicyById(organizationId);
}
