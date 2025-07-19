import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TrashIcon } from "@heroicons/react/24/outline";
import { UnsubscribeDialogProps } from "./types";

const UnsubscribeDialog: React.FC<UnsubscribeDialogProps> = ({
  isOpen,
  onOpenChange,
  target,
  onUnsubscribeAction,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[340px] rounded-2xl bg-content font-sans shadow-xl border-0 p-6">
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
              className="w-full py-3 rounded-xl border-2 border-border bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>Unsubscribe &amp; Archive</span>
            </button>
            <button
              onClick={() => onUnsubscribeAction("delete")}
              className="w-full py-3 rounded-xl border-2 border-border bg-destructive/90 text-primary-foreground font-semibold text-base shadow-md hover:bg-destructive transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-destructive"
            >
              <TrashIcon className="w-5 h-5" />
              <span>Unsubscribe &amp; Delete</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnsubscribeDialog;
