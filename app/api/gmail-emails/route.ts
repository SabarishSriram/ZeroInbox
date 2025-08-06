import { NextRequest, NextResponse } from "next/server";

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (
        retries >= maxRetries ||
        (error?.response?.status !== 429 && error?.response?.status !== 503)
      ) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      retries++;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the access token from Authorization header
    let accessToken;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7);
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token not found. Please provide an access token." },
        { status: 401 }
      );
    }

    // Get the label ID and query from query parameters
    const url = new URL(request.url);
    const labelId = url.searchParams.get("labelId");
    const searchQuery = url.searchParams.get("query");

    if (!labelId) {
      return NextResponse.json(
        { error: "Label ID is required" },
        { status: 400 }
      );
    }

    // Test access token with a simple Gmail API call first
    const profileTestUrl =
      "https://gmail.googleapis.com/gmail/v1/users/me/profile";
    const profileResponse = await fetch(profileTestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!profileResponse.ok) {
      const profileError = await profileResponse.text();
      return NextResponse.json(
        {
          error: `Access token invalid: ${profileError}`,
        },
        { status: 401 }
      );
    }

    const profileData = await profileResponse.json();

    // Get the maxResults parameter (optional, defaults to 20)
    const maxResults = url.searchParams.get("maxResults") || "20";
    const pageToken = url.searchParams.get("pageToken") || "";

    // Fetch messages from Gmail API with the specific label and optional search query
    let gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=${maxResults}`;

    if (searchQuery) {
      gmailUrl += `&q=${encodeURIComponent(searchQuery)}`;
    }

    if (pageToken) {
      gmailUrl += `&pageToken=${pageToken}`;
    }

    const messagesResponse = await fetch(gmailUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch messages: ${errorText}` },
        { status: 500 }
      );
    }

    const messagesData = await messagesResponse.json();

    if (!messagesData.messages) {
      return NextResponse.json({
        messages: [],
        nextPageToken: messagesData.nextPageToken || null,
        resultSizeEstimate: 0,
      });
    }

    // Process messages in batches to avoid rate limiting
    const batchSize = 5; // Process 5 messages at a time
    const batchDelay = 200; // 200ms delay between batches
    const detailedMessages: any[] = [];

    for (let i = 0; i < messagesData.messages.length; i += batchSize) {
      const batch = messagesData.messages.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (message: { id: string }, index: number) => {
          try {
            const messageDetailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;

            const messageResponse = await retryWithBackoff(async () => {
              return await fetch(messageDetailUrl, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              });
            });

            if (!messageResponse.ok) {
              const errorText = await messageResponse.text();
              return null;
            }

            const messageDetail = await messageResponse.json();

            // Extract headers
            const headers = messageDetail.payload?.headers || [];
            const subject =
              headers.find((h: any) => h.name === "Subject")?.value ||
              "No Subject";
            const from =
              headers.find((h: any) => h.name === "From")?.value ||
              "Unknown Sender";
            const date =
              headers.find((h: any) => h.name === "Date")?.value || "";

            // Check if message is unread
            const isUnread =
              messageDetail.labelIds?.includes("UNREAD") || false;

            return {
              id: message.id,
              threadId: messageDetail.threadId,
              subject,
              from,
              date,
              snippet: messageDetail.snippet || "",
              isUnread,
              labelIds: messageDetail.labelIds || [],
              internalDate: messageDetail.internalDate,
            };
          } catch (error) {
            return null;
          }
        })
      );

      // Add batch results to the main array
      detailedMessages.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < messagesData.messages.length) {
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    }

    // Filter out null results and sort by internal date (newest first)
    const validMessages = detailedMessages
      .filter((msg) => msg !== null)
      .sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));

    return NextResponse.json({
      messages: validMessages,
      nextPageToken: messagesData.nextPageToken || null,
      resultSizeEstimate: messagesData.resultSizeEstimate || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
