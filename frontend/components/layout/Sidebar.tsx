"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PiggyBank,
  List,
  Wallet,
  Settings,
  Menu,
  Upload,
} from "lucide-react";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
  { name: "Import", href: "/transactions/import", icon: Upload },
  { name: "Budgets", href: "/budgets", icon: PiggyBank },
  { name: "Categories", href: "/categories", icon: List },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Hide sidebar on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="neutral"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-full"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-secondary-background border-r-2 border-border transition-all duration-300 ease-in-out",
          "w-16 md:w-64", // Mobile: icon-only (w-16), Desktop: full (w-64)
          // On mobile, if open, maybe expand?
          // Actually, the requirement said "Sidebar collapses to icon-only rail on mobile".
          // So it's always visible as a rail on mobile?
          // But usually on mobile screen (375px), a rail takes space.
          // Let's stick to: Mobile = hidden by default or icon rail?
          // "Sidebar collapses to icon-only rail on mobile" -> implies it's always there but small.
          // Let's try that.
          "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Brand */}
          <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b-2 border-border bg-main">
            <div className="font-heading font-bold text-xl md:text-2xl truncate">
              <span className="hidden md:inline">Dompy</span>
              <span className="md:hidden">D</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-6 flex flex-col gap-2 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center md:justify-start p-3 rounded-base transition-all duration-200 group",
                    "hover:bg-main hover:text-main-foreground border-2 border-transparent hover:border-border hover:shadow-shadow",
                    isActive
                      ? "bg-main text-main-foreground border-border shadow-shadow"
                      : "text-foreground"
                  )}
                  title={item.name}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span className="ml-3 font-base hidden md:inline truncate">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / User Profile */}
          <div className="p-4 border-t-2 border-border">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8 border-2 border-border",
                    },
                  }}
                />
                <div className="hidden md:block overflow-hidden">
                  <p className="text-sm font-bold truncate">My Account</p>
                </div>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="neutral" size="sm" className="w-full">
                    <span className="hidden md:inline">Sign In</span>
                    <span className="md:hidden">→</span>
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
