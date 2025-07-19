import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  console.log("[UNSUBSCRIBED-SENDERS API] GET called");

  // --- AUTHENTICATION & USER CONTEXT ---
  const supabase = await createClient();

  // Try to get user ID from query parameters first
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId");
  console.log("[UNSUBSCRIBED-SENDERS API] userId from query:", userId);

  // If no user ID in query params, try to get it from session
  if (!userId) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    console.log(
      "[UNSUBSCRIBED-SENDERS API] sessionData:",
      sessionData,
      "sessionError:",
      sessionError
    );
    if (sessionData?.session?.user) {
      userId = sessionData.session.user.id;
      console.log("[UNSUBSCRIBED-SENDERS API] userId from session:", userId);
    }
  }

  if (!userId) {
    console.error(
      "[UNSUBSCRIBED-SENDERS API] No user ID found in request or session"
    );
    return NextResponse.json(
      { error: "Authentication required. User ID not found." },
      { status: 401 }
    );
  }

  try {
    // Check if user_id column exists first
    const { data: tableInfo, error: tableError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "unsubscribed_senders")
      .eq("column_name", "user_id");

    const hasUserIdColumn = tableInfo && tableInfo.length > 0;
    console.log(
      "[UNSUBSCRIBED-SENDERS API] Table has user_id column:",
      hasUserIdColumn
    );

    let senders, error;
    if (hasUserIdColumn) {
      // Query with user_id filter
      const result = await supabase
        .from("unsubscribed_senders")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      senders = result.data;
      error = result.error;
    } else {
      // Fallback: Query all senders (for old table structure)
      console.log(
        "[UNSUBSCRIBED-SENDERS API] Using fallback query without user_id filter"
      );
      const result = await supabase
        .from("unsubscribed_senders")
        .select("*")
        .order("updated_at", { ascending: false });
      senders = result.data;
      error = result.error;
    }

    if (error) {
      console.error(
        "[UNSUBSCRIBED-SENDERS API] Failed to fetch senders:",
        error
      );
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(
      "[UNSUBSCRIBED-SENDERS API] Found senders:",
      senders?.length || 0
    );
    return NextResponse.json({
      senders: senders || [],
      count: senders?.length || 0,
    });
  } catch (err) {
    console.error("[UNSUBSCRIBED-SENDERS API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
