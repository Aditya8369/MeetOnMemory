/**
 * Authoritative tenant context for search routes (Issue #1539).
 *
 * Search tenant identity comes from the authenticated session (`req.user`) only.
 * Client-supplied organization identifiers must never widen or override scope.
 */

import { getOrganizationIdFromReq } from "../middleware/cacheMiddleware.js";

/** Body/query fields that must not influence tenant scope. */
export const CLIENT_TENANT_FIELD_NAMES = Object.freeze([
  "organizationId",
  "organization",
  "tenantId",
  "orgId",
]);

/**
 * Removes client-controlled tenant identifiers from search option bags.
 *
 * @param {object} options
 * @returns {object}
 */
export function stripClientTenantFields(options = {}) {
  if (!options || typeof options !== "object") return {};

  const sanitized = { ...options };
  for (const key of CLIENT_TENANT_FIELD_NAMES) {
    delete sanitized[key];
  }
  return sanitized;
}

/**
 * Resolves the authenticated user's organization for search scoping.
 *
 * @param {object} user - `req.user`
 * @returns {string|null}
 */
export function resolveAuthenticatedSearchOrganization(user) {
  if (!user) return null;
  return getOrganizationIdFromReq({ user });
}

/**
 * @param {object} req
 * @returns {{ organizationId: string|null, options: object }}
 */
export function resolveHybridSearchContext(req) {
  const { query, ...rawOptions } = req.body || {};
  return {
    query,
    organizationId: resolveAuthenticatedSearchOrganization(req.user),
    options: stripClientTenantFields(rawOptions),
  };
}

/**
 * @param {string} organizationId
 * @throws {Error}
 */
export function assertHybridSearchOrganization(organizationId) {
  if (!organizationId) {
    throw new Error("Organization context is required for hybrid search");
  }
}

/**
 * Defense-in-depth: drop any result whose organization metadata does not match
 * the authenticated tenant. Returns a new array.
 *
 * @param {Array<object>} results
 * @param {Map<string, object>} graphNodes
 * @param {string} organizationId
 */
export function filterHybridResultsByTenant(
  results,
  graphNodes,
  organizationId,
) {
  if (!organizationId) return [];

  const expectedOrg = organizationId.toString();

  return results.filter((result) => {
    if (result.organization && result.organization.toString() !== expectedOrg) {
      return false;
    }

    if (result.sourceMeeting?.organization) {
      return result.sourceMeeting.organization.toString() === expectedOrg;
    }

    const node = graphNodes?.get?.(result.key);
    if (node?.organization && node.organization.toString() !== expectedOrg) {
      return false;
    }

    return true;
  });
}

export default {
  CLIENT_TENANT_FIELD_NAMES,
  stripClientTenantFields,
  resolveAuthenticatedSearchOrganization,
  resolveHybridSearchContext,
  assertHybridSearchOrganization,
  filterHybridResultsByTenant,
};
