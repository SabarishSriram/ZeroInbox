import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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
  const body = await req.json();
  const { target, action } = body;
  const accessToken =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    body.accessToken ||
    process.env.ACCESS_TOKEN;
  if (!accessToken)
    return NextResponse.json(
      { error: "Access token not found" },
      { status: 401 }
    );
  if (!target || !action)
    return NextResponse.json(
      { error: "Missing target or action" },
      { status: 400 }
    );

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken,
    scope: "https://www.googleapis.com/auth/gmail.modify",
  });
  const gmail = google.gmail({ version: "v1", auth });

  // 1. Query Gmail for all messages from the target
  let allMessages: { id: string }[] = [];
  let nextPageToken: string | null = null;
  do {
    const res = await retryWithBackoff(() =>
      gmail.users.messages.list({
        userId: "me",
        q: `from:${target}`,
        maxResults: 100,
        pageToken: nextPageToken ?? undefined,
      })
    );
    // Only keep messages with a valid id (string)
    const messages = (res.data.messages || []).filter(
      (msg): msg is { id: string } => !!msg.id
    );
    allMessages.push(...messages);
    nextPageToken = res.data.nextPageToken || null;
  } while (nextPageToken);

  const messageIds: string[] = allMessages.map((msg) => msg.id);
  if (messageIds.length === 0) {
    return NextResponse.json({
      success: true,
      total: 0,
      message: "No messages found for target.",
    });
  }

  // 2. Batch process (trash or delete)
  const batchSize = 100;
  let processed = 0;
  let errors = [];
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    try {
      if (action === "trash") {
        await retryWithBackoff(() =>
          gmail.users.messages.batchModify({
            userId: "me",
            requestBody: {
              ids: batch,
              addLabelIds: ["TRASH"],
              removeLabelIds: ["INBOX"],
            },
          })
        );
      } else if (action === "delete") {
        // Move to trash first (Gmail requires this before permanent delete)
        await retryWithBackoff(() =>
          gmail.users.messages.batchModify({
            userId: "me",
            requestBody: {
              ids: batch,
              addLabelIds: ["TRASH"],
              removeLabelIds: ["INBOX"],
            },
          })
        );
        await retryWithBackoff(() =>
          gmail.users.messages.batchDelete({
            userId: "me",
            requestBody: { ids: batch },
          })
        );
      }
      processed += batch.length;
    } catch (err: any) {
      errors.push({ batch: i / batchSize + 1, error: err?.message || err });
    }
  }

  // 3. Always attempt DB update and log, even if processed is 0
  const supabase = createClient(cookies());
  try {
    console.log("[UNSUB API] DB update for", { target, action, processed });
    // Upsert unsubscribed_senders
    const { data: unsubUpsertData, error: unsubUpsertError } = await supabase
      .from("unsubscribed_senders")
      .upsert(
        {
          sender: target,
          action: action === "trash" ? "trashed" : "deleted",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sender" }
      );
    console.log("[UNSUB API] Upsert unsubscribed_senders:", {
      target,
      unsubUpsertData,
      unsubUpsertError,
    });
    // Remove from email_stats
    const { data: statsDeleteData, error: statsDeleteError } = await supabase
      .from("email_stats")
      .delete()
      .or(`sender_email.eq.${target},domain.eq.${target}`);
    console.log("[UNSUB API] Delete from email_stats:", {
      target,
      statsDeleteData,
      statsDeleteError,
    });
    if (unsubUpsertError) {
      console.error(
        "[UNSUB API] Failed to upsert into unsubscribed_senders:",
        unsubUpsertError
      );
    }
    if (statsDeleteError) {
      console.error(
        "[UNSUB API] Failed to delete from email_stats:",
        statsDeleteError
      );
    }
  } catch (err) {
    console.error("[UNSUB API] Exception in DB update block:", err);
  }
  // Do NOT delete from unsubscribed_senders if deleted; keep record

  return NextResponse.json({
    success: errors.length === 0,
    total: messageIds.length,
    processed,
    errors,
    message:
      errors.length === 0
        ? `All messages ${action === "trash" ? "moved to trash" : "deleted"}.`
        : "Some batches failed. See errors.",
  });
}
