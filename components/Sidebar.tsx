"use client";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  HomeIcon,
  EnvelopeIcon,
  DocumentIcon,
  InboxArrowDownIcon,
  FolderPlusIcon,
  FolderIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/solid";
import { usePathname } from "next/navigation";
import { User, createClient } from "@supabase/supabase-js";
import Image from "next/image";
import rainboxlogo from "@/public/RainboxLogo.png";
import { CreateLabelDialog } from "@/components/CreateLabelDialog";

// Delete Label Dialog Component
const DeleteLabelDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  labelId: string | null;
  labelName: string;
  childCount?: number;
  onLabelDeleted: () => void;
}> = ({
  isOpen,
  onClose,
  labelId,
  labelName,
  childCount = 0,
  onLabelDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Reset error when dialog opens
  useEffect(() => {
    if (isOpen) {
      setError("");
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!labelId) return;

    setIsDeleting(true);
    setError("");

    try {
      const session = await supabase.auth.getSession();
      if (!session?.data?.session?.user) {
        setError("Authentication required");
        return;
      }

      // For tree structure, we need to send all child IDs for deletion
      const response = await fetch("/api/gmail-labels/delete", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          accessToken: session.data.session.provider_token,
          userId: session.data.session.user.id,
          userEmail: session.data.session.user.email,
          labelId: labelId,
          deleteChildren: childCount > 0, // Flag to indicate child deletion
        }),
      });

      if (response.ok) {
        console.log("Label deleted successfully");
        onClose();
        onLabelDeleted();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete label");
      }
    } catch (error) {
      console.error("Error deleting label:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
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
          <DialogTitle>Delete Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          <div className="text-sm text-muted-foreground">
            Are you sure you want to delete the label{" "}
            <span className="font-semibold text-foreground">
              "
              {labelName.includes("/") ? labelName.split("/").pop() : labelName}
              "
            </span>
            {labelName.includes("/") && (
              <>
                {" "}
                from{" "}
                <span className="font-medium text-foreground">
                  {labelName.split("/").slice(0, -1).join(" > ")}
                </span>
              </>
            )}
            ?
            {childCount > 0 && (
              <div className="mt-2 text-orange-700 bg-orange-50 border border-orange-200 rounded-md p-2">
                <strong>⚠️ Warning:</strong> This label contains {childCount}{" "}
                nested label(s) that will also be deleted.
              </div>
            )}
          </div>

          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="font-medium mb-1">⚠️ Warning:</div>
            <div>
              This action cannot be undone. The label
              {childCount > 0 && " and all its nested labels"} will be
              permanently removed from your Gmail account.
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
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

        /* Custom Scrollbar for Sidebar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .custom-scrollbar:hover {
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 3px;
          transition: background-color 0.2s ease;
        }

        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
      `}</style>
    </Dialog>
  );
};

// Rename Label Dialog Component
const RenameLabelDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  labelId: string | null;
  currentName: string;
  onLabelRenamed: () => void;
}> = ({ isOpen, onClose, labelId, currentName, onLabelRenamed }) => {
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // For nested labels, show only the last part for editing
      const isNested = currentName.includes("/");
      const displayName = isNested
        ? currentName.split("/").pop() || currentName
        : currentName;
      setNewName(displayName);
      setError("");
    }
  }, [isOpen, currentName]);

  const handleRename = async () => {
    if (!newName.trim() || !labelId) {
      setError("Label name is required");
      return;
    }

    setIsRenaming(true);
    setError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("Authentication required");
        return;
      }

      // For nested labels, reconstruct the full path with the new name
      const isNested = currentName.includes("/");
      const finalName = isNested
        ? currentName.split("/").slice(0, -1).join("/") + "/" + newName.trim()
        : newName.trim();

      console.log("Renaming label:", {
        originalName: currentName,
        newDisplayName: newName.trim(),
        finalFullName: finalName,
        isNested,
      });

      const response = await fetch("/api/gmail-labels/rename", {
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
          labelId: labelId,
          newName: finalName,
        }),
      });

      if (response.ok) {
        console.log("Label renamed successfully");
        onClose();
        onLabelRenamed();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to rename label");
      }
    } catch (error) {
      console.error("Error renaming label:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsRenaming(false);
    }
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
          <DialogTitle>Rename Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          <div>
            <label className="block text-md font-medium mb-1">Label Name</label>
            {currentName.includes("/") && (
              <div className="text-sm text-muted-foreground mb-2 px-3 py-2 bg-muted/50 rounded border">
                <span className="font-medium">Parent path:</span>{" "}
                {currentName.split("/").slice(0, -1).join(" > ")}
              </div>
            )}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new label name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isRenaming}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                } else if (e.key === "Escape") {
                  onClose();
                }
              }}
            />
            {currentName.includes("/") && newName.trim() && (
              <div className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Full name will be:</span>{" "}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {currentName.split("/").slice(0, -1).join("/") +
                    "/" +
                    newName.trim()}
                </code>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRenaming}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={isRenaming || !newName.trim()}
          >
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface GmailLabel {
  id: number;
  label_id: string;
  name: string;
  type: string;
  messages_total: number;
  messages_unread: number;
  user_id: string;
  children?: GmailLabel[];
  isExpanded?: boolean;
  depth?: number;
}

interface CachedSession {
  session: any;
  timestamp: number;
}

interface SidebarProps {
  onSyncComplete?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSyncComplete }) => {
  // Session cache to avoid repeated calls
  const [cachedSession, setCachedSession] = useState<CachedSession | null>(
    null,
  );

  // --- Sync Info State and Logic ---
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [lastEmailFetched, setLastEmailFetched] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(100); // 100% if up-to-date
  const [loadingLastSync, setLoadingLastSync] = useState(true);

  // Helper function to get cached session or fetch new one
  const getCachedSession = async (): Promise<any> => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    if (cachedSession && now - cachedSession.timestamp < CACHE_DURATION) {
      return cachedSession.session;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const newCache: CachedSession = {
      session: sessionData?.session,
      timestamp: now,
    };
    setCachedSession(newCache);
    return sessionData?.session;
  };

  // Helper function to build tree structure from flat labels
  const buildLabelTree = (flatLabels: any[]): GmailLabel[] => {
    const labelMap = new Map<string, GmailLabel>();
    const rootLabels: GmailLabel[] = [];

    // First pass: create all label objects
    flatLabels.forEach((label: any) => {
      const treeLabel: GmailLabel = {
        id: 0,
        label_id: label.id,
        name: label.name,
        type: label.type || "user",
        messages_total: label.messagesTotal || 0,
        messages_unread: label.messagesUnread || 0,
        user_id: label.user_id,
        children: [],
        isExpanded: false,
        depth: label.name.split("/").length - 1,
      };
      labelMap.set(label.name, treeLabel);
    });

    // Second pass: build parent-child relationships
    flatLabels.forEach((label: any) => {
      const parts = label.name.split("/");
      const treeLabel = labelMap.get(label.name);

      if (!treeLabel) return;

      if (parts.length === 1) {
        // Root level label
        rootLabels.push(treeLabel);
      } else {
        // Nested label - find parent
        const parentPath = parts.slice(0, -1).join("/");
        const parent = labelMap.get(parentPath);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(treeLabel);
        } else {
          // Parent doesn't exist, treat as root
          rootLabels.push(treeLabel);
        }
      }
    });

    // Sort function for tree labels
    const sortLabels = (labels: GmailLabel[]): GmailLabel[] => {
      return labels.sort((a, b) => {
        // Sort by name
        const aName = a.name.split("/").pop() || a.name;
        const bName = b.name.split("/").pop() || b.name;
        const result = aName.localeCompare(bName);

        // Recursively sort children
        if (a.children) a.children = sortLabels(a.children);
        if (b.children) b.children = sortLabels(b.children);

        return result;
      });
    };

    return sortLabels(rootLabels);
  };

  // Helper function to collect all child label IDs recursively
  const collectChildLabelIds = (label: GmailLabel): string[] => {
    const ids = [label.label_id];
    if (label.children) {
      label.children.forEach((child) => {
        ids.push(...collectChildLabelIds(child));
      });
    }
    return ids;
  };

  // Helper function to toggle label expansion
  const toggleLabelExpansion = (labelId: string) => {
    const updateExpansion = (labels: GmailLabel[]): GmailLabel[] => {
      return labels.map((label) => {
        if (label.label_id === labelId) {
          return { ...label, isExpanded: !label.isExpanded };
        }
        if (label.children) {
          return { ...label, children: updateExpansion(label.children) };
        }
        return label;
      });
    };
    setGmailLabels(updateExpansion(gmailLabels));
  };

  // Fetch last synced and last email fetched times from database
  const fetchLastSyncInfo = async () => {
    try {
      const session = await getCachedSession();
      if (!session?.user) {
        setLoadingLastSync(false);
        return;
      }

      // Fetch the most recent email analysis record to get last sync time
      const { data: analysisData } = await supabase
        .from("email_stats")
        .select("updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (analysisData?.updated_at) {
        setLastEmailFetched(new Date(analysisData.updated_at));
        setLastSynced(new Date(analysisData.updated_at));
      }
    } catch (error) {
      console.error("Error fetching last sync info:", error);
    } finally {
      setLoadingLastSync(false);
    }
  };

  // Fetch last sync info on component mount
  useEffect(() => {
    fetchLastSyncInfo();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress(0);
    try {
      // Get cached session for credentials
      const session = await getCachedSession();
      // Use provider_token for Gmail API access
      const accessToken = session?.provider_token;
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;

      const res = await fetch("/api/email/analyze", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId,
          userEmail,
        }),
      });
      if (res.ok) {
        setSyncProgress(100);
        const now = new Date();
        setLastSynced(now);
        setLastEmailFetched(now);
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncProgress(0);
        // Optionally show error to user
      }
    } catch (e) {
      setSyncProgress(0);
      // Optionally show error to user
    }
    setSyncing(false);
  };

  // Helper function to format time difference
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return "Never";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const lastSyncedText = React.useMemo(() => {
    if (loadingLastSync) return "Checking...";
    if (!lastSynced) return "Never synced";
    return `Synced ${getTimeAgo(lastSynced)}`;
  }, [lastSynced, syncing, loadingLastSync]);

  const lastEmailFetchedText = React.useMemo(() => {
    if (loadingLastSync) return "Checking...";
    if (!lastEmailFetched) return "No emails fetched";
    return `Last email ${getTimeAgo(lastEmailFetched)}`;
  }, [lastEmailFetched, syncing, loadingLastSync]);

  const nextSyncText = "Synced daily"; // Simplified sync schedule text
  const [user, setUser] = useState<User | null>(null);
  const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [showCreateLabelDialog, setShowCreateLabelDialog] = useState(false);
  const [activeSelect, setActiveSelect] = useState<string | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<{
    id: string;
    name: string;
    childCount?: number;
  } | null>(null);

  const pathname = usePathname();

  const fetchGmailLabels = async () => {
    if (!user) return;

    setLoadingLabels(true);
    try {
      const session = await getCachedSession();

      if (!session?.user) {
        console.error("No valid session found");
        return;
      }

      console.log("Fetching Gmail labels using streamlined flow...");

      // Use the streamlined API that does: Gmail → Database → Frontend
      const response = await fetch("/api/gmail-labels", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accessToken: session.provider_token,
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Gmail labels response data:", data);
        console.log("Fetched", data.count, "labels");

        // Filter labels for sidebar display - only show user-created labels
        const userLabels = (data.labels || []).filter((label: any) => {
          // Only user-created labels
          if (label.type !== "user") return false;

          // Check if the label name contains system labels
          const labelParts = label.name.split("/");
          const hasSystemLabel = labelParts.some((part: string) =>
            [
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
            ].includes(part.toUpperCase()),
          );

          return !hasSystemLabel;
        });

        // Build tree structure from flat labels
        const labelTree = buildLabelTree(userLabels);
        setGmailLabels(labelTree);
      } else {
        console.error("Response not ok. Status:", response.status);
        try {
          const errorData = await response.json();
          console.error("Failed to fetch Gmail labels:", errorData);
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
      }
    } catch (error) {
      console.error("Error in Gmail labels flow:", error);
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleRenameLabel = async (labelId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const session = await getCachedSession();
      if (!session?.user) return;

      const response = await fetch("/api/gmail-labels/rename", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accessToken: session.provider_token,
          userId: session.user.id,
          userEmail: session.user.email,
          labelId: labelId,
          newName: newName.trim(),
        }),
      });

      if (response.ok) {
        console.log("Label renamed successfully");
        fetchGmailLabels(); // Refresh labels
      } else {
        const errorData = await response.json();
        console.error("Failed to rename label:", errorData);
      }
    } catch (error) {
      console.error("Error renaming label:", error);
    }
  };

  const handleDeleteLabel = async (labelId: string, labelName: string) => {
    // Find the label in the tree structure
    const findLabelInTree = (
      labels: GmailLabel[],
      id: string,
    ): GmailLabel | null => {
      for (const label of labels) {
        if (label.label_id === id) return label;
        if (label.children) {
          const found = findLabelInTree(label.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const fullLabel = findLabelInTree(gmailLabels, labelId);
    if (!fullLabel) return;

    // Collect all child labels for deletion confirmation
    const allChildIds = collectChildLabelIds(fullLabel);
    const childCount = allChildIds.length - 1; // Exclude the parent label itself

    // Show confirmation with child count info
    setLabelToDelete({
      id: labelId,
      name: fullLabel.name,
      childCount: childCount,
    });
    setShowDeleteDialog(true);
    setActiveSelect(null);
  };

  const handleLabelClick = (labelId: string, labelName: string) => {
    // Navigate to the labels page with the selected label
    window.location.href = `/labels?label=${labelId}&labelName=${encodeURIComponent(
      labelName,
    )}`;
  };

  const startRename = (labelId: string, currentName: string) => {
    // Find the full label in tree structure
    const findLabelInTree = (
      labels: GmailLabel[],
      id: string,
    ): GmailLabel | null => {
      for (const label of labels) {
        if (label.label_id === id) return label;
        if (label.children) {
          const found = findLabelInTree(label.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const fullLabel = findLabelInTree(gmailLabels, labelId);
    const fullLabelName = fullLabel?.name || currentName;

    setSelectedLabel({ id: labelId, name: fullLabelName });
    setShowRenameDialog(true);
    setActiveSelect(null);
  };

  const handleSelectAction = (
    action: string,
    labelId: string,
    labelName: string,
  ) => {
    if (action === "rename") {
      startRename(labelId, labelName);
    } else if (action === "delete") {
      handleDeleteLabel(labelId, labelName);
    }
    setActiveSelect(null);
  };

  // Tree Label Component for recursive rendering
  const TreeLabelItem: React.FC<{
    label: GmailLabel;
    depth: number;
  }> = ({ label, depth }) => {
    const hasChildren = label.children && label.children.length > 0;
    const displayName = label.name.split("/").pop() || label.name;

    return (
      <li key={label.label_id}>
        <div
          className="flex items-center justify-between px-2 py-0.5 text-sm text-foreground hover:bg-hovered rounded transition-colors group"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <button
            className="flex font-medium items-center gap-2 min-w-0 flex-1 text-left"
            onClick={() => handleLabelClick(label.label_id, label.name)}
          >
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLabelExpansion(label.label_id);
                  }}
                  className="p-0.5 hover:bg-muted-foreground/20 rounded transition-colors"
                >
                  <ChevronDownIcon
                    className={`w-3 h-3 text-muted-foreground transition-transform ${
                      label.isExpanded ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>
              )}
              <FolderIcon className="w-4 h-4 text-foreground flex-shrink-0" />
            </div>
            <span className="truncate">{displayName}</span>
          </button>

          <div className="flex items-center gap-1">
            {label.messages_unread > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center flex-shrink-0">
                {label.messages_unread}
              </span>
            )}

            {/* 3-dot menu */}
            <Select
              value=""
              onValueChange={(value: string) =>
                handleSelectAction(value, label.label_id, displayName)
              }
            >
              <SelectTrigger className="p-1 rounded hover:bg-muted-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center border-none bg-transparent shadow-none">
                <EllipsisHorizontalIcon className="w-3 h-3" />
              </SelectTrigger>
              <SelectContent className="font-sans" align="end" side="bottom">
                <SelectItem
                  className="border-none hover:bg-hovered"
                  value="rename"
                >
                  Rename
                </SelectItem>
                <SelectItem
                  value="delete"
                  className="text-red-600 border-none hover:bg-hovered hover:cursor-pointer focus:text-red-600"
                >
                  Delete
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && label.isExpanded && (
          <ul className="space-y-1">
            {label.children!.map((child) => (
              <TreeLabelItem
                key={child.label_id}
                label={child}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchGmailLabels();
      fetchLastSyncInfo(); // Also fetch sync info when user is available
    }
  }, [user]);

  // Close selects when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveSelect(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <aside className="fixed left-0 top-0 w-[270px] h-screen bg-card border-r border-border shadow-sm flex flex-col justify-between font-sans z-40 overflow-y-auto custom-scrollbar">
      <div>
        {/* Top Section: Logo and Profile */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/60">
          <div className="flex items-center gap-2">
            <Image
              src={rainboxlogo}
              alt="Rainbox logo"
              width={48}
              height={48}
              className="h-9 w-9 object-contain dark:invert"
            />
            <span className="text-lg font-bold">ZeroInbox</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.user_metadata?.avatar_url ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-xl shadow-xl border border-border bg-white p-0"
                >
                  <DropdownMenuLabel className="flex flex-col items-start px-4 pt-4 pb-2">
                    <span className="font-semibold text-base text-foreground">
                      {user.user_metadata?.name || "Name"}
                    </span>
                    <span className="text-xs text-muted-foreground break-all">
                      {user.email || "name@gmail.com"}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 px-4 py-2 cursor-pointer text-foreground hover:bg-muted">
                    <CreditCardIcon className="w-5 h-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Billing</span>
                      <span className="text-xs text-muted-foreground">
                        Current plan: Free
                      </span>
                    </div>
                    <span className="ml-auto text-xs underline text-primary cursor-pointer">
                      Manage
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer text-destructive hover:bg-destructive/10 font-medium"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/auth";
                    }}
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        {/* User Info */}
        <div className="flex items-center mt-2 gap-2 border px-2 py-2 mx-3 rounded-lg border-border bg-muted/40 hover:bg-muted/60 transition-colors">
          <img
            src="https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png"
            alt="Gmail"
            className="h-7 w-7"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">
              {user?.user_metadata?.name || "Name"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.email || "name@gmail.com"}
            </span>
          </div>
          <button className="ml-auto">
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {/* Navigation */}
        <nav className="px-3 mt-4 py-2">
          <div className="px-1 mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Overview
          </div>
          <ul className="space-y-1">
            <li>
              <a
                href="/dashboard"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-sm transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-hovered font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-hovered hover:text-foreground"
                }`}
              >
                <HomeIcon className="w-5 h-5" />
                Home
              </a>
            </li>
            <li>
              <a
                href="/subscriptions"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-sm transition-colors ${
                  pathname === "/subscriptions"
                    ? "bg-hovered font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-hovered hover:text-foreground"
                }`}
              >
                <EnvelopeIcon className="w-5 h-5" />
                Subscriptions
              </a>
            </li>
            <li>
              <a
                href="/rollup"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-sm transition-colors ${
                  pathname === "/rollup"
                    ? "bg-hovered font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-hovered hover:text-foreground"
                }`}
              >
                <InboxArrowDownIcon className="w-5 h-5" />
                Rollup
              </a>
            </li>
          </ul>
        </nav>
        {/* Folders/Labels */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={fetchGmailLabels}
              disabled={loadingLabels}
              className="text-md font-semibold text-foreground hover:text-foreground transition-colors"
            >
              Labels{" "}
            </button>
            <button
              className="p-1 rounded hover:bg-muted"
              onClick={() => setShowCreateLabelDialog(true)}
              disabled={loadingLabels}
              title="Create new label"
            >
              <FolderPlusIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <ul className="space-y-1 mt-1">
            {loadingLabels ? (
              <div className="flex items-center justify-center bg-transparent min-h-[200px]">
                <span className="inline-block w-6 h-6 border-2 border-t-primary rounded-full animate-spin" />
              </div>
            ) : gmailLabels.length > 0 ? (
              gmailLabels.map((label) => (
                <TreeLabelItem key={label.label_id} label={label} depth={0} />
              ))
            ) : (
              <li className="text-sm text-muted-foreground px-2 py-3">
                <div className="flex flex-col items-center justify-center space-y-2 py-4">
                  <FolderPlusIcon className="w-8 h-8 text-muted-foreground/60" />
                  <div className="text-center space-y-1">
                    <div className="font-medium">No labels found</div>
                    <div className="text-xs text-muted-foreground/80">
                      Create your first label to organize emails
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateLabelDialog(true)}
                    className="text-xs text-primary hover:text-primary/80 underline transition-colors mt-1"
                  >
                    Create Label
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom Section: Sync Info */}
      <div className="px-4 py-3 border-t border-border bg-muted/40">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {lastSyncedText}
              </span>
            </div>
            <button
              className="px-3 py-1 text-xs rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors border border-primary/20 flex-shrink-0 ml-2"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync"}
            </button>
          </div>
          <div className="w-full h-2 bg-border rounded mt-1 mb-1 overflow-hidden">
            <div
              className="h-2 bg-green-500 rounded"
              style={{ width: syncProgress + "%" }}
            ></div>
          </div>
          <div className="text-xs text-muted-foreground">{nextSyncText}</div>
        </div>
      </div>

      {/* Create Label Dialog */}
      <CreateLabelDialog
        isOpen={showCreateLabelDialog}
        onClose={() => setShowCreateLabelDialog(false)}
        onLabelCreated={fetchGmailLabels}
      />

      {/* Rename Label Dialog */}
      <RenameLabelDialog
        isOpen={showRenameDialog}
        onClose={() => {
          setShowRenameDialog(false);
          setSelectedLabel(null);
        }}
        labelId={selectedLabel?.id || null}
        currentName={selectedLabel?.name || ""}
        onLabelRenamed={() => {
          fetchGmailLabels();
          setShowRenameDialog(false);
          setSelectedLabel(null);
        }}
      />

      {/* Delete Label Dialog */}
      <DeleteLabelDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setLabelToDelete(null);
        }}
        labelId={labelToDelete?.id || null}
        labelName={labelToDelete?.name || ""}
        childCount={labelToDelete?.childCount || 0}
        onLabelDeleted={() => {
          fetchGmailLabels();
          setShowDeleteDialog(false);
          setLabelToDelete(null);
        }}
      />
    </aside>
  );
};

export default Sidebar;
