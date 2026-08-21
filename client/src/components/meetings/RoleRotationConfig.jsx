import React, { useState, useEffect } from "react";
import axios from "../../services/apiClient.js";

const RoleRotationConfig = ({ seriesId, users = [] }) => {
  const [enableRotation, setEnableRotation] = useState(false);
  const [rotationPool, setRotationPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(
          `/api/meeting-series/${seriesId}/roles/config`,
        );
        setEnableRotation(data.enableRoleRotation || false);
        setRotationPool(data.roleRotationPool.map((u) => u._id || u));
      } catch (error) {
        console.error("Failed to fetch rotation config:", error);
      } finally {
        setLoading(false);
      }
    };
    if (seriesId) fetchConfig();
  }, [seriesId]);

  const handleToggleUser = (userId) => {
    setRotationPool((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/meeting-series/${seriesId}/roles/config`, {
        enableRoleRotation: enableRotation,
        roleRotationPool: rotationPool,
      });
      alert("Role rotation configuration saved!");
    } catch (error) {
      console.error("Failed to save rotation config:", error);
      alert("Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading config...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">
        Role Rotation Settings
      </h3>

      <div className="flex items-center mb-6">
        <input
          type="checkbox"
          id="enableRotation"
          checked={enableRotation}
          onChange={(e) => setEnableRotation(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="enableRotation"
          className="ml-2 block text-sm text-gray-900"
        >
          Enable automatic role rotation (Facilitator, Scribe, Timekeeper)
        </label>
      </div>

      {enableRotation && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">
            Select members to include in the rotation pool:
          </p>
          <div className="grid grid-cols-2 gap-4">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center p-3 border rounded"
              >
                <input
                  type="checkbox"
                  id={`user-${user._id}`}
                  checked={rotationPool.includes(user._id)}
                  onChange={() => handleToggleUser(user._id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`user-${user._id}`}
                  className="ml-3 text-sm text-gray-700"
                >
                  {user.name} ({user.email})
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
};

export default RoleRotationConfig;
