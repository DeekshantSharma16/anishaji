import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openingHoursLabel } from "@/lib/schedule";

/**
 * Appears on small screens once the hero has scrolled away, and hides again
 * when the booking form itself is on screen so it never covers the fields.
 */
export function StickyBookBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById("book");

    const onScroll = () => {
      const pastHero = window.scrollY > 620;
      const formOnScreen = form
        ? form.getBoundingClientRect().top < window.innerHeight - 120 &&
          form.getBoundingClientRect().bottom > 0
        : false;
      setVisible(pastHero && !formOnScreen);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-sm font-bold">Book a first session</div>
          <div className="truncate text-xs text-ink/55">{openingHoursLabel}</div>
        </div>
        <Button asChild variant="clay">
          <a href="#book">
            Book <ArrowRight />
          </a>
        </Button>
      </div>
    </div>
  );
}
