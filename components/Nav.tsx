"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const LINKS = [
  { href: "/", label: "Swipe" },
  { href: "/dashboard", label: "Results" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{ background: "color-mix(in srgb, var(--base) 82%, transparent)" }}
    >
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5 sm:px-8">
        <Link href="/" className="mr-auto flex items-center gap-3">
          {/* A needle at rest — the mark for a measurement instrument. */}
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[4px]"
            style={{
              background: "var(--accent-wash)",
              border: "1px solid var(--accent)",
            }}
          >
            <span
              className="block h-[13px] w-[2px] rounded-full"
              style={{
                background: "var(--accent)",
                transform: "rotate(24deg)",
              }}
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className="display text-[15px]">Swipe A/B</span>
            <span className="mt-1 text-[10.5px] t3">
              framing performance
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="relative rounded-[4px] px-3.5 py-2 text-[13px] font-medium transition-colors"
                style={{ color: active ? "var(--text-1)" : "var(--text-3)" }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-[4px]"
                    style={{ background: "var(--sunken)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
