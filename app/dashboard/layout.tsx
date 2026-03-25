import React from "react";

import Sidebar from "../../components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-content">
      <Sidebar />
      <main className="ml-[270px] min-h-screen bg-content">
        <div className="h-full w-full border-l border-border bg-background/80">
          {children}
        </div>
      </main>
    </div>
  );
}
