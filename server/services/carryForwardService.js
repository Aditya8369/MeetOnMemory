import CarryForwardConfig from "../models/carryForwardConfigModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import { normalizeAgendaItems } from "../utils/agendaOrdering.js";

class CarryForwardService {
  async getConfig(seriesId, organizationId = null) {
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

  async updateConfig(seriesId, rules) {
    const config = await CarryForwardConfig.findOneAndUpdate(
      { seriesId },
      { $set: { carryForwardRules: rules } },
      { new: true, upsert: true },
    );
    return config;
  }

  async getCarryForwardPreview(seriesId) {
    const config = await this.getConfig(seriesId);

    // Find the most recent completed meeting in the series
    const pastMeeting = await Meeting.findOne({
      series: seriesId,
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
        duration: 5, // Default 5 mins for action item review
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

  async applyCarryForward(seriesId, currentMeetingId) {
    const preview = await this.getCarryForwardPreview(seriesId);

    if (preview.agendaItems.length === 0 && preview.actionItems.length === 0) {
      return { success: false, message: "No items to carry forward." };
    }

    const currentMeeting = await Meeting.findById(currentMeetingId);
    if (!currentMeeting) {
      throw new Error("Meeting not found");
    }

    // Combine preview items to prepend to current agenda
    const itemsToPrepend = [...preview.agendaItems, ...preview.actionItems];

    // Create new agenda item objects
    const newAgendaItems = itemsToPrepend.map((item) => ({
      text: item.text,
      description: item.description,
      duration: item.duration,
      status: "pending",
      actualDuration: 0,
    }));

    // Prepend to existing agenda
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
