"use client";

import React, { useEffect, useState, Suspense } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderArrowDownIcon } from "@heroicons/react/24/outline";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { LabelMoveDialog } from "@/components/LabelMoveDialog";

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

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  labelIds: string[];
  internalDate: string;
}

interface GroupedEmails {
  domain: string;
  totalEmails: number;
  unreadCount: number;
  latestDate: string;
  senderEmail: string;
  emails: EmailMessage[];
}

function LabelsPageContent() {
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [groupedEmails, setGroupedEmails] = useState<GroupedEmails[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedLabelName, setSelectedLabelName] = useState<string | null>(
    null
  );
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(
    new Set()
  );
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Toggle domain selection
  const toggleDomainSelection = (domain: string) => {
    const newSelected = new Set(selectedDomains);
    if (newSelected.has(domain)) {
      newSelected.delete(domain);
    } else {
      newSelected.add(domain);
    }
    setSelectedDomains(newSelected);
  };

  // Handle move emails
  const handleMoveEmails = async (targetLabelId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.provider_token) {
        console.error("No access token available");
        return;
      }

      // Get all email IDs from selected domains
      const emailIds = groupedEmails
        .filter((group) => selectedDomains.has(group.domain))
        .flatMap((group) => group.emails.map((email) => email.id));

      if (emailIds.length === 0) return;

      const response = await fetch("/api/gmail-emails/move-to-label", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session.provider_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailIds,
          labelId: targetLabelId,
          removeLabelIds: selectedLabel ? [selectedLabel] : [],
        }),
      });

      if (response.ok) {
        // Refresh the emails after successful move
        if (selectedLabel) {
          fetchEmailsForLabel(selectedLabel);
        }
        // Clear selection
        setSelectedDomains(new Set());
        setShowMoveDialog(false);
      } else {
        const errorText = await response.text();
        console.error("Failed to move emails:", errorText);
      }
    } catch (error) {
      console.error("Error moving emails:", error);
    }
  };

  // Get label parameters from URL
  useEffect(() => {
    const labelId = searchParams.get("label");
    const labelName = searchParams.get("labelName");

    if (labelId && labelName) {
      setSelectedLabel(labelId);
      setSelectedLabelName(decodeURIComponent(labelName));
      fetchEmailsForLabel(labelId);
    } else {
      // If no label is specified, redirect to dashboard
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  // Function to group emails by domain
  const groupEmailsByDomain = (emailList: EmailMessage[]): GroupedEmails[] => {
    const domainMap = new Map<string, GroupedEmails>();

    emailList.forEach((email) => {
      // Extract domain from email address
      const fromMatch = email.from.match(/<(.+)>/);
      const emailAddress = fromMatch ? fromMatch[1] : email.from;
      const domain = emailAddress.split("@")[1] || emailAddress;

      if (domainMap.has(domain)) {
        const existing = domainMap.get(domain)!;
        existing.emails.push(email);
        existing.totalEmails++;
        if (email.isUnread) existing.unreadCount++;
        // Update latest date if this email is newer
        if (new Date(email.internalDate) > new Date(existing.latestDate)) {
          existing.latestDate = email.internalDate;
        }
      } else {
        domainMap.set(domain, {
          domain,
          totalEmails: 1,
          unreadCount: email.isUnread ? 1 : 0,
          latestDate: email.internalDate,
          senderEmail: emailAddress,
          emails: [email],
        });
      }
    });

    // Sort by latest date (newest first)
    return Array.from(domainMap.values()).sort(
      (a, b) =>
        new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  };

  const fetchEmailsForLabel = async (labelId: string) => {
    setLoadingEmails(true);
    try {
      // Get the current session for authentication
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.provider_token) {
        console.error("No access token available");
        setEmails([]);
        return;
      }

      const response = await fetch(
        `/api/gmail-emails?labelId=${labelId}&maxResults=50`,
        {
          headers: {
            Authorization: `Bearer ${session.session.provider_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const emailList = data.messages || [];
        setEmails(emailList);

        // Group emails by domain
        const grouped = groupEmailsByDomain(emailList);
        setGroupedEmails(grouped);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch emails:", errorText);
        setEmails([]);
        setGroupedEmails([]);
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
      setEmails([]);
      setGroupedEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user || !session?.provider_token) {
        router.replace("/auth");
        return;
      }
      setUser(session.user as User);
    })();
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedLabel || !selectedLabelName) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-content font-sans">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground font-sans">
            {selectedLabelName}
          </h1>
          <p className="text-muted-foreground">
            {loadingEmails
              ? "Loading..."
              : `${groupedEmails.length} domain${
                  groupedEmails.length !== 1 ? "s" : ""
                } • ${emails.length} email${emails.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Email List */}
        {loadingEmails ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : groupedEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-12 h-12 text-muted-foreground/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No emails found
            </h3>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              This label doesn't contain any emails yet. New emails with this
              label will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Move Button - appears when domains are selected */}
            {selectedDomains.size > 0 && (
              <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {selectedDomains.size} domain
                    {selectedDomains.size !== 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => setShowMoveDialog(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    <FolderArrowDownIcon className="h-4 w-4" />
                    Move to Label
                  </button>
                </div>
              </div>
            )}

            {/* Grouped Email List */}
            <div className="space-y-2">
              {groupedEmails.map((group) => (
                <div
                  key={group.domain}
                  className={`border rounded-lg p-4 hover:bg-hovered transition-colors ${
                    group.unreadCount > 0
                      ? "bg-blue-50 border-blue-200"
                      : "bg-background border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Custom Checkbox */}
                    <div className="flex items-start gap-3">
                      <div
                        onClick={() => toggleDomainSelection(group.domain)}
                        className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-colors ${
                          selectedDomains.has(group.domain)
                            ? "bg-black border-black"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {selectedDomains.has(group.domain) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {group.unreadCount > 0 && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                          <h3
                            className={`font-medium truncate ${
                              group.unreadCount > 0 ? "font-semibold" : ""
                            }`}
                          >
                            {group.domain}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 truncate">
                          {group.senderEmail}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <EnvelopeIcon className="h-4 w-4" />
                            {group.totalEmails} email
                            {group.totalEmails !== 1 ? "s" : ""}
                          </span>
                          {group.unreadCount > 0 && (
                            <span className="text-blue-600 font-medium">
                              {group.unreadCount} unread
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(group.latestDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year:
                          new Date(group.latestDate).getFullYear() !==
                          new Date().getFullYear()
                            ? "numeric"
                            : undefined,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Move to Label Dialog */}
        <LabelMoveDialog
          isOpen={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          onMoveToLabel={handleMoveEmails}
        />
      </div>
    </div>
  );
}

function LabelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <LabelsPageContent />
    </Suspense>
  );
}

export default LabelsPage;
