import { NextRequest, NextResponse } from "next/server";
import { fetchEmail } from "./fetchEmail";
import { analyzeSenders } from "./emailStats";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const accessToken = process.env.ACCESS_TOKEN!;
  const emails = await fetchEmail(accessToken);

  if (emails instanceof Response) {
    return emails;
  }

  const stats = analyzeSenders(emails);

  // Store in Supabase
  const supabase = createClient(cookies());
  const { data, error } = await supabase.from("email_stats").upsert(
    stats.map((stat) => ({
      domain: stat.domain,
      company_name: stat.companyName,
      total_emails: stat.totalEmails,
      weekly_avg: stat.weeklyAvg,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "domain" }
  );

  if (error) {
    console.error("Error storing stats:", error);
    return NextResponse.json(
      { error: "Failed to store stats" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Stats stored successfully",
    inserted: data,
  });
}
