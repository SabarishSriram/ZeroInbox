import { NextRequest, NextResponse } from "next/server";
import { fetchEmail } from "./fetchEmail";
import { analyzeSenders } from "./emailStats";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const accessToken = process.env.ACCESS_TOKEN!;
  console.time("📩 Emails are fetched");
  const emails = await fetchEmail(accessToken);
  console.timeEnd("📩 Emails are fetched");

  if (emails instanceof Response) {
    return emails;
  }
  console.time("📊 Analyze Stats");
  const stats = analyzeSenders(emails);
  console.timeEnd("📊 Analyze Stats");

  console.time("⬆️ Insert into Supabase");
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
  console.timeEnd("⬆️ Insert into Supabase");

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
