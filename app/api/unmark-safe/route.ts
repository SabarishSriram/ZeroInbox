import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    console.log("[UNMARK SAFE API] POST called");

    // --- AUTHENTICATION & USER CONTEXT ---
    const supabase = await createClient();
    let userId: string;

    // Get the session from Supabase (this should work with cookies)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    console.log(
      "[UNMARK SAFE API] sessionData:",
      sessionData?.session?.user?.id
    );
    console.log("[UNMARK SAFE API] sessionError:", sessionError);

    // If no session from cookies, try the Authorization header
    if (sessionError || !sessionData?.session?.user) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        // Create a new client with the token
        const { data: userData, error: userError } =
          await supabase.auth.getUser(token);
        console.log("[UNMARK SAFE API] User from token:", userData?.user?.id);

        if (userError || !userData?.user) {
          console.error(
            "[UNMARK SAFE API] Token authentication failed:",
            userError
          );
          return NextResponse.json(
            { error: "Authentication required. Please sign in." },
            { status: 401 }
          );
        }

        userId = userData.user.id;
      } else {
        console.error("[UNMARK SAFE API] No valid authentication found");
        return NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        );
      }
    } else {
      userId = sessionData.session.user.id;
    }

    console.log(
      "[UNMARK SAFE API] Final userId being used:",
      userId,
      "type:",
      typeof userId
    );

    const body = await req.json();
    const { domain } = body;
    console.log("[UNMARK SAFE API] body:", body);

    if (!domain) {
      console.error("[UNMARK SAFE API] Missing domain");
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    // Remove the domain from safe_senders table
    const { data: deleteData, error: deleteError } = await supabase
      .from("safe_senders")
      .delete()
      .eq("user_id", userId)
      .eq("domain", domain)
      .select();

    if (deleteError) {
      console.error(
        "[UNMARK SAFE API] Failed to delete from safe_senders:",
        deleteError
      );
      return NextResponse.json(
        { error: "Failed to remove from safe list. Please try again." },
        { status: 500 }
      );
    } else {
      console.log(
        "[UNMARK SAFE API] Successfully deleted from safe_senders:",
        deleteData
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${domain} from safe list`,
      domain: domain,
    });
  } catch (error: any) {
    console.error("[UNMARK SAFE API] Request processing failed:", error);
    return NextResponse.json(
      { error: "Failed to process unmark safe request" },
      { status: 500 }
    );
  }
}
