import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar'; // Adjust relative path based on directory depth

export default function MeetingPatterns() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated analytics fetch loop from server endpoints
    async function fetchPatterns() {
      try {
        const res = await fetch('/api/meeting-patterns');
        const data = await res.json();
        setPatterns(data || []);
      } catch (err) {
        console.error('Error reading meeting patterns:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatterns();
  }, []);

  return (
    // 1. App Shell Fix: Include standard global header navigation
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
      <Navbar />
      
      {/* 2. Layout Structure Wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Meeting Patterns Analytics</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Review organizational cadence metrics, density profiles, and recurring interaction insights.
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-sm text-gray-500 dark:text-gray-400">
            Analyzing cadence histories...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patterns.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-colors dark:bg-gray-800 dark:border-gray-700"
              >
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    {item.frequency || 'Recurring'}
                  </span>
                  <h3 className="mt-3 text-lg font-bold leading-snug">{item.title}</h3>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {item.description || 'No contextual telemetry registered.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">
                    Score: {item.efficiencyScore}%
                  </span>
                  
                  {/* 3. Deep Link Route Fix: Point directly to singular resource tracking path */}
                  <Link
                    to={`/meeting/${item.id}`}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    View Details &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
