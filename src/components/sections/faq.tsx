import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { faqs } from "@/lib/faq-content";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="mx-auto max-w-4xl px-6 py-10 md:py-16"
      aria-labelledby="faq-heading"
    >
      <div className="mb-10 text-center">
        <span className="font-hand text-2xl text-clay">good to know</span>
        <h2 id="faq-heading" className="mt-1 font-display text-4xl font-bold tracking-tight">
          Before we meet
        </h2>
      </div>
      <div className="border-y border-ink/10">
        {faqs.map((faq, index) => {
          const isOpen = open === index;
          return (
            <div key={faq.question} className="border-b border-ink/10 last:border-b-0">
              <Button
                type="button"
                variant="ghost"
                className="flex h-auto w-full justify-between gap-4 rounded-none px-0 py-5 text-left font-display text-lg font-bold hover:bg-transparent hover:text-clay"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span className="whitespace-normal">{faq.question}</span>
                <ChevronDown
                  className={`size-5 shrink-0 text-clay transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </Button>
              {isOpen && (
                <p
                  id={`faq-panel-${index}`}
                  className="max-w-2xl pb-5 pr-10 leading-relaxed text-ink/65"
                >
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
