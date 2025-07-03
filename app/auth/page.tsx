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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [checked, setChecked] = useState(false);
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
    "h-12 px-4 rounded-xl border-hovered hover:bg-secondary text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  // Added focus-visible for better accessibility from shadcn/ui Input
  const placeholderClasses = "placeholder:text-muted-foreground"; // Your email input doesn't have a specific placeholder class, this is a common way
  const primaryButtonBaseClasses =
    "w-full h-12 bg-secondary hover:bg-hovered text-primary rounded-xl font-medium text-base";

  if (!checked) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-content font-sans">
      <div className="w-full max-w-xs mx-auto flex flex-col items-center">
        {/* Logo and Title - perfectly aligned on one line */}
        <div className="flex flex-row items-center justify-center mb-2">
          <Image
            src={rainboxlogo}
            alt="Rainbox logo"
            width={48}
            height={48}
            className="h-9 w-9 object-contain dark:invert"
          />
          <span className="text-2xl font-semibold text-foreground tracking-tight font-sans flex items-center">
            ZeroInbox
          </span>
        </div>
        <div className="mb-8">
          <p className="text-center italic text-gray-800 text-md font-sans">
            Clear your inbox, clear your day.
          </p>
        </div>
        <div className="w-full space-y-6">
          <h2 className="text-center text-md text-foreground text-gray-800 mb-2 font-sans">
            Get started - Sign - in or create an account
          </h2>
          {/* Google Sign In Button */}
          <form action={handleGoogleSignup} className="w-full">
            <Button
              type="submit"
              variant="outline"
              disabled={isLoading}
              className="w-full h-12 flex items-center justify-center px-4 rounded-xl border-hovered hover:bg-secondary text-muted-foreground"
            >
              <GoogleIcon className="mr-2 h-5 w-5" /> Continue with Google
            </Button>
          </form>
          {/* Divider */}
          <div className="flex items-center my-2">
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
          {/* Recaptcha Placeholder */}
          <div className="w-full bg-content border border-border rounded-2xl flex items-center justify-between px-4 py-3 mt-2 mb-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                disabled
                className="w-5 h-5 rounded border border-border"
              />
              <span className="text-foreground text-base font-sans">
                I'm not a robot
              </span>
            </div>
            <div className="flex items-center">
              <img
                src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
                alt="reCAPTCHA"
                className="h-6 w-6 mr-1"
              />
              <span className="text-xs text-muted-foreground font-sans">
                reCAPTCHA
              </span>
            </div>
          </div>
          <Button
            type="button"
            className="w-full py-3 text-base font-medium rounded-2xl bg-muted text-muted-foreground border border-border cursor-not-allowed font-sans"
            disabled
          >
            Continue with email
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-8 text-center max-w-xs mx-auto font-sans">
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
    </div>
  );
}
