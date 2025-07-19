import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const allCookies = cookieStore.getAll();
  console.log("Available cookies:", allCookies);

  // Look for Supabase-specific cookies
  const supabaseCookies = allCookies.filter(
    (cookie) =>
      cookie.name.includes("supabase") ||
      cookie.name.includes("sb-") ||
      cookie.name.includes("auth")
  );
  console.log("Supabase-related cookies:", supabaseCookies);

  // Create a server's supabase client with newly configured cookie,
  // which could be used to maintain user's session
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({
                name,
                value,
                ...options,
              })
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Test the session
  try {
    const { data: session, error } = await client.auth.getSession();
    console.log("Server-side session:", session);
    console.log("Server-side session error:", error);
  } catch (err) {
    console.error("Error getting server-side session:", err);
  }

  return client;
}

export async function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No cookie handling needed for service role
        },
      },
    }
  );
}
