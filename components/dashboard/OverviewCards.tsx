import React from "react";
import { OverviewCardsProps } from "./types";

const OverviewCards: React.FC<OverviewCardsProps> = ({ gmailData }) => {
  const totalEmails = gmailData.reduce(
    (sum, item) => sum + item.total_emails,
    0
  );
  // Since we're fetching 1 month's data, show total monthly emails instead of average
  const monthlyTotal = gmailData.reduce(
    (sum, item) => sum + item.monthly_avg,
    0
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card hover:shadow-md border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Total Domains
        </h3>
        <p className="text-2xl font-bold text-foreground">{gmailData.length}</p>
      </div>
      <div className="bg-card hover:shadow-md border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Total Emails
        </h3>
        <p className="text-2xl font-bold text-foreground">{totalEmails}</p>
      </div>
      <div className="bg-card hover:shadow-md border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          This Month
        </h3>
        <p className="text-2xl font-bold text-foreground">{monthlyTotal}</p>
      </div>
    </div>
  );
};

export default OverviewCards;
