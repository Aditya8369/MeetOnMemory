import { toast } from "react-toastify";
import {
  meetingApi,
  meetingSeriesApi,
  meetingTemplateApi,
  aiSummaryTemplateApi,
} from "../../../services";
import * as actionItemTemplateApi from "../../../services/actionItemTemplateApi";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { customFieldApi } from "../../../api/customFieldApi";
import { focusTimeApi } from "../../../api/focusTimeApi";
import AppContent from "../../../context/AppContent";
import {
  buildMeetingDraftKey,
  useFormDraft,
} from "../../../hooks/useFormDraft";
import {
  moveAgendaItem,
  normalizeAgendaItems,
} from "../../../utils/agendaOrdering";

export const buildDuplicateScheduleState = (duplicateData = {}) => ({
  scheduleData: {
    title: duplicateData.title || "",
    description: duplicateData.description || "",
    meetingType: duplicateData.meetingType || "conference",
    date: "",
    time: "",
    duration: duplicateData.duration ?? "",
    location: duplicateData.location || "",
    venue: duplicateData.venue || "",
    syncToCalendar: true,
    reminderEnabled: duplicateData.reminderEnabled || false,
    reminderMinutesBefore: duplicateData.reminderMinutesBefore || 30,
    recurrencePattern: duplicateData.recurrencePattern || "none",
    endDate: duplicateData.endDate || "",
    dayOfWeek: duplicateData.dayOfWeek || "",
    dayOfMonth: duplicateData.dayOfMonth || "",
  },
  participants: (duplicateData.participants || []).map(
    (participant, index) => ({
      ...participant,
      id: `duplicate-participant-${index}`,
    }),
  ),
  agendaItems: (duplicateData.agendaItems || []).map((item, index) => ({
    ...item,
    id: `duplicate-agenda-${index}`,
  })),
  metadata: {
    tags: duplicateData.tags || [],
    policyDetails: duplicateData.policyDetails || null,
    recordingType: duplicateData.recordingType || "upload",
  },
});

