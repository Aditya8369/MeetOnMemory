import React, { useState, useEffect } from "react";
import { X, Filter, Star, Bookmark, Tag, Briefcase, Users } from "lucide-react";

const AVAILABLE_ICONS = [
  { name: "Filter", component: Filter },
  { name: "Star", component: Star },
  { name: "Bookmark", component: Bookmark },
  { name: "Tag", component: Tag },
  { name: "Briefcase", component: Briefcase },
  { name: "Users", component: Users },
];

const AVAILABLE_COLORS = [
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#10B981", // green-500
  "#F59E0B", // yellow-500
  "#8B5CF6", // purple-500
  "#EC4899", // pink-500
];

export default function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  initialFilters,
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "Filter",
    isPinned: true,
    isShared: false,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "Filter",
        isPinned: true,
        isShared: false,
      });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...formData,
      filters: initialFilters,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Save Smart View
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Q3 Policy Meetings"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              placeholder="What is this view for?"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Color & Icon
            </label>
            <div className="flex gap-4">
              <div className="flex gap-2">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-6 h-6 rounded-full cursor-pointer flex items-center justify-center ${formData.color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, color: c }))
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {AVAILABLE_ICONS.map((iconDef) => {
                const CurrentIcon = iconDef.component;
                return (
                  <button
                    key={iconDef.name}
                    type="button"
                    className={`p-2 rounded-md cursor-pointer ${formData.icon === iconDef.name ? "bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, icon: iconDef.name }))
                    }
                  >
                    <CurrentIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isPinned"
                checked={formData.isPinned}
                onChange={handleChange}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Pin to filter bar
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isShared"
                checked={formData.isShared}
                onChange={handleChange}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Share with organization
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Save View
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
