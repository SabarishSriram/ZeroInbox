import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { fetchAndStoreIncrementalEmails } from "@/lib/email/incrementalFetch";

// This route triggers an incremental Gmail sync for the authenticated user
export async function POST(req: NextRequest) {
  // Authenticate user using Supabase session
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // You may need to get the provider_token for Gmail API access
  const accessToken = session.provider_token;
  const userId = session.user.id;
  const userEmail = session.user.email;

  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "No Google access token found. Please sign in with Google again.",
      },
      { status: 401 }
    );
  }
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 401 });
  }

  try {
    const result = await fetchAndStoreIncrementalEmails({
      accessToken,
      userId,
      userEmail,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
