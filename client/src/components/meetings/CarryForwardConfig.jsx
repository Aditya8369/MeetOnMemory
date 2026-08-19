import React, { useState, useEffect } from "react";
import { carryForwardApi } from "../../services";
import { toast } from "react-toastify";

const CarryForwardConfig = ({ seriesId, currentMeetingId, onApplySuccess }) => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, previewRes] = await Promise.all([
        carryForwardApi.getConfig(seriesId),
        carryForwardApi.getPreview(seriesId),
      ]);

      if (configRes.data.success) {
        setConfig(configRes.data.config.carryForwardRules);
      }
      if (previewRes.data.success) {
        setPreview(previewRes.data.preview);
      }
    } catch (error) {
      console.error("Error fetching carry forward data:", error);
      toast.error("Failed to load carry forward configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const updatedRules = { ...config, [key]: !config[key] };
    setConfig(updatedRules);
    try {
      await carryForwardApi.updateConfig(seriesId, updatedRules);
      const previewRes = await carryForwardApi.getPreview(seriesId);
      if (previewRes.data.success) {
        setPreview(previewRes.data.preview);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update rules");
      setConfig(config); // Revert on failure
    }
  };

  const handleMaxChange = async (e) => {
    const val = parseInt(e.target.value, 10);
    const updatedRules = { ...config, maxCarriedItems: val };
    setConfig(updatedRules);
    try {
      await carryForwardApi.updateConfig(seriesId, updatedRules);
      const previewRes = await carryForwardApi.getPreview(seriesId);
      if (previewRes.data.success) {
        setPreview(previewRes.data.preview);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update limit");
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      const { data } = await carryForwardApi.applyCarryForward(
        seriesId,
        currentMeetingId,
      );
      if (data.success) {
        toast.success(data.message);
        if (onApplySuccess) onApplySuccess();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply carry forward items");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading carry forward data...</div>;
  }

  if (!config) return null;

  const totalItems =
    (preview?.agendaItems?.length || 0) + (preview?.actionItems?.length || 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 my-4">
      <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
        Carry Forward Configuration
      </h3>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">
            Include Unfinished Agenda Items
          </span>
          <button
            onClick={() => handleToggle("includeUnfinishedAgenda")}
            className={`w-11 h-6 rounded-full transition-colors ${config.includeUnfinishedAgenda ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transform transition-transform ${config.includeUnfinishedAgenda ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">
            Include Open Action Items
          </span>
          <button
            onClick={() => handleToggle("includeOpenActionItems")}
            className={`w-11 h-6 rounded-full transition-colors ${config.includeOpenActionItems ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transform transition-transform ${config.includeOpenActionItems ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-700 dark:text-gray-300">
            Max Items to Carry Forward
          </span>
          <input
            type="number"
            min="1"
            max="50"
            value={config.maxCarriedItems}
            onChange={handleMaxChange}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-20 bg-transparent text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {preview && totalItems > 0 ? (
        <div className="bg-gray-50 dark:bg-gray-750 rounded p-4 border border-gray-200 dark:border-gray-700 mb-4">
          <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Preview ({totalItems} items)
          </h4>
          <ul className="list-disc pl-5 space-y-1">
            {preview.agendaItems.map((item, idx) => (
              <li
                key={`ag-${idx}`}
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                {item.text}
              </li>
            ))}
            {preview.actionItems.map((item, idx) => (
              <li
                key={`ac-${idx}`}
                className="text-sm text-blue-600 dark:text-blue-400"
              >
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-sm text-gray-500 mb-4">
          No pending items found to carry forward.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleApply}
          disabled={applying || totalItems === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors"
        >
          {applying ? "Applying..." : "Carry Forward Items"}
        </button>
      </div>
    </div>
  );
};

export default CarryForwardConfig;
