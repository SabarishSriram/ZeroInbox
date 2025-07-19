import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
      console.error(
        `[UNSUB API] retryWithBackoff error (attempt ${retries + 1}/${
          maxRetries + 1
        }):`,
        error
      );
      if (
        retries >= maxRetries ||
        ![503, 429].includes(error?.response?.status)
      ) {
        console.error(
          `[UNSUB API] retryWithBackoff giving up after ${retries + 1} attempts`
        );
        throw error;
      }
      console.log(`[UNSUB API] retryWithBackoff retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
      retries++;
    }
  }
}
// End of file

export async function POST(req: NextRequest) {
  console.log("[UNSUB API] POST called");
  // --- AUTHENTICATION & USER CONTEXT (like /api/email/analyze) ---
  const supabase = await createClient();
  console.log("[UNSUB API] Supabase client created");
  // Try to get user ID from query parameters first
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId");
  console.log("[UNSUB API] userId from query:", userId);
  // If no user ID in query params, try to get it from session
  if (!userId) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    console.log(
      "[UNSUB API] sessionData:",
      sessionData,
      "sessionError:",
      sessionError
    );
    if (sessionData?.session?.user) {
      userId = sessionData.session.user.id;
      console.log("[UNSUB API] userId from session:", userId);
    }
  }
  if (!userId) {
    console.error("[UNSUB API] No user ID found in request or session");
    return NextResponse.json(
      { error: "Authentication required. User ID not found." },
      { status: 401 }
    );
  }

  console.log(
    "[UNSUB API] Final userId being used:",
    userId,
    "type:",
    typeof userId
  );

  const body = await req.json();
  const { target, action, accessToken: bodyAccessToken } = body;
  console.log("[UNSUB API] body:", body);
  const accessToken =
    req.headers.get("authorization")?.replace("Bearer ", "") || bodyAccessToken;
  console.log("[UNSUB API] accessToken:", accessToken ? "present" : "missing");
  if (!accessToken) {
    console.error("[UNSUB API] Access token not found");
    return NextResponse.json(
      { error: "Access token not found" },
      { status: 401 }
    );
  }
  if (!target || !action) {
    console.error("[UNSUB API] Missing target or action", { target, action });
    return NextResponse.json(
      { error: "Missing target or action" },
      { status: 400 }
    );
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken,
    scope: "https://www.googleapis.com/auth/gmail.modify",
  });
  const gmail = google.gmail({ version: "v1", auth });
  console.log("[UNSUB API] Gmail client created");

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
    console.log(
      "[UNSUB API] Fetched batch, total so far:",
      allMessages.length,
      "nextPageToken:",
      nextPageToken
    );
  } while (nextPageToken);

  const messageIds: string[] = allMessages.map((msg) => msg.id);
  if (messageIds.length === 0) {
    console.log("[UNSUB API] No messages found for target:", target);
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
    console.log(`[UNSUB API] Processing batch ${i / batchSize + 1}`);
    const batch = messageIds.slice(i, i + batchSize);
    try {
      console.log("[UNSUB API] Trashing batch:", batch);
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
        console.log("[UNSUB API] Deleting batch:", batch);
        try {
          // Try batch delete
          await retryWithBackoff(() =>
            gmail.users.messages.batchDelete({
              userId: "me",
              requestBody: { ids: batch },
            })
          );
        } catch (batchDeleteError: any) {
          console.error("[UNSUB API] Batch delete error:", batchDeleteError);
          console.error(
            `[UNSUB API] Batch delete failed on batch ${i / batchSize + 1}`,
            batchDeleteError
          );

          // Retry individually
          for (const msgId of batch) {
            console.log("[UNSUB API] Deleting individual message:", msgId);
            try {
              await retryWithBackoff(() =>
                gmail.users.messages.delete({
                  userId: "me",
                  id: msgId,
                })
              );
            } catch (individualError) {
              console.error(
                "[UNSUB API] Individual delete error:",
                individualError
              );
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
      console.log("[UNSUB API] Processed so far:", processed);
    } catch (err: any) {
      console.error("[UNSUB API] Batch trash/delete failed:", err);
      console.error("[UNSUB API] Batch trash/delete failed:", err);
      errors.push({
        batch: i / batchSize + 1,
        error: err?.message || err,
      });
    }
  }

  // Step 3: Log to Supabase
  try {
    console.log(
      "[UNSUB API] Logging to Supabase for user:",
      userId,
      "target:",
      target,
      "action:",
      action
    );

    // Check what user context Supabase sees
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    console.log(
      "[UNSUB API] Supabase auth user:",
      user?.id,
      "error:",
      userError
    );

    // First, try to find existing record for this user and sender
    const { data: existingRecord, error: selectError } = await supabase
      .from("unsubscribed_senders")
      .select("*")
      .eq("user_id", userId)
      .eq("sender", target)
      .maybeSingle();

    console.log(
      "[UNSUB API] Existing record:",
      existingRecord,
      "select error:",
      selectError
    );

    if (existingRecord) {
      // Update existing record
      const { data: updateData, error: updateError } = await supabase
        .from("unsubscribed_senders")
        .update({
          action: action === "trash" ? "trashed" : "deleted",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("sender", target)
        .select();

      if (updateError) {
        console.error("[UNSUB API] Failed to update:", updateError);
      } else {
        console.log("[UNSUB API] Successfully updated:", updateData);
      }
    } else {
      // Insert new record with user_id
      const insertPayload = {
        user_id: userId,
        sender: target,
        action: action === "trash" ? "trashed" : "deleted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("[UNSUB API] Attempting to insert payload:", insertPayload);

      const { data: insertData, error: insertError } = await supabase
        .from("unsubscribed_senders")
        .insert(insertPayload)
        .select();

      if (insertError) {
        console.error("[UNSUB API] Failed to insert:", insertError);
        console.error("[UNSUB API] Insert error details:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });

        // Try alternative approach: insert without RLS context
        console.log("[UNSUB API] Trying admin client insert...");
        const adminSupabase = await createAdminClient();
        const { data: adminInsertData, error: adminInsertError } =
          await adminSupabase
            .from("unsubscribed_senders")
            .insert(insertPayload)
            .select();

        if (adminInsertError) {
          console.error(
            "[UNSUB API] Admin client insert also failed:",
            adminInsertError
          );
        } else {
          console.log(
            "[UNSUB API] Admin client insert succeeded:",
            adminInsertData
          );
        }
      } else {
        console.log("[UNSUB API] Successfully inserted:", insertData);
      }
    }

    // Delete stats for this user and sender/domain
    const { data: statsDeleteData, error: statsDeleteError } = await supabase
      .from("email_stats")
      .delete()
      .eq("user_id", userId)
      .eq("domain", target) // Only domain
      .select();

    if (statsDeleteError)
      console.error("[UNSUB API] Failed to delete stats:", statsDeleteError);
    else
      console.log("[UNSUB API] Successfully deleted stats:", statsDeleteData);
  } catch (err) {
    console.error("[UNSUB API] Supabase update failed:", err);
  }

  // Step 4: Return result
  const result = {
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
  };
  console.log("[UNSUB API] Returning result:", result);
  return NextResponse.json(result);
}
