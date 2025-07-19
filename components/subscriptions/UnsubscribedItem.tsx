import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { ClockIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { UnsubscribedItemProps } from "./types";

const UnsubscribedItem: React.FC<UnsubscribedItemProps> = ({
  item,
  onResubscribe,
}) => {
  const handleResubscribe = async () => {
    if (onResubscribe) {
      await onResubscribe(item.sender);
    }
  };
  return (
    <div className="flex items-center gap-4 p-3 bg-white border border-border rounded-xl hover:bg-hovered/50 transition-colors">
      {/* Checkbox */}
      <input
        type="checkbox"
        className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
      />

      {/* Logo */}
      <Image
        src={`https://logo.clearbit.com/${
          item.sender.includes("@") ? item.sender.split("@")[1] : item.sender
        }`}
        alt={item.sender}
        width={32}
        height={32}
        className="w-8 h-8 object-contain"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-base">
              {item.sender}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              {item.action === "trashed" ? "Archived" : "Deleted"} on{" "}
              {new Date(item.updated_at).toLocaleDateString()}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(item.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Tags and Actions */}
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                item.action === "trashed"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {item.action === "trashed" ? "Archived" : "Deleted"}
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleResubscribe}
                className="px-3 py-1 flex items-center bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/80 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Resubscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribedItem;
