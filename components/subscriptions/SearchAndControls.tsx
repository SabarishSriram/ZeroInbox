import React from "react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchAndControlsProps } from "./types";

const SearchAndControls: React.FC<SearchAndControlsProps> = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  gmailLabels = [],
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
        {/* Filter Dropdown - Labels */}
        <Select value={filterBy} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[180px] focus:outline-none focus:ring-0 focus:border-border focus-visible:ring-0 focus-visible:outline-none">
            <SelectValue placeholder="Filter by label..." />
          </SelectTrigger>
          <SelectContent className="font-sans">
            <SelectItem 
              className="hover:bg-hovered cursor-pointer border-none outline-none ring-0 hover:ring-0 focus:ring-0"
              value="All"
              style={{ 
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              All
            </SelectItem>
            <SelectItem 
              className="hover:bg-hovered cursor-pointer border-none outline-none ring-0 hover:ring-0 focus:ring-0"
              value="Inbox"
              style={{ 
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              Inbox
            </SelectItem>
            {gmailLabels.map((label) => (
              <SelectItem 
                key={label.id}
                className="hover:bg-hovered cursor-pointer border-none outline-none ring-0 hover:ring-0 focus:ring-0"
                value={label.id}
                style={{ 
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important'
                }}
              >
                {label.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] focus:outline-none focus:ring-0 focus:border-border focus-visible:ring-0 focus-visible:outline-none">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="font-sans">
            <SelectItem 
              className="hover:bg-hovered cursor-pointer border-none outline-none ring-0 hover:ring-0 focus:ring-0" 
              value="Email count desc"
              style={{ 
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              Most Emails
            </SelectItem>
            <SelectItem 
              className="hover:bg-hovered cursor-pointer border-none outline-none ring-0 " 
              value="Email count asc"
              style={{ 
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important'
              }}
            >
              Least Emails
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SearchAndControls;
