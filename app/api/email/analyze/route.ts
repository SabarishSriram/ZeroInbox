import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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
  console.log("=== API Route Debug Info ===");
  console.log("Cookies received:", req.headers.get("cookie"));
  console.log("Authorization header:", req.headers.get("authorization"));

  // Parse request body to get access token and user info
  let accessToken, userId, userEmail;
  try {
    const requestBody = await req.json();
    accessToken = requestBody.accessToken;
    userId = requestBody.userId;
    userEmail = requestBody.userEmail;
    console.log("Request body data:", {
      hasAccessToken: !!accessToken,
      userId,
      userEmail,
    });
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Try to get access token from Authorization header if not in body
  if (!accessToken) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }
  }

  if (!accessToken) {
    console.error("No access token found");
    return NextResponse.json(
      { error: "Access token not found. Please provide an access token." },
      { status: 401 }
    );
  }

  if (!userId) {
    console.error("No user ID provided");
    return NextResponse.json(
      { error: "User ID not found. Please sign in again." },
      { status: 401 }
    );
  }

  console.log("Using user ID:", userId);

  // Create Supabase client
  const supabase = await createClient();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  });
  const gmail = google.gmail({ version: "v1", auth });

  // --- Incremental fetching logic ---
  // 1. Get last_run from DB for this specific user
  const { data: meta, error: metaError } = await supabase
    .from("email_analysis_meta")
    .select("last_run, id")
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no data exists

  console.log("Meta query result:", { meta, metaError });

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
  } while (nextPageToken && allMessages.length < 1000);

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
    if (!email) continue;
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
      const senderCount = Object.keys(senders).length;
      return {
        domain,
        sender_email: topSender,
        total_emails: count,
        monthly_avg: +(count / 2).toFixed(2),
        sender_count: senderCount,
        updated_at: new Date().toISOString(),
        user_id: userId,
      };
    }
  );

  // 5. Batch upsert
  const { data, error } = await supabase
    .from("email_stats")
    .upsert(upsertData, { onConflict: "domain,user_id" });

  if (error) {
    console.error("DB upsert error:", error);
    return NextResponse.json(
      { error: "Failed to store stats", details: error },
      { status: 500 }
    );
  }

  // After successful upsert, update last_run for this user
  console.log("Updating meta data for user:", userId);
  const now = new Date().toISOString();

  if (meta?.id) {
    console.log("Updating existing meta record:", meta.id);
    const { error: updateError } = await supabase
      .from("email_analysis_meta")
      .update({ last_run: now })
      .eq("id", meta.id);

    if (updateError) {
      console.error("Error updating meta:", updateError);
    }
  } else {
    console.log("Creating new meta record for user:", userId);
    const { data: insertedMeta, error: insertError } = await supabase
      .from("email_analysis_meta")
      .insert({
        last_run: now,
        user_id: userId,
      })
      .select();

    if (insertError) {
      console.error("Error inserting meta:", insertError);
    } else {
      console.log("Created meta record:", insertedMeta);
    }
  }

  return NextResponse.json({
    message: "Stats stored successfully",
    inserted: data,
    analyzed: upsertData.length,
  });
}
