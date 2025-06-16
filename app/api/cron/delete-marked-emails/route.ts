import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    // Verify cron job secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(cookies());

    // Get all users with delete filters
    const { data: users, error: usersError } = await supabase
      .from("unsubscribed_domains")
      .select("user_id, gmail_filter_id")
      .eq("action", "delete");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Process each user's emails
    for (const user of users) {
      try {
        // Get user's Gmail access token
        const { data: session, error: sessionError } =
          await supabase.auth.admin.getUserById(user.user_id);
        if (sessionError || !session?.user?.provider_token) {
          console.error(
            `Error getting session for user ${user.user_id}:`,
            sessionError
          );
          continue;
        }

        // Initialize Gmail API client
        const auth = new google.auth.OAuth2();
        auth.setCredentials({
          access_token: session.user.provider_token,
          scope: "https://www.googleapis.com/auth/gmail.modify",
        });

        const gmail = google.gmail({ version: "v1", auth });

        // Get messages with TO_DELETE label
        const response = await gmail.users.messages.list({
          userId: "me",
          labelIds: ["TO_DELETE"],
        });

        const messages = response.data.messages || [];
        if (messages.length === 0) continue;

        // Delete messages
        const messageIds = messages.map((msg: any) => msg.id);
        await gmail.users.messages.batchDelete({
          userId: "me",
          requestBody: {
            ids: messageIds,
          },
        });

        console.log(
          `Deleted ${messageIds.length} messages for user ${user.user_id}`
        );
      } catch (error) {
        console.error(`Error processing user ${user.user_id}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      message: "Successfully processed delete requests",
      processedUsers: users.length,
    });
  } catch (error) {
    console.error("Error in delete-marked-emails cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
