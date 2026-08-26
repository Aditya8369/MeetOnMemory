import { z } from "zod";
import customFieldService from "../services/customFieldService.js";

const createDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["text", "number", "dropdown", "date", "checkbox"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

const updateDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
});

function resolveAuthenticatedOrgId(req) {
  const org = req.user?.organization;
  if (!org) return null;
  return org._id || org;
}

function isOrgAdmin(req) {
  const role = req.user?.role;
  return role === "admin" || role === "owner";
}

export const createDefinition = async (req, res) => {
  try {
    const orgId = resolveAuthenticatedOrgId(req);
    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const payload = createDefinitionSchema.parse(req.body);
    const def = await customFieldService.createDefinition(orgId, payload);
    res.status(201).json({ success: true, data: def });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getDefinitions = async (req, res) => {
  try {
    const orgId = resolveAuthenticatedOrgId(req);
    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const includeInactive =
      req.query.includeInactive === "true" && isOrgAdmin(req);
    const defs = await customFieldService.getDefinitions(
      orgId,
      !includeInactive,
    );
    res.status(200).json({ success: true, data: defs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDefinition = async (req, res) => {
  try {
    const orgId = resolveAuthenticatedOrgId(req);
    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const payload = updateDefinitionSchema.parse(req.body);
    const def = await customFieldService.updateDefinition(
      req.params.definitionId,
      orgId,
      payload,
    );
    res.status(200).json({ success: true, data: def });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    const status = error.message === "Definition not found" ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const deleteDefinition = async (req, res) => {
  try {
    const orgId = resolveAuthenticatedOrgId(req);
    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const def = await customFieldService.deleteDefinition(
      req.params.definitionId,
      orgId,
    );
    res.status(200).json({ success: true, data: def });
  } catch (error) {
    const status = error.message === "Definition not found" ? 404 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const setMeetingFields = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const orgId = resolveAuthenticatedOrgId(req);
    const fieldsData = req.body.fields; // array of { definitionId, value }

    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    await customFieldService.setMeetingFields(meetingId, orgId, fieldsData);
    res.status(200).json({ success: true, message: "Fields updated" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMeetingFields = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const fields = await customFieldService.getMeetingFields(meetingId);
    res.status(200).json({ success: true, data: fields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
