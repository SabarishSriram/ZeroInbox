"use client";

import React, { useEffect, useState } from "react";
import { createClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [gmailData, setGmailData] = useState<any[]>([]);
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
        }),
      });
      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(`Failed to analyze email data: ${errorData.error}`);
      }
      setConnectionProgress(70);
      setConnectionStatus("Fetching statistics...");
      // Step 2: Fetch stats
      const statsResponse = await fetch("/api/email/stats", {
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
      const statsResponse = await fetch("/api/email/stats", {
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
      <div className="min-h-screen bg-content flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans${
        showModal ? " filter blur-sm transition-all duration-300" : ""
      }`}
    >
      {/* Gmail Connection Modal using shadcn/ui Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className=" [&>button.absolute.right-4.top-4]:hidden w-[340px] rounded-2xl bg-content font-sans shadow-xl border-0 p-4">
          {isConnecting ? (
            <div className="flex flex-col items-center justify-center p-10 min-h-[220px]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mb-4" />
              <span className="text-base text-black font-medium">
                {connectionStatus || "Connecting to Gmail..."}
              </span>
            </div>
          ) : (
            <>
              {/* Blue progress bar with padding */}
              <div className="w-full pt-2 pb-2">
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-1 transition-all duration-300 bg-[--primary-blue] rounded-full"
                    style={{
                      width: isConnecting ? `${connectionProgress}%` : "100%",
                    }}
                  />
                </div>
              </div>
              <div className="py-2 px-6 flex flex-col items-center font-sans">
                <DialogHeader className="w-full">
                  <DialogTitle className="text-xl font-bold text-center mb-1">
                    Connect an email account
                  </DialogTitle>
                  <DialogDescription className="text-center text-muted-foreground mb-4">
                    Connect an account to start cleaning
                  </DialogDescription>
                </DialogHeader>
                {/* Provider Buttons */}
                <div className="w-full flex flex-col gap-4 mb-4">
                  <button
                    onClick={handleConnectGmail}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border- bg-white hover:bg-hovered text-foreground font-semibold text-base shadow-sm transition-colors"
                  >
                    <img
                      src="https://static.vecteezy.com/system/resources/previews/020/964/377/non_2x/gmail-mail-icon-for-web-design-free-png.png"
                      alt="Gmail"
                      className="h-6 w-6"
                    />
                    Connect Gmail account
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-white hover:bg-hovered text-foreground font-semibold text-base shadow-sm transition-colors">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTHhjp6s-vH8a-3pal9FKfqJfG992bdlw17vQ&s"
                      alt="Outlook"
                      className="h-6 w-6"
                    />
                    Connect Outlook account
                  </button>
                </div>
                {/* Privacy Note */}
                <div className="w-full flex flex-col items-center mt-2 mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <svg
                      className="h-4 w-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 17a2 2 0 002-2V9a2 2 0 10-4 0v6a2 2 0 002 2zm0 0v2m0-2a6 6 0 100-12 6 6 0 000 12z"
                      />
                    </svg>
                    <span className="text-xs font-medium text-muted-foreground">
                      Privacy Protected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Please note, we need additional access to your email
                    account. We only access absolutely required data and store
                    it in secure storage. We do not see or share your email
                    data.
                  </p>
                </div>
                <DialogFooter className="w-full mt-2">
                  <DialogClose asChild>
                    <button className="w-full text-sm text-muted-foreground underline hover:text-primary mt-2">
                      Close
                    </button>
                  </DialogClose>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Dashboard Content */}
      <div className="container bg-white mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.email}</p>
        </div>
        {/* Stats Grid */}
        {gmailData && gmailData.length > 0 ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Total Domains
                </h3>
                <p className="text-2xl font-bold text-foreground">
                  {gmailData.length}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Total Emails
                </h3>
                <p className="text-2xl font-bold text-foreground">
                  {gmailData.reduce(
                    (sum: number, item: any) => sum + item.total_emails,
                    0
                  )}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Avg. Monthly
                </h3>
                <p className="text-2xl font-bold text-foreground">
                  {(
                    gmailData.reduce(
                      (sum: number, item: any) => sum + item.monthly_avg,
                      0
                    ) / gmailData.length
                  ).toFixed(1)}
                </p>
              </div>
            </div>
            {/* Email Stats Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Email Statistics by Domain
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                        Domain
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                        Top Sender
                      </th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                        Total Emails
                      </th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                        Monthly Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {gmailData.map((item: any, index: number) => (
                      <tr
                        key={index}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {item.domain.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">
                              {item.domain}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {item.sender_email}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {item.total_emails}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                          {item.monthly_avg}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          !showModal && (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Gmail Data
              </h3>
              <p className="text-muted-foreground mb-4">
                Connect your Gmail account to see your email statistics.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Connect Gmail
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
