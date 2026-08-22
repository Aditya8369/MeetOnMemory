import { useState, useEffect, useCallback } from "react";
import * as minutesApprovalApi from "../services/minutesApprovalApi";
import { toast } from "react-toastify";

const useMinutesApproval = (meetingId) => {
  const [approvalDoc, setApprovalDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApprovalStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await minutesApprovalApi.getApprovalStatus(meetingId);
      if (data.success) {
        setApprovalDoc(data.approval);
      }
    } catch (err) {
      console.error("Failed to fetch approval status:", err);
      // It's okay if it doesn't exist (404), but for other errors set it
      setError("Failed to load approval status");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) {
      fetchApprovalStatus();
    }
  }, [meetingId, fetchApprovalStatus]);

  const submitApproval = async (summary, approverIds) => {
    try {
      const { data } = await minutesApprovalApi.submitApproval(
        meetingId,
        summary,
        approverIds,
      );
      if (data.success) {
        setApprovalDoc(data.approval);
        toast.success("Minutes submitted for approval");
        return true;
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit for approval",
      );
      return false;
    }
  };

  const respondApproval = async (status, comment) => {
    try {
      const { data } = await minutesApprovalApi.respondApproval(
        meetingId,
        status,
        comment,
      );
      if (data.success) {
        setApprovalDoc(data.approval);
        toast.success(`Minutes ${status} successfully`);
        return true;
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to respond to approval",
      );
      return false;
    }
  };

  return {
    approvalDoc,
    loading,
    error,
    submitApproval,
    respondApproval,
    refreshApproval: fetchApprovalStatus,
  };
};

export default useMinutesApproval;
