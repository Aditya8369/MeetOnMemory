import mongoose from "mongoose";
import CarryForwardConfig from "../models/carryForwardConfigModel.js";
import Meeting from "../models/meetingModel.js";
import MeetingSeries from "../models/meetingSeriesModel.js";
import ActionItem from "../models/actionItemModel.js";
import { normalizeAgendaItems } from "../utils/agendaOrdering.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

const idsEqual = (a, b) => {
  if (!a || !b) return false;
  return a.toString() === b.toString();
};

class CarryForwardService {
  /**
   * Fail-closed series ownership check (Issue #1666).
   *
   * Loads the Meeting Series by `seriesId`, then verifies it belongs to the
   * authenticated organization. Foreign and missing series both surface as
   * 404 so existence in another tenant is not leaked.
   *
   * Never accepts a client-supplied organization id as a substitute for the
   * authenticated org passed in by the controller.
   */
  async assertSeriesOwnedByOrganization(seriesId, organizationId) {
    if (!organizationId) {
      throw new ForbiddenError("Organization membership required");
    }

    if (!seriesId || !mongoose.Types.ObjectId.isValid(seriesId)) {
      throw new NotFoundError("Series not found");
    }

    const series = await MeetingSeries.findById(seriesId);
    if (!series || !idsEqual(series.organization, organizationId)) {
      throw new NotFoundError("Series not found");
    }

    return series;
  }

  async getConfig(seriesId, organizationId) {
    await this.assertSeriesOwnedByOrganization(seriesId, organizationId);

    let config = await CarryForwardConfig.findOne({ seriesId });
    if (!config) {
      config = new CarryForwardConfig({
        seriesId,
        organization: organizationId,
        carryForwardRules: {
          includeUnfinishedAgenda: true,
          includeOpenActionItems: true,
          maxCarriedItems: 10,
        },
      });
      await config.save();
    }
    return config;
  }

  async updateConfig(seriesId, rules, organizationId) {
    await this.assertSeriesOwnedByOrganization(seriesId, organizationId);

    const config = await CarryForwardConfig.findOneAndUpdate(
      { seriesId },
      {
        $set: {
          carryForwardRules: rules,
          organization: organizationId,
        },
      },
      { new: true, upsert: true },
    );
    return config;
  }

  async getCarryForwardPreview(seriesId, organizationId) {
    const config = await this.getConfig(seriesId, organizationId);

    const pastMeeting = await Meeting.findOne({
      series: seriesId,
      organization: organizationId,
      status: "completed",
    }).sort({ seriesOccurrence: -1 });

    if (!pastMeeting) {
      return {
        agendaItems: [],
        actionItems: [],
        pastMeetingId: null,
      };
    }

    let carriedAgenda = [];
    let carriedActionItems = [];
    const maxItems = config.carryForwardRules.maxCarriedItems || 10;

    if (
      config.carryForwardRules.includeUnfinishedAgenda &&
      pastMeeting.agendaItems
    ) {
      carriedAgenda = pastMeeting.agendaItems
        .filter((item) => item.status === "pending" || item.status === "active")
        .map((item) => ({
          text: item.text,
          description: item.description,
          duration: item.duration,
          status: "pending",
        }));
    }

    if (config.carryForwardRules.includeOpenActionItems) {
      const openActions = await ActionItem.find({
        sourceMeetingId: pastMeeting._id,
        status: { $in: ["open", "in-progress"] },
      });

      carriedActionItems = openActions.map((action) => ({
        text: `Review Action Item: ${action.text}`,
        description: `Owner: ${action.owner}`,
        duration: 5,
        status: "pending",
      }));
    }

    const totalItems = [...carriedAgenda, ...carriedActionItems];
    const limitedItems = totalItems.slice(0, maxItems);

    const resultingAgenda = limitedItems.filter((item) =>
      carriedAgenda.includes(item),
    );
    const resultingActionItems = limitedItems.filter((item) =>
      carriedActionItems.includes(item),
    );

    return {
      agendaItems: resultingAgenda,
      actionItems: resultingActionItems,
      pastMeetingId: pastMeeting._id,
    };
  }

  async applyCarryForward(seriesId, currentMeetingId, organizationId) {
    const preview = await this.getCarryForwardPreview(seriesId, organizationId);

    if (preview.agendaItems.length === 0 && preview.actionItems.length === 0) {
      return { success: false, message: "No items to carry forward." };
    }

    const currentMeeting = await Meeting.findOne({
      _id: currentMeetingId,
      series: seriesId,
      organization: organizationId,
    });
    if (!currentMeeting) {
      throw new NotFoundError("Meeting not found");
    }

    const itemsToPrepend = [...preview.agendaItems, ...preview.actionItems];

    const newAgendaItems = itemsToPrepend.map((item) => ({
      text: item.text,
      description: item.description,
      duration: item.duration,
      status: "pending",
      actualDuration: 0,
    }));

    const currentAgenda = currentMeeting.agendaItems || [];
    currentMeeting.agendaItems = normalizeAgendaItems([
      ...newAgendaItems,
      ...currentAgenda,
    ]);

    await currentMeeting.save();

    return {
      success: true,
      message: `Carried forward ${itemsToPrepend.length} items.`,
      appliedItems: itemsToPrepend.length,
    };
  }
}

export default new CarryForwardService();
