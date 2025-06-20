import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing access token" },
      { status: 400 }
    );
  }

  // Fetch unsubscribed senders from the correct table/column
  const { data: senders, error } = await supabase
    .from("unsubscribed_senders")
    .select("sender");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!senders || senders.length === 0) {
    return NextResponse.json(
      { error: "No unsubscribed senders found" },
      { status: 404 }
    );
  }

  // Fetch existing filters from Gmail
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

  const results = [];

  for (const sender of senders) {
    const email = sender.sender;
    if (!email) {
      results.push({ email, success: false, error: "Empty sender email" });
      continue;
    }

    // Check if a filter for this sender already exists
    const alreadyExists = existingFilters.some(
      (f: any) => f.criteria?.from === email
    );
    if (alreadyExists) {
      results.push({ email, success: false, error: "Filter already exists" });
      continue;
    }

    try {
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
        results.push({ email, success: true, filterId: filterData.id });
      } else {
        results.push({
          email,
          success: false,
          error: filterData.error || filterData,
        });
      }
    } catch (err: any) {
      results.push({ email, success: false, error: err.message });
    }
  }

  return NextResponse.json({ results });
}
