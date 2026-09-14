"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PlusCircle, BookOpen, History, User } from "lucide-react";
import styles from "./TabBar.module.css";

const TABS = [
  { href: "/week", label: "Week", icon: CalendarDays, match: (p: string) => p === "/week" },
  { href: "/log", label: "Log", icon: PlusCircle, match: (p: string) => p === "/log" },
  {
    href: "/recipes",
    label: "Recipes",
    icon: BookOpen,
    // Recipe detail keeps "Recipes" active, per the design.
    match: (p: string) => p === "/recipes" || p.startsWith("/recipes/"),
  },
  { href: "/history", label: "History", icon: History, match: (p: string) => p === "/history" },
  { href: "/account", label: "You", icon: User, match: (p: string) => p === "/account" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.bar}>
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.item} pressable ${active ? styles.active : ""}`}
          >
            <Icon size={20} strokeWidth={2.75} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
