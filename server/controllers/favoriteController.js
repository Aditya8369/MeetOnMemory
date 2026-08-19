import mongoose from "mongoose";
import Favorite from "../models/favoriteModel.js";
import Meeting from "../models/meetingModel.js";
import { isSameOrganization } from "../utils/authUtils.js";

// Toggle favorite status for the current user.
export const toggleFavorite = async (req, res) => {
  try {
    const { meetingId } = req.body;
    const userId = req.user._id;

    if (!meetingId) {
      return res.status(400).json({ message: "meetingId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res.status(400).json({ message: "Invalid meetingId" });
    }

    const meeting =
      await Meeting.findById(meetingId).select("organization _id");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (!isSameOrganization(req.user, meeting)) {
      return res.status(403).json({
        message: "Meeting does not belong to your organization",
      });
    }

    const existingFavorite = await Favorite.findOne({
      user: userId,
      meeting: meetingId,
    });

    if (existingFavorite) {
      await Favorite.deleteOne({ _id: existingFavorite._id });

      return res.status(200).json({
        message: "Favorite removed",
        favorited: false,
      });
    }

    const favorite = await Favorite.create({
      user: userId,
      meeting: meetingId,
    });

    return res.status(201).json({
      message: "Favorite added",
      favorited: true,
      data: favorite,
    });
  } catch (error) {
    console.error("Error in toggleFavorite:", error);

    // Protect against a race condition with the unique index.
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Meeting is already favorited",
      });
    }

    return res.status(500).json({
      message: "Server error toggling favorite",
    });
  }
};

// Get all favorite meeting IDs for the current user.
export const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({
      user: req.user._id,
    })
      .select("meeting")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      favorites: favorites.map((favorite) => favorite.meeting),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);

    return res.status(500).json({
      message: "Server error fetching favorites",
    });
  }
};

// Get favorite status for one meeting.
export const getFavoriteStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res.status(400).json({ message: "Invalid meetingId" });
    }

    const favorite = await Favorite.findOne({
      user: req.user._id,
      meeting: meetingId,
    });

    return res.status(200).json({
      favorited: !!favorite,
    });
  } catch (error) {
    console.error("Error checking favorite status:", error);

    return res.status(500).json({
      message: "Server error checking favorite status",
    });
  }
};
