import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { notes } from "@/lib/notes-content";
import { images } from "@/lib/images";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site-config";

export const Route = createFileRoute("/notes/")({
  head: () => ({
    meta: pageMeta({
      title: `Notes from the practice | ${site.name}`,
      description:
        "Short, practical writing on breath, posture, and hands-on care from Dr. Anisha.",
      path: "/notes",
    }),
    links: [{ rel: "canonical", href: `${site.url}/notes` }],
  }),
  component: NotesIndex,
});

function NotesIndex() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Notes", path: "/notes" },
        ])}
      />

      <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/55 hover:text-clay">
        <ArrowLeft className="size-4" /> Back to the practice
      </Link>

      <header className="mt-8">
        <span className="font-hand text-2xl text-clay">small observations</span>
        <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          From the notes
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink/65">
          Short pieces on how the body actually behaves, written between sessions.
        </p>
      </header>

      <div className="mt-12 grid gap-10 sm:grid-cols-2">
        {notes.map((note) => (
          <Link key={note.slug} to="/notes/$slug" params={{ slug: note.slug }} className="group">
            <div className="overflow-hidden rounded-xl bg-bone shadow-lift">
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
            <div className="mt-4 text-xs uppercase tracking-widest text-ink/40">
              <span className="text-clay">{note.category}</span> ·{" "}
              {new Date(note.publishedAt).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}{" "}
              · {note.readingMinutes} min read
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold transition-colors group-hover:text-clay">
              {note.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{note.excerpt}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
