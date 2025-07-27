import { User } from "@supabase/supabase-js";

export interface EmailStats {
  domain: string;
  sender_count: number;
  total_emails: number;
  monthly_avg: number;
}

export interface GmailConnectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isConnecting: boolean;
  connectionStatus: string;
  connectionProgress: number;
  onConnectGmail: () => void;
}

export interface OverviewCardsProps {
  gmailData: EmailStats[];
}

export interface DomainCardProps {
  domain: string;
  senderCount: number;
  totalEmails: number;
  monthlyAvg: number;
}

export interface DashboardContentProps {
  user: User;
  gmailData: EmailStats[];
  onShowModal: () => void;
}

export interface EmptyStateProps {
  onShowModal: () => void;
}
