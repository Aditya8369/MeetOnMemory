import SavedFilter from "../models/savedFilterModel.js";
import savedFilterService from "../services/savedFilterService.js";
import { isSameOrganization } from "../utils/organizationScope.js";
import { hasPermission } from "../utils/rbacPermissions.js";

const getUserId = (req) =>
  req.user?._id?.toString?.() || String(req.user?._id || "");

const isOwner = (filter, req) =>
  filter?.user && filter.user.toString() === getUserId(req);

const canManageSharing = (req) =>
  hasPermission(req.user?.role, "organizations", "edit");

const findAccessibleFilter = async (id, req, { requireShared = true } = {}) => {
  const filter = await SavedFilter.findById(id);
  if (!filter) return { filter: null, forbidden: false };

  const sameOrg = isSameOrganization(
    filter.organization,
    req.user?.organization,
  );
  const owner = isOwner(filter, req);
  const shared = filter.isShared === true;

  if (!sameOrg) return { filter: null, forbidden: true };
  if (owner) return { filter, forbidden: false };
  if (requireShared && !shared) return { filter: null, forbidden: true };
  if (!shared) return { filter: null, forbidden: true };

  return { filter, forbidden: false };
};

const unauthorized = (res, message = "Not authorized to access this filter") =>
  res.status(403).json({ success: false, message });

export const createFilter = async (req, res) => {
  try {
    const { name, description, filters, isPinned, isShared, color, icon } =
      req.body;

    if (!name || !filters) {
      return res
        .status(400)
        .json({ success: false, message: "Name and filters are required" });
    }

    if (!req.user?.organization) {
      return res.status(403).json({
        success: false,
        message: "An organization is required to create saved filters",
      });
    }

    if (isShared && !canManageSharing(req)) {
      return unauthorized(res, "Not authorized to create a shared filter");
    }

    const organization = req.user.organization;
    const savedFilter = new SavedFilter({
      name,
      description,
      user: req.user._id,
      organization,
      filters,
      isPinned: !!isPinned,
      isShared: !!isShared,
      color,
      icon,
    });

    await savedFilter.save();

    if (savedFilter.isPinned) {
      await savedFilterService.refreshMatchCounts(req.user._id, organization);
      const updated = await SavedFilter.findOne({
        _id: savedFilter._id,
        organization,
      });
      return res.status(201).json({ success: true, filter: updated });
    }

    return res.status(201).json({ success: true, filter: savedFilter });
  } catch (error) {
    console.error("Error creating saved filter:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create saved filter" });
  }
};

export const getFilters = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const userId = req.user._id;

    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "An organization is required to access saved filters",
      });
    }

    await savedFilterService.refreshMatchCounts(userId, orgId);

    const filters = await SavedFilter.find({
      $or: [
        { user: userId, organization: orgId },
        { organization: orgId, isShared: true },
      ],
    }).sort({ isPinned: -1, createdAt: -1 });

    return res.status(200).json({ success: true, filters });
  } catch (error) {
    console.error("Error fetching saved filters:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch saved filters" });
  }
};

export const updateFilter = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    const { filter, forbidden } = await findAccessibleFilter(id, req, {
      requireShared: false,
    });

    if (!filter) {
      return res.status(forbidden ? 403 : 404).json({
        success: false,
        message: forbidden
          ? "Not authorized to update this filter"
          : "Filter not found",
      });
    }

    if (!isOwner(filter, req)) {
      return unauthorized(res, "Not authorized to update this filter");
    }

    if (Object.prototype.hasOwnProperty.call(updates, "isShared")) {
      if (!canManageSharing(req)) {
        return unauthorized(res, "Not authorized to change filter sharing");
      }
    }

    delete updates.user;
    delete updates.organization;
    delete updates.matchCount;

    Object.keys(updates).forEach((key) => {
      filter[key] = updates[key];
    });

    await filter.save();

    if (filter.isPinned) {
      await savedFilterService.refreshMatchCounts(
        req.user._id,
        req.user.organization,
      );
    }

    const updatedFilter = await SavedFilter.findOne({
      _id: id,
      organization: req.user.organization,
    });
    return res.status(200).json({ success: true, filter: updatedFilter });
  } catch (error) {
    console.error("Error updating saved filter:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update saved filter" });
  }
};

export const deleteFilter = async (req, res) => {
  try {
    const { id } = req.params;
    const { filter, forbidden } = await findAccessibleFilter(id, req, {
      requireShared: false,
    });

    if (!filter) {
      return res.status(forbidden ? 403 : 404).json({
        success: false,
        message: forbidden
          ? "Not authorized to delete this filter"
          : "Filter not found",
      });
    }

    if (!isOwner(filter, req)) {
      return unauthorized(res, "Not authorized to delete this filter");
    }

    await SavedFilter.deleteOne({
      _id: id,
      organization: req.user.organization,
      user: req.user._id,
    });

    return res
      .status(200)
      .json({ success: true, message: "Filter deleted successfully" });
  } catch (error) {
    console.error("Error deleting saved filter:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete saved filter" });
  }
};

export const togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body;
    const { filter, forbidden } = await findAccessibleFilter(id, req);

    if (!filter) {
      return res.status(forbidden ? 403 : 404).json({
        success: false,
        message: forbidden
          ? "Not authorized to pin this filter"
          : "Filter not found",
      });
    }

    // `isPinned` is currently a filter-level field, not user-specific. Only the
    // owner may change it so a shared filter cannot be modified by another member.
    if (!isOwner(filter, req)) {
      return unauthorized(res, "Not authorized to pin this filter");
    }

    filter.isPinned = !!isPinned;
    await filter.save();

    if (filter.isPinned) {
      await savedFilterService.refreshMatchCounts(
        req.user._id,
        req.user.organization,
      );
    }

    const updatedFilter = await SavedFilter.findOne({
      _id: id,
      organization: req.user.organization,
    });
    return res.status(200).json({ success: true, filter: updatedFilter });
  } catch (error) {
    console.error("Error toggling pin status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to toggle pin status" });
  }
};
