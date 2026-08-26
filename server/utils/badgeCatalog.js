/**
 * Build earned/locked + progress for one badge (Issue #2066).
 */
export const buildBadgeCatalogEntry = (badge, scoreDoc) => {
  const unlockedEntry = scoreDoc?.unlockedBadges?.find(
    (ub) => String(ub.badge?._id || ub.badge) === String(badge._id),
  );
  const earned = Boolean(unlockedEntry);
  const totalPoints = scoreDoc?.totalPoints || 0;

  let progress = { current: 0, target: null, percent: earned ? 100 : 0 };

  if (badge.criteria?.type === "points" && badge.criteria.threshold != null) {
    const target = Number(badge.criteria.threshold) || 0;
    const percent =
      target > 0
        ? Math.min(100, Math.round((totalPoints / target) * 100))
        : earned
          ? 100
          : 0;
    progress = {
      current: totalPoints,
      target,
      percent: earned ? 100 : percent,
    };
  }

  return {
    id: badge._id,
    name: badge.name,
    description: badge.description,
    iconUrl: badge.iconUrl || "",
    tier: badge.tier || "Bronze",
    criteria: badge.criteria || {},
    earned,
    unlockedAt: unlockedEntry?.unlockedAt || null,
    progress,
  };
};
