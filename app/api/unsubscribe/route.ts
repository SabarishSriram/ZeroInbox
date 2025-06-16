import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { handleUnsubscribe } from "../gmail/unsubscribeUtils";

// Default user ID in UUID format
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: NextRequest) {
  try {
    // Get access token from environment
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token not configured" },
        { status: 500 }
      );
    }

    // Parse request body
    const { domain, action } = await req.json();

    if (!domain || !action || !["trash", "delete"].includes(action)) {
      return NextResponse.json(
        {
          error:
            "Invalid request body. Required: { domain: string, action: 'trash' | 'delete' }",
        },
        { status: 400 }
      );
    }

    // Initialize Gmail API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
      scope:
        "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.settings",
    });

    const gmail = google.gmail({ version: "v1", auth });

    // Handle unsubscribe process
    const result = await handleUnsubscribe(gmail, {
      domain,
      action: action as "trash" | "delete",
      userId: DEFAULT_USER_ID,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully unsubscribed from ${domain} (${action})`,
      domain,
      action,
    });
  } catch (error) {
    console.error("Error in unsubscribe route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
