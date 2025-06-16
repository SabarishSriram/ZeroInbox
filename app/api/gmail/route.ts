import { NextRequest, NextResponse } from "next/server";
import { fetchEmail } from "./fetchEmail";
import { analyzeSenders } from "./emailStats";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { parseListUnsubscribeHeader } from "./unsubscribeUtils";

export async function POST(req: NextRequest) {
  const accessToken = process.env.ACCESS_TOKEN!;
  console.time("📩 Emails are fetched");
  const emails = await fetchEmail(accessToken);
  console.timeEnd("📩 Emails are fetched");

  if (emails instanceof Response) {
    return emails;
  }

  // Debug: Log emails with List-Unsubscribe headers
  const emailsWithUnsubscribe = emails.filter((email) => email.listUnsubscribe);
  console.log(
    "Emails with List-Unsubscribe headers:",
    emailsWithUnsubscribe.length
  );
  if (emailsWithUnsubscribe.length > 0) {
    console.log(
      "Sample List-Unsubscribe header:",
      emailsWithUnsubscribe[0].listUnsubscribe
    );
  }

  console.time("📊 Analyze Stats");
  const stats = analyzeSenders(emails);
  console.timeEnd("📊 Analyze Stats");

  // Debug: Log stats with List-Unsubscribe headers
  const statsWithUnsubscribe = stats.filter((stat) => stat.listUnsubscribe);
  console.log(
    "Stats with List-Unsubscribe headers:",
    statsWithUnsubscribe.length
  );
  if (statsWithUnsubscribe.length > 0) {
    console.log("Sample stat with List-Unsubscribe:", statsWithUnsubscribe[0]);
  }

  console.time("⬆️ Insert into Supabase");
  const supabase = createClient(cookies());
  const { data, error } = await supabase.from("email_stats").upsert(
    stats.map((stat) => ({
      domain: stat.domain,
      company_name: stat.companyName,
      total_emails: stat.totalEmails,
      weekly_avg: stat.weeklyAvg,
      updated_at: new Date().toISOString(),
      // Add List-Unsubscribe header to the upsert
      unsubscribe_url: stat.listUnsubscribe
        ? parseListUnsubscribeHeader(stat.listUnsubscribe).unsubscribeUrl
        : null,
      unsubscribe_email: stat.listUnsubscribe
        ? parseListUnsubscribeHeader(stat.listUnsubscribe).unsubscribeEmail
        : null,
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
