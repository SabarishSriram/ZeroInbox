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

async function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export async function POST(req: NextRequest) {
  console.log("[RENAME GMAIL LABEL API] POST called");

  try {
    // Parse request body to get access token, user info, and rename details
    let accessToken, userId, userEmail, labelId, newName;
    try {
      const requestBody = await req.json();
      accessToken = requestBody.accessToken;
      userId = requestBody.userId;
      userEmail = requestBody.userEmail;
      labelId = requestBody.labelId;
      newName = requestBody.newName;

      console.log("Request body data:", {
        hasAccessToken: !!accessToken,
        userId,
        userEmail,
        labelId,
        newName,
      });
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!accessToken) {
      console.error("Missing access token");
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    if (!labelId || !newName) {
      console.error("Missing required fields:", { labelId, newName });
      return NextResponse.json(
        { error: "Missing labelId or newName" },
        { status: 400 }
      );
    }

    console.log("Initializing Gmail API client...");
    const gmail = await getGmailClient(accessToken);

    console.log(`Renaming label ${labelId} to "${newName}"...`);

    // Rename the label using Gmail API with retry logic
    const result = await retryWithBackoff(async () => {
      return await gmail.users.labels.update({
        userId: "me",
        id: labelId,
        requestBody: {
          name: newName.trim(),
        },
      });
    });

    console.log("Label renamed successfully:", result.data);

    return NextResponse.json({
      success: true,
      label: result.data,
      message: "Label renamed successfully",
    });
  } catch (error: any) {
    console.error("Error in rename label API:", error);

    // Handle specific Gmail API errors
    if (error?.response?.status === 404) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (error?.response?.status === 400) {
      return NextResponse.json(
        { error: "Invalid label name or label already exists" },
        { status: 400 }
      );
    }

    if (error?.response?.status === 401) {
      return NextResponse.json(
        {
          error: "Authentication failed - please reconnect your Gmail account",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to rename label",
        details: error?.response?.data || error.toString(),
      },
      { status: 500 }
    );
  }
}
