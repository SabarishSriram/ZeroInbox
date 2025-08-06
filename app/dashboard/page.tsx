"use client";

import React, { useEffect, useState, Suspense } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  GmailConnectionModal,
  DashboardContent,
  EmailStats,
} from "@/components/dashboard";

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

function DashboardPageContent() {
  const [user, setUser] = useState<User | null>(null);
  const [gmailData, setGmailData] = useState<EmailStats[]>([]);
  const [checked, setChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [connectionProgress, setConnectionProgress] = useState(0);

  const router = useRouter();

  // Check if user has already connected Gmail
  const isGmailConnected = (email: string) => {
    return localStorage.getItem(`connected:${email}`) === "true";
  };

  const setGmailConnected = (email: string) => {
    localStorage.setItem(`connected:${email}`, "true");
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user || !session?.provider_token) {
        router.replace("/auth");
        return;
      }
      setUser(session.user as User);
      console.log(!session.user);
      setChecked(true);
      // Check if this user has connected Gmail before
      const userEmail = session.user.email!;
      if (!isGmailConnected(userEmail)) {
        setShowModal(true);
      } else {
        // User has connected before, fetch their data
        await fetchEmailStats();
      }
    })();
    // eslint-disable-next-line
  }, []);

  const handleConnectGmail = async () => {
    if (!user?.email) return;
    setIsConnecting(true);
    setConnectionProgress(0);
    setConnectionStatus("Analyzing your emails...");
    try {
      // Get the session to extract access token
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session?.session?.provider_token;
      if (!accessToken) {
        router.replace("/auth");
        throw new Error("No access token available. Please sign in again.");
      }
      // Progress animation
      const progressInterval = setInterval(() => {
        setConnectionProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      // Step 1: Analyze emails
      setConnectionStatus("Analyzing your emails...");
      const analyzeResponse = await fetch("/api/email/analyze", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          accessToken: accessToken,
          userId: session?.session?.user?.id,
          userEmail: session?.session?.user?.email,
        }),
      });
      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(`Failed to analyze email data: ${errorData.error}`);
      }
      setConnectionProgress(70);
      setConnectionStatus("Fetching statistics...");
      // Step 2: Fetch stats
      const userId = session?.session?.user?.id;
      let statsUrl = "/api/email/stats";
      if (userId) {
        statsUrl += `?userId=${userId}`;
      }

      const statsResponse = await fetch(statsUrl, {
        method: "GET",
        credentials: "include",
      });
      if (!statsResponse.ok) {
        throw new Error("Failed to fetch email stats");
      }
      const statsData = await statsResponse.json();
      setGmailData(statsData.stats || statsData);
      setConnectionProgress(100);
      setConnectionStatus("Complete!");
      // Mark as connected for this user
      setGmailConnected(user.email);
      // Hide modal after brief delay
      setTimeout(() => {
        setShowModal(false);
        setIsConnecting(false);
        setConnectionProgress(0);
        setConnectionStatus("");
      }, 1000);
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      setConnectionStatus("Connection failed. Please try again.");
      setIsConnecting(false);
      setConnectionProgress(0);
      setTimeout(() => {
        setConnectionStatus("");
      }, 3000);
    }
  };

  const fetchEmailStats = async () => {
    try {
      // Get the current session
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      let url = "/api/email/stats";
      if (userId) {
        url += `?userId=${userId}`;
      }

      const statsResponse = await fetch(url, {
        method: "GET",
        credentials: "include",
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setGmailData(statsData.stats || statsData);
      }
    } catch (error) {
      console.error("Error fetching email stats:", error);
    }
  };

  if (!checked) return null;
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
      <span className="inline-block w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans${
        showModal ? " filter blur-sm transition-all duration-300" : ""
      }`}
    >
      {/* Gmail Connection Modal */}
      <GmailConnectionModal
        isOpen={showModal}
        onOpenChange={setShowModal}
        isConnecting={isConnecting}
        connectionStatus={connectionStatus}
        connectionProgress={connectionProgress}
        onConnectGmail={handleConnectGmail}
      />

      {/* Dashboard Content */}
      {!showModal && (
        <DashboardContent
          user={user}
          gmailData={gmailData}
          onShowModal={() => setShowModal(true)}
        />
      )}
    </div>
  );
}

function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-content flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}

export default DashboardPage;
