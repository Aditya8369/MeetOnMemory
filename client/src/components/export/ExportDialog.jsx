import React, { useState, useEffect } from "react";
import api from "../../services/api";

/**
 * @desc Modal dialog for selecting an export template, configuring sections,
 * and triggering the download of a meeting minutes document.
 */
const ExportDialog = ({ meetingId, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [format, setFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [sectionOverrides, setSectionOverrides] = useState({});

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data } = await api.get("/export/templates");
        const fetchedTemplates = data.data || [];
        setTemplates(fetchedTemplates);
        if (fetchedTemplates.length > 0) {
          setSelectedTemplateId(fetchedTemplates[0]._id);
          setSectionOverrides(fetchedTemplates[0].sections || {});
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  // Update section overrides when the selected template changes
  useEffect(() => {
    const selected = templates.find((t) => t._id === selectedTemplateId);
    if (selected && selected.sections) {
      setSectionOverrides(selected.sections);
    }
  }, [selectedTemplateId, templates]);

  const handleToggleSection = (key) => {
    setSectionOverrides((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExport = async () => {
    if (!selectedTemplateId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.post(
        `/export/meeting/${meetingId}`,
        {
          templateId: selectedTemplateId,
          format,
          sectionOverrides, // Send the toggled sections to the backend
        },
        { responseType: "blob" }, // Important for file downloads
      );

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `meeting-minutes-${meetingId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError("Failed to generate export. Please try again.");
      console.error("Export error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Export Meeting Minutes
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template._id}
                  onClick={() => setSelectedTemplateId(template._id)}
                  className={`p-4 border rounded-xl text-left transition-all ${
                    selectedTemplateId === template._id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {template.description || "Custom template"}
                  </p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                    {template.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Format
            </label>
            <div className="flex gap-3">
              {["pdf", "docx", "html"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`flex-1 py-3 rounded-lg font-medium uppercase text-sm transition-all ${
                    format === fmt
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Section Toggles */}
          {selectedTemplate && selectedTemplate.sections && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Include Sections
              </label>
              <div className="space-y-2">
                {Object.entries(selectedTemplate.sections).map(
                  ([key, defaultValue]) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={
                          sectionOverrides[key] !== undefined
                            ? sectionOverrides[key]
                            : defaultValue
                        }
                        onChange={() => handleToggleSection(key)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {key
                          .replace("show", "")
                          .replace(/([A-Z])/g, " $1")
                          .trim()}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isGenerating || !selectedTemplateId}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-2 shadow-md"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
