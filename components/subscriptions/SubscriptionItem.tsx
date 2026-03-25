import React, { useState } from "react";
import {
  CheckCircleIcon,
  TrashIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
} from "@heroicons/react/24/outline";
import {
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscriptionItemProps } from "./types";
import { RecentEmailsDialog } from "./RecentEmailsDialog";
import { CreateLabelDialog } from "@/components/CreateLabelDialog";

const SubscriptionItem: React.FC<SubscriptionItemProps> = ({
  item,
  onUnsubscribeClick,
  onKeepClick,
  onMoveToLabelClick,
  isSelected,
  onSelectionChange,
}) => {
  const [showRecentEmails, setShowRecentEmails] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showCreateLabelDialog, setShowCreateLabelDialog] = useState(false);

  // Function to calculate hours ago from updated_at timestamp
  const getHoursAgo = (updatedAt: string): string => {
    const now = new Date();
    const updatedDate = new Date(updatedAt);
    const diffInMs = now.getTime() - updatedDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 sm:p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:bg-muted/60 transition-colors transition-shadow">
      {/* Checkbox */}
      <div className="relative">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={(e) => onSelectionChange?.(item, e.target.checked)}
          className="sr-only"
        />
        <div
          onClick={() => onSelectionChange?.(item, !isSelected)}
          className={`w-5 h-5 rounded border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
            isSelected
              ? "bg-black border-black"
              : "bg-white border-gray-300 hover:border-gray-400"
          }`}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Logo */}
      {!imageError ? (
        <img
          src={`https://logos.hunter.io/${item.domain}`}
          alt={item.domain}
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
          <EnvelopeIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-base">
              {item.domain.charAt(0).toUpperCase() + item.domain.slice(1)}
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
                <span className="text-muted-foreground">
                  {getHoursAgo(item.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Tags and Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRecentEmails(true)}
              className="px-4 py-1 bg-primary/10 text-primary text-xs font-medium rounded hover:bg-primary/20 transition-colors cursor-pointer"
            >
              Recent Emails
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Keep Button with Dropdown */}
              <div className="relative inline-flex">
                <div className="flex bg-primary text-primary-foreground text-xs font-medium rounded overflow-hidden">
                  {/* Main Keep Button Area */}
                  <button
                    onClick={() => onKeepClick(item)}
                    className="px-4 py-1 flex items-center hover:bg-primary/80 transition-colors"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Keep
                  </button>

                  {/* Dropdown Trigger Area */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-2 py-1 hover:bg-primary/80 transition-colors flex items-center justify-center border-l border-primary-foreground/20">
                        <ChevronDownIcon className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 font-sans">
                      <DropdownMenuItem
                        onClick={() => {
                          // Handle show folders functionality
                          console.log("Show folders clicked for", item.domain);
                          // You can add your show folders logic here
                        }}
                        className="flex items-center gap-2"
                      >
                        <FolderIcon className="w-4 h-4" />
                        Show folders
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // Open the create label dialog
                          setShowCreateLabelDialog(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <FolderPlusIcon className="w-4 h-4" />
                        Create folders
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <button
                className="px-4 py-1 flex items-center bg-destructive/80 text-primary-foreground text-xs font-medium rounded hover:bg-destructive transition-colors"
                onClick={() => onUnsubscribeClick(item)}
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                Unsubscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Emails Dialog */}
      <RecentEmailsDialog
        isOpen={showRecentEmails}
        onClose={() => setShowRecentEmails(false)}
        domain={item.domain}
        emailStats={item}
      />

      {/* Create Label Dialog */}
      <CreateLabelDialog
        isOpen={showCreateLabelDialog}
        onClose={() => setShowCreateLabelDialog(false)}
        onLabelCreated={() => {
          // You can add any additional logic here when a label is created
          // For example, refresh the labels list or show a success message
          console.log("Label created for domain:", item.domain);
        }}
      />
    </div>
  );
};

export default SubscriptionItem;
