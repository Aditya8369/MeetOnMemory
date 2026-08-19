import Tag from "../models/tagModel.js";

const uniqueTagNames = (tags = []) => [
  ...new Set(
    tags
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];

/**
 * Apply only the association delta between two versions of a resource.
 *
 * This keeps usageCount tied to real associations rather than to the number
 * of times an update endpoint was called. Duplicate tag names in a resource
 * are collapsed before calculating the delta.
 */
export const updateTagUsageForAssociationChange = async ({
  organization,
  previousTags = [],
  currentTags = [],
}) => {
  if (!organization) return;

  const previous = new Set(
    uniqueTagNames(previousTags).map((tag) => tag.toLocaleLowerCase()),
  );
  const current = new Set(
    uniqueTagNames(currentTags).map((tag) => tag.toLocaleLowerCase()),
  );

  const added = [...current].filter((tag) => !previous.has(tag));
  const removed = [...previous].filter((tag) => !current.has(tag));

  const updateByNames = async (names, increment) => {
    if (!names.length) return;

    const tags = await Tag.find({ organization, name: { $in: names } })
      .collation({ locale: "en", strength: 2 })
      .select("_id")
      .lean();

    if (!tags.length) return;

    await Tag.updateMany(
      { organization, _id: { $in: tags.map((tag) => tag._id) } },
      { $inc: { usageCount: increment } },
    );
  };

  await updateByNames(added, 1);
  await updateByNames(removed, -1);

  if (removed.length) {
    await Tag.updateMany(
      { organization, usageCount: { $lt: 0 } },
      { $set: { usageCount: 0 } },
    );
  }
};

export const reconcileTagUsageCounts = async (organization) => {
  if (!organization) return [];

  // Dynamic import avoids a Meeting -> helper -> Meeting module cycle.
  const { default: Meeting } = await import("../models/meetingModel.js");

  const counts = await Meeting.aggregate([
    { $match: { organization } },
    { $project: { tags: { $ifNull: ["$tags", []] } } },
    { $unwind: "$tags" },
    {
      $group: {
        _id: {
          $toLower: { $trim: { input: "$tags" } },
        },
        resourceIds: { $addToSet: "$_id" },
      },
    },
    {
      $project: {
        _id: 1,
        usageCount: { $size: "$resourceIds" },
      },
    },
  ]);

  const countByName = new Map(
    counts.map((entry) => [
      String(entry._id).trim().toLocaleLowerCase(),
      entry.usageCount,
    ]),
  );

  const tags = await Tag.find({ organization }).select("_id name").lean();
  const operations = tags.map((tag) => ({
    updateOne: {
      filter: { _id: tag._id, organization },
      update: {
        $set: {
          usageCount:
            countByName.get(String(tag.name).trim().toLocaleLowerCase()) || 0,
        },
      },
    },
  }));

  if (operations.length) {
    await Tag.bulkWrite(operations);
  }

  return tags.map((tag) => ({
    tagId: tag._id,
    name: tag.name,
    usageCount:
      countByName.get(String(tag.name).trim().toLocaleLowerCase()) || 0,
  }));
};

export const normalizeTagNames = uniqueTagNames;
