import { createContext, useContext, type ReactNode } from "react";

import { defaultContent, type SiteContent } from "@/lib/content-schema";

/**
 * One context holds the live content for the whole tree. It is seeded by the
 * root route loader, so the server renders the real copy on the first byte —
 * no flash of default text, and search engines see what visitors see.
 *
 * The default value is the bundled content rather than null, so any component
 * rendered outside the provider (a test, a stray route) still has something
 * sensible to show instead of crashing.
 */

const ContentContext = createContext<SiteContent>(defaultContent);

export function ContentProvider({
  content,
  children,
}: {
  content: SiteContent;
  children: ReactNode;
}) {
  return (
    <ContentContext.Provider value={content}>
      <ThemeVars theme={content.theme} />
      {children}
    </ContentContext.Provider>
  );
}

export const useContent = () => useContext(ContentContext);

/** Shorthands for the blocks that get read most often. */
export const useBrand = () => useContent().brand;

/**
 * The palette lives in the CMS, so it has to reach CSS at runtime. Writing a
 * :root override into the document beats setting inline styles on a wrapper:
 * it also covers portals (dialogs, toasts, the mobile sheet) which render
 * outside the React tree.
 *
 * Only the light palette is overridden. Dark mode keeps its hand-tuned values,
 * because a colour that reads well on paper rarely survives being dropped
 * straight onto a dark surface, and asking a non-designer to pick two
 * matching sets would make the panel worse, not better.
 */
function ThemeVars({ theme }: { theme: SiteContent["theme"] }) {
  // html:not(.dark) rather than :root. This <style> renders after the linked
  // stylesheet, and :root and .dark carry the same specificity, so a plain
  // :root rule here would win in dark mode too and wash the dark theme out.
  const css = `html:not(.dark){
  --paper:${theme.paper};
  --cream:${theme.cream};
  --ink:${theme.ink};
  --clay:${theme.clay};
  --moss:${theme.moss};
  --sand:${theme.sand};
  --bone:${theme.bone};
}
:root{--radius:${theme.radius};}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
