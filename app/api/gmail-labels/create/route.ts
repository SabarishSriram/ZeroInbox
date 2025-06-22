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

    if (!body.name || typeof body.name !== "string") {
      return Response.json({ error: "Missing or invalid label name" }, { status: 400 });
    }
    const res = await gmail.users.labels.create({
      userId: "me",
      requestBody: { name: body.name },
    });
    return Response.json({ label: res.data });
  } catch (err: any) {
    return Response.json({ error: err.message || err.toString() }, { status: 500 });
  }
}
