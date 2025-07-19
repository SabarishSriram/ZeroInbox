import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  console.log("[SAFE-SENDERS API] GET called");

  // --- AUTHENTICATION & USER CONTEXT ---
  const supabase = await createClient();
  let userId: string;

  // Get the session from Supabase (this should work with cookies)
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  console.log(
    "[SAFE-SENDERS API] sessionData:",
    sessionData?.session?.user?.id
  );
  console.log("[SAFE-SENDERS API] sessionError:", sessionError);

  // If no session from cookies, try the Authorization header
  if (sessionError || !sessionData?.session?.user) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // Create a new client with the token
      const { data: userData, error: userError } = await supabase.auth.getUser(
        token
      );
      console.log("[SAFE-SENDERS API] User from token:", userData?.user?.id);

      if (userError || !userData?.user) {
        console.error(
          "[SAFE-SENDERS API] Token authentication failed:",
          userError
        );
        return NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        );
      }

      userId = userData.user.id;
    } else {
      console.error("[SAFE-SENDERS API] No valid authentication found");
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }
  } else {
    userId = sessionData.session.user.id;
  }

  try {
    // Query safe senders for this user
    const { data: safeSenders, error } = await supabase
      .from("safe_senders")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[SAFE-SENDERS API] Failed to fetch safe senders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(
      "[SAFE-SENDERS API] Found safe senders:",
      safeSenders?.length || 0
    );

    return NextResponse.json({
      senders: safeSenders || [],
      count: safeSenders?.length || 0,
    });
  } catch (err) {
    console.error("[SAFE-SENDERS API] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
