import { useRef, useState } from "react";
import { Users, UserPlus, X, Upload, FileSpreadsheet } from "lucide-react";
import { parseParticipantCsv } from "../../utils/parseParticipantCsv.js";

const ParticipantsSection = ({
  participants,
  newParticipant,
  setNewParticipant,
  addParticipant,
  removeParticipant,
  importParticipants,
}) => {
  const fileInputRef = useRef(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError, setCsvError] = useState("");

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setCsvError("");
    setCsvPreview(null);
    if (!file) return;

    if (!/\.csv$/i.test(file.name) && file.type && !file.type.includes("csv")) {
      setCsvError("Please upload a .csv file.");
      return;
    }

    try {
      const text = await file.text();
      const existingEmails = participants.map((p) => p.email);
      const result = parseParticipantCsv(text, existingEmails);
      if (result.valid.length === 0 && result.invalid.length === 0) {
        setCsvError("CSV contained no participant rows.");
        return;
      }
      setCsvPreview(result);
    } catch (err) {
      setCsvError(err.message || "Failed to parse CSV.");
    }
  };

  const confirmImport = () => {
    if (!csvPreview?.valid?.length || !importParticipants) return;
    importParticipants(csvPreview.valid);
    setCsvPreview(null);
    setCsvError("");
  };

  return (
    <div className="mb-6">
      <label className="mb-3 flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
        <Users size={18} /> Invite Participants
      </label>
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <input
          type="text"
          value={newParticipant.name}
          onChange={(e) =>
            setNewParticipant({
              ...newParticipant,
              name: e.target.value,
            })
          }
          placeholder="Full Name"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none placeholder-gray-400 focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <input
          type="email"
          value={newParticipant.email}
          onChange={(e) =>
            setNewParticipant({
              ...newParticipant,
              email: e.target.value,
            })
          }
          placeholder="Email Address"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none placeholder-gray-400 focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addParticipant}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          <UserPlus size={16} /> Add Participant
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Upload size={16} /> Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleCsvFile}
          aria-label="Import participants from CSV"
        />
      </div>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        CSV headers: <code>email</code>, <code>name</code>, optional{" "}
        <code>role</code>. Duplicates are skipped.
      </p>

      {csvError && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {csvError}
        </div>
      )}

      {csvPreview && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-300">
            <FileSpreadsheet size={16} /> CSV preview
          </div>
          <p className="mb-2 text-xs text-blue-800 dark:text-blue-400">
            {csvPreview.valid.length} valid
            {csvPreview.skippedDuplicates > 0
              ? ` · ${csvPreview.skippedDuplicates} duplicate(s) skipped`
              : ""}
            {csvPreview.invalid.length > 0
              ? ` · ${csvPreview.invalid.length} invalid`
              : ""}
          </p>

          {csvPreview.valid.length > 0 && (
            <ul className="mb-3 max-h-32 space-y-1 overflow-y-auto text-xs text-gray-700 dark:text-gray-300">
              {csvPreview.valid.map((row) => (
                <li key={row.email}>
                  <strong>{row.name}</strong> — {row.email}
                  {row.role ? ` (${row.role})` : ""}
                </li>
              ))}
            </ul>
          )}

          {csvPreview.invalid.length > 0 && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <p className="mb-1 font-semibold">Invalid rows</p>
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                {csvPreview.invalid.map((row) => (
                  <li key={`${row.row}-${row.email}`}>
                    Row {row.row}
                    {row.email ? ` (${row.email})` : ""}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmImport}
              disabled={csvPreview.valid.length === 0}
              className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add {csvPreview.valid.length} to list
            </button>
            <button
              type="button"
              onClick={() => setCsvPreview(null)}
              className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {participants.length > 0 && (
        <div className="mt-4 space-y-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <span className="text-sm">
                <strong>{p.name}</strong> - {p.email}
                {p.role ? (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    ({p.role})
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => removeParticipant(p.id)}
                className="cursor-pointer text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsSection;
