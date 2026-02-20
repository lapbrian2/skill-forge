"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hammer, Plus, CheckCircle, Package, BookOpen, Search } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Hammer },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/validate", label: "Validate", icon: CheckCircle },
  { href: "/build", label: "Build", icon: Package },
  { href: "/examples", label: "Examples", icon: BookOpen },
  { href: "/analyze", label: "Analyze", icon: Search },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Hammer className="h-5 w-5 text-orange-500" />
            <span>Skill Forge</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
