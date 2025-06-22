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

    if (!body.fromLabelId || !body.toLabelId) {
      return Response.json({ error: "Missing fromLabelId or toLabelId" }, { status: 400 });
    }
    const msgs = await gmail.users.messages.list({
      userId: "me",
      labelIds: [body.fromLabelId],
      maxResults: 500,
    });
    const ids = (msgs.data.messages || []).map((m) => m.id!);
    if (!ids.length) return Response.json({ message: "No messages found." });
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids,
        addLabelIds: [body.toLabelId],
        removeLabelIds: [body.fromLabelId],
      },
    });
    return Response.json({ success: true, moved: ids.length });
  } catch (err: any) {
    return Response.json({ error: err.message || err.toString() }, { status: 500 });
  }
}
