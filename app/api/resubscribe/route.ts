import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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
        `[RESUBSCRIBE API] retryWithBackoff error (attempt ${retries + 1}/${
          maxRetries + 1
        }):`,
        error
      );
      if (
        retries >= maxRetries ||
        ![503, 429].includes(error?.response?.status)
      ) {
        console.error(
          `[RESUBSCRIBE API] retryWithBackoff giving up after ${
            retries + 1
          } attempts`
        );
        throw error;
      }
      console.log(
        `[RESUBSCRIBE API] retryWithBackoff retrying in ${delay}ms...`
      );
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
      retries++;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[RESUBSCRIBE API] POST called");

    // --- AUTHENTICATION & USER CONTEXT ---
    const supabase = await createClient();

    // Try to get user ID from query parameters first
    const url = new URL(req.url);
    let userId = url.searchParams.get("userId");
    console.log("[RESUBSCRIBE API] userId from query:", userId);

    // If no user ID in query params, try to get it from session
    if (!userId) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      console.log(
        "[RESUBSCRIBE API] sessionData:",
        sessionData,
        "sessionError:",
        sessionError
      );

      if (sessionData?.session?.user) {
        userId = sessionData.session.user.id;
        console.log("[RESUBSCRIBE API] userId from session:", userId);
      }
    }

    if (!userId) {
      console.error("[RESUBSCRIBE API] No user ID found in request or session");
      return NextResponse.json(
        { error: "Authentication required. User ID not found." },
        { status: 401 }
      );
    }

    console.log(
      "[RESUBSCRIBE API] Final userId being used:",
      userId,
      "type:",
      typeof userId
    );

    const body = await req.json();
    const { sender, accessToken: bodyAccessToken } = body;
    console.log("[RESUBSCRIBE API] body:", body);

    const accessToken = bodyAccessToken || process.env.ACCESS_TOKEN;
    console.log(
      "[RESUBSCRIBE API] accessToken:",
      accessToken ? "present" : "missing"
    );

    if (!accessToken) {
      console.error("[RESUBSCRIBE API] Access token not found");
      return NextResponse.json(
        { error: "Access token not found" },
        { status: 401 }
      );
    }

    if (!sender) {
      console.error("[RESUBSCRIBE API] Missing sender");
      return NextResponse.json({ error: "Missing sender" }, { status: 400 });
    }

    // Set up Gmail API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
      scope: "https://www.googleapis.com/auth/gmail.modify",
    });
    const gmail = google.gmail({ version: "v1", auth });
    console.log("[RESUBSCRIBE API] Gmail client created");

    // Step 1: Find all trashed emails from this sender
    let allMessages: { id: string }[] = [];
    let nextPageToken: string | null = null;

    do {
      const res = await retryWithBackoff(() =>
        gmail.users.messages.list({
          userId: "me",
          q: `from:${sender} in:trash`,
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
        "[RESUBSCRIBE API] Fetched batch from trash, total so far:",
        allMessages.length,
        "nextPageToken:",
        nextPageToken
      );
    } while (nextPageToken);

    const messageIds: string[] = allMessages.map((msg) => msg.id);
    console.log(
      `[RESUBSCRIBE API] Found ${messageIds.length} messages in trash from ${sender}`
    );

    // Step 2: Move messages from trash back to inbox
    let emailsRestored = 0;
    if (messageIds.length > 0) {
      const batchSize = 100;
      let processed = 0;
      const errors = [];

      for (let i = 0; i < messageIds.length; i += batchSize) {
        console.log(`[RESUBSCRIBE API] Processing batch ${i / batchSize + 1}`);
        const batch = messageIds.slice(i, i + batchSize);

        try {
          console.log(
            "[RESUBSCRIBE API] Moving batch from trash to inbox:",
            batch
          );

          // Remove TRASH label and add INBOX label
          await retryWithBackoff(() =>
            gmail.users.messages.batchModify({
              userId: "me",
              requestBody: {
                ids: batch,
                addLabelIds: ["INBOX"],
                removeLabelIds: ["TRASH"],
              },
            })
          );

          processed += batch.length;
          emailsRestored += batch.length;
          console.log("[RESUBSCRIBE API] Processed so far:", processed);
        } catch (err: any) {
          console.error("[RESUBSCRIBE API] Batch restore failed:", err);
          errors.push({
            batch: i / batchSize + 1,
            error: err?.message || err,
          });
        }
      }

      if (errors.length > 0) {
        console.error("[RESUBSCRIBE API] Some batches failed:", errors);
      } else {
        console.log(
          "[RESUBSCRIBE API] All messages successfully moved to inbox"
        );
      }
    }

    // Step 3: Remove the sender from unsubscribed_senders table
    const { data: deleteData, error: deleteError } = await supabase
      .from("unsubscribed_senders")
      .delete()
      .eq("user_id", userId)
      .eq("sender", sender)
      .select();

    if (deleteError) {
      console.error(
        "[RESUBSCRIBE API] Failed to delete from unsubscribed_senders:",
        deleteError
      );

      // Try with admin client as fallback
      console.log("[RESUBSCRIBE API] Trying admin client delete...");
      const adminSupabase = await createAdminClient();
      const { data: adminDeleteData, error: adminDeleteError } =
        await adminSupabase
          .from("unsubscribed_senders")
          .delete()
          .eq("user_id", userId)
          .eq("sender", sender)
          .select();

      if (adminDeleteError) {
        console.error(
          "[RESUBSCRIBE API] Admin client delete also failed:",
          adminDeleteError
        );
        return NextResponse.json(
          { error: "Failed to resubscribe. Please try again." },
          { status: 500 }
        );
      } else {
        console.log(
          "[RESUBSCRIBE API] Admin client delete succeeded:",
          adminDeleteData
        );
      }
    } else {
      console.log(
        "[RESUBSCRIBE API] Successfully deleted from unsubscribed_senders:",
        deleteData
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully resubscribed to ${sender}. Moved ${emailsRestored} emails from trash to inbox.`,
      sender: sender,
      emailsRestored: emailsRestored,
    });
  } catch (error: any) {
    console.error("[RESUBSCRIBE API] Request processing failed:", error);
    return NextResponse.json(
      { error: "Failed to process resubscribe request" },
      { status: 500 }
    );
  }
}
