import Link from "next/link";

import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { MAIN_NAV } from "./nav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory">
      <div className="container-editorial relative flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
        <Logo />

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1 lg:gap-3">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative inline-flex min-h-11 items-center px-3 text-[0.8125rem] font-medium tracking-[0.08em] text-charcoal transition-colors after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-champagne after:transition-transform after:duration-500 hover:text-forest hover:after:scale-x-100 focus-visible:after:scale-x-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <MobileNav items={MAIN_NAV} />
      </div>
    </header>
  );
}
