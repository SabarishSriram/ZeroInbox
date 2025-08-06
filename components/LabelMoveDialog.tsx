"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { ChevronDownIcon, FolderIcon } from "@heroicons/react/24/solid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

interface LabelMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMoveToLabel: (labelId: string) => Promise<void>;
}

export const LabelMoveDialog: React.FC<LabelMoveDialogProps> = ({
  isOpen,
  onClose,
  onMoveToLabel,
}) => {
  const [selectedLabelId, setSelectedLabelId] = useState<string>("INBOX");
  const [isMoving, setIsMoving] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<GmailLabel[]>([]);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchLabels();
    }
  }, [isOpen]);

  const fetchLabels = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.provider_token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/gmail/labels", {
        headers: {
          Authorization: `Bearer ${session.session.provider_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const labels = data.labels || [];

        // Filter to show system labels and user labels
        const filteredLabels = labels.filter(
          (label: GmailLabel) =>
            label.type === "system" || label.type === "user"
        );

        setAvailableLabels(filteredLabels);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch labels");
      }
    } catch (error) {
      console.error("Error fetching labels:", error);
      setError("Failed to load labels");
    }
  };

  const handleMove = async () => {
    if (!selectedLabelId || selectedLabelId === "none") {
      setError("Please select a label");
      return;
    }

    setIsMoving(true);
    setError("");

    try {
      await onMoveToLabel(selectedLabelId);
      onClose();
    } catch (error) {
      console.error("Error moving emails:", error);
      setError("Failed to move emails. Please try again.");
    } finally {
      setIsMoving(false);
    }
  };

  const selectedLabel = availableLabels.find(
    (label) => label.id === selectedLabelId
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Label</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select destination label:
            </label>
            <div className="relative">
              <button
                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                className="w-full p-2 text-left border rounded-md hover:bg-gray-50 flex items-center justify-between"
                disabled={isMoving}
              >
                <div className="flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-gray-600" />
                  <span>{selectedLabel?.name || "Select a label"}</span>
                </div>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${
                    showLabelDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showLabelDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {availableLabels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => {
                        setSelectedLabelId(label.id);
                        setShowLabelDropdown(false);
                      }}
                      className="w-full p-2 text-left hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FolderIcon className="h-4 w-4 text-gray-600" />
                      <span>{label.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving || !selectedLabelId}>
            {isMoving ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
