"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FolderArrowDownIcon } from "@heroicons/react/24/outline";
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
import { MoveToLabelDialog } from "@/components/MoveToLabelDialog";
import { toast } from "sonner";

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
  const [gmailLabels, setGmailLabels] = useState<any[]>([]);
  const [labelEmails, setLabelEmails] = useState<any[]>([]);
  const [loadingLabelEmails, setLoadingLabelEmails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Inbox");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Email count desc");
  const [filterBy, setFilterBy] = useState("All");
  const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
  const [unsubscribeTarget, setUnsubscribeTarget] = useState<EmailStats | null>(
    null
  );
  const [moveToLabelDialogOpen, setMoveToLabelDialogOpen] = useState(false);
  const [moveToLabelTarget, setMoveToLabelTarget] = useState<EmailStats | null>(
    null
  );
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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
      fetchGmailLabels();
    };

    checkAuthAndFetchData();
  }, []);

  // Clear selections when tab changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [selectedTab]);

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
    } catch (error) {}
  };

  const fetchSafeSenders = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
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
      }
    } catch (error) {}
  };

  const fetchGmailLabels = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        return;
      }

      const response = await fetch("/api/gmail-labels", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          accessToken: session.session.provider_token,
          userId: session.session.user.id,
          userEmail: session.session.user.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Filter to only show user-created labels and some system labels
        const filteredLabels = (data.labels || []).filter(
          (label: any) =>
            label.type === "user" ||
            ["INBOX", "STARRED", "IMPORTANT"].includes(label.id)
        );

        setGmailLabels(filteredLabels);
      }
    } catch (error) {}
  };

  const fetchEmailsForLabel = async (labelId: string) => {
    if (labelId === "All" || labelId === "Inbox") {
      setLabelEmails([]);
      return;
    }

    setLoadingLabelEmails(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        setLoadingLabelEmails(false);
        return;
      }

      const response = await fetch(
        `/api/gmail-emails?labelId=${labelId}&maxResults=100`,
        {
          headers: {
            Authorization: `Bearer ${session.session.provider_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Group emails by domain to create domain statistics
        const domainStats = new Map();

        if (data.messages && Array.isArray(data.messages)) {
          data.messages.forEach((email: any) => {
            // The API already extracts headers, so use the 'from' field directly
            const fromEmail = email.from;

            if (fromEmail) {
              // Extract domain from email address
              const emailMatch = fromEmail.match(/<(.+?)>/) || [
                null,
                fromEmail,
              ];
              const emailAddress = emailMatch[1] || fromEmail;
              const domain = emailAddress.includes("@")
                ? emailAddress.split("@")[1]
                : null;

              if (domain) {
                const existing = domainStats.get(domain) || {
                  domain,
                  sender_count: 1,
                  total_emails: 0,
                  monthly_avg: 0,
                };

                existing.total_emails++;
                existing.monthly_avg = existing.total_emails / 12; // Simplified calculation

                domainStats.set(domain, existing);
              }
            }
          });
        }

        const domainsArray = Array.from(domainStats.values());
        setLabelEmails(domainsArray);
      } else {
        setLabelEmails([]);
      }
    } catch (error) {
      setLabelEmails([]);
    } finally {
      setLoadingLabelEmails(false);
    }
  };

  // Use labelEmails when a specific label is selected, otherwise use emailData
  const dataSource =
    filterBy !== "All" && filterBy !== "Inbox" ? labelEmails : emailData;

  const filteredData = dataSource.filter((item) => {
    // Filter by search term
    const matchesSearch = item.domain
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Exclude domains that are marked as safe (only for emailData, not labelEmails)
    const isNotSafe =
      filterBy === "All" || filterBy === "Inbox"
        ? !safeSenders.some((safeSender) => safeSender.domain === item.domain)
        : true; // Don't filter safe senders for label-specific data

    return matchesSearch && isNotSafe;
  });

  const filteredUnsubscribed = unsubscribedSenders.filter((item) =>
    item.sender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSafe = safeSenders.filter((item) =>
    item.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "Email count desc":
        return b.total_emails - a.total_emails; // Descending: Most emails first
      case "Email count asc":
        return a.total_emails - b.total_emails; // Ascending: Least emails first
      default:
        return b.total_emails - a.total_emails; // Default to descending
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
        toast.success(
          `Unsubscribed from ${unsubscribeTarget.domain} and ${
            action === "archive" ? "archived" : "deleted"
          } emails!`,
          {
            description: "Your inbox will be updated shortly",
            duration: 4000,
          }
        );
        // Refresh the data after successful unsubscribe
        fetchEmailStats();
        fetchUnsubscribedSenders();
      }, 300);
    } catch (err) {
      toast.error("Unsubscribe failed: " + (err as Error).message);
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

      // Show success message with email count
      const message =
        result.emailsRestored > 0
          ? `Successfully resubscribed to ${sender} and moved ${result.emailsRestored} emails from trash to inbox.`
          : `Successfully resubscribed to ${sender}.`;
      toast.success(message, {
        description: "You'll now receive emails from this sender again",
        duration: 4000,
      });

      // Refresh data to show the sender back in the inbox
      await Promise.all([fetchEmailStats(), fetchUnsubscribedSenders()]);
    } catch (error: any) {
      toast.error(`Resubscribe failed: ${error.message}`);
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
        toast.success(`Successfully marked ${item.domain} as safe!`, {
          description: "This sender has been added to your safe list",
          duration: 4000,
        });

        // Remove the item from emailStats and refresh data
        await Promise.all([fetchEmailStats(), fetchSafeSenders()]);
        setSelectedTab("Marked Safe");
      } else {
        toast.error(
          `Failed to mark as safe: ${result.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      toast.error(`Error marking as safe: ${error.message}`);
    }
  };

  // Handler for Move to Label button
  const handleMoveToLabelClick = (item: EmailStats) => {
    setMoveToLabelTarget(item);
    setMoveToLabelDialogOpen(true);
  };

  // Handler when emails are successfully moved
  const handleEmailsMoved = () => {
    // Refresh the email stats after moving emails
    fetchEmailStats();
    setMoveToLabelDialogOpen(false);
    setMoveToLabelTarget(null);
    // Clear selections after moving
    setSelectedItems(new Set());
  };

  // Handler for checkbox selection
  const handleSelectionChange = (item: EmailStats, selected: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (selected) {
      newSelectedItems.add(item.domain);
    } else {
      newSelectedItems.delete(item.domain);
    }
    setSelectedItems(newSelectedItems);
  };

  // Handler for bulk move to label
  const handleBulkMoveToLabel = () => {
    if (selectedItems.size === 0) return;

    // For now, we'll move the first selected item
    // In a full implementation, you might want to handle multiple items
    const firstSelectedDomain = Array.from(selectedItems)[0];
    const selectedItem = sortedData.find(
      (item) => item.domain === firstSelectedDomain
    );

    if (selectedItem) {
      setMoveToLabelTarget(selectedItem);
      setMoveToLabelDialogOpen(true);
    }
  };

  // Handler for filter change - fetch emails when label is selected
  const handleFilterChange = async (filter: string) => {
    setFilterBy(filter);

    if (filter !== "All" && filter !== "Inbox") {
      await fetchEmailsForLabel(filter);
    } else {
      // Clear label emails when switching back to All or Inbox
      setLabelEmails([]);
      setLoadingLabelEmails(false);
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
        toast.success(`Successfully removed ${domain} from safe list!`, {
          description: "This sender has been removed from your safe list",
          duration: 4000,
        });

        // Refresh safe senders data
        await fetchSafeSenders();
      } else {
        toast.error(
          `Failed to remove from safe list: ${result.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      toast.error(`Error removing from safe list: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="inline-block w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
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
        onFilterChange={handleFilterChange}
        gmailLabels={gmailLabels}
      />

      {/* Selected Items Actions */}
      {selectedItems.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedItems(new Set())}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
              <button
                onClick={handleBulkMoveToLabel}
                className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <FolderArrowDownIcon className="w-4 h-4" />
                Move to Label
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Add debug info */}

            {loadingLabelEmails ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                </div>
              </div>
            ) : sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <SubscriptionItem
                  key={index}
                  item={item}
                  onUnsubscribeClick={handleUnsubscribeClick}
                  onKeepClick={handleKeepClick}
                  onMoveToLabelClick={handleMoveToLabelClick}
                  isSelected={selectedItems.has(item.domain)}
                  onSelectionChange={handleSelectionChange}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {filterBy === "All" || filterBy === "Inbox"
                    ? "No subscription emails found."
                    : "No emails found in this label."}
                </div>
              </div>
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

      {/* Move to Label Dialog */}
      <MoveToLabelDialog
        isOpen={moveToLabelDialogOpen}
        onClose={() => {
          setMoveToLabelDialogOpen(false);
          setMoveToLabelTarget(null);
        }}
        subscription={moveToLabelTarget}
        onEmailsMoved={handleEmailsMoved}
      />
    </div>
  );
}

export default SubscriptionsPage;
