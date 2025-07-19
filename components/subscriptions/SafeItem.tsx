import React from "react";
import { ShieldCheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ClockIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { SafeSender } from "./types";

interface SafeItemProps {
  item: SafeSender;
  onUnmarkSafe?: (domain: string) => void;
}

const SafeItem: React.FC<SafeItemProps> = ({ item, onUnmarkSafe }) => {
  const handleUnmarkSafe = async () => {
    if (onUnmarkSafe) {
      await onUnmarkSafe(item.domain);
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-white border border-border rounded-xl hover:bg-hovered/50 transition-colors">
      {/* Checkbox */}
      <input
        type="checkbox"
        className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
      />

      {/* Logo */}
      <Image
        src={`https://logo.clearbit.com/${item.domain}`}
        alt={item.domain}
        width={32}
        height={32}
        className="w-8 h-8 object-contain"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-base">
              {item.domain.charAt(0).toUpperCase() + item.domain.slice(1)}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              Marked as safe on {new Date(item.created_at).toLocaleDateString()}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(item.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Tags and Actions */}
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
              <ShieldCheckIcon className="w-3 h-3 inline mr-1" />
              Safe
            </span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUnmarkSafe}
                className="px-3 py-1 flex items-center bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
              >
                <XMarkIcon className="w-4 h-4 mr-1" />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeItem;
