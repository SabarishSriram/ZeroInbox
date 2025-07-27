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
import { ChevronDownIcon } from "@heroicons/react/24/solid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

interface CreateLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLabelCreated: () => void; // Callback to refresh labels
}

export const CreateLabelDialog: React.FC<CreateLabelDialogProps> = ({
  isOpen,
  onClose,
  onLabelCreated,
}) => {
  const [labelName, setLabelName] = useState("");
  const [parentLabelId, setParentLabelId] = useState<string>("none");
  const [isCreating, setIsCreating] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<GmailLabel[]>([]);
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [error, setError] = useState("");

  // Fetch available labels for nesting
  useEffect(() => {
    if (isOpen) {
      fetchAvailableLabels();
      setLabelName("");
      setParentLabelId("none");
      setError("");
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showParentDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest(".parent-dropdown-container")) {
          setShowParentDropdown(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showParentDropdown]);

  const fetchAvailableLabels = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        console.log("No session found for fetching labels");
        return;
      }

      console.log("Fetching available labels for nesting...");

      // Use the POST endpoint to fetch fresh labels from Gmail (like the sidebar does)
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

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched labels data:", data);

        // Filter to only show user-created labels for nesting
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

        // Sort labels to show parent labels before their children (same as Sidebar)
        const sortedLabels = userLabels.sort((a: any, b: any) => {
          const aDepth = a.name.split("/").length;
          const bDepth = b.name.split("/").length;

          // Get the root parent for each label
          const aRoot = a.name.split("/")[0];
          const bRoot = b.name.split("/")[0];

          // If they have different root parents, sort by root parent name
          if (aRoot !== bRoot) {
            return aRoot.localeCompare(bRoot);
          }

          // Same root parent - sort by depth first (parents before children)
          if (aDepth !== bDepth) {
            return aDepth - bDepth;
          }

          // Same root and depth - sort alphabetically
          return a.name.localeCompare(b.name);
        });

        console.log(
          "Filtered and sorted user labels for nesting:",
          sortedLabels
        );
        setAvailableLabels(sortedLabels);
      } else {
        console.error("Failed to fetch labels:", response.status);
        try {
          const errorData = await response.json();
          console.error("Error data:", errorData);
        } catch (e) {
          console.error("Could not parse error response");
        }
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
    }
  };

  const handleCreateLabel = async () => {
    if (!labelName.trim()) {
      setError("Label name is required");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/gmail-labels/create", {
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
          labelName: labelName.trim(),
          parentLabelId: parentLabelId === "none" ? null : parentLabelId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Label created successfully:", data.message);

        // Reset form and close dialog
        setLabelName("");
        setParentLabelId("none");
        onClose();

        // Refresh the labels list
        onLabelCreated();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create label");
      }
    } catch (error) {
      console.error("Error creating label:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedParentLabel = availableLabels.find(
    (label) => label.id === parentLabelId
  );

  // Get display name for selected parent label
  const getDisplayName = (label: GmailLabel | undefined) => {
    if (!label) return "Please select a parent...";

    const isNested = label.name.includes("/");
    return isNested ? label.name.split("/").pop() || label.name : label.name;
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
          <DialogTitle>Create New Folder / Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          {/* Folder Name Input */}
          <div>
            <label className="block text-md font-medium mb-1">
              Folder Name
            </label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Nest Folder Dropdown - only show if there are existing labels */}
          {availableLabels.length > 0 && (
            <div>
              <label className="block text-md font-medium mb-1">
                Nest Folder
              </label>
              <div className="relative parent-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowParentDropdown(!showParentDropdown)}
                  className="w-full px-3 py-2 border-2 border-blue-500 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                  disabled={isCreating}
                >
                  <span className="text-gray-600 truncate">
                    {parentLabelId === "none"
                      ? "Please select a parent..."
                      : getDisplayName(selectedParentLabel)}
                  </span>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${
                      showParentDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showParentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setParentLabelId("none");
                          setShowParentDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 flex items-center transition-colors duration-150"
                      >
                        <span className="text-gray-600">No parent folder</span>
                      </button>
                      {availableLabels.map((label) => {
                        // Calculate nesting level and display name
                        const isNested = label.name.includes("/");
                        const labelParts = label.name.split("/");
                        const displayName = isNested
                          ? labelParts[labelParts.length - 1]
                          : label.name;
                        const indentLevel = labelParts.length - 1;
                        const isSelected = parentLabelId === label.id;

                        return (
                          <button
                            key={label.id}
                            onClick={() => {
                              setParentLabelId(label.id);
                              setShowParentDropdown(false);
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
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {isNested && (
                                <div
                                  className="w-3 h-px bg-gray-300 border-none flex-shrink-0"
                                  style={{ marginLeft: `${indentLevel * 4}px` }}
                                />
                              )}
                              <span className="truncate">{displayName}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateLabel}
            disabled={isCreating || !labelName.trim()}
          >
            {isCreating ? "Creating..." : "Create"}
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
