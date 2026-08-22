import { Calendar, Loader2, Send, FileText } from "lucide-react";
import MeetingInformationForm from "./MeetingInformationForm";
import ParticipantsSection from "./ParticipantsSection";
import AgendaSection from "./AgendaSection";
import AttachmentSection from "./AttachmentSection";
import CalendarNotice from "./CalendarNotice";
import DraftRecoveryBanner from "./DraftRecoveryBanner";
import SmartAgendaGenerator from "../../../../components/meetings/SmartAgendaGenerator";
import CustomFieldsEditor from "../../../../components/meetings/CustomFieldsEditor";

const ScheduleMeeting = ({ hookProps, loadingDuplicate = false }) => {
  const {
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
    reorderAgendaItem,
    handleAttachmentUpload,
    removeAttachment,
    handleScheduleSubmit,
    recoverableDraft,
    lastSavedAt,
    draftStatus,
    restoreDraft,
    discardDraft,
    aiSummaryTemplates,
    selectedAiSummaryTemplateId,
    setSelectedAiSummaryTemplateId,
    setAgendaItems,
    customFields,
    setCustomFields,
    userData,
    actionItemTemplates,
    selectedActionItemTemplateId,
    setSelectedActionItemTemplateId,
  } = hookProps;

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-lg rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="text-blue-600 dark:text-blue-400" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Schedule Meeting
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create and manage meeting schedules with automatic calendar
            integration
          </p>
        </div>
      </div>

      {loadingDuplicate && (
        <div
          className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-800 dark:text-blue-300"
          role="status"
        >
          Loading reusable meeting details...
        </div>
      )}

      <form onSubmit={handleScheduleSubmit}>
        <DraftRecoveryBanner
          savedAt={recoverableDraft?.savedAt}
          lastSavedAt={lastSavedAt}
          status={draftStatus}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
        <MeetingInformationForm
          scheduleData={scheduleData}
          setScheduleData={setScheduleData}
          handleScheduleChange={handleScheduleChange}
        />

        <ParticipantsSection
          participants={participants}
          newParticipant={newParticipant}
          setNewParticipant={setNewParticipant}
          addParticipant={addParticipant}
          removeParticipant={removeParticipant}
        />

        {templates && templates.length > 0 && (
          <div className="mb-6 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              <FileText size={16} /> Load Meeting Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={handleTemplateSelect}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="">
                -- Select a template to populate agenda --
              </option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title} ({t.agendaBlocks?.length || 0} items)
                </option>
              ))}
            </select>
          </div>
        )}

        {aiSummaryTemplates && aiSummaryTemplates.length > 0 && (
          <div className="mb-6 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
              <FileText size={16} /> AI Summary Instructions
            </label>
            <select
              value={selectedAiSummaryTemplateId || ""}
              onChange={(e) => setSelectedAiSummaryTemplateId(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="">-- Standard Summary Format --</option>
              {aiSummaryTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-2">
              custom instructions allow you to dictate exactly how the AI will
              write the MoM (e.g. Sales BANT, Sprint Retro).
            </p>
          </div>
        )}

        {actionItemTemplates && actionItemTemplates.length > 0 && (
          <div className="mb-6 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
            <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-2">
              <FileText size={16} /> Action Item Template
            </label>
            <select
              value={selectedActionItemTemplateId || ""}
              onChange={(e) => setSelectedActionItemTemplateId(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="">
                -- Let standard tasks generate automatically --
              </option>
              {actionItemTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.items?.length || 0} tasks)
                </option>
              ))}
            </select>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
              Manually apply a specific set of standard action items for this
              meeting.
            </p>
          </div>
        )}

        <CustomFieldsEditor
          orgId={userData?.organization}
          onChange={(fields, isValid) => setCustomFields({ fields, isValid })}
        />

        <SmartAgendaGenerator
          organizationId={userData?.organization?._id || userData?.organization}
          meetingId={null}
          currentAgenda={agendaItems}
          onApplySuccess={setAgendaItems}
        />

        <AgendaSection
          agendaItems={agendaItems}
          setAgendaItems={setAgendaItems}
          newAgenda={newAgenda}
          setNewAgenda={setNewAgenda}
          addAgendaItem={addAgendaItem}
          removeAgendaItem={removeAgendaItem}
          reorderAgendaItem={reorderAgendaItem}
        />

        <AttachmentSection
          attachments={attachments}
          handleAttachmentUpload={handleAttachmentUpload}
          removeAttachment={removeAttachment}
        />
        {/* Meeting Reminder */}
        <div className="mb-6 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-600 dark:text-blue-400" size={18} />

            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Meeting Reminder
            </h3>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleData.reminderEnabled || false}
              onChange={(e) =>
                setScheduleData((prev) => ({
                  ...prev,
                  reminderEnabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 focus:ring-blue-500"
            />

            <span className="text-sm text-gray-700 dark:text-gray-300">
              Send me a notification before this meeting starts
            </span>
          </label>

          {scheduleData.reminderEnabled && (
            <div className="mt-4">
              <label
                htmlFor="reminderMinutesBefore"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Remind me
              </label>

              <select
                id="reminderMinutesBefore"
                value={scheduleData.reminderMinutesBefore || 30}
                onChange={(e) =>
                  setScheduleData((prev) => ({
                    ...prev,
                    reminderMinutesBefore: Number(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm text-gray-700 dark:text-gray-200"
              >
                <option value={10}>10 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
              </select>

              <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                You will receive an in-app notification and email reminder.
              </p>
            </div>
          )}
        </div>

        <CalendarNotice />

        {/* Submit */}
        <button
          type="submit"
          disabled={
            loading ||
            loadingDuplicate ||
            (customFields && !customFields.isValid)
          }
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Scheduling & Syncing Calendars...
            </>
          ) : (
            <>
              <Send size={18} /> Schedule Meeting & Send Invites
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ScheduleMeeting;
