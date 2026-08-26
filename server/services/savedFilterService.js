import SavedFilter from "../models/savedFilterModel.js";
import Meeting from "../models/meetingModel.js";
import { escapeRegex } from "../utils/regex.js";

class SavedFilterService {
  /**
   * Translate the saved filter object into a Mongoose query
   */
  buildQuery(filters, orgId) {
    const query = { deletedAt: null };

    if (orgId) {
      query.organization = orgId;
    }

    // Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(filters.searchQuery.trim()),
        "i",
      );
      query.$or = [
        { title: searchRegex },
        { summary: searchRegex },
        { transcript: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Status Filter
    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    // Meeting Type Filter
    if (filters.meetingType && filters.meetingType !== "all") {
      query.meetingType = filters.meetingType;
    }

    // Date Range Filter
    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filters.dateRange) {
        case "today":
          query.date = { $gte: today };
          break;
        case "week": {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          query.date = { $gte: weekAgo };
          break;
        }
        case "month": {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          query.date = { $gte: monthAgo };
          break;
        }
        case "year": {
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          query.date = { $gte: yearAgo };
          break;
        }
      }
    }

    return query;
  }

  /**
   * Batch run countDocuments() for pinned filters to update matchCount
   */
  async refreshMatchCounts(userId, orgId) {
    // We only care about pinned filters for the user (or shared and pinned? Let's just update all pinned filters visible to the user)
    const filtersToUpdate = await SavedFilter.find({
      $or: [
        { user: userId, isPinned: true },
        { organization: orgId, isShared: true, isPinned: true },
      ],
    });

    const updatePromises = filtersToUpdate.map(async (filter) => {
      const meetingQuery = this.buildQuery(filter.filters, orgId);
      const count = await Meeting.countDocuments(meetingQuery);

      // Update filter if count changed
      if (filter.matchCount !== count) {
        filter.matchCount = count;
        await filter.save();
      }
      return filter;
    });

    return Promise.all(updatePromises);
  }
}

export default new SavedFilterService();
