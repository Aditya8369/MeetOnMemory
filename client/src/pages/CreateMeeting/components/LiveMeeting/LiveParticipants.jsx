import { Users, UserPlus, X } from "lucide-react";

const LiveParticipants = ({
  liveParticipants,
  newLiveParticipant,
  setNewLiveParticipant,
  addLiveParticipant,
  removeLiveParticipant,
}) => {
  return (
    <div className="mb-6">
      <label className="block mb-3 font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Users size={18} /> Add Participants
      </label>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={newLiveParticipant.name}
          onChange={(e) =>
            setNewLiveParticipant({
              ...newLiveParticipant,
              name: e.target.value,
            })
          }
          placeholder="Full Name"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <input
          type="email"
          value={newLiveParticipant.email}
          onChange={(e) =>
            setNewLiveParticipant({
              ...newLiveParticipant,
              email: e.target.value,
            })
          }
          placeholder="Email Address"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>
      <button
        type="button"
        onClick={addLiveParticipant}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer"
      >
        <UserPlus size={16} /> Add Participant
      </button>

      {liveParticipants.length > 0 && (
        <div className="mt-4 space-y-2">
          {liveParticipants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-gray-900 dark:text-gray-100"
            >
              <span className="text-sm">
                <strong>{p.name}</strong> - {p.email}
              </span>
              <button
                type="button"
                onClick={() => removeLiveParticipant(p.id)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveParticipants;
