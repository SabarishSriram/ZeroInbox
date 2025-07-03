import React from "react";

import Sidebar from "./Sidebar";
import { createClient, User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user session (SSR)
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar/>
      <main className="flex-1 bg-white">{children}</main>
    </div>
  );
}
