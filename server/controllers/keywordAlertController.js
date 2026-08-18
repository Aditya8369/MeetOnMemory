import KeywordAlert from "../models/keywordAlertModel.js";
import { NotFoundError } from "../utils/errors.js";

const MAX_KEYWORDS = 50;
const MAX_KEYWORD_LENGTH = 50;

// @desc    Get keyword alert settings
// @route   GET /api/alerts/keywords
// @access  Private
export const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organization;

    if (!organizationId) {
      return res.status(403).json({ message: "Organization is required" });
    }

    let alert = await KeywordAlert.findOne({
      user: userId,
      organization: organizationId,
    });

    if (!alert) {
      alert = await KeywordAlert.create({
        user: userId,
        organization: organizationId,
        keywords: [],
        notifyViaEmail: true,
        notifyViaApp: true,
        isActive: true,
      });
    }

    res.status(200).json(alert);
  } catch (error) {
    next(error);
  }
};

// @desc    Update keyword alert settings
// @route   PUT /api/alerts/keywords
// @access  Private
export const updateWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organization;
    const { keywords, notifyViaEmail, notifyViaApp, isActive } = req.body;

    if (!organizationId) {
      return res.status(403).json({ message: "Organization is required" });
    }

    if (keywords !== undefined) {
      if (!Array.isArray(keywords)) {
        return res.status(400).json({
          success: false,
          message: "Keywords must be an array of strings",
        });
      }

      if (keywords.length > MAX_KEYWORDS) {
        return res.status(400).json({
          success: false,
          message: `Watchlist cannot exceed ${MAX_KEYWORDS} keywords`,
        });
      }

      for (const keyword of keywords) {
        if (typeof keyword !== "string") {
          return res.status(400).json({
            success: false,
            message: "All keywords must be strings",
          });
        }
        if (keyword.length > MAX_KEYWORD_LENGTH) {
          return res.status(400).json({
            success: false,
            message: `Keyword cannot exceed ${MAX_KEYWORD_LENGTH} characters`,
          });
        }
      }
    }

    const alert = await KeywordAlert.findOneAndUpdate(
      { user: userId, organization: organizationId },
      {
        $set: {
          keywords: Array.isArray(keywords) ? keywords : [],
          ...(typeof notifyViaEmail === "boolean" && { notifyViaEmail }),
          ...(typeof notifyViaApp === "boolean" && { notifyViaApp }),
          ...(typeof isActive === "boolean" && { isActive }),
        },
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json(alert);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle keyword alerts on/off
// @route   PATCH /api/alerts/keywords/toggle
// @access  Private
export const toggleAlerts = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const organizationId = req.user.organization;
    const { isActive } = req.body;

    if (!organizationId) {
      return res.status(403).json({ message: "Organization is required" });
    }

    const alert = await KeywordAlert.findOneAndUpdate(
      { user: userId, organization: organizationId },
      { $set: { isActive: !!isActive } },
      { new: true },
    );

    if (!alert) {
      throw new NotFoundError("Keyword alert settings not found");
    }

    res.status(200).json(alert);
  } catch (error) {
    next(error);
  }
};
