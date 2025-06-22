import { google } from "googleapis";

async function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      body.accessToken;
    if (!accessToken) {
      return Response.json({ error: "Missing access token" }, { status: 401 });
    }
    const gmail = await getGmailClient(accessToken);

    if (!body.senders || !body.labelId) {
      return Response.json({ error: "Missing senders or labelId" }, { status: 400 });
    }
    let moved = 0;
    for (const sender of body.senders) {
      const msgs = await gmail.users.messages.list({
        userId: "me",
        q: `from:${sender}`,
        maxResults: 500,
      });
      const ids = (msgs.data.messages || []).map((m) => m.id!);
      if (ids.length) {
        await gmail.users.messages.batchModify({
          userId: "me",
          requestBody: {
            ids,
            addLabelIds: [body.labelId],
          },
        });
        moved += ids.length;
      }
    }
    return Response.json({ success: true, moved });
  } catch (err: any) {
    return Response.json({ error: err.message || err.toString() }, { status: 500 });
  }
}
