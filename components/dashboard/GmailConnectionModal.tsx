import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { GmailConnectionModalProps } from "./types";

const GmailConnectionModal: React.FC<GmailConnectionModalProps> = ({
  isOpen,
  onOpenChange,
  isConnecting,
  connectionStatus,
  connectionProgress,
  onConnectGmail,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className=" [&>button.absolute.right-4.top-4]:hidden w-[340px] rounded-2xl bg-content font-sans shadow-xl border-0 p-4">
        {isConnecting ? (
          <div className="flex flex-col items-center justify-center p-10 min-h-[220px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mb-4" />
            <span className="text-base text-black font-medium">
              {connectionStatus || "Connecting to Gmail..."}
            </span>
          </div>
        ) : (
          <>
            {/* Blue progress bar with padding */}
            <div className="w-full pt-2 pb-2">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-1 transition-all duration-300 bg-[--primary-blue] rounded-full"
                  style={{
                    width: isConnecting ? `${connectionProgress}%` : "100%",
                  }}
                />
              </div>
            </div>
            <div className="py-2 px-6 flex flex-col items-center font-sans">
              <DialogHeader className="w-full">
                <DialogTitle className="text-xl font-bold text-center mb-1">
                  Connect an email account
                </DialogTitle>
                <DialogDescription className="text-center text-muted-foreground mb-4">
                  Connect an account to start cleaning
                </DialogDescription>
              </DialogHeader>
              {/* Provider Buttons */}
              <div className="w-full flex flex-col gap-4 mb-4">
                <button
                  onClick={onConnectGmail}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border hover:bg-hovered text-foreground font-semibold text-base shadow-sm transition-colors"
                >
                  <img
                    src="https://static.vecteezy.com/system/resources/previews/020/964/377/non_2x/gmail-mail-icon-for-web-design-free-png.png"
                    alt="Gmail"
                    className="h-6 w-6"
                  />
                  Connect Gmail account
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border hover:bg-hovered text-foreground font-semibold text-base shadow-sm transition-colors">
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHhjp6s-vH8a-3pal9FKfqJfG992bdlw17vQ&s"
                    alt="Outlook"
                    className="h-6 w-6"
                  />
                  Connect Outlook account
                </button>
              </div>
              {/* Privacy Note */}
              <div className="w-full flex flex-col items-center mt-2 mb-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ShieldCheckIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Privacy Protected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Please note, we need additional access to your email account.
                  We only access absolutely required data and store it in secure
                  storage. We do not see or share your email data.
                </p>
              </div>
              <DialogFooter className="w-full mt-2">
                <DialogClose asChild>
                  <button className="w-full text-sm text-muted-foreground underline hover:text-primary mt-2">
                    Close
                  </button>
                </DialogClose>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GmailConnectionModal;
