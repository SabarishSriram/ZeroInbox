"use client";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export default function SignupPage() {
  const handleGoogleSignup = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.modify",
        ].join(" "),
      },
    });

    if (error) {
      console.error("Error during Google signup:", error.message);
      return;
    }
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
