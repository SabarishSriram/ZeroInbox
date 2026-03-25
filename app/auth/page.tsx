"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "../icons";
import rainboxlogo from "@/public/RainboxLogo.png"; // Adjust the path as necessary

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user && session.session.provider_token) {
        router.replace("/dashboard");
      } else {
        setChecked(true);
      }
    })();
  }, []);

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
  const googleButtonClasses =
    "w-full h-12 flex items-center justify-center px-4 rounded-xl border-hovered hover:bg-secondary text-muted-foreground";
  const inputBaseClasses =
    "w-full h-11 sm:h-12 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  // Added focus-visible for better accessibility from shadcn/ui Input
  const placeholderClasses = "placeholder:text-muted-foreground"; // Your email input doesn't have a specific placeholder class, this is a common way
  const primaryButtonBaseClasses =
    "w-full h-12 bg-secondary hover:bg-hovered text-primary rounded-xl font-medium text-base";

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100/80 via-sky-50/70 to-content font-sans">
      <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-4 sm:py-5">
        {/* Navbar */}
        <header className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-2.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Image
              src={rainboxlogo}
              alt="Rainbox logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain dark:invert"
            />
            <span className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              ZeroInbox
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden h-8 px-3 text-xs sm:inline-flex sm:h-9 sm:text-sm"
              onClick={handleGoogleSignup}
            >
              Sign in
            </Button>
            <Button
              className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
              onClick={handleGoogleSignup}
            >
              Get started
            </Button>
          </div>
        </header>

        {/* Main content */}
        <main className="mt-8 grid flex-1 items-center gap-8 md:gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Left: marketing/landing content */}
          <div className="space-y-7">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-foreground">
                Take back control of your
                <span className="text-primary"> inbox</span>.
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                ZeroInbox analyzes your email, surfaces the senders that matter,
                and helps you unsubscribe, roll up, or mark as safe in a few
                clicks.
              </p>
              <p className="text-xs md:text-sm text-muted-foreground/80">
                No extensions. Works directly with your Gmail account.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                WHAT ZEROINBOX HANDLES FOR YOU
              </p>
              <div className="h-px w-16 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="group rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-primary/5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Subscriptions
                </p>
                <p className="text-sm text-foreground">
                  See every brand filling your inbox and unsubscribe in one
                  place.
                </p>
              </div>
              <div className="group rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-primary/5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Smart labels
                </p>
                <p className="text-sm text-foreground">
                  Organize newsletters and promos into Gmail labels
                  automatically.
                </p>
              </div>
              <div className="group rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm transition-transform transition-colors duration-200 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-primary/5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Weekly rollup
                </p>
                <p className="text-sm text-foreground">
                  Bundle low-priority senders into a single weekly summary.
                </p>
              </div>
            </div>
          </div>

          {/* Right: auth card */}
          <div className="w-full max-w-md mx-auto">
            <div className="w-full space-y-5 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
              <div className="space-y-1 text-center">
                <h2 className="text-base sm:text-lg font-semibold text-foreground font-sans">
                  Sign in with Google
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans">
                  Connect your Gmail so we can analyze and organize your inbox.
                </p>
              </div>
              {/* Google Sign In Button */}
              <form action={handleGoogleSignup} className="w-full">
                <Button
                  type="submit"
                  variant="default"
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 flex items-center justify-center px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <GoogleIcon className="mr-2 h-5 w-5" /> Continue with Google
                </Button>
              </form>
              {/* Divider */}
              <div className="flex items-center my-1">
                <div className="flex-1 border-t border-hovered"></div>
                <span className="mx-4 text-muted-foreground text-sm font-sans">
                  Or
                </span>
                <div className="flex-1 border-t border-hovered"></div>
              </div>
              {/* Email Input */}
              <input
                type="email"
                placeholder="Enter your email"
                className={inputBaseClasses}
              />
              {/* Simple "I'm not a robot" check */}
              <label className="mt-2 mb-1 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-sans">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-border accent-primary"
                  checked={isHuman}
                  onChange={(e) => setIsHuman(e.target.checked)}
                />
                <span>I'm not a robot</span>
              </label>
              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={!isHuman}
                className={
                  "w-full h-11 sm:h-12 text-base font-medium rounded-2xl font-sans border " +
                  (isHuman
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground border-border cursor-not-allowed")
                }
              >
                Continue with email
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-4 text-center max-w-sm mx-auto font-sans">
              By continuing you agree to the{" "}
              <Link
                href="/terms"
                className="underline hover:text-primary font-sans"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline hover:text-primary font-sans"
              >
                Privacy Policy
              </Link>
              .
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
