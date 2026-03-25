"use client";
import React, { useCallback, useState } from "react";
import Sidebar from "@/components/Sidebar";

const Page = () => {
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStats(null);
    setStatsError(null);
    try {
      // Try GET with session (userId from session)
      const res = await fetch("/api/email/stats", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats?.[0] || data.stats || null);
      } else {
        setStatsError("Failed to fetch stats");
      }
    } catch (e) {
      setStatsError("Failed to fetch stats");
    }
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar onSyncComplete={fetchStats} />
      <main style={{ flex: 1, padding: 32 }}>
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <button
          className="mb-4 px-4 py-2 bg-primary text-white rounded"
          onClick={fetchStats}
        >
          Refresh Stats
        </button>
        {stats && (
          <div className="bg-muted rounded p-4">
            <div className="font-semibold mb-2">Stats</div>
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
        {statsError && <div className="text-red-600 mt-2">{statsError}</div>}
      </main>
    </div>
  );
};

export default Page;
