import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

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

export async function fetchAndStoreIncrementalEmails({
  accessToken,
  userId,
  userEmail,
}: {
  accessToken: string;
  userId: string;
  userEmail: string;
}) {
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
    .maybeSingle();

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

  let allMessages: { id: string }[] = [];
  let nextPageToken: string | null = null;
  do {
    const res = await retryWithBackoff(() =>
      gmail.users.messages.list({
        userId: "me",
        q: query,
        pageToken: nextPageToken ?? undefined,
      })
    );
    const messages = (res.data.messages || [])
      .filter((msg) => typeof msg.id === "string")
      .map((msg) => ({ id: msg.id as string }));
    allMessages.push(...messages);
    nextPageToken = res.data.nextPageToken || null;
  } while (nextPageToken);

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
    throw new Error("Failed to store stats: " + error.message);
  }

  // After successful upsert, update last_run for this user
  const now = new Date().toISOString();
  if (meta?.id) {
    const { error: updateError } = await supabase
      .from("email_analysis_meta")
      .update({ last_run: now })
      .eq("id", meta.id);
    if (updateError) {
      throw new Error("Error updating meta: " + updateError.message);
    }
  } else {
    const { error: insertError } = await supabase
      .from("email_analysis_meta")
      .insert({ last_run: now, user_id: userId })
      .select();
    if (insertError) {
      throw new Error("Error inserting meta: " + insertError.message);
    }
  }

  return {
    message: "Stats stored successfully",
    inserted: data,
    analyzed: upsertData.length,
  };
}
