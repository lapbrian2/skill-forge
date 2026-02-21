"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hammer, Plus, Command,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Hammer },
  { href: "/create", label: "New Spec", icon: Plus },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
              <Hammer className="h-4 w-4 text-orange-500" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Skill Forge</span>
          </Link>

          <div className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-white/30 border border-white/8 hover:border-white/15 hover:text-white/50 transition-all"
            >
              <Command className="h-3 w-3" />
              <span className="hidden sm:inline">K</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
