import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import AppContent from "../../context/AppContent";
import { io } from "socket.io-client";
import {
  createPoll,
  getPollsByMeeting,
  castVote,
  closePoll,
  deletePoll,
} from "../../api/pollApi";
import { createClerkSocketOptions } from "../../services/apiClient.js";
import { toast } from "react-toastify";
import { hasPermission } from "../../utils/rbacPermissions.js";

const pollBelongsToMeeting = (poll, meetingId) => {
  if (!poll || !meetingId) return false;
  const pollMeeting = poll.meeting?._id || poll.meeting;
  if (!pollMeeting) return true;
  return String(pollMeeting) === String(meetingId);
};

const PollSection = ({
  meetingId,
  socket: externalSocket = null,
  title = "Polls",
  userRole,
}) => {
  const { userData, backendUrl } = useContext(AppContent);
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(meetingId));

  // Create Poll State
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [pollType, setPollType] = useState("single");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState("");

  const socketRef = useRef(null);
  const detachListenersRef = useRef(() => {});

  const isAdminOrOwner =
    userData?.role === "admin" || userData?.role === "owner";
  const canCreatePoll = hasPermission(userData?.role, "meetings", "edit");
  const isObserver = userRole === "observer";

  const fetchPolls = useCallback(async () => {
    if (!meetingId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getPollsByMeeting(meetingId);
      setPolls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch polls", err);
      setError("Failed to load polls. Please try again later.");
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  useEffect(() => {
    if (!meetingId) return undefined;

    let cancelled = false;
    let ownedSocket = null;

    const attachListeners = (sock) => {
      if (!sock?.on) return () => {};

      const onCreated = (newPoll) => {
        if (!pollBelongsToMeeting(newPoll, meetingId)) return;
        setPolls((prev) => {
          if (prev.some((p) => p._id === newPoll._id)) return prev;
          return [newPoll, ...prev];
        });
      };
      const onVote = (updatedPoll) => {
        if (!pollBelongsToMeeting(updatedPoll, meetingId)) return;
        setPolls((prev) =>
          prev.map((p) => (p._id === updatedPoll._id ? updatedPoll : p)),
        );
      };
      const onClosed = (updatedPoll) => {
        if (!pollBelongsToMeeting(updatedPoll, meetingId)) return;
        setPolls((prev) =>
          prev.map((p) => (p._id === updatedPoll._id ? updatedPoll : p)),
        );
      };
      const onDeleted = ({ id } = {}) => {
        if (!id) return;
        setPolls((prev) => prev.filter((p) => p._id !== id));
      };

      sock.on("poll:created", onCreated);
      sock.on("poll:vote", onVote);
      sock.on("poll:closed", onClosed);
      sock.on("poll:deleted", onDeleted);

      return () => {
        sock.off?.("poll:created", onCreated);
        sock.off?.("poll:vote", onVote);
        sock.off?.("poll:closed", onClosed);
        sock.off?.("poll:deleted", onDeleted);
      };
    };

    if (externalSocket) {
      detachListenersRef.current = attachListeners(externalSocket);
    } else {
      (async () => {
        const opts = await createClerkSocketOptions({
          transports: ["websocket"],
        });
        if (cancelled) return;

        ownedSocket = io(backendUrl, opts);
        if (cancelled) {
          ownedSocket.disconnect();
          return;
        }
        socketRef.current = ownedSocket;

        ownedSocket.on("connect", () => {
          ownedSocket.emit("join-meeting", {
            roomId: meetingId,
            userInfo: { name: userData?.name },
          });
        });

        detachListenersRef.current = attachListeners(ownedSocket);
      })();
    }

    return () => {
      cancelled = true;
      detachListenersRef.current();
      detachListenersRef.current = () => {};
      ownedSocket?.disconnect();
      if (socketRef.current && socketRef.current === ownedSocket) {
        socketRef.current = null;
      }
    };
  }, [meetingId, backendUrl, userData?.name, externalSocket]);

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (!question.trim() || validOptions.length < 2) {
      toast.error("Please provide a question and at least two valid options.");
      return;
    }

    const pollData = {
      meetingId,
      question,
      options: validOptions,
      pollType,
      isAnonymous,
    };

    if (expiresInMinutes) {
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);
      pollData.expiresAt = expiresAt;
    }

    try {
      await createPoll(pollData);
      setIsCreating(false);
      setQuestion("");
      setOptions(["", ""]);
      setPollType("single");
      setIsAnonymous(false);
      setExpiresInMinutes("");
      toast.success("Poll created successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error creating poll");
    }
  };

  const handleVote = async (pollId, pollType, optionId) => {
    if (isObserver) return;
    try {
      const selectedOptionIds = [optionId];
      await castVote(pollId, selectedOptionIds);
      toast.success("Vote submitted successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error casting vote");
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      await closePoll(pollId);
      toast.success("Poll closed successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error closing poll");
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm("Delete this poll?")) return;

    try {
      await deletePoll(pollId);
      setPolls((prev) => prev.filter((p) => p._id !== pollId));
      toast.success("Poll deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error deleting poll");
    }
  };

  const MultipleChoiceVoteForm = ({ poll }) => {
    const [selected, setSelected] = useState([]);

    const toggleSelection = (optionId) => {
      if (isObserver) return;
      if (selected.includes(optionId)) {
        setSelected(selected.filter((id) => id !== optionId));
      } else {
        setSelected([...selected, optionId]);
      }
    };

    const submitMultipleVotes = async () => {
      if (selected.length === 0 || isObserver) return;
      try {
        await castVote(poll._id, selected);
        toast.success("Votes submitted successfully!");
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.message || "Error casting votes");
      }
    };

    return (
      <div>
        {poll.options.map((opt) => (
          <div key={opt._id} className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={opt._id}
              disabled={poll.isClosed || isObserver}
              checked={selected.includes(opt._id)}
              onChange={() => toggleSelection(opt._id)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
            />
            <label
              htmlFor={opt._id}
              className={`text-gray-700 dark:text-gray-300 ${isObserver ? "opacity-50" : ""}`}
            >
              {opt.text}
            </label>
          </div>
        ))}
        {!isObserver && (
          <button
            onClick={submitMultipleVotes}
            disabled={selected.length === 0 || poll.isClosed}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            Submit Votes
          </button>
        )}
      </div>
    );
  };

  const renderPoll = (poll) => {
    const totalVotes = poll.options.reduce((sum, opt) => {
      return sum + (opt.votes?.length ?? opt.voteCount ?? 0);
    }, 0);

    const isCreator = poll.createdBy?._id === userData?._id;
    const canManage = isCreator || isAdminOrOwner;

    // Check if current user has voted using the hasVoted flag from backend
    const hasVoted = poll.isAnonymous
      ? poll.options.some((opt) => opt.hasVoted)
      : poll.options.some((opt) =>
          (opt.votes || []).some(
            (v) => v._id === userData?._id || v === userData?._id,
          ),
        );

    return (
      <div
        key={poll._id}
        className="p-4 mb-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {poll.question}
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Created by {poll.createdBy?.name || "Unknown"} •{" "}
              {new Date(poll.createdAt).toLocaleString()}
              {poll.isAnonymous && " • Anonymous"}
              {poll.isClosed && " • Closed"}
            </div>
          </div>
          <div className="flex gap-2">
            {!poll.isClosed && canManage && (
              <button
                onClick={() => handleClosePoll(poll._id)}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
              >
                Close Poll
              </button>
            )}
            {canManage && (
              <button
                onClick={() => handleDeletePoll(poll._id)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {poll.isClosed || hasVoted ? (
          <div className="space-y-3">
            {hasVoted && !poll.isClosed && (
              <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-300">
                ✓ You have already voted in this poll
              </div>
            )}
            {poll.options.map((opt) => {
              const votes = opt.votes?.length ?? opt.voteCount ?? 0;
              const percentage =
                totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              return (
                <div key={opt._id}>
                  <div className="flex justify-between text-sm mb-1 text-gray-700 dark:text-gray-300">
                    <span>{opt.text}</span>
                    <span>
                      {votes} vote{votes !== 1 && "s"} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {poll.pollType === "multiple" ? (
              <MultipleChoiceVoteForm poll={poll} />
            ) : (
              <div className="space-y-3">
                {poll.options.map((opt) => {
                  const votes = opt.votes?.length ?? opt.voteCount ?? 0;
                  const percentage =
                    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  return (
                    <div
                      key={opt._id}
                      role={isObserver ? undefined : "button"}
                      tabIndex={isObserver ? -1 : 0}
                      aria-label={`Vote for ${opt.text}`}
                      className={`relative overflow-hidden rounded-md border p-3 ${isObserver ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} transition-colors ${
                        (opt.votes || []).some(
                          (v) => v._id === userData?._id || v === userData?._id,
                        )
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      onClick={() =>
                        !isObserver &&
                        handleVote(
                          poll._id,
                          poll.pollType,
                          opt._id,
                          poll.options,
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          !isObserver &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          handleVote(
                            poll._id,
                            poll.pollType,
                            opt._id,
                            poll.options,
                          );
                        }
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 h-full bg-blue-100 dark:bg-blue-900/30 opacity-50 z-0 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative z-10 flex justify-between items-center">
                        <span className="text-gray-800 dark:text-gray-200 font-medium">
                          {opt.text}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {percentage}% ({votes})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Total Votes: {totalVotes}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-8" aria-labelledby="poll-section-heading">
      <div className="flex justify-between items-center mb-4">
        <h3
          id="poll-section-heading"
          className="text-xl font-bold text-gray-900 dark:text-white"
        >
          {title}
        </h3>
        {canCreatePoll && !isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Create Poll
          </button>
        )}
      </div>

      {loading && (
        <p
          role="status"
          aria-live="polite"
          className="text-center text-gray-500 dark:text-gray-400 py-4"
        >
          Loading polls...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800 text-red-700 dark:text-red-300 text-center text-sm font-medium"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchPolls}
            className="mt-2 text-sm font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {isCreating && (
        <form
          onSubmit={handleCreatePoll}
          className="mb-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="What would you like to ask?"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Options
            </label>
            {options.map((opt, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={`Option ${index + 1}`}
                  required={index < 2}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="px-3 py-2 text-red-600 bg-red-100 rounded hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddOption}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add Option
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Poll Type
              </label>
              <select
                value={pollType}
                onChange={(e) => setPollType(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expires In (minutes)
              </label>
              <input
                type="number"
                value={expiresInMinutes}
                onChange={(e) => setExpiresInMinutes(e.target.value)}
                min="1"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Leave blank for no expiry"
              />
            </div>
            <div className="flex items-end mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Anonymous Voting
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Publish Poll
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {!loading && polls.map((p) => renderPoll(p))}
        {!loading && !error && polls.length === 0 && !isCreating && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No polls created yet.
          </p>
        )}
      </div>
    </section>
  );
};

export default PollSection;
