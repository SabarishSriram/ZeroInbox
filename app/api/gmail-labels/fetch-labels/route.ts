import { google } from "googleapis";
import { createClient, Session, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function getGmailClientFromSession() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  const session = sessionData.session as Session;
  if (error || !session?.provider_token) {
    throw new Error("Failed to retrieve Google access token from session");
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.provider_token });
  return google.gmail({ version: "v1", auth });
}

async function storeLabelsInSupabase(labels: any[], userId: string) {
  const formattedLabels = labels.map((label) => ({
    id: label.id,
    name: label.name,
    user_id: userId,
  }));

  const { error } = await supabase.from("gmail_labels").upsert(formattedLabels);
  if (error) {
    throw new Error(`Failed to store labels in Supabase: ${error.message}`);
  }
}

export async function GET(request: Request) {
  try {
    const gmail = await getGmailClientFromSession();
    const labelsResponse = await gmail.users.labels.list({ userId: "me" });
    const labels = labelsResponse.data.labels || [];

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user as User;
    if (userError || !user?.id) {
      throw new Error("Failed to retrieve user information");
    }

    await storeLabelsInSupabase(labels, user.id);

    return Response.json({ success: true, labels });
  } catch (err: any) {
    return Response.json(
      { error: err.message || err.toString() },
      { status: 500 }
    );
  }
}
