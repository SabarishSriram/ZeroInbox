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

  // Step 1: Fetch messages
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

  // Step 2: Process messages
  const batchSize = 100;
  let processed = 0;
  const errors = [];

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    try {
      // Trash (or prepare to delete)
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

      if (action === "delete") {
        try {
          // Try batch delete
          await retryWithBackoff(() =>
            gmail.users.messages.batchDelete({
              userId: "me",
              requestBody: { ids: batch },
            })
          );
        } catch (batchDeleteError: any) {
          console.error(
            `[UNSUB API] Batch delete failed on batch ${i / batchSize + 1}`,
            batchDeleteError
          );

          // Retry individually
          for (const msgId of batch) {
            try {
              await retryWithBackoff(() =>
                gmail.users.messages.delete({
                  userId: "me",
                  id: msgId,
                })
              );
            } catch (individualError) {
              console.error("[UNSUB API] Individual delete failed:", {
                msgId,
                error: individualError,
              });
              errors.push({
                batch: i / batchSize + 1,
                msgId,
                error: (individualError as any)?.message || individualError,
              });
            }
          }
        }
      }

      processed += batch.length;
    } catch (err: any) {
      console.error("[UNSUB API] Batch trash/delete failed:", err);
      errors.push({
        batch: i / batchSize + 1,
        error: err?.message || err,
      });
    }
  }

  // Step 3: Log to Supabase
  const supabase = createClient(cookies());
  try {
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

    const { data: statsDeleteData, error: statsDeleteError } = await supabase
      .from("email_stats")
      .delete()
      .or(`sender_email.eq.${target},domain.eq.${target}`);

    if (unsubUpsertError)
      console.error("[UNSUB API] Failed to upsert:", unsubUpsertError);
    if (statsDeleteError)
      console.error("[UNSUB API] Failed to delete stats:", statsDeleteError);
  } catch (err) {
    console.error("[UNSUB API] Supabase update failed:", err);
  }

  // Step 4: Return result
  return NextResponse.json({
    success: errors.length === 0,
    total: messageIds.length,
    processed,
    errors,
    message:
      errors.length === 0
        ? `All messages ${action === "trash" ? "moved to trash" : "deleted"}.`
        : `Some messages ${action === "trash" ? "trashed" : "deleted"}, but ${
            errors.length
          } failed.`,
  });
}
