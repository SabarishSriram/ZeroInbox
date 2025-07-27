import React from "react";
import { EmptyStateProps } from "./types";

const EmptyState: React.FC<EmptyStateProps> = ({ onShowModal }) => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <img
          src="https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png"
          alt="Gmail"
          className="w-10 h-10"
        />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        No Gmail Data
      </h3>
      <p className="text-muted-foreground mb-4">
        Connect your Gmail account to see your email statistics.
      </p>
      <button
        onClick={onShowModal}
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
      >
        Connect Gmail
      </button>
    </div>
  );
};

export default EmptyState;
