import { useState, useEffect, useCallback } from "react";
import { keyMomentApi } from "../services/keyMomentApi";
import { useSocket } from "../contexts/SocketContext"; // assuming this exists based on standard patterns

export const useKeyMoments = (meetingId) => {
  const [moments, setMoments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket() || {};

  const fetchMoments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await keyMomentApi.fetchMoments(meetingId);
      setMoments(data.keyMoments || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) {
      fetchMoments();
    }
  }, [meetingId, fetchMoments]);

  useEffect(() => {
    if (!socket || !meetingId) return;

    const handleCreated = (newMoment) => {
      setMoments((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m._id === newMoment._id)) return prev;
        return [...prev, newMoment].sort((a, b) => a.startTime - b.startTime);
      });
    };

    const handleUpdated = (updatedMoment) => {
      setMoments((prev) =>
        prev.map((m) => (m._id === updatedMoment._id ? updatedMoment : m)),
      );
    };

    const handleDeleted = (deletedId) => {
      setMoments((prev) => prev.filter((m) => m._id !== deletedId));
    };

    socket.on("keyMoment:created", handleCreated);
    socket.on("keyMoment:updated", handleUpdated);
    socket.on("keyMoment:deleted", handleDeleted);

    return () => {
      socket.off("keyMoment:created", handleCreated);
      socket.off("keyMoment:updated", handleUpdated);
      socket.off("keyMoment:deleted", handleDeleted);
    };
  }, [socket, meetingId]);

  const addMoment = async (data) => {
    const response = await keyMomentApi.createMoment({ ...data, meetingId });
    return response.keyMoment;
  };

  const updateMoment = async (id, data) => {
    const response = await keyMomentApi.updateMoment(id, data);
    return response.keyMoment;
  };

  const removeMoment = async (id) => {
    await keyMomentApi.deleteMoment(id);
  };

  return {
    moments,
    isLoading,
    error,
    addMoment,
    updateMoment,
    removeMoment,
    refresh: fetchMoments,
  };
};
