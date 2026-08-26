import React, { useState, useEffect, useContext, useCallback } from "react";
import AppContent from "../../context/AppContent";
import useResourceBookings from "../../hooks/useResourceBookings";
import {
  Plus,
  Building2,
  Monitor,
  Utensils,
  AlertCircle,
  Loader2,
} from "lucide-react";

const ResourceManagement = () => {
  const { userData } = useContext(AppContent);
  const currentOrganization = userData?.organization;
  const { fetchPhysicalResources, createResource, loading, error } =
    useResourceBookings();
  const [resources, setResources] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "room",
    capacity: 0,
    location: "",
  });

  const loadResources = useCallback(async () => {
    if (!currentOrganization) return;
    const orgId =
      typeof currentOrganization === "string"
        ? currentOrganization
        : currentOrganization._id;
    try {
      const data = await fetchPhysicalResources(orgId);
      setResources(data || []);
    } catch (err) {
      console.error("Failed to load resources", err);
    }
  }, [currentOrganization, fetchPhysicalResources]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrganization) return;
    const orgId =
      typeof currentOrganization === "string"
        ? currentOrganization
        : currentOrganization._id;
    try {
      await createResource(orgId, {
        ...formData,
        capacity: Number(formData.capacity),
      });
      setShowForm(false);
      setFormData({ name: "", type: "room", capacity: 0, location: "" });
      loadResources();
    } catch (err) {
      console.error("Failed to create resource", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "room":
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case "equipment":
        return <Monitor className="w-5 h-5 text-purple-500" />;
      case "catering":
        return <Utensils className="w-5 h-5 text-orange-500" />;
      default:
        return <Building2 className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Physical Resources
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage rooms, equipment, and catering for your organization.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Resource"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle
            className="text-red-600 dark:text-red-500 shrink-0"
            size={20}
          />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Add New Resource
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resource Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Conference Room A"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                >
                  <option value="room">Room</option>
                  <option value="equipment">Equipment</option>
                  <option value="catering">Catering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Capacity (Optional)
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. 2nd Floor, East Wing"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Resource
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && resources.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No resources configured yet.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Click 'Add Resource' to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                <th className="pb-3 px-4 font-semibold">Resource</th>
                <th className="pb-3 px-4 font-semibold">Type</th>
                <th className="pb-3 px-4 font-semibold">Capacity</th>
                <th className="pb-3 px-4 font-semibold">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {resources.map((resource) => (
                <tr
                  key={resource._id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      {getIcon(resource.type)}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {resource.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="capitalize px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {resource.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                    {resource.capacity > 0 ? resource.capacity : "—"}
                  </td>
                  <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                    {resource.location || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;
