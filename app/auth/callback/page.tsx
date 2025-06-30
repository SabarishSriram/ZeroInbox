"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!session || error) {
        console.error("No session found or error occurred:", error?.message);
        router.replace("/login");
        return;
      }

      const user = session.user;
      const { error: insertError } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Error storing user:", insertError.message);
      } else {
        console.log("User stored in Supabase!");
      }

      router.replace("/dashboard");
    })();
  }, []);

  return <p>Signing you in...</p>;
}
