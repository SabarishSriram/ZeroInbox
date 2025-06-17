import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { processExistingEmails } from "../gmail/unsubscribeUtils"; // You'll need to export this
import { handleUnsubscribe } from "../gmail/unsubscribeUtils";

// Default user ID in UUID format
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token not configured" },
        { status: 500 }
      );
    }

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

    // Initialize Gmail client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
      scope:
        action === "delete"
          ? "https://www.googleapis.com/auth/gmail.modify"
          : [
              "https://www.googleapis.com/auth/gmail.modify",
              "https://www.googleapis.com/auth/gmail.settings",
              "https://www.googleapis.com/auth/gmail.labels",
            ].join(" "),
    });

    const gmail = google.gmail({ version: "v1", auth });

    // ✂️ Delete case: just delete existing emails
    if (action === "delete") {
      try {
        const result = await processExistingEmails(gmail, domain, "delete");

        if (!result.success) {
          console.error("Delete operation failed:", result.error);
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
          message: `Successfully deleted emails from ${domain}`,
          domain,
          action,
        });
      } catch (error: any) {
        console.error("Error during delete operation:", error);
        if (error.response?.status === 403) {
          return NextResponse.json(
            {
              error:
                "Insufficient permissions to delete emails. Please check your Gmail API scopes.",
            },
            { status: 403 }
          );
        }
        throw error; // Let the outer catch handle other errors
      }
    }

    // 🗑 Trash case: use full unsubscribe flow
    const result = await handleUnsubscribe(gmail, {
      domain,
      action: "trash",
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
