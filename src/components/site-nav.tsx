import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-provider";
import { useContent } from "@/components/content-provider";

export function SiteNav() {
  const { nav } = useContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = () => setMenuOpen(false);

  // The bar only grows a border and a blur once the page has moved. At the top
  // it stays invisible, so the hero starts at the very top of the viewport.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-ink/8 bg-paper/80 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/65"
          : "border-b border-transparent"
      }`}
    >
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
        aria-label="Primary navigation"
      >
        <Link to="/" className="flex items-baseline gap-2" onClick={close}>
          <span className="section-title text-xl">{nav.wordmarkLead}</span>
          <span className="font-hand text-lg text-clay">{nav.wordmarkTail}</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {nav.links.map((link) =>
            link.internal ? (
              <Link
                key={link.href}
                to={link.href}
                className="text-ink/70 transition-colors hover:text-clay"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-ink/70 transition-colors hover:text-clay"
              >
                {link.label}
              </a>
            ),
          )}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild variant="ink" className="hidden sm:inline-flex">
            <a href="/#book">{nav.ctaLabel}</a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-ink/8 bg-paper/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm font-medium">
            {nav.links.map((link) =>
              link.internal ? (
                <Link key={link.href} to={link.href} onClick={close}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.href} href={link.href} onClick={close}>
                  {link.label}
                </a>
              ),
            )}
            <a href="/#book" className="text-clay" onClick={close}>
              {nav.ctaLabel} <ArrowRight className="ml-1 inline size-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
