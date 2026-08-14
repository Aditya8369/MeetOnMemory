import mongoose from "mongoose";
import ActionItem from "../models/actionItemModel.js";
import Decision from "../models/decisionModel.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";
import { literalContainsFilter } from "../utils/regexUtils.js";

export const ALLOWED_LIFECYCLE_TYPES = ["all", "decision", "action-item"];

export const ALLOWED_LIFECYCLE_STATES = [
  "all",
  "active",
  "dormant",
  "archived",
  "expired",
];

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const asString = String(value);
  return mongoose.Types.ObjectId.isValid(asString)
    ? new mongoose.Types.ObjectId(asString)
    : value;
};

/**
 * Shared $match for Memory Lifecycle listings (Issue #1552).
 * Filters by org, optional lifecycle state, and literal text search.
 */
export const buildLifecycleMatch = ({
  organization,
  search,
  lifecycleState = "all",
}) => {
  const match = {
    organization: toObjectId(organization),
  };

  if (
    lifecycleState &&
    lifecycleState !== "all" &&
    ALLOWED_LIFECYCLE_STATES.includes(lifecycleState)
  ) {
    match.lifecycleState = lifecycleState;
  }

  const searchFilter = literalContainsFilter(search);
  if (searchFilter) {
    match.text = searchFilter;
  }

  return match;
};

const withType = (type) => ({
  $addFields: { type },
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
  { $project: { _sourceMeeting: 0, embedding: 0 } },
];

/**
 * Union + sort + facet pipeline so decisions and action items share one
 * server-side page (avoids client merge of two independent pages).
 */
export const buildLifecyclePipeline = ({
  type = "all",
  organization,
  search,
  lifecycleState = "all",
  skip = 0,
  limit = 20,
}) => {
  const match = buildLifecycleMatch({
    organization,
    search,
    lifecycleState,
  });
  const actionItemCollection = ActionItem.collection?.name || "actionitems";

  const decisionBranch = [{ $match: match }, withType("decision")];

  let prefix;
  if (type === "decision") {
    prefix = decisionBranch;
  } else if (type === "action-item") {
    prefix = [{ $match: match }, withType("action-item")];
  } else {
    prefix = [
      ...decisionBranch,
      {
        $unionWith: {
          coll: actionItemCollection,
          pipeline: [{ $match: match }, withType("action-item")],
        },
      },
    ];
  }

  return [
    ...prefix,
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }, ...meetingLookupStages],
      },
    },
  ];
};

/**
 * One page of lifecycle memories with unified pagination metadata.
 *
 * @returns {{ memories: object[], pagination: object }}
 */
export const getLifecycleMemoriesPage = async ({
  organization,
  type = "all",
  lifecycleState = "all",
  search,
  page,
  limit,
}) => {
  if (!organization) {
    const err = new Error("Organization required");
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_LIFECYCLE_TYPES.includes(type)) {
    const err = new Error(
      `Invalid type. Allowed values: ${ALLOWED_LIFECYCLE_TYPES.join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_LIFECYCLE_STATES.includes(lifecycleState)) {
    const err = new Error(
      `Invalid lifecycleState. Allowed values: ${ALLOWED_LIFECYCLE_STATES.join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }

  const pagination = parsePagination(
    { page, limit },
    { defaultLimit: 20, maxLimit: 100 },
  );

  const pipeline = buildLifecyclePipeline({
    type,
    organization,
    search,
    lifecycleState,
    skip: pagination.skip,
    limit: pagination.limit,
  });

  const Model = type === "action-item" ? ActionItem : Decision;
  const [facet] = await Model.aggregate(pipeline);
  const memories = facet?.data || [];
  const total = facet?.metadata?.[0]?.total || 0;

  return {
    memories,
    pagination: buildPaginationMeta({
      total,
      page: pagination.page,
      limit: pagination.limit,
    }),
  };
};
