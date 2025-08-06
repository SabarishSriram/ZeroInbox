import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { EmailPreviewDialog } from "./EmailPreviewDialog";
import { EmailStats } from "./types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  internalDate: string;
}

interface RecentEmailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  emailStats?: EmailStats;
}

export const RecentEmailsDialog: React.FC<RecentEmailsDialogProps> = ({
  isOpen,
  onClose,
  domain,
  emailStats,
}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen && domain) {
      fetchRecentEmails();
    }
  }, [isOpen, domain]);

  const fetchRecentEmails = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("Authentication required");
        return;
      }

      // Search for emails from this domain using Gmail API
      const searchQuery = `from:${domain}`;
      const response = await fetch(
        `/api/gmail-emails?labelId=INBOX&maxResults=10&query=${encodeURIComponent(
          searchQuery
        )}`,
        {
          headers: {
            Authorization: `Bearer ${session.session.provider_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmails(data.messages || []);
      } else {
        setError("Failed to fetch emails");
      }
    } catch (error) {
      setError("An error occurred while fetching emails");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setShowPreview(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1d ago";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    // Format as "22 Mar" style
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-xl h-[580px] font-sans rounded-2xl border-0 p-0 overflow-hidden"
          style={{
            animation: isOpen
              ? "dialog-enter 0.2s ease-out"
              : "dialog-exit 0.2s ease-in",
          }}
        >
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Domain Logo */}
                <div className="relative">
                  <Image
                    src={`https://logo.clearbit.com/${domain}`}
                    alt={domain}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain rounded"
                    onError={(e) => {
                      // Fallback to letter icon if logo fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.parentElement?.querySelector(
                        ".fallback-icon"
                      ) as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  {/* Fallback Icon */}
                  <div
                    className="fallback-icon w-8 h-8 bg-primary/10 rounded-lg items-center justify-center absolute top-0 left-0"
                    style={{ display: "none" }}
                  >
                    <span className="text-sm font-bold text-primary">
                      {domain.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                {/* Domain Info */}
                <div>
                  <DialogTitle className="text-base font-semibold text-foreground">
                    {domain.split("@")[0] || domain}
                  </DialogTitle>
                  <div className="text-xs text-muted-foreground">
                    email@{domain}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </DialogHeader>

          {/* Stats Section */}
          {emailStats && (
            <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <EnvelopeIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {emailStats.total_emails}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {emailStats.monthly_avg} monthly
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">20h ago</span>
                </div>
              </div>
            </div>
          )}

          {/* Subheader */}
          <div className="px-4 py-2 bg-muted/10 border-b border-border/30">
            <h4 className="text-sm font-medium text-foreground">
              Recent Emails (Click to view email)
            </h4>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading emails...
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-500 font-medium mb-1 text-sm">
                    Error
                  </div>
                  <div className="text-sm text-muted-foreground">{error}</div>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    No recent emails found
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 pt-2 h-full overflow-y-auto">
                <div className="space-y-1">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className="group py-2 px-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/30 last:border-b-0"
                      onClick={() => handleEmailClick(email)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-sm text-muted-foreground font-medium min-w-[3.5rem] pt-0.5">
                          {formatDateShort(email.date)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm text-foreground group-hover:text-primary transition-colors leading-relaxed">
                            {email.subject || "No Subject"}
                          </h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>

        <style jsx global>{`
          @keyframes dialog-enter {
            from {
              opacity: 0;
              transform: translate(-50%, -48%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          @keyframes dialog-exit {
            from {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            to {
              opacity: 0;
              transform: translate(-50%, -48%) scale(0.95);
            }
          }

          [data-radix-dialog-overlay] {
            backdrop-filter: blur(4px) !important;
            -webkit-backdrop-filter: blur(4px) !important;
          }
        `}</style>
      </Dialog>

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setSelectedEmail(null);
        }}
        email={selectedEmail}
      />
    </>
  );
};
