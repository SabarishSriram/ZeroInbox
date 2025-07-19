import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    console.log("[MARK SAFE API] POST called");

    // --- AUTHENTICATION & USER CONTEXT ---
    const supabase = await createClient();
    let userId: string;

    // Get the session from Supabase (this should work with cookies)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    console.log("[MARK SAFE API] sessionData:", sessionData?.session?.user?.id);
    console.log("[MARK SAFE API] sessionError:", sessionError);

    // If no session from cookies, try the Authorization header
    if (sessionError || !sessionData?.session?.user) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        // Create a new client with the token
        const { data: userData, error: userError } =
          await supabase.auth.getUser(token);
        console.log("[MARK SAFE API] User from token:", userData?.user?.id);

        if (userError || !userData?.user) {
          console.error(
            "[MARK SAFE API] Token authentication failed:",
            userError
          );
          return NextResponse.json(
            { error: "Authentication required. Please sign in." },
            { status: 401 }
          );
        }

        userId = userData.user.id;
      } else {
        console.error("[MARK SAFE API] No valid authentication found");
        return NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        );
      }
    } else {
      userId = sessionData.session.user.id;
    }

    console.log(
      "[MARK SAFE API] Final userId being used:",
      userId,
      "type:",
      typeof userId
    );

    const body = await req.json();
    const { domain } = body;
    console.log("[MARK SAFE API] body:", body);

    if (!domain) {
      console.error("[MARK SAFE API] Missing domain");
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    // Insert or update the domain as marked safe
    try {
      // First, try to find existing record for this user and domain
      const { data: existingRecord, error: selectError } = await supabase
        .from("safe_senders")
        .select("*")
        .eq("user_id", userId)
        .eq("domain", domain)
        .maybeSingle();

      console.log(
        "[MARK SAFE API] Existing record:",
        existingRecord,
        "select error:",
        selectError
      );

      if (existingRecord) {
        // Update existing record
        const { data: updateData, error: updateError } = await supabase
          .from("safe_senders")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("domain", domain)
          .select();

        if (updateError) {
          console.error("[MARK SAFE API] Failed to update:", updateError);
        } else {
          console.log("[MARK SAFE API] Successfully updated:", updateData);
        }
      } else {
        // Insert new record with user_id
        const insertPayload = {
          user_id: userId,
          domain: domain,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log(
          "[MARK SAFE API] Attempting to insert payload:",
          insertPayload
        );

        const { data: insertData, error: insertError } = await supabase
          .from("safe_senders")
          .insert(insertPayload)
          .select();

        if (insertError) {
          console.error("[MARK SAFE API] Failed to insert:", insertError);
          console.error("[MARK SAFE API] Insert error details:", {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
          });

          return NextResponse.json(
            { error: "Failed to mark domain as safe. Please try again." },
            { status: 500 }
          );
        } else {
          console.log("[MARK SAFE API] Successfully inserted:", insertData);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully marked ${domain} as safe`,
        domain: domain,
      });
    } catch (err: any) {
      console.error("[MARK SAFE API] Unexpected error:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[MARK SAFE API] Request processing failed:", error);
    return NextResponse.json(
      { error: "Failed to process mark safe request" },
      { status: 500 }
    );
  }
}
