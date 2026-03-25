"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { EmailStats } from "@/components/subscriptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnvelopeIcon, ClockIcon } from "@heroicons/react/24/outline";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

const ROLLUP_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const ROLLUP_TIMES = ["8:00 AM", "12:00 PM", "6:00 PM", "9:00 PM"];

type RollupViewFilter = "all" | "rollup" | "inbox";

interface RollupSenderRowProps {
  item: EmailStats;
  inRollup: boolean;
  onToggle: () => void;
}

const RollupSenderRow: React.FC<RollupSenderRowProps> = ({
  item,
  inRollup,
  onToggle,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm hover:shadow-md hover:bg-muted/60 transition-colors transition-shadow">
      <div className="flex items-center gap-3 min-w-0">
        <img
          className="flex h-9 w-9 items-center justify-center rounded-md bg-background border border-border/70 text-sm font-semibold"
          src={`https://logos.hunter.io/${item.domain}`}
          alt={item.domain}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {item.domain}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <EnvelopeIcon className="h-4 w-4" />
              {item.total_emails} total
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {item.monthly_avg} monthly
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          inRollup
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:text-foreground"
        }`}
      >
        {inRollup ? "In weekly rollup" : "Keep in inbox"}
      </button>
    </div>
  );
};

function RollupPage() {
  const [loading, setLoading] = useState(true);
  const [emailData, setEmailData] = useState<EmailStats[]>([]);
  const [rollupEnabled, setRollupEnabled] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState<string>("Friday");
  const [sendTime, setSendTime] = useState<string>("6:00 PM");
  const [viewFilter, setViewFilter] = useState<RollupViewFilter>("all");
  const [rollupDomains, setRollupDomains] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        window.location.href = "/auth";
        return;
      }

      await fetchEmailStats();
    };

    checkAuthAndFetch();
  }, []);

  const fetchEmailStats = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      let url = "/api/email/stats";
      if (userId) {
        url += `?userId=${userId}`;
      }

      const statsResponse = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        const data: EmailStats[] = statsData.stats || statsData;
        setEmailData(data);

        // Pre-select a few lower-volume senders into the rollup as a sensible default
        const sortedByVolume = [...data].sort(
          (a, b) => a.total_emails - b.total_emails,
        );
        const initialSelection = new Set(
          sortedByVolume.slice(0, 5).map((item) => item.domain),
        );
        setRollupDomains(initialSelection);
      }
    } catch (error) {
      // swallow for now, UI-only feature
    } finally {
      setLoading(false);
    }
  };

  const toggleDomain = (domain: string) => {
    setRollupDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const filteredSenders = useMemo(() => {
    if (viewFilter === "rollup") {
      return emailData.filter((item) => rollupDomains.has(item.domain));
    }
    if (viewFilter === "inbox") {
      return emailData.filter((item) => !rollupDomains.has(item.domain));
    }
    return emailData;
  }, [emailData, rollupDomains, viewFilter]);

  const totalRollupSenders = rollupDomains.size;
  const estimatedWeeklyVolume = useMemo(() => {
    // Approximate weekly based on monthly average
    const monthlyTotal = emailData.reduce(
      (sum, item) =>
        rollupDomains.has(item.domain) ? sum + item.monthly_avg : sum,
      0,
    );
    return Math.round(monthlyTotal / 4); // rough 4 weeks per month
  }, [emailData, rollupDomains]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-4 font-sans">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Weekly Rollup
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bundle low-priority senders into a single weekly email instead of
            dozens of separate messages.
          </p>
        </div>
        <div
          className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2 text-xs sm:text-sm shadow-sm sm:min-w-[220px] transition-colors ${
            rollupEnabled
              ? "border-primary/60 bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                rollupEnabled
                  ? "bg-primary ring-2 ring-primary/40"
                  : "bg-muted-foreground/40"
              }`}
            />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {rollupEnabled ? "Rollup enabled" : "Rollup paused"}
            </span>
          </div>
          <span className="text-muted-foreground">
            Sends every <span className="font-medium">{dayOfWeek}</span> at{" "}
            <span className="font-medium">{sendTime}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column: settings + summary */}
        <div className="space-y-4 lg:col-span-1">
          {/* Schedule settings */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Rollup schedule
                </h2>
                <p className="text-xs text-muted-foreground">
                  Choose when your weekly summary should be delivered.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRollupEnabled((prev) => !prev)}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  rollupEnabled
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {rollupEnabled ? "Enabled" : "Paused"}
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Day of the week
                </label>
                <Select
                  value={dayOfWeek}
                  onValueChange={(v) => setDayOfWeek(v)}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {ROLLUP_DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Delivery time
                </label>
                <Select value={sendTime} onValueChange={(v) => setSendTime(v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    {ROLLUP_TIMES.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="pt-1 text-xs text-muted-foreground">
                Times are shown in your local timezone.
              </p>
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Rollup overview
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Senders in rollup</span>
                <span className="font-semibold text-foreground">
                  {totalRollupSenders}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Estimated emails per week
                </span>
                <span className="font-semibold text-foreground">
                  {estimatedWeeklyVolume}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              You can adjust this anytime by adding or removing senders from the
              list.
            </p>
          </div>
        </div>

        {/* Right column: sender selection */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Rollup sources
                </h2>
                <p className="text-xs text-muted-foreground">
                  Decide which senders should be bundled into your weekly
                  rollup.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={viewFilter}
                  onValueChange={(v: RollupViewFilter) => setViewFilter(v)}
                >
                  <SelectTrigger className="w-[160px] text-xs sm:text-sm">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="font-sans">
                    <SelectItem value="all">All senders</SelectItem>
                    <SelectItem value="rollup">In rollup</SelectItem>
                    <SelectItem value="inbox">In inbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredSenders.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                No senders found. Try connecting your inbox from the dashboard
                first.
              </div>
            ) : (
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {filteredSenders.map((item) => (
                  <RollupSenderRow
                    key={item.domain}
                    item={item}
                    inRollup={rollupDomains.has(item.domain)}
                    onToggle={() => toggleDomain(item.domain)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RollupPage;
