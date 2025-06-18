"use client";
import { useEffect } from "react";

export default function SignupPage() {
  useEffect(() => {
    // Google OAuth2 endpoint for requesting an access token
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/api/auth/callback`,
      response_type: "token",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
      ].join(" "),
      include_granted_scopes: "true",
      state: "signup",
    });
    (
      window as any
    ).googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }, []);
  const handleGoogleSignup = () => {
    window.location.href = (window as any).googleOAuthUrl;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 80,
      }}
    >
      <h1>Sign up with Google</h1>
      <button
        style={{
          padding: "12px 24px",
          fontSize: 18,
          borderRadius: 6,
          background: "#4285F4",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginTop: 24,
        }}
        onClick={handleGoogleSignup}
      >
        Sign up with Google
      </button>
    </div>
  );
}
