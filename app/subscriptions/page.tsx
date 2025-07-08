"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";

interface EmailStats {
  domain: string;
  sender_count: number;
  total_emails: number;
  monthly_avg: number;
  recent_emails?: number;
}

function SubscriptionsPage() {
  const [emailData, setEmailData] = useState<EmailStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [filterBy, setFilterBy] = useState("All");

  useEffect(() => {
    fetchEmailStats();
  }, []);

  const fetchEmailStats = async () => {
    try {
      // Import Supabase client and get user ID
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

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
        setEmailData(statsData.stats || statsData);
      }
    } catch (error) {
      console.error("Error fetching email stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = emailData.filter((item) =>
    item.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "Recent":
        return (
          (b.recent_emails || b.total_emails) -
          (a.recent_emails || a.total_emails)
        );
      case "Email count":
        return b.total_emails - a.total_emails;
      case "Monthly count":
        return b.monthly_avg - a.monthly_avg;
      default:
        return 0;
    }
  });

  const tabs = ["Inbox", "Marked Safe", "Unsubscribed"];

  if (loading) {
    return (
      <div className="container bg-white mx-auto px-7 py-3 font-sans">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-7 py-3 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Subscriptions
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === tab
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Senders"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1 border border-border rounded-md bg-white text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Filter and Sort */}
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="appearance-none bg-white border border-border rounded-md px-4 py-1 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="All">Filter</option>
              <option value="High Volume">High Volume</option>
              <option value="Low Volume">Low Volume</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-border rounded-md px-4 py-1 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="Recent">Sort - Recent</option>
              <option value="Email count">Email count</option>
              <option value="Monthly count">Monthly count</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort Direction */}
          <button className="p-1 border border-border rounded-sm hover:bg-hovered transition-colors">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-3">
        {sortedData.length > 0 ? (
          sortedData.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3  bg-white border border-border rounded-xl hover:bg-hovered/50 transition-colors"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
              />

              {/* Logo */}

              <Image
                src={`https://logo.clearbit.com/${item.domain}`}
                alt={item.domain}
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-base">
                      {item.domain.charAt(0).toUpperCase() +
                        item.domain.slice(1)}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      email@{item.domain}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <EnvelopeIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {item.total_emails}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {item.monthly_avg} monthly
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">20h ago</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags and Actions */}
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                      Recent Emails
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors">
                        ✓ Keep
                      </button>
                      <button className="px-3 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded hover:bg-destructive/20 transition-colors">
                        Unsubscribe
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <EnvelopeIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Subscriptions Found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms."
                : "Connect your email account to see subscriptions."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriptionsPage;
