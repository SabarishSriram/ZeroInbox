import React from "react";
import { DashboardContentProps } from "./types";
import OverviewCards from "./OverviewCards";
import DomainCard from "./DomainCard";
import EmptyState from "./EmptyState";

const DashboardContent: React.FC<DashboardContentProps> = ({
  user,
  gmailData,
  onShowModal,
}) => {
  const sortedData = [...gmailData].sort(
    (a, b) => b.total_emails - a.total_emails
  );

  return (
    <div className="container bg-background mx-auto px-7 py-3">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Home</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.user_metadata.name}
        </p>
      </div>

      {/* Stats Grid */}
      {gmailData && gmailData.length > 0 ? (
        <div className="space-y-6">
          {/* Overview Cards */}
          <OverviewCards gmailData={gmailData} />

          <p className="font-semibold text-lg">Brands Reaching in your Inbox</p>

          {/* Domain Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedData.map((item, idx) => (
              <DomainCard
                key={idx}
                domain={item.domain}
                senderCount={item.sender_count}
                totalEmails={item.total_emails}
                monthlyAvg={item.monthly_avg}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState onShowModal={onShowModal} />
      )}
    </div>
  );
};

export default DashboardContent;
