export function analyzeSenders(
  emailData: { id: string; from: string; date: string }[]
) {
  const companyMap: Record<string, { count: number; dates: string[] }> = {};

  for (const email of emailData) {
    const fromHeader = email.from;
    const emailMatch =
      fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^ ]+@[^ ]+)/);
    const emailAddr = emailMatch ? emailMatch[1] : fromHeader;

    const domain = emailAddr.split("@")[1]?.toLowerCase() || "unknown";

    if (!companyMap[domain]) {
      companyMap[domain] = { count: 0, dates: [] };
    }

    companyMap[domain].count += 1;
    companyMap[domain].dates.push(email.date);
  }

  const today = new Date();
  const firstEmailDate = new Date(
    Math.min(
      ...emailData.map((e) => {
        try {
          return new Date(e.date).getTime();
        } catch {
          return today.getTime();
        }
      })
    )
  );

  // Calculate weeks between first email and today
  const weeks = Math.max(
    1,
    Math.ceil(
      (today.getTime() - firstEmailDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
  );

  const result = Object.entries(companyMap).map(([domain, data]) => {
    // Calculate weeks for this specific domain
    const domainFirstDate = new Date(
      Math.min(
        ...data.dates.map((d) => {
          try {
            return new Date(d).getTime();
          } catch {
            return today.getTime();
          }
        })
      )
    );
    const domainWeeks = Math.max(
      1,
      Math.ceil(
        (today.getTime() - domainFirstDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    );

    return {
      domain,
      companyName: domain.split(".").slice(0, -1).join("."),
      totalEmails: data.count,
      weeklyAvg: +(data.count / domainWeeks).toFixed(2),
    };
  });

  // Sort by most emails
  result.sort((a, b) => b.totalEmails - a.totalEmails);
  return result;
}
