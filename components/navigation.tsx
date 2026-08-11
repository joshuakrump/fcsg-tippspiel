"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/",
    label: "Tipps",
    icon: "⚽",
  },
  {
  href: "/spielplan",
  label: "Spielplan",
  icon: "🗓️",
},
  {
    href: "/ergebnisse",
    label: "Ergebnisse",
    icon: "📅",
  },
  {
    href: "/rangliste",
    label: "Rangliste",
    icon: "🏆",
  },
  {
    href: "/regeln",
    label: "Regeln",
    icon: "📋",
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-black/20 border border-white/10 rounded-2xl p-1.5 mb-8">
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center
                gap-1 px-2 py-3 rounded-xl
                font-semibold text-xs sm:text-sm transition
                ${
                  active
                    ? "bg-white text-green-950 shadow-md"
                    : "text-green-100 hover:bg-white/10"
                }
              `}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}