export const useScheduleMeeting = ({
  mode = "create",
  meetingId = null,
  serverUpdatedAt = null,
} = {}) => {
  const { userData } = useContext(AppContent);
  const [scheduleData, setScheduleData] = useState({
    title: "",
    description: "",
    meetingType: "conference",
    date: "",
    time: "",
    duration: "",
    location: "",
    venue: "",
    syncToCalendar: true,
    reminderEnabled: false,
    reminderMinutesBefore: 30,
    recurrencePattern: "none",
    endDate: "",
    dayOfWeek: "",
    dayOfMonth: "",
  });
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState({ name: "", email: "" });
  const [agendaItems, setAgendaItems] = useState([]);
  const [newAgenda, setNewAgenda] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [aiSummaryTemplates, setAiSummaryTemplates] = useState([]);
  const [selectedAiSummaryTemplateId, setSelectedAiSummaryTemplateId] =
    useState("");
  const [actionItemTemplates, setActionItemTemplates] = useState([]);
  const [selectedActionItemTemplateId, setSelectedActionItemTemplateId] =
    useState("");
  const [customFields, setCustomFields] = useState({
    fields: [],
    isValid: true,
  });
  const [duplicateMetadata, setDuplicateMetadata] = useState({
    tags: [],
    policyDetails: null,
    recordingType: "upload",
  });
  const [focusBlocks, setFocusBlocks] = useState([]);

  useEffect(() => {
    focusTimeApi
      .getBlocks()
      .then((blocks) => setFocusBlocks(blocks || []))
      .catch((err) =>
        console.error("Error loading focus blocks in scheduler:", err),
      );
  }, []);

  const userId = userData?._id || userData?.id;
  const organizationId =
    userData?.organization?._id || userData?.organization || null;
  const draftKey = buildMeetingDraftKey({
    userId,
    organizationId,
    mode,
    meetingId,
  });

  const draftValues = useMemo(
    () => ({
      scheduleData,
      participants,
      agendaItems,
      selectedTemplateId,
      selectedAiSummaryTemplateId,
      selectedActionItemTemplateId,
    }),
    [
      participants,
      scheduleData,
      agendaItems,
      selectedTemplateId,
      selectedAiSummaryTemplateId,
      selectedActionItemTemplateId,
    ],
  );

  const restoreDraftValues = (draft) => {
    if (draft?.scheduleData) setScheduleData(draft.scheduleData);
    if (Array.isArray(draft?.participants)) setParticipants(draft.participants);
    if (Array.isArray(draft?.agendaItems)) setAgendaItems(draft.agendaItems);
    if (typeof draft?.selectedTemplateId === "string") {
      setSelectedTemplateId(draft.selectedTemplateId);
    }
    if (typeof draft?.selectedAiSummaryTemplateId === "string") {
      setSelectedAiSummaryTemplateId(draft.selectedAiSummaryTemplateId);
    }
    if (typeof draft?.selectedActionItemTemplateId === "string") {
      setSelectedActionItemTemplateId(draft.selectedActionItemTemplateId);
    }
  };

  const {
    recoverableDraft,
    lastSavedAt,
    status: draftStatus,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: draftKey,
    values: draftValues,
    enabled: Boolean(draftKey) && !loading,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    serverUpdatedAt,
    onRestore: restoreDraftValues,
  });

  const resetFormState = useCallback(() => {
    setScheduleData({
      title: "",
      description: "",
      meetingType: "conference",
      date: "",
      time: "",
      duration: "",
      location: "",
      venue: "",
      syncToCalendar: true,
      reminderEnabled: false,
      reminderMinutesBefore: 30,
      recurrencePattern: "none",
      endDate: "",
      dayOfWeek: "",
      dayOfMonth: "",
    });
    setParticipants([]);
    setAgendaItems([]);
    setAttachments([]);
    setDuplicateMetadata({
      tags: [],
      policyDetails: null,
      recordingType: "upload",
    });
    setSelectedTemplateId("");
    setSelectedActionItemTemplateId("");
    clearDraft();
  }, [clearDraft]);

  useEffect(() => {
    let cancelled = false;
    if (userData?.organization) {
      meetingTemplateApi
        .getTemplates(userData.organization._id || userData.organization)
        .then((res) => {
          if (!cancelled && res.data?.success) setTemplates(res.data.templates);
        })
        .catch((err) =>
          console.error("Failed to fetch meeting templates:", err),
        );

      aiSummaryTemplateApi
        .getTemplates()
        .then((res) => {
          if (!cancelled && res.data) {
            setAiSummaryTemplates(res.data);
            if (
              res.data.length > 0 &&
              !draftValues.selectedAiSummaryTemplateId
            ) {
              const defaultTemplate = res.data.find((t) => t.isDefault);
              if (defaultTemplate)
                setSelectedAiSummaryTemplateId(defaultTemplate._id);
            }
          }
        })
        .catch((err) =>
          console.error("Failed to fetch AI summary templates:", err),
        );

      actionItemTemplateApi
        .getTemplates()
        .then((data) => {
          if (!cancelled && data) {
            setActionItemTemplates(data);
          }
        })
        .catch((err) =>
          console.error("Failed to fetch Action Item templates:", err),
        );
    }
    return () => {
      cancelled = true;
    };
  }, [userData, draftValues.selectedAiSummaryTemplateId]);

  const hydrateDuplicateMeeting = useCallback((duplicateData) => {
    const duplicated = buildDuplicateScheduleState(duplicateData);
    setScheduleData(duplicated.scheduleData);
    setParticipants(duplicated.participants);
    setAgendaItems(duplicated.agendaItems);
    setSelectedTemplateId("");
    setDuplicateMetadata(duplicated.metadata);
  }, []);

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (templateId) {
      const template = templates.find((t) => t._id === templateId);
      if (template) {
        const newBlocks = template.agendaBlocks.map((block) => ({
          text: block.title,
          description: block.description,
          duration: block.duration,
          id: Date.now().toString() + Math.random(),
        }));
        setAgendaItems(newBlocks);
        setAgendaItems(normalizeAgendaItems(newBlocks));
        toast.info("Template agenda applied");
      }
    }
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setScheduleData((prev) => ({ ...prev, [name]: value }));
  };

  const addParticipant = () => {
    if (newParticipant.name.trim() && newParticipant.email.trim()) {
      setParticipants([...participants, { ...newParticipant, id: Date.now() }]);
      setNewParticipant({ name: "", email: "" });
      toast.success("Participant added");
    } else {
      toast.error("Please enter both name and email");
    }
  };

  const removeParticipant = (id) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const addAgendaItem = () => {
    if (newAgenda.trim()) {
      setAgendaItems((current) =>
        normalizeAgendaItems([
          ...current,
          { text: newAgenda, id: crypto.randomUUID?.() || String(Date.now()) },
        ]),
      );
      setNewAgenda("");
      toast.success("Agenda item added");
    }
  };

  const removeAgendaItem = (id) => {
    setAgendaItems((current) =>
      normalizeAgendaItems(current.filter((a) => a.id !== id)),
    );
  };

  const reorderAgendaItem = (fromIndex, toIndex) => {
    setAgendaItems((current) => moveAgendaItem(current, fromIndex, toIndex));
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
    toast.success(`${files.length} file(s) attached`);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleData.title.trim()) {
      toast.error("Meeting title is required");
      return;
    }

    if (!scheduleData.date || !scheduleData.time) {
      toast.error("Date and time are required");
      return;
    }

    const checkFocusConflict = () => {
      if (!scheduleData.date || !scheduleData.time) return null;
      const duration = Number(scheduleData.duration) || 60;

      // Parse meeting start & end dates
      const meetingStart = new Date(
        `${scheduleData.date}T${scheduleData.time}`,
      );
      const meetingEnd = new Date(
        meetingStart.getTime() + duration * 60 * 1000,
      );

      // Iterate and find conflicts
      for (const block of focusBlocks) {
        const blockStart = new Date(block.startTime);
        const blockEnd = new Date(block.endTime);

        if (block.isRecurring) {
          const dayOfWeek = meetingStart.getDay();
          if (
            block.daysOfWeek.includes(dayOfWeek) &&
            blockStart <= meetingStart
          ) {
            const slotStart = new Date(meetingStart);
            slotStart.setHours(
              blockStart.getHours(),
              blockStart.getMinutes(),
              0,
              0,
            );
            const slotDuration = blockEnd - blockStart;
            const slotEnd = new Date(slotStart.getTime() + slotDuration);

            if (meetingStart < slotEnd && meetingEnd > slotStart) {
              return block.title || "Focus Time";
            }
          }
        } else {
          if (meetingStart < blockEnd && meetingEnd > blockStart) {
            return block.title || "Focus Time";
          }
        }
      }
      return null;
    };

    let finalAuditNote = "";
    const conflictTitle = checkFocusConflict();
    if (conflictTitle) {
      const confirmSchedule = window.confirm(
        `⚠️ Warning: This meeting overlaps with your Focus Time block: "${conflictTitle}".\n\nWould you like to schedule it anyway?`,
      );
      if (!confirmSchedule) return;

      const reason = window.prompt(
        "Please enter an audit note explaining the reason for scheduling over Focus Time:",
      );
      if (reason === null) return; // User cancelled

      finalAuditNote =
        reason || "Scheduled despite overlapping focus time block.";
    }

    const isRecurring =
      Boolean(scheduleData.recurrencePattern) &&
      scheduleData.recurrencePattern !== "none";

    if (isRecurring) {
      if (!scheduleData.endDate) {
        toast.error("End date is required for recurring meetings");
        return;
      }
      if (new Date(scheduleData.date) > new Date(scheduleData.endDate)) {
        toast.error("Start date must be before or equal to end date");
        return;
      }
      const validPatterns = ["daily", "weekly", "biweekly", "monthly"];
      if (!validPatterns.includes(scheduleData.recurrencePattern)) {
        toast.error("Invalid recurrence pattern selected");
        return;
      }
    }

    setLoading(true);
    try {
      if (isRecurring) {
        const seriesPayload = {
          title: scheduleData.title.trim(),
          description: scheduleData.description || "",
          meetingType: scheduleData.meetingType || "conference",
          recurrencePattern: scheduleData.recurrencePattern,
          dayOfWeek:
            scheduleData.dayOfWeek !== "" &&
            scheduleData.dayOfWeek !== undefined &&
            scheduleData.dayOfWeek !== null
              ? Number(scheduleData.dayOfWeek)
              : undefined,
          dayOfMonth:
            scheduleData.dayOfMonth !== "" &&
            scheduleData.dayOfMonth !== undefined &&
            scheduleData.dayOfMonth !== null
              ? Number(scheduleData.dayOfMonth)
              : undefined,
          startDate: scheduleData.date,
          endDate: scheduleData.endDate,
          time: scheduleData.time,
          duration: scheduleData.duration ? Number(scheduleData.duration) : 60,
          location: scheduleData.location || "",
          venue: scheduleData.venue || "",
          participants: participants.map((p) => ({
            name: p.name,
            email: p.email,
            role: p.role,
          })),
          agendaItems: normalizeAgendaItems(agendaItems).map((a) => ({
            text: a.text,
            description: a.description,
            duration: a.duration ? Number(a.duration) : undefined,
          })),
          auditNote: finalAuditNote,
        };

        const response = await meetingSeriesApi.createSeries(seriesPayload);

        if (response.data?.success) {
          const createdCount = response.data.meetingsCreated || 0;
          toast.success(
            `✅ Meeting series created successfully with ${createdCount} occurrence(s)!`,
          );
          resetFormState();
        } else {
          toast.error(
            response.data?.message || "Failed to create meeting series",
          );
        }
      } else {
        const payload = {
          ...scheduleData,
          participants,
          tags: duplicateMetadata.tags,
          policyDetails: duplicateMetadata.policyDetails,
          recordingType: duplicateMetadata.recordingType,
          agendaItems: normalizeAgendaItems(agendaItems),
          auditNote: finalAuditNote,
        };

        const response = await meetingApi.scheduleMeeting(payload);

        if (response.data?.success) {
          if (customFields.fields.length > 0 && userData?.organization) {
            try {
              await customFieldApi.setMeetingFields(
                response.data.meeting._id,
                userData.organization,
                customFields.fields,
              );
            } catch (err) {
              console.error("Failed to save custom fields", err);
              toast.error("Meeting saved, but custom fields failed to save");
            }
          }
          toast.success("✅ Meeting scheduled and synced to calendars!");

          if (response.data.calendarLinks) {
            toast.info("📅 Calendar invites sent to all participants!");
          }

          if (selectedActionItemTemplateId) {
            try {
              await actionItemTemplateApi.applyTemplateToMeeting(
                selectedActionItemTemplateId,
                response.data.meeting._id,
              );
              toast.success("Action items generated from template");
            } catch (err) {
              console.error("Failed to apply action item template", err);
              toast.error("Meeting saved, but action items failed to generate");
            }
          }

          resetFormState();
        } else {
          toast.error(response.data?.message || "Failed to schedule meeting");
        }
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.errors?.[0]?.message ||
          "Unable to schedule meeting",
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    scheduleData,
    setScheduleData,
    participants,
    newParticipant,
    setNewParticipant,
    agendaItems,
    newAgenda,
    setNewAgenda,
    attachments,
    loading,
    templates,
    selectedTemplateId,
    aiSummaryTemplates,
    selectedAiSummaryTemplateId,
    setSelectedAiSummaryTemplateId,
    actionItemTemplates,
    selectedActionItemTemplateId,
    setSelectedActionItemTemplateId,
    handleTemplateSelect,
    handleScheduleChange,
    addParticipant,
    removeParticipant,
    addAgendaItem,
    removeAgendaItem,
    reorderAgendaItem,
    handleAttachmentUpload,
    removeAttachment,
    handleScheduleSubmit,
    hydrateDuplicateMeeting,
    recoverableDraft,
    lastSavedAt,
    draftStatus,
    restoreDraft,
    discardDraft,
    setAgendaItems,
    customFields,
    setCustomFields,
    userData,
  };
};
