/**
 * tenantIsolation.js
 * Foundational middleware for Strict Multi-Tenant Data Isolation.
 * Ensures queries are strictly scoped to the authenticated organization.
 */

const mongoose = require("mongoose");

/**
 * Middleware to extract organization context from the request and bind
 * a tenant-scoped mock model adapter to prevent cross-tenant data leaks.
 */
const requireTenantIsolation = async (req, res, next) => {
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
          find: (query = {}) => Base.find({ ...query, organizationId }),
          findOne: (query = {}) => Base.findOne({ ...query, organizationId }),
          create: (data) => Base.create({ ...data, organizationId }),
          // Add other Mongoose methods as needed...
        };
      },
    };

    next();
  } catch (error) {
    console.error(
      "[Tenant Isolation] Error establishing tenant context:",
      error,
    );
    res.status(500).json({ error: "Failed to isolate tenant context" });
  }
};

module.exports = requireTenantIsolation;
