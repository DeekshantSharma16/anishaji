import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { defaultContent, parseContent, serviceTones, type SiteContent } from "@/lib/content-schema";
import { loadSiteContent, resetSiteContent, saveSiteContent } from "@/lib/content.functions";

/**
 * The website editor.
 *
 * Written for someone who has never opened a code editor, so: plain-language
 * labels, no JSON on screen, no jargon, and a hint under every field that says
 * where it appears on the page. The escape hatches (download / upload the JSON
 * file) are there for whoever maintains the site, not for the practitioner.
 *
 * Everything edits a local draft. Nothing reaches the live site until Save is
 * pressed, and the server re-validates the whole document before it writes, so
 * a half-filled form cannot go out.
 */

type Path = (string | number)[];

/** Immutable set-by-path. structuredClone keeps React's identity checks honest. */
function setAt<T>(source: T, path: Path, value: unknown): T {
  const next = structuredClone(source) as Record<string, unknown>;
  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < path.length - 1; i += 1) {
    cursor = cursor[path[i] as string] as Record<string, unknown>;
  }
  cursor[path[path.length - 1] as string] = value;
  return next as T;
}

function getAt(source: unknown, path: Path): unknown {
  return path.reduce<unknown>(
    (value, key) => (value as Record<string, unknown> | undefined)?.[key as string],
    source,
  );
}

