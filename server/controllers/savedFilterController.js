import SavedFilter from "../models/savedFilterModel.js";
import savedFilterService from "../services/savedFilterService.js";

export const createFilter = async (req, res) => {
  try {
    const { name, description, filters, isPinned, isShared, color, icon } =
      req.body;

    if (!name || !filters) {
      return res
        .status(400)
        .json({ success: false, message: "Name and filters are required" });
    }

    const savedFilter = new SavedFilter({
      name,
      description,
      user: req.user._id,
      organization: req.user.organization,
      filters,
      isPinned: !!isPinned,
      isShared: !!isShared,
      color,
      icon,
    });

    await savedFilter.save();

    // Compute initial count if pinned
    if (savedFilter.isPinned) {
      await savedFilterService.refreshMatchCounts(
        req.user._id,
        req.user.organization,
      );
      // Refetch to get updated count
      const updated = await SavedFilter.findById(savedFilter._id);
      return res.status(201).json({ success: true, filter: updated });
    }

    res.status(201).json({ success: true, filter: savedFilter });
  } catch (error) {
    console.error("Error creating saved filter:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create saved filter" });
  }
};

export const getFilters = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const userId = req.user._id;

    // Refresh match counts for pinned filters before returning
    await savedFilterService.refreshMatchCounts(userId, orgId);

    const query = {
      $or: [
        { user: userId },
        ...(orgId ? [{ organization: orgId, isShared: true }] : []),
      ],
    };

    const filters = await SavedFilter.find(query).sort({
      isPinned: -1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, filters });
  } catch (error) {
    console.error("Error fetching saved filters:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch saved filters" });
  }
};

export const updateFilter = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const filter = await SavedFilter.findById(id);
    if (!filter) {
      return res
        .status(404)
        .json({ success: false, message: "Filter not found" });
    }

    // Ensure user owns the filter OR it's shared in their org and they have org access (though typically only owners should update)
    // For now, let's restrict updates to the owner
    if (filter.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this filter",
      });
    }

    Object.keys(updates).forEach((key) => {
      // Prevent updating read-only fields
      if (key !== "user" && key !== "organization" && key !== "matchCount") {
        filter[key] = updates[key];
      }
    });

    await filter.save();

    if (filter.isPinned) {
      await savedFilterService.refreshMatchCounts(
        req.user._id,
        req.user.organization,
      );
    }

    const updatedFilter = await SavedFilter.findById(id);

    res.status(200).json({ success: true, filter: updatedFilter });
  } catch (error) {
    console.error("Error updating saved filter:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update saved filter" });
  }
};

export const deleteFilter = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = await SavedFilter.findById(id);
    if (!filter) {
      return res
        .status(404)
        .json({ success: false, message: "Filter not found" });
    }

    if (filter.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this filter",
      });
    }

    await SavedFilter.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Filter deleted successfully" });
  } catch (error) {
    console.error("Error deleting saved filter:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete saved filter" });
  }
};

export const togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body;

    const filter = await SavedFilter.findById(id);
    if (!filter) {
      return res
        .status(404)
        .json({ success: false, message: "Filter not found" });
    }

    // Allow toggling pin if owner OR if it's shared in same org
    const isOwner = filter.user.toString() === req.user._id.toString();
    const isSharedInOrg =
      filter.isShared &&
      filter.organization?.toString() === req.user.organization?.toString();

    if (!isOwner && !isSharedInOrg) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this filter",
      });
    }

    // Technically, `isPinned` state should be user-specific if shared filters can be pinned by different users.
    // But based on the current schema, `isPinned` is a global property of the filter. Let's keep it simple as defined in the schema.
    // A better approach for the future would be a `pinnedBy: [{type: ObjectId, ref: 'User'}]` array.
    if (filter.user.toString() !== req.user._id.toString() && isSharedInOrg) {
      // For now, if we allow shared filters to be pinned globally, anyone can pin/unpin it.
      // We'll proceed with updating it.
    }

    filter.isPinned = isPinned;
    await filter.save();

    if (filter.isPinned) {
      await savedFilterService.refreshMatchCounts(
        req.user._id,
        req.user.organization,
      );
    }

    const updatedFilter = await SavedFilter.findById(id);
    res.status(200).json({ success: true, filter: updatedFilter });
  } catch (error) {
    console.error("Error toggling pin status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to toggle pin status" });
  }
};
