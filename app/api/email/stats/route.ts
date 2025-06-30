import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("email_stats")
      .select("*")
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
