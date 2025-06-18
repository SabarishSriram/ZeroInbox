"use client";
import { useEffect, useState } from "react";

export default function FetchEmailsPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem("google_access_token");
    console.log("[FetchEmails] accessToken:", accessToken);
    if (!accessToken) {
      setError("No access token found. Please sign up again.");
      return;
    }
    console.log("[FetchEmails] Fetching emails from /api/gmail...");
    fetch("/api/gmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "x-return-emails": "true", // Tell API to return emails
      },
      body: JSON.stringify({ accessToken }),
    })
      .then((res) => {
        console.log("[FetchEmails] Response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("[FetchEmails] Response data:", data);
        if (data.error) setError(data.error);
        else setEmails(data.emails || []);
      })
      .catch((err) => {
        console.error("[FetchEmails] Fetch error:", err);
        setError("Failed to fetch emails.");
      });
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!emails.length) return <div>Loading emails...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2>Your Recent Emails</h2>
      <ul>
        {emails.map((email, i) => (
          <li key={i}>{email.snippet || JSON.stringify(email)}</li>
        ))}
      </ul>
    </div>
  );
}
