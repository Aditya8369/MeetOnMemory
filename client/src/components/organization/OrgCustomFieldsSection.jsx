import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertCircle,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { customFieldApi } from "../../api/customFieldApi";
import ConfirmModal from "../ConfirmModal.jsx";

const CREATE_TYPES = [
  { value: "text", label: "Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Boolean" },
];

const TYPE_LABELS = {
  text: "Text",
  dropdown: "Dropdown",
  checkbox: "Boolean",
  number: "Number",
  date: "Date",
};

const emptyForm = {
  name: "",
  type: "text",
  required: false,
  optionsText: "",
};

function optionsFromText(text) {
  return text
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function optionsToText(options) {
  return Array.isArray(options) ? options.join("\n") : "";
}

function apiErrorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) {
    return message[0]?.message || fallback;
  }
  return message || error?.message || fallback;
}

export default function OrgCustomFieldsSection({ orgId }) {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadDefinitions = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setLoadError("");
      const res = await customFieldApi.getDefinitions(orgId, {
        includeInactive: true,
      });
      setDefinitions(res.data || []);
    } catch (error) {
      const message = apiErrorMessage(
        error,
        "Failed to load custom field definitions.",
      );
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
  };

  const startEdit = (definition) => {
    setEditingId(definition._id);
    setForm({
      name: definition.name || "",
      type: definition.type,
      required: Boolean(definition.required),
      optionsText: optionsToText(definition.options),
    });
    setFormError("");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Field name is required.";
    }
    if (
      form.type === "dropdown" &&
      optionsFromText(form.optionsText).length === 0
    ) {
      return "Dropdown fields require at least one option.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      required: form.required,
    };
    if (form.type === "dropdown") {
      payload.options = optionsFromText(form.optionsText);
    }
    if (!editingId) {
      payload.type = form.type;
    }

    try {
      setSaving(true);
      setFormError("");
      if (editingId) {
        await customFieldApi.updateDefinition(orgId, editingId, payload);
        toast.success("Custom field updated.");
      } else {
        await customFieldApi.createDefinition(orgId, payload);
        toast.success("Custom field created.");
      }
      resetForm();
      await loadDefinitions();
    } catch (error) {
      const message = apiErrorMessage(
        error,
        editingId
          ? "Failed to update custom field."
          : "Failed to create custom field.",
      );
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!pendingDelete) return;
    try {
      setSaving(true);
      await customFieldApi.deleteDefinition(orgId, pendingDelete._id);
      toast.success("Custom field deactivated.");
      setPendingDelete(null);
      if (editingId === pendingDelete._id) resetForm();
      await loadDefinitions();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to deactivate custom field."));
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (definition) => {
    try {
      setSaving(true);
      await customFieldApi.updateDefinition(orgId, definition._id, {
        active: true,
      });
      toast.success("Custom field reactivated.");
      await loadDefinitions();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to reactivate custom field."));
    } finally {
      setSaving(false);
    }
  };

  const showTypeField =
    !editingId || CREATE_TYPES.some((t) => t.value === form.type);

  return (
    <section
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
      aria-labelledby="org-custom-fields-heading"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
          <ListChecks className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="org-custom-fields-heading"
            className="text-lg font-bold text-slate-900 dark:text-white"
          >
            Custom Fields
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define organization-wide meeting metadata: text, dropdown, or
            boolean fields.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-6">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Loading custom fields...
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {loadError}
        </div>
      ) : (
        <>
          {definitions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              No custom fields yet. Add a text, dropdown, or boolean field to
              collect extra meeting metadata.
            </p>
          ) : (
            <ul
              className="space-y-3 mb-6"
              aria-label="Custom field definitions"
            >
              {definitions.map((definition) => (
                <li
                  key={definition._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {definition.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {TYPE_LABELS[definition.type] || definition.type}
                      {definition.required ? " · Required" : " · Optional"}
                      {definition.active === false ? " · Inactive" : ""}
                      {definition.type === "dropdown" &&
                      definition.options?.length
                        ? ` · ${definition.options.join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(definition)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    {definition.active === false ? (
                      <button
                        type="button"
                        onClick={() => handleReactivate(definition)}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(definition)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Deactivate
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingId ? "Edit custom field" : "Add custom field"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="custom-field-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Field name <span className="text-red-500">*</span>
                </label>
                <input
                  id="custom-field-name"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={saving}
                  placeholder="e.g. Client name"
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              {showTypeField && (
                <div>
                  <label
                    htmlFor="custom-field-type"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
                  >
                    Field type
                  </label>
                  <select
                    id="custom-field-type"
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                    disabled={saving || Boolean(editingId)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    {CREATE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {form.type === "dropdown" && (
              <div>
                <label
                  htmlFor="custom-field-options"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Dropdown options <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="custom-field-options"
                  rows={4}
                  value={form.optionsText}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      optionsText: e.target.value,
                    }))
                  }
                  disabled={saving}
                  placeholder={
                    "One option per line\nDesign\nDevelopment\nTesting"
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-y"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter one option per line, or separate options with commas.
                </p>
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, required: e.target.checked }))
                }
                disabled={saving}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Required on meetings
            </label>

            {formError && (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              {editingId ? "Save field" : "Add field"}
            </button>
          </form>
        </>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeactivate}
        title="Deactivate custom field"
        message={`Deactivate “${pendingDelete?.name || "this field"}”? It will no longer appear on new meetings. Existing meeting values are kept.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        isLoading={saving}
        variant="danger"
      />
    </section>
  );
}
