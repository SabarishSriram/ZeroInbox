import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@supabase/supabase-js";

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

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
}

export const EmailPreviewDialog: React.FC<EmailPreviewDialogProps> = ({
  isOpen,
  onClose,
  email,
}) => {
  const [emailBody, setEmailBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bodyFetched, setBodyFetched] = useState(false);

  // Reset state when dialog opens with new email
  useEffect(() => {
    if (isOpen && email) {
      setEmailBody("");
      setBodyFetched(false);
      setError("");
    } else if (!isOpen) {
      // Reset everything when dialog closes
      setEmailBody("");
      setBodyFetched(false);
      setError("");
      setLoading(false);
    }
  }, [isOpen, email]);

  const fetchEmailBody = async () => {
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("Authentication required");
        return;
      }

      // Fetch full email content from Gmail API
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${session.session.provider_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Extract email body from the payload
        let body = "";
        if (data.payload) {
          if (data.payload.body?.data) {
            // Simple text body
            body = atob(
              data.payload.body.data.replace(/-/g, "+").replace(/_/g, "/")
            );
          } else if (data.payload.parts) {
            // Multipart email, find text/html or text/plain part
            const textPart = data.payload.parts.find(
              (part: any) =>
                part.mimeType === "text/html" || part.mimeType === "text/plain"
            );
            if (textPart?.body?.data) {
              body = atob(
                textPart.body.data.replace(/-/g, "+").replace(/_/g, "/")
              );
            }
          }
        }

        setEmailBody(body || "No content available");
        setBodyFetched(true);
      } else {
        setError("Failed to fetch email content");
      }
    } catch (error) {
      setError("An error occurred while fetching email content");
    } finally {
      setLoading(false);
    }
  };

  const handleShowBody = () => {
    if (!bodyFetched) {
      fetchEmailBody();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Strip HTML tags for cleaner display
  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl h-[80vh] font-sans rounded-2xl border-0 p-0 overflow-hidden"
        style={{
          animation: isOpen
            ? "preview-enter 0.3s ease-out"
            : "preview-exit 0.2s ease-in",
        }}
      >
        {email && (
          <>
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg font-bold text-foreground mb-2 leading-tight">
                    {email.subject || "No Subject"}
                  </DialogTitle>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">From:</span> {email.from}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Date:</span>{" "}
                      {formatDate(email.date)}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <div className="p-6 h-full overflow-y-auto">
                {/* Email Info */}
                <div className="mb-6">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">
                      Email Preview
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {email.snippet || "No preview available"}
                    </p>
                  </div>
                </div>

                {/* Show Body Button or Body Content */}
                {!bodyFetched ? (
                  <div className="flex justify-center">
                    <button
                      onClick={handleShowBody}
                      disabled={loading}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Loading email content...
                        </>
                      ) : (
                        "Show Email Content"
                      )}
                    </button>
                  </div>
                ) : error ? (
                  <div className="text-center">
                    <div className="text-red-500 font-medium mb-2">Error</div>
                    <div className="text-muted-foreground mb-4">{error}</div>
                    <button
                      onClick={handleShowBody}
                      className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium text-foreground mb-4">
                      Email Content
                    </h4>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed bg-background border border-border rounded-lg p-4">
                        {stripHtml(emailBody)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>

      <style jsx global>{`
        @keyframes preview-enter {
          from {
            opacity: 0;
            transform: translate(-50%, -45%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes preview-exit {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -45%) scale(0.9);
          }
        }

        [data-radix-dialog-overlay] {
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
        }
      `}</style>
    </Dialog>
  );
};
