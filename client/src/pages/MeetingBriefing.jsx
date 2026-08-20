import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function MeetingBriefing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBriefingData() {
      try {
        const response = await fetch(`/api/meetings/${id}/briefing`);
        if (response.ok) {
          const data = await response.json();
          setBriefing(data);
        }
      } catch (err) {
        console.error("Failed reading briefing summary payload:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBriefingData();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/meeting/${id}`)}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-6 inline-flex items-center gap-1 hover:underline"
        >
          &larr; Return to Meeting Workspace
        </button>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-500">
            Compiling brief highlights...
          </div>
        ) : briefing ? (
          <article className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h1 className="text-2xl font-black mb-2">
              {briefing.title || "Pre-Meeting Briefing"}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
              Generated on {new Date(briefing.createdAt).toLocaleDateString()}
            </p>
            <div className="text-sm leading-relaxed space-y-4 text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {briefing.content}
            </div>
          </article>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 border rounded-2xl p-6">
            <p className="text-sm text-gray-500">
              No briefing records synthesized for this session identifier.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
