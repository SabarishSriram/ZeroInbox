import React from "react";
import { OverviewCardsProps } from "./types";

const cardBaseClasses =
  "rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow";

const labelClasses =
  "text-xs font-medium uppercase tracking-wide text-muted-foreground";
const valueClasses = "mt-1.5 text-xl sm:text-2xl font-semibold text-foreground";
const subTextClasses = "mt-1 text-xs text-muted-foreground";

const OverviewCards: React.FC<OverviewCardsProps> = ({ gmailData }) => {
  const totalEmails = gmailData.reduce(
    (sum, item) => sum + item.total_emails,
    0,
  );
  // Since we're fetching 1 month's data, show total monthly emails instead of average
  const monthlyTotal = gmailData.reduce(
    (sum, item) => sum + item.monthly_avg,
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
      <div className={cardBaseClasses}>
        <span className={labelClasses}>Total Domains</span>
        <p className={valueClasses}>{gmailData.length}</p>
        <p className={subTextClasses}>Unique brands detected from your inbox</p>
      </div>

      <div className={cardBaseClasses}>
        <span className={labelClasses}>Total Emails</span>
        <p className={valueClasses}>{totalEmails}</p>
        <p className={subTextClasses}>Messages analyzed across all senders</p>
      </div>

      <div className={cardBaseClasses}>
        <span className={labelClasses}>This Month</span>
        <p className={valueClasses}>{monthlyTotal}</p>
        <p className={subTextClasses}>Estimated volume over the last 30 days</p>
      </div>
    </div>
  );
};

export default OverviewCards;
