import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import bulkMeetingApi from "../services/bulkMeetingApi.js";

const MAX_BULK_LIMIT = 50;

const useBulkMeetingActions = (onSuccess) => {
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedMeetings, setSelectedMeetings] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const toggleBulkMode = useCallback(() => {
    setIsBulkMode((prev) => !prev);
    setSelectedMeetings(new Set());
    setErrorMessage(null);
  }, []);

  const toggleSelection = useCallback((meetingId) => {
    setSelectedMeetings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        if (newSet.size >= MAX_BULK_LIMIT) {
          toast.warning(
            `You can only select up to ${MAX_BULK_LIMIT} meetings at once.`,
          );
          return prev;
        }
        newSet.add(meetingId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMeetings(new Set());
    setErrorMessage(null);
  }, []);

  const selectAll = useCallback((meetingIds) => {
    const newSet = new Set();
    let count = 0;
    for (const id of meetingIds) {
      if (count >= MAX_BULK_LIMIT) {
        toast.warning(
          `Only the first ${MAX_BULK_LIMIT} meetings were selected.`,
        );
        break;
      }
      newSet.add(id);
      count++;
    }
    setSelectedMeetings(newSet);
  }, []);

  const executeBulkAction = async (actionFn, actionName, successMessage) => {
    if (selectedMeetings.size === 0) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const meetingIds = Array.from(selectedMeetings);
      const response = await actionFn(meetingIds);

      if (response.data?.success || response.status === 200) {
        toast.success(
          successMessage ||
            `Successfully performed ${actionName} on ${meetingIds.length} meetings.`,
        );
        clearSelection();
        setIsBulkMode(false);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error(`Bulk ${actionName} failed:`, err);
      const message =
        err.response?.data?.message ||
        err.message ||
        `Failed to perform ${actionName}.`;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkArchive = () =>
    executeBulkAction(
      (ids) => bulkMeetingApi.bulkArchive(ids),
      "Archive",
      `Archived ${selectedMeetings.size} meetings.`,
    );

  const handleBulkTag = (tags) =>
    executeBulkAction(
      (ids) => bulkMeetingApi.bulkTag(ids, tags),
      "Tag",
      `Added tags to ${selectedMeetings.size} meetings.`,
    );

  const handleBulkSoftDelete = () =>
    executeBulkAction(
      (ids) => bulkMeetingApi.bulkSoftDelete(ids),
      "Delete",
      `Moved ${selectedMeetings.size} meetings to the Recycle Bin.`,
    );

  const handleBulkRestore = () =>
    executeBulkAction(
      (ids) => bulkMeetingApi.bulkRestore(ids),
      "Restore",
      `Restored ${selectedMeetings.size} meetings.`,
    );

  const handleBulkExport = async (format = "md") => {
    if (selectedMeetings.size === 0) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      const meetingIds = Array.from(selectedMeetings);
      const response = await bulkMeetingApi.bulkExport(meetingIds, format);

      // Create a download link for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let filename = `meetings_export_${Date.now()}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${meetingIds.length} meetings successfully.`);
      clearSelection();
      setIsBulkMode(false);
    } catch (err) {
      console.error("Bulk Export failed:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to export meetings.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isBulkMode,
    toggleBulkMode,
    selectedMeetings,
    toggleSelection,
    clearSelection,
    selectAll,
    isProcessing,
    errorMessage,
    clearError,
    handleBulkArchive,
    handleBulkTag,
    handleBulkSoftDelete,
    handleBulkRestore,
    handleBulkExport,
  };
};

export default useBulkMeetingActions;
