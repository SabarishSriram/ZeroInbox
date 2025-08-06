import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArchiveBoxArrowDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { UnsubscribeDialogProps } from "./types";

const UnsubscribeDialog: React.FC<UnsubscribeDialogProps> = ({
  isOpen,
  onOpenChange,
  target,
  onUnsubscribeAction,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[340px] rounded-2xl bg-content font-sans shadow-xl border-0 p-6"
        style={{
          animation: isOpen
            ? "dialog-enter 0.2s ease-out"
            : "dialog-exit 0.1s ease-in",
        }}
      >
        <DialogTitle className="text-2xl font-bold text-center mb-2 tracking-tight text-foreground">
          Unsubscribe from{" "}
          <span className="text-primary">{target?.domain}</span>
        </DialogTitle>
        <div className="text-center text-muted-foreground mb-7 text-base">
          What would you like to do with existing emails from this sender?
        </div>
        <DialogFooter className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => onUnsubscribeAction("archive")}
              className="w-full py-3 rounded-xl border-2 border-border bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
              style={{ outline: "none", boxShadow: "none" }}
            >
              <ArchiveBoxArrowDownIcon className="w-5 h-5" />
              <span>Unsubscribe &amp; Archive</span>
            </button>
            <button
              onClick={() => onUnsubscribeAction("delete")}
              className="w-full py-3 rounded-xl border-2 border-border bg-destructive/90 text-primary-foreground font-semibold text-base shadow-md hover:bg-destructive transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-0"
              style={{ outline: "none", boxShadow: "none" }}
            >
              <TrashIcon className="w-5 h-5" />
              <span>Unsubscribe &amp; Delete</span>
            </button>
          </div>
        </DialogFooter>
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

        [data-radix-dialog-content] {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          animation: dialog-enter 0.2s ease-out !important;
        }

        /* Remove any default browser button outlines in dialog */
        [data-radix-dialog-content] button {
          outline: none !important;
          box-shadow: none !important;
        }

        [data-radix-dialog-content] button:focus {
          outline: none !important;
        }

        /* Add backdrop blur to Radix Dialog overlay */
        [data-radix-dialog-overlay] {
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
        }
      `}</style>
    </Dialog>
  );
};

export default UnsubscribeDialog;
