/**
 * Renders structured data. React escapes strings inside script tags oddly, so
 * the JSON is serialised once and the closing-tag sequence is neutralised.
 */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
