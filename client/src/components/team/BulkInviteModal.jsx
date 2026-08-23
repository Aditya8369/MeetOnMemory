import React, { useState, useRef, useMemo } from "react";
import {
  X,
  Upload,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  RefreshCw,
  Copy,
  Check,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  parseCsv,
  detectColumnMapping,
  validateMappedRows,
  buildStandardCsv,
  generateSampleCsv,
  ALLOWED_ROLES,
} from "../../utils/csvParser";

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const BATCH_SIZE = 100;

const BulkInviteModal = ({ onClose, onBulkInvite, onSwitchToSingle }) => {
  // Wizard steps: 'upload' | 'mapping' | 'preview' | 'importing' | 'results'
  const [step, setStep] = useState("upload");

  // File state
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null); // { headers, rows, rawRows }
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Mapping state
  const [mapping, setMapping] = useState({ email: "", role: "", message: "" });
  const [defaultRole, setDefaultRole] = useState("member");

  // Preview filtering & search
  const [previewFilter, setPreviewFilter] = useState("all"); // 'all' | 'valid' | 'invalid'
  const [previewSearch, setPreviewSearch] = useState("");
  const [skipInvalid, setSkipInvalid] = useState(true);

  // Import Progress state
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState("");
  const [importResults, setImportResults] = useState(null);
  const [copiedErrors, setCopiedErrors] = useState(false);

  // Validation calculation
  const validation = useMemo(() => {
    if (!csvData || !csvData.rows) {
      return {
        validatedRows: [],
        total: 0,
        validCount: 0,
        invalidCount: 0,
        duplicateCount: 0,
      };
    }
    return validateMappedRows(csvData.rows, mapping, defaultRole);
  }, [csvData, mapping, defaultRole]);

  // Filtered rows for preview table
  const displayedPreviewRows = useMemo(() => {
    let rows = validation.validatedRows;

    if (previewFilter === "valid") {
      rows = rows.filter((r) => r.isValid);
    } else if (previewFilter === "invalid") {
      rows = rows.filter((r) => !r.isValid);
    }

    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q) ||
          r.errors.some((err) => err.toLowerCase().includes(q)),
      );
    }

    return rows;
  }, [validation.validatedRows, previewFilter, previewSearch]);

  // File loading and parsing handler
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a valid .csv file");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File exceeds maximum allowed size of 1 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        const parsed = parseCsv(text);
        if (parsed.rows.length === 0) {
          toast.error("CSV file contains no data rows");
          return;
        }

        const detected = detectColumnMapping(parsed.headers);
        setFile(selectedFile);
        setCsvData(parsed);
        setMapping(detected);
        setStep("mapping");
      } catch (err) {
        toast.error(err.message || "Failed to parse CSV file");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "invitation-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Perform bulk import
  const handleStartImport = async () => {
    const rowsToImport = skipInvalid
      ? validation.validatedRows.filter((r) => r.isValid)
      : validation.validatedRows;

    if (rowsToImport.length === 0) {
      toast.error("No valid invitation rows to import");
      return;
    }

    setStep("importing");
    setImportProgress(10);
    setImportStatusText("Preparing invitations...");

    const aggregatedResults = {
      totalRows: rowsToImport.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    // Batch if needed
    const batches = [];
    for (let i = 0; i < rowsToImport.length; i += BATCH_SIZE) {
      batches.push(rowsToImport.slice(i, i + BATCH_SIZE));
    }

    try {
      for (let b = 0; b < batches.length; b += 1) {
        const batch = batches[b];
        setImportStatusText(
          batches.length > 1
            ? `Processing batch ${b + 1} of ${batches.length} (${batch.length} invitations)...`
            : `Processing ${batch.length} invitations...`,
        );

        const cleanCsvString = buildStandardCsv(batch);
        const batchBlob = new Blob([cleanCsvString], {
          type: "text/csv;charset=utf-8;",
        });
        const batchFile = new File([batchBlob], "invites.csv", {
          type: "text/csv",
        });

        const formData = new FormData();
        formData.append("file", batchFile);

        const response = await onBulkInvite(formData);

        if (response) {
          aggregatedResults.successful += response.successful || 0;
          aggregatedResults.failed += response.failed || 0;
          if (response.results && Array.isArray(response.results)) {
            aggregatedResults.results.push(...response.results);
          }
        }

        const pct = Math.round(((b + 1) / batches.length) * 90);
        setImportProgress(Math.min(95, pct));
      }

      setImportProgress(100);
      setImportStatusText("Import completed!");
      setImportResults(aggregatedResults);
      setStep("results");

      if (aggregatedResults.successful > 0 && aggregatedResults.failed === 0) {
        toast.success(
          `Successfully sent ${aggregatedResults.successful} ${
            aggregatedResults.successful === 1 ? "invitation" : "invitations"
          }!`,
        );
      } else if (
        aggregatedResults.successful > 0 &&
        aggregatedResults.failed > 0
      ) {
        toast.warning(
          `Sent ${aggregatedResults.successful} invitations, but ${aggregatedResults.failed} failed.`,
        );
      } else {
        toast.error("Failed to send invitations. Please review the errors.");
      }
    } catch {
      setImportStatusText("Import interrupted");
      setImportResults(aggregatedResults);
      setStep("results");
    }
  };

  const handleCopyErrors = () => {
    if (!importResults || !importResults.results) return;
    const failedRows = importResults.results.filter((r) => !r.success);
    const text = failedRows
      .map((r) => `${r.email || "Unknown"}: ${r.error || "Failed"}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedErrors(true);
    toast.info("Copied failed invitation details to clipboard");
    setTimeout(() => setCopiedErrors(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bulk Import Invitations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a CSV file to invite multiple team members at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-5">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/50 dark:bg-slate-850/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Click to upload or drag & drop CSV
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Supports .csv files up to 1 MB (maximum 100 rows per batch)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Need a sample file?</span>{" "}
                  Download our CSV template with preconfigured headers.
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 font-semibold hover:bg-slate-50 dark:hover:bg-slate-650 transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample CSV
                </button>
              </div>

              {onSwitchToSingle && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onSwitchToSingle}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Want to invite a single user instead?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && csvData && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>{file?.name}</span>
                  <span className="text-slate-400">
                    ({csvData.rows.length} rows found)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Change File
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Map CSV Columns
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confirm how your CSV columns correspond to invitation
                    fields.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Column */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Email Address Column *
                    </label>
                    <select
                      value={mapping.email}
                      onChange={(e) =>
                        setMapping({ ...mapping, email: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- Select Column --</option>
                      {csvData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Column */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Role Column (Optional)
                    </label>
                    <select
                      value={mapping.role}
                      onChange={(e) =>
                        setMapping({ ...mapping, role: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- None (Use Default Role) --</option>
                      {csvData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message Column */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Personal Message Column (Optional)
                    </label>
                    <select
                      value={mapping.message}
                      onChange={(e) =>
                        setMapping({ ...mapping, message: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- None --</option>
                      {csvData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default Role */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Default Role (Fallback)
                    </label>
                    <select
                      value={defaultRole}
                      onChange={(e) => setDefaultRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {ALLOWED_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Validation Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-center">
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {validation.total}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Total Rows
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 text-center">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {validation.validCount}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-500 font-medium">
                    Valid Rows
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 text-center">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {validation.invalidCount}
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-500 font-medium">
                    Issues Found
                  </div>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("all")}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      previewFilter === "all"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    All ({validation.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("valid")}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      previewFilter === "valid"
                        ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-green-600"
                    }`}
                  >
                    Valid ({validation.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("invalid")}
                    className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      previewFilter === "invalid"
                        ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-red-600"
                    }`}
                  >
                    Issues ({validation.invalidCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search rows..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5 w-24">Role</th>
                      <th className="p-2.5">Message</th>
                      <th className="p-2.5 w-36">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {displayedPreviewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-6 text-center text-slate-400 dark:text-slate-500"
                        >
                          No matching rows found
                        </td>
                      </tr>
                    ) : (
                      displayedPreviewRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={
                            row.isValid
                              ? "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                              : "bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70"
                          }
                        >
                          <td className="p-2.5 text-center text-slate-400 font-mono">
                            {row.rowNumber}
                          </td>
                          <td className="p-2.5 font-medium truncate max-w-xs">
                            {row.email || (
                              <span className="italic text-slate-400">
                                [Empty]
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {row.role}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {row.message || "-"}
                          </td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"
                                title={row.errors.join("; ")}
                              >
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[100px]">
                                  {row.errors[0]}
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Skip invalid rows checkbox */}
              {validation.invalidCount > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>
                    Skip invalid / duplicate rows (only import{" "}
                    <strong>{validation.validCount}</strong> valid invitations)
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Step 4: Importing / In-Progress */}
          {step === "importing" && (
            <div className="py-8 space-y-6 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sending Invitations...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {importStatusText}
                </p>
              </div>

              {/* Progress bar */}
              <div className="max-w-md mx-auto space-y-2">
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span>{importProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Results */}
          {step === "results" && importResults && (
            <div className="space-y-5">
              {/* Summary Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  importResults.failed === 0
                    ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200"
                    : importResults.successful > 0
                      ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                      : "bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                }`}
              >
                {importResults.failed === 0 ? (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-sm">
                    {importResults.failed === 0
                      ? "All Invitations Sent Successfully"
                      : importResults.successful > 0
                        ? "Import Completed with Some Failures"
                        : "Import Failed"}
                  </h4>
                  <p className="text-xs mt-1 opacity-90">
                    {importResults.successful} of {importResults.totalRows}{" "}
                    invitations sent successfully.{" "}
                    {importResults.failed > 0 &&
                      `${importResults.failed} invitations could not be created.`}
                  </p>
                </div>
              </div>

              {/* Results Breakdown Table */}
              {importResults.results && importResults.results.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Invitation Report</span>
                    {importResults.failed > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyErrors}
                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {copiedErrors ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copy Failed Details
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5 w-24">Status</th>
                          <th className="p-2.5">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importResults.results.map((res, idx) => (
                          <tr
                            key={idx}
                            className={
                              res.success
                                ? "bg-white dark:bg-slate-900"
                                : "bg-red-50/40 dark:bg-red-950/20"
                            }
                          >
                            <td className="p-2.5 font-medium text-slate-900 dark:text-slate-200">
                              {res.email}
                            </td>
                            <td className="p-2.5">
                              {res.success ? (
                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Sent
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Failed
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400">
                              {res.success
                                ? "Invitation generated and emailed"
                                : res.error || "Failed to create invitation"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Buttons */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          {step === "upload" && (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {step === "mapping" && (
            <>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                disabled={!mapping.email}
                onClick={() => setStep("preview")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-all text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Preview & Validate
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setStep("mapping")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Mapping
              </button>
              <button
                type="button"
                disabled={
                  validation.validCount === 0 ||
                  (!skipInvalid && validation.invalidCount > 0)
                }
                onClick={handleStartImport}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-all text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Send {skipInvalid
                  ? validation.validCount
                  : validation.total}{" "}
                Invitations
              </button>
            </>
          )}

          {step === "importing" && (
            <div className="flex justify-center w-full">
              <span className="text-xs text-slate-400 italic">
                Please wait while invitations are being dispatched...
              </span>
            </div>
          )}

          {step === "results" && (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkInviteModal;
