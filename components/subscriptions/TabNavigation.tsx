import React from "react";
import { TabNavigationProps } from "./types";

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  selectedTab,
  onTabChange,
}) => {
  return (
    <div className="flex items-center gap-1 mb-6 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === tab
              ? "text-foreground border-b-2 border-primary"
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
