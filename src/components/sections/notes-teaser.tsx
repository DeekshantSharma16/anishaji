import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { notes } from "@/lib/notes-content";
import { images } from "@/lib/images";

export function NotesTeaser() {
  return (
    <section id="notes" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <span className="font-hand text-2xl text-clay">small observations</span>
          <h2 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            From the notes
          </h2>
        </div>
        <Link
          to="/notes"
          className="hidden text-sm font-semibold text-clay transition-colors hover:text-ink sm:block"
        >
          All notes <ArrowRight className="ml-1 inline size-4" />
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {notes.slice(0, 3).map((note) => (
          <Link key={note.slug} to="/notes/$slug" params={{ slug: note.slug }} className="group">
            <div className="overflow-hidden rounded-xl bg-bone shadow-lift transition-transform group-hover:rotate-0 md:rotate-[-1deg]">
              <img
                src={images[note.image]}
                alt={note.imageAlt}
                width={1024}
                height={768}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <h3 className="mt-5 font-display text-2xl font-bold transition-colors group-hover:text-clay">
              {note.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{note.excerpt}</p>
            <span className="mt-3 inline-block text-xs uppercase tracking-widest text-ink/40">
              <span className="text-clay">{note.category}</span> · {note.readingMinutes} min read
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
