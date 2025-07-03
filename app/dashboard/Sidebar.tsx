"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { User, createClient } from "@supabase/supabase-js";
import Image from "next/image";
import rainboxlogo from "@/public/RainboxLogo.png";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Sidebar = () => {
  const [user, setUser] = useState<User | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  return (
    <aside
      className="w-[270px] min-h-screen bg-white shadow-2xl z-20 flex flex-col justify-between font-sans"
    >
      <div>
        {/* Top Section: Logo and Profile */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image
              src={rainboxlogo}
              alt="Rainbox logo"
              width={48}
              height={48}
              className="h-9 w-9 object-contain dark:invert"
            />
            <span className="text-lg font-bold">ZeroInbox</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.user_metadata?.avatar_url ? (
              <button className="p-1 rounded-full hover:bg-muted">
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="User avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </button>
            ) : null}
          </div>
        </div>
        {/* User Info */}
        <div className="flex items-center mt-1 gap-2 border-2 px-2 py-2 mx-2 rounded-lg border-gray-400">
          <img
            src="https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png"
            alt="Gmail"
            className="h-7 w-7"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-foreground">
              {user?.user_metadata?.name || "Name"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.email || "name@gmail.com"}
            </span>
          </div>
          <button className="ml-auto">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
        {/* Navigation */}
        <nav className="px-4 mt-3 py-2">
          <ul className="space-y-1">
            <li>
              <a
                href="/dashboard"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-foreground transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-gray-200 font-semibold"
                    : "hover:bg-muted"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
                Home
              </a>
            </li>
            <li>
              <a
                href="/subscriptions"
                className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                Subscriptions
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted text-foreground"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M16 3v4M8 3v4" />
                </svg>
                Rollup
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted text-foreground"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M16 3v4M8 3v4" />
                </svg>
                Screener
              </a>
            </li>
          </ul>
        </nav>
        {/* Folders/Labels */}
        <div className="px-4 py-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Folder / Label
            </span>
            <button className="p-1 rounded hover:bg-muted">
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
          <ul className="space-y-1"></ul>
        </div>
      </div>
      {/* Bottom Section: Sync Info */}
      <div className="px-4 py-3 border-t border-border bg-muted/30"></div>
    </aside>
  );
};

export default Sidebar;
