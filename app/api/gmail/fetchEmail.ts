import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

interface EmailHeader {
  name: string;
  value: string;
}

interface EmailMetadata {
  id: string;
  subject: string;
  from: string;
  date: string;
}

export async function fetchEmail(access_token: string) {
  if (!access_token) {
    return Response.json({ error: "Access token not found" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token,
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  });

  const gmail = google.gmail({ version: "v1", auth });

  try {
    // Step 1: Get the date 1 month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const formattedDate = oneMonthAgo
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "/");
    const query = `in:inbox after:${formattedDate}`;

    // Step 2: Loop through pages
    let allMessages: Array<{ id: string }> = [];
    let nextPageToken: string | null = null;

    do {
      const res = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 100,
        pageToken: nextPageToken ?? undefined,
      });

      const messages = res.data.messages || [];
      allMessages.push(...messages);

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    const detailedEmails = await Promise.all(
      allMessages.map(async (msg) => {
        const message = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = message.data.payload?.headers as
          | EmailHeader[]
          | undefined;
        const headersMap: Record<string, string> = {};

        if (headers) {
          headers.forEach((h) => (headersMap[h.name] = h.value));
        }

        return {
          id: msg.id,
          subject: headersMap["Subject"] || "",
          from: headersMap["From"] || "",
          date: headersMap["Date"] || "",
        } as EmailMetadata;
      })
    );
    console.log("📩 Emails are fetched...")
    return detailedEmails;
  } catch (error) {
    console.error("Gmail API Error:", error);
    return Response.json(
      { error: "Failed to fetch emails. Please check your access token." },
      { status: 401 }
    );
  }
}
