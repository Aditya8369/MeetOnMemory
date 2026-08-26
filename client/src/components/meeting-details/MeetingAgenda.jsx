import { ListOrdered } from "lucide-react";
import { normalizeAgendaItems } from "../../utils/agendaOrdering";
import AgendaVotingPanel from "./AgendaVotingPanel";
import { useAgendaVotes } from "../../hooks/useAgendaVotes";
import { useUser } from "@clerk/clerk-react";

const MeetingAgenda = ({ meeting }) => {
  const { user: currentUser } = useUser();
  const { tally, userVotes, castVote, removeVote, autoSortAgenda } =
    useAgendaVotes(meeting?._id);
  const agendaItems = normalizeAgendaItems(meeting?.agendaItems || []);
  if (agendaItems.length === 0) return null;

  const currentDbUserId = currentUser?.publicMetadata?.dbUserId;
  const isHost =
    currentDbUserId &&
    meeting?.uploadedBy &&
    currentDbUserId === meeting.uploadedBy;

  const participantDoc = meeting?.participants?.find(
    (p) =>
      (p.user &&
        currentDbUserId &&
        p.user.toString() === currentDbUserId.toString()) ||
      (p.email &&
        currentUser?.emailAddresses?.some(
          (e) => e.emailAddress.toLowerCase() === p.email.toLowerCase(),
        )),
  );

  const isParticipant =
    isHost || (participantDoc && participantDoc.role !== "guest");

  const isPreMeeting =
    meeting?.agendaProgress === "not_started" || !meeting?.agendaProgress;

  const handleAutoSort = async () => {
    try {
      await autoSortAgenda();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="mb-6">
      {isPreMeeting && (
        <AgendaVotingPanel
          agendaItems={agendaItems}
          tally={tally}
          userVotes={userVotes}
          onCastVote={castVote}
          onRemoveVote={removeVote}
          onAutoSort={handleAutoSort}
          isHost={isHost}
          isParticipant={isParticipant}
        />
      )}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered className="text-blue-600" size={20} aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Agenda
          </h2>
        </div>
        <ol className="space-y-3">
          {agendaItems.map((item, index) => (
            <li
              key={item.id || item._id || `${item.text}-${index}`}
              className="flex gap-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3"
            >
              <span className="font-semibold text-blue-600" aria-hidden="true">
                {index + 1}.
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {item.text || item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                )}
                {item.duration && (
                  <p className="mt-1 text-xs text-blue-600">
                    {item.duration} minutes
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default MeetingAgenda;
