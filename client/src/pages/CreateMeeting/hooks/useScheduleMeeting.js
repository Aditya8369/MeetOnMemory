import { useContext, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { meetingApi, meetingTemplateApi } from "../../../services";
import { useEffect } from "react";
import AppContent from "../../../context/AppContent";
import {
  buildMeetingDraftKey,
  useFormDraft,
} from "../../../hooks/useFormDraft";

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
  });
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState({ name: "", email: "" });
  const [agendaItems, setAgendaItems] = useState([]);
  const [newAgenda, setNewAgenda] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

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
    }),
    [agendaItems, participants, scheduleData, selectedTemplateId],
  );

  const restoreDraftValues = (draft) => {
    if (draft?.scheduleData) setScheduleData(draft.scheduleData);
    if (Array.isArray(draft?.participants)) setParticipants(draft.participants);
    if (Array.isArray(draft?.agendaItems)) setAgendaItems(draft.agendaItems);
    if (typeof draft?.selectedTemplateId === "string") {
      setSelectedTemplateId(draft.selectedTemplateId);
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

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await meetingTemplateApi.getTemplates();
        if (res.data?.success) {
          setTemplates(res.data.templates);
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    fetchTemplates();
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
      setAgendaItems([...agendaItems, { text: newAgenda, id: Date.now() }]);
      setNewAgenda("");
      toast.success("Agenda item added");
    }
  };

  const removeAgendaItem = (id) => {
    setAgendaItems(agendaItems.filter((a) => a.id !== id));
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

    setLoading(true);
    try {
      const payload = {
        ...scheduleData,
        participants,
        agendaItems,
      };

      const response = await meetingApi.scheduleMeeting(payload);

      if (response.data?.success) {
        toast.success("✅ Meeting scheduled and synced to calendars!");

        // Trigger calendar integration
        if (response.data.calendarLinks) {
          toast.info("📅 Calendar invites sent to all participants!");
        }

        // Reset form
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
        });
        setParticipants([]);
        setAgendaItems([]);
        setAttachments([]);
        setSelectedTemplateId("");
        clearDraft();
      } else {
        toast.error(response.data?.message || "Failed to schedule meeting");
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      toast.error(
        error.response?.data?.message || "Unable to schedule meeting",
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
    handleTemplateSelect,
    handleScheduleChange,
    addParticipant,
    removeParticipant,
    addAgendaItem,
    removeAgendaItem,
    handleAttachmentUpload,
    removeAttachment,
    handleScheduleSubmit,
    recoverableDraft,
    lastSavedAt,
    draftStatus,
    restoreDraft,
    discardDraft,
    setAgendaItems,
  };
};
