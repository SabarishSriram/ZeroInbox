import React from "react";
import { CheckCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { SubscriptionItemProps } from "./types";

const SubscriptionItem: React.FC<SubscriptionItemProps> = ({
  item,
  onUnsubscribeClick,
  onKeepClick,
}) => {
  return (
    <div className="flex items-center gap-4 p-3 bg-white border border-border rounded-xl hover:bg-hovered/50 transition-colors">
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
              <button
                onClick={() => onKeepClick(item)}
                className="px-3 py-1 flex items-center bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/80 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                Keep
              </button>
              <button
                className="px-3 py-1 flex items-center bg-destructive/80 text-primary-foreground text-xs font-medium rounded hover:bg-destructive transition-colors"
                onClick={() => onUnsubscribeClick(item)}
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                Unsubscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionItem;
