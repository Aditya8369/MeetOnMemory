import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/actionItemTemplateApi";
import Navbar from "../components/Navbar";
import { Plus, Trash2, Edit2, Save, X, PlusCircle } from "lucide-react";

const ActionItemTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    applicableMeetingTypes: "",
    items: [],
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreateNew = () => {
    setFormData({
      name: "",
      applicableMeetingTypes: "",
      items: [
        {
          text: "",
          description: "",
          daysToComplete: 7,
          defaultOwnerRole: "Unassigned",
        },
      ],
    });
    setEditingTemplateId(null);
    setIsEditing(true);
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      applicableMeetingTypes: template.applicableMeetingTypes.join(", "),
      items: template.items.map((item) => ({ ...item })),
    });
    setEditingTemplateId(template._id);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTemplateId(null);
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          text: "",
          description: "",
          daysToComplete: 7,
          defaultOwnerRole: "Unassigned",
        },
      ],
    });
  };

  const removeItemRow = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      return toast.error("Template name is required");
    }

    if (
      formData.items.length === 0 ||
      formData.items.some((item) => !item.text.trim())
    ) {
      return toast.error("All action items must have text");
    }

    const payload = {
      name: formData.name,
      applicableMeetingTypes: formData.applicableMeetingTypes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      items: formData.items,
    };

    try {
      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, payload);
        toast.success("Template updated successfully");
      } else {
        await createTemplate(payload);
        toast.success("Template created successfully");
      }
      setIsEditing(false);
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to save template");
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?"))
      return;

    try {
      await deleteTemplate(id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 mt-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Action Item Templates
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage reusable action item lists for meetings
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {editingTemplateId ? "Edit Template" : "New Template"}
            </h2>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                  placeholder="e.g., Weekly Sync Standard Tasks"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Applicable Meeting Types (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.applicableMeetingTypes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applicableMeetingTypes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                  placeholder="e.g., internal, sync, marketing"
                />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-medium text-slate-800 dark:text-slate-200">
                  Action Items
                </h3>
                <button
                  onClick={addItemRow}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-start p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) =>
                          handleItemChange(index, "text", e.target.value)
                        }
                        placeholder="Task description..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 dark:text-white"
                      />
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">
                            Default Owner Role
                          </label>
                          <input
                            type="text"
                            value={item.defaultOwnerRole}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "defaultOwnerRole",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., Project Manager"
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-slate-500 mb-1">
                            Days to Complete
                          </label>
                          <input
                            type="number"
                            value={item.daysToComplete}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "daysToComplete",
                                parseInt(e.target.value),
                              )
                            }
                            min="1"
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItemRow(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                    No items added yet. Click "Add Item" to begin.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  No templates found.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template._id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                      {template.name}
                    </h3>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 mb-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {template.items.length}
                      </span>{" "}
                      action items
                    </p>
                    {template.applicableMeetingTypes?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.applicableMeetingTypes.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                    Updated {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionItemTemplates;
