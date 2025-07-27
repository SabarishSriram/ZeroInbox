import React from "react";
import {
  EnvelopeOpenIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { DomainCardProps } from "./types";

const DomainCard: React.FC<DomainCardProps> = ({
  domain,
  senderCount,
  totalEmails,
  monthlyAvg,
}) => {
  return (
    <div className="bg-background shadow-md rounded-lg border-2 border-border p-4 flex flex-col items-center relative">
      <div className="flex flex-col items-center mb-2">
        <div className="w-12 h-12 flex items-center justify-center mb-2">
          <img
            src={`https://logo.clearbit.com/${domain}`}
            alt={domain}
            className="w-12 h-12 rounded-md"
            width={32}
            height={32}
          />
        </div>
        <div className="text-lg font-semibold text-foreground text-center">
          {domain}
        </div>
      </div>
      <div className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1 mb-2">
        @ {senderCount || 5} sender email address
      </div>
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="flex items-center gap-1">
          <EnvelopeOpenIcon className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-base text-foreground">
            {totalEmails}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <RectangleStackIcon className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold text-base text-foreground">
            {monthlyAvg}
          </span>
          <span className="text-xs text-muted-foreground">monthly</span>
        </div>
      </div>
      <button className="w-full mt-2 py-2 rounded-lg bg-foreground text-background font-semibold text-sm hover:bg-hovered transition">
        Take action
      </button>
    </div>
  );
};

export default DomainCard;
