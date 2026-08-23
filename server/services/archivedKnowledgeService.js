import mongoose from "mongoose";
import ActionItem from "../models/actionItemModel.js";
import Decision from "../models/decisionModel.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { literalContainsFilter } from "../utils/regexUtils.js";

const ALLOWED_ARCHIVE_TYPES = ["all", "decision", "action-item"];

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const asString = String(value);
  return mongoose.Types.ObjectId.isValid(asString)
    ? new mongoose.Types.ObjectId(asString)
    : value;
};

/**
 * Builds the shared archive filter. Tag filtering is applied server-side so
 * the selected facet always describes the same result set that is returned.
 */
export const buildArchiveMatch = ({ organization, search, tag }) => {
  const match = {
    organization: toObjectId(organization),
    lifecycleState: "archived",
  };

  const searchFilter = literalContainsFilter(search);
  if (searchFilter) {
    match.text = searchFilter;
  }

  if (typeof tag === "string" && tag.trim()) {
    match.aliases = tag.trim();
  }

  return match;
};

const withTypeAndSortDate = (type) => ({
  $addFields: {
    type,
    sortDate: { $ifNull: ["$archivedAt", "$updatedAt"] },
  },
});

const meetingLookupStages = [
  {
    $lookup: {
      from: "meetings",
      localField: "sourceMeetingId",
      foreignField: "_id",
      as: "_sourceMeeting",
      pipeline: [{ $project: { title: 1, date: 1 } }],
    },
  },
  {
    $addFields: {
      sourceMeetingId: { $arrayElemAt: ["$_sourceMeeting", 0] },
    },
  },
  { $project: { _sourceMeeting: 0, sortDate: 0, embedding: 0 } },
];

/**
 * Builds the combined archive aggregation. Tag facets are calculated before
 * pagination, so counts represent the full matching archive rather than only
 * the current page.
 */
export const buildArchivePipeline = ({
  type = "all",
  organization,
  search,
  tag,
  skip = 0,
  limit = 10,
}) => {
  const match = buildArchiveMatch({ organization, search, tag });
  const actionItemCollection = ActionItem.collection?.name || "actionitems";

  const decisionBranch = [{ $match: match }, withTypeAndSortDate("decision")];

  let prefix;
  if (type === "decision") {
    prefix = decisionBranch;
  } else if (type === "action-item") {
    prefix = [{ $match: match }, withTypeAndSortDate("action-item")];
  } else {
    prefix = [
      ...decisionBranch,
      {
        $unionWith: {
          coll: actionItemCollection,
          pipeline: [{ $match: match }, withTypeAndSortDate("action-item")],
        },
      },
    ];
  }

  return [
    ...prefix,
    { $sort: { sortDate: -1, _id: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }, ...meetingLookupStages],
        tags: [
          { $unwind: "$aliases" },
          { $match: { aliases: { $type: "string", $ne: "" } } },
          {
            $group: {
              _id: "$aliases",
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ];
};

/**
 * Fetches one page of archived knowledge items with unified pagination and
 * full-result tag facets.
 */
export const getArchivedMemoriesPage = async ({
  organization,
  type = "all",
  search,
  tag,
  page,
  limit,
}) => {
  if (!organization) {
    const err = new Error("Organization required");
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_ARCHIVE_TYPES.includes(type)) {
    const err = new Error(
      `Invalid type. Allowed values: ${ALLOWED_ARCHIVE_TYPES.join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }

  if (tag !== undefined && tag !== null && typeof tag !== "string") {
    const err = new Error("Invalid tag");
    err.statusCode = 400;
    throw err;
  }

  const pagination = parsePagination(
    { page, limit },
    { defaultLimit: 10, maxLimit: 100 },
  );

  const pipeline = buildArchivePipeline({
    type,
    organization,
    search,
    tag,
    skip: pagination.skip,
    limit: pagination.limit,
  });

  const Model = type === "action-item" ? ActionItem : Decision;
  const [facet] = await Model.aggregate(pipeline);
  const memories = facet?.data || [];
  const total = facet?.metadata?.[0]?.total || 0;

  const tags = (facet?.tags || [])
    .map((entry) => ({
      value: entry?._id,
      count: entry?.count || 0,
    }))
    .filter(
      (entry) => typeof entry.value === "string" && entry.value.length > 0,
    );

  return {
    memories,
    pagination: buildPaginationMeta({
      total,
      page: pagination.page,
      limit: pagination.limit,
    }),
    facets: {
      tags,
    },
  };
};

export { ALLOWED_ARCHIVE_TYPES };
