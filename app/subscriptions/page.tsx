"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  TabNavigation,
  SearchAndControls,
  UnsubscribeDialog,
  SubscriptionItem,
  UnsubscribedItem,
  SafeItem,
  EmptyState,
  EmailStats,
  UnsubscribedSender,
  SafeSender,
} from "@/components/subscriptions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function SubscriptionsPage() {
  const [emailData, setEmailData] = useState<EmailStats[]>([]);
  const [unsubscribedSenders, setUnsubscribedSenders] = useState<
    UnsubscribedSender[]
  >([]);
  const [safeSenders, setSafeSenders] = useState<SafeSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [filterBy, setFilterBy] = useState("All");
  const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
  const [unsubscribeTarget, setUnsubscribeTarget] = useState<EmailStats | null>(
    null
  );

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        // Redirect to auth page if no session
        window.location.href = "/auth";
        return;
      }

      fetchEmailStats();
      fetchUnsubscribedSenders();
      fetchSafeSenders();
    };

    checkAuthAndFetchData();
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
        setEmailData(statsData.stats || statsData);
      }
    } catch (error) {
      console.error("Error fetching email stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnsubscribedSenders = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      let url = "/api/unsubscribed-senders";
      if (userId) {
        url += `?userId=${userId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUnsubscribedSenders(data.senders || []);
      }
    } catch (error) {
      console.error("Error fetching unsubscribed senders:", error);
    }
  };

  const fetchSafeSenders = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        console.error("No valid session found");
        return;
      }

      const response = await fetch("/api/safe-senders", {
        method: "GET",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSafeSenders(data.senders || []);
      } else {
        console.error(
          "Failed to fetch safe senders:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error fetching safe senders:", error);
    }
  };

  const filteredData = emailData.filter((item) =>
    item.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUnsubscribed = unsubscribedSenders.filter((item) =>
    item.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSafe = safeSenders.filter((item) =>
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

  const sortedUnsubscribed = [...filteredUnsubscribed].sort((a, b) => {
    switch (sortBy) {
      case "Recent":
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      default:
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }
  });

  const sortedSafe = [...filteredSafe].sort((a, b) => {
    // Sort by most recently marked safe
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const tabs = ["Inbox", "Marked Safe", "Unsubscribed"];

  // Handler for Unsubscribe button
  const handleUnsubscribeClick = (item: EmailStats) => {
    setUnsubscribeTarget(item);
    setUnsubscribeDialogOpen(true);
  };

  // Handler for dialog actions
  const handleUnsubscribeAction = async (action: "archive" | "delete") => {
    if (!unsubscribeTarget) return;
    setUnsubscribeDialogOpen(false);
    const apiAction = action === "archive" ? "trash" : "delete";
    try {
      // Get the current session and access token
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.provider_token;
      const userId = session?.session?.user?.id;

      if (!accessToken) {
        throw new Error("No access token available. Please sign in again.");
      }

      // 1. Call /api/unsubscribe
      const unsubUrl = `/api/unsubscribe?userId=${userId}`;
      const unsubRes = await fetch(unsubUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          target: unsubscribeTarget.domain,
          action: apiAction,
          accessToken: accessToken,
          userId: userId,
        }),
      });
      const unsubData = await unsubRes.json();

      // 2. Call /api/gmail-filters
      const filtersUrl = `/api/gmail-filters?userId=${userId}`;
      await fetch(filtersUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          accessToken: accessToken,
          userId: userId,
          target: unsubscribeTarget.domain,
          action: apiAction,
        }),
      });

      setTimeout(() => {
        alert(
          `Unsubscribed from ${unsubscribeTarget.domain} and ${
            action === "archive" ? "archived" : "deleted"
          } emails!`
        );
        // Refresh the data after successful unsubscribe
        fetchEmailStats();
        fetchUnsubscribedSenders();
      }, 300);
    } catch (err) {
      alert("Unsubscribe failed: " + (err as Error).message);
    }
  };

  // Handler for resubscribe action
  const handleResubscribe = async (sender: string) => {
    try {
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session?.session?.user) {
        throw new Error("No valid session found. Please sign in again.");
      }

      const userId = session.session.user.id;
      const accessToken = session.session.provider_token;

      if (!accessToken) {
        throw new Error("No access token available. Please sign in again.");
      }

      // Call resubscribe API
      const response = await fetch(`/api/resubscribe?userId=${userId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sender: sender,
          accessToken: accessToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Resubscribe failed: ${errorData.error || "Unknown error"}`
        );
      }

      const result = await response.json();
      console.log("Resubscribe result:", result);

      // Show success message with email count
      const message =
        result.emailsRestored > 0
          ? `Successfully resubscribed to ${sender} and moved ${result.emailsRestored} emails from trash to inbox.`
          : `Successfully resubscribed to ${sender}.`;
      alert(message);

      // Refresh data to show the sender back in the inbox
      await Promise.all([fetchEmailStats(), fetchUnsubscribedSenders()]);
    } catch (error: any) {
      console.error("Resubscribe failed:", error);
      alert(`Resubscribe failed: ${error.message}`);
    }
  };

  // Handler for Keep/Mark Safe action
  const handleKeepClick = async (item: EmailStats) => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        throw new Error("No user session found. Please sign in.");
      }

      const response = await fetch("/api/mark-safe", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: item.domain,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Marked as safe successfully:", result);
        alert(`Successfully marked ${item.domain} as safe!`);

        // Remove the item from emailStats and refresh data
        await Promise.all([fetchEmailStats(), fetchSafeSenders()]);
        setSelectedTab("Marked Safe");
      } else {
        console.error("Error marking as safe:", result);
        alert(`Failed to mark as safe: ${result.error || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Error during mark safe:", error);
      alert(`Error marking as safe: ${error.message}`);
    }
  };

  // Handler for removing domain from safe senders
  const handleUnmarkSafe = async (domain: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        throw new Error("No user session found. Please sign in.");
      }

      const response = await fetch("/api/unmark-safe", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: domain,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Unmarked safe successfully:", result);
        alert(`Successfully removed ${domain} from safe list!`);

        // Refresh safe senders data
        await fetchSafeSenders();
      } else {
        console.error("Error unmarking safe:", result);
        alert(
          `Failed to remove from safe list: ${result.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error("Error during unmark safe:", error);
      alert(`Error removing from safe list: ${error.message}`);
    }
  };

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
      <TabNavigation
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {/* Search and Controls */}
      <SearchAndControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
      />

      {/* Unsubscribe Dialog */}
      <UnsubscribeDialog
        isOpen={unsubscribeDialogOpen}
        onOpenChange={setUnsubscribeDialogOpen}
        target={unsubscribeTarget}
        onUnsubscribeAction={handleUnsubscribeAction}
      />

      {/* Content List */}
      <div className="space-y-3">
        {selectedTab === "Inbox" && (
          <>
            {sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <SubscriptionItem
                  key={index}
                  item={item}
                  onUnsubscribeClick={handleUnsubscribeClick}
                  onKeepClick={handleKeepClick}
                />
              ))
            ) : (
              <EmptyState type="inbox" searchTerm={searchTerm} />
            )}
          </>
        )}

        {selectedTab === "Unsubscribed" && (
          <>
            {sortedUnsubscribed.length > 0 ? (
              sortedUnsubscribed.map((item, index) => (
                <UnsubscribedItem
                  key={index}
                  item={item}
                  onResubscribe={handleResubscribe}
                />
              ))
            ) : (
              <EmptyState type="unsubscribed" searchTerm={searchTerm} />
            )}
          </>
        )}

        {selectedTab === "Marked Safe" && (
          <>
            {sortedSafe.length > 0 ? (
              sortedSafe.map((item, index) => (
                <SafeItem
                  key={index}
                  item={item}
                  onUnmarkSafe={handleUnmarkSafe}
                />
              ))
            ) : (
              <EmptyState type="safe" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SubscriptionsPage;
