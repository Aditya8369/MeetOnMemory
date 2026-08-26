import { useState, useEffect } from "react";
import {
  getDashboardData,
  getOrphanedTopics,
  getCoOccurrenceGraph,
  generateBriefing,
} from "../api/topicIntelligenceApi";

const useFetchData = (fetchFn) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchFn();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [fetchFn]);

  return { data, isLoading, error };
};

export const useTopicDashboard = () => useFetchData(getDashboardData);

export const useOrphanedTopics = () => useFetchData(getOrphanedTopics);

export const useCoOccurrenceGraph = () => useFetchData(getCoOccurrenceGraph);

export const useGenerateBriefing = () => {
  const [isPending, setIsPending] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const mutate = async (clusterId, options = {}) => {
    try {
      setIsPending(true);
      const result = await generateBriefing(clusterId);
      setData(result);
      if (options.onSuccess) {
        options.onSuccess(result, clusterId);
      }
    } catch (err) {
      setError(err);
      if (options.onError) {
        options.onError(err, clusterId);
      }
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, data, error };
};
