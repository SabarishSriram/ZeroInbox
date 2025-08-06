import Sidebar from "@/components/Sidebar";
import React from "react";

export default function LabelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="ml-[270px] min-h-screen bg-white overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
