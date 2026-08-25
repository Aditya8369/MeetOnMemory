/**
 * tenantIsolation.js
 * Foundational middleware for Strict Multi-Tenant Data Isolation.
 * Ensures queries are strictly scoped to the authenticated organization.
 */

import mongoose from "mongoose";

/**
 * Middleware to extract organization context from the request and bind
 * a tenant-scoped mock model adapter to prevent cross-tenant data leaks.
 */
const tenantIsolation = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res
        .status(403)
        .json({ error: "Tenant context missing. Access denied." });
    }

    // Foundational mock for physical connection sharding or logical model filtering
    // In a full implementation, this might return a specific connection pool:
    // req.tenantDb = await getTenantConnection(organizationId);

    // For logical isolation MVP: wrap the Mongoose models to automatically inject orgId
    req.tenantDb = {
      model: (modelName) => {
        const Base = mongoose.model(modelName);
        return {
          find: (filter = {}, ...args) =>
            Base.find({ ...filter, organization: organizationId }, ...args),
          findOne: (filter = {}, ...args) =>
            Base.findOne({ ...filter, organization: organizationId }, ...args),
          findById: (id, ...args) =>
            Base.findOne({ _id: id, organization: organizationId }, ...args),
          create: (doc, ...args) =>
            Base.create({ ...doc, organization: organizationId }, ...args),
        };
      },
    };

    req.organizationId = organizationId;
    next();
  } catch (error) {
    console.error(
      "[Tenant Isolation] Error establishing tenant context:",
      error,
    );
    res.status(500).json({ error: "Failed to isolate tenant context" });
  }
};

export default tenantIsolation;
export { tenantIsolation };
