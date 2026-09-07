import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { findNote, notes, type Note } from "@/lib/notes-content";
import { images } from "@/lib/images";
import { articleLd, breadcrumbLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site-config";

export const Route = createFileRoute("/notes/$slug")({
  loader: ({ params }): Note => {
    const note = findNote(params.slug);
    if (!note) throw notFound();
    return note;
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: pageMeta({
            title: `${loaderData.title} | ${site.name}`,
            description: loaderData.excerpt,
            path: `/notes/${loaderData.slug}`,
            type: "article",
          }),
          links: [{ rel: "canonical", href: `${site.url}/notes/${loaderData.slug}` }],
        }
      : {},
  component: NotePage,
});

function NotePage() {
  const note = Route.useLoaderData();
  const others = notes.filter((item) => item.slug !== note.slug).slice(0, 2);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      <JsonLd data={articleLd(note.slug)} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Notes", path: "/notes" },
          { name: note.title, path: `/notes/${note.slug}` },
        ])}
      />

      <Link
        to="/notes"
        className="inline-flex items-center gap-2 text-sm text-ink/55 hover:text-clay"
      >
        <ArrowLeft className="size-4" /> All notes
      </Link>

      <article className="mt-8">
        <div className="text-xs uppercase tracking-widest text-ink/40">
          {new Date(note.publishedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {note.readingMinutes} min read
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {note.title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/70">{note.excerpt}</p>

        <img
          src={images[note.image]}
          alt={note.imageAlt}
          width={1024}
          height={768}
          className="mt-9 aspect-[16/9] w-full rounded-xl object-cover shadow-lift"
        />

        <div className="mt-10 space-y-6">
          {note.body.map((block, index) => {
            if ("heading" in block) {
              return (
                <h2 key={index} className="pt-2 font-display text-2xl font-bold">
                  {block.heading}
                </h2>
              );
            }
            if ("list" in block) {
              return (
                <ul key={index} className="ml-5 list-disc space-y-2 leading-relaxed text-ink/75">
                  {block.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={index} className="leading-relaxed text-ink/75">
                {block.paragraph}
              </p>
            );
          })}
        </div>
      </article>

      <div className="mt-14 rounded-2xl bg-cream p-8 text-center shadow-lift">
        <h2 className="font-display text-2xl font-bold">Something here sound familiar?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/65">
          A first session starts with your story and a proper assessment. No commitment beyond the
          hour.
        </p>
        <Button asChild variant="clay" size="xl" className="mt-6">
          <a href="/#book">
            Book a session <ArrowRight />
          </a>
        </Button>
      </div>

      {others.length > 0 && (
        <div className="mt-14 border-t border-ink/10 pt-8">
          <div className="eyebrow">Keep reading</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((item) => (
              <Link
                key={item.slug}
                to="/notes/$slug"
                params={{ slug: item.slug }}
                className="rounded-xl bg-cream p-5 shadow-lift transition-colors hover:text-clay"
              >
                <div className="font-display text-lg font-bold">{item.title}</div>
                <p className="mt-1 text-sm text-ink/55">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
