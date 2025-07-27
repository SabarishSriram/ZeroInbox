import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    console.log("[GMAIL LABELS API] GET called");

    // --- AUTHENTICATION & USER CONTEXT ---
    const supabase = await createClient();
    let userId: string;
    let accessToken: string;

    // Get the session from Supabase (cookies-based session for OAuth provider tokens)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    console.log(
      "[GMAIL LABELS API] sessionData:",
      sessionData?.session?.user?.id
    );
    console.log("[GMAIL LABELS API] sessionError:", sessionError);

    if (sessionError || !sessionData?.session?.user) {
      console.error("[GMAIL LABELS API] No valid session found");
      return Response.json(
        { 
          error: "Authentication required. Please sign in with Google.",
          code: "SESSION_REQUIRED",
          action: "SIGNIN_GOOGLE"
        },
        { status: 401 }
      );
    }

    userId = sessionData.session.user.id;
    
    // Get access token for Gmail API from session
    const providerToken = sessionData.session.provider_token;
    if (!providerToken) {
      console.error("[GMAIL LABELS API] No Gmail OAuth token found in session");
      return Response.json(
        {
          error: "Gmail access token not found. Please reconnect your Google account.",
          code: "TOKEN_MISSING",
          action: "RECONNECT_GMAIL"
        },
        { status: 401 }
      );
    }
    
    accessToken = providerToken;

    // Set up Gmail API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth });

    // Fetch labels from Gmail
    console.log("[GMAIL LABELS API] Fetching labels from Gmail...");
    const labelsResponse = await gmail.users.labels.list({ userId: "me" });
    const labels = labelsResponse.data.labels || [];

    console.log("[GMAIL LABELS API] Found", labels.length, "labels");

    // Store labels in Supabase
    await storeLabelsInSupabase(labels, userId, supabase);

    return Response.json({
      success: true,
      labels: labels,
      count: labels.length,
    });
  } catch (err: any) {
    console.error("[GMAIL LABELS API] Error:", err);
    return Response.json(
      { error: err.message || err.toString() },
      { status: 500 }
    );
  }
}

async function storeLabelsInSupabase(
  labels: any[],
  userId: string,
  supabase: any
) {
  try {
    const formattedLabels = labels.map((label) => ({
      label_id: label.id,
      name: label.name,
      user_id: userId,
      type: label.type || "user",
      messages_total: label.messagesTotal || 0,
      messages_unread: label.messagesUnread || 0,
      threads_total: label.threadsTotal || 0,
      threads_unread: label.threadsUnread || 0,
    }));

    console.log(
      "[GMAIL LABELS API] Storing",
      formattedLabels.length,
      "labels in database"
    );

    const { error } = await supabase
      .from("gmail_labels")
      .upsert(formattedLabels, {
        onConflict: "label_id,user_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("[GMAIL LABELS API] Failed to store labels:", error);
      throw new Error(`Failed to store labels in database: ${error.message}`);
    } else {
      console.log("[GMAIL LABELS API] Successfully stored labels in database");
    }
  } catch (error) {
    console.error("[GMAIL LABELS API] Error storing labels:", error);
    throw error;
  }
}
