"use client"
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Parse access token from URL hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    if (accessToken) {
      // Store token (for demo, use localStorage; in production, use secure cookies/session)
      localStorage.setItem("google_access_token", accessToken);
      // Optionally, fetch emails here or redirect to inbox page
      router.replace("/fetch-emails");
    } else {
      // Handle error or redirect
      router.replace("/signup?error=oauth");
    }
  }, [router]);

  return <div>Signing you in with Google...</div>;
}
