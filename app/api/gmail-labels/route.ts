import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

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
  console.log(
    "[GMAIL LABELS API] POST called - Starting Gmail fetch → DB store → Frontend flow"
  );
  console.log("Cookies received:", req.headers.get("cookie"));
  console.log("Authorization header:", req.headers.get("authorization"));

  try {
    // Parse request body to get access token and user info (same as email analyze)
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

    // Set up Gmail API client (same as email analyze)
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
      scope: "https://www.googleapis.com/auth/gmail.modify",
    });
    const gmail = google.gmail({ version: "v1", auth });

    console.log("[GMAIL LABELS API] userId:", userId);
    console.log(
      "[GMAIL LABELS API] accessToken:",
      accessToken ? "present" : "missing"
    );

    // --- STEP 2: FETCH FROM GMAIL API ---
    console.log("[GMAIL LABELS API] Step 1: Fetching labels from Gmail API...");

    let gmailLabels = [];

    try {
      const response = await retryWithBackoff(() =>
        gmail.users.labels.list({
          userId: "me",
        })
      );

      gmailLabels = response.data.labels || [];
      console.log(
        "[GMAIL LABELS API] ✓ Successfully fetched",
        gmailLabels.length,
        "labels from Gmail"
      );

      // Filter out unwanted system labels
      const filteredLabels = gmailLabels.filter((label: any) => {
        const excludeLabels = [
          "CHAT",
          "CATEGORY_FORUMS",
          "CATEGORY_UPDATES",
          "CATEGORY_PROMOTIONS",
          "CATEGORY_SOCIAL",
        ];
        return (
          !excludeLabels.includes(label.id) &&
          label.name &&
          !label.name.startsWith("CATEGORY_")
        );
      });

      gmailLabels = filteredLabels;
      console.log(
        "[GMAIL LABELS API] ✓ Filtered to",
        gmailLabels.length,
        "relevant labels"
      );
    } catch (gmailError: any) {
      console.error("[GMAIL LABELS API] ✗ Gmail API error:", gmailError);

      if (
        gmailError.message.includes("invalid_grant") ||
        gmailError.message.includes("Token has been expired")
      ) {
        return NextResponse.json(
          {
            error:
              "Gmail access token has expired. Please reconnect your Google account.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Gmail API error: ${gmailError.message}` },
        { status: 500 }
      );
    }

    // --- STEP 3: STORE IN DATABASE ---
    console.log("[GMAIL LABELS API] Step 2: Storing labels in database...");

    let storedSuccessfully = false;
    let storageMessage = "";

    if (gmailLabels.length > 0) {
      try {
        // Delete existing labels for this user
        const { error: deleteError } = await supabase
          .from("gmail_labels")
          .delete()
          .eq("user_id", userId);

        if (deleteError && !deleteError.message.includes("does not exist")) {
          console.warn(
            "[GMAIL LABELS API] Warning deleting existing labels:",
            deleteError
          );
        }

        // Insert new labels
        const labelsToInsert = gmailLabels.map((label: any) => ({
          user_id: userId,
          label_id: label.id,
          name: label.name,
          type: label.type || "user",
          messages_total: label.messagesTotal || 0,
          messages_unread: label.messagesUnread || 0,
          threads_total: label.threadsTotal || 0,
          threads_unread: label.threadsUnread || 0,
          color_background_color: label.color?.backgroundColor || null,
          color_text_color: label.color?.textColor || null,
          label_list_visibility: label.labelListVisibility || "labelShow",
          message_list_visibility: label.messageListVisibility || "show",
        }));

        const { data: insertedLabels, error: insertError } = await supabase
          .from("gmail_labels")
          .insert(labelsToInsert)
          .select();

        if (insertError) {
          console.error(
            "[GMAIL LABELS API] ✗ Error storing labels in database:",
            insertError
          );

          // Check if the error is because the table doesn't exist
          if (
            insertError.message.includes(
              'relation "gmail_labels" does not exist'
            ) ||
            insertError.code === "PGRST116"
          ) {
            storageMessage =
              "Database table not set up. Please run the database setup script.";
            console.log(
              "[GMAIL LABELS API] ⚠ gmail_labels table doesn't exist"
            );
          } else {
            storageMessage = `Database storage failed: ${insertError.message}`;
          }
        } else {
          storedSuccessfully = true;
          storageMessage = `Successfully stored ${
            insertedLabels?.length || 0
          } labels in database`;
          console.log("[GMAIL LABELS API] ✓", storageMessage);
        }
      } catch (storageError: any) {
        console.error(
          "[GMAIL LABELS API] ✗ Unexpected storage error:",
          storageError
        );
        storageMessage = `Storage error: ${storageError.message}`;
      }
    }

    // --- STEP 4: RETURN TO FRONTEND ---
    console.log("[GMAIL LABELS API] Step 3: Returning labels to frontend...");

    const responseData = {
      success: true,
      labels: gmailLabels,
      count: gmailLabels.length,
      stored: storedSuccessfully,
      storageMessage: storageMessage,
      flow: "Gmail API → Database → Frontend",
    };

    console.log(
      "[GMAIL LABELS API] ✓ Complete! Returning",
      gmailLabels.length,
      "labels to frontend"
    );
    console.log(
      "[GMAIL LABELS API] Storage status:",
      storedSuccessfully ? "✓ Stored" : "✗ Not stored"
    );

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("[GMAIL LABELS API] ✗ Unexpected error in flow:", err);
    return NextResponse.json(
      {
        error: "Internal server error in Gmail labels flow",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for fetching labels from database only (no Gmail API call)
export async function GET(req: NextRequest) {
  console.log("[GMAIL LABELS GET API] GET called");

  // --- AUTHENTICATION & USER CONTEXT ---
  const supabase = await createClient();
  let userId: string;

  // Get the session from Supabase (this should work with cookies)
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  console.log(
    "[GMAIL LABELS GET API] sessionData:",
    sessionData?.session?.user?.id
  );
  console.log("[GMAIL LABELS GET API] sessionError:", sessionError);

  // If no session from cookies, try the Authorization header
  if (sessionError || !sessionData?.session?.user) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // Create a new client with the token
      const { data: userData, error: userError } = await supabase.auth.getUser(
        token
      );
      console.log(
        "[GMAIL LABELS GET API] User from token:",
        userData?.user?.id
      );

      if (userError || !userData?.user) {
        console.error(
          "[GMAIL LABELS GET API] Token authentication failed:",
          userError
        );
        return NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        );
      }

      userId = userData.user.id;
    } else {
      console.error("[GMAIL LABELS GET API] No valid authentication found");
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }
  } else {
    userId = sessionData.session.user.id;
  }

  try {
    // Query Gmail labels for this user
    const { data: labels, error } = await supabase
      .from("gmail_labels")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      console.error("[GMAIL LABELS GET API] Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch labels from database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      labels: labels || [],
      count: labels?.length || 0,
      source: "database",
    });
  } catch (err: any) {
    console.error("[GMAIL LABELS GET API] Error:", err);
    return NextResponse.json(
      { error: err.message || err.toString() },
      { status: 500 }
    );
  }
}
