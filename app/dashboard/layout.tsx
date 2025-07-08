import React from "react";

import Sidebar from "../../components/Sidebar";
import { createClient, User } from "@supabase/supabase-js";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user session (SSR)
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <main className="ml-[270px] min-h-screen bg-white overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
