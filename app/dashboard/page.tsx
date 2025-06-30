"use client";

import React, { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [gmailData, setGmailData] = useState(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: session, error } = await supabase.auth.getSession();
      if (error || !session?.session) {
        router.replace("/auth");
        return;
      }
      setUser(session.session.user as User);
      setChecked(true);
      try {
        const accessToken = session.session?.provider_token;
        if (!accessToken) {
          throw new Error("No access token available. Please sign in again.");
        }
        const analyzeResponse = await fetch("/api/email/analyze", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            accessToken: accessToken,
          }),
        });
        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json();
          throw new Error(`Failed to analyze email data: ${errorData.error}`);
        }
        const statsResponse = await fetch("/api/email/stats", {
          method: "GET",
          credentials: "include",
        });
        if (!statsResponse.ok) {
          throw new Error("Failed to fetch email stats");
        }
        const statsData = await statsResponse.json();
        setGmailData(statsData);
      } catch (err) {
        console.error("Error processing email data:", (err as Error).message);
      }
    })();
  }, []);

  if (!checked) return null;

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-green-500">Welcome, {user.email}!</h1>
      <h2>Gmail Data:</h2>
      <pre>{JSON.stringify(gmailData, null, 2)}</pre>
    </div>
  );
}

export default DashboardPage;
