import React, { useState, useEffect } from "react";
import { getSlaConfig, updateSlaConfig } from "../../services/actionItemSlaApi";

import { FiSave, FiInfo } from "react-icons/fi";

const SlaConfigPanel = ({ organizationId }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await getSlaConfig(organizationId);
        setConfig(data);
      } catch {
        setError("Failed to load SLA configuration.");
      } finally {
        setLoading(false);
      }
    };

    if (organizationId) {
      fetchConfig();
    }
  }, [organizationId]);

  const handleChange = (priority, field, value) => {
    setConfig((prev) => ({
      ...prev,
      targets: {
        ...prev.targets,
        [priority]: {
          ...prev.targets[priority],
          [field]: parseInt(value, 10) || 0,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSlaConfig(organizationId, { targets: config.targets });
      // Show some success toast here ideally
    } catch {
      setError("Failed to save SLA configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading SLA Config...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!config) return null;

  const priorities = ["low", "medium", "high", "urgent"];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Service Level Agreements (SLA)
        </h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <FiSave className="mr-2" />
          {saving ? "Saving..." : "Save Config"}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 flex items-start mb-6 text-sm text-blue-800">
        <FiInfo className="mr-2 mt-0.5 flex-shrink-0" />
        <p>
          Configure target hours for Action Items based on their priority.
          "Response" is time until status changes from open. "Resolution" is
          time until resolved/completed.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Response (Hours)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Resolution (Hours)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {priorities.map((priority) => (
              <tr key={priority}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                  {priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={config.targets[priority]?.targetResponseHours || 0}
                    onChange={(e) =>
                      handleChange(
                        priority,
                        "targetResponseHours",
                        e.target.value,
                      )
                    }
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={config.targets[priority]?.targetResolutionHours || 0}
                    onChange={(e) =>
                      handleChange(
                        priority,
                        "targetResolutionHours",
                        e.target.value,
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SlaConfigPanel;
