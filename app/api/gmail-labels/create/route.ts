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
  console.log("[CREATE GMAIL LABEL API] POST called");

  try {
    // Parse request body to get access token, user info, and label details
    let accessToken, userId, userEmail, labelName, parentLabelId;
    try {
      const requestBody = await req.json();
      accessToken = requestBody.accessToken;
      userId = requestBody.userId;
      userEmail = requestBody.userEmail;
      labelName = requestBody.labelName || requestBody.name; // Support both field names
      parentLabelId = requestBody.parentLabelId; // Optional for nested labels

      console.log("Request body data:", {
        hasAccessToken: !!accessToken,
        userId,
        userEmail,
        labelName,
        parentLabelId,
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

    if (!labelName) {
      console.error("No label name provided");
      return NextResponse.json(
        { error: "Label name is required." },
        { status: 400 }
      );
    }

    console.log("Creating label:", labelName);

    // Create Supabase client
    const supabase = await createClient();

    // Set up Gmail API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
      scope: "https://www.googleapis.com/auth/gmail.modify",
    });
    const gmail = google.gmail({ version: "v1", auth });

    // Build the label name for nested labels
    let fullLabelName = labelName;
    if (parentLabelId && parentLabelId !== "none") {
      // Get parent label name from Gmail
      try {
        const parentLabel = await retryWithBackoff(() =>
          gmail.users.labels.get({
            userId: "me",
            id: parentLabelId,
          })
        );

        if (parentLabel.data.name) {
          fullLabelName = `${parentLabel.data.name}/${labelName}`;
        }
      } catch (error) {
        console.warn("Could not get parent label name:", error);
        // Continue with just the label name if parent lookup fails
      }
    }

    console.log("Full label name:", fullLabelName);

    // Create label in Gmail
    try {
      const createResponse = await retryWithBackoff(() =>
        gmail.users.labels.create({
          userId: "me",
          requestBody: {
            name: fullLabelName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          },
        })
      );

      const newLabel = createResponse.data;
      console.log("✓ Successfully created label in Gmail:", newLabel.id);

      // Store the new label in our database if userId is provided
      if (userId) {
        try {
          const labelToInsert = {
            user_id: userId,
            label_id: newLabel.id!,
            name: newLabel.name!,
            type: newLabel.type || "user",
            messages_total: 0,
            messages_unread: 0,
            threads_total: 0,
            threads_unread: 0,
            color_background_color: newLabel.color?.backgroundColor || null,
            color_text_color: newLabel.color?.textColor || null,
            label_list_visibility: newLabel.labelListVisibility || "labelShow",
            message_list_visibility: newLabel.messageListVisibility || "show",
          };

          const { data: insertedLabel, error: insertError } = await supabase
            .from("gmail_labels")
            .insert([labelToInsert])
            .select()
            .single();

          if (insertError) {
            console.error("Error storing label in database:", insertError);
            // Don't fail the request, just log the error
          } else {
            console.log("✓ Successfully stored label in database");
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
          // Don't fail the request for storage errors
        }
      }

      return NextResponse.json({
        success: true,
        label: newLabel,
        message: `Label "${fullLabelName}" created successfully`,
      });
    } catch (gmailError: any) {
      console.error("Gmail API error:", gmailError);

      if (gmailError.message?.includes("Label name exists")) {
        return NextResponse.json(
          { error: `Label "${fullLabelName}" already exists.` },
          { status: 409 }
        );
      }

      if (
        gmailError.message?.includes("invalid_grant") ||
        gmailError.message?.includes("Token has been expired")
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
        { error: `Failed to create label: ${gmailError.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[CREATE GMAIL LABEL API] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error while creating label",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