export function ContentEditor() {
  const [draft, setDraft] = useState<SiteContent>(defaultContent);
  const [saved, setSaved] = useState<SiteContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openSection, setOpenSection] = useState<string>("brand");
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    loadSiteContent()
      .then((content) => {
        setDraft(content);
        setSaved(content);
      })
      .catch(() => toast.error("Couldn't load the current website text."))
      .finally(() => setLoading(false));
  }, []);

  // A browser-level guard, because losing twenty minutes of copy edits to a
  // stray tab close is the single most annoying thing a CMS can do.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (path: Path, value: unknown) => setDraft((current) => setAt(current, path, value));

  const handleSave = async () => {
    setBusy(true);
    try {
      const result = await saveSiteContent({ data: { content: draft } });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setSaved(draft);
      toast.success("Website updated. Refresh the site to see it live.");
    } catch {
      toast.error("That didn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Put every word and colour back to the original? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    try {
      const result = await resetSiteContent();
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setDraft(result.content);
      setSaved(result.content);
      toast.success("Reset to the original text.");
    } catch {
      toast.error("Couldn't reset. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `site-content-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (file: File) => {
    try {
      const parsed = parseContent(JSON.parse(await file.text()));
      if (!parsed.ok) {
        toast.error(`That file doesn't fit: ${parsed.problems.slice(0, 2).join("; ")}`);
        return;
      }
      setDraft(parsed.content);
      toast.success("Loaded. Press Save to publish it.");
    } catch {
      toast.error("That file isn't valid JSON.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-ink/60">
        <Loader2 className="size-4 animate-spin" /> Loading the website text…
      </div>
    );
  }

  const section = (id: string, title: string, hint: string, body: React.ReactNode) => (
    <div key={id} className="overflow-hidden rounded-xl border border-ink/10 bg-cream">
      <button
        type="button"
        onClick={() => setOpenSection((current) => (current === id ? "" : id))}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block font-display text-base font-bold">{title}</span>
          <span className="mt-0.5 block text-xs text-ink/50">{hint}</span>
        </span>
        <span className="text-xs text-ink/40">{openSection === id ? "Hide" : "Edit"}</span>
      </button>
      {openSection === id && (
        <div className="space-y-5 border-t border-ink/10 px-5 py-5">{body}</div>
      )}
    </div>
  );

  const field = (path: Path, label: string, hint?: string, rows = 1) => (
    <Field
      key={path.join(".")}
      label={label}
      {...(hint ? { hint } : {})}
      value={String(getAt(draft, path) ?? "")}
      rows={rows}
      onChange={(value) => edit(path, value)}
    />
  );

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-paper/90 px-1 py-3 backdrop-blur">
        <Button type="button" variant="ink" onClick={handleSave} disabled={busy || !dirty}>
          {busy ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
          {dirty ? "Save and publish" : "Everything is saved"}
        </Button>
        <Button type="button" variant="paperOutline" onClick={handleDownload}>
          <Download className="size-4" /> Download a backup
        </Button>
        <Button type="button" variant="paperOutline" onClick={() => fileInput.current?.click()}>
          <Upload className="size-4" /> Restore a backup
        </Button>
        <Button type="button" variant="paperOutline" onClick={handleReset} disabled={busy}>
          <RotateCcw className="size-4" /> Start over
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
            event.target.value = "";
          }}
        />
        {dirty && <span className="text-xs text-clay">Unsaved changes</span>}
      </div>

      <div className="space-y-3">
        {section(
          "brand",
          "Practice details",
          "Name, phone, email and address. Used all over the site.",
          <>
            {field(["brand", "name"], "Practice name")}
            {field(["brand", "shortName"], "Short name", "Shown on a phone home screen.")}
            {field(["brand", "tagline"], "Tagline")}
            {field(["brand", "description"], "One-line description", "Used by Google.", 3)}
            {field(["brand", "email"], "Email address")}
            {field(
              ["brand", "whatsapp"],
              "WhatsApp number",
              "Numbers only, with country code. Example: 919876543210",
            )}
            {field(["brand", "phoneDisplay"], "Phone number as shown")}
            {field(["brand", "address", "street"], "Street")}
            {field(["brand", "address", "locality"], "City")}
            {field(["brand", "address", "postalCode"], "PIN code")}
            {field(
              ["brand", "mapsQuery"],
              "Google Maps search term",
              "Used for the map and directions.",
            )}
            {field(["brand", "social", "instagram"], "Instagram link")}
            {field(["brand", "social", "linkedin"], "LinkedIn link")}
          </>,
        )}

        {section(
          "theme",
          "Colours",
          "The palette the whole site is built from.",
          <div className="grid gap-4 sm:grid-cols-2">
            <Colour
              label="Page background"
              value={draft.theme.paper}
              onChange={(v) => edit(["theme", "paper"], v)}
            />
            <Colour
              label="Card background"
              value={draft.theme.cream}
              onChange={(v) => edit(["theme", "cream"], v)}
            />
            <Colour
              label="Text colour"
              value={draft.theme.ink}
              onChange={(v) => edit(["theme", "ink"], v)}
            />
            <Colour
              label="Accent (buttons, links)"
              value={draft.theme.clay}
              onChange={(v) => edit(["theme", "clay"], v)}
            />
            <Colour
              label="Green service card"
              value={draft.theme.moss}
              onChange={(v) => edit(["theme", "moss"], v)}
            />
            <Colour
              label="Sand service card"
              value={draft.theme.sand}
              onChange={(v) => edit(["theme", "sand"], v)}
            />
            <Colour
              label="Soft grey-beige"
              value={draft.theme.bone}
              onChange={(v) => edit(["theme", "bone"], v)}
            />
            <p className="text-xs text-ink/50 sm:col-span-2">
              These apply to the light theme. Dark mode keeps its own tuned palette, because a
              colour picked for paper rarely reads well on a dark screen.
            </p>
          </div>,
        )}

        {section(
          "hero",
          "Top of the homepage",
          "The first thing a visitor reads.",
          <>
            {field(["hero", "eyebrow"], "Small line above the heading")}
            {field(["hero", "titleLead"], "Heading, first part")}
            {field(
              ["hero", "titleHighlight"],
              "Heading, highlighted part",
              "Shown in the accent colour.",
            )}
            {field(["hero", "body"], "Paragraph", undefined, 4)}
            {field(["hero", "primaryCtaLabel"], "Main button text")}
            {field(["hero", "secondaryCtaLabel"], "Second button text")}
            {field(["hero", "imageCaption"], "Caption on the photo")}
            <ListEditor
              label="Numbers shown under the heading"
              items={draft.hero.stats}
              onChange={(items) => edit(["hero", "stats"], items)}
              blank={{ value: "0+", label: "new number" }}
              render={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <Field
                    label="Number"
                    value={item.value}
                    onChange={(value) => update({ ...item, value })}
                  />
                  <Field
                    label="Label"
                    value={item.label}
                    onChange={(label) => update({ ...item, label })}
                  />
                </div>
              )}
            />
          </>,
        )}

        {section(
          "marquee",
          "Scrolling strip",
          "The moving band of words under the top section.",
          <ListEditor
            label="Words in the strip"
            items={draft.marquee.items}
            onChange={(items) => edit(["marquee", "items"], items)}
            blank="new word"
            render={(item, update) => (
              <Field label="Word or phrase" value={item} onChange={update} />
            )}
          />,
        )}

        {section(
          "services",
          "The work",
          "The four service cards and their colours.",
          <>
            {field(["services", "eyebrow"], "Small line above the heading")}
            {field(["services", "title"], "Heading")}
            {field(["services", "note"], "Note beside the heading", undefined, 2)}
            {field(["services", "ctaLabel"], "Link text on each card")}
            <p className="rounded-lg bg-bone/60 p-3 text-xs leading-relaxed text-ink/60">
              You can rename, reword and recolour these cards. Adding or removing a service, or
              changing a price or session length, has to be done in the code, because the booking
              system checks every request against that list.
            </p>
            <ListEditor
              label="Service cards"
              items={draft.services.items}
              onChange={(items) => edit(["services", "items"], items)}
              blank={null}
              render={(item, update) => (
                <div className="space-y-3">
                  <Field
                    label="Name"
                    value={item.name}
                    onChange={(name) => update({ ...item, name })}
                  />
                  <Field
                    label="Session length as shown"
                    value={item.duration}
                    onChange={(duration) => update({ ...item, duration })}
                  />
                  <Field
                    label="Description"
                    rows={3}
                    value={item.detail}
                    onChange={(detail) => update({ ...item, detail })}
                  />
                  <Field
                    label="Tags"
                    hint="Separate with commas."
                    value={item.tags.join(", ")}
                    onChange={(value) =>
                      update({
                        ...item,
                        tags: value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <label className="block">
                    <span className="eyebrow">Card colour</span>
                    <select
                      className="form-control mt-1.5"
                      value={item.tone}
                      onChange={(event) =>
                        update({ ...item, tone: event.target.value as typeof item.tone })
                      }
                    >
                      {serviceTones.map((tone) => (
                        <option key={tone} value={tone}>
                          {toneLabels[tone]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            />
          </>,
        )}

        {section(
          "story",
          "About Dr. Anisha",
          "The introduction section with the portrait.",
          <>
            {field(["story", "eyebrow"], "Small line above the heading")}
            {field(["story", "title"], "Heading")}
            <ListEditor
              label="Paragraphs"
              items={draft.story.paragraphs}
              onChange={(items) => edit(["story", "paragraphs"], items)}
              blank="New paragraph."
              render={(item, update) => (
                <Field label="Paragraph" rows={4} value={item} onChange={update} />
              )}
            />
            <ListEditor
              label="Qualifications"
              items={draft.story.credentials}
              onChange={(items) => edit(["story", "credentials"], items)}
              blank="New qualification"
              render={(item, update) => (
                <Field label="Qualification" value={item} onChange={update} />
              )}
            />
            {field(["story", "highlightCredential"], "Highlighted qualification")}
            {field(["story", "personName"], "Name")}
            {field(["story", "personRole"], "Role")}
          </>,
        )}

        {section(
          "pricing",
          "Pricing",
          "Wording around the price cards.",
          <>
            {field(["pricing", "eyebrow"], "Small line above the heading")}
            {field(["pricing", "title"], "Heading")}
            {field(["pricing", "note"], "Note under the heading", undefined, 3)}
            {field(["pricing", "singleSession", "title"], "Single session card title")}
            {field(
              ["pricing", "singleSession", "priceLabel"],
              "Single session price as shown",
              "Just the words on the card. Actual charging happens at the studio.",
            )}
            {field(
              ["pricing", "singleSession", "detail"],
              "Single session description",
              undefined,
              2,
            )}
            <ListEditor
              label="What a single session includes"
              items={draft.pricing.singleSession.includes}
              onChange={(items) => edit(["pricing", "singleSession", "includes"], items)}
              blank="New line"
              render={(item, update) => <Field label="Line" value={item} onChange={update} />}
            />
          </>,
        )}

        {section(
          "visit",
          "The studio",
          "Directions and opening-hours wording.",
          <>
            {field(["visit", "eyebrow"], "Small line above the heading")}
            {field(["visit", "title"], "Heading")}
            {field(["visit", "hoursNote"], "Note under the opening hours")}
            {field(["visit", "gettingHere"], "How to get here", undefined, 3)}
          </>,
        )}

        {section(
          "nav",
          "Menu and footer",
          "Links at the top, and the closing lines at the bottom.",
          <>
            {field(["nav", "wordmarkLead"], "Logo text, first word")}
            {field(["nav", "wordmarkTail"], "Logo text, handwritten part")}
            {field(["nav", "ctaLabel"], "Menu button text")}
            <ListEditor
              label="Menu links"
              items={draft.nav.links}
              onChange={(items) => edit(["nav", "links"], items)}
              blank={{ href: "/#work", label: "New link", internal: false }}
              render={(item, update) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Text"
                    value={item.label}
                    onChange={(label) => update({ ...item, label })}
                  />
                  <Field
                    label="Goes to"
                    hint="A section like /#work, or a page like /notes."
                    value={item.href}
                    onChange={(href) => update({ ...item, href, internal: !href.includes("#") })}
                  />
                </div>
              )}
            />
            {field(["footer", "blurb"], "Footer paragraph", undefined, 3)}
            {field(
              ["footer", "signoff"],
              "Closing line",
              "The handwritten line at the very bottom.",
            )}
          </>,
        )}
      </div>
    </div>
  );
}

const toneLabels: Record<string, string> = {
  cream: "Cream (light)",
  moss: "Green",
  sand: "Sand",
  clay: "Accent (terracotta)",
};

function Field({
  label,
  hint,
  value,
  rows = 1,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      {rows > 1 ? (
        <textarea
          className="form-control mt-1.5 resize-y"
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="form-control mt-1.5"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && <span className="mt-1 block text-xs text-ink/45">{hint}</span>}
    </label>
  );
}

function Colour({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-ink/10 p-3">
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(event) => onChange(event.target.value)}
        className="size-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={label}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <input
          className="mt-0.5 w-full bg-transparent font-mono text-xs text-ink/50 outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

/**
 * Add, reorder-free, remove. Deliberately no drag handles: ordering matters in
 * only two of these lists, and a keyboard-accessible drag list is a lot of
 * surface area to maintain for that.
 */
function ListEditor<T>({
  label,
  items,
  onChange,
  blank,
  render,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  /** null means the list is fixed: entries can be edited but not added or removed. */
  blank: T | null;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {blank !== null && (
          <Button
            type="button"
            variant="paperOutline"
            size="sm"
            onClick={() => onChange([...items, structuredClone(blank)])}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg bg-paper/70 p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {render(item, (next) => {
                  const copy = [...items];
                  copy[index] = next;
                  onChange(copy);
                })}
              </div>
              {blank !== null && (
                <button
                  type="button"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  className="mt-5 shrink-0 rounded p-1.5 text-ink/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-ink/45">Nothing here yet.</p>}
      </div>
    </div>
  );
}
