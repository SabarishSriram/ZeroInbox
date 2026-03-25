import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EnvelopeOpenIcon,
  RectangleStackIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { DomainCardProps } from "./types";

const DomainCard: React.FC<DomainCardProps> = ({
  domain,
  senderCount,
  totalEmails,
  monthlyAvg,
}) => {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const handleTakeAction = () => {
    // Navigate to subscriptions page with domain filter
    router.push(`/subscriptions?domain=${encodeURIComponent(domain)}`);
  };

  return (
    <div className="flex flex-col items-stretch rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center mb-3">
        <div className="w-12 h-12 flex items-center justify-center mb-2 rounded-lg bg-muted overflow-hidden">
          {!imageError ? (
            <img
              src={`https://logos.hunter.io/${domain}`}
              alt={domain}
              className="w-full h-full object-contain"
              width={32}
              height={32}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <EnvelopeIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <p className="mt-1 text-base font-semibold text-foreground text-center truncate max-w-[11rem]">
          {domain}
        </p>
      </div>

      <div className="mb-3 flex items-center justify-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          @ {senderCount || 0} sender{(senderCount || 0) === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <EnvelopeOpenIcon className="w-4 h-4" />
          <span className="text-xs">Total emails</span>
        </div>
        <span className="text-base font-semibold text-foreground">
          {totalEmails}
        </span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RectangleStackIcon className="w-4 h-4" />
          <span className="text-xs">Per month</span>
        </div>
        <span className="text-base font-semibold text-foreground">
          {monthlyAvg}
        </span>
      </div>

      <button
        onClick={handleTakeAction}
        className="mt-auto w-full rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-hovered transition-colors"
      >
        Take action
      </button>
    </div>
  );
};

export default DomainCard;
