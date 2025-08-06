"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { ChevronDownIcon, FolderIcon } from "@heroicons/react/24/solid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

interface EmailStats {
  domain: string;
  total_emails: number;
  monthly_avg: number;
  sender_email?: string;
}

interface MoveToLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: EmailStats | null;
  onEmailsMoved: () => void;
}

export const MoveToLabelDialog: React.FC<MoveToLabelDialogProps> = ({
  isOpen,
  onClose,
  subscription,
  onEmailsMoved,
}) => {
  const [selectedLabelId, setSelectedLabelId] = useState<string>("none");
  const [isMoving, setIsMoving] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<GmailLabel[]>([]);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [error, setError] = useState("");

  // Fetch available labels for moving emails
  useEffect(() => {
    if (isOpen) {
      fetchAvailableLabels();
      setSelectedLabelId("none");
      setError("");
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLabelDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest(".label-dropdown-container")) {
          setShowLabelDropdown(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showLabelDropdown]);

  const fetchAvailableLabels = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        console.log("No session found for fetching labels");
        return;
      }

      console.log("Fetching available labels for moving emails...");

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
        console.log("Fetched labels for moving:", data);

        // Filter to only show user-created labels
        const userLabels = (data.labels || []).filter(
          (label: any) =>
            label.type === "user" &&
            ![
              "INBOX",
              "SENT",
              "DRAFT",
              "TRASH",
              "SPAM",
              "STARRED",
              "IMPORTANT",
              "UNREAD",
              "CHAT",
              "CATEGORY_FORUMS",
              "CATEGORY_UPDATES",
              "CATEGORY_PROMOTIONS",
              "CATEGORY_SOCIAL",
              "CATEGORY_PRIMARY",
            ].includes(label.name)
        );

        // Sort labels hierarchically
        const sortedLabels = userLabels.sort((a: any, b: any) => {
          const aDepth = a.name.split("/").length;
          const bDepth = b.name.split("/").length;

          const aRoot = a.name.split("/")[0];
          const bRoot = b.name.split("/")[0];

          if (aRoot !== bRoot) {
            return aRoot.localeCompare(bRoot);
          }

          if (aDepth !== bDepth) {
            return aDepth - bDepth;
          }

          return a.name.localeCompare(b.name);
        });

        setAvailableLabels(sortedLabels);
      } else {
        console.error("Failed to fetch labels:", response.status);
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
    }
  };

  const handleMoveToLabel = async () => {
    if (selectedLabelId === "none" || !subscription) {
      setError("Please select a label");
      return;
    }

    setIsMoving(true);
    setError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/gmail-emails/move-to-label", {
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
          senderDomain: subscription.domain,
          senderEmail: subscription.sender_email || `@${subscription.domain}`,
          labelId: selectedLabelId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Emails moved successfully:", data.message);

        // Reset form and close dialog
        setSelectedLabelId("none");
        onClose();

        // Refresh the subscriptions list
        onEmailsMoved();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to move emails");
      }
    } catch (error) {
      console.error("Error moving emails:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsMoving(false);
    }
  };

  const selectedLabel = availableLabels.find(
    (label) => label.id === selectedLabelId
  );

  // Get display name for selected label
  const getDisplayName = (label: GmailLabel | undefined) => {
    if (!label) return "Select a label...";

    const isNested = label.name.includes("/");
    return isNested ? label.name.split("/").pop() || label.name : label.name;
  };

  const getFullPath = (label: GmailLabel | undefined) => {
    if (!label || !label.name.includes("/")) return "";
    return label.name.split("/").slice(0, -1).join(" > ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md font-sans"
        style={{
          animation: isOpen
            ? "dialog-enter 0.2s ease-out"
            : "dialog-exit 0.2s ease-in",
        }}
      >
        <DialogHeader>
          <DialogTitle>Move Emails to Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          {/* Subscription Info */}
          {subscription && (
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="flex items-center gap-3">
                <img
                  src={`https://logo.clearbit.com/${subscription.domain}`}
                  alt={subscription.domain}
                  className="w-8 h-8 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-logo.png";
                  }}
                />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {subscription.domain.charAt(0).toUpperCase() +
                      subscription.domain.slice(1)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {subscription.total_emails} emails will be moved
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Label Selection Dropdown */}
          {availableLabels.length > 0 ? (
            <div>
              <label className="block text-md font-medium mb-1">
                Select Destination Label
              </label>
              <div className="relative label-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="w-full px-3 py-2 border-2 border-blue-500 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                  disabled={isMoving}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectedLabel && (
                      <FolderIcon className="w-4 h-4 text-foreground flex-shrink-0" />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-gray-700 truncate">
                        {getDisplayName(selectedLabel)}
                      </span>
                      {selectedLabel && getFullPath(selectedLabel) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {getFullPath(selectedLabel)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${
                      showLabelDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showLabelDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="py-1">
                      {availableLabels.map((label) => {
                        const isNested = label.name.includes("/");
                        const labelParts = label.name.split("/");
                        const displayName = isNested
                          ? labelParts[labelParts.length - 1]
                          : label.name;
                        const indentLevel = labelParts.length - 1;
                        const isSelected = selectedLabelId === label.id;
                        const parentPath = isNested
                          ? labelParts.slice(0, -1).join(" > ")
                          : "";

                        return (
                          <button
                            key={label.id}
                            onClick={() => {
                              setSelectedLabelId(label.id);
                              setShowLabelDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 flex items-center transition-colors duration-150 ${
                              isSelected
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700"
                            }`}
                            style={{
                              paddingLeft: `${12 + indentLevel * 16}px`,
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isNested && (
                                <div
                                  className="w-3 h-px bg-gray-300 border-none flex-shrink-0"
                                  style={{ marginLeft: `${indentLevel * 4}px` }}
                                />
                              )}
                              <FolderIcon className="w-4 h-4 text-foreground flex-shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate">{displayName}</span>
                                {isNested && (
                                  <span className="text-xs text-muted-foreground/70 truncate">
                                    {parentPath}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <FolderIcon className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No labels found</p>
              <p className="text-sm text-muted-foreground/80">
                Create labels first to organize your emails
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button
            onClick={handleMoveToLabel}
            disabled={
              isMoving ||
              selectedLabelId === "none" ||
              availableLabels.length === 0
            }
          >
            {isMoving ? "Moving..." : "Move Emails"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <style jsx global>{`
        @keyframes dialog-enter {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes dialog-exit {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.95);
          }
        }

        [data-radix-dialog-content] {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          animation: dialog-enter 0.2s ease-out !important;
        }
      `}</style>
    </Dialog>
  );
};
