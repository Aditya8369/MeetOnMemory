import React, { useState, useEffect } from "react";

export default function GraphSnapshots({ userRole = "viewer" }) {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState("");
  const [selectedRight, setSelectedRight] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState(null);
  const [diffSummary, setDiffSummary] = useState(null);

  const isAdmin = userRole === "admin";

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const res = await fetch("/api/graph/snapshots");
      const data = await res.json();
      setSnapshots(data || []);
    } catch (err) {
      console.error("Failed fetching snapshots pipeline data:", err);
    }
  };

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setIsCapturing(true);
    try {
      const res = await fetch("/api/graph/snapshots/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, notes }),
      });
      if (res.ok) {
        setLabel("");
        setNotes("");
        await fetchSnapshots();
      }
    } catch (err) {
      console.error("Snapshot capture crash event:", err);
    } finally {
      setIsCapturing(false);
    }
  };

  const triggerRestoreWorkflow = (snapshot) => {
    setSnapshotToRestore(snapshot);
    setShowConfirmModal(true);
  };

  const executeRestore = async () => {
    if (!snapshotToRestore) return;
    try {
      const res = await fetch(
        `/api/graph/snapshots/${snapshotToRestore.id}/restore`,
        {
          method: "POST",
        },
      );
      if (res.ok) {
        alert(
          `Successfully reverted knowledge graph tracking back to: ${snapshotToRestore.label}`,
        );
        setShowConfirmModal(false);
        setSnapshotToRestore(null);
      }
    } catch (err) {
      console.error("Graph restore processing failure:", err);
    }
  };

  const computeComparisonDiff = () => {
    if (!selectedLeft || !selectedRight) return;
    const left = snapshots.find((s) => s.id === selectedLeft);
    const right = snapshots.find((s) => s.id === selectedRight);

    if (left && right) {
      setDiffSummary({
        addedNodes: Math.abs(right.nodeCount - left.nodeCount),
        modifiedEdges: Math.abs(right.edgeCount - left.edgeCount),
        timestampDelta: new Date(right.createdAt) - new Date(left.createdAt),
      });
    }
  };

  return (
    <div className="graph-snapshots-container p-6 bg-slate-900 text-white">
      <h1 className="text-2xl font-bold mb-6">
        🌐 Knowledge Graph Time-Travel snapshots manager
      </h1>

      {/* Admin Operations Section: Capture Tool */}
      {isAdmin ? (
        <form
          onSubmit={handleCreateSnapshot}
          className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-700"
        >
          <h2 className="text-lg font-semibold mb-3">
            📸 Capture Manual Snapshot
          </h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Snapshot Label (e.g., Pre-Migration Baseline)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="p-2 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500"
              required
            />
            <textarea
              placeholder="Optional structural summary tracking changes notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="p-2 bg-slate-700 border border-slate-600 rounded text-sm h-16 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isCapturing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium p-2 rounded text-sm transition-colors disabled:opacity-50"
            >
              {isCapturing
                ? "Capturing Topology Matrix..."
                : "Capture Snapshot Now"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-3 bg-amber-950/40 border border-amber-800 text-amber-300 rounded text-sm">
          ℹ️ Read-Only Mode: Creating or restoring graph states requires
          administrative access credentials.
        </div>
      )}

      {/* Compare UX Polish Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium mb-3 text-slate-400">
            Side-by-Side Architectural Summary
          </h3>
          <div className="flex gap-4 mb-4">
            <select
              value={selectedLeft}
              onChange={(e) => setSelectedLeft(e.target.value)}
              className="p-2 bg-slate-700 border border-slate-600 rounded text-xs flex-1"
            >
              <option value="">Choose Base Target...</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={selectedRight}
              onChange={(e) => setSelectedRight(e.target.value)}
              className="p-2 bg-slate-700 border border-slate-600 rounded text-xs flex-1"
            >
              <option value="">Choose Comparison Target...</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={computeComparisonDiff}
            disabled={!selectedLeft || !selectedRight}
            className="w-full bg-slate-700 hover:bg-slate-600 text-xs py-2 rounded transition-colors disabled:opacity-40"
          >
            Compute Diff Matrix
          </button>
        </div>

        {diffSummary && (
          <div className="p-4 bg-slate-800 rounded-lg border border-blue-900 text-sm">
            <h4 className="font-semibold text-blue-400 mb-2">
              ⚖️ Meaningful Topology Diffs Summary
            </h4>
            <ul className="space-y-1 text-slate-300 text-xs">
              <li>
                • Node Variation:{" "}
                <span className="text-white font-bold">
                  {diffSummary.addedNodes}
                </span>{" "}
                entities
              </li>
              <li>
                • Link Edge Structural Drift:{" "}
                <span className="text-white font-bold">
                  {diffSummary.modifiedEdges}
                </span>{" "}
                linkages
              </li>
              <li>
                • Historical Age Separation:{" "}
                <span className="text-white font-bold">
                  {(diffSummary.timestampDelta / 3600000).toFixed(2)}
                </span>{" "}
                hours
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Snapshots Inventory Matrix Tree */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-700 text-slate-300 border-b border-slate-600">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Label</th>
              <th className="p-3">Metrics</th>
              {isAdmin && <th className="p-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr
                key={snapshot.id}
                className="border-b border-slate-700/60 hover:bg-slate-700/30"
              >
                <td className="p-3 text-slate-400">
                  {new Date(snapshot.createdAt).toLocaleString()}
                </td>
                <td className="p-3 font-medium text-slate-200">
                  {snapshot.label}
                  {snapshot.notes && (
                    <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                      {snapshot.notes}
                    </p>
                  )}
                </td>
                <td className="p-3 text-slate-300 font-mono">
                  Nodes: {snapshot.nodeCount} | Edges: {snapshot.edgeCount}
                </td>
                {isAdmin && (
                  <td className="p-3 text-right">
                    <button
                      onClick={() => triggerRestoreWorkflow(snapshot)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-[11px] font-bold text-white px-3 py-1 rounded transition-colors"
                    >
                      Restore State
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Destructive Action Confirmation Disclosures Modal Panel */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 border border-red-900 p-6 rounded-xl max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-red-500 mb-2">
              🚨 Critical Impact Impact Warning
            </h3>
            <p className="text-slate-300 text-xs mb-4 leading-relaxed">
              You are about to roll back the live database state configuration
              to the snapshot:
              <span className="text-white font-bold block mt-1">
                "{snapshotToRestore?.label}"
              </span>
              This action terminates active workspace configurations, rewires
              relational linkages, and overrides any unpersisted entries since
              this marker was logged.
            </p>
            <div className="flex justify-end gap-3 text-xs font-semibold">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSnapshotToRestore(null);
                }}
                className="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded transition-colors"
              >
                Abort Reversion
              </button>
              <button
                onClick={executeRestore}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors shadow-lg shadow-red-900/30"
              >
                Confirm System Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
