import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  console.log("[GMAIL-FILTERS API] POST called");

  // --- AUTHENTICATION & USER CONTEXT (like /api/email/analyze) ---
  const supabase = await createClient();

  // Try to get user ID from query parameters first
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId");
  console.log("[GMAIL-FILTERS API] userId from query:", userId);

  // If no user ID in query params, try to get it from session
  if (!userId) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    console.log(
      "[GMAIL-FILTERS API] sessionData:",
      sessionData,
      "sessionError:",
      sessionError
    );
    if (sessionData?.session?.user) {
      userId = sessionData.session.user.id;
      console.log("[GMAIL-FILTERS API] userId from session:", userId);
    }
  }

  if (!userId) {
    console.error("[GMAIL-FILTERS API] No user ID found in request or session");
    return NextResponse.json(
      { error: "Authentication required. User ID not found." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { accessToken: bodyAccessToken } = body;
  console.log("[GMAIL-FILTERS API] body:", body);

  const accessToken =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    bodyAccessToken ||
    process.env.ACCESS_TOKEN;
  console.log(
    "[GMAIL-FILTERS API] accessToken:",
    accessToken ? "present" : "missing"
  );

  if (!accessToken) {
    console.error("[GMAIL-FILTERS API] Access token not found");
    return NextResponse.json(
      { error: "Missing access token" },
      { status: 400 }
    );
  }

  // Fetch unsubscribed senders for this user
  console.log(
    "[GMAIL-FILTERS API] Fetching unsubscribed senders for user:",
    userId
  );

  // Check if user_id column exists first
  const { data: tableInfo, error: tableError } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_name", "unsubscribed_senders")
    .eq("column_name", "user_id");

  const hasUserIdColumn = tableInfo && tableInfo.length > 0;
  console.log("[GMAIL-FILTERS API] Table has user_id column:", hasUserIdColumn);

  let senders, error;
  if (hasUserIdColumn) {
    // Query with user_id filter
    const result = await supabase
      .from("unsubscribed_senders")
      .select("sender")
      .eq("user_id", userId);
    senders = result.data;
    error = result.error;
  } else {
    // Fallback: Query all senders (for old table structure)
    console.log(
      "[GMAIL-FILTERS API] Using fallback query without user_id filter"
    );
    const result = await supabase.from("unsubscribed_senders").select("sender");
    senders = result.data;
    error = result.error;
  }

  if (error) {
    console.error("[GMAIL-FILTERS API] Failed to fetch senders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!senders || senders.length === 0) {
    console.log(
      "[GMAIL-FILTERS API] No unsubscribed senders found for user:",
      userId
    );
    return NextResponse.json(
      { error: "No unsubscribed senders found" },
      { status: 404 }
    );
  }

  // Fetch existing filters from Gmail
  console.log("[GMAIL-FILTERS API] Fetching existing Gmail filters");
  const filtersRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/settings/filters",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const filtersData = await filtersRes.json();
  const existingFilters = Array.isArray(filtersData.filter)
    ? filtersData.filter
    : [];
  console.log(
    "[GMAIL-FILTERS API] Found existing filters:",
    existingFilters.length
  );

  const results = [];

  for (const sender of senders) {
    const email = sender.sender;
    if (!email) {
      console.warn("[GMAIL-FILTERS API] Empty sender email:", sender);
      results.push({ email, success: false, error: "Empty sender email" });
      continue;
    }

    // Check if a filter for this sender already exists
    const alreadyExists = existingFilters.some(
      (f: any) => f.criteria?.from === email
    );
    if (alreadyExists) {
      console.log("[GMAIL-FILTERS API] Filter already exists for:", email);
      results.push({ email, success: false, error: "Filter already exists" });
      continue;
    }

    try {
      console.log("[GMAIL-FILTERS API] Creating filter for:", email);
      const filterRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/settings/filters",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            criteria: { from: email },
            action: {
              removeLabelIds: ["INBOX"],
              addLabelIds: ["TRASH"],
            },
          }),
        }
      );

      const filterData = await filterRes.json();

      if (filterRes.ok) {
        console.log(
          "[GMAIL-FILTERS API] Filter created successfully:",
          email,
          filterData.id
        );
        results.push({ email, success: true, filterId: filterData.id });
      } else {
        console.error(
          "[GMAIL-FILTERS API] Filter creation failed:",
          email,
          filterData
        );
        results.push({
          email,
          success: false,
          error: filterData.error || filterData,
        });
      }
    } catch (err: any) {
      console.error("[GMAIL-FILTERS API] Error creating filter:", email, err);
      results.push({ email, success: false, error: err.message });
    }
  }

  console.log("[GMAIL-FILTERS API] Returning results:", results);
  return NextResponse.json({ results });
}
