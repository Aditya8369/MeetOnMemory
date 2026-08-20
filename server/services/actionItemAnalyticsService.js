import mongoose from "mongoose";
import ActionItem from "../models/actionItemModel.js";

class ActionItemAnalyticsService {
  /**
   * Get overarching completion metrics for an organization within a date range.
   */
  async getCompletionMetrics(organizationId, startDate, endDate) {
    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "resolved"]] }, 1, 0],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $not: {
                        $in: [
                          "$status",
                          ["completed", "resolved", "cancelled", "superseded"],
                        ],
                      },
                    },
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          timeToCompletionTotal: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["completed", "resolved"]] },
                    { $ne: ["$completedAt", null] },
                  ],
                },
                { $subtract: ["$completedAt", "$createdAt"] },
                0,
              ],
            },
          },
          onTimeCompletions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["completed", "resolved"]] },
                    { $ne: ["$dueDate", null] },
                    { $ne: ["$completedAt", null] },
                    { $lte: ["$completedAt", "$dueDate"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          itemsWithDueDateAndCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["completed", "resolved"]] },
                    { $ne: ["$dueDate", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          completed: 1,
          overdue: 1,
          completionRate: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
            ],
          },
          avgTimeToCompletionMs: {
            $cond: [
              { $eq: ["$completed", 0] },
              0,
              { $divide: ["$timeToCompletionTotal", "$completed"] },
            ],
          },
          onTimeRate: {
            $cond: [
              { $eq: ["$itemsWithDueDateAndCompleted", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$onTimeCompletions",
                      "$itemsWithDueDateAndCompleted",
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
    ];

    const result = await ActionItem.aggregate(pipeline);
    return (
      result[0] || {
        total: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
        avgTimeToCompletionMs: 0,
        onTimeRate: 0,
      }
    );
  }

  /**
   * Get assignee leaderboards for completion rates and streaks.
   */
  async getAssigneeLeaderboards(organizationId, startDate, endDate) {
    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      assignee: { $ne: null },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$assignee",
          totalAssigned: { $sum: 1 },
          totalCompleted: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "resolved"]] }, 1, 0],
            },
          },
          totalOverdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $not: {
                        $in: [
                          "$status",
                          ["completed", "resolved", "cancelled", "superseded"],
                        ],
                      },
                    },
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "assigneeDetails",
        },
      },
      {
        $unwind: { path: "$assigneeDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          assigneeId: "$_id",
          name: {
            $concat: [
              { $ifNull: ["$assigneeDetails.firstName", "Unknown"] },
              " ",
              { $ifNull: ["$assigneeDetails.lastName", "User"] },
            ],
          },
          email: "$assigneeDetails.email",
          totalAssigned: 1,
          totalCompleted: 1,
          totalOverdue: 1,
          completionRate: {
            $cond: [
              { $eq: ["$totalAssigned", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$totalCompleted", "$totalAssigned"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      { $sort: { completionRate: -1, totalCompleted: -1 } },
    ];

    return await ActionItem.aggregate(pipeline);
  }

  /**
   * Get priority breakdowns.
   */
  async getPriorityBreakdowns(organizationId, startDate, endDate) {
    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "resolved"]] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          priority: "$_id",
          count: 1,
          completed: 1,
          completionRate: {
            $cond: [
              { $eq: ["$count", 0] },
              0,
              { $multiply: [{ $divide: ["$completed", "$count"] }, 100] },
            ],
          },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ];

    return await ActionItem.aggregate(pipeline);
  }

  /**
   * Get overdue trends (weekly buckets).
   */
  async getOverdueTrends(organizationId, startDate, endDate) {
    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $project: {
          week: { $isoWeek: "$createdAt" },
          year: { $isoWeekYear: "$createdAt" },
          status: 1,
          dueDate: 1,
        },
      },
      {
        $group: {
          _id: { year: "$year", week: "$week" },
          newItems: { $sum: 1 },
          resolvedItems: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "resolved"]] }, 1, 0],
            },
          },
          overdueItems: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $not: {
                        $in: [
                          "$status",
                          ["completed", "resolved", "cancelled", "superseded"],
                        ],
                      },
                    },
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          week: "$_id.week",
          newItems: 1,
          resolvedItems: 1,
          overdueItems: 1,
        },
      },
      { $sort: { year: 1, week: 1 } },
    ];

    return await ActionItem.aggregate(pipeline);
  }

  /**
   * Get meeting effectiveness correlation.
   */
  async getMeetingEffectiveness(organizationId, startDate, endDate) {
    const matchStage = {
      organization: new mongoose.Types.ObjectId(organizationId),
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$sourceMeetingId",
          totalItems: { $sum: 1 },
          completedItems: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "resolved"]] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "meetings",
          localField: "_id",
          foreignField: "_id",
          as: "meetingDetails",
        },
      },
      {
        $unwind: { path: "$meetingDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          meetingId: "$_id",
          meetingTitle: "$meetingDetails.title",
          totalItems: 1,
          completedItems: 1,
          completionRate: {
            $cond: [
              { $eq: ["$totalItems", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$completedItems", "$totalItems"] },
                  100,
                ],
              },
            ],
          },
          // We assume a meetingQualityScore might exist, but we can return basic correlation for now
        },
      },
      { $sort: { totalItems: -1 } },
    ];

    return await ActionItem.aggregate(pipeline);
  }
}

export default new ActionItemAnalyticsService();
