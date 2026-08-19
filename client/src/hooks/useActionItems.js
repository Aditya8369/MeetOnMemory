import { useState, useCallback } from "react";
import api from "../services/api";

/**
 * @desc Hook for managing action item state, fetching lists, and triggering AI extraction.
 */
export const useActionItems = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filters).toString();
      const { data } = await api.get(`/action-items?${params}`);
      setItems(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch action items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMeetingItems = useCallback(async (meetingId) => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/action-items/meeting/${meetingId}`);
      setItems(data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch meeting items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const extractFromMeeting = useCallback(async (meetingId) => {
    setIsExtracting(true);
    setError(null);
    try {
      const { data } = await api.post(`/meetings/${meetingId}/extract-actions`);
      // Append new items to existing list
      setItems((prev) => [...(data.data || []), ...prev]);
      return data.count;
    } catch (err) {
      setError(err.response?.data?.error || "AI extraction failed");
      return 0;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const updateItem = useCallback(async (id, updates) => {
    try {
      const { data } = await api.patch(`/action-items/${id}`, updates);
      setItems((prev) =>
        prev.map((item) => (item._id === id ? data.data : item)),
      );
      return true;
    } catch (err) {
      console.error("Update failed:", err);
      return false;
    }
  }, []);

  const deleteItem = useCallback(async (id) => {
    try {
      await api.delete(`/action-items/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      return true;
    } catch (err) {
      console.error("Delete failed:", err);
      return false;
    }
  }, []);

  return {
    items,
    isLoading,
    isExtracting,
    error,
    fetchItems,
    fetchMeetingItems,
    extractFromMeeting,
    updateItem,
    deleteItem,
  };
};
