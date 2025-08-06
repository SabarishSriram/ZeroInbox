export interface EmailStats {
  domain: string;
  sender_count: number;
  total_emails: number;
  monthly_avg: number;
  recent_emails?: number;
}

export interface UnsubscribedSender {
  id: number;
  sender: string;
  action: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface SafeSender {
  id: number;
  domain: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface TabNavigationProps {
  tabs: string[];
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export interface SearchAndControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  filterBy: string;
  onFilterChange: (filter: string) => void;
  gmailLabels?: any[];
}

export interface UnsubscribeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  target: EmailStats | null;
  onUnsubscribeAction: (action: "archive" | "delete") => void;
}

export interface SubscriptionItemProps {
  item: EmailStats;
  onUnsubscribeClick: (item: EmailStats) => void;
  onKeepClick: (item: EmailStats) => void;
  onMoveToLabelClick?: (item: EmailStats) => void;
  isSelected?: boolean;
  onSelectionChange?: (item: EmailStats, selected: boolean) => void;
}

export interface UnsubscribedItemProps {
  item: UnsubscribedSender;
  onResubscribe?: (sender: string) => void;
}

export interface EmptyStateProps {
  type: "inbox" | "unsubscribed" | "safe";
  searchTerm?: string;
}
