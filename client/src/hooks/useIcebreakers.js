import { useState, useCallback } from "react";
import {
  generateIcebreakers,
  selectIcebreaker,
} from "../services/icebreakerApi";
import { toast } from "react-toastify";

export const useIcebreakers = (meetingId) => {
  const [icebreakers, setIcebreakers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIcebreaker, setSelectedIcebreaker] = useState(null);

  const generate = useCallback(
    async (participantIds = []) => {
      if (!meetingId && participantIds.length === 0) return;
      setLoading(true);
      try {
        const data = await generateIcebreakers(meetingId, participantIds);
        setIcebreakers(data.icebreakers);
      } catch (error) {
        toast.error("Failed to generate icebreakers. Please try again.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [meetingId],
  );

  const select = useCallback(
    async (category, promptText) => {
      if (!meetingId) return;
      try {
        const saved = await selectIcebreaker(meetingId, category, promptText);
        setSelectedIcebreaker(saved);
        toast.success("Icebreaker selected!");
      } catch (error) {
        toast.error("Failed to select icebreaker.");
        console.error(error);
      }
    },
    [meetingId],
  );

  return {
    icebreakers,
    loading,
    selectedIcebreaker,
    generate,
    select,
  };
};
