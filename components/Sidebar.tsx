"use client";
import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  HomeIcon,
  EnvelopeIcon,
  DocumentIcon,
  InboxArrowDownIcon,
  FolderPlusIcon,
} from "@heroicons/react/24/solid";
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
    <aside className="fixed left-0 top-0 w-[270px] h-screen bg-sidebar shadow-lg flex flex-col justify-between font-sans z-50 overflow-y-auto">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-xl shadow-xl border border-border bg-white p-0"
                >
                  <DropdownMenuLabel className="flex flex-col items-start px-4 pt-4 pb-2">
                    <span className="font-semibold text-base text-foreground">
                      {user.user_metadata?.name || "Name"}
                    </span>
                    <span className="text-xs text-muted-foreground break-all">
                      {user.email || "name@gmail.com"}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2 px-4 py-2 cursor-pointer text-foreground hover:bg-muted">
                    <CreditCardIcon className="w-5 h-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Billing</span>
                      <span className="text-xs text-muted-foreground">
                        Current plan: Free
                      </span>
                    </div>
                    <span className="ml-auto text-xs underline text-primary cursor-pointer">
                      Manage
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer text-destructive hover:bg-destructive/10 font-medium"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/auth";
                    }}
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        {/* User Info */}
        <div className="flex items-center mt-1 gap-2 border-2 px-2 py-2 mx-2 rounded-lg border-border hover:bg-hovered">
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
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
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
                    ? "bg-hovered font-semibold"
                    : "hover:bg-hovered"
                }`}
              >
                <HomeIcon className="w-5 h-5 text-foreground" />
                Home
              </a>
            </li>
            <li>
              <a
                href="/subscriptions"
                className={`flex items-center gap-2 py-2 px-2 rounded-lg text-foreground transition-colors ${
                  pathname === "/subscriptions"
                    ? "bg-hovered font-semibold"
                    : "hover:bg-hovered"
                }`}
              >
                <EnvelopeIcon className="w-5 h-5 text-foreground" />
                Subscriptions
              </a>
            </li>

            <li>
              <a
                href="#"
                className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-hovered text-foreground"
              >
                <InboxArrowDownIcon className="w-5 h-5 text-foreground" />
                Screener
              </a>
            </li>
          </ul>
        </nav>
        {/* Folders/Labels */}
        <div className="px-4 py-2 border-">
          <div className="flex items-center justify-between mb-2">
            <span className="text-md font-semibold text-muted-foreground">
              Labels
            </span>
            <button className="p-1 rounded hover:bg-muted">
              <FolderPlusIcon className="w-5 h-5 text-muted-foreground" />
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
