import React from "react";
import { CheckCircleIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { EmptyStateProps } from "./types";

const EmptyState: React.FC<EmptyStateProps> = ({ type, searchTerm }) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case "inbox":
        return {
          icon: <EnvelopeIcon className="w-8 h-8 text-muted-foreground" />,
          title: "No Subscriptions Found",
          description: searchTerm
            ? "Try adjusting your search terms."
            : "Connect your email account to see subscriptions.",
        };
      case "unsubscribed":
        return {
          icon: <CheckCircleIcon className="w-8 h-8 text-muted-foreground" />,
          title: "No Unsubscribed Senders",
          description: searchTerm
            ? "No unsubscribed senders match your search."
            : "You haven't unsubscribed from any senders yet.",
        };
      case "safe":
        return {
          icon: <CheckCircleIcon className="w-8 h-8 text-muted-foreground" />,
          title: "Marked Safe",
          description: "This feature is coming soon.",
        };
      default:
        return {
          icon: <EnvelopeIcon className="w-8 h-8 text-muted-foreground" />,
          title: "No Data",
          description: "No data available.",
        };
    }
  };

  const { icon, title, description } = getEmptyStateContent();

  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default EmptyState;
