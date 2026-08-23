import { useState, useCallback } from "react";
import { effectivenessApi } from "../services/effectivenessApi";

export const useEffectivenessScore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [meetingScore, setMeetingScore] = useState(null);
  const [orgTrends, setOrgTrends] = useState([]);
  const [seriesTrends, setSeriesTrends] = useState([]);

  const fetchMeetingScore = useCallback(async (meetingId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await effectivenessApi.getMeetingScore(meetingId);
      if (data.success) {
        setMeetingScore(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch meeting score");
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateScore = useCallback(
    async (meetingId, organizationId, seriesId) => {
      setLoading(true);
      setError(null);
      try {
        const data = await effectivenessApi.calculateMeetingScore(
          meetingId,
          organizationId,
          seriesId,
        );
        if (data.success) {
          setMeetingScore(data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to calculate score");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchOrgTrends = useCallback(async (organizationId, days = 30) => {
    setLoading(true);
    setError(null);
    try {
      const data = await effectivenessApi.getOrganizationTrends(
        organizationId,
        days,
      );
      if (data.success) {
        setOrgTrends(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch org trends");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSeriesTrends = useCallback(async (seriesId, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const data = await effectivenessApi.getSeriesTrends(seriesId, limit);
      if (data.success) {
        setSeriesTrends(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch series trends");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    meetingScore,
    orgTrends,
    seriesTrends,
    fetchMeetingScore,
    calculateScore,
    fetchOrgTrends,
    fetchSeriesTrends,
  };
};
