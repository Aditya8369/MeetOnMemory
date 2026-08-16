import GamificationScore from "../models/gamificationScoreModel.js";
import { getRedisClient } from "../services/redisService.js";
import { calculateLeaderboards } from "../jobs/leaderboardAggregationJob.js";

export const getLeaderboard = async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res
        .status(400)
        .json({
          success: false,
          error: "User is not part of an organization.",
        });
    }

    const redis = getRedisClient();
    if (redis) {
      const cached = await redis.get(`leaderboard:org:${orgId}`);
      if (cached) {
        return res
          .status(200)
          .json({ success: true, data: JSON.parse(cached) });
      }
    }

    // Fallback: Calculate on the fly if not cached
    await calculateLeaderboards();

    if (redis) {
      const newCached = await redis.get(`leaderboard:org:${orgId}`);
      if (newCached) {
        return res
          .status(200)
          .json({ success: true, data: JSON.parse(newCached) });
      }
    }

    res
      .status(404)
      .json({ success: false, error: "Leaderboard data not available" });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

export const getUserScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organizationId;

    const score = await GamificationScore.findOne({
      user: userId,
      organization: orgId,
    }).populate("unlockedBadges.badge");

    res
      .status(200)
      .json({
        success: true,
        data: score || { totalPoints: 0, unlockedBadges: [], history: [] },
      });
  } catch (error) {
    console.error("Error fetching user score:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
