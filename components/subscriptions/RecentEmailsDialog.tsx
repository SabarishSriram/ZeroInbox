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
          className="max-w-xl max-h-[500px] font-sans rounded-2xl p-4 overflow-auto"
          style={{
            animation: isOpen
              ? "dialog-enter 0.2s ease-out"
              : "dialog-exit 0.2s ease-in",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
              </div>
            </div>
          ) : (
            <>
              {/* Header - logo, domain, email, stats, actions, close */}
              <div className="border-border border-b relative pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
                  style={{ border: 'none', outline: 'none' }}
                  aria-label="Close"
                >
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative flex-shrink-0">
                    <Image
                      src={`https://logo.clearbit.com/${domain}`}
                      alt={domain}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain rounded bg-white"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.parentElement?.querySelector(
                          ".fallback-icon"
                        ) as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <div
                      className="fallback-icon w-10 h-10 bg-primary/10 rounded flex items-center justify-center absolute top-0 left-0"
                      style={{ display: "none" }}
                    >
                      <span className="text-lg font-bold text-primary">
                        {domain.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-lg text-foreground leading-tight">
                      {domain.split("@")[0] || domain}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      email@{domain}
                    </div>
                  </div>
                </div>
                {emailStats && (
                  <div className="flex items-center gap-4 text-xs mb-3">
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
                )}
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded hover:bg-primary/20 transition-colors">
                    Keep
                  </button>
                  <button className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors">
                    Unsubscribe
                  </button>
                </div>
              </div>

              <div className="overflow-hidden">
                {error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-red-500 font-medium text-sm">
                        Error
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {error}
                      </div>
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
                  <div className="h-full overflow-y-auto">
                    <div className="">
                      {emails.map((email) => (
                        <div
                          key={email.id}
                          className="group py-1 px-2 hover:bg-hovered transition-colors cursor-pointer border-b border-border/30 last:border-b-0"
                          onClick={() => handleEmailClick(email)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-xs text-muted-foreground font-medium min-w-[3.5rem] pt-0.5">
                              {formatDateShort(email.date)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs text-foreground group-hover:text-primary transition-colors leading-relaxed font-semibold">
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
            </>
          )}
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

          .max-w-xl::-webkit-scrollbar,
          .h-full.overflow-y-auto::-webkit-scrollbar {
            width: 6px;
            background: transparent;
          }
          .max-w-xl::-webkit-scrollbar-thumb,
          .h-full.overflow-y-auto::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 4px;
          }
          .max-w-xl.dark::-webkit-scrollbar-thumb,
          .h-full.overflow-y-auto.dark::-webkit-scrollbar-thumb {
            background: #374151;
          }
          /* Firefox */
          .max-w-xl,
          .h-full.overflow-y-auto {
            scrollbar-width: thin;
            scrollbar-color: #d1d5db transparent;
          }
          .max-w-xl.dark,
          .h-full.overflow-y-auto.dark {
            scrollbar-color: #374151 transparent;
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
