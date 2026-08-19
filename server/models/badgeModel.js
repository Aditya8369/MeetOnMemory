import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // e.g. "The Punctual Pro", "Action Item Assassin"
    },
    description: {
      type: String,
      required: true,
    },
    iconUrl: {
      type: String,
      default: "", // Could point to an SVG or external image
    },
    tier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },
    criteria: {
      // Defines what is needed to unlock the badge (e.g., points threshold or specific action count)
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

const Badge = mongoose.models.Badge || mongoose.model("Badge", badgeSchema);

export default Badge;
