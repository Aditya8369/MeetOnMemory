import mongoose from "mongoose";
import crypto from "crypto";

const MESSAGE_MAX_LENGTH = 5000;
const SUBJECT_MAX_LENGTH = 200;

const VALID_DEPARTMENTS = ["support", "sales", "billing", "security"];

const SLA_BY_DEPARTMENT = {
  support: "Within 12 hours",
  sales: "Within 4 hours",
  billing: "Within 12 hours",
  security: "Within 4 hours",
};

function generateTicketId() {
  const seq = crypto.randomInt(100000, 999999);
  return `MOM-${seq}`;
}

const contactMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      default: generateTicketId,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    organization: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    department: {
      type: String,
      required: true,
      enum: VALID_DEPARTMENTS,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: SUBJECT_MAX_LENGTH,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: MESSAGE_MAX_LENGTH,
    },
    status: {
      type: String,
      enum: ["open"],
      default: "open",
    },
  },
  { timestamps: true },
);

contactMessageSchema.index({ email: 1, subject: 1 });

export {
  VALID_DEPARTMENTS,
  SLA_BY_DEPARTMENT,
  MESSAGE_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
};

export default mongoose.model("ContactMessage", contactMessageSchema);
