import React from "react";
import { TabNavigationProps } from "./types";

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  selectedTab,
  onTabChange,
}) => {
  return (
    <div className="inline-flex rounded-full bg-muted p-1 border border-border/60">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
            selectedTab === tab
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
