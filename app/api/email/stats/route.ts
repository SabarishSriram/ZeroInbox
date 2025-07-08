import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Try to get user ID from query parameters first
    const url = new URL(req.url);
    let userId = url.searchParams.get("userId");

    // If no user ID in query params, try to get it from session
    if (!userId) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionData?.session?.user) {
        userId = sessionData.session.user.id;
        console.log("Using user ID from session:", userId);
      }
    }

    if (!userId) {
      console.error("No user ID found in request or session");
      return NextResponse.json(
        { error: "Authentication required. User ID not found." },
        { status: 401 }
      );
    }

    console.log("Fetching stats for user ID:", userId);

    const { data, error } = await supabase
      .from("email_stats")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching email stats:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch email stats", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats: data });
  } catch (err) {
    console.error(
      "Unexpected error fetching email stats:",
      (err as Error).message
    );
    return NextResponse.json(
      { error: "Unexpected error occurred", details: (err as Error).message },
      { status: 500 }
    );
  }
}
