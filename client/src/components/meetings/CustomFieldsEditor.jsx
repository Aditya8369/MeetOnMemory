import React, { useState, useEffect } from "react";
import { customFieldApi } from "../../api/customFieldApi";

const CustomFieldsEditor = ({ orgId, meetingId, onChange }) => {
  const [definitions, setDefinitions] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!orgId) return;

    const fetchFields = async () => {
      try {
        setLoading(true);
        const defRes = await customFieldApi.getDefinitions(orgId);
        const defs = defRes.data || [];
        setDefinitions(defs);

        const initialValues = {};
        if (meetingId) {
          const valRes = await customFieldApi.getMeetingFields(meetingId);
          const fields = valRes.data || [];
          fields.forEach((f) => {
            initialValues[f.fieldDefinition._id] = f.value;
          });
        }
        setValues(initialValues);
        // Initially call onChange with current state if needed
      } catch (err) {
        console.error("Failed to load custom fields", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, [orgId, meetingId]);

  const validateField = (def, val) => {
    if (def.required && (val === undefined || val === null || val === "")) {
      return "This field is required";
    }
    if (val === undefined || val === null || val === "") {
      return null; // Empty optional fields are fine
    }
    if (def.type === "number" && isNaN(Number(val))) {
      return "Must be a number";
    }
    return null;
  };

  const handleChange = (defId, value) => {
    const newValues = { ...values, [defId]: value };
    setValues(newValues);

    const def = definitions.find((d) => d._id === defId);
    const error = validateField(def, value);

    const newErrors = { ...errors };
    if (error) {
      newErrors[defId] = error;
    } else {
      delete newErrors[defId];
    }
    setErrors(newErrors);

    // Format for API
    const formattedFields = Object.keys(newValues)
      .filter((id) => newValues[id] !== undefined && newValues[id] !== "")
      .map((id) => ({
        definitionId: id,
        value: newValues[id],
      }));

    if (onChange) {
      onChange(formattedFields, Object.keys(newErrors).length === 0);
    }
  };

  if (!orgId) return null;
  if (loading) return <div>Loading custom fields...</div>;
  if (definitions.length === 0) return null; // No fields to show

  return (
    <div className="custom-fields-editor mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Custom Metadata
      </h3>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        {definitions.map((def) => {
          const val = values[def._id] !== undefined ? values[def._id] : "";
          const error = errors[def._id];

          return (
            <div key={def._id}>
              <label className="block text-sm font-medium text-gray-700">
                {def.name}{" "}
                {def.required && <span className="text-red-500">*</span>}
              </label>
              <div className="mt-1">
                {def.type === "text" && (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleChange(def._id, e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                )}
                {def.type === "number" && (
                  <input
                    type="number"
                    value={val}
                    onChange={(e) =>
                      handleChange(
                        def._id,
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                )}
                {def.type === "date" && (
                  <input
                    type="date"
                    value={val}
                    onChange={(e) => handleChange(def._id, e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                )}
                {def.type === "dropdown" && (
                  <select
                    value={val}
                    onChange={(e) => handleChange(def._id, e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    {def.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
                {def.type === "checkbox" && (
                  <input
                    type="checkbox"
                    checked={val === true || val === "true"}
                    onChange={(e) => handleChange(def._id, e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                )}
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomFieldsEditor;
