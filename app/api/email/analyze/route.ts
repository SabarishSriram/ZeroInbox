import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const EXCLUDE_SENDERS = [
  "no-reply@",
  "noreply@",
  "donotreply@",
  "do-not-reply@",
  "notification@",
  "notifications@",
];

function isTransactional(email: string) {
  return EXCLUDE_SENDERS.some((pattern) =>
    email.toLowerCase().includes(pattern)
  );
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let retries = 0,
    delay = initialDelay;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (
        retries >= maxRetries ||
        ![503, 429].includes(error?.response?.status)
      )
        throw error;
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
      retries++;
    }
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Get the user session from Supabase
  const { data: session, error: sessionError } =
    await supabase.auth.getSession();

  console.log("Cookies received:", req.headers.get("cookie"));
  console.log("Authorization header:", req.headers.get("authorization"));

  // Parse request body to get access token
  let accessToken;
  try {
    const body = await req.json();
    accessToken = body.accessToken;
  } catch (error) {
    console.log("No request body, trying session access token");
  }

  // Try to get access token from session if not in body
  if (!accessToken && session?.session) {
    accessToken = session.session.provider_token || session.session.access_token;
  }

  // Try to get access token from Authorization header
  if (!accessToken) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }
  }

  if (!accessToken) {
    console.error("No access token found");
    console.log("Session data:", session);
    return NextResponse.json(
      { error: "Access token not found. Please sign in again." },
      { status: 401 }
    );
  }

  console.log("Access token retrieved:", !!accessToken);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  });
  const gmail = google.gmail({ version: "v1", auth });

  // --- Incremental fetching logic ---
  // 1. Get last_run from DB
  const { data: meta } = await supabase
    .from("email_analysis_meta")
    .select("last_run, id")
    .order("id", { ascending: true })
    .limit(1)
    .single();
  let afterDate;
  if (meta?.last_run) {
    afterDate = new Date(meta.last_run);
  } else {
    afterDate = new Date();
    afterDate.setMonth(afterDate.getMonth() - 1); // Default: 1 month ago
  }
  const formattedDate = afterDate
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "/");
  const query = `in:inbox after:${formattedDate}`;
  // --- End incremental fetching logic ---

  // Add support for returning a list of emails if requested (for demo/fetch-emails page)
  const returnEmails = req.headers.get("x-return-emails") === "true";

  let allMessages: { id: string }[] = [];
  let nextPageToken: string | null = null;
  // Removed maxEmails and fetched counter for full 1 month fetch
  // 1. Pagination
  // Fetch all emails from the last 1 month (no artificial limit)
  do {
    const res = await retryWithBackoff(() =>
      gmail.users.messages.list({
        userId: "me",
        q: query, // Only fetch 10 for demo
        pageToken: nextPageToken ?? undefined,
      })
    );
    const messages = (res.data.messages || [])
      .filter((msg) => typeof msg.id === "string")
      .map((msg) => ({ id: msg.id as string }));
    allMessages.push(...messages);
    nextPageToken = res.data.nextPageToken || null;
  } while (nextPageToken && allMessages.length < 10);

  // Fetch message details for demo
  if (returnEmails) {
    const emails = await Promise.all(
      allMessages.map((msg) =>
        retryWithBackoff(() =>
          gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"],
          })
        )
      )
    );
    return NextResponse.json({
      emails: emails.map((res) => {
        const headers = res.data.payload?.headers || [];
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const subject =
          headers.find((h: any) => h.name === "Subject")?.value || "";
        const date = headers.find((h: any) => h.name === "Date")?.value || "";
        return { from, subject, date, snippet: res.data.snippet };
      }),
    });
  }

  // 2. Fetch message details in batches
  const batchSize = 50;
  let allEmailData: { from: string; date: string }[] = [];
  for (let i = 0; i < allMessages.length; i += batchSize) {
    const batch = allMessages.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((msg) =>
        retryWithBackoff(() =>
          gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["From", "Date"],
          })
        )
      )
    );
    allEmailData.push(
      ...batchResults.map((res) => {
        const headers = res.data.payload?.headers || [];
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const date = headers.find((h: any) => h.name === "Date")?.value || "";
        return { from, date };
      })
    );
  }

  // 3. Analyze: group by domain, dedupe, filter transactional
  const domainStats: Record<
    string,
    { count: number; senders: Record<string, number> }
  > = {};
  for (const { from } of allEmailData) {
    const match = from.match(/<([^>]+)>/) || from.match(/([^ ]+@[^ ]+)/);
    const email = match ? match[1] : from;
    if (!email || isTransactional(email)) continue;
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) continue;
    if (!domainStats[domain]) domainStats[domain] = { count: 0, senders: {} };
    domainStats[domain].count++;
    domainStats[domain].senders[email] =
      (domainStats[domain].senders[email] || 0) + 1;
  }

  // 4. Prepare DB upsert data: domain, top sender, total, monthly avg
  const upsertData = Object.entries(domainStats).map(
    ([domain, { count, senders }]) => {
      const topSender =
        Object.entries(senders).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      return {
        domain,
        sender_email: topSender,
        total_emails: count,
        monthly_avg: +(count / 2).toFixed(2),
        updated_at: new Date().toISOString(),
      };
    }
  );

  // 5. Batch upsert
  const { data, error } = await supabase
    .from("email_stats")
    .upsert(upsertData, { onConflict: "domain" });

  if (error) {
    console.error("DB upsert error:", error);
    return NextResponse.json(
      { error: "Failed to store stats", details: error },
      { status: 500 }
    );
  }

  // After successful upsert, update last_run
  if (meta?.id) {
    await supabase
      .from("email_analysis_meta")
      .update({ last_run: new Date().toISOString() })
      .eq("id", meta.id);
  } else {
    await supabase
      .from("email_analysis_meta")
      .insert({ last_run: new Date().toISOString() });
  }

  return NextResponse.json({
    message: "Stats stored successfully",
    inserted: data,
    analyzed: upsertData.length,
  });
}
