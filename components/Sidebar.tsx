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
  onLabelDeleted: () => void;
}> = ({ isOpen, onClose, labelId, labelName, onLabelDeleted }) => {
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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/gmail-labels/delete", {
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
          </div>

          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            <div className="font-medium mb-1">⚠️ Warning:</div>
            <div>
              This action cannot be undone. The label will be permanently
              removed from your Gmail account.
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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GmailLabel {
  id: number;
  label_id: string;
  name: string;
  type: string;
  messages_total: number;
  messages_unread: number;
  user_id: string;
}

const Sidebar = () => {
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
  } | null>(null);

  const pathname = usePathname();

  const fetchGmailLabels = async () => {
    if (!user) return;

    setLoadingLabels(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.user) {
        console.error("No valid session found");
        return;
      }

      console.log("Fetching Gmail labels using streamlined flow...");

      // Use the streamlined API that does: Gmail → Database → Frontend
      // Following the same pattern as email analyze API
      const response = await fetch("/api/gmail-labels", {
        method: "POST", // Changed to POST like email analyze
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          accessToken: session.session.provider_token, // Use provider_token for Gmail API
          userId: session.session.user.id,
          userEmail: session.session.user.email,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("Gmail labels response data:", data);
        console.log("Gmail labels flow completed:", data.flow);
        console.log("Fetched", data.count, "labels");
        console.log(
          "Storage status:",
          data.stored ? "✓ Stored in DB" : "✗ Not stored"
        );

        if (data.storageMessage) {
          console.log("Storage message:", data.storageMessage);
        }

        // Filter labels for sidebar display - only show user-created labels
        const userLabels = (data.labels || []).filter((label: any) => {
          // Only user-created labels
          if (label.type !== "user") return false;

          // Check if the label name (or any part of nested label) contains system labels
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
            ].includes(part.toUpperCase())
          );

          return !hasSystemLabel; // Only include if no system labels found
        });

        // Sort labels to show parent labels before their children
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

        // Convert Gmail API format to our GmailLabel format
        const formattedLabels: GmailLabel[] = sortedLabels.map(
          (label: any) => ({
            id: 0, // Will be set by database
            label_id: label.id,
            name: label.name,
            type: label.type || "user",
            messages_total: label.messagesTotal || 0,
            messages_unread: label.messagesUnread || 0,
            user_id: session.session.user.id,
          })
        );

        setGmailLabels(formattedLabels);
      } else {
        console.error("Response not ok. Status:", response.status);
        try {
          const errorData = await response.json();
          console.error("Error response data:", errorData);
          console.error("Failed to fetch Gmail labels:", errorData);

          if (errorData.error?.includes("access token")) {
            console.error("Gmail access token issue - user needs to reconnect");
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          console.error("Raw response text:", await response.text());
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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

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
    // Open delete confirmation dialog instead of browser alert
    const fullLabel = gmailLabels.find((label) => label.label_id === labelId);
    const fullLabelName = fullLabel?.name || labelName;

    setLabelToDelete({ id: labelId, name: fullLabelName });
    setShowDeleteDialog(true);
    setActiveSelect(null);
  };

  const handleLabelClick = (labelId: string, labelName: string) => {
    // Navigate to the labels page with the selected label
    window.location.href = `/labels?label=${labelId}&labelName=${encodeURIComponent(
      labelName
    )}`;
  };

  const startRename = (labelId: string, currentName: string) => {
    // For nested labels, we need to preserve the full path structure
    // currentName here is the display name, but we need the full label name
    const fullLabel = gmailLabels.find((label) => label.label_id === labelId);
    const fullLabelName = fullLabel?.name || currentName;

    setSelectedLabel({ id: labelId, name: fullLabelName });
    setShowRenameDialog(true);
    setActiveSelect(null);
  };

  const handleSelectAction = (
    action: string,
    labelId: string,
    labelName: string
  ) => {
    if (action === "rename") {
      startRename(labelId, labelName);
    } else if (action === "delete") {
      handleDeleteLabel(labelId, labelName);
    }
    setActiveSelect(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchGmailLabels();
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
    <aside className="fixed left-0 top-0 w-[270px] h-screen bg-sidebar shadow-lg flex flex-col justify-between font-sans z-50 overflow-y-auto custom-scrollbar">
      <div>
        {/* Top Section: Logo and Profile */}
        <div className="flex items-center justify-between px-4 py-3">
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
        <div className="flex items-center mt-1 gap-2 border-2 px-2 py-2 mx-2 rounded-lg border-border hover:bg-hovered">
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
        <nav className="px-4 mt-3 py-2">
          <ul className="space-y-1">
            <li>
              <a
                href="/dashboard"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-foreground transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-hovered font-semibold"
                    : "hover:bg-hovered"
                }`}
              >
                <HomeIcon className="w-5 h-5 text-foreground" />
                Home
              </a>
            </li>
            <li>
              <a
                href="/subscriptions"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-foreground transition-colors ${
                  pathname === "/subscriptions"
                    ? "bg-hovered font-semibold"
                    : "hover:bg-hovered"
                }`}
              >
                <EnvelopeIcon className="w-5 h-5 text-foreground" />
                Subscriptions
              </a>
            </li>
          </ul>
        </nav>
        {/* Folders/Labels */}
        <div className="px-4 py-2 border-">
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
          <ul className="space-y-1">
            {loadingLabels ? (
              <div className="flex items-center justify-center bg-transparent min-h-[200px]">
                <span className="inline-block w-6 h-6 border-2 border-t-primary rounded-full animate-spin" />
              </div>
            ) : gmailLabels.length > 0 ? (
              gmailLabels.map((label) => {
                // Check if this is a nested label
                const isNested = label.name.includes("/");
                const labelParts = label.name.split("/");
                const displayName = isNested
                  ? labelParts[labelParts.length - 1]
                  : label.name;
                const indentLevel = labelParts.length - 1;

                // For nested labels, show the full path context
                const parentPath = isNested
                  ? labelParts.slice(0, -1).join(" > ")
                  : "";

                return (
                  <li key={label.label_id}>
                    <div
                      className="flex items-center justify-between px-2 py-0.5 text-sm text-foreground hover:bg-hovered rounded transition-colors group"
                      style={{ paddingLeft: `${8 + indentLevel * 16}px` }}
                    >
                      <button
                        className="flex font-medium items-center gap-2 min-w-0 flex-1 text-left"
                        onClick={() =>
                          handleLabelClick(label.label_id, label.name)
                        }
                      >
                        {isNested ? (
                          <div className="flex items-center gap-1">
                            <FolderIcon className="w-4 h-4 text-foreground flex-shrink-0" />
                          </div>
                        ) : (
                          <FolderIcon className="w-4 h-4 text-foreground flex-shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">{displayName}</span>
                          {isNested && (
                            <span className="text-xs text-muted-foreground/70 truncate">
                              {parentPath}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        {label.messages_unread > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center flex-shrink-0">
                            {label.messages_unread}
                          </span>
                        )}

                        {/* 3-dot menu with shadcn Select */}
                        <Select
                          value=""
                          onValueChange={(value: string) =>
                            handleSelectAction(
                              value,
                              label.label_id,
                              displayName
                            )
                          }
                        >
                          <SelectTrigger className="p-1 rounded hover:bg-muted-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center border-none bg-transparent shadow-none"></SelectTrigger>
                          <SelectContent
                            className="font-sans"
                            align="end"
                            side="bottom"
                          >
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
                  </li>
                );
              })
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
      <div className="px-4 py-3 border-t border-border bg-muted/30"></div>

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
