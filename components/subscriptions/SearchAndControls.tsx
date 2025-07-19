import React from "react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { SearchAndControlsProps } from "./types";

const SearchAndControls: React.FC<SearchAndControlsProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search Senders"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-1 border border-border rounded-md bg-white text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Filter and Sort */}
      <div className="flex items-center gap-3">
        {/* Filter Dropdown */}
        <div className="relative">
          <select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value)}
            className="appearance-none bg-white border border-border rounded-md px-4 py-1 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="All">Filter</option>
            <option value="High Volume">High Volume</option>
            <option value="Low Volume">Low Volume</option>
          </select>
          <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="appearance-none bg-white border border-border rounded-md px-4 py-1 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="Recent">Sort - Recent</option>
            <option value="Email count">Email count</option>
            <option value="Monthly count">Monthly count</option>
          </select>
          <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Sort Direction */}
        <button className="p-1 border border-border rounded-sm hover:bg-hovered transition-colors">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SearchAndControls;
