import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[MOVE TO LABEL API] POST called");
    console.log("Authorization header:", request.headers.get("authorization"));

    // Parse request body to get access token and user info
    let accessToken, userId, userEmail, senderDomain, senderEmail, labelId;
    try {
      const requestBody = await request.json();
      accessToken = requestBody.accessToken;
      userId = requestBody.userId;
      userEmail = requestBody.userEmail;
      senderDomain = requestBody.senderDomain;
      senderEmail = requestBody.senderEmail;
      labelId = requestBody.labelId;

      console.log("Request body data:", {
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        userId,
        userEmail,
        senderDomain,
        senderEmail,
        labelId,
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
      const authHeader = request.headers.get("authorization");
      console.log(
        "Checking auth header:",
        authHeader?.substring(0, 20) + "..."
      );
      if (authHeader?.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7);
        console.log(
          "Got access token from header, length:",
          accessToken.length
        );
      }
    }

    if (!accessToken) {
      console.error("No access token found in body or header");
      return NextResponse.json(
        { error: "Access token not found. Please provide an access token." },
        { status: 401 }
      );
    }

    console.log("Using access token with length:", accessToken.length);

    if (!senderDomain || !labelId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Test access token with a simple Gmail API call first
    console.log("Testing access token with profile call...");
    const profileTestUrl =
      "https://gmail.googleapis.com/gmail/v1/users/me/profile";
    const profileResponse = await fetch(profileTestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Profile test response status:", profileResponse.status);
    if (!profileResponse.ok) {
      const profileError = await profileResponse.text();
      console.error("Access token test failed:", profileError);
      return NextResponse.json(
        {
          error: `Access token invalid: ${profileError}`,
        },
        { status: 401 }
      );
    }

    const profileData = await profileResponse.json();
    console.log("Access token valid, email:", profileData.emailAddress);

    console.log("Moving emails to label:", {
      senderDomain,
      senderEmail,
      labelId,
    });

    // Step 1: Search for emails from the sender
    const searchQuery = senderEmail
      ? `from:${senderEmail}`
      : `from:@${senderDomain}`;
    console.log("Search query:", searchQuery);

    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      searchQuery
    )}&maxResults=500`;
    console.log("Search URL:", searchUrl);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Search response status:", searchResponse.status);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Gmail API Search Error:", errorText);
      return NextResponse.json(
        { error: `Failed to search for emails: ${errorText}` },
        { status: 500 }
      );
    }

    const searchData = await searchResponse.json();
    console.log("Search response data:", {
      messageCount: searchData.messages?.length || 0,
      resultSizeEstimate: searchData.resultSizeEstimate,
    });

    if (!searchData.messages || searchData.messages.length === 0) {
      console.log("No emails found for sender:", senderDomain);
      return NextResponse.json({
        message: "No emails found for this sender",
        movedCount: 0,
      });
    }

    console.log(`Found ${searchData.messages.length} emails to move`);

    // Step 2: Add the label to all found messages
    const messageIds = searchData.messages.map((msg: { id: string }) => msg.id);
    console.log(
      "Message IDs to modify:",
      messageIds.slice(0, 5),
      "... (showing first 5)"
    );

    // Gmail API allows batch modify with up to 1000 message IDs
    const batchModifyUrl =
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify";
    console.log("Batch modify URL:", batchModifyUrl);
    console.log("Label ID to add:", labelId);

    const batchModifyResponse = await fetch(batchModifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: messageIds,
        addLabelIds: [labelId],
        // Optionally remove from INBOX if you want to "move" instead of "copy"
        // removeLabelIds: ['INBOX']
      }),
    });

    console.log("Batch modify response status:", batchModifyResponse.status);

    if (!batchModifyResponse.ok) {
      const errorText = await batchModifyResponse.text();
      console.error("Gmail API Batch Modify Error:", errorText);
      return NextResponse.json(
        { error: `Failed to move emails to label: ${errorText}` },
        { status: 500 }
      );
    }

    console.log(
      `Successfully moved ${messageIds.length} emails to label ${labelId}`
    );

    return NextResponse.json({
      message: `Successfully moved ${messageIds.length} emails to the selected label`,
      movedCount: messageIds.length,
      labelId,
      senderDomain,
    });
  } catch (error) {
    console.error("Error moving emails to label:", error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes("401")) {
      return NextResponse.json(
        { error: "Authentication failed. Please sign in again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
