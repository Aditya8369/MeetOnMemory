import { useState, useCallback } from "react";
import { skillEndorsementApi } from "../services";
import { toast } from "react-toastify";

export const useSkillEndorsements = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createEndorsement = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await skillEndorsementApi.createEndorsement(data);
      if (response.data.success) {
        toast.success("Peer recognized successfully!");
        return response.data.data;
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to endorse peer";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMeetingEndorsements = useCallback(async (meetingId) => {
    setLoading(true);
    setError(null);
    try {
      const response =
        await skillEndorsementApi.getMeetingEndorsements(meetingId);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to fetch meeting endorsements";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserEndorsements = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await skillEndorsementApi.getUserEndorsements(userId);
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to fetch user endorsements";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createEndorsement,
    getMeetingEndorsements,
    getUserEndorsements,
  };
};

export default useSkillEndorsements;
